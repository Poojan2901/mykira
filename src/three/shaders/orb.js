import { snoise } from './noise'

// ── Glass shell ─────────────────────────────
export const shellVertex = /* glsl */ `
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vPos = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const shellFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uHasPhoto;
uniform float uSeed;
uniform vec3 uTint;

varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;

${snoise}

void main() {
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
  vec3 p = normalize(vPos) * 1.5 + uSeed * 10.0;

  // Nebula fill only when there is no photo
  float swirl = fbm(p + vec3(uTime * 0.15, -uTime * 0.1, uTime * 0.05));
  float inner = (0.5 + 0.5 * swirl) * (1.0 - fres) * (1.0 - uHasPhoto) * 0.7;

  // Moving light sheen on the glass edge
  float sheen = pow(max(0.0, snoise(p * 2.0 + uTime * 0.3)), 3.0) * 0.4 * fres;

  vec3 col = uTint * (fres * 1.8 + inner + sheen);
  float a = clamp(fres * 1.2 + inner, 0.0, 1.0);

  gl_FragColor = vec4(col * uIntensity, a * uIntensity);
}
`

// ── Photo inside the orb ────────────────────
export const photoVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const photoFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uAspect;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;

void main() {
  vec2 st = vUv - 0.5;
  float d = length(st) * 2.0;
  float mask = smoothstep(1.0, 0.86, d);

  // Cover-crop to a centred square
  if (uAspect > 1.0) st.x /= uAspect; else st.y *= uAspect;
  vec3 img = texture2D(uMap, st + 0.5).rgb;

  img = mix(img, img * uTint * 1.15, 0.25);          // warm memory tint
  img *= mix(1.0, 0.65, smoothstep(0.4, 1.0, d));    // soft inner vignette

  gl_FragColor = vec4(img, mask * uOpacity);
  #include <colorspace_fragment>
}
`

// ── Soft halo behind orb ────────────────────
export const haloFragment = /* glsl */ `
uniform float uIntensity;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * 3.5) * smoothstep(1.0, 0.5, d);
  gl_FragColor = vec4(uTint * g * uIntensity * 0.8, g);
}
`

// ── Bokeh lights ────────────────────────────
export const bokehVertex = /* glsl */ `
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uTravel;
uniform float uPixelRatio;
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  // Stream toward the viewer; scroll speeds it up. Wraps in range [-50, 10].
  p.z = mod(p.z + uTravel + uTime * (0.3 + aSeed * 0.5) + 50.0, 60.0) - 50.0;
  p.y += sin(uTime * (0.6 + aSeed) + aSeed * 20.0) * 0.35; // playful bob
  p.x += cos(uTime * (0.4 + aSeed * 0.7) + aSeed * 9.0) * 0.25;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = -mv.z;
  gl_PointSize = clamp((8.0 + aSeed * 14.0) * uPixelRatio * (12.0 / max(depth, 0.5)), 1.0, 90.0 * uPixelRatio);

  float twinkle = 0.35 + 0.25 * sin(uTime * 2.0 + aSeed * 30.0);
  vAlpha = smoothstep(0.5, 3.0, depth) * smoothstep(50.0, 25.0, depth) * uOpacity * twinkle;
  vColor = aColor;
}
`

export const bokehFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.8, d);
  float rim = smoothstep(0.6, 0.95, d) * disc * 0.6; // lens-like bright edge
  float a = (disc * 0.5 + rim) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}
`