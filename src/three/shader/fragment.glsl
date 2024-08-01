#include <packing>

#define SMOOTHSTEP_AA 0.01

varying vec4 vScreenPos;
varying vec2 vUv;
varying vec3 vViewNormal;
uniform sampler2D uDepthTex;
uniform sampler2D uNoiseTex;
uniform sampler2D uDisortTex;
uniform sampler2D uNormalTex;
uniform float uNear;
uniform float uFar;
uniform float uTime;
uniform float uFoamMaximumDistance;
uniform float uFoamMinimumDistance;
uniform vec3 uFoamColor;

float LinearEyeDepth(const in float depth) {
  float _ZBufferParamsX = 1. - uFar / uNear;
  float _ZBufferParamsY = uFar / uNear;
  float _ZBufferParamsZ = _ZBufferParamsX / uFar;
  float _ZBufferParamsW = _ZBufferParamsY / uFar;

  return 1.0 / (_ZBufferParamsZ * depth + _ZBufferParamsW);
}
// https://x.com/gonnavis/status/1377183786949959682 Formula Derivation
float readDepth(sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
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

void main() {
  vec2 scrPos = vScreenPos.xy / vScreenPos.w;

  float depth = readDepth(uDepthTex, scrPos);

  /* camera lookat -viewZ */
  float linearEyeDepth = -getViewZ(depth);

  float fragamentLinearDepth = -getViewZ(gl_FragCoord.z);

  float diffDepth = linearEyeDepth - fragamentLinearDepth;

  diffDepth = clamp(diffDepth, 0.0, 1.0);

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

  float foamDepthDifference01 = clamp(diffDepth / foamDistance, 0., 1.);

  float surfaceNoiseCutoff = foamDepthDifference01 * .777;

  float surfaceNoiseSample = texture2D(uNoiseTex, newUV).r;

  /*  anti-aliasing */
  // surfaceNoiseSample = step(surfaceNoiseCutoff, surfaceNoiseSample);
  surfaceNoiseSample = smoothstep(surfaceNoiseCutoff - SMOOTHSTEP_AA, surfaceNoiseCutoff + SMOOTHSTEP_AA, surfaceNoiseSample);

  vec4 surfaceNoiseColor = vec4(uFoamColor, 1.);

  surfaceNoiseColor.a *= surfaceNoiseSample;

  vec4 waterColor = mix(shalllowColor, deepColor, diffDepth / 1.);

  // csm_FragColor = surfaceNoiseColor + waterColor;

  csm_FragColor = alphaBlend(surfaceNoiseColor, waterColor);

  // csm_FragColor.rgb = vec3(existingNormal);

}