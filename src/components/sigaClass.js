/* ================ Siga Class ================ */

define("Siga.cls", ["Siga.core"], Siga => {
  let Class;
  let cls;

  Class = function() {
    return cls.create.apply(this, arguments);
  };

  cls = {
    create() {
      let methods = null;
      let parent = undefined;

      const klass = function() {
        this.$super = function(method, args) {
          return cls.$super(this.$parent, this, method, args);
        };
        this.initialize(...arguments);
      };

      if (typeof arguments[0] === "function") {
        parent = arguments[0];
        methods = arguments[1];
      } else {
        methods = arguments[0];
      }

      if (typeof parent !== "undefined") {
        cls.extend(klass.prototype, parent.prototype);
        klass.prototype.$parent = parent.prototype;
      }

      cls.mixin(klass, methods);
      cls.extend(klass.prototype, methods);
      klass.prototype.constructor = klass;

      if (!klass.prototype.initialize)
        klass.prototype.initialize = () => {};

      return klass;
    },

    mixin(klass, methods) {
      if (typeof methods.include !== "undefined") {
        if (typeof methods.include === "function") {
          cls.extend(klass.prototype, methods.include.prototype);
        } else {
          for (let i = 0; i < methods.include.length; i++) {
            cls.extend(klass.prototype, methods.include[i].prototype);
          }
        }
      }
    },

    extend(destination, source) {
      for (const property in source) destination[property] = source[property];
      return destination;
    },
    $super(parentClass, instance, method, args) {
      return parentClass[method].apply(instance, args);
    }
  };

  Siga.Class = Class;
  Siga.cls = cls;
  return cls;
});