float toyotaNoise(vec2 point) {
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
