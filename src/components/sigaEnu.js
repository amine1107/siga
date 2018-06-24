/* ================ Siga Enumerable ================ */

define("Siga.enumerable", ["Siga.core"], Siga => {
  function EnumerableModule(global) {
    global.enumerable = {
      /**
       * Throw to break out of iterators.
       */
      Break: {},

      /**
       * Iterates using a function over a set of items.  Example:
       */
      each(enumerable, callback, context) {
        try {
          if (
            Array.prototype.forEach &&
            enumerable.forEach === Array.prototype.forEach
          ) {
            enumerable.forEach(callback, context);
          } else if (global.isNumber(enumerable.length)) {
            for (let i = 0, l = enumerable.length; i < l; i++)
              callback.call(enumerable, enumerable[i], i, enumerable);
          } else {
            for (const key in enumerable) {
              if (hasOwnProperty.call(enumerable, key))
                callback.call(context, enumerable[key], key, enumerable);
            }
          }
        } catch (e) {
          if (e != global.enumerable.Break) throw e;
        }

        return enumerable;
      },

      /**
       * Changes a set of item using a function. Example:
       */
      map(enumerable, callback, context) {
        if (Array.prototype.map && enumerable.map === Array.prototype.map)
          return enumerable.map(callback, context);
        const results = [];
        global.enumerable.each(enumerable, (value, index, list) => {
          results.push(callback.call(context, value, index, list));
        });
        return results;
      },

      /**
       * Removes items based on a callback.  For example:
       */
      filter(enumerable, callback, context) {
        if (
          Array.prototype.filter &&
          enumerable.filter === Array.prototype.filter
        )
          return enumerable.filter(callback, context);
        const results = [];
        const pushIndex = !global.isArray(enumerable);
        global.enumerable.each(enumerable, (value, index, list) => {
          if (callback.call(context, value, index, list)) {
            if (pushIndex) {
              results.push([index, value]);
            } else {
              results.push(value);
            }
          }
        });
        return results;
      },

      /**
       * The opposite of filter.  For example:
       */
      reject(enumerable, callback, context) {
        return this.filter(
          enumerable,
          function() {
            return !callback.apply(context, arguments);
          },
          context
        );
      },

      /**
       * Find a single item.  For example:
       */
      detect(enumerable, callback, context) {
        let result;
        global.enumerable.each(enumerable, (value, index, list) => {
          if (callback.call(context, value, index, list)) {
            result = value;
            throw global.enumerable.Break;
          }
        });
        return result;
      },

      /**
       * Runs a function over each item, collecting the results:
       */
      reduce(enumerable, memo, callback, context) {
        if (
          Array.prototype.reduce &&
          enumerable.reduce === Array.prototype.reduce
        )
          return enumerable.reduce(global.bind(callback, context), memo);
        global.enumerable.each(enumerable, (value, index, list) => {
          memo = callback.call(context, memo, value, index, list);
        });
        return memo;
      },

      /**
       * Flattens multidimensional arrays:
       */
      flatten(array) {
        return global.enumerable.reduce(array, [], (memo, value) => {
          if (global.isArray(value))
            return memo.concat(global.enumerable.flatten(value));
          memo.push(value);
          return memo;
        });
      },

      /**
       * Return the last items from a list:
       */
      tail(enumerable, start=1) {
        return Array.prototype.slice.apply(enumerable, [start]);
      },

      /**
       * Invokes `method` on a list of items:
       */
      invoke(enumerable, method) {
        const args = global.enumerable.tail(arguments, 2);
        return global.enumerable.map(enumerable, value => (method ? value[method] : value).apply(value, args));
      },

      /**
       * Pluck a property from each item of a list:
       */
      pluck(enumerable, key) {
        return global.enumerable.map(enumerable, value => value[key]);
      },

      /**
       * Determines if a list matches some items based on a callback:
       */
      some(enumerable, callback=global.enumerable.identity, context) {
        if (Array.prototype.some && enumerable.some === Array.prototype.some)
          return enumerable.some(callback, context);
        let result = false;
        global.enumerable.each(enumerable, (value, index, list) => {
          if ((result = callback.call(context, value, index, list))) {
            throw global.enumerable.Break;
          }
        });
        return result;
      },

      /**
       * Checks if all items match the callback:
       */
      all(enumerable, callback=global.enumerable.identity, context) {
        if (Array.prototype.every && enumerable.every === Array.prototype.every)
          return enumerable.every(callback, context);
        let result = true;
        global.enumerable.each(enumerable, (value, index, list) => {
          if (
            !(result = result && callback.call(context, value, index, list))
          ) {
            throw global.enumerable.Break;
          }
        });
        return result;
      },

      /**
       * Checks if one item matches a value:
       */
      include(enumerable, target) {
        if (
          Array.prototype.indexOf &&
          enumerable.indexOf === Array.prototype.indexOf
        )
          return enumerable.includes(target);
        let found = false;
        global.enumerable.each(enumerable, (value, key) => {
          if ((found = value === target)) {
            throw global.enumerable.Break;
          }
        });
        return found;
      },

      /**
       * Chain enumerable calls:
       */
      chain(enumerable) {
        return new global.enumerable.Chainer(enumerable);
      },

      identity(value) {
        return value;
      }
    };

    // Aliases
    global.enumerable.select = global.enumerable.filter;
    global.enumerable.collect = global.enumerable.map;
    global.enumerable.inject = global.enumerable.reduce;
    global.enumerable.rest = global.enumerable.tail;
    global.enumerable.any = global.enumerable.some;
    global.enumerable.every = global.enumerable.all;
    global.chainableMethods = [
      "map",
      "collect",
      "detect",
      "filter",
      "reduce",
      "each",
      "tail",
      "rest",
      "reject",
      "pluck",
      "any",
      "some",
      "all"
    ];

    // Chainer class
    global.enumerable.Chainer = function(values) {
      this.results = values;
    };

    global.enumerable.Chainer.prototype.values = function() {
      return this.results;
    };

    global.enumerable.each(global.chainableMethods, methodName => {
      const method = global.enumerable[methodName];
      global.enumerable.Chainer.prototype[methodName] = function() {
        const args = Array.prototype.slice.call(arguments);
        args.unshift(this.results);
        this.results = method.apply(this, args);
        return this;
      };
    });

    global.init(arg => {
      if (arg.hasOwnProperty.length && typeof arg !== "string") {
        return global.enumerable.chain(arg);
      }
    });
  }

  if (typeof module !== "undefined") {
    module.exports = t => EnumerableModule(t);
  } else {
    EnumerableModule(Siga);
  }
});