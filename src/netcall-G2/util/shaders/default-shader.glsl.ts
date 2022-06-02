export const defaultShader = {
    vShader: `
    attribute vec4 position;
    void main() {
        gl_Position = position;
    }
`,
    fShader: `
    precision mediump float;

    void main() {
        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    }
`
};
