import{V as I,W as fe,L as xe,S as be,C as ye,P as we,G as Me,D as Se,R as Pe,U as ze,a as Y,E as De,b as Te,c as Ce,d as Z,e as Ae,f as Re,B as E,g as T,h as L,A as k,i as X,F as J,j as Fe,M as K}from"./three-fN1FWpNU.js";const Ue=`uniform sampler2D uOrigins;
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
`,He=`attribute vec2 aReference;
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
`,Be=`varying vec3 vColor;
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
`,Ee=`uniform sampler2D tDiffuse;
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
`,f=(u,e=1)=>Math.min(e,Math.max(0,Number.isFinite(u)?u:0)),M=(u,e,t)=>{const l=f((t-u)/(e-u));return l*l*(3-2*l)},P=(u,e,t)=>u+(e-u)*t,S=[9.2,11.4,8.6,12.8],R=[0,.88,.3,1],Le=[1,.94,.98,.91],V=S.reduce((u,e)=>u+e,0),z=4.8;function ke({random:u=Math.random}={}){const e={dispersion:.025,style:0,formation:.25};let t=e.dispersion,l=0,n=0,r=[0,1,2,3],c=[...R],a=!1,o=z,m=t;const s=d=>d[Math.min(d.length-1,Math.floor(f(u())*d.length))],h=(d,i)=>{const p=d.filter(v=>v!==i);for(let v=p.length-1;v>0;v--){const x=Math.min(v,Math.floor(f(u())*(v+1)));[p[v],p[x]]=[p[x],p[v]]}return[i,...p]};return{sample({time:d,features:i,active:p=0,delta:v=1/60}={}){const x=Number.isFinite(d)?Math.max(0,d):l;l=x;const g=Number.isFinite(v)?Math.min(.25,Math.max(0,v)):1/60,b=f(p),G=f(i==null?void 0:i[0]),O=f(i==null?void 0:i[1]),q=f(i==null?void 0:i[2]),F=f(i==null?void 0:i[3]),Q=f(i==null?void 0:i[4]),$=f(i==null?void 0:i[5]),ee=f(i==null?void 0:i[6]),te=f(i==null?void 0:i[7]),D=o<z;D&&(o=Math.min(z,o+g),o===z&&(n=S[0]*.08-x));let U=((x+n)%V+V)%V,w=0;for(;w<S.length-1&&U>=S[w];)U-=S[w++];const C=U/S[w],j=(w+1)%S.length,ie=M(.25,.45,C),ne=1-M(.63,.88,C),H=ie*ne*Le[w],W=.025+.012*Math.sin(x*.31)**2,A=M(.012,.11,G)*b,se=G*.46+O*.24+q*.18+F*.12,oe=.72+Math.sqrt(se)*.2+Math.sqrt(Q*.6+te*.4)*.08;let B=P(W,.022+H*oe,A);if(D){const N=o/z,ve=M(0,.32,N),ge=1-M(.55,.92,N);B=P(W,P(m,.8,ve),ge)}const ae=1-Math.exp(-g/(B>t?.38:.62));t+=(B-t)*ae;const re=a&&t>.12;e.dispersion=f(t,D||re?1:.12+b*.88);const le=M(.58,.94,C),ue=(($-.45)*.1+(ee-.3)*.08+(F-O)*.04)*H*A,ce=D?r[0]:f(P(r[w],r[j],le)+ue,3);e.style+=(ce-e.style)*(1-Math.exp(-g/.85));const he=M(.5,.84,C),me=a?f(c[0]+.035*Math.sin(x*.065)**2):.25+.1*Math.sin(x*.065)**2,pe=f(P(c[w],c[j],he)+(q-F)*.06*H*A),de=D?c[0]:P(me,pe,A);return e.formation+=(de-e.formation)*(1-Math.exp(-g/.9)),e},randomize(){const d=s([0,1,2,3].filter(p=>Math.abs(p-e.style)>=.8)),i=s(R.filter(p=>Math.abs(p-e.formation)>=.45));r=h([0,1,2,3],d),c=h(R,i),a=!0,m=e.dispersion,o=0},reset(){e.dispersion=t=.025,e.style=0,e.formation=.25,l=0,n=0,r=[0,1,2,3],c=[...R],a=!1,o=z,m=t}}}const y=Math.PI*2;function _(u=771){return()=>{u|=0,u=u+1831565813|0;let e=Math.imul(u^u>>>15,1|u);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}class _e{constructor(e){this.container=e,this.mobile=matchMedia("(max-width: 760px)").matches,this.size=this.mobile?192:320,this.particleCount=this.size**2,this.choreography=ke(),this.motionState={dispersion:.025,style:0,formation:.25},this.pointer=new I(0,0,0),this.smoothedPointer=new I(0,0,0),this.renderer=new fe({alpha:!1,antialias:!1,powerPreference:"high-performance"}),this.renderer.setClearColor(592395,1),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.mobile?1.5:1.75)),this.renderer.outputColorSpace=xe,e.appendChild(this.renderer.domElement),this.scene=new be,this.scene.background=new ye(592395),this.camera=new we(42,1,.1,35),this.camera.position.z=7.8,this.group=new Me,this.scene.add(this.group),this.spectrumBytes=new Uint8Array(64),this.spectrum=new Se(this.spectrumBytes,64,1,Pe,ze),this.spectrum.minFilter=Y,this.spectrum.magFilter=Y,this.spectrum.needsUpdate=!0,this.initParticles(),this.initDust(),this.initFilaments(),this.composer=new De(this.renderer),this.composer.addPass(new Te(this.scene,this.camera)),this.bloom=new Ce(new Z(1,1),.3,.45,.7),this.composer.addPass(this.bloom),this.composite=new Ae({uniforms:{tDiffuse:{value:null},uResolution:{value:new Z(1,1)},uTime:{value:0},uHit:{value:0}},vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:Ee}),this.composer.addPass(this.composite),this.resize(),this.onResize=()=>this.resize(),this.onPointer=t=>{this.pointer.set((t.clientX/innerWidth-.5)*5,(.5-t.clientY/innerHeight)*4,1)},this.onPointerLeave=()=>{this.pointer.z=0},window.addEventListener("resize",this.onResize),window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onPointerLeave),this.renderer.domElement.addEventListener("webglcontextlost",t=>{t.preventDefault(),document.documentElement.classList.add("no-webgl")}),this.renderer.domElement.addEventListener("webglcontextrestored",()=>location.reload())}initParticles(){const e=_();this.compute=new Re(this.size,this.size,this.renderer);const t=this.compute.createTexture(),l=this.compute.createTexture(),n=new Float32Array(this.particleCount*2),r=new Float32Array(this.particleCount*3),c=new Float32Array(this.particleCount*3);for(let s=0;s<this.particleCount;s++){const h=e()*y,i=Math.floor(e()*160)/160*y+(e()-.5)*.022,p=.91+e()*.12,v=e();l.image.data.set([h,i,p,v],s*4);const x=p*(.44+.14*Math.sin(h*3)),g=i+h*3+Math.sin(h*3)*.3,b=1.67+x*Math.cos(g)+Math.sin(h*2+.6)*.12;t.image.data.set([b*Math.cos(h),b*Math.sin(h),x*Math.sin(g)+Math.sin(h*3)*.22,v],s*4),n.set([(s%this.size+.5)/this.size,(Math.floor(s/this.size)+.5)/this.size],s*2),r.set([h/y,e(),i/y],s*3)}this.positionVariable=this.compute.addVariable("texturePosition",Ue,t),this.compute.setVariableDependencies(this.positionVariable,[this.positionVariable]),this.simUniforms={uOrigins:{value:l},uSpectrum:{value:this.spectrum},uTime:{value:0},uDelta:{value:1/60},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uFlux:{value:0},uDispersion:{value:.025},uStyle:{value:0},uFormation:{value:.25},uActive:{value:0},uPointer:{value:this.smoothedPointer}},Object.assign(this.positionVariable.material.uniforms,this.simUniforms);const a=this.compute.init();if(a)throw new Error(a);this.originTexture=l,this.uniforms={uPositions:{value:this.compute.getCurrentRenderTarget(this.positionVariable).texture},uSpectrum:{value:this.spectrum},uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uDispersion:{value:.025},uActive:{value:0},uCameraDistance:{value:7.8},uParticleScale:{value:1},uPixelRatio:{value:this.renderer.getPixelRatio()}};const o=new E;o.setAttribute("position",new T(c,3)),o.setAttribute("aReference",new T(n,2)),o.setAttribute("aSeed",new T(r,3));const m=new L({uniforms:this.uniforms,vertexShader:He,fragmentShader:Be,transparent:!0,depthWrite:!1,blending:k});this.points=new X(o,m),this.points.frustumCulled=!1,this.group.add(this.points)}initDust(){const e=_(89),t=this.mobile?3500:14e3,l=new Float32Array(t*3),n=new Float32Array(t);for(let a=0;a<t;a++){const o=2.5+e()**1.5*8,m=e()*y,s=e()*2-1;l.set([Math.cos(m)*Math.sqrt(1-s*s)*o,Math.sin(m)*Math.sqrt(1-s*s)*o,s*o-3],a*3),n[a]=e()}const r=new E;r.setAttribute("position",new T(l,3)),r.setAttribute("aSeed",new T(n,1)),this.dustUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uDispersion:{value:.025},uCameraDistance:{value:7.8},uPixelRatio:{value:this.renderer.getPixelRatio()}};const c=new L({uniforms:this.dustUniforms,vertexShader:`
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
        }`,fragmentShader:"varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.68,.56,.44,(1.-smoothstep(.05,.5,r))*vAlpha);}",transparent:!0,depthWrite:!1,blending:k});this.dust=new X(r,c),this.scene.add(this.dust)}initFilaments(){const e=[],t=[];for(let a=0;a<22;a++)for(let o=0;o<320;o++)for(let m=0;m<2;m++){const s=(o+m)/320*y,h=a/22*y+s*3,d=.48+.12*Math.sin(s*3),i=1.67+d*Math.cos(h);e.push(i*Math.cos(s),i*Math.sin(s),d*Math.sin(h)+Math.sin(s*3)*.22),t.push(s,a/22)}const r=new E;r.setAttribute("position",new J(e,3)),r.setAttribute("aPhase",new J(t,2)),this.lineUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHit:{value:0},uDispersion:{value:.025},uFormation:{value:.25}};const c=new L({uniforms:this.lineUniforms,vertexShader:`
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
        }`,fragmentShader:"varying float vAlpha;void main(){gl_FragColor=vec4(.85,.42,.19,vAlpha);}",transparent:!0,depthWrite:!1,blending:k});this.filaments=new Fe(r,c),this.group.add(this.filaments)}randomize(){this.choreography.randomize();const e=_(Math.floor(Math.random()*4294967296)),t=this.originTexture.image.data,l=e()*y;for(let n=0;n<t.length;n+=4)t[n]=(t[n]+l)%y,t[n+1]=Math.floor(e()*160)/160*y+(e()-.5)*.022,t[n+2]=.91+e()*.12,t[n+3]=e();this.originTexture.needsUpdate=!0}resize(){var r,c;const e=this.container.clientWidth,t=this.container.clientHeight;this.mobile=e<=760,this.camera.aspect=e/t,this.camera.position.z=this.mobile?Math.max(8.6,5.1/(2*Math.tan(K.degToRad(21))*this.camera.aspect)):7.8,this.baseCameraZ=this.camera.position.z,this.camera.position.x=this.camera.position.y=0,this.uniforms.uCameraDistance.value=this.camera.position.z,this.dustUniforms.uCameraDistance.value=this.camera.position.z,this.camera.updateProjectionMatrix();const l=2*this.camera.position.z*Math.tan(K.degToRad(21))*this.camera.aspect,n=l/this.camera.aspect;if(this.mobile){const a=document.querySelector(".header").getBoundingClientRect().bottom+8,o=Math.max(a+80,document.querySelector(".hero").getBoundingClientRect().top-22),m=Math.min(e*.38,(o-a)*.47),s=(a+o)*.5,h=t/n;this.group.position.set(.12,(.5-s/t)*n,0),this.group.scale.setScalar(m/(h*2.2)),this.uniforms.uParticleScale.value=Math.min(1,this.group.scale.x/.78)}else this.group.position.set(l*.16,.28,0),this.group.scale.setScalar(1.06),this.uniforms.uParticleScale.value=1;this.baseGroupScale=this.group.scale.x,this.renderer.setSize(e,t),(r=this.composer)==null||r.setSize(e,t),(c=this.composite)==null||c.uniforms.uResolution.value.set(e*this.renderer.getPixelRatio(),t*this.renderer.getPixelRatio())}render({time:e,features:t,spectrum:l,active:n,delta:r,zoom:c=1}){const a=t[1]*n,o=t[2]*n,m=t[3]*n,s=t[7]*n,h=t[0]*n,d=t[4]*n;this.motionState=this.choreography.sample({time:e,features:t,active:n,delta:r});const{dispersion:i,style:p,formation:v}=this.motionState;this.spectrumBytes.set(l),this.spectrum.needsUpdate=!0,this.smoothedPointer.lerp(this.pointer,1-Math.exp(-r*3));const x={uTime:e,uDelta:Math.min(r,1/30),uBass:a,uMid:o,uHigh:m,uHit:s,uEnergy:h,uFlux:d,uDispersion:i,uStyle:p,uFormation:v,uActive:n};for(const[g,b]of Object.entries(x))this.simUniforms[g]&&(this.simUniforms[g].value=b),this.uniforms[g]&&(this.uniforms[g].value=b),this.dustUniforms[g]&&(this.dustUniforms[g].value=b),this.lineUniforms[g]&&(this.lineUniforms[g].value=b);this.compute.compute(),this.uniforms.uPositions.value=this.compute.getCurrentRenderTarget(this.positionVariable).texture,this.group.rotation.set(.52+Math.sin(e*.1)*.16+this.smoothedPointer.y*.018,-.35+Math.sin(e*.08)*.2+o*.06*i+this.smoothedPointer.x*.015,-.38+e*.028+a*.03*i),this.group.scale.setScalar(this.baseGroupScale/(1+i*(this.mobile?.95:.65))),this.camera.position.set(this.group.position.x*(1-1/c),this.group.position.y*(1-1/c),this.baseCameraZ/c),this.bloom.strength=.23+m*.1+s*.08+i*.08,this.composite.uniforms.uTime.value=e,this.composite.uniforms.uHit.value=s,this.composer.render()}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onPointerLeave),this.scene.traverse(e=>{var t;(t=e.geometry)==null||t.dispose(),e.material&&e.material.dispose()}),this.compute.dispose(),this.originTexture.dispose(),this.spectrum.dispose(),this.bloom.dispose(),this.composer.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}export{_e as GrainScene};
