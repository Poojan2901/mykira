import { snoise } from './noise'

export const sunVertex = /* glsl */ `
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

export const sunFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uWarmth;
uniform float uCrack;

varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;

${snoise}

void main() {
  vec3 p = normalize(vPos) * 2.0;

  float n1 = fbm(p + vec3(0.0, uTime * 0.08, uTime * 0.05));
  float n2 = fbm(p * 3.0 - uTime * 0.12);
  float heat = 0.55 + 0.35 * n1 + 0.15 * n2;

  vec3 deep = vec3(1.0, 0.35, 0.05);
  vec3 mid  = vec3(1.0, 0.72, 0.20);
  vec3 hot  = vec3(1.0, 0.97, 0.80);

  vec3 col = mix(deep, mid, smoothstep(0.2, 0.6, heat));
  col = mix(col, hot, smoothstep(0.6, 0.95, heat));

  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
  col += vec3(1.0, 0.6, 0.2) * fres * 0.8;

  // Cold surface
  vec3 cold = vec3(0.35, 0.5, 0.8) * (0.4 + 0.6 * heat);
  col = mix(cold, col, uWarmth);

  // Cracks: ridged noise network, still glowing warm from inside
  float r1 = 1.0 - abs(snoise(p * 2.2 + 7.0));
  float r2 = 1.0 - abs(snoise(p * 4.5 - 3.0));
  float crackLine = pow(r1, 18.0) + pow(r2, 22.0) * 0.6;
  float pulse = 0.7 + 0.3 * sin(uTime * 1.5); // still beating
  col *= 1.0 - 0.35 * uCrack;                 // surface darker between cracks
  col += vec3(1.0, 0.75, 0.35) * 3.0 * crackLine * uCrack * pulse;

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`

export const coronaVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const coronaFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uWarmth;
varying vec2 vUv;

${snoise}

void main() {
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;
  float a = atan(c.y, c.x);

  // Slow flickering rays around the star
  float rays = 0.5 + 0.5 * snoise(vec3(cos(a) * 2.0, sin(a) * 2.0, uTime * 0.2));

  float glow = exp(-d * 4.0) + 0.25 * exp(-d * 1.5) * rays;
  glow *= smoothstep(1.0, 0.6, d);

  vec3 warm = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.9, 0.6), exp(-d * 6.0));
  vec3 cold = vec3(0.4, 0.55, 0.9);
  vec3 col = mix(cold, warm, uWarmth);

  gl_FragColor = vec4(col * glow * uIntensity, glow);
}
`