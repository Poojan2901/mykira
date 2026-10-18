// ── Sky dome ──
export const skyDomeVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const skyDomeFragment = /* glsl */ `
uniform float uDawn;
uniform float uRise;
uniform vec3 uSunDir;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  vec3 top = mix(vec3(0.01, 0.015, 0.05), vec3(0.10, 0.16, 0.38), uRise);
  vec3 mid = mix(vec3(0.06, 0.04, 0.12), vec3(0.55, 0.30, 0.40), uRise);
  vec3 hor = mix(vec3(0.25, 0.10, 0.08), vec3(1.0, 0.55, 0.28), uRise);

  vec3 col = mix(hor, mid, smoothstep(-0.02, 0.12, h));
  col = mix(col, top, smoothstep(0.12, 0.6, h));

  // Warm glow around the rising sun
  float sunAmt = pow(max(dot(d, normalize(uSunDir)), 0.0), 6.0);
  col += vec3(1.0, 0.6, 0.3) * sunAmt * (0.4 + 0.8 * uRise);

  gl_FragColor = vec4(col * uDawn, uDawn);
}
`

// ── Planet horizon below her ──
export const planetVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorldNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const planetFragment = /* glsl */ `
uniform vec3 uSunDir;
uniform float uRise;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorldNormal;

void main() {
  float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 4.0);
  float toward = max(dot(normalize(vWorldNormal), normalize(uSunDir)), 0.0);

  vec3 base = vec3(0.02, 0.02, 0.05);
  vec3 rim = vec3(1.0, 0.55, 0.3) * fres * (0.4 + 1.2 * uRise) * (0.3 + toward);

  gl_FragColor = vec4((base + rim) * uOpacity, uOpacity);
}
`

// ── New sun ──
export const newSunVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const newSunFragment = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float disc = smoothstep(0.32, 0.28, d);
  float glow = exp(-d * 3.0) * 0.8 + exp(-d * 8.0) * 0.6;
  float breathe = 0.95 + 0.05 * sin(uTime * 1.2);

  vec3 col = vec3(1.0, 0.92, 0.75) * disc * 3.0 + vec3(1.0, 0.65, 0.35) * glow;
  float a = clamp(disc + glow, 0.0, 1.0) * uIntensity;
  gl_FragColor = vec4(col * uIntensity * breathe, a);
}
`

// ── Celebration burst ──
export const burstVertex = /* glsl */ `
attribute vec3 aVel;
attribute vec3 aColor;
attribute float aSeed;
uniform float uT;
uniform float uPixelRatio;
varying float vA;
varying vec3 vColor;

void main() {
  float t = max(uT - aSeed * 0.25, 0.0);
  float k = 1.6;

  // Burst out, slow down, then drift down like warm rain
  vec3 p = position + aVel * (1.0 - exp(-k * t)) / k;
  p.y -= 0.175 * t * t;
  p.x += sin(t * 1.5 + aSeed * 20.0) * 0.15 * t;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (3.0 + aSeed * 5.0) * uPixelRatio * (10.0 / max(-mv.z, 0.5));

  float life = 1.0 - smoothstep(5.0, 9.0, t);
  vA = step(0.001, t) * life * (0.6 + 0.4 * sin(t * 8.0 + aSeed * 40.0));
  vColor = aColor;
}
`

export const burstFragment = /* glsl */ `
varying float vA;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(vColor * 1.6 * a, a);
}
`