export const advBeautyShader = {
    vShader: `
    uniform vec2 size;

    attribute vec2 position;
    attribute vec2 tPosition;
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
        vec2 nPos = position;
        vec2 ntPos = tPosition;
        if(zIndex > -0.000001){
            nPos = npos(nPos);
            ntPos = npos(ntPos);
        }
        vec2 ndcPos = ndcpos(ntPos);
        gl_Position = vec4(ndcPos, zIndex, 1.0);

        vuv = nPos;
        vuv.y = 1.0 - vuv.y;
    }
`,
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform sampler2D wireMap;
    uniform float showWire;
    varying vec2 vuv;

    void main() {
        vec4 color = texture2D(map, vuv);
        if(showWire > 0.5){
            vec4 wire = texture2D(wireMap, vuv);
            gl_FragColor = mix(color, wire, wire.a);
        }else{
            gl_FragColor = color;
        }
    }
`
};
