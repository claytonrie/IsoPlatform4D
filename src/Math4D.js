//// Math4D
////     A set of functions that compute the math of 3D and 4D rotations
////

var Math4D = {R1: 0, R2: 0, R3: 0, Sxz: 0, Cxz: 0};
// These store the rotation matrix information to reduce computational stress
const SQRT3 = Math.sqrt(3);
Math4D.generate3DRotMat = function (A) {
    let Sxzw = SQRT3 * Math.sin(A * 2 * Math.PI / 3),
        Cxzw = Math.cos(A * 2 * Math.PI / 3);
    Math4D.R1 = (1 + 2 * Cxzw) / 3;
    Math4D.R2 = (1 + Sxzw - Cxzw) / 3;
    Math4D.R3 = (1 - Sxzw - Cxzw) / 3;
};
Math4D.generate2DRotMat = function (A) {
    Math4D.Sxz = Math.sin(A * Math.PI / 2);
    Math4D.Cxz = Math.cos(A * Math.PI / 2);
};

// Variable to describe the translation and rotation of the camera in 4D
Math4D.cam = {
    x: 0, y: 0, z: 0, w: 0,
    swapxz  : false, signxz: 1, 
    transxz : 0, axz : 0,
    swapxzw : 0, 
    transxzw: 0, axzw: 0
};

Math4D.rotate90xz = function (cc = false) {
    if (cc) {
        if (Math4D.cam.swapxz) {
            Math4D.cam.swapxz = false;
        } else {
            Math4D.cam.swapxz = true;
            Math4D.cam.signxz *= -1;
        }
    } else {
        if (Math4D.cam.swapxz) {
            Math4D.cam.swapxz = false;
            Math4D.cam.signxz *= -1;
        } else {
            Math4D.cam.swapxz = true;
        }
    }
};
Math4D.rotate120xzw = function (cc = false) {
    if (cc) {
        Math4D.cam.swapxzw -= 1;
        if (Math4D.cam.swapxzw < 0) { Math4D.cam.swapxzw = 2; }
    } else {
        Math4D.cam.swapxzw += 1;
        Math4D.cam.swapxzw %= 3;
    }
};


Math4D.pointTo3D = function (X, Y, Z, W) {
    // translate the point to camera position
    X -= Math4D.cam.x; Y -= Math4D.cam.y; Z -= Math4D.cam.z; W -= Math4D.cam.w;
    // Basic 3D permutation matrix
    let newX = [X, Z, W][Math4D.cam.swapxzw],
        newZ = [Z, W, X][Math4D.cam.swapxzw],
        newW = [W, X, Z][Math4D.cam.swapxzw];
    // Turning 3D rotation matrix
    if (Math4D.cam.transxzw) {
        X = Math4D.R1 * newX + Math4D.R2 * newZ + Math4D.R3 * newW;
        Z = Math4D.R1 * newZ + Math4D.R2 * newW + Math4D.R3 * newX;
        W = Math4D.R1 * newW + Math4D.R2 * newX + Math4D.R3 * newZ;
    } else {
        X = newX; Z = newZ; W = newW;
    }
    // Basic 2D permutation matrix
    newX = Math4D.cam.signxz * (Math4D.cam.swapxz ?  X : Z);
    newZ = Math4D.cam.signxz * (Math4D.cam.swapxz ? -Z : X);
    // Turning 2D rotation matrix
    if (Math4D.cam.transxz) {
        X =  Math4D.Cxz * newX + Math4D.Sxz * newZ;
        Z = -Math4D.Sxz * newX + Math4D.Cxz * newZ;
    } else {
        X = newX; Z = newZ;
    }
    return new THREE.Vector4(X, Y, Z, W);
};
Math4D.dimTo3D = function (SX, SY, SZ, SW) {
    let newX = [SX, SZ, SW][Math4D.cam.swapxzw],
        newZ = [SZ, SW, SX][Math4D.cam.swapxzw];
    SW = [SW, SX, SZ][Math4D.cam.swapxzw];
    SX = Math4D.cam.swapxz ? newZ : newX;
    SZ = Math4D.cam.swapxz ? newX : newZ;
    return new THREE.Vector4(SX, SY, SZ, SW);
};

// Maps a vertex on a rotation cube to the 3D plane
Math4D.vertexRot3D = function (dim, signx, signz, signw) {
    let vec = new THREE.Vector2();
    let X = dim.z, Z = dim.w, W = dim.x;
    let comp1 = ( Math4D.R1 * X * signx - Math4D.R2 * Z * signz + Math4D.R3 * W * signw) / 2,
        comp2 = (-Math4D.R2 * X * signx + Math4D.R3 * Z * signz - Math4D.R1 * W * signw) / 2;
    if (Math4D.cam.swapxz) {
        vec.x = comp1;
        vec.y = comp2;
    } else {
        vec.y = comp1;
        vec.x = comp2;
    }
    return vec;
};
// Maps the outline of a rotating cube onto a 2D face
Math4D.generateCubeProj = function (dim) {
    let list = [];
    list.push(Math4D.vertexRot3D(dim,  1,  1,  1));
    list.push(Math4D.vertexRot3D(dim, -1,  1,  1));
    list.push(Math4D.vertexRot3D(dim, -1,  1, -1));
    list.push(Math4D.vertexRot3D(dim, -1, -1, -1));
    list.push(Math4D.vertexRot3D(dim,  1, -1, -1));
    list.push(Math4D.vertexRot3D(dim,  1, -1,  1));
    return list;
};

// Maps the w-depth of an object to an opacity via a smoothstep function;
//     used to show objects of at position that are of a different 
//     w-depth and thus non-interactable
Math4D.depthToOp = function (w, sw) {
    const endPoint = 5;
    let X = ((Math.abs(w) - sw - PL_SZ) / (endPoint * coScale));
    if (X <= 0) {
        return 1;
    } else if (X >= 1) {
        return 0;
    } else {
        return 1 - (3 * X * X - 2 * X * X * X);
    }
};


// Updates the camera based on how much time has passed
Math4D.DELTA_ANGLE = 2;
Math4D.runRotations = function (dt) {
    if (Math4D.cam.transxz) {
        Math4D.cam.axz += Math4D.DELTA_ANGLE * dt * Math4D.cam.transxz;
        if (Math4D.cam.transxz > 0 && Math4D.cam.axz >= 1) {
            Math4D.rotate90xz(false);
            Math4D.cam.transxz = 0;
            Math4D.cam.axz = 0;
        } else if (Math4D.cam.transxz < 0 && Math4D.cam.axz <= 0) {
            Math4D.cam.transxz = 0;
            Math4D.cam.axz = 0;
        } else {
            Math4D.generate2DRotMat(Math4D.cam.axz);
        }
    }
    
    if (Math4D.cam.transxzw) {
        Math4D.cam.axzw += Math4D.DELTA_ANGLE * dt * Math4D.cam.transxzw;
        if (Math4D.cam.transxzw > 0 && Math4D.cam.axzw >= 1) {
            Math4D.rotate120xzw(false);
            Math4D.cam.transxzw = 0;
            Math4D.cam.axzw = 0;
        } else if (Math4D.cam.transxzw < 0 && Math4D.cam.axzw <= 0) {
            Math4D.cam.transxzw = 0;
            Math4D.cam.axzw = 0;
        } else {
            Math4D.generate3DRotMat(Math4D.cam.axzw);
        }
    }
};
