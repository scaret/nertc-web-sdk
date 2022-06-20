export const oldFilmShader = {
    fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    #define SEQUENCE_LENGTH 24.0
    #define FPS 24.0
    
    uniform sampler2D map;
    uniform sampler2D dirtMap;
    uniform float time;
    uniform vec2 size;
    uniform float intensity;

    varying vec2 vuv;

    float vignette(vec2 uv, float time)
    {
        uv *=  1.0 - uv.yx;
        float vig = uv.x*uv.y * 15.0;
        float t = sin(time * 23.) * cos(time * 8. + .5);
        return pow(vig, 0.4 + t * .05);
    }

    float easeIn(float t0, float t1, float t)
    {
        return 2.0*smoothstep(t0,2.*t1-t0,t);
    }

    float filmDirt(vec2 pp, float scale, float time)
    {
        float aaRad = 0.1;
        vec2 nseLookup2 = pp + scale * time;
        vec3 nse2 =
            texture2D(dirtMap, .1*nseLookup2.xy,0.).xyz +
            texture2D(dirtMap, .01*nseLookup2.xy,0.).xyz +
            texture2D(dirtMap, .002*nseLookup2.xy+0.4,0.).xyz;
        float thresh = 1.9;
        float mul1 = smoothstep(thresh-aaRad,thresh+aaRad,nse2.x);
        float mul2 = smoothstep(thresh-aaRad,thresh+aaRad,nse2.y);
        float mul3 = smoothstep(thresh-aaRad,thresh+aaRad,nse2.z);

        float seed = texture2D(dirtMap, vec2(time * 0.1, time*0.2)).x;

        float result = clamp(0.,1.,seed+.7) + .3 * smoothstep(0., SEQUENCE_LENGTH, time);

        result += .06 * easeIn(19.2, 19.4, time);

        float band = .05;
        if( 0.3 < seed && .3+band > seed )
            return mul1 * result;
        if( 0.6 < seed && .6+band > seed )
            return mul2 * result;
        if( 0.9 < seed && .9+band > seed )
            return mul3 * result;
        return result;
    }

    float jumpCut(float seqTime)
    {
        float toffset = 0.;

        float jct = seqTime;
        float jct1 = 7.7;
        float jct2 = 8.2;
        float jc1 = step( jct1, jct );
        float jc2 = step( jct2, jct );

        toffset += 0.8 * jc1;
        toffset -= (jc2-jc1)*(jct-jct1);
        toffset -= 0.9 * jc2;

        return toffset;
    }

    float limitFPS(float time, float fps)
    {
        time = mod(time, SEQUENCE_LENGTH);
        return float(int(time * fps)) / fps;
    }

    vec2 moveImage(vec2 uv, float time)
    {
        uv.x += 2.0 / size.x * (cos(time) * sin(time * 12. + .25));
        uv.y += 2.0 / size.y * (sin(time * 1. + .5) * cos(time * 15. + .25));
        return uv;
    }

    void main() {
        float scale = max(size.x, size.y) / (intensity * 31.0 + 1.0);
        vec2 qq = -scale * 0.5 + scale * vuv;
        qq.x *= size.x / size.y;

        float time = limitFPS(mod(time, 1.0), FPS);

        float d = filmDirt(qq, scale, time + jumpCut(time));
        vec3 dirt = vec3(d);
        vec3 image = texture2D(map, moveImage(vuv, time)).rgb;
        float vig = vignette(vuv, time);

        gl_FragColor = vec4(image * dirt * vig, 1.0);
    }
`
};
