varying vec4 vWorldPos;
varying vec2 vUv;
uniform float uPosY;
uniform sampler2D uCausticsTex;
uniform float uTime;

#define OFFSET 0.01

vec3 causticsSample(sampler2D tex, vec2 uv, float speed) {
  float s = OFFSET;
  float r = texture2D(tex, uv + speed + vec2(s, s)).r;
  float g = texture2D(tex, uv + speed + vec2(s, -s)).g;
  float b = texture2D(tex, uv + speed + vec2(-s, -s)).b;

  return vec3(r, g, b);
}

void main() {

  vec2 newUV = vUv;
  newUV *= 3.;

  vec3 causticsTex1 = causticsSample(uCausticsTex, newUV, -uTime * 0.04);
  vec3 causticsTex2 = causticsSample(uCausticsTex, newUV, uTime * 0.035);

  vec3 causticsTex = min(causticsTex1, causticsTex2);

  float factor = step(uPosY - 0.01, vWorldPos.y);

  vec4 baseColor = csm_DiffuseColor;

  vec4 mixColor = vec4(baseColor.rgb + causticsTex, baseColor.a);

  csm_FragColor = mix(mixColor, baseColor, factor);

}