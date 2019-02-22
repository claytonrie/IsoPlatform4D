const nearClip = 1, farClip = 1000;
var width = 320, height = 240;
var aspect = width / height;
var glScene, glCamera, glRenderer, glRenderTarget, glComposer, glClock;
var EDShaderPass;

const foreLowerThresh = "0.01", foreUpperThresh = "0.1";
var CustomShade = {};
CustomShade.EdgeDetect = {
    uniforms: {
        "tDiffuse": { value: null },
        "tDepth": { value: null },
        "resolution": { value: new THREE.Vector2() },
        "nearClip":  { value: nearClip },
        "farClip":  { value: farClip },
        "iTime":  { value: 1.0 }
    },

    vertexShader:
        `varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,

    fragmentShader: 
        `#include <packing>
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 resolution;
        uniform float nearClip;
        uniform float farClip;
        uniform float iTime;
        varying vec2 vUv;

        float getDepth( vec2 coord ) {
            float fragCoordZ = texture2D( tDepth, coord ).x;
            float viewZ = perspectiveDepthToViewZ( fragCoordZ, nearClip, farClip );
            return viewZToOrthographicDepth( viewZ, nearClip, farClip ) * (farClip - nearClip);
        }
        
        float ED( float p1, float p2, float pb, float sensitivity ) {
            float diff = abs(p1 + p2 - 2. * pb);
            return smoothstep(0.000, 0.0005 * sensitivity, diff);
        }
        
        float clipEdge(float d) {
            return smoothstep(${foreLowerThresh}, ${foreUpperThresh}, d);
        }

        float onEdge(vec2 pos, float sensitivity) {
            vec2 texel = vec2( 1.0 / resolution.x, 1.0 / resolution.y );
            float ty0 = getDepth( pos + texel * vec2(-1,  0) );
            float tx0 = getDepth( pos + texel * vec2( 0, -1) );
            float t1  = getDepth( pos );
            float tx2 = getDepth( pos + texel * vec2( 0,  1) );
            float ty2 = getDepth( pos + texel * vec2( 1,  0) );
            
            float valX = ED(tx0, tx2, t1, sensitivity); 
            float valY = ED(ty0, ty2, t1, sensitivity); 

            float farDetect = clipEdge(ty0) * clipEdge(tx0) * clipEdge(t1) * clipEdge(tx2) * clipEdge(ty2);
            farDetect = pow(farDetect, 0.2);
            return max(valX, valY) * farDetect;
        }
        
        float noise(vec2 inp) {
            float large = 35227. * sin(25943. * inp.x) + 25943. * cos(35227. * inp.y);
            return mod(abs(large), 161.);
        }
        
        void main() {
            vec2 texel = vec2( 1.0 / resolution.x, 1.0 / resolution.y );
            // fetch the neighbours of a fragment
            float depth = getDepth(vUv);
            float aDepth = abs(depth - getDepth(vUv + texel * vec2(1,  0)));
            aDepth      += abs(depth - getDepth(vUv + texel * vec2( -1, 0)));
            aDepth      += abs(depth - getDepth(vUv + texel * vec2( 0,  1)));
            aDepth      += abs(depth - getDepth(vUv + texel * vec2( 0, -1)));
            aDepth /= 8.;
            
            
            float sum = 0.;
            for ( int i = -4; i <= 4; i += 1) {
                for ( int j = -4; j <= 4; j += 1) {
                    float len = length(vec2(i, j)) - 0.;
                    if (len > 4. || len < 1.) {
                        continue;
                    }
                    vec2 newLoc = vUv + texel * vec2(i, j);
                    float diff = smoothstep(depth - aDepth, depth + aDepth, 
                        getDepth(newLoc)); 
                    float sine = sin(2. * iTime + radians(noise(newLoc) * 1.118) / 2. + 
                        3. * 6.28 * newLoc.x) * sin(2. * iTime + 
                        radians(noise(newLoc + 0.1) * 1.118) / 2. + 3. * 6.28 * newLoc.y);
                    sum += onEdge(vUv + texel * vec2(i, j), len + 1.) *
                        (diff * abs(sine) / len + (1. - diff) * exp(- len));
                }
            }
            float trueEdge = onEdge(vUv, 1.);
            float G = max(clamp(sum / 4.0, 0., 1.), 2. * 0.8 * trueEdge);
            gl_FragColor = vec4( (1.0 - G * 0.5) * texture2D(tDiffuse, vUv).rbg , 1 );
        }`
};

CustomShade.NormalShader = new THREE.ShaderMaterial({
    uniforms: {
        "color": { value: new THREE.Vector3() },
        "aVal":  { value: 1.0 },
        "nearClip":  { value: nearClip },
        "farClip":  { value: farClip }
    },

    vertexShader:
        `varying float depth;
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            depth = (modelViewMatrix * vec4(position, 1.)).z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }`,

    fragmentShader: 
        `#include <packing>
        uniform vec3 color;
        uniform float aVal;
        uniform float nearClip;
        uniform float farClip;
        varying float depth;
        varying vec2 vUv;
        
        void main() {
            float truDepth = viewZToOrthographicDepth(depth, nearClip, farClip);
            float aMult = smoothstep(${foreLowerThresh}, ${foreUpperThresh}, truDepth);
            
            gl_FragColor = vec4(color, aMult * aVal);
        }`
});

CustomShade.LavaShader = new THREE.ShaderMaterial({
    uniforms: {
        "color": { value: new THREE.Vector3() },
        "aVal":  { value: 1.0 },
        "iTime":  { value: 0.0 },
        "nearClip":  { value: nearClip },
        "farClip":  { value: farClip },
        "seed": { value: 0.0 }
    },

    vertexShader:
        `uniform float iTime;
        varying float depth;
        varying vec2 vUv;
        
        float noise(vec2 inp) {
            float large = 35227. * sin(25943. * inp.x) + 25943. * cos(35227. * inp.y);
            return mod(abs(large), 161.);
        }
        
        void main() {
            vec3 posRand = position;
            posRand.x += sin((noise(position.yz) / 161. + 1.) * 2. * iTime);
            posRand.y += sin((noise(position.xz) / 161. + 1.) * 2. * iTime);
            posRand.z += sin((noise(position.xy) / 161. + 1.) * 2. * iTime);
            depth = (modelViewMatrix * vec4(posRand, 1.)).z;
            vUv = (projectionMatrix * modelViewMatrix * vec4(posRand, 1.)).xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(posRand, 1.);
        }`,

    fragmentShader: 
        `#include <packing>
        uniform vec3 color;
        uniform float aVal;
        uniform float seed;
        uniform float iTime;
        uniform float nearClip;
        uniform float farClip;
        varying float depth;
        varying vec2 vUv;
        
        float noise(vec2 inp) {
            float large = 35227. * sin(25943. * inp.x) + 25943. * cos(35227. * inp.y);
            return mod(abs(large), 161.);
        }
        
        vec3 multSpot(vec2 pos) {
            vec3 posRand;
            posRand.x = sin((noise(pos + seed) / 161. + 1.) * 1. * iTime);
            posRand.y = sin((noise(pos + seed + 0.1) / 161. + 1.) * 1. * iTime);
            posRand.z = sin((noise(pos + seed + 0.2) / 161. + 1.) * 1. * iTime);
            return posRand * posRand;
        }
        
        void main() {
            float truDepth = viewZToOrthographicDepth(depth, nearClip, farClip);
            float aMult = smoothstep(${foreLowerThresh}, ${foreUpperThresh}, truDepth);
        
            float pixVal = 5.;
            vec3 realMult = vec3(0., 0., 0.);
            float div = 0.;
            float X = vUv.x * pixVal; float Y = vUv.y * pixVal;
            
            vec2 spot = vec2(floor(X) / pixVal, floor(Y) / pixVal);
            if (distance(spot, vUv) < 0.005) {
                gl_FragColor = vec4(multSpot(spot) * color , aVal);
            }
            float dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(floor(X) / pixVal, ceil(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(ceil(X) / pixVal, floor(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(ceil(X) / pixVal, ceil(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            realMult /= div + dist;
            gl_FragColor = vec4((realMult * 0.333 + 0.667) * color , aMult * aVal);
        }`
});

CustomShade.WaterShader = new THREE.ShaderMaterial({
    uniforms: {
        "color": { value: new THREE.Vector3() },
        "aVal":  { value: 1.0 },
        "iTime":  { value: 0.0 },
        "nearClip":  { value: nearClip },
        "farClip":  { value: farClip },
        "seed": { value: 0.0 }
    },

    vertexShader:
        `uniform float iTime;
        uniform float seed;
        varying float depth;
        varying vec2 vUv;
        
        float noise(vec2 inp) {
            float large = 35227. * sin(25943. * inp.x) + 25943. * cos(35227. * inp.y);
            return mod(abs(large), 161.);
        }
        
        void main() {
            vec3 posRand = position;
            posRand.y += 1. * sin((noise(position.yz) / 161. + 1.) * 2. * iTime);
            depth = (modelViewMatrix * vec4(posRand, 1.)).z;
            vUv = (projectionMatrix * modelViewMatrix * vec4(posRand, 1.)).xy - seed;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(posRand, 1.);
        }`,

    fragmentShader: 
        `#include <packing>
        uniform vec3 color;
        uniform float aVal;
        uniform float seed;
        uniform float iTime;
        uniform float nearClip;
        uniform float farClip;
        varying float depth;
        varying vec2 vUv;
        
        float noise(vec2 inp) {
            float large = 35227. * sin(25943. * inp.x) + 25943. * cos(35227. * inp.y);
            return mod(abs(large), 161.);
        }
        
        vec3 multSpot(vec2 pos) {
            vec3 posRand;
            posRand.x = sin((noise(pos + seed) / 161. + 1.) * 1. * iTime);
            posRand.y = sin((noise(pos + seed + 0.1) / 161. + 1.) * 1. * iTime);
            posRand.z = sin((noise(pos + seed + 0.2) / 161. + 1.) * 1. * iTime);
            return posRand * posRand;
        }
        
        void main() {
            float truDepth = viewZToOrthographicDepth(depth, nearClip, farClip);
            float aMult = smoothstep(${foreLowerThresh}, ${foreUpperThresh}, truDepth);
            
            float pixVal = 15.;
            vec3 realMult = vec3(0., 0., 0.);
            float div = 0.;
            float X = vUv.x * pixVal; float Y = vUv.y * pixVal;
            
            vec2 spot = vec2(floor(X) / pixVal, floor(Y) / pixVal);
            if (distance(spot, vUv) < 0.005) {
                gl_FragColor = vec4(multSpot(spot) * color , aVal);
            }
            float dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(floor(X) / pixVal, ceil(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(ceil(X) / pixVal, floor(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            div += dist;
            
            spot = vec2(ceil(X) / pixVal, ceil(Y) / pixVal);
            dist = 1. / (abs(spot - vUv).x * abs(spot - vUv).y);
            realMult += dist * multSpot(spot);
            realMult /= div + dist;
            gl_FragColor = vec4(vec3(1.) * realMult * 0.4 + 0.6 * color * (1. - realMult), 
                aMult *  0.65 * aVal);
        }`
});

// Generates different shader materials depending on the 
CustomShade.NormalMat = class {
    constructor (r, g, b, a) {
        //let newMat = new THREE.MeshBasicMaterial({ color: (new THREE.Color(r, g, b)).getHex() });
        let newMat = CustomShade.NormalShader.clone();
        newMat.uniforms.color.value = new THREE.Color(r, g, b);
        newMat.needTime = false;
        newMat.transparent = true;
        newMat.opacity = a;
        return newMat;
    }
};
CustomShade.LavaMat = class {
    constructor (r, g, b, a) {
        let newMat = CustomShade.LavaShader.clone();
        newMat.uniforms.color.value = new THREE.Color(r, g, b);
        newMat.needTime = true;
        newMat.transparent = true;
        newMat.opacity = a;
        return newMat;
    }
};
CustomShade.WaterMat = class {
    constructor (r, g, b, a) {
        let newMat = CustomShade.WaterShader.clone();
        newMat.uniforms.color.value = new THREE.Color(r, g, b);
        newMat.needTime = true;
        newMat.transparent = true;
        newMat.opacity = a;
        return newMat;
    }
};

// Generates an upright prism with the base defined by `vertices`
THREE.PrismGeometry = function (vertices, height) {
    let Shape = new THREE.Shape();

    (function (ctx) {
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (var i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.lineTo(vertices[0].x, vertices[0].y);
    })(Shape);

    var settings = {};
    settings.depth = height;
    settings.bevelEnabled = false;
    THREE.ExtrudeGeometry.call(this, Shape, settings);
    this.rotateX(Math.PI / 2);
    this.translate(0, height / 2, 0);
};
THREE.PrismGeometry.prototype = Object.create(THREE.ExtrudeGeometry.prototype);


// Initializes the WebGL renderer
function glInit() {
    glScene = new THREE.Scene();
    
    // Set up an isometric camera
    const d = 100;
    glCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, nearClip, farClip);
    glCamera.position.set(d, d, d);
    glCamera.lookAt(glScene.position);
    
    // Set up Three.js instance of a webGL renderer and its target
    glRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    glRenderer.setSize(width, height);
    glRenderer.setClearColor(0xFFFFFF);
    document.body.appendChild(glRenderer.domElement);
    
    let parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
                      format: THREE.RGBFormat, stencilBuffer: true };
    glRenderTarget = new THREE.WebGLRenderTarget(width, height, parameters);
    // Specify a depth texture to write to
    // TODO: Possibly remove?
    glRenderTarget.depthTexture = new THREE.DepthTexture();
    glRenderTarget.depthTexture.type = THREE.UnsignedShortType;
    
    // Set up effect composer, a class that compliments Three.js
    //     Used to easy apply post-render shading
    glComposer = new THREE.EffectComposer(glRenderer, glRenderTarget);
    glComposer.addPass(new THREE.RenderPass(glScene, glCamera));
    
    // Initialize the post-render edge detection shader pass
    EDShaderPass = new THREE.ShaderPass(CustomShade.EdgeDetect);
    EDShaderPass.renderToScreen = true;
    EDShaderPass.uniforms.resolution.value.x = width;
    EDShaderPass.uniforms.resolution.value.y = height;
    glComposer.addPass(EDShaderPass);
    
    // Initialize the Three.js clock
    glClock = new THREE.Clock(true);
}

// Function to render the current scene 
function glRender(dt, tt) {
    // Update the depth texture to use in the edge dectection pass
    EDShaderPass.uniforms.tDepth.value = glRenderTarget.depthTexture;
    EDShaderPass.uniforms.iTime.value = tt % 500;
    // Render the scene
    glComposer.render();
}

//glInit();
