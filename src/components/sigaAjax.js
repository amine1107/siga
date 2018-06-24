/* ================ Siga Ajax ================ */

define("Siga.net", ["Siga.core", "Siga.dom"], Siga => {
  const net = {};

  /*
   * Ajax request options:
   */
  const trim = "".trim
    ? s => s.trim()
    : s => s.replace(/^\s\s*/, "").replace(/\s\s*$/, "");

  function xhr() {
    if (
      typeof XMLHttpRequest !== "undefined" &&
      (window.location.protocol !== "file:" || !window.ActiveXObject)
    ) {
      return new XMLHttpRequest();
    } else {
      try {
        return new ActiveXObject("Msxml2.XMLHTTP.6.0");
      } catch (e) {}
      try {
        return new ActiveXObject("Msxml2.XMLHTTP.3.0");
      } catch (e) {}
      try {
        return new ActiveXObject("Msxml2.XMLHTTP");
      } catch (e) {}
    }
    return false;
  }

  function successfulRequest(request) {
    return (
      (request.status >= 200 && request.status < 300) ||
      request.status == 304 ||
      (request.status == 0 && request.responseText)
    );
  }

  /*
   * Serialize JavaScript for HTTP requests.
   */
  net.serialize = object => {
    if (!object) return;

    if (typeof object === "string") {
      return object;
    }

    const results = [];
    for (const key in object) {
      results.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(object[key])}`
      );
    }
    return results.join("&");
  };

  /*
   * JSON.parse support can be inferred using `Siga.detect('JSON.parse')`.
   */
  Siga.addDetectionTest("JSON.parse", () => window.JSON && window.JSON.parse);

  /*
   * Parses JSON represented as a string.
   */
  net.parseJSON = string => {
    if (typeof string !== "string" || !string) return null;
    string = trim(string);
    return Siga.detect("JSON.parse")
      ? window.JSON.parse(string)
      : new Function(`return ${string}`)();
  };

  /*
   * Parses XML represented as a string.
   */
  if (window.DOMParser) {
    net.parseXML = text => new DOMParser().parseFromString(text, "text/xml");
  } else {
    net.parseXML = text => {
      const xml = new ActiveXObject("Microsoft.XMLDOM");
      xml.async = "false";
      xml.loadXML(text);
      return xml;
    };
  }

  /*
   * Creates an Ajax request.  Returns an object that can be used
   */
  function ajax(url, options) {
    const request = xhr();
    let promise;
    let then;
    const response = {};
    let chain;

    if (Siga.Promise) {
      promise = new Siga.Promise();
    }

    function respondToReadyState(readyState) {
      if (request.readyState == 4) {
        const contentType =
          request.mimeType || request.getResponseHeader("content-type") || "";

        response.status = request.status;
        response.responseText = request.responseText;
        if (/json/.test(contentType)) {
          response.responseJSON = net.parseJSON(request.responseText);
        } else if (/xml/.test(contentType)) {
          response.responseXML = net.parseXML(request.responseText);
        }

        response.success = successfulRequest(request);

        if (options.callback) {
          return options.callback(response, request);
        }

        if (response.success) {
          if (options.success) options.success(response, request);
          if (promise) promise.resolve(response, request);
        } else {
          if (options.error) options.error(response, request);
          if (promise) promise.reject(response, request);
        }
      }
    }

    // Set the HTTP headers
    function setHeaders() {
      const defaults = {
        Accept:
          "text/javascript, application/json, text/html, application/xml, text/xml, */*",
        "Content-Type": "application/x-www-form-urlencoded"
      };

      /**
       * Merge headers with defaults.
       */
      for (var name in defaults) {
        if (!options.headers.hasOwnProperty(name))
          options.headers[name] = defaults[name];
      }

      for (var name in options.headers) {
        request.setRequestHeader(name, options.headers[name]);
      }
    }

    if (typeof options === "undefined") options = {};

    options.method = options.method ? options.method.toLowerCase() : "get";
    options.asynchronous = options.asynchronous || true;
    options.postBody = options.postBody || "";
    request.onreadystatechange = respondToReadyState;
    request.open(options.method, url, options.asynchronous);

    options.headers = options.headers || {};
    if (options.contentType) {
      options.headers["Content-Type"] = options.contentType;
    }

    if (typeof options.postBody !== "string") {
      // Serialize JavaScript
      options.postBody = net.serialize(options.postBody);
    }

    setHeaders();

    function send() {
      try {
        request.send(options.postBody);
      } catch (e) {
        if (options.error) {
          options.error();
        }
      }
    }

    chain = {
      set(key, value) {
        options.headers[key] = value;
        return chain;
      },

      send(data, callback) {
        options.postBody = net.serialize(data);
        options.callback = callback;
        send();
        return chain;
      },

      end(callback) {
        options.callback = callback;
        send();
        return chain;
      },

      data(data) {
        options.postBody = net.serialize(data);
        return chain;
      },

      then() {
        chain.end();
        if (promise) promise.then(...arguments);
        return chain;
      }
    };

    return chain;
  }

  class JSONPCallback {
    constructor(url, success, failure) {
      const self = this;
      this.url = url;
      this.methodName = `__Siga_jsonp_${parseInt(new Date().getTime())}`;
      this.success = success;
      this.failure = failure;

      function runCallback(json) {
        self.success(json);
        self.teardown();
      }

      window[this.methodName] = runCallback;
    }

    run() {
      this.scriptTag = document.createElement("script");
      this.scriptTag.id = this.methodName;
      this.scriptTag.src = this.url.replace("{callback}", this.methodName);
      document.body.appendChild(this.scriptTag);
    }

    teardown() {
      window[this.methodName] = null;
      delete window[this.methodName];
      if (this.scriptTag) {
        document.body.removeChild(this.scriptTag);
      }
    }
  }

  /*
   * An Ajax GET request.
   */
  net.get = (url, options) => {
    if (typeof options === "undefined") options = {};
    options.method = "get";
    return ajax(url, options);
  };

  /*
   * An Ajax POST request.
   */
  net.post = (url, options) => {
    if (typeof options === "undefined") options = {};
    options.method = "post";
    return ajax(url, options);
  };

  /*
   * A jsonp request.  Example:
   */
  net.jsonp = (url, options) => {
    if (typeof options === "undefined") options = {};
    const callback = new JSONPCallback(url, options.success, options.failure);
    callback.run();
  };

  /**
   * The Ajax methods are mapped to the `Siga` object:
   *
   *      Siga.get();
   *      Siga.post();
   *      Siga.json();
   *
   */
  Siga.get = net.get;
  Siga.post = net.post;
  Siga.jsonp = net.jsonp;

  net.ajax = ajax;
  Siga.net = net;
});