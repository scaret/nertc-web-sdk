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

    uniform float showWire;
    
    uniform sampler2D map;
    uniform sampler2D wireMap;
    uniform sampler2D eyeTeethMaskMap;
    uniform sampler2D teethLut;
    uniform float eyeIntensity;
    uniform float teethIntensity;
    varying vec2 vuv;

    vec3 lut64(vec3 color, sampler2D lut){
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

        return mix(p1, p2, fract(blue));
    }

    void main() {
        vec4 color = texture2D(map, vuv);
        if(eyeIntensity > 0.0 || teethIntensity > 0.0){
            vec4 eyeTeethMask = texture2D(eyeTeethMaskMap, vuv);
            float teethInten = eyeTeethMask.r > 0.0 ? teethIntensity * eyeTeethMask.a : 0.0;
            float eyeInten = eyeTeethMask.g > 0.0 ? eyeIntensity * eyeTeethMask.a : 0.0;
            if(teethInten>0.0){
                color.rgb = mix(color.rgb, lut64(color.rgb, teethLut), teethInten);
            }
            if(eyeInten>0.0){
                eyeInten += 1.0;
                color.rgb = clamp(color.rgb - vec3(0.5), -0.25, 0.5) * eyeInten + vec3(0.5);
            }
        }
        if(showWire > 0.5){
            vec4 wire = texture2D(wireMap, vuv);
            gl_FragColor = mix(color, wire, wire.a);
        }else{
            gl_FragColor = color;
        }
    }
`
};

// lut16 滤镜转换
// vec3 lut16(vec3 color, sampler2D lut){
//     float blue = color.b * 15.0;
        
//     vec2 q1;
//     float fb = floor(blue);
//     q1.y = floor(fb * 0.25);
//     q1.x = fb - (q1.y * 4.0);

//     vec2 q2;
//     float cb = ceil(blue);
//     q2.y = floor(cb * 0.25);
//     q2.x = cb - (q2.y * 4.0);

//     vec2 t = 0.234375 * color.rg + vec2(0.015625);
//     vec2 t1 = q1 * 0.25 + t;
//     vec3 p1 = texture2D(lut, t1).rgb;

//     vec2 t2 = q2 * 0.25 + t;
//     vec3 p2 = texture2D(lut, t2).rgb;

//     return mix(p1, p2, fract(blue));
// }