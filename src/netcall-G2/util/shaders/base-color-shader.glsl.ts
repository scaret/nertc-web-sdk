export const baseColorShader = {
    vShader: `
    attribute vec4 position;
    void main() {
        gl_Position = position;
    }
`,
    fShader: `
    precision mediump float;
    
    uniform vec4 color;
    void main() {
        gl_FragColor = color;
    }
`
};
