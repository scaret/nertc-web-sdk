export const glitchShader = {
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

    float rand(float n) {
        return fract(sin(n) * 43758.5453123);
    }

    void main (void) {
        float maxJitter = 0.1;
        float duration = 0.3;
        float colorROffset = 0.02;
        float colorBOffset = -0.025;

        float time = mod(mod(time, 1.0), duration * 2.0);
        float amplitude = max(sin(time * (PI / duration)), 0.0);

        float jitter = rand(vuv.y) * 2.0 - 1.0; // -1~1
        bool needOffset = abs(jitter) < maxJitter * amplitude;

        float intensity = 0.2 + intensity * 0.8;
        float textureX = vuv.x + (needOffset ? jitter : (jitter * amplitude * 0.006)) * intensity;
        vec2 textureCoords = vec2(textureX, vuv.y);

        vec4 mask = texture2D(map, textureCoords);
        vec4 maskR = texture2D(map, textureCoords + vec2(colorROffset * amplitude, 0.0) * intensity);
        vec4 maskB = texture2D(map, textureCoords + vec2(colorBOffset * amplitude, 0.0) * intensity);

        gl_FragColor = vec4(maskR.r, mask.g, maskB.b, mask.a);
    }
    `
}
