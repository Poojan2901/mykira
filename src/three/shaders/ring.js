export const ringVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const ringFragment = /* glsl */ `
uniform float uProgress;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float r = uProgress * 0.95;

  float ring  = exp(-pow((d - r) * 22.0, 2.0));       // sharp edge
  float inner = exp(-pow((d - r) * 6.0, 2.0)) * 0.25; // soft trailing glow
  float a = (ring + inner) * uOpacity;

  gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * 2.0 * a, a);
}
`