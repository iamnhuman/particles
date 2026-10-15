uniform sampler2D uOrigins;
uniform sampler2D uSpectrum;
uniform float uTime;
uniform float uDelta;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uHit;
uniform float uActive;
uniform float uEnergy;
uniform float uFlux;
uniform vec3 uPointer;

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1,311.7,74.7)), dot(p, vec3(269.5,183.3,246.1)), dot(p, vec3(113.5,271.9,124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
}
vec3 field(vec3 p) { return vec3(noise(p), noise(p + vec3(31.1,7.2,14.4)), noise(p + vec3(8.3,21.7,6.4))); }
vec3 curl(vec3 p) {
  // Analytic curl of a trigonometric vector potential: divergence-free without
  // eighteen finite-difference noise evaluations per particle per frame.
  vec3 a = sin(p * 1.4 + vec3(.7, 2.1, 4.3));
  vec3 b = cos(p * 1.4 + vec3(.7, 2.1, 4.3));
  vec3 c = sin(p * 2.1);
  vec3 d = cos(p * 2.1);
  return vec3(-a.x*c.y*2.1-b.z*d.x*1.4,
              -a.y*c.z*2.1-b.x*d.y*1.4,
              -a.z*c.x*2.1-b.y*d.z*1.4) * .42;
}
void main() {
  vec2 ref = gl_FragCoord.xy / resolution.xy;
  vec4 old = texture2D(texturePosition, ref);
  vec4 seed = texture2D(uOrigins, ref);
  float theta = seed.x + uTime * .22 + uBass * .24;
  float phi = seed.y + uTime * .45 + uMid * .7;
  float frequency = texture2D(uSpectrum, vec2(fract(seed.x / 6.28318), .5)).r;
  float twist = sin(theta * 3.0 + uTime * .13) * .3;
  float tube = seed.z * (.44 + .14 * sin(theta * 3.0 - uTime * .19));
  tube *= 1.0 + uBass * .5 + frequency * uActive * .4;
  phi += theta * 3.0 + twist + uMid * sin(theta * 5.0 + uTime * 1.2) * 1.25;
  float radius = 1.67 + tube * cos(phi) + sin(theta * 2.0 + .6) * .12;
  vec3 target = vec3(radius * cos(theta), radius * sin(theta), tube * sin(phi));
  target.z += sin(theta * 3.0 + uTime * .4) * (.24 + uMid * .4);
  vec3 knotCenter = vec3(sin(theta)+2.0*sin(2.0*theta), cos(theta)-2.0*cos(2.0*theta), -sin(3.0*theta)) * .68;
  vec3 tangent = normalize(vec3(cos(theta)+4.0*cos(2.0*theta), -sin(theta)+4.0*sin(2.0*theta), -3.0*cos(3.0*theta)));
  vec3 normal = normalize(cross(tangent, vec3(0.0,0.0,1.0)));
  vec3 binormal = normalize(cross(tangent,normal));
  vec3 knot = knotCenter + (normal*cos(phi)+binormal*sin(phi)) * tube * .72;
  float morph = clamp(.38 + sin(uTime * .35) * .16 + uActive * (.12 + uMid*.2 + uBass*.12), .12, .96);
  target = mix(target, knot, morph);
  target *= 1.0 + uBass * .15;
  vec3 turbulence = curl(target * 1.5 + vec3(uTime * .28 + uMid * .35));
  target += turbulence * (.065 + uEnergy * .12 + uHigh * .22 + uFlux * .1);
  // Every particle participates in the pressure wave, not just a handful of sparks.
  vec3 outward = normalize(target + .001);
  float pressure = .65 + .35 * sin(theta * 4.0 + uTime * 1.3);
  target += outward * (uBass * .22 + uHit * .28) * pressure;
  target += vec3(sin(theta*3.0+phi+uTime),cos(theta*2.0-phi-uTime*.8),sin(phi+uTime*1.4)) * uMid * .14;
  float pointerDistance = distance(old.xyz.xy, uPointer.xy);
  target.xy += normalize(old.xyz.xy - uPointer.xy + .001) * exp(-pointerDistance * 2.0) * uPointer.z * .13;
  float attraction = 1.0 - exp(-uDelta * (18.0 + uHit * 22.0));
  vec3 position = mix(old.xyz, target, attraction);
  gl_FragColor = vec4(position, seed.w);
}
