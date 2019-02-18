//// Game Clock
////     The function that carries out the invocation of all the necessary game and rendering code
////

var gameClock = {};

gameClock.FPS = 30; 
gameClock.DT = 1000 / gameClock.FPS;
gameClock.__ID__ = null;
gameClock.run = function () {
    Keys.update();
    Math4D.runRotations();
    Box.updateAll();
    glRender();
};

gameClock.start = function () {
    if (gameClock.__ID__ === null) {
        gameClock.__ID__ = setInterval(gameClock.run, gameClock.DT);
    } else {
        throw new Error("Attempted to start game clock when it was already running");
    }
};

gameClock.stop = function () {
    if (gameClock.__ID__ !== null) {
        clearInterval(gameClock.__ID__);
    } else {
        throw new Error("Attempted to stop a nonexistent game clock");
    }
}
