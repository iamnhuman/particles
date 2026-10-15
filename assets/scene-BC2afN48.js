import{V as B,W as te,L as ie,S as ne,C as se,P as oe,G as ae,D as re,R as ue,U as le,a as E,E as ce,b as he,c as me,d as L,e as pe,f as ve,B as A,g as P,h as R,A as F,i as k,F as V,j as de,M as _}from"./three-fN1FWpNU.js";const ge=`uniform sampler2D uOrigins;
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
`,fe=`attribute vec2 aReference;
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
varying vec3 vColor;
varying float vAlpha;
varying float vSpark;

void main() {
  vec4 data = texture2D(uPositions, aReference);
  vec3 p = data.xyz;
  float spectral = texture2D(uSpectrum, vec2(aSeed.x, .5)).r;
  vec3 outward = normalize(p + .0001);
  p += outward * uHit * (.022 + .2 * uDispersion) * (.7 + .3 * aSeed.y);
  p += sin(p.yzx * 5.0 + uTime * 2.0 + aSeed.z * 6.28) * uHigh * (.007 + .065 * uDispersion);
  p += vec3(-outward.y,outward.x,sin(aSeed.x*6.28+uTime)) * uMid * (.008 + .06 * uDispersion);
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
  vSpark = step(.997, aSeed.y);
  vColor = mix(vColor, vec3(1.4, 1.2, .9), vSpark * .75);
  float size = 1.05 + pow(aSeed.y, 5.0) * 1.65;
  size += vSpark * (1.0 + uHit * 4.0);
  size *= mix(1.0,.88,uDispersion);
  gl_PointSize = clamp(size * uPixelRatio * max(.65,uParticleScale) * (uCameraDistance / -viewPosition.z), .7, 13.0);
  vAlpha = (.5 + aSeed.z * .45) * (1.0-smoothstep(uCameraDistance+3.0, uCameraDistance+10.0, -viewPosition.z));
  vAlpha *= .82 + spectral * uActive * .3 + uHit * .2;
  vAlpha *= min(1.0,uParticleScale*uParticleScale);
  vAlpha *= mix(1.0,.67,uDispersion);
}
`,xe=`varying vec3 vColor;
varying float vAlpha;
varying float vSpark;
void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = length(uv);
  float core = 1.0 - smoothstep(.12, .5, r);
  float halo = exp(-r * 9.0) * .25;
  float rays = exp(-abs(uv.x) * 55.0) * exp(-abs(uv.y) * 5.0) + exp(-abs(uv.y) * 55.0) * exp(-abs(uv.x) * 5.0);
  float alpha = (core + halo + rays * vSpark * .4) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`,be=`uniform sampler2D tDiffuse;
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
`,v=(s,e=1)=>Math.min(e,Math.max(0,Number.isFinite(s)?s:0)),M=(s,e,i)=>{const r=v((i-s)/(e-s));return r*r*(3-2*r)},T=(s,e,i)=>s+(e-s)*i,S=[9.2,11.4,8.6,12.8],G=[0,.88,.3,1],ye=[1,.94,.98,.91],we=S.reduce((s,e)=>s+e,0);function Se(){const s={dispersion:.025,style:0,formation:.25};let e=s.dispersion,i=0;return{sample({time:r,features:t,active:u=0,delta:m=1/60}={}){const o=Number.isFinite(r)?Math.max(0,r):i;i=o;const a=Number.isFinite(m)?Math.min(.25,Math.max(0,m)):1/60,c=v(u),n=v(t==null?void 0:t[0]),l=v(t==null?void 0:t[1]),g=v(t==null?void 0:t[2]),h=v(t==null?void 0:t[3]),b=v(t==null?void 0:t[4]),y=v(t==null?void 0:t[5]),w=v(t==null?void 0:t[6]),p=v(t==null?void 0:t[7]);let d=o%we,f=0;for(;f<S.length-1&&d>=S[f];)d-=S[f++];const D=d/S[f],U=(f+1)%S.length,j=M(.25,.45,D),O=1-M(.63,.88,D),C=j*O*ye[f],W=.025+.012*Math.sin(o*.31)**2,z=M(.012,.11,n)*c,N=n*.46+l*.24+g*.18+h*.12,I=.72+Math.sqrt(N)*.2+Math.sqrt(b*.6+p*.4)*.08,H=T(W,.022+C*I,z),Y=1-Math.exp(-a/(H>e?.38:.62));e+=(H-e)*Y,s.dispersion=v(e,.12+c*.88);const Z=M(.58,.94,D),X=((y-.45)*.1+(w-.3)*.08+(h-l)*.04)*C*z,J=v(T(f,U,Z)+X,3);s.style+=(J-s.style)*(1-Math.exp(-a/.85));const K=M(.5,.84,D),Q=.25+.1*Math.sin(o*.065)**2,$=v(T(G[f],G[U],K)+(g-h)*.06*C*z),ee=T(Q,$,z);return s.formation+=(ee-s.formation)*(1-Math.exp(-a/.9)),s},reset(){s.dispersion=e=.025,s.style=0,s.formation=.25,i=0}}}const x=Math.PI*2;function q(s=771){return()=>{s|=0,s=s+1831565813|0;let e=Math.imul(s^s>>>15,1|s);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}class Me{constructor(e){this.container=e,this.mobile=matchMedia("(max-width: 760px)").matches,this.size=this.mobile?192:320,this.particleCount=this.size**2,this.choreography=Se(),this.motionState={dispersion:.025,style:0,formation:.25},this.pointer=new B(0,0,0),this.smoothedPointer=new B(0,0,0),this.renderer=new te({alpha:!1,antialias:!1,powerPreference:"high-performance"}),this.renderer.setClearColor(592395,1),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.mobile?1.5:1.75)),this.renderer.outputColorSpace=ie,e.appendChild(this.renderer.domElement),this.scene=new ne,this.scene.background=new se(592395),this.camera=new oe(42,1,.1,35),this.camera.position.z=7.8,this.group=new ae,this.scene.add(this.group),this.spectrumBytes=new Uint8Array(64),this.spectrum=new re(this.spectrumBytes,64,1,ue,le),this.spectrum.minFilter=E,this.spectrum.magFilter=E,this.spectrum.needsUpdate=!0,this.initParticles(),this.initDust(),this.initFilaments(),this.composer=new ce(this.renderer),this.composer.addPass(new he(this.scene,this.camera)),this.bloom=new me(new L(1,1),.3,.45,.7),this.composer.addPass(this.bloom),this.composite=new pe({uniforms:{tDiffuse:{value:null},uResolution:{value:new L(1,1)},uTime:{value:0},uHit:{value:0}},vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:be}),this.composer.addPass(this.composite),this.resize(),this.onResize=()=>this.resize(),this.onPointer=i=>{this.pointer.set((i.clientX/innerWidth-.5)*5,(.5-i.clientY/innerHeight)*4,1)},this.onPointerLeave=()=>{this.pointer.z=0},window.addEventListener("resize",this.onResize),window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onPointerLeave),this.renderer.domElement.addEventListener("webglcontextlost",i=>{i.preventDefault(),document.documentElement.classList.add("no-webgl")}),this.renderer.domElement.addEventListener("webglcontextrestored",()=>location.reload())}initParticles(){const e=q();this.compute=new ve(this.size,this.size,this.renderer);const i=this.compute.createTexture(),r=this.compute.createTexture(),t=new Float32Array(this.particleCount*2),u=new Float32Array(this.particleCount*3),m=new Float32Array(this.particleCount*3);for(let n=0;n<this.particleCount;n++){const l=e()*x,h=Math.floor(e()*160)/160*x+(e()-.5)*.022,b=.91+e()*.12,y=e();r.image.data.set([l,h,b,y],n*4);const w=b*(.44+.14*Math.sin(l*3)),p=h+l*3+Math.sin(l*3)*.3,d=1.67+w*Math.cos(p)+Math.sin(l*2+.6)*.12;i.image.data.set([d*Math.cos(l),d*Math.sin(l),w*Math.sin(p)+Math.sin(l*3)*.22,y],n*4),t.set([(n%this.size+.5)/this.size,(Math.floor(n/this.size)+.5)/this.size],n*2),u.set([l/x,e(),h/x],n*3)}this.positionVariable=this.compute.addVariable("texturePosition",ge,i),this.compute.setVariableDependencies(this.positionVariable,[this.positionVariable]),this.simUniforms={uOrigins:{value:r},uSpectrum:{value:this.spectrum},uTime:{value:0},uDelta:{value:1/60},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uFlux:{value:0},uDispersion:{value:.025},uStyle:{value:0},uFormation:{value:.25},uActive:{value:0},uPointer:{value:this.smoothedPointer}},Object.assign(this.positionVariable.material.uniforms,this.simUniforms);const o=this.compute.init();if(o)throw new Error(o);this.originTexture=r,this.uniforms={uPositions:{value:this.compute.getCurrentRenderTarget(this.positionVariable).texture},uSpectrum:{value:this.spectrum},uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uDispersion:{value:.025},uActive:{value:0},uCameraDistance:{value:7.8},uParticleScale:{value:1},uPixelRatio:{value:this.renderer.getPixelRatio()}};const a=new A;a.setAttribute("position",new P(m,3)),a.setAttribute("aReference",new P(t,2)),a.setAttribute("aSeed",new P(u,3));const c=new R({uniforms:this.uniforms,vertexShader:fe,fragmentShader:xe,transparent:!0,depthWrite:!1,blending:F});this.points=new k(a,c),this.points.frustumCulled=!1,this.group.add(this.points)}initDust(){const e=q(89),i=this.mobile?3500:14e3,r=new Float32Array(i*3),t=new Float32Array(i);for(let o=0;o<i;o++){const a=2.5+e()**1.5*8,c=e()*x,n=e()*2-1;r.set([Math.cos(c)*Math.sqrt(1-n*n)*a,Math.sin(c)*Math.sqrt(1-n*n)*a,n*a-3],o*3),t[o]=e()}const u=new A;u.setAttribute("position",new P(r,3)),u.setAttribute("aSeed",new P(t,1)),this.dustUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uDispersion:{value:.025},uCameraDistance:{value:7.8},uPixelRatio:{value:this.renderer.getPixelRatio()}};const m=new R({uniforms:this.dustUniforms,vertexShader:`
        attribute float aSeed;
        uniform float uTime,uBass,uMid,uHigh,uHit,uEnergy,uDispersion,uCameraDistance,uPixelRatio;
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
          gl_PointSize=(.7+aSeed*.9+uHit*.9)*uPixelRatio*(uCameraDistance/-mv.z);
          vAlpha=(.09+aSeed*.25)*(1.+uEnergy*.4+uHigh*.4)*(1.-smoothstep(uCameraDistance+5.,uCameraDistance+18.,-mv.z));
        }`,fragmentShader:"varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.68,.56,.44,(1.-smoothstep(.05,.5,r))*vAlpha);}",transparent:!0,depthWrite:!1,blending:F});this.dust=new k(u,m),this.scene.add(this.dust)}initFilaments(){const e=[],i=[];for(let o=0;o<22;o++)for(let a=0;a<320;a++)for(let c=0;c<2;c++){const n=(a+c)/320*x,l=o/22*x+n*3,g=.48+.12*Math.sin(n*3),h=1.67+g*Math.cos(l);e.push(h*Math.cos(n),h*Math.sin(n),g*Math.sin(l)+Math.sin(n*3)*.22),i.push(n,o/22)}const u=new A;u.setAttribute("position",new V(e,3)),u.setAttribute("aPhase",new V(i,2)),this.lineUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHit:{value:0},uDispersion:{value:.025},uFormation:{value:.25}};const m=new R({uniforms:this.lineUniforms,vertexShader:`
        attribute vec2 aPhase;
        uniform float uTime,uBass,uMid,uHit,uDispersion,uFormation;
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
          vAlpha=(.025+.035*pow(.5+.5*sin(theta*2.+aPhase.y*6.28-uTime*.2),5.))*(1.+uHit*.25)*(1.-uDispersion*.9);
        }`,fragmentShader:"varying float vAlpha;void main(){gl_FragColor=vec4(.85,.42,.19,vAlpha);}",transparent:!0,depthWrite:!1,blending:F});this.filaments=new de(u,m),this.group.add(this.filaments)}resize(){var u,m;const e=this.container.clientWidth,i=this.container.clientHeight;this.mobile=e<=760,this.camera.aspect=e/i,this.camera.position.z=this.mobile?Math.max(8.6,5.1/(2*Math.tan(_.degToRad(21))*this.camera.aspect)):7.8,this.baseCameraZ=this.camera.position.z,this.camera.position.x=this.camera.position.y=0,this.uniforms.uCameraDistance.value=this.camera.position.z,this.dustUniforms.uCameraDistance.value=this.camera.position.z,this.camera.updateProjectionMatrix();const r=2*this.camera.position.z*Math.tan(_.degToRad(21))*this.camera.aspect,t=r/this.camera.aspect;if(this.mobile){const o=document.querySelector(".header").getBoundingClientRect().bottom+8,a=Math.max(o+80,document.querySelector(".hero").getBoundingClientRect().top-22),c=Math.min(e*.38,(a-o)*.47),n=(o+a)*.5,l=i/t;this.group.position.set(.12,(.5-n/i)*t,0),this.group.scale.setScalar(c/(l*2.2)),this.uniforms.uParticleScale.value=Math.min(1,this.group.scale.x/.78)}else this.group.position.set(r*.16,.28,0),this.group.scale.setScalar(1.06),this.uniforms.uParticleScale.value=1;this.baseGroupScale=this.group.scale.x,this.renderer.setSize(e,i),(u=this.composer)==null||u.setSize(e,i),(m=this.composite)==null||m.uniforms.uResolution.value.set(e*this.renderer.getPixelRatio(),i*this.renderer.getPixelRatio())}render({time:e,features:i,spectrum:r,active:t,delta:u,zoom:m=1}){const o=i[1]*t,a=i[2]*t,c=i[3]*t,n=i[7]*t,l=i[0]*t,g=i[4]*t;this.motionState=this.choreography.sample({time:e,features:i,active:t,delta:u});const{dispersion:h,style:b,formation:y}=this.motionState;this.spectrumBytes.set(r),this.spectrum.needsUpdate=!0,this.smoothedPointer.lerp(this.pointer,1-Math.exp(-u*3));const w={uTime:e,uDelta:Math.min(u,1/30),uBass:o,uMid:a,uHigh:c,uHit:n,uEnergy:l,uFlux:g,uDispersion:h,uStyle:b,uFormation:y,uActive:t};for(const[p,d]of Object.entries(w))this.simUniforms[p]&&(this.simUniforms[p].value=d),this.uniforms[p]&&(this.uniforms[p].value=d),this.dustUniforms[p]&&(this.dustUniforms[p].value=d),this.lineUniforms[p]&&(this.lineUniforms[p].value=d);this.compute.compute(),this.uniforms.uPositions.value=this.compute.getCurrentRenderTarget(this.positionVariable).texture,this.group.rotation.set(.52+Math.sin(e*.1)*.16+this.smoothedPointer.y*.018,-.35+Math.sin(e*.08)*.2+a*.06*h+this.smoothedPointer.x*.015,-.38+e*.028+o*.03*h),this.group.scale.setScalar(this.baseGroupScale/(1+h*(this.mobile?.95:.65))),this.camera.position.set(this.group.position.x*(1-1/m),this.group.position.y*(1-1/m),this.baseCameraZ/m),this.bloom.strength=.23+c*.1+n*.08+h*.08,this.composite.uniforms.uTime.value=e,this.composite.uniforms.uHit.value=n,this.composer.render()}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onPointerLeave),this.scene.traverse(e=>{var i;(i=e.geometry)==null||i.dispose(),e.material&&e.material.dispose()}),this.compute.dispose(),this.originTexture.dispose(),this.spectrum.dispose(),this.bloom.dispose(),this.composer.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}export{Me as GrainScene};
