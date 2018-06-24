/* ================ Siga Core ================ */

define("Siga.require", ["Siga.core"], Siga => {
  let appendTo = document.head || document.getElementsByTagName("head");
  const scriptOptions = ["async", "defer", "src", "text"];

  /**
   * Used to determine if a script is from the same origin.
   */
  function isSameOrigin(src) {
    return (
      src.charAt(0) === "/" ||
      src.includes(`${location.protocol}//${location.host}`) ||
      false
    );
  }

  /**
   * Creates a script tag from a set of options.
   */
  function createScript(options) {
    const script = document.createElement("script");
    let key;

    for (key in scriptOptions) {
      key = scriptOptions[key];

      if (options[key]) {
        script[key] = options[key];
      }
    }

    return script;
  }

  /**
   * Inserts a script tag into the document.
   */
  function insertScript(script) {
    appendTo.insertBefore(script, appendTo.firstChild);
  }

  /**
   * Loads scripts using script tag insertion.
   */
  function requireWithScriptInsertion(scriptSrc, options, fn) {
    options.src = scriptSrc;
    const script = createScript(options);

    script.onload = script.onreadystatechange = () => {
      if (
        !script.readyState ||
        script.readyState === "complete" ||
        script.readyState === "loaded"
      ) {
        script.onload = script.onreadystatechange = null;
        fn();
        appendTo.removeChild(script);
      }
    };

    insertScript(script, options, fn);
  }

  /**
   * Loads scripts using XMLHttpRequest.
   */
  function requireWithXMLHttpRequest(scriptSrc, options, fn) {
    if (!isSameOrigin(scriptSrc)) {
      throw "Scripts loaded with XMLHttpRequest must be from the same origin";
    }

    if (!Siga.get) {
      throw "Loading scripts with XMLHttpRequest requires Siga.net to be loaded";
    }

    Siga.get(scriptSrc).end(res => {
      options.text = res.responseText;
      fn(options);
    });
  }

  /**
   * Parse and run a queue of scripts, preloading where required.
   */
  class Queue {
    constructor(sources) {
      this.sources = sources;
      this.events = new Siga.events.Emitter();
      this.queue = [];
      this.currentGroup = 0;
      this.groups = {};
      this.groupKeys = [];
      this.parseQueue(this.sources, false, 0);

      this.installEventHandlers();
      this.pointer = 0;
      this.preloadCount = 0;

      const self = this;
      runWhenReady(() => {
        self.runQueue();
      });
    }

    on() {
      this.events.on(...arguments);
      return this;
    }

    emit() {
      this.events.emit(...arguments);
      return this;
    }

    installEventHandlers() {
      const self = this;

      this.on("preloaded", (groupItem, options) => {
        const group = self.groups[groupItem.group];
        groupItem.preloaded = true;
        groupItem.scriptOptions = options;
        self.preloadCount--;

        if (self.preloadCount === 0) {
          self.emit("preload-complete");
        }
      });

      this.on("preload-complete", function() {
        this.emit("execute-next");
      });

      this.on("execute-next", () => {
        const groupItem = self.nextItem();

        function completeCallback() {
          groupItem.loaded = true;
          self.emit("loaded", groupItem);
          self.emit("execute-next");
        }

        if (groupItem) {
          if (groupItem.preload) {
            self.execute(groupItem, completeCallback);
          } else {
            self.fetchExecute(groupItem, completeCallback);
          }
        } else {
          self.emit("complete");
        }
      });
    }

    nextItem() {
      let group;
      let i;
      let j;
      let item;

      for (i = 0; i < this.groupKeys.length; i++) {
        group = this.groups[this.groupKeys[i]];
        for (j = 0; j < group.length; j++) {
          item = group[j];
          if (!item.loaded) {
            return item;
          }
        }
      }
    }

    fetchExecute(item, fn) {
      const self = this;
      requireWithScriptInsertion(
        item.src,
        { async: true, defer: true },
        () => {
          fn();
        }
      );
    }

    execute(item, fn) {
      if (item && item.scriptOptions) {
        script = createScript(item.scriptOptions);
        insertScript(script);
        appendTo.removeChild(script);
      }

      fn();
    }

    enqueue(source, async) {
      const preload = isSameOrigin(source);
      let options;

      options = {
        src: source,
        preload,
        async,
        group: this.currentGroup
      };

      if (!this.groups[this.currentGroup]) {
        this.groups[this.currentGroup] = [];
        this.groupKeys.push(this.currentGroup);
      }

      this.groups[this.currentGroup].push(options);
    }

    parseQueue(sources, async, level) {
      let i;
      let source;
      for (i = 0; i < sources.length; i++) {
        source = sources[i];
        if (Siga.isArray(source)) {
          this.currentGroup++;
          this.parseQueue(source, true, level + 1);
        } else {
          if (level === 0) {
            this.currentGroup++;
          }
          this.enqueue(source, async);
        }
      }
    }

    runQueue() {
      // Preload everything that can be preloaded
      this.preloadAll();
    }

    preloadAll() {
      let i;
      let g;
      let group;
      let item;
      const self = this;
      for (g = 0; g < this.groupKeys.length; g++) {
        group = this.groups[this.groupKeys[g]];

        for (i = 0; i < group.length; i++) {
          item = group[i];

          if (item.preload) {
            this.preloadCount++;
            ((groupItem => {
              requireWithXMLHttpRequest(groupItem.src, {}, script => {
                self.emit("preloaded", groupItem, script);
              });
            }))(item);
          }
        }
      }

      if (this.preloadCount === 0) {
        this.emit("execute-next");
      }
    }
  }

  function runWhenReady(fn) {
    setTimeout(function() {
      if ("item" in appendTo) {
        if (!appendTo[0]) {
          return setTimeout(arguments.callee, 25);
        }

        appendTo = appendTo[0];
      }

      fn();
    });
  }

  /**
   * Non-blocking script loading.
   */
  Siga.require = (scriptSrc, options, fn) => {
    options = options || {};
    fn = fn || (() => {});

    if (Siga.isArray(scriptSrc)) {
      return new Queue(scriptSrc);
    }

    runWhenReady(() => {
      switch (options.transport) {
        case "XMLHttpRequest":
          return requireWithXMLHttpRequest(scriptSrc, options, options => {
            const script = createScript(options);
            insertScript(script);
            appendTo.removeChild(script);
            fn();
          });

        case "scriptInsertion":
          return requireWithScriptInsertion(scriptSrc, options, fn);

        default:
          return requireWithScriptInsertion(scriptSrc, options, fn);
      }
    });
  };

  Siga.require.isSameOrigin = isSameOrigin;
  return Siga.require;
});