export const stretchShader = {
  // TODO: 需要优化算法
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

    float triWave(float x) {
        return(abs(mod(x-15.0, 20.0)-10.0)+0.80);
    }

    void main() {
        uv = vuv;
        uv = uv*2.0;

        vec2 uvR = uv*(1.0-length(uv)/(triWave(time*5.0)));
        vec2 uvG = uv*(1.0-length(uv)/(triWave(time*5.0+0.1)));
        vec2 uvB = uv*(1.0-length(uv)/(triWave(time*5.0+0.2)));

        uvR = uvR/2.0 + 0.5;
        uvG = uvG/2.0 + 0.5;
        uvB = uvB/2.0 + 0.5;

        float R = texture2D(map, uvR).r;
        float G = texture2D(map, uvG).g;
        float B = texture2D(map, uvB).b;

        gl_FragColor = vec4(R, G, B, 1.0);
    }
    `
}
