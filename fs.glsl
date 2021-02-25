precision mediump float;

        uniform sampler2D u_image;
        uniform vec2 u_imageSize;
        uniform float kernal[9];
        uniform float kernalWeight;
        
        varying vec2 v_texCoord;

        void main() {
            vec2 onePixel = 1.0 / u_imageSize;

            vec4 fragColor = vec4(0, 0, 0, 0);
            int index = 0;
            for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                    vec2 texCoord = v_texCoord + onePixel * vec2(i, j);
                    texCoord = vec2(texCoord.x, 1.0 - v_texCoord.y);
                    fragColor += texture2D(u_image, texCoord) * kernal[index];
                }
            }
            fragColor = fragColor / kernalWeight;
            gl_FragColor = fragColor;
        }