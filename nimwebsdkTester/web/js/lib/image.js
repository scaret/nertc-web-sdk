
function genImageOptions (id) {
  var options = {}
  id = id || 'imageUrl'
  var url = $('#' + id).val()
  if (url) { options.url = url }
  if (url === "''") { options.url = '' }
  return options
}

function initImageEvent () {
    $('#viewImageSync').on('click', function () {
      var $parent = $(this).parent()
      var options = genImageOptions('imageMetaUrl')

      var strip = $parent.find('.strip').prop('checked')
      options.strip = strip

      var qualityEnable = $parent.find('.qualityEnable').prop('checked')
      if (qualityEnable) {
        var quality = $parent.find('.quality').val()
        if (quality) {
          options.quality = parseFloat(quality)
        }
      }

      var interlace = $parent.find('.interlace').prop('checked')
      options.interlace = interlace

      var rotate = $parent.find('.rotate').val()
      if (rotate) {
        options.rotate = parseFloat(rotate)
      }

      var thumbnailEnable = $parent.find('.thumbnailEnable').prop('checked')
      if (thumbnailEnable) {
        var width = $parent.find('.width').val()
        var height = $parent.find('.height').val()
        var mode = $parent.find('.mode').val()
        options.thumbnail = {
          width: parseInt(width),
          height: parseInt(height),
          mode: mode
        }
      }

      $parent.find('.url').attr({
        href: nim.viewImageSync(options)
      });
    })
    $('#viewImageStripMeta').on('click', function () {
      var $parent = $(this).parent()
      var options = genImageOptions('imageMetaUrl')
      var strip = $parent.find('.strip').prop('checked')
      options.strip = strip
      $parent.find('.url').attr({
          href: nim.viewImageStripMeta(options)
      });
    })
    $('#viewImageQuality').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        var quality = $parent.find('.quality').val();
        if (!!quality) { options.quality = quality; }
        if (quality === "''") { options.quality = ''; }
        if (!!options.quality) { options.quality = +options.quality; }
        $parent.find('.url').attr({
            href: nim.viewImageQuality(options)
        });
    });
    $('#viewImageInterlace').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        $parent.find('.url').attr({
            href: nim.viewImageInterlace(options)
        });
    });
    $('#viewImageRotate').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        var angle = $parent.find('.angle').val();
        if (!!angle) { options.angle = angle; }
        if (angle === "''") { options.angle = ''; }
        if (!!options.angle) { options.angle = +options.angle; }
        $parent.find('.url').attr({
            href: nim.viewImageRotate(options)
        });
    });
    $('#viewImageBlur').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        var radius = $parent.find('.radius').val();
        if (!!radius) { options.radius = radius; }
        if (radius === "''") { options.radius = ''; }
        if (!!options.radius) { options.radius = +options.radius; }
        var sigma = $parent.find('.sigma').val();
        if (!!sigma) { options.sigma = sigma; }
        if (sigma === "''") { options.sigma = ''; }
        if (!!options.sigma) { options.sigma = +options.sigma; }
        $parent.find('.url').attr({
            href: nim.viewImageBlur(options)
        });
    });
    $('#viewImageCrop').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        var x = $parent.find('.x').val();
        if (!!x) { options.x = x; }
        if (x === "''") { options.x = ''; }
        if (!!options.x) { options.x = +options.x; }
        var y = $parent.find('.y').val();
        if (!!y) { options.y = y; }
        if (y === "''") { options.y = ''; }
        if (!!options.y) { options.y = +options.y; }
        var width = $parent.find('.width').val();
        if (!!width) { options.width = width; }
        if (width === "''") { options.width = ''; }
        if (!!options.width) { options.width = +options.width; }
        var height = $parent.find('.height').val();
        if (!!height) { options.height = height; }
        if (height === "''") { options.height = ''; }
        if (!!options.height) { options.height = +options.height; }
        $parent.find('.url').attr({
            href: nim.viewImageCrop(options)
        });
    });
    $('#viewImageThumbnail').on('click', function() {
        var $parent = $(this).parent()
        var options = genImageOptions();
        var mode = $parent.find('.mode').val();
        if (!!mode) { options.mode = mode; }
        if (mode === "''") { options.mode = ''; }
        var width = $parent.find('.width').val();
        if (!!width) { options.width = width; }
        if (width === "''") { options.width = ''; }
        if (!!options.width) { options.width = +options.width; }
        var height = $parent.find('.height').val();
        if (!!height) { options.height = height; }
        if (height === "''") { options.height = ''; }
        if (!!options.height) { options.height = +options.height; }
        options.axis = {};
        var x = $parent.find('.axisX').val();
        if (!!x) { options.axis.x = x; }
        if (x === "''") { options.axis.x = ''; }
        if (!!options.axis.x) { options.axis.x = +options.axis.x; }
        var y = $parent.find('.axisY').val();
        if (!!y) { options.axis.y = y; }
        if (y === "''") { options.axis.y = ''; }
        if (!!options.axis.y) { options.axis.y = +options.axis.y; }
        var enlarge = $parent.find('.enlarge').prop('checked');
        if (enlarge) {
            options.enlarge = true;
        }
        $parent.find('.url').attr({
            href: nim.viewImageThumbnail(options)
        });
    });
  $('#stripImageMeta').on('click', function () {
    var $parent = $(this).parent()
    var options = genImageOptions('imageMetaUrl')
    var strip = $parent.find('.strip').prop('checked')
    options.strip = strip
    options.done = function (error, obj) {
      console.log('去除图片元信息' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#stripImageMetaUrl').attr({
          href: obj.url
        })
      }
    }
    nim.stripImageMeta(options)
  })
  $('#qualityImage').on('click', function () {
    var options = genImageOptions()
    var quality = $('#imageQuality').val()
    if (quality) { options.quality = quality }
    if (quality === "''") { options.quality = '' }
    if (options.quality) { options.quality = +options.quality }
    options.done = function (error, obj) {
      console.log('修改图片质量' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#qualityUrl').attr({
          href: obj.url
        })
      }
    }
    nim.qualityImage(options)
  })
  $('#processImageQuality').on('click', function () {
    var options = genImageOptions()
    var quality = $('#imageQuality').val()
    if (quality === "''") { quality = '' }
    if (quality) { quality = +quality }
    options.ops = [
      {
        type: 'quality',
        quality: quality
      }
    ]
    options.done = function (error, obj) {
      console.log('修改图片质量' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#qualityUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#interlaceImage').on('click', function () {
    var options = genImageOptions()
    options.done = function (error, obj) {
      console.log('interlace 图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#interlaceUrl').attr({
          href: obj.url
        })
      }
    }
    nim.interlaceImage(options)
  })
  $('#processImageInterlace').on('click', function () {
    var options = genImageOptions()
    options.ops = [
      {
        type: 'interlace'
      }
    ]
    options.done = function (error, obj) {
      console.log('interlace 图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#interlaceUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#rotateImage').on('click', function () {
    var options = genImageOptions()
    var angle = $('#imageRotateAngle').val()
    if (angle) { options.angle = angle }
    if (angle === "''") { options.angle = '' }
    if (options.angle) { options.angle = +options.angle }
    options.done = function (error, obj) {
      console.log('旋转图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#rotateUrl').attr({
          href: obj.url
        })
      }
    }
    nim.rotateImage(options)
  })
  $('#processImageRotate').on('click', function () {
    var options = genImageOptions()
    var angle = $('#imageRotateAngle').val()
    if (angle === "''") { angle = '' }
    if (angle) { angle = +angle }
    options.ops = [
      {
        type: 'rotate',
        angle: angle
      }
    ]
    options.done = function (error, obj) {
      console.log('旋转图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#rotateUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#blurImage').on('click', function () {
    var options = genImageOptions()
    var radius = $('#imageBlurRadius').val()
    if (radius) { options.radius = radius }
    if (radius === "''") { options.radius = '' }
    if (options.radius) { options.radius = +options.radius }
    var sigma = $('#imageBlurSigma').val()
    if (sigma) { options.sigma = sigma }
    if (sigma === "''") { options.sigma = '' }
    if (options.sigma) { options.sigma = +options.sigma }
    options.done = function (error, obj) {
      console.log('高斯模糊图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#blurUrl').attr({
          href: obj.url
        })
      }
    }
    nim.blurImage(options)
  })
  $('#processImageBlur').on('click', function () {
    var options = genImageOptions()
    var radius = $('#imageBlurRadius').val()
    if (radius === "''") { radius = '' }
    if (radius) { radius = +radius }
    var sigma = $('#imageBlurSigma').val()
    if (sigma === "''") { sigma = '' }
    if (sigma) { sigma = +sigma }
    options.ops = [
      {
        type: 'blur',
        radius: radius,
        sigma: sigma
      }
    ]
    options.done = function (error, obj) {
      console.log('高斯模糊图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#blurUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#cropImage').on('click', function () {
    var options = genImageOptions()
    var x = $('#imageCropX').val()
    if (x) { options.x = x }
    if (x === "''") { options.x = '' }
    if (options.x) { options.x = +options.x }
    var y = $('#imageCropY').val()
    if (y) { options.y = y }
    if (y === "''") { options.y = '' }
    if (options.y) { options.y = +options.y }
    var width = $('#imageCropWidth').val()
    if (width) { options.width = width }
    if (width === "''") { options.width = '' }
    if (options.width) { options.width = +options.width }
    var height = $('#imageCropHeight').val()
    if (height) { options.height = height }
    if (height === "''") { options.height = '' }
    if (options.height) { options.height = +options.height }
    options.done = function (error, obj) {
      console.log('裁剪图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#cropUrl').attr({
          href: obj.url
        })
      }
    }
    nim.cropImage(options)
  })
  $('#processImageCrop').on('click', function () {
    var options = genImageOptions()
    var x = $('#imageCropX').val()
    if (x === "''") { x = '' }
    if (x) { x = +x }
    var y = $('#imageCropY').val()
    if (y === "''") { y = '' }
    if (y) { y = +y }
    var width = $('#imageCropWidth').val()
    if (width === "''") { width = '' }
    if (width) { width = +width }
    var height = $('#imageCropHeight').val()
    if (height === "''") { height = '' }
    if (height) { height = +height }
    options.ops = [
      {
        type: 'crop',
        x: x,
        y: y,
        width: width,
        height: height
      }
    ]
    options.done = function (error, obj) {
      console.log('裁剪图片' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#cropUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#thumbnailImage').on('click', function () {
    var options = genImageOptions()
    var mode = $('#imageThumbnailMode').val()
    if (mode) { options.mode = mode }
    if (mode === "''") { options.mode = '' }
    var width = $('#imageThumbnailWidth').val()
    if (width) { options.width = width }
    if (width === "''") { options.width = '' }
    if (options.width) { options.width = +options.width }
    var height = $('#imageThumbnailHeight').val()
    if (height) { options.height = height }
    if (height === "''") { options.height = '' }
    if (options.height) { options.height = +options.height }
    options.axis = {}
    var x = $('#imageThumbnailAxisX').val()
    if (x) { options.axis.x = x }
    if (x === "''") { options.axis.x = '' }
    if (options.axis.x) { options.axis.x = +options.axis.x }
    var y = $('#imageThumbnailAxisY').val()
    if (y) { options.axis.y = y }
    if (y === "''") { options.axis.y = '' }
    if (options.axis.y) { options.axis.y = +options.axis.y }
    var enlarge = $('#imageThumbnailEnlarge').prop('checked')
    if (enlarge) {
      options.enlarge = true
    }
    options.done = function (error, obj) {
      console.log('生成缩略图' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#thumbnailUrl').attr({
          href: obj.url
        })
      }
    }
    nim.thumbnailImage(options)
  })
  $('#processImageThumbnail').on('click', function () {
    var options = genImageOptions()
    var mode = $('#imageThumbnailMode').val()
    if (mode === "''") { mode = '' }
    var width = $('#imageThumbnailWidth').val()
    if (width === "''") { width = '' }
    if (width) { width = +width }
    var height = $('#imageThumbnailHeight').val()
    if (height === "''") { height = '' }
    if (height) { height = +height }
    var axis = {}
    var x = $('#imageThumbnailAxisX').val()
    if (x) { axis.x = x }
    if (x === "''") { axis.x = '' }
    if (axis.x) { axis.x = +axis.x }
    var y = $('#imageThumbnailAxisY').val()
    if (y) { axis.y = y }
    if (y === "''") { axis.y = '' }
    if (axis.y) { axis.y = +axis.y }
    var enlarge = $('#imageThumbnailEnlarge').prop('checked')
    options.ops = [
      {
        type: 'thumbnail',
        mode: mode,
        width: width,
        height: height,
        axis: axis,
        enlarge: enlarge
      }
    ]
    options.done = function (error, obj) {
      console.log('生成缩略图' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#thumbnailUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
  $('#processImageCropThumbnail').on('click', function () {
    var options = genImageOptions()

    var x = $('#imageCropX').val()
    if (x === "''") { x = '' }
    if (x) { x = +x }
    var y = $('#imageCropY').val()
    if (y === "''") { y = '' }
    if (y) { y = +y }
    var width = $('#imageCropWidth').val()
    if (width === "''") { width = '' }
    if (width) { width = +width }
    var height = $('#imageCropHeight').val()
    if (height === "''") { height = '' }
    if (height) { height = +height }
    var op1 = {
      type: 'crop',
      x: x,
      y: y,
      width: width,
      height: height
    }

    var mode = $('#imageThumbnailMode').val()
    if (mode === "''") { mode = '' }
    width = $('#imageThumbnailWidth').val()
    if (width === "''") { width = '' }
    if (width) { width = +width }
    height = $('#imageThumbnailHeight').val()
    if (height === "''") { height = '' }
    if (height) { height = +height }
    var axis = {}
    x = $('#imageThumbnailAxisX').val()
    if (x) { axis.x = x }
    if (x === "''") { axis.x = '' }
    if (axis.x) { axis.x = +axis.x }
    y = $('#imageThumbnailAxisY').val()
    if (y) { axis.y = y }
    if (y === "''") { axis.y = '' }
    if (axis.y) { axis.y = +axis.y }
    var enlarge = $('#imageThumbnailEnlarge').prop('checked')
    var op2 = {
      type: 'thumbnail',
      mode: mode,
      width: width,
      height: height,
      axis: axis,
      enlarge: enlarge
    }

    options.ops = [op1, op2]
    options.done = function (error, obj) {
      console.log('生成裁剪缩略图' + (!error ? '成功' : '失败'), error, obj)
      if (!error) {
        $('#cropThumbnailUrl').attr({
          href: obj.url
        })
      }
    }
    nim.processImage(options)
  })
}
