import{E as Gt,Q as It,V as gt,W as Lt,L as qt,S as Vt,C as Wt,P as Yt,G as yt,D as bt,R as jt,U as Xt,a as xt,b as $t,c as Kt,d as Qt,e as at,f as Zt,g as Jt,h as te,F as ee,N as ne,i as oe,B as st,j as X,k as rt,A as lt,l as wt,m as Tt,n as ie,M as $}from"./three-CLqIBnEB.js";const ae=`uniform sampler2D uOrigins;
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
`,se=`attribute vec2 aReference;
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
`,re=`varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = length(uv);
  float core = 1.0 - smoothstep(.12, .5, r);
  float halo = exp(-r * 9.0) * .25;
  float alpha = (core + halo) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`,le=`uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHit;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 centered = vUv - .5;
  vec2 aberration = centered * (.00045 + uHit * .0006);
  vec3 color;
  color.r = texture2D(tDiffuse, vUv + aberration).r;
  color.g = texture2D(tDiffuse, vUv).g;
  color.b = texture2D(tDiffuse, vUv - aberration).b;
  color = vec3(1.0) - exp(-color * 1.12);
  color = pow(color, vec3(.92));
  float vignette = 1.0 - dot(centered * vec2(.75, .9), centered * vec2(.75, .9)) * .65;
  color *= vignette;
  // Very fine film grain lives in the artwork, underneath the actual DOM text.
  float grain = (hash(vUv * uResolution + fract(uTime * .07)) - .5) / 255.0;
  color += grain;
  gl_FragColor = vec4(color,1.0);
}
`,ce=`uniform float uToyotaPhase;
uniform float uToyotaFlowTime;
uniform sampler2D uToyotaSurface;
uniform vec2 uToyotaSurfaceSize;
uniform vec4 uToyotaSurfaceBounds;

// Manual bilinear lookup avoids relying on float texture filtering.
vec4 toyotaSurface(vec2 point) {
  vec2 cell = clamp((point-uToyotaSurfaceBounds.xy)/uToyotaSurfaceBounds.zw*uToyotaSurfaceSize-.5,
                    vec2(0.0),uToyotaSurfaceSize-1.0);
  vec2 a = floor(cell), b = min(a+1.0,uToyotaSurfaceSize-1.0), blend = fract(cell);
  vec4 p = texture2D(uToyotaSurface,(a+.5)/uToyotaSurfaceSize);
  vec4 q = texture2D(uToyotaSurface,(vec2(b.x,a.y)+.5)/uToyotaSurfaceSize);
  vec4 r = texture2D(uToyotaSurface,(vec2(a.x,b.y)+.5)/uToyotaSurfaceSize);
  vec4 s = texture2D(uToyotaSurface,(b+.5)/uToyotaSurfaceSize);
  return mix(mix(p,q,blend.x),mix(r,s,blend.x),blend.y);
}

// Fine material transport is distinct from moving the body. One direction
// and one phase traverse the entire fused surface, including its junctions.
// Displacement fades to zero at all edges, keeping the silhouette and holes.
vec2 toyotaGrainXY(vec2 rest, float distance, float time) {
  float shift = .045*smoothstep(.008,.14,-distance)*sin(rest.x*1.7+rest.y*.9-time*2.0);
  return vec2(rest.x+.943858*shift,rest.y+.330350*shift);
}

vec3 toyotaSurfaceGrain(vec3 rest, float time) {
  vec4 surface = toyotaSurface(rest.xy);
  vec2 point = toyotaGrainXY(rest.xy,surface.x,time);
  float face = rest.z/max(surface.w,.0001);
  return vec3(point,toyotaSurface(point).w*face);
}

// Deform the fused body in material coordinates. Every point sees the same
// long travelling wave, including all junctions and both sides of the body.
// Each sequential shear omits its own coordinate: it is invertible and has
// determinant one, so the material cannot fold over or split into currents.
vec3 toyotaDeform(vec3 rest, float phase) {
  float x = rest.x;
  float y = rest.y;
  float z = rest.z;
  z += .30*sin(.85*x+.55*y-phase);
  x += .20*sin(.65*y+.35*z-phase);
  y += .14*sin(.70*x+.30*z-phase);
  return vec3(x,y,z);
}
`,ue=`float toyotaNoise(vec2 point) {
  vec2 cell = floor(point), f = fract(point);
  vec2 blend = f*f*(3.0-2.0*f);
  float a = fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
  float b = fract(sin(dot(cell+vec2(1.0,0.0),vec2(127.1,311.7)))*43758.5453);
  float c = fract(sin(dot(cell+vec2(0.0,1.0),vec2(127.1,311.7)))*43758.5453);
  float d = fract(sin(dot(cell+vec2(1.0,1.0),vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,blend.x),mix(c,d,blend.x),blend.y);
}

// Advect one fine copper texture across the complete material, rather than
// lighting separate ovals or making oversized pale spark particles.
float toyotaSheen(vec3 material, float time) {
  vec2 uv = material.xy*13.0+material.z*vec2(1.8,.7)-vec2(.90,.36)*time;
  float grain = toyotaNoise(uv)*.60+toyotaNoise(uv*2.03+vec2(9.2,3.7))*.40;
  return .68+.64*grain;
}
`,D=(e,t=1)=>Math.min(t,Math.max(0,Number.isFinite(e)?e:0)),V=(e,t,n)=>{const c=D((n-e)/(t-e));return c*c*(3-2*c)},he=e=>{const t=D(e);return D(t*t*t*(t*(t*6-15)+10))},W=(e,t,n)=>e+(t-e)*n,St=Array.from({length:13},(e,t)=>t),Mt=[0,1,8,9,2,10,3,11,4,12,5,6,7],_=[9.2,11.4,6.4,8.6,12.8,9.2,11.4,8.6,12.8,9.2,11.4,8.6,12.8],K=[0,.88,.3,1],Pt=[1,.94,.96,.98,.91,.96,1,.93,.98],ct=_.reduce((e,t)=>e+t,0),Z=2.2,J=.9,zt=.65,Y=6.4,me=(e,t)=>e===8||t===8?J:Z;function de(e,t){return(e.fromStyle===t?1-e.morph:0)+(e.toStyle===t?e.morph:0)}function fe({random:e=Math.random}={}){const t={dispersion:.025,style:0,formation:.25,fromStyle:0,toStyle:0,morph:1,toyota:0};let n=t.dispersion,c=0,l=0,s=[...Mt],h=[...K],r=!1,d=!1,i=Y,a=n,u=!1,o=Z,p=Z,g=0;const z=v=>v[Math.min(v.length-1,Math.floor(D(e())*v.length))],f=(v,S)=>{const m=v.filter(x=>x!==S);for(let x=m.length-1;x>0;x--){const A=Math.min(x,Math.floor(D(e())*(x+1)));[m[x],m[A]]=[m[A],m[x]]}return[S,...m]};return{sample(v={}){const{time:S,features:m,active:x=0,delta:A=1/60}=v,F=Number.isFinite(S)?Math.max(0,S):c,b=Number.isFinite(A)?Math.min(.25,Math.max(0,A)):1/60;if(b>1/120+1e-9){const N=Math.ceil(b*120-1e-9);for(let it=1;it<=N;it++)this.sample({time:Math.max(0,F-b+b*it/N),features:m,active:x,delta:b/N});return t}c=F;const M=D(x),G=D(m==null?void 0:m[0]),I=D(m==null?void 0:m[1]),L=D(m==null?void 0:m[2]),H=D(m==null?void 0:m[3]),C=D(m==null?void 0:m[4]),q=D(m==null?void 0:m[7]),R=i<Y;R&&u&&b>0&&(i=Math.min(Y,i+b),i===Y&&(l=(s[0]===8?_[0]+_[1]*.08:_[0]*.08)-F));let B=((F+l)%ct+ct)%ct,w=0;for(;w<_.length-1&&B>=_[w];)B-=_[w++];const E=B/_[w],T=(w+1)%s.length;let U;if(R)U=s[0]===8&&i>=J+zt?s[1]:s[0];else if(s[w]===8){const N=_[w]*.45-J;U=B<N?s[(w+s.length-1)%s.length]:B<N+J+zt?8:s[T]}else U=E>=.76&&s[T]!==8?s[T]:s[w];!d&&b>0&&(r||(g=s[w]===8?U:s[w]),t.fromStyle=t.toStyle=g,d=!0),o>=p&&U!==g&&b>0&&(t.fromStyle=g,t.toStyle=U,p=me(g,U),o=0),R&&t.toStyle===s[0]&&b>0&&(u=!0),o<p&&(o=Math.min(p,o+b),t.morph=he(o/p),o===p&&(g=t.toStyle,t.fromStyle=t.toStyle=g,t.morph=1)),t.style=W(t.fromStyle,t.toStyle,t.morph),t.toyota=de(t,8);const pt=V(.25,.45,E)*(1-V(.63,.88,E))*Pt[w%Pt.length],vt=.025+.012*Math.sin(F*.31)**2,nt=V(.012,.11,G)*M,Bt=G*.46+I*.24+L*.18+H*.12,Et=.72+Math.sqrt(Bt)*.2+Math.sqrt(C*.6+q*.4)*.08;let ot=W(vt,.022+pt*Et,nt);if(R){const N=i/Y;ot=W(vt,W(a,.8,V(0,.32,N)),1-V(.66,1,N))}n+=(ot-n)*(1-Math.exp(-b/(ot>n?.38:.62)));const Ht=r&&n>.12;t.dispersion=D(n,R||Ht?1:.12+M*.88);const Ot=V(.5,.9,E),kt=r?D(h[0]+.035*Math.sin(F*.065)**2):.25+.1*Math.sin(F*.065)**2,Nt=D(W(h[w%h.length],h[T%h.length],Ot)+(L-H)*.06*pt*nt),_t=R?h[0]:W(kt,Nt,nt);return t.formation+=(_t-t.formation)*(1-Math.exp(-b/.9)),t},randomize(){const v=z(St.filter(m=>m!==t.fromStyle&&m!==t.toStyle)),S=z(K.filter(m=>Math.abs(m-t.formation)>=.45));s=f(St,v),h=f(K,S),r=!0,a=t.dispersion,i=0,u=!1},reset(){Object.assign(t,{dispersion:.025,style:0,formation:.25,fromStyle:0,toStyle:0,morph:1,toyota:0}),n=.025,c=0,l=0,s=[...Mt],h=[...K],r=!1,d=!1,i=Y,a=.025,u=!1,o=p=Z,g=0}}}const k=(e,t=1)=>Math.min(t,Math.max(0,Number.isFinite(e)?e:0)),Dt=e=>{const t=k(e);return k(t*t*t*(t*(t*6-15)+10))},j=3.6,ut=[[.2,.35],[.65,.8]];function pe(){const e={amount:0,angle:0};let t=j,n=0,c=!0,l=0,s=0,h=!1,r=1,d=null,i=.3,a=-1/0;const u=ut.map(()=>!1);return{sample({features:o,active:p=0,delta:g=1/60,playbackTime:z,duration:f}={}){const v=k(g,.1);if(!v)return e;const S=k(p),m=k(o==null?void 0:o[0],1.5)*S,x=k(o==null?void 0:o[1],1.5)*S,A=k(o==null?void 0:o[4],1.5)*S,F=k(o==null?void 0:o[7])*S,b=Number.isFinite(z)&&z>=0&&Number.isFinite(f)&&f>0,M=b?Math.min(z,f):0,G=b&&d!==null?M-d:0,I=b&&d!==null&&Math.abs(G)>Math.max(.2,v*4);I&&(l=m,s=x,i=0,c=!1),b&&(d=M,ut.forEach((E,T)=>{M>f*E[1]&&(u[T]=!0)})),i=Math.min(.3,i+v),h||(l=m,s=x,h=!0);const L=Math.max(0,m-l),H=Math.max(0,x-s),C=k(Math.max(F,A*.35+L*.6,H*.9)),q=1-Math.exp(-v/.8);l+=(m-l)*q,s+=(x-s)*q,C<.4&&(c=!0);const R=c&&C>.9;R&&(c=!1);const B=b?ut.findIndex(([E,T],U)=>!u[U]&&M>=f*E&&M<=f*T):-1,w=M-a>=Math.max(j+4,f*.3);return B>=0&&!I&&G>0&&i>=.3&&w&&R&&t>=j&&m>.1&&(t=0,u[B]=!0,a=M,n=.72+.28*C,r*=-1,e.angle=r*(.1+.1*k(o==null?void 0:o[5]))),t=Math.min(j,t+v),e.amount=n*Dt(t/.9)*(1-Dt((t-1.25)/(j-1.25))),e},reset(){e.amount=e.angle=0,t=j,n=l=s=0,c=!0,h=!1,r=1,d=null,i=.3,a=-1/0,u.fill(!1)}}}const y=768,P=512,mt=-2.25,dt=-1.55,tt=4.5,et=3.1,Rt=.36,ft=.105,ht=.06,ve=[{rx:2.055,ry:1.345,cy:0,width:.145},{rx:.415,ry:1.105,cy:0,width:.175},{rx:1.49,ry:.525,cy:.6,width:.165}];function ge(e,t,n){t-=n.cy;const c=Math.hypot(e/n.rx,t/n.ry),l=Math.hypot(e/(n.rx*n.rx),t/(n.ry*n.ry));return l>1e-10?c*(c-1)/l:-Math.min(n.rx,n.ry)}function ye(e,t){const n=Math.max(ht-Math.abs(e-t),0)/ht;return Math.min(e,t)-n*n*ht*.25}function be(e,t){let n=1/0;for(const c of ve)n=ye(n,Math.abs(ge(e,t,c))-c.width);return n}function At(e,t){const n=new Float64Array(y*P),c=new Float64Array(n.length),l=new Float64Array(Math.max(y,P)),s=new Float64Array(l.length),h=new Int32Array(l.length),r=new Float64Array(l.length+1);function d(i,a){let u=0;h[0]=0,r[0]=-1/0,r[1]=1/0;for(let o=1;o<i;o++){let p;do{const g=h[u];if(p=(l[o]+a*o*o-(l[g]+a*g*g))/(2*a*(o-g)),p>r[u])break;u--}while(u>=0);u++,h[u]=o,r[u]=p,r[u+1]=1/0}u=0;for(let o=0;o<i;o++){for(;r[u+1]<o;)u++;s[o]=a*(o-h[u])**2+l[h[u]]}}for(let i=0;i<P;i++){for(let a=0;a<y;a++)l[a]=e[i*y+a]===t?0:1e6;d(y,(tt/y)**2),n.set(s.subarray(0,y),i*y)}for(let i=0;i<y;i++){for(let a=0;a<P;a++)l[a]=n[a*y+i];d(P,(et/P)**2);for(let a=0;a<P;a++)c[a*y+i]=s[a]}return c}function xe(e,t,n,c){const l=new Float64Array(e.length),s=[],h=[];for(let u=1;u<P-1;u++)for(let o=1;o<y-1;o++){const p=u*y+o;e[p]&&((u+o)%2?s:h).push(p)}const r=(ft/n)**2,d=(ft/c)**2,i=1+2*(r+d);for(let u=0;u<240;u++){let o=0;for(const p of[s,h])for(const g of p){const f=((1+r*(l[g-1]+l[g+1])+d*(l[g-y]+l[g+y]))/i-l[g])*1.8;l[g]+=f,o=Math.max(o,Math.abs(f))}if(o<5e-6)break}const a=new Float32Array(e.length);for(const u of[s,h])for(const o of u){const p=Math.max(0,Math.min(1,-t[o]/.012));a[o]=Rt*Math.sqrt(Math.max(0,l[o])*p*(2-p))}for(let u=0;u<P;u++)for(let o=0;o<y/2;o++){const p=u*y+o,g=u*y+y-1-o,z=(a[p]+a[g])*.5;a[p]=a[g]=z}return a}function we(){const e=new Float32Array(y*P*4),t=new Uint8Array(y*P),n=tt/y,c=et/P;for(let i=0;i<P;i++)for(let a=0;a<y;a++){const u=mt+(a+.5)*n,o=dt+(i+.5)*c;t[i*y+a]=be(u,o)<0?1:0}const l=At(t,1),s=At(t,0),h=new Float32Array(t.length),r=Math.min(n,c)*.5;for(let i=0;i<t.length;i++)h[i]=(t[i]?-1:1)*Math.max(0,Math.sqrt(t[i]?s[i]:l[i])-r);const d=xe(t,h,n,c);for(let i=0;i<P;i++)for(let a=0;a<y;a++){const u=i*y+a,o=(d[i*y+Math.min(y-1,a+1)]-d[i*y+Math.max(0,a-1)])/(2*n),p=(d[Math.min(P-1,i+1)*y+a]-d[Math.max(0,i-1)*y+a])/(2*c);e.set([h[u],o,p,d[u]],u*4)}return{data:e,width:y,height:P,bounds:[mt,dt,tt,et],depth:Rt,roundness:ft}}let Te;const Ut=()=>Te||(Te=we());function Se(){const e=Ut();return{...e,data:e.data.slice(),bounds:[...e.bounds]}}function Ct(e,t,n){const[c,l,s,h]=e.bounds,r=Math.max(0,Math.min(e.width-1,(t-c)/s*e.width-.5)),d=Math.max(0,Math.min(e.height-1,(n-l)/h*e.height-.5)),i=Math.floor(r),a=Math.min(e.width-1,i+1),u=Math.floor(d),o=Math.min(e.height-1,u+1),p=r-i,g=d-u;return Array.from({length:4},(z,f)=>{const v=e.data[(u*e.width+i)*4+f],S=e.data[(u*e.width+a)*4+f],m=e.data[(o*e.width+i)*4+f],x=e.data[(o*e.width+a)*4+f];return(v+(S-v)*p)*(1-g)+(m+(x-m)*p)*g})}function Me(e){if(!Number.isSafeInteger(e)||e<0)throw new RangeError("Toyota particle count must be a non-negative safe integer.");return new Float32Array(e*4)}let Q;function Pe(e){if(Q)return Q;const t=new Float64Array(e.width*e.height);let n=0;for(let c=0;c<t.length;c++){const[l,s,h]=e.data.subarray(c*4,c*4+3);l<-.002&&(n+=Math.hypot(1,s,h)),t[c]=n}return Q={weights:t,total:n},Q}function ze(e,t){let n=1953462639;const c=()=>{n=n+1831565813|0;let r=Math.imul(n^n>>>15,1|n);return r=r+Math.imul(r^r>>>7,61|r)^r,((r^r>>>14)>>>0)/4294967296},l=Ut(),{weights:s,total:h}=Pe(l);for(let r=0;r<e;r++){let d,i;do{const u=c()*h;let o=0,p=s.length-1;for(;o<p;){const g=o+p>>>1;s[g]<=u?o=g+1:p=g}d=mt+(o%y+c())/y*tt,i=dt+(Math.floor(o/y)+c())/P*et}while(Ct(l,d,i)[0]>-.002);const a=(c()<.68?1:-1)*(.96+c()*.04);t(r,d,i,a,c(),l)}}function De(e){const t=Me(e);return ze(e,(n,c,l,s,h,r)=>{const d=Ct(r,c,l)[3];t.set([c,l,d*s,h],n*4)}),t}const O=Math.PI*2;function Ft(e=771){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}class Fe{constructor(t){this.container=t,this.mobile=matchMedia("(max-width: 760px)").matches,this.size=this.mobile?192:320,this.particleCount=this.size**2,this.choreography=fe(),this.spatialMotion=pe(),this.motionState=this.choreography.sample({time:0,delta:0}),this.toyotaBlend=0,this.toyotaTime=0,this.toyotaFlowSpeed=.75,this.toyotaPhase=0,this.toyotaFlowTime=0,this.toyotaEuler=new Gt(.3,-.3,-.08),this.toyotaOrientation=new It().setFromEuler(this.toyotaEuler),this.pointer=new gt(0,0,0),this.smoothedPointer=new gt(0,0,0),this.renderer=new Lt({alpha:!1,antialias:!1,powerPreference:"high-performance"}),this.renderer.setClearColor(592395,1),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.mobile?1.5:1.75)),this.renderer.outputColorSpace=qt,t.appendChild(this.renderer.domElement),this.scene=new Vt,this.scene.background=new Wt(592395),this.camera=new Yt(42,1,.1,35),this.camera.position.z=7.8,this.group=new yt,this.artwork=new yt,this.artwork.matrixAutoUpdate=!1,this.scene.add(this.artwork),this.artwork.add(this.group),this.spectrumBytes=new Uint8Array(64),this.spectrum=new bt(this.spectrumBytes,64,1,jt,Xt),this.spectrum.minFilter=xt,this.spectrum.magFilter=xt,this.spectrum.needsUpdate=!0,this.initParticles(),this.initDust(),this.initFilaments(),this.composer=new $t(this.renderer),this.composer.addPass(new Kt(this.scene,this.camera)),this.bloom=new Qt(new at(1,1),.3,.45,.7),this.composer.addPass(this.bloom),this.composite=new Zt({uniforms:{tDiffuse:{value:null},uResolution:{value:new at(1,1)},uTime:{value:0},uHit:{value:0}},vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:le}),this.composer.addPass(this.composite),this.resize(),this.onResize=()=>this.resize(),this.onPointer=n=>{this.pointer.set((n.clientX/innerWidth-.5)*5,(.5-n.clientY/innerHeight)*4,1)},this.onPointerLeave=()=>{this.pointer.z=0},window.addEventListener("resize",this.onResize),window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onPointerLeave),this.renderer.domElement.addEventListener("webglcontextlost",n=>{n.preventDefault(),document.documentElement.classList.add("no-webgl")}),this.renderer.domElement.addEventListener("webglcontextrestored",()=>location.reload())}initParticles(){const t=Ft();this.compute=new Jt(this.size,this.size,this.renderer);const n=this.compute.createTexture(),c=this.compute.createTexture(),l=De(this.particleCount);this.toyotaTexture=this.compute.createTexture(),this.toyotaTexture.needsUpdate=!0;const s=Se();this.toyotaSurface=new bt(s.data,s.width,s.height,te,ee),this.toyotaSurface.minFilter=this.toyotaSurface.magFilter=ne,this.toyotaSurface.needsUpdate=!0;const h=new Float32Array(this.particleCount*2),r=new Float32Array(this.particleCount*3),d=new Float32Array(this.particleCount*3);for(let f=0;f<this.particleCount;f++){const v=t()*O,m=Math.floor(t()*160)/160*O+(t()-.5)*.022,x=.91+t()*.12,A=t();c.image.data.set([v,m,x,A],f*4);const F=x*(.44+.14*Math.sin(v*3)),b=m+v*3+Math.sin(v*3)*.3,M=1.67+F*Math.cos(b)+Math.sin(v*2+.6)*.12;n.image.data.set([M*Math.cos(v),M*Math.sin(v),F*Math.sin(b)+Math.sin(v*3)*.22,1],f*4),h.set([(f%this.size+.5)/this.size,(Math.floor(f/this.size)+.5)/this.size],f*2),r.set([v/O,t(),m/O],f*3)}const i=Array.from({length:this.particleCount},(f,v)=>v),a=Float32Array.from(i,f=>(Math.atan2(l[f*4+1],l[f*4])+O)%O),u=[...i].sort((f,v)=>c.image.data[f*4]-c.image.data[v*4]),o=i.sort((f,v)=>a[f]-a[v]);for(let f=0;f<this.particleCount;f++){const v=o[f]*4,S=u[f]*4;this.toyotaTexture.image.data.set(l.subarray(v,v+4),S)}this.positionVariable=this.compute.addVariable("texturePosition",`${ce}
${ae}`,n),this.compute.setVariableDependencies(this.positionVariable,[this.positionVariable]),this.simUniforms={uOrigins:{value:c},uSpectrum:{value:this.spectrum},uTime:{value:0},uDelta:{value:1/60},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uFlux:{value:0},uDispersion:{value:.025},uFormation:{value:.25},uActive:{value:0},uPointer:{value:this.smoothedPointer}},this.simUniforms.uToyota={value:0},this.simUniforms.uToyotaGrains={value:this.toyotaTexture},this.simUniforms.uFromStyle={value:0},this.simUniforms.uToStyle={value:0},this.simUniforms.uMorph={value:1},this.simUniforms.uToyotaPhase={value:0},this.simUniforms.uToyotaFlowTime={value:0},this.simUniforms.uToyotaSurface={value:this.toyotaSurface},this.simUniforms.uToyotaSurfaceSize={value:new at(s.width,s.height)},this.simUniforms.uToyotaSurfaceBounds={value:new oe(...s.bounds)},Object.assign(this.positionVariable.material.uniforms,this.simUniforms);const p=this.compute.init();if(p)throw new Error(p);this.originTexture=c,this.uniforms={uPositions:{value:this.compute.getCurrentRenderTarget(this.positionVariable).texture},uSpectrum:{value:this.spectrum},uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uDispersion:{value:.025},uActive:{value:0},uCameraDistance:{value:7.8},uParticleScale:{value:1},uPixelRatio:{value:this.renderer.getPixelRatio()}},this.uniforms.uToyota={value:0},this.uniforms.uToyotaGrains={value:this.toyotaTexture},this.uniforms.uToyotaFlowTime={value:0};const g=new st;g.setAttribute("position",new X(d,3)),g.setAttribute("aReference",new X(h,2)),g.setAttribute("aSeed",new X(r,3));const z=new rt({uniforms:this.uniforms,vertexShader:`${ue}
${se}`,fragmentShader:re,transparent:!0,depthWrite:!1,blending:lt});this.points=new wt(g,z),this.points.frustumCulled=!1,this.group.add(this.points)}initDust(){const t=Ft(89),n=this.mobile?3500:14e3,c=new Float32Array(n*3),l=new Float32Array(n);for(let r=0;r<n;r++){const d=2.5+t()**1.5*8,i=t()*O,a=t()*2-1;c.set([Math.cos(i)*Math.sqrt(1-a*a)*d,Math.sin(i)*Math.sqrt(1-a*a)*d,a*d-3],r*3),l[r]=t()}const s=new st;s.setAttribute("position",new X(c,3)),s.setAttribute("aSeed",new X(l,1)),this.dustUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uDispersion:{value:.025},uCameraDistance:{value:7.8},uPixelRatio:{value:this.renderer.getPixelRatio()}},this.dustUniforms.uToyota={value:0};const h=new rt({uniforms:this.dustUniforms,vertexShader:`
        attribute float aSeed;
        uniform float uTime,uBass,uMid,uHigh,uHit,uEnergy,uDispersion,uCameraDistance,uPixelRatio,uToyota;
        varying float vAlpha;
        void main(){
          vec3 p=position;
          float t=uTime*(.025+aSeed*.02)+uBass*(.02+uDispersion*.12);
          p.xz=mat2(cos(t),-sin(t),sin(t),cos(t))*p.xz;
          vec3 flow=vec3(sin(p.y*.7+uTime+aSeed*6.28),cos(p.z*.6-uTime*.8),sin(p.x*.5+uTime*.9));
          p+=flow*(.08+uMid*(.08+uDispersion*.5)+uHigh*(.05+uDispersion*.3));
          p+=normalize(position)*(uBass*.06+uHit*(.05+uDispersion*.5))*(.5+aSeed*.5);
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((.6+aSeed*.6)*uPixelRatio*(uCameraDistance/-mv.z),.5,1.6*uPixelRatio);
          vAlpha=(.09+aSeed*.25)*(1.+uEnergy*.4+uHigh*.4)*(1.-smoothstep(uCameraDistance+5.,uCameraDistance+18.,-mv.z));
          vAlpha*=1.-uToyota*.55;
        }`,fragmentShader:"varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.62,.30,.12,(1.-smoothstep(.05,.5,r))*vAlpha);}",transparent:!0,depthWrite:!1,blending:lt});this.dust=new wt(s,h),this.artwork.add(this.dust)}initFilaments(){const t=[],n=[];for(let r=0;r<22;r++)for(let d=0;d<320;d++)for(let i=0;i<2;i++){const a=(d+i)/320*O,u=r/22*O+a*3,o=.48+.12*Math.sin(a*3),p=1.67+o*Math.cos(u);t.push(p*Math.cos(a),p*Math.sin(a),o*Math.sin(u)+Math.sin(a*3)*.22),n.push(a,r/22)}const s=new st;s.setAttribute("position",new Tt(t,3)),s.setAttribute("aPhase",new Tt(n,2)),this.lineUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHit:{value:0},uDispersion:{value:.025},uFormation:{value:.25},uToyota:{value:0}};const h=new rt({uniforms:this.lineUniforms,vertexShader:`
        attribute vec2 aPhase;
        uniform float uTime,uBass,uMid,uHit,uDispersion,uFormation,uToyota;
        varying float vAlpha;
        void main(){
          float theta=aPhase.x+uTime*.12+uBass*.08;
          float phi=aPhase.y*6.2831853+uTime*.23+theta*3.+sin(theta*3.+uTime*.13)*.3+uMid*.12;
          float tube=(.42+.10*sin(theta*3.-uTime*.16))*(1.+uBass*.14);
          float radius=1.67+tube*cos(phi)+sin(theta*2.+.6)*.12;
          vec3 ring=vec3(radius*cos(theta),radius*sin(theta),tube*sin(phi)+sin(theta*3.+uTime*.16)*.22);
          vec3 center=vec3(sin(theta)+2.*sin(2.*theta),cos(theta)-2.*cos(2.*theta),-sin(3.*theta))*.68;
          vec3 tangent=normalize(vec3(cos(theta)+4.*cos(2.*theta),-sin(theta)+4.*sin(2.*theta),-3.*cos(3.*theta)));
          vec3 normal=normalize(cross(tangent,vec3(0.,0.,1.)));
          vec3 binormal=normalize(cross(tangent,normal));
          vec3 knot=center+(normal*cos(phi)+binormal*sin(phi))*tube*.72;
          vec3 p=mix(ring,knot,uFormation)*(1.+uBass*.035);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          vAlpha=(.025+.035*pow(.5+.5*sin(theta*2.+aPhase.y*6.28-uTime*.2),5.))*(1.+uHit*.25)*(1.-uDispersion*.9)*(1.-uToyota);
        }`,fragmentShader:"varying float vAlpha;void main(){gl_FragColor=vec4(.85,.42,.19,vAlpha);}",transparent:!0,depthWrite:!1,blending:lt});this.filaments=new ie(s,h),this.group.add(this.filaments)}randomize(){this.choreography.randomize()}resize(){var s,h;const t=this.container.clientWidth,n=this.container.clientHeight;this.mobile=t<=760,this.camera.aspect=t/n,this.camera.position.z=this.mobile?Math.max(8.6,5.1/(2*Math.tan($.degToRad(21))*this.camera.aspect)):7.8,this.baseCameraZ=this.camera.position.z,this.camera.position.x=this.camera.position.y=0,this.uniforms.uCameraDistance.value=this.camera.position.z,this.dustUniforms.uCameraDistance.value=this.camera.position.z,this.camera.updateProjectionMatrix();const c=2*this.camera.position.z*Math.tan($.degToRad(21))*this.camera.aspect,l=c/this.camera.aspect;if(this.mobile){const r=document.querySelector(".header").getBoundingClientRect().bottom+8,d=Math.max(r+80,document.querySelector(".hero").getBoundingClientRect().top-22),i=Math.min(t*.38,(d-r)*.47),a=(r+d)*.5,u=n/l;this.group.position.set(.12,(.5-a/n)*l,0),this.group.scale.setScalar(i/(u*2.2)),this.uniforms.uParticleScale.value=Math.min(1,this.group.scale.x/.78)}else this.group.position.set(c*.16,.28,0),this.group.scale.setScalar(1.06),this.uniforms.uParticleScale.value=1;this.baseGroupScale=this.group.scale.x,this.renderer.setSize(t,n),(s=this.composer)==null||s.setSize(t,n),(h=this.composite)==null||h.uniforms.uResolution.value.set(t*this.renderer.getPixelRatio(),n*this.renderer.getPixelRatio())}render({time:t,playbackTime:n,duration:c,features:l,spectrum:s,active:h,delta:r,zoom:d=1}){const i=l[1]*h,a=l[2]*h,u=l[3]*h,o=l[7]*h,p=l[0]*h,g=l[4]*h;this.motionState=this.choreography.sample({time:t,features:l,active:h,delta:r});const{fromStyle:z,toStyle:f,morph:v,formation:S,dispersion:m}=this.motionState;this.toyotaBlend=this.motionState.toyota,this.toyotaTime+=r,this.toyotaFlowSpeed+=(.75+p*.22-this.toyotaFlowSpeed)*(1-Math.exp(-r/.8)),this.toyotaFlowTime+=r*this.toyotaFlowSpeed,this.toyotaPhase=this.toyotaFlowTime%O;const x=$.smoothstep(m,.65,.98),A=$.lerp(m,x,this.toyotaBlend);this.spectrumBytes.set(s),this.spectrum.needsUpdate=!0,this.smoothedPointer.lerp(this.pointer,1-Math.exp(-r*3));const F={uTime:t,uDelta:Math.min(r,.05),uBass:i,uMid:a,uHigh:u,uHit:o,uEnergy:p,uFlux:g,uDispersion:A,uFromStyle:z,uToStyle:f,uMorph:v,uFormation:S,uToyota:this.toyotaBlend,uToyotaPhase:this.toyotaPhase,uToyotaFlowTime:this.toyotaFlowTime,uActive:h};for(const[T,U]of Object.entries(F))this.simUniforms[T]&&(this.simUniforms[T].value=U),this.uniforms[T]&&(this.uniforms[T].value=U),this.dustUniforms[T]&&(this.dustUniforms[T].value=U),this.lineUniforms[T]&&(this.lineUniforms[T].value=U);this.simUniforms.uDispersion.value=m,this.compute.compute(),this.uniforms.uPositions.value=this.compute.getCurrentRenderTarget(this.positionVariable).texture,this.group.rotation.set(.52+Math.sin(t*.1)*.16+this.smoothedPointer.y*.018,-.35+Math.sin(t*.08)*.2+a*.06*A+this.smoothedPointer.x*.015,-.38+t*.028+i*.03*A),this.toyotaEuler.set(.2+Math.sin(this.toyotaTime*.34)*.16,-.18+Math.sin(this.toyotaTime*.29)*.2,-.08+Math.sin(this.toyotaTime*.3)*.22),this.toyotaOrientation.setFromEuler(this.toyotaEuler),this.group.quaternion.slerp(this.toyotaOrientation,this.toyotaBlend);const b=T=>T===8?.86/(1+x*.24):1/(1+m*(T<3?this.mobile?.95:.65:this.mobile?.18:.12));this.group.scale.setScalar(this.baseGroupScale*$.lerp(b(z),b(f),v));const{amount:M,angle:G}=this.spatialMotion.sample({features:l,active:h,delta:r,playbackTime:n,duration:c}),I=1+M*(this.mobile?.4:1.05),L=1+M*.12,H=Math.cos(G),C=Math.sin(G),q=H*H*I+C*C*L,R=H*C*(I-L),B=C*C*I+H*H*L,w=this.group.position,E=w.x*(1-M*(this.mobile?.3:.85));this.artwork.matrix.set(q,R,0,E-q*w.x-R*w.y,R,B,0,w.y-R*w.x-B*w.y,0,0,1,0,0,0,0,1),this.artwork.matrixWorldNeedsUpdate=!0,this.camera.position.set(E*(1-1/d),w.y*(1-1/d),this.baseCameraZ/d),this.bloom.strength=.23+u*.1+o*.08+A*.08,this.composite.uniforms.uTime.value=t,this.composite.uniforms.uHit.value=o,this.composer.render()}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onPointerLeave),this.scene.traverse(t=>{var n;(n=t.geometry)==null||n.dispose(),t.material&&t.material.dispose()}),this.compute.dispose(),this.originTexture.dispose(),this.toyotaTexture.dispose(),this.toyotaSurface.dispose(),this.spectrum.dispose(),this.bloom.dispose(),this.composer.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}export{Fe as GrainScene};
