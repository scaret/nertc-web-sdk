const jsdoc = require('gulp-jsdoc3')
const gulp = require('gulp')

const configure = {
  tags: {
    allowUnknownTags: true
  },
  opts: {
    destination: './dist/api/'
  },
  plugins: ['plugins/markdown'],
  templates: {
    cleverLinks: true,
    monospaceLinks: true,
    default: {
      outputSourceFiles: false,
      layoutFile: './external/jaguarjs-jsdoc/layout.tmpl'
    },

    // docstrap: true,
    // dateFormat: 'YYYY-MM-DD dddd',
    // outputSourceFiles: false,
    // outputSourcePath: false,
    // systemName: '云信 Web SDK',
    // footer: '',
    // copyright:
    //   "<div style='margin:0;padding:0;text-align:center;'>Copyright&nbsp;&copy;&nbsp;1997-2015&nbsp;&nbsp;NetEase. All Rights Reserved</div>",
    // navType: 'vertical',
    theme: 'Flatly',
    // linenums: false,
    // collapseSymbols: false,
    // inverseNav: true,
    // highlightTutorialCode: true,
    // protocol: 'fred://',

    jaguarjs: true,
    applicationName: '云信Web SDK API文档',
    disqus: '',
    googleAnalytics: '',
    openGraph: {
      title: '',
      type: 'website',
      image: '',
      site_name: '',
      url: ''
    },
    meta: {
      title: '云信Web SDK API文档',
      description: '云信Web SDK API文档',
      keyword: '云信Web SDK API文档'
    },
    linenums: false
  },
  markdown: {
    parser: 'gfm',
    hardwrap: true,
    tags: ['examples']
  }
}

const config = {
  tags: {
    allowUnknownTags: true
  },
  opts: {
    destination: './dist/api/'
  },
  plugins: ['plugins/markdown'],
  templates: {
    cleverLinks: false,
    monospaceLinks: false,
    default: {
      outputSourceFiles: true
    },
    path: 'ink-docstrap',
    theme: 'cerulean',
    navType: 'vertical',
    linenums: true,
    dateFormat: 'MMMM Do YYYY, h:mm:ss a'
  }
}

const src = require('./build/api/jsdocSrc')

gulp.task('default', function (cb) {
  gulp.src(src, { read: false }).pipe(jsdoc(configure, cb))

  //   gulp.src(src).pipe(jsdoc('./dist/api/'))
})
