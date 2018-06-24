/* ================ Siga Functional helpers ================ */

define("Siga.functional", ["Siga.core"], Siga => {
  Siga.functional = {
    curry: Siga.bind,

    memoize(memo, fn) {
      const wrapper = n => {
        let result = memo[n];
        if (typeof result !== "number") {
          result = fn(wrapper, n);
          memo[n] = result;
        }
        return result;
      };
      return wrapper;
    }
  };
  return Siga;
});