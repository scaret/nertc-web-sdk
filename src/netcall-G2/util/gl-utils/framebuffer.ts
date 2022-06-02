import { createTexture } from './texture';

export function createFrameBuffer(
    gl: WebGLRenderingContext,
    width: number,
    height: number
) {
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.error('framebuffer created error.');
        return null;
    }
    const targetTexture = createTexture(gl, null, { width, height });
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
