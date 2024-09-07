#define SMOOTHSTEP_AA 0.01

varying vec4 vScreenPos;
varying vec2 vUv;
varying vec3 vViewNormal;
uniform sampler2D uDepthTex;
uniform sampler2D uNoiseTex;
uniform sampler2D uDisortTex;
uniform sampler2D uNormalTex;
uniform sampler2D uBaseTex;
uniform float uNear;
uniform float uFar;
uniform float uTime;
uniform float uFoamMaximumDistance;
uniform float uFoamMinimumDistance;
uniform vec3 uFoamColor;
uniform sampler2D uFlowTex;
uniform sampler2D uSurfaceNormalTex;
uniform sampler2D uDerivativeHeightTex;
uniform float uHeightScaleModulated;
uniform float uHightScale;
uniform float uSpeed;
uniform float uFlowOffset;
uniform float uTiling;
uniform float uFlowStrength;
uniform vec2 uResolution;
uniform float uDpr;

struct ZBufferParams {
  float x;
  float y;
  float z;
  float w;
} _ZBufferParams;

void initZBufferParams(float uFar, float uNear) {
  _ZBufferParams.x = 1. - uFar / uNear;
  _ZBufferParams.y = uFar / uNear;
  _ZBufferParams.z = _ZBufferParams.x / uFar;
  _ZBufferParams.w = _ZBufferParams.y / uFar;
}

// https://blog.csdn.net/wodownload2/article/details/95043746
float Linear01Depth(float z) {
  return 1.0 / (_ZBufferParams.x * z + _ZBufferParams.y);
}
// Z buffer to linear depth
float LinearEyeDepth(float z) {
  return 1.0 / (_ZBufferParams.z * z + _ZBufferParams.w);
}

// equal to LinearEyeDepth
float readDepth(sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  // https://x.com/gonnavis/status/1377183786949959682 Formula Derivation
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, uNear, uFar);
  return viewZToPerspectiveDepth(viewZ, uNear, uFar);
}

float getViewZ(float depth) {
  return perspectiveDepthToViewZ(depth, uNear, uFar);
}

vec4 alphaBlend(vec4 top, vec4 bottom) {
  vec3 color = (top.rgb * top.a) + (bottom.rgb * (1. - top.a));
  float alpha = top.a + bottom.a * (1. - top.a);

  return vec4(color, alpha);
}

vec3 flowUVW(vec2 uv, vec2 flowVector, float time, bool flowB, float tiling) {
  float phaseOffset = flowB ? 0.5 : 0.;
  float progress = fract(time + phaseOffset);
  vec3 uvw;
  // uvw.xy = uv - flowVector * progress + phaseOffset;
  uvw.xy = uv - flowVector * (progress + uFlowOffset);
  uvw.xy * = tiling;
  uvw.xy += phaseOffset;
  uvw.z = 1. - abs(1. - 2. * progress);
  return uvw;
}

vec3 UnpackNormal(sampler2D tex, vec2 uv) {
  vec4 normalTex = texture2D(tex, uv);
  vec3 normalTs = vec3(normalTex.rg * 2. - 1., 0.);
  normalTs.z = sqrt(1. - dot(normalTs.xy, normalTs.xy));
  return normalTs;
}

vec3 UnpackDerivativeHeight(vec4 textureData) {
  vec3 dh = textureData.agb;
  dh.xy = dh.xy * 2. - 1.;
  return dh;
}

mat3 getTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {

  vec3 q0 = dFdx(eye_pos.xyz);
  vec3 q1 = dFdy(eye_pos.xyz);
  vec2 st0 = dFdx(uv.st);
  vec2 st1 = dFdy(uv.st);

  vec3 N = surf_norm; // normalized

  vec3 q1perp = cross(q1, N);
  vec3 q0perp = cross(N, q0);

  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;

  float det = max(dot(T, T), dot(B, B));
  float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

  return mat3(T * scale, B * scale, N);

}

void main() {

  vec3 csm_SurfaceNormal;

  initZBufferParams(uFar, uNear);

  vec2 scrPos = vScreenPos.xy / vScreenPos.w;

  vec4 baseColor = texture2D(uBaseTex, scrPos);

  float blurRadiusX = (1.0 / uResolution.x * uDpr) * 0.1; // 根据屏幕分辨率调整
  float blurRadiusY = (1.0 / uResolution.y * uDpr) * 0.1; // 根据屏幕分辨率调整

  vec2 offsets[4] = vec2[](vec2(-blurRadiusX, 0.0), vec2(blurRadiusX, 0.0), vec2(0.0, -blurRadiusY), vec2(0.0, blurRadiusY));
  float depth = texture2D(uDepthTex, scrPos).x;
  for(int i = 0; i < 4; ++i) {
    depth = max(depth, texture2D(uDepthTex, scrPos + offsets[i]).x);
  }

  /* camera lookat -viewZ */
  float linearEyeDepth = LinearEyeDepth(depth);

  float diffDepth = linearEyeDepth - vScreenPos.w;

  diffDepth = clamp(diffDepth, 0.0, 1.0);

  diffDepth *= step(0.01, diffDepth);

  vec4 shalllowColor = vec4(0.325, 0.807, 0.971, 0.725);

  vec4 deepColor = vec4(0.086, 0.407, 1, 0.749);

  vec2 distortSample = texture2D(uDisortTex, vUv).rg;

  distortSample = distortSample * 2. - 1.;

  distortSample *= 0.27;

  vec2 newUV = vUv;

  newUV.y *= 4.;

  newUV = vec2(newUV.x + uTime * 0.03 + distortSample.x, newUV.y + uTime * 0.03 + distortSample.y);

  vec3 normalBuffer = texture2D(uNormalTex, scrPos).rgb;

  float normalDot = clamp(dot(normalBuffer, normalize(vViewNormal)), 0.0, 1.0);

  float foamDistance = mix(uFoamMaximumDistance, uFoamMinimumDistance, normalDot);

  float foamDepthDifference01 = clamp(diffDepth / foamDistance, 0.0, 1.);

  float surfaceNoiseCutoff = foamDepthDifference01 * .777;

  float surfaceNoiseSample = texture2D(uNoiseTex, newUV).r;

  /*  anti-aliasing */
  // surfaceNoiseSample = step(surfaceNoiseCutoff, surfaceNoiseSample);
  surfaceNoiseSample = smoothstep(surfaceNoiseCutoff - SMOOTHSTEP_AA, surfaceNoiseCutoff + SMOOTHSTEP_AA, surfaceNoiseSample);

  vec4 surfaceNoiseColor = vec4(uFoamColor, 1.);

  surfaceNoiseColor.a *= surfaceNoiseSample;

  vec4 waterColor = mix(shalllowColor, deepColor, diffDepth / 1.);

  // csm_FragColor = surfaceNoiseColor + waterColor;

  csm_DiffuseColor = alphaBlend(surfaceNoiseColor, waterColor);

  // csm_DiffuseColor = vec4(vec3(depth), 1.);

  // csm_Metalness = 0.0;
  // csm_Roughness = .35;
}