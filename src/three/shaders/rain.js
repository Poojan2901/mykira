export const rainVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vSeed;

void main() {
  vec3 p = position;
  p.y = mod(p.y - uTime * (0.4 + aSeed * 0.6) + 6.0, 14.0) - 6.0; // falls, wraps
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (6.0 + aSeed * 8.0) * uPixelRatio * (8.0 / max(-mv.z, 0.5));
  vSeed = aSeed;
}
`

export const rainFragment = /* glsl */ `
uniform float uOpacity;
varying float vSeed;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  // Thin vertical streak
  float a = smoothstep(0.5, 0.0, abs(c.x) * 5.0) * smoothstep(0.5, 0.0, abs(c.y));
  a *= uOpacity * (0.3 + 0.4 * vSeed);
  gl_FragColor = vec4(vec3(0.7, 0.8, 1.0) * a, a);
}
`