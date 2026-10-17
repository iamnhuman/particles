uniform float uToyotaPhase;
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
