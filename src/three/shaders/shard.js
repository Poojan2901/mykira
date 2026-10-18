export const shardVertex = /* glsl */ `
attribute float aSeed;
attribute float aBright;
varying vec3 vNormal;
varying vec3 vView;
varying float vSeed;
varying float vBright;

void main() {
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif

  vec4 world = modelMatrix * im * vec4(position, 1.0);
  vec4 mv = viewMatrix * world;

  vNormal = normalize(mat3(viewMatrix) * mat3(modelMatrix) * mat3(im) * normal);
  vView = normalize(-mv.xyz);
  vSeed = aSeed;
  vBright = aBright;

  gl_Position = projectionMatrix * mv;
}
`

export const shardFragment = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
uniform vec3 uSunDir; // view-space direction to sun

varying vec3 vNormal;
varying vec3 vView;
varying float vSeed;
varying float vBright;

void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;

  float fres = pow(1.0 - abs(dot(n, vView)), 3.0);

  // Glint: shard face reflects the cracked sun
  vec3 r = reflect(-vView, n);
  float glint = pow(max(dot(r, normalize(uSunDir)), 0.0), 40.0) * 2.5;

  // Faint inner light, breathing slowly
  float body = 0.08 + 0.06 * (0.5 + 0.5 * sin(vSeed * 40.0 + uTime * 0.6));

  vec3 coldTint = vec3(0.55, 0.7, 1.0);
  vec3 warmGlint = vec3(1.0, 0.8, 0.5);

  vec3 col = coldTint * (body + fres * 1.2) + warmGlint * glint;
  col *= vBright;

  float a = clamp(body + fres + glint, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`