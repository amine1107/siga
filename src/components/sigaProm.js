/* ================ Siga Promise ================ */

define("Siga.promise", ["Siga.core"], Siga => {
  function PromiseModule(global) {
    /**
     * The Promise class.
     */
    class Promise {
      constructor() {
        const self = this;
        this.pending = [];

        /**
         * Resolves a promise.
         */
        (this.resolve = result => {
          self.complete("resolve", result);
        }),
          /**
           * Rejects a promise.
           */
          (this.reject = result => {
            self.complete("reject", result);
          });
      }

      /**
       * Adds a success and failure handler for completion of this Promise object.
       */
      then(success, failure) {
        this.pending.push({ resolve: success, reject: failure });
        return this;
      }

      /**
       * Runs through each pending 'thenable' based on type (resolve, reject).
       */
      complete(type, result) {
        while (this.pending[0]) {
          this.pending.shift()[type](result);
        }
      }
    }

    /**
     * Chained Promises:
     */
    const chain = {};

    Siga.init(function() {
      if (arguments.length === 0) return chain;
    });

    chain.delay = ms => {
      const p = new Siga.Promise();
      setTimeout(p.resolve, ms);
      return p;
    };

    global.Promise = Promise;
  }

  if (typeof module !== "undefined") {
    module.exports = t => PromiseModule(t);
  } else {
    PromiseModule(Siga);
  }

  return Siga.Promise;
});
