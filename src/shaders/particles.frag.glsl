varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = length(uv);
  float core = 1.0 - smoothstep(.12, .5, r);
  float halo = exp(-r * 9.0) * .25;
  float alpha = (core + halo) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
