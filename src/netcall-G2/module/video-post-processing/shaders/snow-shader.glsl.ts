export const snowShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    #define _NUMSHEETS 10.

    uniform sampler2D map;
    uniform float time;
    uniform vec2 size;
    uniform float intensity;
    varying vec2 vuv;

    vec2 uv;

    float rnd(float x)
    {
        return fract(sin(dot(vec2(x+47.49,38.2467/(x+2.3)), vec2(12.9898, 78.233)))* (43758.5453));
    }

    float drawFlake(vec2 center, float radius)
    {
        return 1.0 - smoothstep(0.0, radius, length(uv - center));
    }

    void main() {
        uv = vuv * size / size.x;

        float nums = 20.0 + 80.0 * intensity;

        vec3 col = texture2D(map, vuv).rgb;
        for (float i = 1.; i <= _NUMSHEETS; i++){
            for (float j = 1.; j <= 100.0; j++){
                if (j > nums || j > nums/i) break;

                float size = 0.002 * i * (1. + rnd(j)/2.);
                float speed = size * .75 + rnd(i) / 1.5;

                vec2 center = vec2(0., 0.);
                center.x = -.3 + rnd(j*i) * 1.4 + 0.1*cos(time + sin(j*i));
                center.y = fract(sin(j) - speed * time) / 1.3;

                col += vec3( (1. - i/_NUMSHEETS) * drawFlake(center, size));
            }
        }
        gl_FragColor = vec4(col,1.0);
    }
`
}
