export const sketchShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    const float PI = 3.1415926;
    
    uniform sampler2D gridMap;
    uniform sampler2D pencilMap;
    uniform sampler2D edgeMap;
    uniform vec2 size;

    varying vec2 vuv;

    void main() {
        vec2 scale1 = size / 32.0;
        vec2 scale2 = size / 256.0;
        vec3 bkColor = texture2D(gridMap, (vuv - 0.5) * scale1 + 0.5).rgb;
        vec3 color = texture2D(pencilMap, (vuv - 0.5) * scale2 + 0.5).rgb;
        bkColor = mix(color, vec3(1.0), bkColor.r);
        vec3 edgeColor = texture2D(edgeMap, vuv).rgb;
        gl_FragColor = vec4(mix(bkColor, color * color * color, edgeColor.r), 1.0);
    }
`
};
