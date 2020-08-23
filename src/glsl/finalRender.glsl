uniform sampler2D data;

varying vec2 vUv;
void main(){
//    vec4 guideValueCol = texture2D(guide_texture, vUv);
//    float guidVal = guideValueCol.r * 0.3 + guideValueCol.g * 0.11 + guideValueCol.b * 0.59;
    vec4 src = texture2D(data, vUv);
    gl_FragColor = vec4(src.ggg, 1);
}
