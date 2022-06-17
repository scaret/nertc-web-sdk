import { createShader } from './shader';
import { parseUniforms, UniformValueType } from './uniform';
import {
    createAttributeBuffer,
    parseAttributes,
    TypedArray
} from './buffer-attribute';
import { defaultShader } from '../shaders/default-shader.glsl';

export class Program {
    private gl;
    private _program;
    private draw;
    private shaders: {
        VERTEX?: WebGLShader;
        FRAGMENT?: WebGLShader;
    } = {};
    private uniforms: ReturnType<typeof parseUniforms> = {};
    private attributes: ReturnType<typeof parseAttributes> = {};
    private indices: ReturnType<typeof createAttributeBuffer> = null;

    /**
     * @param {WebGLRenderingContext} gl
     * @param {{handler: function, args: handler args}} draw = gl.drawArrays
     */
    constructor(gl: WebGLRenderingContext, draw?: () => void) {
        this.gl = gl;
        this.draw = draw;
        this._program = gl.createProgram();
        // 设置默认 shader，避免编译出错
        this.setShader(defaultShader.vShader, 'VERTEX');
        this.setShader(defaultShader.fShader, 'FRAGMENT');
    }

    /**
     * @returns {WebGLProgram}
     */
    private get program() {
        if (!this._program) {
            console.error('program create error.');
        }
        return this._program!;
    }

    /**
     * 根据当前 shader，将 uniforms 转换为更易于访问与修改的结构
     * shader 编译通过后调用
     */
    private parseUniforms() {
        const uniforms = parseUniforms(this.gl, this.program);
        for (const name in uniforms) {
            if (name in this.uniforms) {
                uniforms[name].setter(this.uniforms[name].value);
            }
        }
        this.uniforms = uniforms;
    }

    /**
     * 根据当前 shader，将 attributes 转换为更易于访问与修改的结构
     * shader 编译通过后调用
     */
    private parseAttributes() {
        const gl = this.gl;
        const attributes = parseAttributes(this.gl, this.program);
        for (const name in this.attributes) {
            const attribute = this.attributes[name];
            if (name in attributes) {
                const curAttribueBuffer = attribute.attributeBuffer;
                if (curAttribueBuffer) {
                    attributes[name].bufferSetter(curAttribueBuffer);
                }
            } else {
                gl.deleteBuffer(attribute.buffer);
            }
        }
        this.attributes = attributes;
    }

    /**
     * 根据 attributes 变量的长度，计算出绘制时所需的点数
     * @returns {number}
     */
    private get count() {
        const attributes = this.attributes;
        let count = -1;
        for (const name in attributes) {
            const attribute = attributes[name];
            if (count !== -1 && count !== attribute.count) {
                console.warn('inconsistent attribute length.');
            }
            count = Math.max(count, attribute.count);
        }
        return count;
    }

    //-------------------------------------------------对外接口-------------------------------------------------
    /**
     * 设置着色器
     * @param {string} source 着色器源代码
     * @param {'VERTEX'|'FRAGMENT'} type 着色器类型
     */
    setShader(source: string, type: 'VERTEX' | 'FRAGMENT') {
        const gl = this.gl;
        const program = this.program;
        const shader = createShader(gl, source, type);
        if (shader) {
            const preShader = this.shaders[type];
            if (preShader) {
                gl.detachShader(program, preShader);
                gl.deleteShader(preShader);
            }
            gl.attachShader(program, shader);
            this.shaders[type] = shader;
            if (this.shaders.VERTEX && this.shaders.FRAGMENT) {
                gl.linkProgram(program);
                this.parseUniforms();
                this.parseAttributes();
            }
        } else if (type === 'VERTEX') {
            this.setShader(defaultShader.vShader, 'VERTEX');
        } else {
            this.setShader(defaultShader.fShader, 'FRAGMENT');
        }
    }

