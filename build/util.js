var prettyjson = require('prettyjson');
var util = {};

util.throwerr = function(err) {
    if (err) {
        throw err;
    }
};

util.log = function(obj) {
    if (typeof obj === 'string') {
        if (obj.length > 100) {
            return;
        }
        obj = [obj];
    }
    console.log(prettyjson.render(obj));
};

module.exports = util;