export const beautyHighPassShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    
    uniform sampler2D map;
    uniform sampler2D blurMap;

    varying vec2 vuv;

    void main() {
        vec4 color = texture2D(map, vuv);
        vec4 blurColor = texture2D(blurMap, vuv);
        vec3 diffColor = (color.rgb - blurColor.rgb) * 6.0;
        diffColor = diffColor * diffColor;
        diffColor = min(diffColor, 1.0);
        gl_FragColor = vec4(diffColor, 1.0);
    }
`
};
