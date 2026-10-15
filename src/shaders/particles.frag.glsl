varying vec3 vColor;
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
