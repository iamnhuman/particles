attribute vec2 aReference;
attribute vec3 aSeed;
uniform sampler2D uPositions;
uniform sampler2D uSpectrum;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uHit;
uniform float uActive;
uniform float uPixelRatio;
uniform float uCameraDistance;
uniform float uParticleScale;
uniform float uDispersion;
uniform float uToyota;
uniform sampler2D uToyotaGrains;
uniform float uToyotaFlowTime;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 data = texture2D(uPositions, aReference);
  vec3 p = data.xyz;
  float spectral = texture2D(uSpectrum, vec2(aSeed.x, .5)).r;
  vec3 outward = normalize(p + .0001);
  float detail = 1.0-uToyota;
  p += outward * uHit * (.022 + .2 * uDispersion) * (.7 + .3 * aSeed.y) * detail;
  p += sin(p.yzx * 5.0 + uTime * 2.0 + aSeed.z * 6.28) * uHigh * (.007 + .065 * uDispersion) * detail;
  p += vec3(-outward.y,outward.x,sin(aSeed.x*6.28+uTime)) * uMid * (.008 + .06 * uDispersion) * detail;
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float warmLight = smoothstep(-1.7, 1.6, p.x + p.y * .45 + p.z * .5);
  vec3 shadow = vec3(.55, .15, .055);
  vec3 copper = vec3(1.5, .58, .24);
  vec3 light = vec3(2.4, 1.65, 1.05);
  vColor = mix(shadow, copper, warmLight);
  vColor = mix(vColor, light, pow(warmLight, 3.0) * .8);
  float filaments = .5 + .5 * sin(aSeed.z * 40.0 + p.y * 4.0);
  vColor *= .7 + filaments * .65 + spectral * uActive * .42;
  if (uToyota > 0.0) {
    vec3 material = texture2D(uToyotaGrains,aReference).xyz;
    vColor *= mix(1.0,toyotaSheen(material,uToyotaFlowTime),uToyota);
  }
  float size = 1.05 + pow(aSeed.y, 5.0) * 1.65;
  size *= mix(1.0,.88,uDispersion);
  gl_PointSize = clamp(size * uPixelRatio * max(.65,uParticleScale) * (uCameraDistance / -viewPosition.z), .7, 3.0*uPixelRatio);
  vAlpha = (.5 + aSeed.z * .45) * (1.0-smoothstep(uCameraDistance+3.0, uCameraDistance+10.0, -viewPosition.z));
  vAlpha *= .82 + spectral * uActive * .3 + uHit * .2;
  vAlpha *= min(1.0,uParticleScale*uParticleScale);
  vAlpha *= mix(1.0,.67,uDispersion);
}
