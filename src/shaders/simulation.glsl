uniform sampler2D uOrigins;
uniform sampler2D uToyotaGrains;
uniform float uToyota;
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
uniform float uFromStyle;
uniform float uToStyle;
uniform float uMorph;
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
vec3 frameNormal(vec3 tangent) {
  // All four new spines have a nonzero XY tangent: one continuous frame,
  // without switching reference axes as a grain travels around the curve.
  return normalize(vec3(tangent.y,-tangent.x,0.0));
}
vec3 tubePose(vec3 center, vec3 tangent, float phase, float width) {
  vec3 along = normalize(tangent), normal = frameNormal(tangent);
  vec3 binormal = normalize(cross(along,normal));
  return center+(normal*cos(phase)+binormal*sin(phase))*width;
}
vec3 ribbonPose(vec3 center, vec3 tangent, float phase, float ratio, float width, float depth, float turn) {
  vec3 along = normalize(tangent), normal = frameNormal(tangent);
  vec3 binormal = normalize(cross(along,normal));
  return center+(normal*cos(turn)+binormal*sin(turn))*cos(phase)*ratio*width
               +(-normal*sin(turn)+binormal*cos(turn))*sin(phase)*ratio*depth;
}

// Additional fields are bounded ribbons or tubes. Uniform branches evaluate only
// the selected field (and its neighbour during a recalled transition).
vec3 releaseShape(float field, float theta, float phi, float tube, float tubeRatio, float familyPhase, float pulse) {
  if (field < 3.5) {
    // One broad ribbon follows a closed (2,3) torus knot.
    float angle = theta+uTime*.10+pulse*.12;
    float radius = 1.20+.40*cos(angle*3.0);
    float dr = -1.20*sin(angle*3.0);
    vec3 center = vec3(radius*cos(angle*2.0),radius*sin(angle*2.0),.55*sin(angle*3.0));
    vec3 along = normalize(vec3(dr*cos(angle*2.0)-2.0*radius*sin(angle*2.0),
                               dr*sin(angle*2.0)+2.0*radius*cos(angle*2.0),1.65*cos(angle*3.0)));
    vec3 normal = normalize(cross(along,vec3(0.0,0.0,1.0)));
    vec3 binormal = normalize(cross(along,normal));
    float twist = angle*2.0+uTime*.11;
    vec3 acrossDirection = normal*cos(twist)+binormal*sin(twist);
    vec3 faceDirection = -normal*sin(twist)+binormal*cos(twist);
    float across = familyPhase*2.0-1.0;
    float width = .26+uMid*.025;
    float depth = sqrt(max(0.0,1.0-across*across))*sin(phi)*.055;
    return center+acrossDirection*across*width+faceDirection*depth;
  }
  if (field < 4.5) {
    // Two helices braid around a closed elliptical spine.
    float pair = floor(familyPhase*2.0);
    float phase = fract(familyPhase*2.0)*TAU+theta*2.0+uTime*.22;
    float twist = theta*6.0+pair*TAU*.5+uTime*.28+pulse;
    vec3 center = vec3(cos(theta)*.82,sin(theta)*1.72,0.0);
    vec3 radial = normalize(vec3(1.72*cos(theta),.82*sin(theta),0.0));
    vec3 along = normalize(vec3(-.82*sin(theta),1.72*cos(theta),0.0));
    vec3 coil = radial*cos(twist)+vec3(0.0,0.0,sin(twist));
    float width = tubeRatio*(.055+uMid*.012);
    return center+coil*(.32+uBass*.035+cos(phase)*width)+along*sin(phase)*width;
  }
  if (field < 5.5) {
    // A solid half-twisted ribbon. Its rounded sides stay visible where
    // the broad face turns edge-on; a flat strip pinches into a dark slit.
    float angle = theta+uTime*.09+pulse*.35;
    float turn = angle*.5;
    float across = cos(phi)*tubeRatio*(.52+uMid*.045);
    float side = sin(phi)*tubeRatio*(.19+uMid*.015);
    float radial = across*cos(turn)-side*sin(turn);
    float height = across*sin(turn)+side*cos(turn);
    float radius = 1.65+radial;
    return vec3(radius*cos(angle),radius*sin(angle),height);
  }
  if (field < 6.5) {
    // Five great-circle ribbons form an armillary sphere, never a filled ball.
    float family = floor(familyPhase*5.0);
    float phase = fract(familyPhase*5.0)*TAU+theta*2.0+uTime*.18;
    float width = tubeRatio*(.052+uHigh*.012);
    float angle = theta+uTime*.15+pulse*.5;
    float radius = 1.83+cos(phase)*width;
    vec3 p = vec3(cos(angle)*radius,sin(angle)*radius,sin(phase)*width);
    float tilt = (family+1.0)*TAU/12.0;
    p.yz = mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*p.yz;
    float precession = family*.70+uTime*.08;
    p.xz = mat2(cos(precession),-sin(precession),sin(precession),cos(precession))*p.xz;
    return p;
  }
  if (field < 7.5) {
  // The crossing of the figure-eight is separated in depth, with two open lobes.
  float angle = theta+uTime*.10+pulse*.3;
  vec3 center = vec3(1.95*sin(angle),1.08*sin(angle*2.0),.55*cos(angle));
  vec3 along = normalize(vec3(1.95*cos(angle),2.16*cos(angle*2.0),-.55*sin(angle)));
  vec3 normal = normalize(cross(along,vec3(0.0,0.0,1.0)));
  vec3 binormal = normalize(cross(along,normal));
  return center+(normal*cos(phi)+binormal*sin(phi))*tubeRatio*(.28+uMid*.025);
  }
  if (field < 9.5) {
    // A single (2,5) cinquefoil current.
    float a = theta+uTime*.08+pulse*.10;
    float r = 1.22+.38*cos(a*5.0);
    float dr = -1.90*sin(a*5.0);
    return tubePose(vec3(r*cos(a*2.0),r*sin(a*2.0),.53*sin(a*5.0)),
                    vec3(dr*cos(a*2.0)-2.0*r*sin(a*2.0),dr*sin(a*2.0)+2.0*r*cos(a*2.0),2.65*cos(a*5.0)),
                    phi,tubeRatio*(.21+uMid*.015));
  }
  if (field < 10.5) {
    // Rounded heart loop, with nonzero tangents at both tips.
    float a = theta+uTime*.07+pulse*.08;
    float x = 1.50*sin(a)*sin(a)*sin(a)+.20*sin(a);
    float y = (13.0*cos(a)-5.0*cos(a*2.0)-2.0*cos(a*3.0)-cos(a*4.0))*.11;
    float dx = (4.50*sin(a)*sin(a)+.20)*cos(a);
    float dy = (-13.0*sin(a)+10.0*sin(a*2.0)+6.0*sin(a*3.0)+4.0*sin(a*4.0))*.11;
    return tubePose(vec3(x,y,.24*sin(a*2.0)),vec3(dx,dy,.48*cos(a*2.0)),phi,tubeRatio*(.19+uMid*.012));
  }
  if (field < 11.5) {
    // One broad folded four-petal ribbon, with rounded side walls.
    float a = theta+uTime*.085+pulse*.10;
    float r = 1.62+.22*cos(a*4.0);
    float dr = -.88*sin(a*4.0);
    return ribbonPose(vec3(r*cos(a),r*sin(a),.45*sin(a*2.0)),
                      vec3(dr*cos(a)-r*sin(a),dr*sin(a)+r*cos(a),.90*cos(a*2.0)),
                      phi,tubeRatio,.36+uMid*.02,.17,a*2.0+uTime*.10);
  }
  // A closed figure-eight knot, distinct from the two-lobed infinity loop.
  float a = theta+uTime*.075+pulse*.10;
  float r = (2.0+cos(a*2.0))*.64;
  float dr = -1.28*sin(a*2.0);
  return tubePose(vec3(r*cos(a*3.0),r*sin(a*3.0),.64*sin(a*4.0)),
                  vec3(dr*cos(a*3.0)-3.0*r*sin(a*3.0),dr*sin(a*3.0)+3.0*r*cos(a*3.0),2.56*cos(a*4.0)),
                  phi,tubeRatio*(.18+uMid*.012));

}

