export const smoothShader = {
  vShader: `
    attribute vec4 position;
    attribute vec2 uv;
    varying vec2 vuv;
    void main() {
        gl_Position = position;
        vuv = uv;
    }
`,
  fShader: `
    precision mediump float;


    #define pow(a,b) pow(max(a,0.),b)

    uniform vec2 size;
    uniform sampler2D map;
    uniform sampler2D whitenMap;

    // 磨皮度
    uniform float intensity;

    // 美白红润度
    uniform float wrIntensity;

    varying vec2 vuv;

    // 0.0 - 1.0
    const float disBias = 0.6;

    // 1.0 - 3.0
    const float pixelMulti = 1.5;

    // 色调阈值
    const float invHueTol = 20.0;

    // 根据黄金比例取角度值
    const float angle = 2.39;

    const mat2 sampleMat = mat2(cos(angle),sin(angle),-sin(angle),cos(angle));

    vec3 smooth(sampler2D image, float samples, in vec2 uv, in vec2 resolution){
        vec3 color = vec3(0.0);
        float radius = sqrt(samples);
        float sampleRadius = 0.5/(radius*radius);
        vec2  samplePixel = 1.0/resolution;
        vec3  sampleCenter = texture2D(image, uv).rgb;
        vec3  sampleCenterNorm = normalize(sampleCenter);
        float sampleCenterSat = length(sampleCenter);

        float influenceSum = 0.0;
        float brightnessSum = 0.0;

        vec2 pixelRotated = vec2(0.,1.);

        for (float x = 0.0; x <= 100.0; x++) {
            pixelRotated *= sampleMat;
            vec2  pixelOffset = pixelMulti*pixelRotated*sqrt(x)*0.5;
            float pixelInfluence = 1.0-sampleRadius*pow(dot(pixelOffset,pixelOffset),disBias);
            pixelOffset *= samplePixel;
            vec3 thisDenoisedColor = texture2D(image, uv + pixelOffset).rgb;
            pixelInfluence *= pixelInfluence*pixelInfluence;
            pixelInfluence *= pow(0.5+0.5*dot(sampleCenterNorm,normalize(thisDenoisedColor)),invHueTol)
            * pow(1.0 - abs(length(thisDenoisedColor)-length(sampleCenterSat)),8.);

            influenceSum += pixelInfluence;
            color += thisDenoisedColor*pixelInfluence;
            if(x > samples){
                return color/influenceSum;
            }
        }

        return color/influenceSum;
    }

    vec3 lutFilter(vec3 color, sampler2D lut, float factor){
        float blueColor = color.b * 63.0;
        vec2 quad1;
        quad1.y = floor(floor(blueColor) / 8.0);
        quad1.x = floor(blueColor) - (quad1.y * 8.0);
        vec2 quad2;
        quad2.y = floor(ceil(blueColor) / 8.0);
        quad2.x = ceil(blueColor) - (quad2.y * 8.0);
        vec2 texPos1;
        texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
        texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);
        vec2 texPos2;
        texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
        texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);
        lowp vec3 newColor1 = texture2D(lut, texPos1).rgb;
        lowp vec3 newColor2 = texture2D(lut, texPos2).rgb;
        lowp vec3 newColor = mix(newColor1, newColor2, fract(blueColor));
        return mix(color, newColor, factor);
    }

    void main() {
        vec3 smColor = smooth(map, (intensity * 99.0 + 1.0), vuv, size*0.5);
        smColor = lutFilter(smColor, whitenMap, wrIntensity);
        gl_FragColor = vec4(smColor, 1.0);
    }
`
}
