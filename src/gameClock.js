//// Game Clock
////     The function that carries out the invocation of all the necessary game and rendering code
////

var gameClock = {};

gameClock.dt = gameClock.time = 0;
gameClock.__FPS__ = 30; 
gameClock.__DT__ = 1000 / gameClock.__FPS__;
gameClock.__ID__ = null;
gameClock.run = function () {
    // Calculate change in time and total time
    gameClock.dt = glClock.getDelta();
    gameClock.time = glClock.getElapsedTime();
    
    Keys.update(gameClock.dt, gameClock.time);
    Math4D.runRotations(gameClock.dt, gameClock.time);
    Box.updateAll(gameClock.dt, gameClock.time);
    glRender(gameClock.dt, gameClock.time);
};

gameClock.start = function () {
    if (gameClock.__ID__ === null) {
        gameClock.__ID__ = setInterval(gameClock.run, gameClock.__DT__);
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
