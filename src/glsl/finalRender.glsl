uniform sampler2D data;
varying vec2 vUv;
void main(){
    vec4 src = texture2D(data, vUv);
    gl_FragColor = vec4( 1.- src.ggg,  1.);
}
