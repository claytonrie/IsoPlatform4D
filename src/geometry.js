//// Box
////     A class that handles the three.js geometry of rectangular prisms;
////     The interface of Math4D and three.js

// a constant by which the coordinates and dimensions of all boxes are multiplied
const coScale = 2 * 10;
var Box = class {
    constructor (pos, sz, r = 1, g = 0, b = 0, isolate = false) {
        this.x = coScale * pos.x; this.y = coScale * pos.y;
        this.z = coScale * pos.z; this.w = coScale * pos.w;
        this.sx = coScale * sz.x; this.sy = coScale * sz.y;
        this.sz = coScale * sz.z; this.sw = coScale * sz.w;
        this.__W__ = null;
        this.__SX__ = this.__SY__ = this.__SZ__ = null;
        this.r = r; this.g = g; this.b = b;
        if (!isolate) {
            this.addObject();
        }
        return this;
    }
    addObject() {
        Box.list.push(this);
        return this;
    }
    addGeometry(SCENE, shader = CustomShade.NormalMat) {
        let box = new THREE.Mesh(
            new THREE.BoxGeometry(this.sx, this.sy, this.sz),
            new shader(this.r, this.g, this.b, 1)
        );
        SCENE.add(box);
        this.ind = Box.meshList.length;
        Box.meshList.push(box);
        return this;
    }
    
    updateGeo (dt, tt) {
        let point = Math4D.pointTo3D( this.x,  this.y,  this.z,  this.w);
        let dim   = Math4D.  dimTo3D(this.sx, this.sy, this.sz, this.sw);
        // Set the position of the geometry
        Box.meshList[this.ind].position.x = point.x;
        Box.meshList[this.ind].position.y = point.y;
        Box.meshList[this.ind].position.z = point.z;
        // Set the 2D rotation of the geometry
        Box.meshList[this.ind].rotation.y = Math.PI * Math4D.cam.axz / 2;
        if (Math4D.cam.transxzw) {
            this.__SX__ = this.__SY__ = this.__SZ__ = null;
            Box.meshList[this.ind].geometry = Box.generate3DRotGeo(dim);
        } else {
            Box.meshList[this.ind].rotation.x = 0;
            if (dim.x !== this.__SX__ || dim.y !== this.__SY__ || dim.z !== this.__SZ__) {
                this.__SX__ = dim.x;
                this.__SY__ = dim.y;
                this.__SZ__ = dim.z;
                Box.meshList[this.ind].geometry = new THREE.BoxGeometry(dim.x, dim.y, dim.z);
            }
        }
        if (this.__W__ !== point.w) {
            this.__W__ = point.w;
            let op =  Math4D.depthToOp(point.w, dim.w);
            Box.meshList[this.ind].material.opacity = op;
            // Do not write to depth (i.e. do not outline) if the player cannot interact with the geometry
            if (op < 1) {
                Box.meshList[this.ind].material.depthWrite = false;
            } else {
                Box.meshList[this.ind].material.depthWrite = true;
            }
        }
        if (Box.meshList[this.ind].material.needTime) {
            Box.meshList[this.ind].material.uniforms.iTime.value = tt % 500;
        }
        return this;
    }
    
    static generate3DRotGeo(dim) {
        if (Math4D.cam.swapxz) {
            let __temp = dim.z;
            dim.z = dim.x;
            dim.x = __temp;
        }
        return new THREE.PrismGeometry(Math4D.generateCubeProj(dim), dim.y);
    }
    static updateAll(dt, tt) {
        let i = Box.list.length - 1;
        for (; i >= 0; i -= 1) {
            Box.list[i].updateGeo(dt, tt);
        }
    }
}

// Global list that contain all instances of Boxes and three.js meshes
Box.list = [];
Box.meshList = [];
