export const TVDistortionShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    varying vec2 vuv;
    vec2 uv;
    uniform float time;
    uniform float intensity;

    float onOff(float a, float b, float c) {
        return step(c, sin(time + a*cos(time*b)));
    }

    vec4 getVideo(vec2 vuv) {
        vec2 look = vuv;
        float window = 1.0/(1.0+20.0*(look.y-mod(time/4.0, 1.0))*(look.y-mod(time/4.0, 1.0)));
        look.x = look.x + sin(look.y*10.0 + time)/50.0*onOff(4.0,4.0,0.3)*(1.0+cos(time*80.0))*window;
        float vShift = 0.4*onOff(2.0, 3.0, 0.9)*(sin(time)*sin(time*20.0) + (0.5 + 0.1*sin(time*200.0)*cos(time)));

        look.y = mod(look.y + vShift * (0.1 + 0.9 * intensity), 1.0);
        vec4 video = texture2D(map, look);
        return video;
    }

    float vignette(vec2 uv, float time)
    {
        uv *=  1.0 - uv.yx;
        float vig = uv.x*uv.y * 15.0;
        float t = sin(time * 23.) * cos(time * 8. + .5);
        return pow(vig, 0.4 + t * .05);
    }

    vec2 screenDistort(vec2 vuv) {
        uv = vuv;
        uv -= vec2(0.5, 0.5);
        uv = uv * 1.2 * (1.0/1.2 + 2.0 * uv.x * uv.x * uv.y * uv.y);
        uv += vec2(0.5, 0.5);
        return uv;
    }

    void main() {
        uv = vuv;
        uv = screenDistort(uv);
        vec3 video = getVideo(uv).rgb * vignette(uv, time);

        video *= (12.0 + mod(uv.y * 30.0 + time, 1.0)) / 13.0;

        gl_FragColor = vec4(video, 1.0);
    }
    `
}
