export const shakeShader = {
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

    void main (void) {
        float duration = 1.0 - intensity * 0.3;
        float maxScale = 0.01 + intensity * 0.04;
        float offset = 0.01 + intensity * 0.01;
        
        float progress = sin(mod(time, duration) / duration * 3.1415926); // 0~1
        vec2 offsetCoords = vec2(offset, offset) * progress;
        float scale = 1.0 + (maxScale) * progress;
        
        vec2 ScaleTextureCoords = vec2(0.5, 0.5) + (vuv - vec2(0.5, 0.5)) / scale;
        
        vec4 maskR = texture2D(map, ScaleTextureCoords + offsetCoords);
        vec4 maskB = texture2D(map, ScaleTextureCoords - offsetCoords);
        vec4 mask = texture2D(map, ScaleTextureCoords);
        
        gl_FragColor = vec4(maskR.r, mask.g, maskB.b, mask.a);
    }
    `
};
