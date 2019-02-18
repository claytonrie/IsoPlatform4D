//// Keys
////     A set of function that help to interface the game with keyboard presses
////

var Keys = {};
Keys.pressed  = []; // A list of all currently pressed keys
Keys.buffered = []; // A buffered key will stay in this list until 
onkeydown = function (e) {
    if (!Keys.pressed .includes(e.key)) { Keys.pressed .push(e.key);  }
    if (!Keys.buffered.includes(e.key)) { Keys.buffered.push(e.key); }
};
onkeyup = function (e) {
    if (Keys.pressed.includes(e.key)) {
        Keys.pressed.splice(Keys.pressed.indexOf(e.key), 1);
    }
};

Keys.checkPressed = function (key) {
    return Keys.pressed.includes(key);
};
Keys.checkBuffered = function (key) {
    let ind = Keys.buffered.indexOf(key);
    if (ind === -1) {
        return false;
    } else {
        Keys.buffered.splice(ind, 1);
        return true;
    }
};

Keys.update = function () {
    if (Math4D.cam.transxz < 1 && Keys.checkPressed("e")) {
        Math4D.cam.transxz = 1;
    } else if (Math4D.cam.transxz > -1 && Keys.checkPressed("q")) {
        if (Math4D.cam.transxz === 0) {
            Math4D.cam.axz = 1;
            Math4D.rotate90xz(true);
        }
        Math4D.cam.transxz = -1;
    }
    
    if (Math4D.cam.transxzw < 1 && Keys.checkPressed("1")) {
        Math4D.cam.transxzw = 1;
    } else if (Math4D.cam.transxzw > -1 && Keys.checkPressed("3")) {
        if (Math4D.cam.transxzw === 0) {
            Math4D.cam.axzw = 1;
            Math4D.rotate120xzw(true);
        }
        Math4D.cam.transxzw = -1;
    }
};
