export const baseTextureShader = {
    vShader: `
    attribute vec4 position;
    attribute vec2 uv;
    varying vec2 vuv;
    void main() {
        gl_Position = position;
        vuv = uv;
    }
`,
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    
    uniform sampler2D map;
    varying vec2 vuv;
    void main() {
        gl_FragColor = texture2D(map, vuv);
    }
`,
    yFlipFShader:`
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    varying vec2 vuv;
    void main() {
        gl_FragColor = texture2D(map, vec2(vuv.x, 1.0 - vuv.y));
    }
`
};
