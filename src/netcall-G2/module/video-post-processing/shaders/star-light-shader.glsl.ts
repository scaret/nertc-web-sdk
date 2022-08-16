export const starLightShader = {
  //TODO: 待优化
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

    #define t (time * 0.6)
    #define PI 3.14159265

    #define H(P) fract(sin(dot(P,vec2(127.1,311.7)))*43758.545)
    #define pR(a) mat2(cos(a),sin(a),-sin(a),cos(a))

    void main() {
        uv = vuv;
        gl_FragColor = texture2D(map, uv);

        uv  = vec2(0.5 - uv.x, uv.y) * 3.0;

        vec3 vuv = vec3(sin(time * 0.3), 1.0, cos(time));
        vec3 ro = vec3(0.0, 0.0, 134.0);
        vec3 vrp = vec3(5.0, sin(time) * 60.0, 20.0);

        vrp.xz * pR(time);
        vrp.yz * pR(time * 0.2);

        vec3 vpn = normalize(vrp - ro);
        vec3 u   = normalize(cross(vuv, vpn));
        vec3 rd  = normalize(vpn + uv.x * u  + uv.y * cross(vpn, u));

        vec3 sceneColor = vec3(0.0, 0.0, 0.3);
        vec3 flareCol = vec3(0.0);
        float flareIntensivity = 0.0;

        for (float k = 0.0; k < 400.0; k++) {
            float r = H(vec2(k)) * 2.0 - 1.0;
            vec3 flarePos = vec3(H(vec2(k) * r) * 20.0 - 10.0, r * 8.0, (mod(sin(k / 200.0 * PI * 4.0) * 15.0 - t * 13.0 * k * 0.007, 25.0)));
            float v = max(0.0, abs(dot(normalize(flarePos), rd)));

            flareIntensivity += pow(v, 30000.0) * 4.0;
            flareIntensivity += pow(v, 1e2) * 0.15;
            flareIntensivity *= 1.0 - flarePos.z / 25.0;
            flareCol += vec3(flareIntensivity) * (vec3(sin(r * 3.12 - k), r, cos(k) * 2.0)) * 0.3;
        }

        sceneColor += abs(flareCol);
        sceneColor = mix(sceneColor, sceneColor.rrr * 1.4, length(uv) / 2.0);

        gl_FragColor += vec4(pow(sceneColor, vec3(1.1)), 1.0);
    }
    `
}
