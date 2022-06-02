export type Texture = {
    glTexture: WebGLTexture | null;
    source: TexImageSource | null;
    opts: {
        isCubeMap?: true;
        flipY?: boolean;
    };
};

export function createTexture(
    gl: WebGLRenderingContext,
    source: TexImageSource | null,
    opts?: {
        isCubeMap?: true;
        flipY?: boolean;
        width?: number;
        height?: number;
    }
) {
    const texture = gl.createTexture();
    if (!texture) {
        console.error(`texture:[${source}] created error.`);
        return null;
    }

    const _opts = { flipY: true, ...opts };

    const textureObj = {
        glTexture: texture,
        source: source,
        refresh() {
            const { source, glTexture, opts } = textureObj;
            const bindPoint = gl.TEXTURE_2D;
            gl.bindTexture(bindPoint, glTexture);
            const { flipY } = opts;
            if (flipY) {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            } else {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            }
            gl.texParameteri(bindPoint, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(bindPoint, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(bindPoint, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(bindPoint, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            if ('width' in opts && 'height' in opts) {
                gl.texImage2D(
                    bindPoint,
                    0,
                    gl.RGB,
                    opts.width!,
                    opts.height!,
                    0,
                    gl.RGB,
                    gl.UNSIGNED_BYTE,
                    source as any
                );
            } else {
                if (source !== null) {
                    gl.texImage2D(
                        bindPoint,
                        0,
                        gl.RGB,
                        gl.RGB,
                        gl.UNSIGNED_BYTE,
                        source as any
                    );
                }
            }
        },
        opts: _opts
    };

    textureObj.refresh();
    return textureObj;
}

export function loadImage(url: string, cb: (img: HTMLImageElement) => void) {
    // const img = new Image();
    // if (new URL(url, window.location.href).origin !== window.location.origin) {
    //     img.crossOrigin = 'Anonymous';
    // }
    // img.onload = () => {
    //     cb(img);
    // };
    // // 不加时间戳会报
    // // No 'Access-Control-Allow-Origin' header is present on the requested resource 错误
    // img.src = url + `?rdn=${Date.now()}`;
    fetch(url + `?rdn=${Date.now()}`)
        .then((response) => {
            return response.arrayBuffer();
        })
        .then((res) => {
            const blob = new Blob([res], { type: 'image/*' });
            const img = new Image();
            if (
                new URL(url, window.location.href).origin !==
                window.location.origin
            ) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                cb(img);
            };
            img.src = URL.createObjectURL(blob);
        })
        .catch((err) => {
            console.log('image load error', err);
        });

}
