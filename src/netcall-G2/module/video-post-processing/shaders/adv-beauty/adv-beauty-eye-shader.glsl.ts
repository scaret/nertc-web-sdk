export const advBeautyEyeShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform vec2 eyeCenter;
    uniform float rdIntensity;
    uniform float lgIntensity;
    uniform float range;

    varying vec2 vuv;

    vec2 inflate(vec2 uv, vec2 center, float range, float strength, float powRatio) {
        float dist = distance(uv, center);
        if(dist > range){
            return uv;
        }
        vec2 dir = normalize(uv - center);
        float scale = 1. - strength + strength * pow(smoothstep(0., 1., dist / range), powRatio);
        float newDist = dist * scale;
        return center + newDist * dir;
    }

    void main() {
        vec2 uv = vuv;
        if(rdIntensity > 0.0){
            float maxRdIntens = mix(1.0, 0.5, lgIntensity);
            float rdIntens = mix(0.0, maxRdIntens, rdIntensity);
            uv = inflate(uv, eyeCenter, range * 1.25, rdIntens * 3.0, 0.075);
        }
        if(lgIntensity > 0.0){
            uv = inflate(uv, eyeCenter, range * 3.0, lgIntensity, 0.125);
        }
        gl_FragColor = texture2D(map, uv);
    }
`
};