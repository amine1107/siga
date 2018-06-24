/* ================ Siga Plugins ================ */

define("Siga.dom", ["Siga.core"], Siga => {
  const plugins = {};
  plugins.registered = {};
  plugins.AlreadyRegistered = Error;
  plugins.NotFound = Error;

  /**
   * Registers a plugin, making it available for
   */
  plugins.register = (methodName, metadata) => {
    if (plugins.registered[methodName]) {
      throw new plugins.AlreadyRegistered(
        `Already registered a plugin called: ${methodName}`
      );
    }

    plugins.registered[methodName] = metadata;
    Siga.domChain[methodName] = metadata[methodName];
  };

  /**
   * Removes a plugin.  Throws Siga.plugins.NotFound if
   */
  plugins.remove = methodName => {
    if (!plugins.registered.hasOwnProperty(methodName)) {
      throw new plugins.NotFound(`Plugin not found: ${methodName}`);
    } else {
      delete plugins.registered[methodName];
      delete Siga.domChain[methodName];
    }
  };

  Siga.plugins = plugins;
  return plugins;
});