export const flashShader = {
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

    const float PI = 3.1415926;

    void main (void) {
        float duration = 0.3 - intensity * 0.15;

        float count = floor(time/duration);

        float time = mod(count, 10.0) > 1.0 ? 0.0 : mod(time, duration);

        vec4 whiteMask = vec4(1.0, 1.0, 1.0, 1.0);
        float amplitude = abs(sin(time * (PI / duration)));

        vec4 mask = texture2D(map, vuv);

        gl_FragColor = mask * (1.0 - amplitude) + whiteMask * amplitude;
    }
    `
}
