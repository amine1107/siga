/* ================ Siga Api ================ */

((global => {
  const middleware = [];
  let Siga;
  const modules = {};
  Siga = function() {
    let result;
    let i;
    for (i = 0; i < middleware.length; i++) {
      result = middleware[i].apply(Siga, arguments);
      if (result) {
        return result;
      }
    }
  };

  Siga.VERSION = "0.0.90";
  if (typeof window !== "undefined") {
    Siga.alias = window.__Siga_alias || "S";
    window[Siga.alias] = Siga;
  }

  /**
   * Determine if an object is an `Array`.
   */
  Siga.isArray =
    Array.isArray ||
    (object => !!(object && object.concat && object.unshift && !object.callee));

  /**
   * Convert an `Array`-like collection into an `Array`.
   */
  Siga.toArray = collection => {
    const results = [];
    let i;
    for (i = 0; i < collection.length; i++) {
      results.push(collection[i]);
    }
    return results;
  };

  // This can be overriden by libraries that extend Siga(...)
  Siga.init = fn => {
    middleware.unshift(fn);
  };

  /**
   * Determines if an object is a `Number`.
   */
  Siga.isNumber = object => object === +object || toString.call(object) === "[object Number]";

  /**
   * Binds a function to an object.
   */
  Siga.bind = function(fn, object) {
    const slice = Array.prototype.slice;
    const args = slice.apply(arguments, [2]);
    return function() {
      return fn.apply(object || {}, args.concat(slice.apply(arguments)));
    };
  };

  const testCache = {};
  const detectionTests = {};

  /**
   * Used to add feature-detection methods.
   */
  Siga.addDetectionTest = (name, fn) => {
    if (!detectionTests[name]) {
      detectionTests[name] = fn;
    }
  };

  /**
   * Run a feature detection name.
   */
  Siga.detect = testName => {
    if (typeof testCache[testCache] === "undefined") {
      testCache[testName] = detectionTests[testName]();
    }
    return testCache[testName];
  };

  Siga.define = function(module, dependencies, fn) {
    if (typeof define === "function" && define.amd) {
      define(module, dependencies, fn);
    } else {
      if (dependencies && dependencies.length) {
        for (let i = 0; i < dependencies.length; i++) {
          dependencies[i] = modules[dependencies[i]];
        }
      }
      modules[module] = fn.apply(this, dependencies || []);
    }
  };

  /**
   * Export `Siga` based on environment.
   */
  global.Siga = Siga;

  if (typeof exports !== "undefined") {
    exports.Siga = Siga;
  }

  Siga.define("Siga.core", [], () => Siga);

  if (typeof define === "undefined") {
    global.define = Siga.define;
  }
}))(typeof window === "undefined" ? this : window);