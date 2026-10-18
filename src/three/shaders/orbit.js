import { snoise } from './noise'

// ── Inside the sun: surrounding plasma sky ──
export const coreVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec3 vDir;

${snoise}

void main() {
  vec3 d = normalize(vDir);

  float n  = fbm(d * 2.5 + vec3(0.0, uTime * 0.03, uTime * 0.02));
  float n2 = fbm(d * 6.0 - uTime * 0.05);
  float rays = pow(0.5 + 0.5 * snoise(vec3(d.xz * 4.0, uTime * 0.1)), 3.0);

  vec3 deep  = vec3(0.10, 0.035, 0.01);
  vec3 ember = vec3(0.55, 0.22, 0.05);
  vec3 gold  = vec3(1.0, 0.7, 0.3);

  float h = 0.5 + 0.5 * n;
  vec3 col = mix(deep, ember, smoothstep(0.35, 0.9, h));
  col += gold * pow(max(n2, 0.0), 3.0) * 0.35;
  col += gold * rays * 0.08;

  // Kept below bloom threshold so photos stay the brightest thing
  gl_FragColor = vec4(col * uOpacity, uOpacity);
}
`

// ── Photo card with rounded corners and golden glow ──
export const cardVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const cardFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uImgAspect;
uniform float uCardAspect;
uniform float uPad;
uniform float uOpacity;
uniform float uGlow;
varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  // Plane includes padding around the card for the glow
  vec2 size = vec2(uCardAspect + 2.0 * uPad, 1.0 + 2.0 * uPad);
  vec2 p = (vUv - 0.5) * size;

  float d = roundedBox(p, vec2(uCardAspect * 0.5, 0.5), 0.07);
  float inside = smoothstep(0.004, -0.004, d);
  float border = smoothstep(0.02, 0.0, abs(d + 0.01));
  float outer = exp(-max(d, 0.0) * 14.0) * (1.0 - inside);

  // Cover-crop photo into the card
  vec2 q = p / vec2(uCardAspect, 1.0);
  float r = uImgAspect / uCardAspect;
  if (r > 1.0) q.x /= r; else q.y *= r;

  vec3 fallback = mix(vec3(0.35, 0.15, 0.05), vec3(1.0, 0.7, 0.35), vUv.y);
  vec3 img = uHasMap > 0.5 ? texture2D(uMap, q + 0.5).rgb : fallback;

  vec3 gold = vec3(1.0, 0.78, 0.45);
  vec3 col = img * inside + gold * border * 1.4 * uGlow + gold * outer * 0.6 * uGlow;
  float a = (inside + border * 0.8 + outer * 0.6) * uOpacity;

  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`