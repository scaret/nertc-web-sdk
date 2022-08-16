export const waterFlowShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    #define PHI 1.61803399
    #define TAU 6.28318531
    #define ASPECT (float(iResolution.x)/float(iResolution.y))

    const float DEPTH=.02;
    const vec3 LIGHT= normalize(vec3(-.5,1.,.25)), COLOR_SUN= vec3(1.1,1.,1.)*8., COLOR_SKY= vec3(.1,.12,.14)*1.3;

    uniform sampler2D map;
    uniform sampler2D flowMap;
    uniform float time;
    uniform float intensity;

    varying vec2 vuv;

    float lum(vec3 rgb){ return dot(rgb,vec3(0.299, 0.587, 0.114)); }
    float nmapu(float x){ return x*.5+.5; }
    vec2  nmapu(vec2  x){ return x*.5+.5; }
    float nmaps(float x){ return x*2.-1.; }
    vec2  nmaps(vec2  x){ return x*2.-1.; }
    float tri(float x){ return abs(nmaps(fract(x))); }
    vec2  tri(vec2  x){ return abs(nmaps(fract(x))); }
    vec2 gnse2(vec2 p){ return fract(tan(p*vec2(PHI,PHI*PHI)*512.)*512.*PHI); }

    float wave(float x){
        float x0= x;
        x= nmapu(sin( x*45. - time*24. ));
        x= pow(x,24.);
        x/= x0*32.+.125;
        x*= exp(-x0*2.);
        return x;
    }
    float depthf(vec2 p){
        float TURBULENCE = 0.25 * intensity + 0.45;
        float bottom= lum(texture2D(map, p).rgb);
        vec2 flow= vec2(0., time*(0.2 + intensity*0.1));
        p+= flow;
        p+= bottom * (0.05 + 0.05 * intensity);
        float surface= lum(texture2D(flowMap, p*TURBULENCE).rgb)*TURBULENCE;
        return surface*DEPTH;
    }

    void main() {
        vec2 uv= vuv;
        vec2 uv0= uv;

        float d= 0.01;
        float d0= depthf(uv);
        vec2 grad= (vec2(
            depthf(uv+vec2(d,0)),
            depthf(uv+vec2(0,d))
        )-d0)/d;
        vec3 N= normalize(vec3(grad.x,grad.y,1.));

        float L= max(0., reflect(LIGHT, N).z );

        float sun= min(1.,pow(L*1.5,5.));
        float sky= min(1.,pow(L+.4,1.2));
        vec3 specular= vec3(COLOR_SUN)*sun + vec3(COLOR_SKY)*sky;

        uv+= refract(vec3(0.,0.,1.), N, 1.4).xy*DEPTH;

        vec3 col= pow(texture2D(map, uv).rgb, vec3(1./2.2));
        col+= specular*4.5;
        col= pow(col-.25,vec3(2.3));


        gl_FragColor = vec4(col, 1.0);
    }
`
}
