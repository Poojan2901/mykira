export const dustVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vTwinkle;

void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.1 + aSeed * 6.2831) * 0.6;
  p.x += cos(uTime * 0.07 + aSeed * 12.0) * 0.4;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = (2.0 + aSeed * 3.0) * uPixelRatio * (60.0 / -mv.z);
  gl_PointSize = min(size, 8.0 * uPixelRatio);

  vTwinkle = 0.6 + 0.4 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
}
`

export const dustFragment = /* glsl */ `
uniform float uReveal;
uniform vec3 uColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, a * vTwinkle * uReveal);
}
`