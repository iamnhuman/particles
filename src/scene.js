import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import simulation from './shaders/simulation.glsl?raw';
import vertexShader from './shaders/particles.vert.glsl?raw';
import fragmentShader from './shaders/particles.frag.glsl?raw';
import composite from './shaders/composite.glsl?raw';
import toyotaMotionShader from './shaders/toyota-motion.glsl?raw';
import toyotaSheenShader from './shaders/toyota-sheen.glsl?raw';
import { createChoreographyDriver } from './choreography.js';
import { createSpatialMotionDriver } from './spatial-motion.js';
import { createToyotaTargets, createToyotaSurfaceData } from './toyota.js';

const TAU = Math.PI * 2;
function randomGenerator(seed = 771) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class GrainScene {
  constructor(container) {
    this.container = container;
    this.mobile = matchMedia('(max-width: 760px)').matches;
    this.size = this.mobile ? 192 : 320;
    this.particleCount = this.size ** 2;
    this.choreography = createChoreographyDriver();
    this.spatialMotion = createSpatialMotionDriver();
    this.motionState = this.choreography.sample({ time: 0, delta: 0 });
    this.toyotaBlend = 0;
    this.toyotaTime = 0;
    this.toyotaFlowSpeed = .75;
    this.toyotaPhase = 0;
    this.toyotaFlowTime = 0;
    this.toyotaEuler = new THREE.Euler(.30, -.30, -.08);
    this.toyotaOrientation = new THREE.Quaternion().setFromEuler(this.toyotaEuler);
    this.pointer = new THREE.Vector3(0, 0, 0);
    this.smoothedPointer = new THREE.Vector3(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x090a0b, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090a0b);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 35);
    this.camera.position.z = 7.8;
    this.group = new THREE.Group();
    this.artwork = new THREE.Group();
    this.artwork.matrixAutoUpdate = false;
    this.scene.add(this.artwork);
    this.artwork.add(this.group);
    this.spectrumBytes = new Uint8Array(64);
    this.spectrum = new THREE.DataTexture(this.spectrumBytes, 64, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.spectrum.minFilter = THREE.LinearFilter;
    this.spectrum.magFilter = THREE.LinearFilter;
    this.spectrum.needsUpdate = true;
    this.initParticles();
    this.initDust();
    this.initFilaments();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .3, .45, .7);
    this.composer.addPass(this.bloom);
    this.composite = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uResolution: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uHit: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: composite });
    this.composer.addPass(this.composite);
    this.resize();
    this.onResize = () => this.resize();
    this.onPointer = (e) => { this.pointer.set((e.clientX / innerWidth - .5) * 5, (.5 - e.clientY / innerHeight) * 4, 1); };
    this.onPointerLeave = () => { this.pointer.z = 0; };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); document.documentElement.classList.add('no-webgl'); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
  }
  initParticles() {
    const random = randomGenerator();
    this.compute = new GPUComputationRenderer(this.size, this.size, this.renderer);
    const positionTexture = this.compute.createTexture();
    const originTexture = this.compute.createTexture();
    const grains = createToyotaTargets(this.particleCount);
    this.toyotaTexture = this.compute.createTexture();
    this.toyotaTexture.needsUpdate = true;
    const surface = createToyotaSurfaceData();
    this.toyotaSurface = new THREE.DataTexture(surface.data,surface.width,surface.height,THREE.RGBAFormat,THREE.FloatType);
    this.toyotaSurface.minFilter = this.toyotaSurface.magFilter = THREE.NearestFilter;
    this.toyotaSurface.needsUpdate = true;
    const refs = new Float32Array(this.particleCount * 2);
    const seeds = new Float32Array(this.particleCount * 3);
    const positions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      const theta = random() * TAU;
      // Discrete families make coherent, fine strands rather than an evenly filled doughnut.
      const strand = Math.floor(random() * 160);
      const phi = strand / 160 * TAU + (random() - .5) * .022;
      const tubeRatio = .91 + random() * .12;
      const seed = random();
      originTexture.image.data.set([theta, phi, tubeRatio, seed], i * 4);
      const tube = tubeRatio * (.44 + .14 * Math.sin(theta * 3));
      const twist = phi + theta * 3 + Math.sin(theta * 3) * .3;
      const radius = 1.67 + tube * Math.cos(twist) + Math.sin(theta * 2 + .6) * .12;
      positionTexture.image.data.set([radius * Math.cos(theta), radius * Math.sin(theta), tube * Math.sin(twist) + Math.sin(theta * 3) * .22, 1], i * 4);
      refs.set([(i % this.size + .5) / this.size, (Math.floor(i / this.size) + .5) / this.size], i * 2);
      seeds.set([theta / TAU, random(), phi / TAU], i * 3);
    }
    // Preserve the angular neighbourhood during the morph instead of sending
    // every grain across the centre to a randomly indexed logo point. This is
    // a one-time permutation of the same surface samples, never a flow route.
    const indices = Array.from({ length: this.particleCount }, (_, i) => i);
    const polarAngles = Float32Array.from(indices, i => (Math.atan2(grains[i*4+1],grains[i*4])+TAU)%TAU);
    const sourceOrder = [...indices].sort((a,b) => originTexture.image.data[a*4]-originTexture.image.data[b*4]);
    const targetOrder = indices.sort((a,b) => polarAngles[a]-polarAngles[b]);
    for (let i = 0; i < this.particleCount; i++) {
      const source = targetOrder[i]*4, destination = sourceOrder[i]*4;
      this.toyotaTexture.image.data.set(grains.subarray(source,source+4),destination);
    }
    this.positionVariable = this.compute.addVariable('texturePosition', `${toyotaMotionShader}\n${simulation}`, positionTexture);
    this.compute.setVariableDependencies(this.positionVariable, [this.positionVariable]);
    this.simUniforms = { uOrigins: { value: originTexture }, uSpectrum: { value: this.spectrum }, uTime: { value: 0 }, uDelta: { value: 1 / 60 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uHit: { value: 0 }, uEnergy: { value: 0 }, uFlux: { value: 0 }, uDispersion: { value: .025 }, uFormation: { value: .25 }, uActive: { value: 0 }, uPointer: { value: this.smoothedPointer } };
    this.simUniforms.uToyota = { value: 0 };
    this.simUniforms.uToyotaGrains = { value: this.toyotaTexture };
    this.simUniforms.uFromStyle = { value: 0 };
    this.simUniforms.uToStyle = { value: 0 };
    this.simUniforms.uMorph = { value: 1 };
    this.simUniforms.uToyotaPhase = { value: 0 };
    this.simUniforms.uToyotaFlowTime = { value: 0 };
    this.simUniforms.uToyotaSurface = { value: this.toyotaSurface };
    this.simUniforms.uToyotaSurfaceSize = { value: new THREE.Vector2(surface.width,surface.height) };
    this.simUniforms.uToyotaSurfaceBounds = { value: new THREE.Vector4(...surface.bounds) };
    Object.assign(this.positionVariable.material.uniforms, this.simUniforms);
    const error = this.compute.init();
    if (error) throw new Error(error);
    this.originTexture = originTexture;
    this.uniforms = { uPositions: { value: this.compute.getCurrentRenderTarget(this.positionVariable).texture }, uSpectrum: { value: this.spectrum }, uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uHit: { value: 0 }, uDispersion: { value: .025 }, uActive: { value: 0 }, uCameraDistance: { value: 7.8 }, uParticleScale: { value: 1 }, uPixelRatio: { value: this.renderer.getPixelRatio() } };
    this.uniforms.uToyota = { value: 0 };
    this.uniforms.uToyotaGrains = { value: this.toyotaTexture };
    this.uniforms.uToyotaFlowTime = { value: 0 };
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aReference', new THREE.BufferAttribute(refs, 2));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: `${toyotaSheenShader}\n${vertexShader}`, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }
  initDust() {
    const random = randomGenerator(89);
    const count = this.mobile ? 3500 : 14000;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + random() ** 1.5 * 8;
      const theta = random() * TAU, z = random() * 2 - 1;
      positions.set([Math.cos(theta) * Math.sqrt(1 - z*z) * r, Math.sin(theta) * Math.sqrt(1 - z*z) * r, z * r - 3], i * 3);
      seeds[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.dustUniforms = { uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uHit: { value: 0 }, uEnergy: { value: 0 }, uDispersion: { value: .025 }, uCameraDistance: { value: 7.8 }, uPixelRatio: { value: this.renderer.getPixelRatio() } };
    this.dustUniforms.uToyota = { value: 0 };
    const material = new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      vertexShader: `
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
        }`,
      fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.62,.30,.12,(1.-smoothstep(.05,.5,r))*vAlpha);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.dust = new THREE.Points(geometry, material);
    this.artwork.add(this.dust);
  }
  initFilaments() {
    const positions = [], phases = [];
    const strands = 22, segments = 320;
    for (let s = 0; s < strands; s++) for (let j = 0; j < segments; j++) {
      for (let endpoint = 0; endpoint < 2; endpoint++) {
        const theta = (j + endpoint) / segments * TAU;
        const phi = s / strands * TAU + theta * 3;
        const tube = .48 + .12 * Math.sin(theta * 3);
        const radius = 1.67 + tube * Math.cos(phi);
        positions.push(radius * Math.cos(theta), radius * Math.sin(theta), tube * Math.sin(phi) + Math.sin(theta*3)*.22);
        phases.push(theta, s / strands);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 2));
    this.lineUniforms = { uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHit: { value: 0 }, uDispersion: { value: .025 }, uFormation: { value: .25 }, uToyota: { value: 0 } };
    const material = new THREE.ShaderMaterial({ uniforms: this.lineUniforms,
      vertexShader: `
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
        }`,
      fragmentShader: `varying float vAlpha;void main(){gl_FragColor=vec4(.85,.42,.19,vAlpha);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.filaments = new THREE.LineSegments(geometry, material);
    this.group.add(this.filaments);
  }
  randomize() {
    // Preserve every grain's phase and lane while its two target poses morph.
    this.choreography.randomize();
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.mobile = w <= 760;
    this.camera.aspect = w / h;
    this.camera.position.z = this.mobile ? Math.max(8.6, 5.1 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * this.camera.aspect)) : 7.8;
    this.baseCameraZ = this.camera.position.z;
    this.camera.position.x = this.camera.position.y = 0;
    this.uniforms.uCameraDistance.value = this.camera.position.z;
    this.dustUniforms.uCameraDistance.value = this.camera.position.z;
    this.camera.updateProjectionMatrix();
    const visibleWidth = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(21)) * this.camera.aspect;
    const visibleHeight = visibleWidth / this.camera.aspect;
    if (this.mobile) {
      // Fit the artwork into the real space between the header and the headline.
      // This also handles short phones and unusually tall embedded previews.
      const top = document.querySelector('.header').getBoundingClientRect().bottom + 8;
      const bottom = Math.max(top + 80, document.querySelector('.hero').getBoundingClientRect().top - 22);
      const radius = Math.min(w * .38, (bottom - top) * .47);
      const centerY = (top + bottom) * .5;
      const pixelsPerUnit = h / visibleHeight;
      this.group.position.set(.12, (.5 - centerY / h) * visibleHeight, 0);
      this.group.scale.setScalar(radius / (pixelsPerUnit * 2.2));
      this.uniforms.uParticleScale.value = Math.min(1,this.group.scale.x/.78);
    } else {
      this.group.position.set(visibleWidth * .16, .28, 0);
      this.group.scale.setScalar(1.06);
      this.uniforms.uParticleScale.value = 1;
    }
    this.baseGroupScale = this.group.scale.x;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.composite?.uniforms.uResolution.value.set(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
  }
  render({ time, playbackTime, duration, features, spectrum, active, delta, zoom = 1 }) {
    const bass = features[1] * active, mid = features[2] * active, high = features[3] * active, hit = features[7] * active;
    const energy = features[0] * active, flux = features[4] * active;
    this.motionState = this.choreography.sample({ time, features, active, delta });
    const { fromStyle, toStyle, morph, formation, dispersion: rawDispersion } = this.motionState;
    this.toyotaBlend = this.motionState.toyota;
    this.toyotaTime += delta;
    this.toyotaFlowSpeed += (.75 + energy*.22 - this.toyotaFlowSpeed) * (1-Math.exp(-delta/.8));
    this.toyotaFlowTime += delta*this.toyotaFlowSpeed;
    this.toyotaPhase = this.toyotaFlowTime % TAU;
    const toyotaOpening = THREE.MathUtils.smoothstep(rawDispersion,.65,.98);
    const dispersion = THREE.MathUtils.lerp(rawDispersion,toyotaOpening,this.toyotaBlend);
    this.spectrumBytes.set(spectrum);
    this.spectrum.needsUpdate = true;
    this.smoothedPointer.lerp(this.pointer, 1 - Math.exp(-delta * 3));
    const values = { uTime: time, uDelta: Math.min(delta, .05), uBass: bass, uMid: mid, uHigh: high, uHit: hit, uEnergy: energy, uFlux: flux, uDispersion: dispersion, uFromStyle: fromStyle, uToStyle: toStyle, uMorph: morph, uFormation: formation, uToyota: this.toyotaBlend, uToyotaPhase: this.toyotaPhase, uToyotaFlowTime: this.toyotaFlowTime, uActive: active };
    for (const [key, value] of Object.entries(values)) {
      if (this.simUniforms[key]) this.simUniforms[key].value = value;
      if (this.uniforms[key]) this.uniforms[key].value = value;
      if (this.dustUniforms[key]) this.dustUniforms[key].value = value;
      if (this.lineUniforms[key]) this.lineUniforms[key].value = value;
    }
    this.simUniforms.uDispersion.value = rawDispersion;
    this.compute.compute();
    this.uniforms.uPositions.value = this.compute.getCurrentRenderTarget(this.positionVariable).texture;
    this.group.rotation.set(.52 + Math.sin(time * .10) * .16 + this.smoothedPointer.y * .018, -.35 + Math.sin(time * .08) * .2 + mid * .06 * dispersion + this.smoothedPointer.x * .015, -.38 + time * .028 + bass * .03 * dispersion);
    this.toyotaEuler.set(.20 + Math.sin(this.toyotaTime*.34)*.16, -.18 + Math.sin(this.toyotaTime*.29)*.20, -.08 + Math.sin(this.toyotaTime*.30)*.22);
    this.toyotaOrientation.setFromEuler(this.toyotaEuler);
    this.group.quaternion.slerp(this.toyotaOrientation, this.toyotaBlend);
    // Broad releases retain their original framing; compact closed currents
    // stay large. Interpolate framing with the same smooth target morph.
    const framing = field => field === 8 ? .86 / (1+toyotaOpening*.24) : 1 / (1 + rawDispersion *
      (field < 3 ? (this.mobile ? .95 : .65) : (this.mobile ? .18 : .12)));
    this.group.scale.setScalar(this.baseGroupScale * THREE.MathUtils.lerp(framing(fromStyle), framing(toStyle), morph));
    // Apply the accent above the rotating sculpture, so it stretches along
    // the screen rather than an arbitrary local axis. The same transform
    // carries the grain, filaments and ambient dust; particle sizes stay fine.
    const { amount, angle } = this.spatialMotion.sample({ features, active, delta, playbackTime, duration });
    const sx = 1+amount*(this.mobile ? .40 : 1.05), sy = 1+amount*.12;
    const c = Math.cos(angle), s = Math.sin(angle);
    const xx = c*c*sx+s*s*sy, xy = c*s*(sx-sy), yy = s*s*sx+c*c*sy;
    const center = this.group.position;
    const centerX = center.x*(1-amount*(this.mobile ? .3 : .85));
    this.artwork.matrix.set(xx,xy,0,centerX-xx*center.x-xy*center.y,
      xy,yy,0,center.y-xy*center.x-yy*center.y, 0,0,1,0, 0,0,0,1);
    this.artwork.matrixWorldNeedsUpdate = true;
    this.camera.position.set(centerX * (1 - 1/zoom), center.y * (1 - 1/zoom), this.baseCameraZ / zoom);
    this.bloom.strength = .23 + high * .10 + hit * .08 + dispersion * .08;
    this.composite.uniforms.uTime.value = time;
    this.composite.uniforms.uHit.value = hit;
    this.composer.render();
  }
  destroy() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('pointerleave', this.onPointerLeave);
    this.scene.traverse(object => { object.geometry?.dispose(); if (object.material) object.material.dispose(); });
    this.compute.dispose(); this.originTexture.dispose(); this.toyotaTexture.dispose(); this.toyotaSurface.dispose(); this.spectrum.dispose(); this.bloom.dispose(); this.composer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
