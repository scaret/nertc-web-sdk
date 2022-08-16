export const magnifierShader = {
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    #define pi 3.1415926

    uniform sampler2D map;
    uniform vec2 size;
    uniform vec2 pos;
    uniform float intensity;

    varying vec2 vuv;

    float atan2(float y, float x){
        if(x>0.) return atan(y/x);
        if(y>=0. && x<0.) return atan(y/x) + pi;
        if(y<0. && x<0.) return atan(y/x) - pi;
        if(y>0. && x==0.) return pi/2.;
        if(y<0. && x==0.) return -pi/2.;
        if(y==0. && x==0.) return pi/2.; // undefined usually
        return pi/2.;
    }

    vec2 uv_polar(vec2 uv, vec2 center){
        vec2 c = uv - center;
        float rad = length(c);
        float ang = atan2(c.x,c.y);
        return vec2(ang, rad);
    }

    vec2 uv_lens_half_sphere(vec2 uv, vec2 position, float radius, float refractivity){
        vec2 polar = uv_polar(uv, position);
        float cone = clamp(1.-polar.y/radius, 0., 1.);
        float halfsphere = sqrt(1.-pow(cone-1.,2.));
        float w = atan2(1.-cone, halfsphere);
        float refrac_w = w-asin(sin(w)/refractivity);
        float refrac_d = 1.-cone - sin(refrac_w)*halfsphere/cos(refrac_w);
        vec2 refrac_uv = position + vec2(sin(polar.x),cos(polar.x))*refrac_d*radius;
        return mix(uv, refrac_uv, float(length(uv-position)<radius));
    }

    float circle(vec2 uv, vec2 center, float radius, float width){
        float dis = length(uv - center);
        return smoothstep(0.0, width, abs(radius - dis));
    }

    void main() {
        vec2 aspect = vec2(1.,size.y/size.x);
        vec2 uv_correct = 0.5 + (vuv -0.5)* aspect;

        float maxScale = min(size.x, size.y);
        float yOffset = (size.x - size.y)/size.x/2.0;
        maxScale /= (2.0 * size.x);
        float scale = (maxScale * 0.3 + (maxScale * 0.7) * intensity);

        vec2 pos = mix(vec2(0.0 + scale, 0.0 + scale + yOffset), vec2(1.0-scale, 1.0 - scale - yOffset), pos);

        vec2 uv_lens_distorted = uv_lens_half_sphere(uv_correct, pos, scale, (1.5 + intensity * intensity * 0.5));

        uv_lens_distorted = 0.5 + (uv_lens_distorted - 0.5) / aspect;

        float ring = circle(uv_correct, pos, scale, 2.0/max(size.x, size.y));
        gl_FragColor = vec4(mix(vec3(0.0), texture2D(map, uv_lens_distorted).rgb, ring), 1.0);
    }
`
}
