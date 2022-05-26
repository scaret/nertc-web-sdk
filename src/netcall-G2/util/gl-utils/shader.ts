export function createShader(
    gl: WebGLRenderingContext,
    source: string,
    type: 'VERTEX' | 'FRAGMENT'
) {
    const shader = gl.createShader(
        {
            VERTEX: gl.VERTEX_SHADER,
            FRAGMENT: gl.FRAGMENT_SHADER
        }[type]
    );
    if (!shader) {
        console.error(`${type}Shader was not created successfully.`);
        return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    const sourceArray = source.split('\n');
    const sourceDebug = sourceArray
        .map((src, idx) => `${idx + 1}${src}`)
        .join('\n');
    console.error(
        `${gl.getShaderInfoLog(
            shader
        )}\n%cshader source code\n${sourceDebug}\n`,
        'color: #008040'
    );
    gl.deleteShader(shader);

    return null;
}
