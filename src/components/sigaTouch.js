/* ================ Siga Touch ================ */

define("Siga.dom", ["Siga.core", "Siga.dom", "Siga.events"], (Siga, dom, events) => {
  const touch = {};
  const state = {};

  touch.swipeThreshold = 50;

  // Returns [orientation angle, orientation string]
  touch.orientation = () => {
    const orientation = window.orientation;
    let orientationString = "";
    switch (orientation) {
      case 0:
        orientationString += "portrait";
        break;

      case -90:
        orientationString += "landscape right";
        break;

      case 90:
        orientationString += "landscape left";
        break;

      case 180:
        orientationString += "portrait upside-down";
        break;
    }
    return [orientation, orientationString];
  };

  function touchStart(e) {
    state.touches = e.touches;
    state.startTime = new Date().getTime();
    state.x = e.changedTouches[0].clientX;
    state.y = e.changedTouches[0].clientY;
    state.startX = state.x;
    state.startY = state.y;
    state.target = e.target;
    state.duration = 0;
  }

  function touchEnd(e) {
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;

    if (state.x === x && state.y === y && state.touches.length == 1) {
      Siga.events.fire(e.target, "tap");
    }
  }

  function touchMove(e) {
    let moved = 0;
    const touch = e.changedTouches[0];
    state.duration = new Date().getTime() - state.startTime;
    state.x = state.startX - touch.pageX;
    state.y = state.startY - touch.pageY;
    moved = Math.sqrt(
      Math.abs(state.x) ** 2 + Math.abs(state.y) ** 2
    );

    if (state.duration < 1000 && moved > Siga.touch.swipeThreshold) {
      Siga.events.fire(e.target, "swipe");
    }
  }

  // register must be called to register for touch event helpers
  touch.register = () => {
    Siga.events.add(document, "touchstart", touchStart);
    Siga.events.add(document, "touchmove", touchMove);
    Siga.events.add(document, "touchend", touchEnd);
    Siga.touch.swipeThreshold = screen.width / 5;
  };

  Siga.touch = touch;
  return Siga.touch;
});