export const flatShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D mipMap;
    uniform sampler2D map;
    uniform float intensity;
    uniform float minSize;
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
            pix += k * texture2D(mipMap, uv, i).rgb;
            norm += k;
        }
        return pix*pow(norm,-0.95);
    }

    void main() {
        vec3 avgColor = texture2D(mipMap, vuv, 10.0).rgb;
        vec3 color = texture2D(map, vuv).rgb;
        color = (color - 0.5) * (1.5 + intensity * intensity * 0.5) + 0.5;

        float avg = avgColor.r * 0.3 + avgColor.g * 0.59 + avgColor.b * 0.11;
        float gray = color.r * 0.3 + color.g * 0.59 + color.b * 0.11;

        float step = min(avg, 1.0-avg) / 2.0;
        float steps[5];
        steps[0] = avg-2.0*step;
        steps[1] = avg-step;
        steps[2] = avg;
        steps[3] = avg+step;
        steps[4] = avg+step*2.0;

        int idx = -1;
        float dis = 2.0;

        for(int i=0; i<5; i++){
            float _dis = abs(gray - steps[i]);
            if(_dis <  dis){
                idx = i;
                dis = _dis;
            }
        }

        if(idx == 0){
            gl_FragColor = vec4(vec3(0.0), 1.0);
        }else if(idx == 1){
            gl_FragColor = vec4(vec3(0.25), 1.0);
        }else if(idx == 2){
            gl_FragColor = vec4(vec3(0.5), 1.0);
        }else if(idx == 3){
            gl_FragColor = vec4(vec3(0.6), 1.0);
        }else{
            gl_FragColor = vec4(vec3(0.7), 1.0);
        }

        float blur_radius = minSize * (0.05 + 0.05 * intensity);
        gl_FragColor.rgb *= sample_blured(vuv, blur_radius, 0.5) * (2.0 - avg);
    }
`
}
