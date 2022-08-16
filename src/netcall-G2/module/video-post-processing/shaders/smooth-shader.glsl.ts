export const smoothShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    #define pow(a,b) pow(max(a,0.),b)

    uniform vec2 size;
    uniform sampler2D map;
    uniform float intensity;

    varying vec2 vuv;

    // 0.0 - 1.0
    const float disBias = 0.6;

    // 1.0 - 3.0
    const float pixelMulti = 1.5;

    // 色调阈值
    const float invHueTol = 30.0;

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

        for (float x = 0.0; x <= 80.0; x++) {
            pixelRotated *= sampleMat;
            vec2  pixelOffset = pixelMulti*pixelRotated*sqrt(x)*0.5;
            float pixelInfluence = 1.0-sampleRadius*pow(dot(pixelOffset, pixelOffset),disBias);
            pixelOffset *= samplePixel;
            vec3 thisDenoisedColor = texture2D(image, uv + pixelOffset).rgb;
            pixelInfluence *= pixelInfluence*pixelInfluence;
            pixelInfluence *= pow(0.5 + 0.5 * dot(sampleCenterNorm,normalize(thisDenoisedColor)), invHueTol)
            * pow(1.0 - abs(length(thisDenoisedColor)-length(sampleCenterSat)),8.);

            influenceSum += pixelInfluence;
            color += thisDenoisedColor*pixelInfluence;
            if(x >= samples){
                return color/influenceSum;
            }
        }

        return color/influenceSum;
    }

    void main() {
        vec3 smColor = smooth(map, intensity * 70.0 + 10.0, vuv, size*0.5);
        gl_FragColor = vec4(smColor, 1.0);
    }
`
}
