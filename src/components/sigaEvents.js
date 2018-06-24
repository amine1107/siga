/* ================ Siga Events ================ */

define("Siga.events", ["Siga.core", "Siga.dom"], Siga => {
  const events = {};
  const cache = [];
  let onReadyBound = false;
  let isReady = false;
  let DOMContentLoaded;
  let readyCallbacks = [];
  let Emitter;

  function isValidElement(element) {
    return element.nodeType !== 3 && element.nodeType !== 8;
  }

  function stop(event) {
    event.preventDefault(event);
    event.stopPropagation(event);
  }

  function fix(event, element) {
    if (!event) var event = window.event;

    event.stop = () => {
      stop(event);
    };

    if (typeof event.target === "undefined")
      event.target = event.srcElement || element;

    if (!event.preventDefault)
      event.preventDefault = () => {
        event.returnValue = false;
      };

    if (!event.stopPropagation)
      event.stopPropagation = () => {
        event.cancelBubble = true;
      };

    if (event.target && event.target.nodeType === 3)
      event.target = event.target.parentNode;

    if (event.pageX == null && event.clientX != null) {
      const doc = document.documentElement;
      const body = document.body;
      event.pageX =
        event.clientX +
        ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0) -
        ((doc && doc.clientLeft) || (body && body.clientLeft) || 0);
      event.pageY =
        event.clientY +
        ((doc && doc.scrollTop) || (body && body.scrollTop) || 0) -
        ((doc && doc.clientTop) || (body && body.clientTop) || 0);
    }

    return event;
  }

  function createResponder(element, handler) {
    return event => {
      fix(event, element);
      return handler(event);
    };
  }

  function removeCachedResponder(element, type, handler) {
    let i = 0;
    let responder;
    let j = 0;
    for (j = 0; j < cache.length; j++) {
      if (
        cache[j].element !== element &&
        cache[j].type !== type &&
        cache[j].handler !== handler
      ) {
        cache[i++] = cache[j];
      } else {
        responder = cache[j].responder;
      }
    }
    cache.length = i;
    return responder;
  }

  function ready() {
    if (!isReady) {
      // Make sure body exists
      if (!document.body) {
        return setTimeout(ready, 13);
      }

      isReady = true;

      for (const i in readyCallbacks) {
        readyCallbacks[i]();
      }

      readyCallbacks = null;
    }
  }

  // This checks if the DOM is ready recursively
  function DOMReadyScrollCheck() {
    if (isReady) {
      return;
    }

    try {
      document.documentElement.doScroll("left");
    } catch (e) {
      setTimeout(DOMReadyScrollCheck, 1);
      return;
    }

    ready();
  }

  // DOMContentLoaded cleans up listeners
  if (typeof document !== "undefined") {
    if (document.addEventListener) {
      DOMContentLoaded = () => {
        document.removeEventListener(
          "DOMContentLoaded",
          DOMContentLoaded,
          false
        );
        ready();
      };
    } else if (document.attachEvent) {
      DOMContentLoaded = () => {
        if (document.readyState === "complete") {
          document.detachEvent("onreadystatechange", DOMContentLoaded);
          ready();
        }
      };
    }
  }

  function bindOnReady() {
    if (onReadyBound) return;
    onReadyBound = true;

    if (document.readyState === "complete") {
      ready();
    } else if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", DOMContentLoaded, false);
      window.addEventListener("load", ready, false);
    } else if (document.attachEvent) {
      document.attachEvent("onreadystatechange", DOMContentLoaded);

      window.attachEvent("onload", ready);

      // Check to see if the document is ready
      let toplevel = false;
      try {
        toplevel = window.frameElement == null;
      } catch (e) {}

      if (document.documentElement.doScroll && toplevel) {
        DOMReadyScrollCheck();
      }
    }
  }

  function IEType(type) {
    if (type.match(/:/)) {
      return type;
    }
    return `on${type}`;
  }

  /**
   * Bind an event to an element.
   */
  events.add = (element, type, handler) => {
    if (!isValidElement(element)) return;

    const responder = createResponder(element, handler);
    cache.push({
      element,
      type,
      handler,
      responder
    });

    if (type.match(/:/) && element.attachEvent) {
      element.attachEvent("ondataavailable", responder);
    } else {
      if (element.addEventListener) {
        element.addEventListener(type, responder, false);
      } else if (element.attachEvent) {
        element.attachEvent(IEType(type), responder);
      }
    }
  };

  /**
   * Remove an event from an element.
   */
  events.remove = (element, type, handler) => {
    if (!isValidElement(element)) return;
    const responder = removeCachedResponder(element, type, handler);

    if (document.removeEventListener) {
      element.removeEventListener(type, responder, false);
    } else {
      element.detachEvent(IEType(type), responder);
    }
  };

  /**
   * Fires an event.
   */
  events.fire = (element, type) => {
    let event;
    if (document.createEventObject) {
      event = document.createEventObject();
      fix(event, element);

      // This isn't quite ready
      if (type.match(/:/)) {
        event.eventName = type;
        event.eventType = "ondataavailable";
        return element.fireEvent(event.eventType, event);
      } else {
        return element.fireEvent(IEType(type), event);
      }
    } else {
      event = document.createEvent("HTMLEvents");
      fix(event, element);
      event.eventName = type;
      event.initEvent(type, true, true);
      return !element.dispatchEvent(event);
    }
  };

  /**
   * Add a 'DOM ready' callback.
   */
  events.ready = callback => {
    bindOnReady();
    readyCallbacks.push(callback);
  };

  if (Siga.dom !== "undefined") {
    events.delegate = (element, selector, type, handler) => events.add(element, type, event => {
      const matches = Siga.dom.findElement(
        event.target,
        selector,
        event.currentTarget
      );
      if (matches) {
        handler(event);
      }
    });
  }

  /**
   * Events can be chained with DOM calls:
   */
  events.addDOMethods = () => {
    if (typeof Siga.domChain === "undefined") return;

    Siga.domChain.bind = function(type, handler) {
      let element;
      for (let i = 0; i < this.length; i++) {
        element = this[i];
        if (handler) {
          Siga.events.add(element, type, handler);
        } else {
          Siga.events.fire(element, type);
        }
      }
      return this;
    };

    const chainedAliases = (
      "click dblclick mouseover mouseout mousemove " +
      "mousedowe mouseup blur focus change keydown " +
      "keypress keyup resize scroll"
    ).split(" ");

    for (let i = 0; i < chainedAliases.length; i++) {
      ((name => {
        Siga.domChain[name] = function(handler) {
          return this.bind(name, handler);
        };
      }))(chainedAliases[i]);
    }
  };

  events.addDOMethods();

  /**
   * A generic event manager, based on Node's EventEmitter:
   */
  Emitter = function() {
    this.events = {};
  };

  Emitter.prototype = {
    /**
     * Adds a listener.  Multiple can be added per eventName.  Aliased as `on`.
     */
    addListener(eventName, handler) {
      if (eventName in this.events === false) this.events[eventName] = [];

      this.events[eventName].push(handler);
    },

    /**
     * Triggers all matching listeners.
     */
    emit(eventName) {
      let fired = false;
      if (eventName in this.events === false) return fired;

      const list = this.events[eventName].slice();

      for (let i = 0; i < list.length; i++) {
        list[i].apply(this, Array.prototype.slice.call(arguments, 1));
        fired = true;
      }

      return fired;
    },

    /**
     * Removes all matching listeners.
     */
    removeAllListeners(eventName) {
      if (eventName in this.events === false) return false;

      delete this.events[eventName];
      return true;
    },

    removeListenerAt(eventName, i) {
      this.events[eventName].splice(i, 1);
    },

    /**
     * Removes a listener based on the handler function.
     */
    removeListener(eventName, handler) {
      if (eventName in this.events === false) return false;

      for (let i = 0; i < this.events[eventName].length; i++) {
        if (this.events[eventName][i] == handler) {
          this.removeListenerAt(eventName, i);
          return true;
        }
      }

      return false;
    }
  };

  Emitter.prototype.on = Emitter.prototype.addListener;

  events.Emitter = Emitter;

  /**
   * DOM ready event handlers can also be set with:
   */
  Siga.ready = events.ready;
  Siga.events = events;

  Siga.init(function(arg) {
    if (arguments.length === 1 && typeof arguments[0] === "function") {
      Siga.events.ready(arguments[0]);
    }
  });

  if (
    typeof window !== "undefined" &&
    window.attachEvent &&
    !window.addEventListener
  ) {
    window.attachEvent("onunload", () => {
      for (let i = 0; i < cache.length; i++) {
        try {
          events.remove(cache[i].element, cache[i].type);
          cache[i] = null;
        } catch (e) {}
      }
    });
  }
});