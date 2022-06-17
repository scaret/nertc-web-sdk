export const baseColorShader = {
    vShader: `
    attribute vec4 position;
    void main() {
        gl_Position = position;
    }
`,
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    
    uniform vec4 color;
    void main() {
        gl_FragColor = color;
    }
`
};
