export const advFaceMaskShader = {
  vShader: `
    uniform vec2 size;

    attribute vec2 tPosition;
    attribute vec2 uv;
    attribute float zIndex;

    varying vec2 vuv;

    vec2 npos(vec2 pos){
        return pos / size;
    }

    float ndcx(float x){
        return (x - 1.0) * 2.0 + 1.0;
    }

    float ndcy(float y){
        return (1.0 - y) * 2.0 - 1.0;
    }

    vec2 ndcpos(vec2 pos){
        return vec2(ndcx(pos.x), ndcy(pos.y));
    }

    void main() {
        vec2 nPos = tPosition;
        if(zIndex > -0.000001){
            nPos = npos(nPos);
        }
        vec2 ndcPos = ndcpos(nPos);
        gl_Position = vec4(ndcPos, zIndex, 1.0);
        vuv = uv;
    }
`,
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform sampler2D maskMap;
    uniform int index;
    varying vec2 vuv;

    void main() {
        float ca = index==0 ? 0.0 : texture2D(map, vuv).a;
        float ma = texture2D(maskMap, vuv).a;
        float a = 1.0 - (1.0 - ca) * (1.0 - ma);
        gl_FragColor = vec4(1.0, 0.0, 0.0, a);
    }
`
}
