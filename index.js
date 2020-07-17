/*
1. How do we bake data into the texture
2. let's face it why people use webpack and how to use it
3. Why choose 512 as size, can it be 1024?

 */

import 'file-loader?name=[name].[ext]!./src/html/index.html';
import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    Mesh,
    PlaneBufferGeometry,
    ShaderMaterial,
    Vector2,
    TextureLoader,
    PerspectiveCamera
} from 'three';
import ComputeRender from "./src/ComputeRender"
import ParticleRender from "./src/ParticleRender"
import dat from "dat.gui";
import Controls from "./src/Controls";

const luan = require('./img/jueshi.png');


document.body.style.cursor = 'none';
let mousePos = new Vector2(0,0);
document.onmousemove = (event) => {
    let mouseX = event.clientX / innerWidth;
    let mouseY = event.clientX / innerHeight;
    mousePos = new Vector2(mouseX, mouseY);
};

let elem = document.body;
function openFullscreen() {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}
document.body.onmousedown = function() {
    openFullscreen();
};



// 0 configure scene
//////////////////////////////////////

let w = window.innerWidth;
let h = window.innerHeight;

const renderer = new WebGLRenderer({
    alpha: true
});
document.body.appendChild(renderer.domElement);
renderer.setSize(w, h);
const scene = new Scene();
const camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
camera.position.z = 1;

//TODO: Promisify the shit
// 0 Load Texture
//////////////////////////////////////
let imageData = null;
console.log(luan);
let imgTexture = new TextureLoader().load(luan, (result)=>{
    imageData = getImageData( result.image );
    let size = 512;  // particles amount = ( size ^ 2 )

    let count = size * size;
    let pos = new Float32Array(count * 3);
    let uvs = new Float32Array(count * 2);
    let ptexdata = new Float32Array(count * 4);


    let id = 0, u,v;
    for (let i = 0; i < count; i++) {

        id = i * 3;
        pos[id++] = pos[id++] = pos[id++] = 0;

        u = (i % size) / size;
        v = ~~(i / size) / size; //Nice trick man -> ~~ to floor operation
        id = i * 2;
        uvs[id++] = u;
        uvs[id] = v;

        id = i * 4;

        let x = i % size;
        let y = ~~(i / size);
        let pixel = getPixel(imageData, x, y);
        if (pixel.r !== 0){
            ptexdata[id++] = u; // normalized pos x
            ptexdata[id++] = v; // normalized pos y
            ptexdata[id++] = Math.random(); // normalized angle
            ptexdata[id++] = 1
        }
        else{
            ptexdata[id++] = 0; // normalized pos x
            ptexdata[id++] = 0; // normalized pos y
            ptexdata[id++] = 1; // normalized angle
            ptexdata[id++] = 1
        }
    }

// 2 data & trails
//////////////////////////////////////
//performs the diffusion and decay
    let trailRenderMat = new ShaderMaterial({
        uniforms: {
            points: { value: null },
            decay: {value: .9 }
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/trailRender.glsl')
    });
    let trails = new ComputeRender(w, h, trailRenderMat);


// 3 agents
//////////////////////////////////////

//moves agents around
    let updateAgentsMat = new ShaderMaterial({
        uniforms: {
            data: { value: null },
            sa: { value: 2 },
            ra: { value: 4 },
            so: { value: 12 },
            ss: { value: 1.1 },
            currentMousePosition: {value: new Vector2(0, 0)}
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/updateAgentsfs.glsl')
    });
    let agents = new ComputeRender(size, size, updateAgentsMat, ptexdata);


// 4 point cloud
//////////////////////////////////////

//renders the updated agents as red dots
    let renderAgentsMat = new ShaderMaterial({
        uniforms: {
            agents: {value: null}
        },
        vertexShader: require('./src/glsl/renderAgentsvs.glsl'),
        fragmentShader: require('./src/glsl/renderAgentsfs.glsl')
    });
    let particleRender = new ParticleRender(w, h, renderAgentsMat, pos, uvs);


// 5 post process
//////////////////////////////////////
    let finalRenderMat = new ShaderMaterial({
        uniforms: {
            data: {
                value: null
            }
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/finalRender.glsl')
    });
    let finalRenderMesh = new Mesh(new PlaneBufferGeometry(), finalRenderMat);
    finalRenderMesh.scale.set(w, h, 1);
    scene.add(finalRenderMesh);


// 6 interactive controls
//////////////////////////////////////
    let controls = new Controls(renderer, agents);
//controls.count = ~~(size * size * .05);
    controls.count = 50;


// animation loop
//////////////////////////////////////

    function raf(){
        time = (Date.now() - start) * 0.001;

        trails.material.uniforms.points.value = particleRender.texture;
        trails.render( renderer, time );

        agents.material.uniforms.data.value = trails.texture;
        agents.material.uniforms.currentMousePosition.value = mousePos ;
        agents.render(renderer, time);


        particleRender.material.uniforms.agents.value = agents.texture;
        particleRender.render(renderer, time);


        finalRenderMesh.material.uniforms.data.value = trails.texture;
        renderer.setSize(w,h);
        renderer.clear();
        renderer.render(scene, camera);
        requestAnimationFrame(raf);
    }

//////////////////////////////////////////////////

    let materials = [
        trailRenderMat, updateAgentsMat
    ];
    let resolution = new Vector2(w,h);
    materials.forEach( (mat)=>{mat.uniforms.resolution.value = resolution});

    let start = Date.now();
    let time = 0;

    raf();
});


function getImageData( image ) {
    let canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;
    let context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );
    return context.getImageData( 0, 0, image.width, image.height );
}

function getPixel( imagedata, x, y ) {
    let position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
}

// 1 init buffers 
//////////////////////////////////////


// settings
//////////////////////////////////////////////////

// let gui = new dat.GUI();
// gui.add(trailRenderMat.uniforms.decay, "value", 0.01, .99, .01).name("decay");
// gui.add(updateAgentsMat.uniforms.sa, "value", 1, 90, .1).name("sa");
// gui.add(updateAgentsMat.uniforms.ra, "value", 1, 90, .1).name("ra");
// gui.add(updateAgentsMat.uniforms.so, "value", 1, 90, .1).name("so");
// gui.add(updateAgentsMat.uniforms.ss, "value", 0.1, 10, .1).name("ss");
// gui.add(controls, "random");
// gui.add(controls, "radius", .001,.25);
// gui.add(controls, "count", 1, size*size, 1);

