export const virtualBackShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif
    
    uniform sampler2D map;
    uniform sampler2D maskMap;
    uniform sampler2D backMap;
    uniform vec3 backColor;
    uniform vec2 size;
    uniform vec2 bkSize;
    uniform int backType;

    varying vec2 vuv;
    
    void main() {
        vec3 color = texture2D(map, vuv).rgb;
        float alpha = texture2D(maskMap, vuv).a;

        vec3 bk = backColor;
        // 背景图
        if(backType == 1){
            float ratio = size.x / size.y;
            float bkRatio = bkSize.x / bkSize.y;
            vec2 suv = vuv;
            if(ratio > bkRatio){
                suv.y = (suv.y - 0.5) * bkRatio / ratio + 0.5;
            }else{
                suv.x = (suv.x - 0.5) * ratio / bkRatio + 0.5;
            }
            bk = texture2D(backMap, suv).rgb;
        }

        gl_FragColor = vec4(mix(bk, color, alpha), 1.0);
    }
`
};
