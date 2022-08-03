export const waveShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    varying vec2 vuv;

    uniform float time;
    uniform float intensity;

    void main(void) {
        vec2 uv = vuv*(1.0 - intensity * 0.2) + 0.1 * intensity;
        uv += cos(time * vec2(6.0, 6.0) + uv * 10.0) * (0.005 + intensity * 0.015);
        gl_FragColor = texture2D(map, uv);
    }
    `
};
