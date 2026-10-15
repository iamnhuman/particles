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
uniform float uDispersion;
uniform float uStyle;
uniform float uFormation;
uniform vec3 uPointer;

const float TAU = 6.2831853;

// Analytic curl keeps the flow smooth and divergence-free on the GPU.
vec3 curl(vec3 p) {
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
  float release = smoothstep(0.0, 1.0, uDispersion);
  float theta = seed.x + uTime * .12 + uBass * .08;
  float phi = seed.y + uTime * .23 + theta * 3.0;
  phi += sin(theta * 3.0 + uTime * .13) * .3 + uMid * .12;
  float frequency = texture2D(uSpectrum, vec2(seed.x / TAU, .5)).r;

  // Gathered poses retain the old fine filaments and clean negative space.
  float tube = seed.z * (.42 + .10 * sin(theta * 3.0 - uTime * .16));
  tube *= 1.0 + uBass * .14 + frequency * uActive * .07;
  float radius = 1.67 + tube * cos(phi) + sin(theta * 2.0 + .6) * .12;
  vec3 ring = vec3(radius*cos(theta), radius*sin(theta), tube*sin(phi));
  ring.z += sin(theta * 3.0 + uTime * .16) * .22;
  vec3 knotCenter = vec3(sin(theta)+2.0*sin(2.0*theta), cos(theta)-2.0*cos(2.0*theta), -sin(3.0*theta)) * .68;
  vec3 tangent = normalize(vec3(cos(theta)+4.0*cos(2.0*theta), -sin(theta)+4.0*sin(2.0*theta), -3.0*cos(3.0*theta)));
  vec3 normal = normalize(cross(tangent, vec3(0.0,0.0,1.0)));
  vec3 binormal = normalize(cross(tangent,normal));
  vec3 knot = knotCenter + (normal*cos(phi)+binormal*sin(phi)) * tube * .72;
  vec3 gathered = mix(ring, knot, uFormation);
  gathered *= 1.0 + uBass * .035;

  // Each grain keeps a stable trajectory through four different releases.
  float grain = seed.w;
  float spread = .25 + grain * grain;
  vec3 outward = normalize(gathered + .001);
  vec3 turbulence = curl(gathered * 1.25 + vec3(uTime * .22));

  vec3 bloom = gathered + outward * spread * (1.25 + uBass * .35);
  bloom += vec3(sin(phi+uTime*.5),cos(theta*2.0-uTime*.4),sin(theta+phi)) * grain * .45;

  float orbit = theta + uTime * (.22 + grain * .12) + spread * 1.8;
  float orbitRadius = 1.7 + spread * 1.55 + sin(phi) * .2;
  vec3 vortex = vec3(cos(orbit)*orbitRadius, sin(orbit)*orbitRadius, sin(phi+uTime*.45)*(.5+grain*.75));
  vortex.xy += vec2(sin(orbit*2.0),cos(orbit*3.0)) * .22;

  float lane = floor(seed.y / TAU * 5.0) - 2.0;
  vec3 ribbon = vec3(sin(theta)*2.65, lane*.52+sin(theta*2.0+uTime*.6+lane*.4)*.42, cos(theta)*.95);
  ribbon += normal * (tube*.45) + binormal * sin(phi) * .18;

  float lobe = floor(grain * 3.0);
  float lobeAngle = lobe * TAU / 3.0 + uTime * .19;
  vec3 lobeCenter = vec3(cos(lobeAngle)*1.8, sin(lobeAngle)*1.8, sin(lobeAngle+uTime*.2)*.4);
  vec3 lobes = gathered * .52 + lobeCenter + turbulence * .14;

  vec4 weights = 1.0-smoothstep(vec4(0.0),vec4(1.0),abs(vec4(uStyle)-vec4(0.0,1.0,2.0,3.0)));
  weights /= max(dot(weights,vec4(1.0)),.001);
  vec3 scattered = bloom*weights.x+vortex*weights.y+ribbon*weights.z+lobes*weights.w;
  scattered += turbulence * (.18+uMid*.18+uHigh*.13+uFlux*.08);
  scattered += outward * (uBass*.13+uHit*.22) * (.65+.35*sin(theta*4.0+uTime));

  vec3 target = mix(gathered,scattered,release);
  target += turbulence * .018 * (1.0-release);
  float pointerDistance = distance(old.xyz.xy, uPointer.xy);
  target.xy += normalize(old.xyz.xy-uPointer.xy+.001) * exp(-pointerDistance*2.0) * uPointer.z * .10;
  // Release lags into an arc; gathering pulls every grain home again.
  float attraction = 1.0-exp(-uDelta*mix(9.0,4.5,release));
  gl_FragColor = vec4(mix(old.xyz,target,attraction),seed.w);
}
