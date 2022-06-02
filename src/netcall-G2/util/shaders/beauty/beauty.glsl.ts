export const beautyShader = {
    fShader: `
    precision mediump float;

    uniform vec2 size;

    uniform sampler2D map;
    uniform sampler2D blurMap;
    uniform sampler2D highPassMap;

    // 磨皮度
    uniform float intensity;

    varying vec2 vuv;
    
    void main() {
        vec4 originColor = texture2D(map, vuv);
        if(intensity > 0.0){
            vec2 stepOffset = 1.0 / size;
            float uOffsetX = stepOffset.x;
            float uOffsetY = stepOffset.y;
            float strength = intensity * 1.5;
    
            vec4 meanColor = texture2D(blurMap, vuv);
            vec4 varColor = texture2D(highPassMap, vuv);
    
            float value = clamp((min(originColor.r, meanColor.r - 0.1) - 0.2) * 4.0, 0.0, 1.0);
            float meanValue = (varColor.r + varColor.g + varColor.b) / 3.0;
            float currentIntensity = (1.0 - meanValue / (meanValue + 0.1)) * value * strength;
            vec3 resultColor = mix(originColor.rgb, meanColor.rgb, currentIntensity);
            float sum = 0.25*originColor.g;
            sum += 0.125 *texture2D(map,vec2(vuv.x-uOffsetX, vuv.y)).g;
            sum += 0.125 *texture2D(map,vec2(vuv.x+uOffsetX, vuv.y)).g;
            sum += 0.125 *texture2D(map,vec2(vuv.x, vuv.y-uOffsetY)).g;
            sum += 0.125 *texture2D(map,vec2(vuv.x, vuv.y+uOffsetY)).g;
            sum += 0.0625*texture2D(map,vec2(vuv.x+uOffsetX, vuv.y+uOffsetY)).g;
            sum += 0.0625*texture2D(map,vec2(vuv.x+uOffsetX, vuv.y-uOffsetY)).g;
            sum += 0.0625*texture2D(map,vec2(vuv.x-uOffsetX, vuv.y+uOffsetY)).g;
            sum += 0.0625*texture2D(map,vec2(vuv.x-uOffsetX, vuv.y-uOffsetY)).g;
    
            float hPass = originColor.g - sum + 0.5;
            float flag = step(0.5, hPass);
            vec3 color = mix(max(vec3(0.0), (2.0*hPass + resultColor - 1.0)), min(vec3(1.0), (resultColor + 2.0*hPass - 1.0)), flag);
            
            gl_FragColor = vec4(mix(resultColor.rgb, color.rgb, intensity), 1.0);
        }else{
            gl_FragColor = originColor;
        }
    }`
};
