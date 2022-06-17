import { Texture } from './texture';

/**
 * 根据 uniform 信息生成 uniform 设置函数
 */
function genUniformSetter(
    gl: WebGLRenderingContext,
    location: WebGLUniformLocation | null,
    type: number,
    isArray: boolean,
    size: number,
    textureUnitRef: {
        value: number;
    }
) {
    if (type === gl.FLOAT) {
        return isArray
            ? (value: Float32List) =>
                  gl.uniform1fv(location, value)
            : (value: number) => gl.uniform1f(location, value);
    }
    const floatVecMap = {
        [gl.FLOAT_VEC2]: (value: Float32List) =>
            gl.uniform2fv(location, value),
        [gl.FLOAT_VEC3]: (value: Float32List) =>
            gl.uniform3fv(location, value),
        [gl.FLOAT_VEC4]: (value: Float32List) =>
            gl.uniform4fv(location, value)
    };
    const floatVecFn = floatVecMap[type];
    if (floatVecFn) return floatVecFn;

    if (type === gl.INT || type === gl.BOOL) {
        return isArray
            ? (value: Int32List) =>
                  gl.uniform1iv(location, value)
            : (value: number) => gl.uniform1i(location, value);
    }
    const boolTypeMap = {
        [gl.BOOL_VEC2]: gl.INT_VEC2,
        [gl.BOOL_VEC3]: gl.INT_VEC3,
        [gl.BOOL_VEC4]: gl.INT_VEC4
    };
    const intVecMap = {
        [gl.INT_VEC2]: (value: Int32List) =>
            gl.uniform2iv(location, value),
        [gl.INT_VEC3]: (value: Int32List) =>
            gl.uniform3iv(location, value),
        [gl.INT_VEC4]: (value: Int32List) =>
            gl.uniform4iv(location, value)
    };
    const intVecFn = intVecMap[boolTypeMap[type] ?? type];
    if (intVecFn) return intVecFn;

    const floatMatMap = {
        [gl.FLOAT_MAT2]: (value: Float32List) =>
            gl.uniformMatrix2fv(location, false, value),
        [gl.FLOAT_MAT3]: (value: Float32List) =>
            gl.uniformMatrix3fv(location, false, value),
        [gl.FLOAT_MAT4]: (value: Float32List) =>
            gl.uniformMatrix4fv(location, false, value)
    };
    const floatMatFn = floatMatMap[type];
    if (floatMatFn) return floatMatFn;

    if (type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) {
        const bindPoint =
            type === gl.SAMPLER_2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;
        if (isArray) {
            const units: number[] = [];
            for (let i = 0; i < size; i++) {
                units.push(textureUnitRef.value++);
            }
            return (textures: (Texture | null)[]) => {
                gl.uniform1iv(location, units);
                textures.forEach((texture, index) => {
                    gl.activeTexture(gl.TEXTURE0 + units[index]);
                    gl.bindTexture(bindPoint, texture?.glTexture ?? null);
                });
            };
        } else {
            const unit = textureUnitRef.value++;
            return (texture: Texture | null) => {
                gl.uniform1i(location, unit);
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(bindPoint, texture?.glTexture ?? null);
            };
        }
    }
    return () => {
        console.warn('no matching uniform setter.');
    };
}

export type UniformValueType =
    | number
    | Iterable<number>
    | Int32List
    | Float32List
    | Texture
    | (Texture | null)[]
    | null;

/**
 * 将 program 内部的 uniforms 进行结构化转换，便于访问与修改
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {[uniformObject]}
 */
export function parseUniforms(
    gl: WebGLRenderingContext,
    program: WebGLProgram
) {
    const textureUnitRef = { value: 0 };
    const nums = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const uniforms: {
        [key: string]: {
            type: number;
            size: number;
            value: UniformValueType;
            setter: (value?: UniformValueType) => void | UniformValueType;
        };
    } = {};
    for (let i = 0; i < nums; i++) {
        const uniform = gl.getActiveUniform(program, i);
        if (uniform) {
            const isArray = uniform.size > 1;
            const name = isArray
                ? uniform.name.replace('[0]', '')
                : uniform.name;
            const type = uniform.type;
            const location = gl.getUniformLocation(program, name);
            if (location !== null) {
                const uniformSetter = genUniformSetter(
                    gl,
                    location,
                    type,
                    isArray,
                    uniform.size,
                    textureUnitRef
                );
                uniforms[name] = {
                    type: type,
                    size: uniform.size,
                    value: null,
                    setter: (value) => {
                        if (value !== undefined) {
                            uniforms[name].value = value;
                        } else {
                            uniformSetter(uniforms[name].value as any);
                        }
                    }
                };
            } else {
                console.warn(`uniform:[${name}] is null.`);
            }
        }
    }
    return uniforms;
}
