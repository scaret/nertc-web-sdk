export const fireShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform sampler2D fireMap;
    uniform vec2 size;
    uniform float time;
    uniform float intensity;

    varying vec2 vuv;

    void main() {
        vec2 scale = vec2(1.0, size.y / size.x) * (size.x / (512.0 - intensity * 256.0));

        vec3 color = texture2D(map, vuv).rgb;
        vec3 fireColor = vec3(0,0,0);

        float scaleY = scale.y * (1.0 - intensity * 0.75);
        float time = time * (intensity + 1.0) * 0.5;

        float dist = texture2D(fireMap, vec2(vuv.x * scale.x - time * 1.1, vuv.y * scaleY - time * 1.8)).r;

        float tex = texture2D(fireMap, vec2(vuv.x * scale.x + dist*0.2, vuv.y * scaleY - time * 1.5)).r;

        tex += vuv.y * .5;
        float fire = pow(1. - tex, 2.3);
        fire -= (1.-(abs(vuv.x-.5)*2.))*.5;

        fireColor += fire * 5. * mix(vec3(1.0, .3, 0), vec3(.0, .3, 1.0), sin(vuv.x * 3.1415926));
        fireColor = clamp(fireColor, vec3(0.0), vec3(1.0));

        gl_FragColor = vec4(mix(color, fireColor, pow((fireColor.r+fireColor.g+fireColor.b)/3.0, 3.0) * (1.0 + intensity*3.0)), 1.0);
    }
`
}
