export const mipMapBlurShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;
    uniform float intensity;
    uniform float radius;
    varying vec2 vuv;

    float weight(float t, float log2radius, float gamma)
    {
        return exp(-gamma*pow(log2radius-t,2.));
    }

    vec3 sample_blured(vec2 uv, float radius, float gamma)
    {
        vec3 pix = vec3(0.);
        float norm = 0.;
        for(float i = 0.; i < 10.; i += 0.5)
        {
            float k = weight(i, log2(radius), gamma);
            pix += k * texture2D(map, uv, i).rgb;
            norm += k;
        }
        return pix*pow(norm,-0.95);
    }

    void main() {
        gl_FragColor = vec4(sample_blured(vuv, mix(8.0, radius, intensity), intensity), 1.0);
    }
`
}
