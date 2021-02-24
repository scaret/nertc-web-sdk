/**
 * @module WebpackOnBuildPlugin
 */

/**
 * @constructor
 * @param {onBuildCallback} callback - will be called right after build.
 */
function WebpackOnBuildPlugin(callback) {
    this.callback = callback;
  };
  
  /**
   * @callback onBuildCallback
   * @param {object} stats - webpack stats object
   */
  
  /**
   * @param {object} compiler
   */
  WebpackOnBuildPlugin.prototype.apply = function(compiler) {
    // 适配 webpack4 see https://doc.webpack-china.org/api/compiler-hooks/
    compiler.hooks.afterEmit.tap('done', this.callback);
  };
  
  module.exports = WebpackOnBuildPlugin;
  