uniform sampler2D tDiffuse;
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
