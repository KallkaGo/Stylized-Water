#include <packing>

varying vec4 vScreenPos;
varying vec2 vUv;
uniform sampler2D uDepthTex;
uniform sampler2D uNoiseTex;
uniform sampler2D uDisortTex;
uniform float uNear;
uniform float uFar;
uniform float uTime;

float LinearEyeDepth(const in float depth) {
  float _ZBufferParamsX = 1. - uFar / uNear;
  float _ZBufferParamsY = uFar / uNear;
  float _ZBufferParamsZ = _ZBufferParamsX / uFar;
  float _ZBufferParamsW = _ZBufferParamsY / uFar;

  return 1.0 / (_ZBufferParamsZ * depth + _ZBufferParamsW);
}

float readDepth(sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, uNear, uFar);
  return viewZToPerspectiveDepth(viewZ, uNear, uFar);
}

float getViewZ(float depth) {
  return perspectiveDepthToViewZ(depth, uNear, uFar);
}

void main() {
  vec2 scrPos = vScreenPos.xy / vScreenPos.w;

  float depth = readDepth(uDepthTex, scrPos);

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

  float surfaceNoiseSample = texture2D(uNoiseTex, newUV).r;

  float foamDepthDifference01 = clamp(diffDepth / .04, 0., 1.);
  float surfaceNoiseCutoff = foamDepthDifference01 * .777;

  surfaceNoiseSample = step(surfaceNoiseCutoff, surfaceNoiseSample);

  vec4 waterColor = mix(shalllowColor, deepColor, diffDepth / 1.);

  csm_FragColor = waterColor + surfaceNoiseSample;
}