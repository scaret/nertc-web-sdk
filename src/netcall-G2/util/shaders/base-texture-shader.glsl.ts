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
    precision mediump float;

    uniform sampler2D map;
    varying vec2 vuv;
    void main() {
        gl_FragColor = texture2D(map, vuv);
    }
`
};
