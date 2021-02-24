// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally. This also holds a reference to known-good
// functions.
var $Array = Array;
var ArrayPrototype = $Array.prototype;
var $Object = Object;
// var ObjectPrototype = $Object.prototype;
var FunctionPrototype = Function.prototype;
// var $String = String;
// var StringPrototype = $String.prototype;
// var $Number = Number;
// var NumberPrototype = $Number.prototype;
var array_slice = ArrayPrototype.slice;
// var array_splice = ArrayPrototype.splice;
// var array_push = ArrayPrototype.push;
// var array_unshift = ArrayPrototype.unshift;
var array_concat = ArrayPrototype.concat;
// var call = FunctionPrototype.call;
var max = Math.max;
// var min = Math.min;

if (!ArrayPrototype.forEach) {
    ArrayPrototype.forEach = function(callbackfn /* , thisArg */) {
        var self = this;
        var length = self.length;
        var T;
        if (arguments.length > 1) {
            T = arguments[1];
        }
        
        for (var i=0; i<length; i++) {
            if (typeof T !== 'undefined') {
                callbackfn.call(T, self[i], i, self);
            } else {
                callbackfn(self[i], i, self);
            }
        }
    };
}

if (!ArrayPrototype.indexOf) {
    ArrayPrototype.indexOf = function(searchElement) {
        var self = this;
        var length = self.length;

        if (length === 0) {
            return -1;
        }

        var i = 0;
        if (arguments.length > 1) {
            i = +arguments[1];
        }

        i = i>=0 ? i : max(0, length+i);
        for (; i<length; i++) {
            if (self[i] === searchElement) {
                return i;
            }
        }
        return -1;
    };
}

if (!ArrayPrototype.map) {
    ArrayPrototype.map = function(callbackfn /* , thisArg */) {
        var self = this;
        var length = self.length;
        var result = $Array(length);
        var T;
        if (arguments.length > 1) {
            T = arguments[1];
        }

        for (var i=0; i<length; i++) {
            if (typeof T !== 'undefined') {
                result[i] = callbackfn.call(T, self[i], i, self);
            } else {
                result[i] = callbackfn(self[i], i, self);
            }
        }
        return result;
    };
}

//
// Function
//

if (!FunctionPrototype.bind) {
    FunctionPrototype.bind = function(that) {
        var target = this;
        var args = array_slice.call(arguments, 1);
        return function() {
            target.apply(that, array_concat.call(args, array_slice.call(arguments)));
        };
    };
}

//
// Object
// 

if (!$Object.keys) {
    $Object.keys = function() {
        var self = this;
        var theKeys = [];
        for (var i in self) {
            if (self.hasOwnProperty(i)) {
                theKeys.push(i);
            }
        }
        return theKeys;
    };
}

if (!$Object.create) {
    $Object.create = function(prototype) {
        var object;
        var Type = function Type() {}; // An empty constructor.

        if (prototype === null) {
            object = {};
        } else {
            Type.prototype = prototype;
            object = new Type();
        }
        
        return object;
    };
}
