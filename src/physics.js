//// PhysicsBox
////     A class that handles all the physics of the interacting rectangular prisms
////

const TIME_MULT = 0.25 * FPS;
class PhysicsBox {
	constructor (type, pos, sz, clr) {
    	this.type = type;
        let shader = type === 0 ? AlphaShader : (type === 1 ? WaterShader : LavaShader);
    	this.renderChild = new Box(pos.x, pos.y, pos.z, pos.w, 
        	sz.x, sz.y, sz.z, sz.w, clr.r, clr.g, clr.b);
        this.renderChild.addObject().addGeometry(glScene, shader);
        this.pos = pos;
        this.sz  = sz;
        this.clr = clr;
        this.tch = {x: 0, y: 0, z: 0, w: 0}; // If touching a side
        this.vel = {x: 0, y: 0, z: 0, w: 0}; // Velocity
        this.acc = {x: 0, y: 0, z: 0, w: 0}; // Acceleration
    }
    
    doCollide (phys) {
    	if (2 * Math.abs(this.pos.x - phys.pos.x) > this.sz.x + phys.sz.x) {
        	return false;
        } else if (2 * Math.abs(this.pos.y - phys.pos.y) > this.sz.y + phys.sz.y) {
        	return false;
        } else if (2 * Math.abs(this.pos.z - phys.pos.z) > this.sz.z + phys.sz.z) {
        	return false;
        } else if (2 * Math.abs(this.pos.w - phys.pos.w) > this.sz.w + phys.sz.w) {
        	return false;
        }
        return true;
    }
    collideInfo (phys) {
    	let ret = {};
        // Depth along each coordinate
        ret.dx = 0.5 * (this.sz.x + phys.sz.x) - Math.abs(this.pos.x - phys.pos.x);
        ret.dy = 0.5 * (this.sz.y + phys.sz.y) - Math.abs(this.pos.y - phys.pos.y);
        ret.dz = 0.5 * (this.sz.z + phys.sz.z) - Math.abs(this.pos.z - phys.pos.z);
        ret.dw = 0.5 * (this.sz.w + phys.sz.w) - Math.abs(this.pos.w - phys.pos.w);
        // Top-down intersectional volume
        ret.topvol = ret.dx * ret.dz * ret.dw;
        // The total intersectional hypervolume
        ret.hypvol = ret.dy * ret.topvol;
        return ret;
    }
    resolveCollision(phys, info) {
        // TODO: complete resolveCollision
    }
    
    updatePosition(dt) {
    	let del = this.vel.x + 0.5 * this.acc.x * this.acc.x * TIME_MULT;
    	this.pos.x += TIME_MULT * (this.tch.x !== Math.sign(del)) * del;
        del = this.vel.y + 0.5 * this.acc.y * this.acc.y * TIME_MULT;
    	this.pos.y += TIME_MULT * (this.tch.y !== Math.sign(del)) * del;
        del = this.vel.z + 0.5 * this.acc.z * this.acc.z * TIME_MULT;
    	this.pos.z += TIME_MULT * (this.tch.z !== Math.sign(del)) * del;
        del = this.vel.w + 0.5 * this.acc.w * this.acc.w * TIME_MULT;
    	this.pos.w += TIME_MULT * (this.tch.w !== Math.sign(del)) * del;
    }
}
