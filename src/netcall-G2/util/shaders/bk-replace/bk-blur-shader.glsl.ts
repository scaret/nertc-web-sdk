export const bkBlurShader = {
    fShader: `
    precision mediump float;
    
    uniform vec2 size;
    uniform sampler2D map;
    uniform  float intensity = 0.0;

    varying vec2 vuv;

    float noise(vec2 co) {
        vec2 seed = vec2(sin(co.x), cos(co.y));
        return fract(sin(dot(seed ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
        vec2 offset = (vec2(noise(size), noise(size.yx)) * 16.0 * (20.0 * intensity)) / size;
        vec3 res = texture2D(map, vuv + offset).rgb * (1.0 - intensity * 0.5);
        gl_FragColor = vec4(res, 1.0);
    }
`
};
