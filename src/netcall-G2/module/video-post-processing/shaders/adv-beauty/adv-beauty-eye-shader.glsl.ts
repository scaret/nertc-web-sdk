export const advBeautyEyeShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform vec2 eyeCenter;
    uniform vec2 rdDir;
    uniform float rdIntensity;
    uniform float lgIntensity;
    uniform float range;

    varying vec2 vuv;

    mat3 scaleByNormal(vec2 normal, float k, float refx, float refy){
        float a = 1.0 + (k - 1.0) * normal.x * normal.x;
        float b = (k - 1.0) * normal.x * normal.y;
        float c = 1.0 + (k - 1.0) * normal.y * normal.y;
        return mat3(
            a, b, 0.0,
            b, c, 0.0,
            (1.0 - a) * refx - b * refy, (1.0 - c) * refy - b * refx, 1.0
        );
    }

    vec2 lgEye(vec2 uv, vec2 center, float range, float strength, float powRatio) {
        float dist = distance(uv, center);
        if(dist > range){
            return uv;
        }
        vec2 dir = normalize(uv - center);
        float scale = 1. - strength + strength * pow(smoothstep(0., 1., dist / range), powRatio);
        float newDist = dist * scale;
        return center + newDist * dir;
    }

    vec2 rdEye(vec2 uv, vec2 center, float range, float strength, float powRatio){
        float dist = distance(uv, center);
        if(dist > range){
            return uv;
        }
        float scale = 1. - strength + strength * pow(smoothstep(0., 1., dist / range), powRatio);
        return (scaleByNormal(rdDir, scale, center.x, center.y) * vec3(uv, 1.0)).xy;
    }

    void main() {
        vec2 uv = vuv;
        if(rdIntensity > 0.0){
            float maxRdIntens = mix(1.0, 0.5, lgIntensity);
            float rdIntens = mix(0.0, maxRdIntens, rdIntensity);
            uv = lgEye(uv, eyeCenter, range * 2.0, rdIntens, 0.075);
            uv = rdEye(uv, eyeCenter, range * 2.0, rdIntens, 0.1);
        }
        if(lgIntensity > 0.0){
            uv = lgEye(uv, eyeCenter, range * 2.5, lgIntensity, 0.1);
            uv = rdEye(uv, eyeCenter, range * 2.5, lgIntensity, 0.05);
        }
        gl_FragColor = texture2D(map, uv);
    }
`
};