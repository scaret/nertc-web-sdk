export type TypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | null;

function getTarget(
    gl: WebGLRenderingContext,
    target?: 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER'
) {
    return {
        ARRAY_BUFFER: gl.ARRAY_BUFFER,
        ELEMENT_ARRAY_BUFFER: gl.ELEMENT_ARRAY_BUFFER
    }[target ?? 'ARRAY_BUFFER'];
}

function getUsage(
    gl: WebGLRenderingContext,
    usage?: 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW'
) {
    return {
        STATIC_DRAW: gl.STATIC_DRAW,
        DYNAMIC_DRAW: gl.DYNAMIC_DRAW,
        STREAM_DRAW: gl.STREAM_DRAW
    }[usage ?? 'STATIC_DRAW'];
}

function getAttrDataType(gl: WebGLRenderingContext, typedArray: TypedArray) {
    const DataType = {
        Int8Array: gl.BYTE,
        Uint8Array: gl.UNSIGNED_BYTE,
        Int16Array: gl.SHORT,
        Uint16Array: gl.UNSIGNED_SHORT,
        Int32Array: gl.INT,
        Uint32Array: gl.UNSIGNED_INT,
        Float32Array: gl.FLOAT
    };

    const typeStr = Object.prototype.toString
        .call(typedArray)
        .replace(/object|\[|\]|\s/g, '');

    const type = (<{ [index: string]: number }>DataType)[typeStr];

    if (type === undefined) {
        console.warn(
            'attribute buffer type error.\n legal type may << Int8Array、Uint8Array、Int16Array、Uint16Array、Float32Array.'
        );
        return gl.FLOAT;
    }

    return type;
}

/**
 * 创建 AttributeBuffer， 用以为着色器对应属性赋值
 * @param {WebGLRenderingContext} gl
 * @param {string} name attribute属性名
 * @param {TypedArray} typedArray attribute数据
 * @param {number} itemSize 每个 attribute 包含的数据长度
 * @param {'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER'} target
 * @param {'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW'} usage
 * @param {boolean} normalized
 * @param {number} stride
 * @param {number} offset
 * @returns {attributeBufferObject}
 */
export function createAttributeBuffer(
    gl: WebGLRenderingContext,
    name: string | 'indices',
    typedArray: TypedArray,
    itemSize?: number,
    target?: 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER',
    usage?: 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW',
    normalized?: boolean,
    stride?: number,
    offset?: number
) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('buffer created failed.');
        return null;
    }
    const length = (typedArray as unknown as { length: number }).length;

    return {
        type: getAttrDataType(gl, typedArray),
        buffer: buffer,
        name: name,
        typedArray: typedArray,
        itemSize: itemSize ?? 1,
        count: (length / (itemSize ?? 1)) >> 0,
        normalized: normalized ?? false,
        target: getTarget(gl, target),
        usage: getUsage(gl, usage),
        stride: stride ?? 0,
        offset: offset ?? 0
    };
}

/**
 * 将 program 内部的 attributes 进行结构化转换，便于访问与修改
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {[attributeObject]}
 */
export function parseAttributes(
    gl: WebGLRenderingContext,
    program: WebGLProgram
) {
    const nums = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    const attributes: {
        [key: string]: {
            type: number;
            buffer: WebGLBuffer | null;
            typedArray: TypedArray | null;
            itemSize: number;
            count: number;
            normalized: boolean;
            target: number;
            usage: number;
            stride: number;
            offset: number;
            setter: (typedArray?: TypedArray) => void;
            bufferSetter: (
                attrBuffer: ReturnType<typeof createAttributeBuffer>
            ) => void;
            attributeBuffer: ReturnType<typeof createAttributeBuffer>;
        };
    } = {};
    for (let i = 0; i < nums; i++) {
        const attribute = gl.getActiveAttrib(program, i);
        if (attribute) {
            const { name } = attribute;
            const location = gl.getAttribLocation(program, name);
            if (location !== null) {
                const attri: typeof attributes[string] = {
                    type: gl.FLOAT,
                    buffer: null,
                    typedArray: null,
                    itemSize: 1,
                    count: 0,
                    normalized: false,
                    target: getTarget(gl),
                    usage: getUsage(gl),
                    stride: 0,
                    offset: 0,
                    setter: (typedArray?: TypedArray) => {
                        if (typedArray) {
                            const { buffer } = attri;
                            if (!buffer) {
                                console.error(
                                    `buffer of attribute:[${name}] is not initialized.`
                                );
                                return;
                            }
                            const { type } = attri;
                            if (getAttrDataType(gl, typedArray) !== type) {
                                console.error(
                                    `typedArray's type of attribute:[${name}] is inconsistent.`
                                );
                                return;
                            }
                            attri.typedArray = typedArray;
                            const {
                                itemSize,
                                normalized,
                                target,
                                usage,
                                stride,
                                offset
                            } = attri;
                            gl.bindBuffer(target, buffer);
                            gl.bufferData(target, typedArray, usage);
                            gl.enableVertexAttribArray(location);
                            gl.vertexAttribPointer(
                                location,
                                itemSize,
                                type,
                                normalized,
                                stride,
                                offset
                            );
                        } else {
                            const {
                                buffer,
                                type,
                                itemSize,
                                normalized,
                                target,
                                stride,
                                offset
                            } = attri;
                            gl.bindBuffer(target, buffer);
                            gl.vertexAttribPointer(
                                location,
                                itemSize,
                                type,
                                normalized,
                                stride,
                                offset
                            );
                        }
                    },
                    bufferSetter: (attrBuffer) => {
                        if (attrBuffer) {
                            const { name: _name } = attrBuffer;
                            if (_name === name) {
                                attri.type = attrBuffer.type;
                                attri.buffer = attrBuffer.buffer;
                                attri.itemSize = attrBuffer.itemSize;
                                attri.count = attrBuffer.count;
                                attri.normalized = attrBuffer.normalized;
                                attri.target = attrBuffer.target;
                                attri.usage = attrBuffer.usage;
                                attri.stride = attrBuffer.stride;
                                attri.offset = attrBuffer.offset;
                                attri.setter(attrBuffer.typedArray);
                            }
                        }
                    },
                    get attributeBuffer() {
                        if (attri.buffer === null) return null;
                        return {
                            type: attri.type,
                            buffer: attri.buffer,
                            name: name,
                            typedArray: attri.typedArray,
                            itemSize: attri.itemSize,
                            count: attri.count,
                            normalized: attri.normalized,
                            target: attri.target,
                            usage: attri.usage,
                            stride: attri.stride,
                            offset: attri.offset
                        };
                    }
                };
                attributes[name] = attri;
            } else {
                console.warn(`attribute:[${name}] is null.`);
            }
        }
    }
    return attributes;
}
