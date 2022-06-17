import { createTexture } from './texture';

/**
 * 创建 framebuffer，用以实现多 pass 渲染
 * @param {WebGLRenderingContext} gl
 * @param {number} width buffer宽度
 * @param {number} height buffer高度
 * @param {boolean} genMipMaps 是否生成 mipmap
 * @returns {framebufferObject | null}
 */
export function createFrameBuffer(
    gl: WebGLRenderingContext,
    width: number,
    height: number,
    genMipMaps?: boolean
) {
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.error('framebuffer created error.');
        return null;
    }
    const targetTexture = createTexture(gl, null, {
        width,
        height,
        genMipMaps: genMipMaps ?? false
    });
    if (targetTexture) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            targetTexture.glTexture,
            0
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {
            framebuffer,
            targetTexture,
            bind: (toCanvas?: true) => {
                if (toCanvas) {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                } else {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                }
            }
        };
    } else {
        return null;
    }
}
