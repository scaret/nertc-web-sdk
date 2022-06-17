export const soulOutShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform float intensity;
    uniform float time;

    varying vec2 vuv;
    void main (void) {
        float duration = 0.8 - intensity * 0.3;
        float maxAlpha = 0.3;
        float maxScale = 2.0 - intensity * 0.5;
        
        float progress = mod(time, duration) / duration; // 0~1
        float alpha = maxAlpha * (1.0 - progress);
        float scale = 1.0 + (maxScale - 1.0) * progress;
        
        float weakX = 0.5 + (vuv.x - 0.5) / scale;
        float weakY = 0.5 + (vuv.y - 0.5) / scale;
        vec2 weakTextureCoords = vec2(weakX, weakY);
        
        vec4 weakMask = texture2D(map, weakTextureCoords);
        
        vec4 mask = texture2D(map, vuv);
        
        gl_FragColor = mask * (1.0 - alpha) + weakMask * alpha;
    }
    `
};