    /**
     * 根据 uniform 名获取 uniform 详细信息
     * @param {string} name
     * @returns {uniformObj}
     */
    getUniform(name: string) {
        const uniform = this.uniforms[name] ?? null;
        if (!uniform) console.warn(`uniform:[${name}] does not exist.`);
        return uniform;
    }

    /**
     * 设置 uniform 值
     * @param {string} name
     * @param {UniformValueType} value
     */
    setUniform(name: string, value: UniformValueType) {
        this.getUniform(name)?.setter(value);
    }

    /**
     * 对 uniform 的当前值进行更新
     * @param {string} name
     * @param {(value: UniformValueType) => void | UniformValueType} updateHandler
     */
    updateUniform(
        name: string,
        updateHandler: (value: UniformValueType) => void | UniformValueType
    ) {
        const uniform = this.getUniform(name);
        //@ts-ignore
        uniform?.setter(updateHandler(uniform.value) ?? uniform.value);
    }

    /**
     * 设置 attribute 的 buffer
     * @param {AttrBuffer} attrBuffer
     */
    setAttributeBuffer(attrBuffer: ReturnType<typeof createAttributeBuffer>) {
        if (attrBuffer) {
            this.getAttribute(attrBuffer.name)?.bufferSetter(attrBuffer);
        }
    }

    /**
     * 获取 attribute
     * @param {string} name
     * @returns {Attribute}
     */
    getAttribute(name: string) {
        const attribute = this.attributes[name];
        if (!attribute) console.warn(`attribute:[${name}] does not exist.`);
        return this.attributes[name];
    }

    /**
     * 设置 Attribute 的数据
     * @param {string} name
     * @param {TypedArray} typedArray
     */
    setAttribute(name: string, typedArray: TypedArray) {
        this.getAttribute(name)?.setter(typedArray);
    }

    /**
     * 对 attribute 的当前值进行更新
     * @param {string} name
     * @param {(typedArray: TypedArray) => void | TypedArray} updateHandler
     */
    updateAttribute(
        name: string,
        updateHandler: (typedArray: TypedArray) => void | TypedArray
    ) {
        const attribute = this.getAttribute(name);
        //@ts-ignore
        attribute?.setter(
            //@ts-ignore
            updateHandler(attribute.typedArray) ?? attribute.typedArray
        );
    }

    setIndices(attrBuffer: ReturnType<typeof createAttributeBuffer>) {
        if (attrBuffer && attrBuffer.name === 'indices') {
            const gl = this.gl;
            gl.bindBuffer(attrBuffer.target, attrBuffer.buffer);
            gl.bufferData(
                attrBuffer.target,
                attrBuffer.typedArray,
                attrBuffer.usage
            );
        }
        this.indices = attrBuffer;
    }

    /**
     * 渲染当前 program
     */
    render() {
        const gl = this.gl;
        const program = this.program;
        gl.useProgram(program);

        const uniforms = this.uniforms;
        for (const name in uniforms) {
            uniforms[name].setter();
        }
        const attributes = this.attributes;
        for (const name in attributes) {
            const attr = attributes[name];
            attr.setter();
        }
        if (this.indices) {
            gl.bindBuffer(this.indices.target, this.indices.buffer);
        }
        if (this.draw) {
            this.draw();
        } else {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
        }
    }

    /**
     * 释放当前 program
     * @param {boolean} clearBuffer=true
     */
    destroy(clearBuffer = true) {
        const gl = this.gl;
        if (clearBuffer) {
            for (const name in this.attributes) {
                const attribute = this.attributes[name];
                if (attribute) {
                    const location = gl.getAttribLocation(this.program, name);
                    gl.disableVertexAttribArray(location);
                    gl.deleteBuffer(attribute.buffer);
                }
            }
            if (this.indices) {
                gl.deleteBuffer(this.indices.buffer);
            }
        }
        gl.deleteShader(this.shaders.VERTEX ?? null);
        gl.deleteShader(this.shaders.FRAGMENT ?? null);
        gl.deleteProgram(this.program);
    }
}
