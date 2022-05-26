//@ts-nocheck
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

    constructor(
        gl: WebGLRenderingContext,
        draw?:
            | {
                  handler: typeof gl.drawArrays;
                  args: Parameters<typeof gl.drawArrays>;
              }
            | {
                  handler: typeof gl.drawElements;
                  args: Parameters<typeof gl.drawElements>;
              }
    ) {
        this.gl = gl;
        this.draw = draw;
        this._program = gl.createProgram();
        this.setShader(defaultShader.vShader, 'VERTEX');
        this.setShader(defaultShader.fShader, 'FRAGMENT');
    }

    private get program() {
        if (!this._program) {
            console.error('program create error.');
        }
        return this._program!;
    }

    private parseUniforms() {
        const uniforms = parseUniforms(this.gl, this.program);
        for (const name in uniforms) {
            if (name in this.uniforms) {
                uniforms[name].setter(this.uniforms[name].value);
            }
        }
        this.uniforms = uniforms;
    }

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

    getUniform(name: string) {
        const uniform = this.uniforms[name] ?? null;
        if (!uniform) console.warn(`uniform:[${name}] does not exist.`);
        return uniform;
    }

    setUniform(name: string, value: UniformValueType) {
        this.getUniform(name)?.setter(value);
    }

    updateUniform(
        name: string,
        updateHandler: (value: UniformValueType) => void | UniformValueType
    ) {
        const uniform = this.getUniform(name);
        uniform?.setter(updateHandler(uniform.value) ?? uniform.value);
    }

    setAttributeBuffer(attrBuffer: ReturnType<typeof createAttributeBuffer>) {
        if (attrBuffer) {
            this.getAttribute(attrBuffer.name)?.bufferSetter(attrBuffer);
        }
    }

    getAttribute(name: string) {
        const attribute = this.attributes[name];
        if (!attribute) console.warn(`attribute:[${name}] does not exist.`);
        return this.attributes[name];
    }

    setAttribute(name: string, typedArray: TypedArray) {
        this.getAttribute(name)?.setter(typedArray);
    }

    updateAttribute(
        name: string,
        updateHandler: (typedArray: TypedArray) => void | TypedArray
    ) {
        const attribute = this.getAttribute(name);
        attribute?.setter(
            updateHandler(attribute.typedArray) ?? attribute.typedArray
        );
    }

    render() {
        const gl = this.gl;
        const program = this.program;
        gl.useProgram(program);

        const uniforms = this.uniforms;
        for (const name in uniforms) {
            uniforms[name].setter();
        }

        if (this.draw) {
            this.draw.handler(
                ...(this.draw.args as [number, number, number, number])
            );
        } else {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
        }
    }

    destroy() {
        const gl = this.gl;
        for (const name in this.attributes) {
            const attribute = this.attributes[name];
            if (attribute) {
                gl.deleteBuffer(attribute.buffer);
            }
        }
        gl.deleteShader(this.shaders.VERTEX ?? null);
        gl.deleteShader(this.shaders.FRAGMENT ?? null);
        gl.deleteProgram(this.program);
    }

}
