export const edgeShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform vec2 size;
    uniform float intensity;

    varying vec2 vuv;

    float lumi( in vec4 fragColor ) {
        float  gray = 0.299 * fragColor.x + 0.587 * fragColor.y + 0.114 * fragColor.z;
        return gray;
    }

    vec2 sobel(in vec2 uv, in vec2 t) {
        float tleft = lumi(texture2D(map,uv + vec2(-t.x,t.y)));
        float left = lumi(texture2D(map,uv + vec2(-t.x,0)));
        float bleft = lumi(texture2D(map,uv + vec2(-t.x,-t.y)));
        float top = lumi(texture2D(map,uv + vec2(0,t.y)));
        float bottom = lumi(texture2D(map,uv + vec2(0,-t.y)));
        float tright = lumi(texture2D(map,uv + vec2(t.x,t.y)));
        float right = lumi(texture2D(map,uv + vec2(t.x,0)));
        float bright = lumi(texture2D(map,uv + vec2(t.x,-t.y)));
        float gx = tleft + 2.0*left + bleft - tright - 2.0*right - bright;
        float gy = -tleft - 2.0*top - tright + bleft + 2.0 * bottom + bright;
        return vec2(gx, gy);
    }

    void main() {
        vec2 t = vec2(1.0) / size;
        vec2 s = sobel(vuv, t);
        float g = sqrt(pow(s.x, 2.0) + pow(s.y, 2.0));
        if(g < (2.0 - intensity) * 0.1){
            g = pow(g, intensity * 2.0 + 2.0);
        }else{
            g = pow(g, 2.0) * (12.0 + intensity * 12.0);
        }
        vec3 col = vec3(g);
        gl_FragColor = vec4(col, 1.0);
    }
`
}
