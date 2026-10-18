export const nameVertex = /* glsl */ `
attribute vec3 aStart;   // point on sun surface (relative to sun centre)
attribute vec3 aB;       // target for second name (position = first name)
attribute float aSeed;

uniform float uForm;     // 0 sun, 1 first name
uniform float uMorph;    // 0 first name, 1 second name
uniform float uAbsorb;   // 0 name, 1 back inside sun
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uSun;       // sun centre in this group's local space

varying float vAlpha;
varying float vHeat;

float ease(float t) { return t * t * (3.0 - 2.0 * t); }

vec3 bezier(vec3 a, vec3 c, vec3 b, float t) {
  return mix(mix(a, c, t), mix(c, b, t), t);
}

void main() {
  // Each particle has its own timing, so it flows like a stream
  float f  = ease(clamp(uForm * 1.6 - aSeed * 0.6, 0.0, 1.0));
  float m  = ease(clamp(uMorph * 1.5 - aSeed * 0.5, 0.0, 1.0));
  float ab = clamp(uAbsorb * 1.5 - (1.0 - aSeed) * 0.5, 0.0, 1.0);
  ab = ab * ab;

  vec3 target = mix(position, aB, m);
  vec3 start = uSun + aStart;

  // 1. Fly out of sun along a curved, swirling path
  vec3 ctrl = mix(start, target, 0.5)
            + vec3(sin(aSeed * 40.0) * 3.0, cos(aSeed * 23.0) * 2.0 + 2.0, sin(aSeed * 17.0) * 2.0);
  vec3 p = bezier(start, ctrl, target, f);

  // 2. Lift and swirl during the morph
  float arc = sin(m * 3.14159);
  p.y += arc * 0.7 * (aSeed - 0.5) * 2.0;
  p.z += arc * 0.6 * sin(aSeed * 31.0);

  // Gentle shimmer while resting
  p += vec3(sin(uTime * 1.3 + aSeed * 50.0), cos(uTime * 1.1 + aSeed * 70.0), 0.0) * 0.02 * f;

  // 3. Stream back into the sun
  vec3 ctrl2 = mix(p, uSun, 0.5) + vec3(cos(aSeed * 13.0) * 2.0, 2.5, 0.0);
  p = bezier(p, ctrl2, uSun + aStart * 0.3, ab);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uPixelRatio * (10.0 / -mv.z);

  vAlpha = smoothstep(0.0, 0.15, uForm) * (1.0 - smoothstep(0.85, 1.0, ab));
  vHeat = 1.0 - f * 0.6 + ab * 0.6; // hotter when near the sun
}
`

export const nameFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.25, 0.0, d);

  vec3 col = mix(vec3(1.0, 0.62, 0.25), vec3(1.0, 0.93, 0.78), core);
  col *= 1.2 + vHeat * 1.2; // above 1.0 so bloom catches it

  gl_FragColor = vec4(col, a * vAlpha * uOpacity);
}
`