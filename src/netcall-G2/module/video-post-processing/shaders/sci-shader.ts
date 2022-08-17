export const sciShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform vec2 size;
    uniform float time;
    uniform float intensity;

    varying vec2 vuv;

    float distLine(vec2 p, vec2 a, vec2 b) {
        vec2 ap = p - a;
        vec2 ab = b - a;
        float aDotB = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
        return length(ap - ab * aDotB);
    }

    float drawLine(vec2 uv, vec2 a, vec2 b) {
        float line = smoothstep(0.014, 0.01, distLine(uv, a, b));
        float dist = length(b-a);
        return line * (smoothstep(1.3, 0.8, dist) * 0.5 + smoothstep(0.04, 0.03, abs(dist - 0.75)));
    }

    float n21(vec2 i) {
        i += fract(i * vec2(223.64, 823.12));
        i += dot(i, i + 23.14);
        return fract(i.x * i.y);
    }

    vec2 n22(vec2 i) {
        float x = n21(i);
        return vec2(x, n21(i+x));
    }

    vec2 getPoint (vec2 id, vec2 offset) {
        return offset + sin(n22(id + offset) * time * 1.0) * 0.4;
    }

    float layer (vec2 uv) {
        float m = 0.0;
        float t = time * 2.0;

        vec2 gv = fract(uv) - 0.5;
        vec2 id = floor(uv) - 0.5;

        vec2 p[9];
        p[0] = getPoint(id, vec2(-1.0, -1.0));
        p[1] = getPoint(id, vec2(-1.0, 0.0));
        p[2] = getPoint(id, vec2(-1.0, 1.0));
        p[3] = getPoint(id, vec2(0.0, -1.0));
        p[4] = getPoint(id, vec2(0.0, 0.0));
        p[5] = getPoint(id, vec2(0.0, 1.0));
        p[6] = getPoint(id, vec2(1.0, -1.0));
        p[7] = getPoint(id, vec2(1.0, 0.0));
        p[8] = getPoint(id, vec2(1.0, 1.0));

        for (int i = 0; i < 9; i++) {
            m += drawLine(gv, p[4], p[i]);
            float sparkle = 1.0 / pow(length(gv - p[i]), 1.5) * 0.002;
            m += sparkle * (sin(t + fract(p[i].x) * 12.23) * 0.4 + 0.6);
        }

        m += drawLine(gv, p[1], p[3]);
        m += drawLine(gv, p[1], p[5]);
        m += drawLine(gv, p[7], p[3]);
        m += drawLine(gv, p[7], p[5]);

        return m;
    }

    void main() {
        vec2 uv = (vuv - 0.5) * size / size.y;
        vec3 c = sin(time * 2.0 * vec3(0.0, .324,.768)) * 0.4 + 0.6;
        vec3 col = texture2D(map, vuv).rgb;
        c.g += (uv.x + 0.5);

        float m = 0.0;
        float x = sin(time * 0.1);
        float y = cos(time * 0.2);

        mat2 rotMat = mat2(x, y, -y, x);
        uv *= rotMat;

        for (float i = 0.0; i <= 1.0; i+= 1.0/4.0) {
            float z = fract(i + time * 0.05);
            float size = mix(15.0, .1, z);
            float fade = smoothstep(0.0, 1.0,  z) * smoothstep(1.0, 0.9, z);
            m += layer((size * uv) + i * 10.0 ) * fade * 1.0;
        }
        c *= m;
        gl_FragColor = vec4(mix(col, c * (0.5 + 2.5 * intensity), 0.3),1.0);
    }
`
}
