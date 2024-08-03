varying vec2 vUv;
varying vec4 vWorldPos;

void main() {

  vec4 WorldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = WorldPos;
  vUv = uv;
}