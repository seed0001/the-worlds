import { NOISE_GLSL } from './noise.js';

// Planet surface shader, adapted from dgreenheck/threejs-procedural-planets.
// Changes from upstream: a `seedOffset` uniform threaded into terrainHeight, and
// the noise library prepended here rather than pulled out of <script> tags in
// index.html — shaders belong in modules, not the DOM.

export const PLANET_VERT = /* glsl */ `
${NOISE_GLSL}

attribute vec3 tangent;

uniform int type;
uniform vec3 seedOffset;
uniform float radius;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

void main() {
  float h = terrainHeight(
    type, position, seedOffset,
    amplitude, sharpness, offset,
    period, persistence, lacunarity, octaves);

  vec3 pos = position * (radius + h);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  fragPosition = position;
  fragNormal = normal;
  fragTangent = tangent;
  fragBitangent = cross(normal, tangent);
}
`;

export const PLANET_FRAG = /* glsl */ `
${NOISE_GLSL}

uniform int type;
uniform vec3 seedOffset;
uniform float radius;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;

uniform float transition2;
uniform float transition3;
uniform float transition4;
uniform float transition5;

uniform float blend12;
uniform float blend23;
uniform float blend34;
uniform float blend45;

uniform float bumpStrength;
uniform float bumpOffset;

uniform float ambientIntensity;
uniform float diffuseIntensity;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 lightDirection;
uniform vec3 lightColor;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

void main() {
  float h = terrainHeight(
    type, fragPosition, seedOffset,
    amplitude, sharpness, offset,
    period, persistence, lacunarity, octaves);

  vec3 dx = bumpOffset * fragTangent;
  float h_dx = terrainHeight(
    type, fragPosition + dx, seedOffset,
    amplitude, sharpness, offset,
    period, persistence, lacunarity, octaves);

  vec3 dy = bumpOffset * fragBitangent;
  float h_dy = terrainHeight(
    type, fragPosition + dy, seedOffset,
    amplitude, sharpness, offset,
    period, persistence, lacunarity, octaves);

  vec3 pos = fragPosition * (radius + h);
  vec3 pos_dx = (fragPosition + dx) * (radius + h_dx);
  vec3 pos_dy = (fragPosition + dy) * (radius + h_dy);

  vec3 bumpNormal = normalize(cross(pos_dx - pos, pos_dy - pos));
  vec3 N = normalize(mix(fragNormal, bumpNormal, bumpStrength));

  vec3 L = normalize(-lightDirection);
  vec3 V = normalize(cameraPosition - pos);
  vec3 R = normalize(reflect(L, N));

  float diffuse = diffuseIntensity * max(0.0, dot(N, -L));

  float specularFalloff = clamp((transition3 - h) / transition3, 0.0, 1.0);
  float specular = max(0.0, specularFalloff * specularIntensity * pow(max(0.0, dot(V, R)), shininess));

  float light = ambientIntensity + diffuse + specular;

  vec3 color12 = mix(color1, color2,
    smoothstep(transition2 - blend12, transition2 + blend12, h));
  vec3 color123 = mix(color12, color3,
    smoothstep(transition3 - blend23, transition3 + blend23, h));
  vec3 color1234 = mix(color123, color4,
    smoothstep(transition4 - blend34, transition4 + blend34, h));
  vec3 finalColor = mix(color1234, color5,
    smoothstep(transition5 - blend45, transition5 + blend45, h));

  gl_FragColor = vec4(light * finalColor * lightColor, 1.0);
}
`;

export const ATMOSPHERE_VERT = /* glsl */ `
attribute float size;
varying vec3 fragPosition;

void main() {
  gl_PointSize = size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  fragPosition = (modelMatrix * vec4(position, 1.0)).xyz;
}
`;

export const ATMOSPHERE_FRAG = /* glsl */ `
${NOISE_GLSL}

uniform float time;
uniform float speed;
uniform float opacity;
uniform float density;
uniform float scale;
uniform vec3 lightDirection;
uniform vec3 color;
uniform sampler2D pointTexture;

varying vec3 fragPosition;

vec2 rotateUV(vec2 uv, float rotation) {
  float mid = 0.5;
  return vec2(
    cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
    cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
  );
}

void main() {
  vec3 R = normalize(fragPosition);
  vec3 L = normalize(lightDirection);
  float light = max(0.05, dot(R, L));

  float n = simplex3((time * speed) + fragPosition / scale);
  float alpha = opacity * clamp(n + density, 0.0, 1.0);

  gl_FragColor = vec4(light * color, alpha) * texture2D(pointTexture, gl_PointCoord);
}
`;
