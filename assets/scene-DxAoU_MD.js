import{V as S,W as R,L as B,S as U,C as E,P as F,G as L,D as V,R as k,U as _,a as z,E as G,b as j,c as W,d as C,e as q,f as O,B as x,g,h as w,A as y,i as T,F as D,j as Y,M as A}from"./three-fN1FWpNU.js";const Z=`uniform sampler2D uOrigins;
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
`,I=`attribute vec2 aReference;
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
varying vec3 vColor;
varying float vAlpha;
varying float vSpark;

void main() {
  vec4 data = texture2D(uPositions, aReference);
  vec3 p = data.xyz;
  float spectral = texture2D(uSpectrum, vec2(aSeed.x, .5)).r;
  vec3 outward = normalize(p + .0001);
  p += outward * uHit * (.16 + .32 * aSeed.y);
  p += sin(p.yzx * 5.0 + uTime * 3.0 + aSeed.z * 6.28) * uHigh * .1;
  p += vec3(-outward.y,outward.x,sin(aSeed.x*6.28+uTime)) * uMid * .08;
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
  gl_PointSize = clamp(size * uPixelRatio * max(.65,uParticleScale) * (uCameraDistance / -viewPosition.z), .7, 13.0);
  vAlpha = (.5 + aSeed.z * .45) * (1.0-smoothstep(uCameraDistance+3.0, uCameraDistance+10.0, -viewPosition.z));
  vAlpha *= .82 + spectral * uActive * .3 + uHit * .2;
  vAlpha *= min(1.0,uParticleScale*uParticleScale);
}
`,X=`varying vec3 vColor;
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
`,J=`uniform sampler2D tDiffuse;
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
`,d=Math.PI*2;function H(p=771){return()=>{p|=0,p=p+1831565813|0;let e=Math.imul(p^p>>>15,1|p);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}class N{constructor(e){this.container=e,this.mobile=matchMedia("(max-width: 760px)").matches,this.size=this.mobile?192:320,this.particleCount=this.size**2,this.pointer=new S(0,0,0),this.smoothedPointer=new S(0,0,0),this.renderer=new R({alpha:!1,antialias:!1,powerPreference:"high-performance"}),this.renderer.setClearColor(592395,1),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.mobile?1.5:1.75)),this.renderer.outputColorSpace=B,e.appendChild(this.renderer.domElement),this.scene=new U,this.scene.background=new E(592395),this.camera=new F(42,1,.1,35),this.camera.position.z=7.8,this.group=new L,this.scene.add(this.group),this.spectrumBytes=new Uint8Array(64),this.spectrum=new V(this.spectrumBytes,64,1,k,_),this.spectrum.minFilter=z,this.spectrum.magFilter=z,this.spectrum.needsUpdate=!0,this.initParticles(),this.initDust(),this.initFilaments(),this.composer=new G(this.renderer),this.composer.addPass(new j(this.scene,this.camera)),this.bloom=new W(new C(1,1),.3,.45,.7),this.composer.addPass(this.bloom),this.composite=new q({uniforms:{tDiffuse:{value:null},uResolution:{value:new C(1,1)},uTime:{value:0},uHit:{value:0}},vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:J}),this.composer.addPass(this.composite),this.resize(),this.onResize=()=>this.resize(),this.onPointer=t=>{this.pointer.set((t.clientX/innerWidth-.5)*5,(.5-t.clientY/innerHeight)*4,1)},this.onPointerLeave=()=>{this.pointer.z=0},window.addEventListener("resize",this.onResize),window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onPointerLeave),this.renderer.domElement.addEventListener("webglcontextlost",t=>{t.preventDefault(),document.documentElement.classList.add("no-webgl")}),this.renderer.domElement.addEventListener("webglcontextrestored",()=>location.reload())}initParticles(){const e=H();this.compute=new O(this.size,this.size,this.renderer);const t=this.compute.createTexture(),c=this.compute.createTexture(),a=new Float32Array(this.particleCount*2),o=new Float32Array(this.particleCount*3),l=new Float32Array(this.particleCount*3);for(let i=0;i<this.particleCount;i++){const r=e()*d,m=Math.floor(e()*160)/160*d+(e()-.5)*.022,h=.91+e()*.12,v=e();c.image.data.set([r,m,h,v],i*4);const b=h*(.44+.14*Math.sin(r*3)),P=m+r*3+Math.sin(r*3)*.3,M=1.67+b*Math.cos(P)+Math.sin(r*2+.6)*.12;t.image.data.set([M*Math.cos(r),M*Math.sin(r),b*Math.sin(P)+Math.sin(r*3)*.22,v],i*4),a.set([(i%this.size+.5)/this.size,(Math.floor(i/this.size)+.5)/this.size],i*2),o.set([r/d,e(),m/d],i*3)}this.positionVariable=this.compute.addVariable("texturePosition",Z,t),this.compute.setVariableDependencies(this.positionVariable,[this.positionVariable]),this.simUniforms={uOrigins:{value:c},uSpectrum:{value:this.spectrum},uTime:{value:0},uDelta:{value:1/60},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uFlux:{value:0},uActive:{value:0},uPointer:{value:this.smoothedPointer}},Object.assign(this.positionVariable.material.uniforms,this.simUniforms);const s=this.compute.init();if(s)throw new Error(s);this.originTexture=c,this.uniforms={uPositions:{value:this.compute.getCurrentRenderTarget(this.positionVariable).texture},uSpectrum:{value:this.spectrum},uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uActive:{value:0},uCameraDistance:{value:7.8},uParticleScale:{value:1},uPixelRatio:{value:this.renderer.getPixelRatio()}};const n=new x;n.setAttribute("position",new g(l,3)),n.setAttribute("aReference",new g(a,2)),n.setAttribute("aSeed",new g(o,3));const u=new w({uniforms:this.uniforms,vertexShader:I,fragmentShader:X,transparent:!0,depthWrite:!1,blending:y});this.points=new T(n,u),this.points.frustumCulled=!1,this.group.add(this.points)}initDust(){const e=H(89),t=this.mobile?3500:14e3,c=new Float32Array(t*3),a=new Float32Array(t);for(let s=0;s<t;s++){const n=2.5+e()**1.5*8,u=e()*d,i=e()*2-1;c.set([Math.cos(u)*Math.sqrt(1-i*i)*n,Math.sin(u)*Math.sqrt(1-i*i)*n,i*n-3],s*3),a[s]=e()}const o=new x;o.setAttribute("position",new g(c,3)),o.setAttribute("aSeed",new g(a,1)),this.dustUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uHit:{value:0},uEnergy:{value:0},uCameraDistance:{value:7.8},uPixelRatio:{value:this.renderer.getPixelRatio()}};const l=new w({uniforms:this.dustUniforms,vertexShader:`
        attribute float aSeed;
        uniform float uTime,uBass,uMid,uHigh,uHit,uEnergy,uCameraDistance,uPixelRatio;
        varying float vAlpha;
        void main(){
          vec3 p=position;
          float t=uTime*(.055+aSeed*.045)+uBass*.18;
          p.xz=mat2(cos(t),-sin(t),sin(t),cos(t))*p.xz;
          vec3 flow=vec3(sin(p.y*.7+uTime+aSeed*6.28),cos(p.z*.6-uTime*.8),sin(p.x*.5+uTime*.9));
          p+=flow*(.15+uMid*.7+uHigh*.45);
          p+=normalize(position)*(.35*uBass+.8*uHit)*(.5+aSeed*.5);
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=(.7+aSeed*.9+uHit*.9)*uPixelRatio*(uCameraDistance/-mv.z);
          vAlpha=(.09+aSeed*.25)*(1.+uEnergy*.4+uHigh*.4)*(1.-smoothstep(uCameraDistance+5.,uCameraDistance+18.,-mv.z));
        }`,fragmentShader:"varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.68,.56,.44,(1.-smoothstep(.05,.5,r))*vAlpha);}",transparent:!0,depthWrite:!1,blending:y});this.dust=new T(o,l),this.scene.add(this.dust)}initFilaments(){const e=[],t=[];for(let s=0;s<22;s++)for(let n=0;n<320;n++)for(let u=0;u<2;u++){const i=(n+u)/320*d,r=s/22*d+i*3,f=.48+.12*Math.sin(i*3),m=1.67+f*Math.cos(r);e.push(m*Math.cos(i),m*Math.sin(i),f*Math.sin(r)+Math.sin(i*3)*.22),t.push(i,s/22)}const o=new x;o.setAttribute("position",new D(e,3)),o.setAttribute("aPhase",new D(t,2)),this.lineUniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHit:{value:0}};const l=new w({uniforms:this.lineUniforms,vertexShader:"attribute vec2 aPhase;uniform float uTime,uBass,uMid,uHit;varying float vAlpha;void main(){vec3 p=position;p+=normalize(p)*sin(aPhase.x*7.+uTime*1.2)*(.045+uMid*.22);p*=1.+uBass*.15+uHit*.12;p.z+=sin(aPhase.x*3.+uTime)*uMid*.22;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);vAlpha=(.025+.035*pow(.5+.5*sin(aPhase.x*2.+aPhase.y*6.28-uTime*.5),5.))*(1.+uHit*.7);}",fragmentShader:"varying float vAlpha;void main(){gl_FragColor=vec4(.85,.42,.19,vAlpha);}",transparent:!0,depthWrite:!1,blending:y});this.filaments=new Y(o,l),this.group.add(this.filaments)}resize(){var o,l;const e=this.container.clientWidth,t=this.container.clientHeight;this.mobile=e<=760,this.camera.aspect=e/t,this.camera.position.z=this.mobile?Math.max(8.6,5.1/(2*Math.tan(A.degToRad(21))*this.camera.aspect)):7.8,this.baseCameraZ=this.camera.position.z,this.camera.position.x=this.camera.position.y=0,this.uniforms.uCameraDistance.value=this.camera.position.z,this.dustUniforms.uCameraDistance.value=this.camera.position.z,this.camera.updateProjectionMatrix();const c=2*this.camera.position.z*Math.tan(A.degToRad(21))*this.camera.aspect,a=c/this.camera.aspect;if(this.mobile){const s=document.querySelector(".header").getBoundingClientRect().bottom+8,n=Math.max(s+80,document.querySelector(".hero").getBoundingClientRect().top-22),u=Math.min(e*.38,(n-s)*.47),i=(s+n)*.5,r=t/a;this.group.position.set(.12,(.5-i/t)*a,0),this.group.scale.setScalar(u/(r*2.2)),this.uniforms.uParticleScale.value=Math.min(1,this.group.scale.x/.78)}else this.group.position.set(c*.16,.28,0),this.group.scale.setScalar(1.06),this.uniforms.uParticleScale.value=1;this.baseGroupScale=this.group.scale.x,this.renderer.setSize(e,t),(o=this.composer)==null||o.setSize(e,t),(l=this.composite)==null||l.uniforms.uResolution.value.set(e*this.renderer.getPixelRatio(),t*this.renderer.getPixelRatio())}render({time:e,features:t,spectrum:c,active:a,delta:o,zoom:l=1}){const s=t[1]*a,n=t[2]*a,u=t[3]*a,i=t[7]*a,r=t[0]*a,f=t[4]*a;this.spectrumBytes.set(c),this.spectrum.needsUpdate=!0,this.smoothedPointer.lerp(this.pointer,1-Math.exp(-o*3));const m={uTime:e,uDelta:Math.min(o,1/30),uBass:s,uMid:n,uHigh:u,uHit:i,uEnergy:r,uFlux:f,uActive:a};for(const[h,v]of Object.entries(m))this.simUniforms[h]&&(this.simUniforms[h].value=v),this.uniforms[h]&&(this.uniforms[h].value=v),this.dustUniforms[h]&&(this.dustUniforms[h].value=v),this.lineUniforms[h]&&(this.lineUniforms[h].value=v);this.compute.compute(),this.uniforms.uPositions.value=this.compute.getCurrentRenderTarget(this.positionVariable).texture,this.group.rotation.set(.52+Math.sin(e*.18)*.2+this.smoothedPointer.y*.018,-.35+Math.sin(e*.14)*.24+n*.12+this.smoothedPointer.x*.015,-.38+e*.045+s*.06),this.mobile&&this.group.scale.setScalar(this.baseGroupScale/(1+s*.1+i*.1+u*.07)),this.camera.position.set(this.group.position.x*(1-1/l),this.group.position.y*(1-1/l),this.baseCameraZ/l),this.bloom.strength=.24+u*.12+i*.1,this.composite.uniforms.uTime.value=e,this.composite.uniforms.uHit.value=i,this.composer.render()}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onPointerLeave),this.scene.traverse(e=>{var t;(t=e.geometry)==null||t.dispose(),e.material&&e.material.dispose()}),this.compute.dispose(),this.originTexture.dispose(),this.spectrum.dispose(),this.bloom.dispose(),this.composer.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}export{N as GrainScene};
