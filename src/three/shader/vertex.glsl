varying vec4 vScreenPos;
varying vec2 vUv;
varying vec3 vViewNormal;

vec4 ComputeScreenPos(vec4 pos) {
  vec4 o = pos * 0.5;
  o.xy = vec2(o.x, o.y) + o.w;
  o.zw = pos.zw;
  return o;
}

void main() {
  vec4 clipPos = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vScreenPos = ComputeScreenPos(clipPos);
  vViewNormal = (normalMatrix * normal).xyz;
  // vViewNormal = (modelViewMatrix * vec4(normal, 0.)).xyz;
  vUv = uv;
}