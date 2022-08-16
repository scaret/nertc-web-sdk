export const advBeautyWireShader = {
  vShader: `
    uniform vec2 size;

    attribute vec2 position;

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
        vec2 nPos = npos(position);
        vec2 ndcPos = ndcpos(nPos);
        gl_Position = vec4(ndcPos, 0.0, 1.0);
    }
`,
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    }
`
}
