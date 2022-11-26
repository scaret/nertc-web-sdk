/**
 * 判断是否是 2 的 n 次方
 * @param {number} num
 * @returns {boolean}
 */
export function isNthPower(num: number) {
  return num > 0 && (num & (num - 1)) == 0
}

/**
 * 将数字转换为 2 的 n 次方
 * @param {number} num
 * @returns {number}
 */
export function toNthPower(num: number) {
  if (isNthPower(num)) return num
  const nthes = [4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1]
  let diff = Infinity
  for (let i = 0; i < nthes.length; i++) {
    const res = nthes[i]
    const _diff = Math.abs(num - res)
    if (num >= res) {
      if (_diff > diff) {
        return nthes[i - 1]
      } else {
        return res
      }
    }
    diff = _diff
  }
  return 1
}

/**
 * 输出 imagedata 时进行尺寸转换
 */
export function imgDataSize(width: number, height: number, limitSize?: number) {
  limitSize = limitSize ?? Math.min(height)
  if (limitSize) {
    const maxSize = Math.max(width, height)
    if (maxSize > 512) {
      const ratio = maxSize / 512
      return {
        width: (width / ratio) >> 0,
        height: (height / ratio) >> 0
      }
    }
  }
  return { width, height }
}

export type Texture = {
  glTexture: WebGLTexture | null
  source: TexImageSource | null
  opts: {
    isCubeMap?: true
    flipY?: boolean
  }
}

/**
 * 创建 texture 对象
 * @param {WebGLRenderingContext} gl
 * @param {TexImageSource} source
 * @param {Object} opts
 * @param {boolean} opts.isCubeMap 是否是环境贴图
 * @param {boolean} opts.flipY 是否翻转 y 轴
 * @param {number} opts.width 宽度
 * @param {number} opts.height 高度
 * @param {'clamp' | 'repeat' | 'mirror'} opts.wrapS 水平平铺类型
 * @param {'clamp' | 'repeat' | 'mirror'} opts.wrapT 垂直平铺类型
 * @param {boolean} opts.genMipMaps 是否生成 mipmap
 * @returns {TextureObject}
 */
export function createTexture(
  gl: WebGLRenderingContext,
  source: TexImageSource | null,
  opts?: {
    isCubeMap?: true
    flipY?: boolean
    width?: number
    height?: number
    wrapS?: 'clamp' | 'repeat' | 'mirror'
    wrapT?: 'clamp' | 'repeat' | 'mirror'
    genMipMaps?: boolean
  }
) {
  const texture = gl.createTexture()
  if (!texture) {
    console.error(`texture:[${source}] created error.`)
    return null
  }

  const _opts: typeof opts = {
    flipY: true,
    wrapS: 'clamp',
    wrapT: 'clamp',
    genMipMaps: false,
    ...opts
  }

  const wrap = {
    clamp: gl.CLAMP_TO_EDGE,
    repeat: gl.REPEAT,
    mirror: gl.MIRRORED_REPEAT
  }

  const textureObj = {
    glTexture: texture,
    source: source,
    refresh() {
      const { source, glTexture, opts } = textureObj
      const { genMipMaps } = opts
      const bindPoint = gl.TEXTURE_2D
      gl.bindTexture(bindPoint, glTexture)
      const { flipY } = opts
      if (flipY) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      } else {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      }
      gl.texParameteri(bindPoint, gl.TEXTURE_WRAP_S, wrap[opts.wrapS as 'clamp'] as number)
      gl.texParameteri(bindPoint, gl.TEXTURE_WRAP_T, wrap[opts.wrapT as 'clamp'] as number)
      gl.texParameteri(
        bindPoint,
        gl.TEXTURE_MIN_FILTER,
        genMipMaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR
      )
      gl.texParameteri(bindPoint, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      if ('width' in opts && 'height' in opts) {
        gl.texImage2D(
          bindPoint,
          0,
          gl.RGBA,
          opts.width!,
          opts.height!,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source as any
        )
      } else {
        if (source !== null) {
          gl.texImage2D(bindPoint, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as any)
        }
      }
      if (genMipMaps) {
        gl.generateMipmap(bindPoint)
      }
    },
    updateMipMap() {
      const { glTexture, opts } = textureObj
      const { genMipMaps } = opts
      if (!genMipMaps) return
      const bindPoint = gl.TEXTURE_2D
      gl.bindTexture(bindPoint, glTexture)
      gl.generateMipmap(bindPoint)
    },
    clone() {
      return createTexture(gl, textureObj.source, textureObj.opts)
    },
    opts: _opts
  }

  textureObj.refresh()
  return textureObj
}

/**
 * 为了成功加载跨域图片，loadImage 中的 url 参数会追加随机数，会导致本地缓存失效
 * 为了不给用户体验造成影响，在此处构建基于内存的图像缓存空间
 */
const loadedImgs: { [key: string]: HTMLImageElement } = {}
/**
 * 加载图片
 * @param {string} url
 * @param {(img: HTMLImageElement) => void} onSuccess
 * @param {(err: any) => void} onFail
 * @returns {void}
 */
export function loadImage(
  url: string,
  onSuccess?: (img: HTMLImageElement) => void,
  onFail?: (err: any) => void
) {
  if (typeof url !== 'string' || !url) return

  if (loadedImgs[url]) {
    onSuccess?.(loadedImgs[url])
    return
  }

  fetch(url + `?rdn=${Date.now()}`)
    .then((response) => {
      return response.arrayBuffer()
    })
    .then((res) => {
      let loaded = false

      const blob = new Blob([res], { type: 'image/*' })
      const img = new Image()
      if (new URL(url, window.location.href).origin !== window.location.origin) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => {
        if (!loaded) {
          loaded = true
          loadedImgs[url] = img
          onSuccess?.(img)
        }
      }
      img.onerror = (err) => {
        onFail?.(err)
      }
      img.src = URL.createObjectURL(blob)
      // 部分版本 safari 在某些情况下不触发 onload 事件
      setTimeout(() => {
        if (!loaded && img.complete && img.naturalHeight > 0) {
          loaded = true
          loadedImgs[url] = img
          onSuccess?.(img)
        }
      }, 0)
    })
    .catch((err) => {
      onFail?.(err)
    })
}

// 加载图片，且允许失败重试
export function retryLoadImage(
  url: string,
  retries = 3,
  onSuccess?: (img: HTMLImageElement) => void,
  onFail?: (err: any) => void
) {
  let err: any = null
  const load = (retryNum = 0) => {
    retryNum += 1
    if (retryNum <= retries) {
      loadImage(
        url,
        (img) => {
          onSuccess?.(img)
        },
        (_err) => {
          err = _err
          load(retryNum)
        }
      )
    } else {
      onFail?.(err)
    }
  }
  load()
}

// 批量加载图片，且允许失败重试
export function loadImageBatch(
  urls: string[],
  retries = 3,
  onComplete?: (imgs: { [key: string]: HTMLImageElement }, failUrls: string[]) => void
) {
  let imgs: { [key: string]: HTMLImageElement } = {}
  let failUrls: string[] = []

  const checkComplete = () => {
    if (Object.keys(imgs).length + failUrls.length === urls.length) {
      onComplete?.(imgs, failUrls)
    }
  }

  urls.forEach((url) => {
    retryLoadImage(
      url,
      retries,
      (img) => {
        imgs[url] = img
        checkComplete()
      },
      () => {
        failUrls.push(url)
        checkComplete()
      }
    )
  })
}
