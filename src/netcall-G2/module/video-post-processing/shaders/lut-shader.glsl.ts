export const lutShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform sampler2D lut;

    // lut强度
    uniform float intensity;

    varying vec2 vuv;

    void main() {
        vec3 color = texture2D(map, vuv).rgb;

        if(intensity > 0.0){
            float blue = color.b * 63.0;

            vec2 q1;
            float fb = floor(blue);
            q1.y = floor(fb * 0.125);
            q1.x = fb - (q1.y * 8.0);

            vec2 q2;
            float cb = ceil(blue);
            q2.y = floor(cb * 0.125);
            q2.x = cb - (q2.y * 8.0);

            vec2 t = 0.123 * color.rg + vec2(0.000976563);
            vec2 t1 = q1 * 0.125 + t;
            vec3 p1 = texture2D(lut, t1).rgb;

            vec2 t2 = q2 * 0.125 + t;
            vec3 p2 = texture2D(lut, t2).rgb;

            vec3 filter = mix(p1, p2, fract(blue));
            color = mix(color, filter, intensity);
        }
        gl_FragColor = vec4(color, 1.0);
    }`
}