vec4 pose(float field, vec4 seed, float frequency, float release, vec2 ref) {
  if (abs(field-8.0) < .1) {
    vec4 grain = texture2D(uToyotaGrains,ref);
    vec3 material = toyotaSurfaceGrain(grain.xyz,uToyotaFlowTime);
    vec3 body = toyotaDeform(material,uToyotaPhase);
    // Release from this very surface. There is no switch to separately
    // indexed oval streams or a different sculpture when the sound opens up.
    float opening = smoothstep(.65,.98,uDispersion);
    vec3 outward = normalize(body+.001);
    vec3 spread = outward*(.25+grain.w*grain.w)*1.25;
    vec3 drift = vec3(sin(uToyotaPhase),cos(uToyotaPhase),sin(uToyotaPhase+1.2))*.35;
    spread += curl(body*.75+drift)*.18;
    return vec4(body+spread*opening,1.0);
  }
  float theta = seed.x + uTime * .12 + uBass * .08;
  float phi = seed.y + uTime * .23 + theta * 3.0;
  phi += sin(theta * 3.0 + uTime * .13) * .3 + uMid * .12;

  float pulse = uBass * .14 + uHit * .10;
  // Use the same half-turn on both sides of the morph. Blending an untwisted
  // gathered cross-section into a half-twisted one leaves an open radial seam.
  float halfTwist = 1.0-smoothstep(.1,.6,abs(field-5.0));
  float gatheredTheta = theta+(uTime*.09+pulse*.35)*halfTwist;
  float gatheredPhi = phi+(theta+uTime*.09+pulse*.35)*.5*halfTwist;

  // Gathered poses retain the old fine filaments and clean negative space.
  float tube = seed.z * (.42 + .10 * sin(gatheredTheta * 3.0 - uTime * .16));
  tube *= 1.0 + uBass * .14 + frequency * uActive * .07;
  float radius = 1.67 + tube * cos(gatheredPhi) + sin(gatheredTheta * 2.0 + .6) * .12;
  vec3 ring = vec3(radius*cos(gatheredTheta), radius*sin(gatheredTheta), tube*sin(gatheredPhi));
  ring.z += sin(gatheredTheta * 3.0 + uTime * .16) * .22;
  vec3 knotCenter = vec3(sin(gatheredTheta)+2.0*sin(2.0*gatheredTheta), cos(gatheredTheta)-2.0*cos(2.0*gatheredTheta), -sin(3.0*gatheredTheta)) * .68;
  vec3 tangent = normalize(vec3(cos(gatheredTheta)+4.0*cos(2.0*gatheredTheta), -sin(gatheredTheta)+4.0*sin(2.0*gatheredTheta), -3.0*cos(3.0*gatheredTheta)));
  vec3 normal = normalize(cross(tangent, vec3(0.0,0.0,1.0)));
  vec3 binormal = normalize(cross(tangent,normal));
  vec3 knot = knotCenter + (normal*cos(gatheredPhi)+binormal*sin(gatheredPhi)) * tube * .72;
  vec3 gathered = mix(ring, knot, uFormation);
  gathered *= 1.0 + uBass * .035;

  float ribbonKnot = 1.0-smoothstep(.1,.6,abs(field-3.0));
  vec3 outward = normalize(gathered + .001);
  vec3 turbulence = curl(gathered * 1.25 + vec3(uTime * .22));
  vec3 scattered = vec3(0.0);
  if (field < 3.0) {
    // Each grain keeps a stable trajectory through four different releases.
    float grain = seed.w;
    float spread = .25 + grain * grain;

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

    vec4 weights = 1.0-smoothstep(vec4(0.0),vec4(1.0),abs(vec4(field)-vec4(0.0,1.0,2.0,3.0)));
    weights /= max(dot(weights,vec4(1.0)),.001);
    scattered = bloom*weights.x+vortex*weights.y+ribbon*weights.z+lobes*weights.w;
    scattered += turbulence * (.18+uMid*.18+uHigh*.13+uFlux*.08);
    scattered += outward * (uBass*.13+uHit*.22) * (.65+.35*sin(theta*4.0+uTime));

  }
  if (field > 2.1) {
    vec3 bounded;
    bounded = releaseShape(field,theta,phi,tube,seed.z,fract(seed.y/TAU+1.0),pulse);
    bounded += turbulence * (.025+uMid*.025+uHigh*.018+uFlux*.012) * (1.0-ribbonKnot*.75);
    bounded += outward * (uBass*.06+uHit*.08) * (.65+.35*sin(theta*4.0+uTime)) * (1.0-ribbonKnot*.8);
    scattered = mix(scattered,bounded,smoothstep(2.1,3.0,field));
  }

  vec3 target = mix(gathered,scattered,release);
  target += turbulence * .018 * (1.0-release);
  return vec4(target,1.0);
}

void main() {
  vec2 ref = gl_FragCoord.xy/resolution.xy;
  vec4 old = texture2D(texturePosition,ref);
  vec4 seed = texture2D(uOrigins,ref);
  float release = smoothstep(0.0,1.0,uDispersion);
  float frequency = texture2D(uSpectrum,vec2(seed.x/TAU,.5)).r;
  vec4 from = pose(uFromStyle,seed,frequency,release,ref);
  vec4 target = from;
  if (uMorph > 0.0 && abs(uFromStyle-uToStyle) > .01) {
    target = mix(from,pose(uToStyle,seed,frequency,release,ref),uMorph);
  }
  float pointerDistance = distance(old.xy,uPointer.xy);
  target.xy += normalize(old.xy-uPointer.xy+.001)*exp(-pointerDistance*2.0)*uPointer.z*.10*(1.0-uToyota);
  float attraction = mix(1.0-exp(-uDelta*mix(9.0,4.5,release)),1.0,uToyota);
  gl_FragColor = vec4(mix(old.xyz,target.xyz,attraction),target.w);
}
