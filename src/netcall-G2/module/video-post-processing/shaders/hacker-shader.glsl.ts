export const hackerShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    
    uniform sampler2D map;
    uniform sampler2D textMap;
    uniform sampler2D rndMap;
    uniform float time;
    uniform vec2 size;
    uniform float intensity;

    varying vec2 vuv;

    float text(vec2 fragCoord)
    {
        float time = mod(time, 3.0);
        vec2 uv = mod(fragCoord.xy, 16.)*.0625;
        vec2 block = fragCoord*.0625 - uv;
        uv = uv*.8+.1;
        uv += floor(texture2D(rndMap, block/64.0 + time * (.02 + intensity*0.02)).xy * 16.);
        uv *= .0625;
        uv.x = -uv.x;
        return pow(texture2D(textMap, uv).r, 3.0) * 2.0;
    }
    
    vec3 rain(vec2 fragCoord)
    {
        fragCoord.x -= mod(fragCoord.x, 16.);
        float offset = sin(fragCoord.x * 15.);
        float speed = cos(fragCoord.x * 3.) *.3+.7 * (1.0 + intensity * 0.5);
        float y = fract(vuv.y + time * speed + offset);
        return mix(vec3(.1, 1.0, 0.5), vec3(.1, 0.5, 1.0), sin(vuv.x * 3.1415926)) / (y * 20.);
    }

    void main() {
        vec2 fragCoord = vuv * size;
        vec3 color = texture2D(map, vuv).rgb;
        vec3 color2 = text(fragCoord)*rain(fragCoord);
        gl_FragColor = vec4(mix(color, color2, 0.35 + intensity * 0.05), 1.0);
    }
`
};
