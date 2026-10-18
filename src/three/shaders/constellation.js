export const planeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ── One constellation star ──
export const starFragment = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uSeen;
uniform float uHover;
uniform float uOpacity;
uniform float uPulse;
varying vec2 vUv;

void main() {
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;

  float core = exp(-d * d * 60.0);
  float halo = exp(-d * 5.0) * 0.5;
  float flare = (exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 5.0)
               + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 5.0)) * 0.6;

  float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + uSeed * 2.0) + uSeed * 30.0);

  vec3 cool = vec3(0.85, 0.9, 1.0);
  vec3 warm = vec3(1.0, 0.8, 0.5);
  vec3 col = mix(cool, warm, uSeen);

  float i = (core * 2.5 + halo + flare) * twinkle * (1.0 + uHover * 0.8 + uSeen * 0.6) * uPulse;
  float a = clamp(i, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * i * uOpacity, a);
}
`

// ── Line of light between two stars ──
export const segFragment = /* glsl */ `
uniform float uFill;    // 0..1 how much of the line is drawn
uniform float uOpacity;
uniform float uPulse;
varying vec2 vUv;

void main() {
  float across = abs(vUv.y - 0.5) * 2.0;
  float line = exp(-across * across * 18.0);
  float drawn = step(vUv.x, uFill);

  // Bright travelling tip while drawing
  float drawing = step(0.001, uFill) * (1.0 - step(0.999, uFill));
  float tip = exp(-pow((vUv.x - uFill) * 12.0, 2.0)) * drawing;

  float a = (line * drawn * 0.9 + tip * line * 1.5) * uOpacity * uPulse;
  gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * a * 1.3, a);
}
`

// ── Background starfield ──
export const skyVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vTwinkle;
varying float vSeed;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + aSeed * 2.2) * uPixelRatio;
  vTwinkle = 0.5 + 0.5 * sin(uTime * (0.5 + aSeed * 2.0) + aSeed * 50.0);
  vSeed = aSeed;
}
`

export const skyFragment = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;
varying float vSeed;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * uOpacity * (0.4 + 0.6 * vTwinkle);
  vec3 col = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.75), vSeed);
  gl_FragColor = vec4(col * a, a);
}
`