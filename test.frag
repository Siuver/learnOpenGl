precision mediump float;

uniform sampler2D u_texture_0;

void main() {
    gl_FragColor = texture2D(u_texture_0, gl_FragCoord.xy);
}