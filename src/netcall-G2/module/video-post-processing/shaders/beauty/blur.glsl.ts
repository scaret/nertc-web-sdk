export const beautyBlurShader = {
  vShader: `
    uniform vec2 size;
    uniform float isVertical;

    attribute vec4 position;
    attribute vec2 uv;

    varying vec2 vuv;
    varying vec4 vTextureShift1;
	varying vec4 vTextureShift2;
	varying vec4 vTextureShift3;
	varying vec4 vTextureShift4;

    void main() {
        gl_Position = position;
        vuv = uv;
        // 偏移步距
        vec2 stepOffset = 1.0 / size;
        if(isVertical> 0.5){
            stepOffset.x = 0.0;
        }else{
            stepOffset.y = 0.0;
        }

        vTextureShift1 = vec4(uv - stepOffset, uv + stepOffset);
		vTextureShift2 = vec4(uv- 2.0 * stepOffset, uv + 2.0 * stepOffset);
		vTextureShift3 = vec4(uv - 3.0 * stepOffset, uv + 3.0 * stepOffset);
		vTextureShift4 = vec4(uv - 4.0 * stepOffset, uv + 4.0 * stepOffset);
    }
`,
  fShader: `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
    #else
        precision mediump float;
    #endif

    uniform sampler2D map;

    varying vec2 vuv;
    varying vec4 vTextureShift1;
	varying vec4 vTextureShift2;
	varying vec4 vTextureShift3;
	varying vec4 vTextureShift4;

    void main() {
        vec4 color = texture2D(map, vuv);

        vec3 sum = color.rgb;
        sum += texture2D(map, vTextureShift1.xy).rgb;
		sum += texture2D(map, vTextureShift1.zw).rgb;
		sum += texture2D(map, vTextureShift2.xy).rgb;
		sum += texture2D(map, vTextureShift2.zw).rgb;
		sum += texture2D(map, vTextureShift3.xy).rgb;
		sum += texture2D(map, vTextureShift3.zw).rgb;
		sum += texture2D(map, vTextureShift4.xy).rgb;
		sum += texture2D(map, vTextureShift4.zw).rgb;

        gl_FragColor = vec4(sum * 0.1111, 1.0);
    }
`
}
