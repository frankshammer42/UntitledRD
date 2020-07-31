/*

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
    VideoTexture
} from 'three';
import ComputeRender from "./src/ComputeRender"
import ParticleRender from "./src/ParticleRender"
import dat from "dat.gui";
import Controls from "./src/Controls";

const luan = require('./img/jueshi.png');
// document.body.style.cursor = 'none';
// let mousePos = new Vector2(0,0);
// document.onmousemove = (event) => {
//     let mouseX = event.clientX / innerWidth;
//     let mouseY = event.clientX / innerHeight;
//     mousePos = new Vector2(mouseX, mouseY);
// };
//
// let elem = document.body;
// function openFullscreen() {
//     if (elem.requestFullscreen) {
//         elem.requestFullscreen();
//     } else if (elem.mozRequestFullScreen) { /* Firefox */
//         elem.mozRequestFullScreen();
//     } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
//         elem.webkitRequestFullscreen();
//     } else if (elem.msRequestFullscreen) { /* IE/Edge */
//         elem.msRequestFullscreen();
//     }
// }
// document.body.onmousedown = function() {
//     openFullscreen();
// };

let scene;
let camera;
let w;
let h;
let renderer;

let size;
let pos;
let uvs;
let count;
let ptexdata;
let start;
let time;
let imageData;
let gotImageData;
let physarumInitialized;

let trailRenderMat;
let updateAgentsMat;
let renderAgentsMat;
let finalRenderMat;
let trails;
let agents;
let particleRender;
let finalRenderMesh;

let controls;

let video;
let videoTexture;

function createFBO(){
    trails = new ComputeRender(w, h, trailRenderMat);
    agents = new ComputeRender(size, size, updateAgentsMat, ptexdata);
    particleRender = new ParticleRender(w, h, renderAgentsMat, pos, uvs);
    finalRenderMesh = new Mesh(new PlaneBufferGeometry(), finalRenderMat);
    finalRenderMesh.scale.set(w, h, 1);
    scene.add(finalRenderMesh);
}

function createMat(){
    trailRenderMat = new ShaderMaterial({
        uniforms: {
            points: { value: null },
            decay: {value: .9 }
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/trailRender.glsl')
    });
    updateAgentsMat = new ShaderMaterial({
        uniforms: {
            data: { value: null },
            sa: { value: 2 },
            ra: { value: 4 },
            so: { value: 12 },
            ss: { value: 1.1 },
            currentMousePosition: {value: new Vector2(0, 0)},
            guide_texture: {value: null},
            guideWeight: {value: 0}
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/updateAgentsfs.glsl')
    });
    renderAgentsMat = new ShaderMaterial({
        uniforms: {
            agents: {value: null}
        },
        vertexShader: require('./src/glsl/renderAgentsvs.glsl'),
        fragmentShader: require('./src/glsl/renderAgentsfs.glsl')
    });
    finalRenderMat = new ShaderMaterial({
        uniforms: {
            data: {
                value: null
            }
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/finalRender.glsl')
    });
}

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

function initPhysarumControl(){
    let gui = new dat.GUI();
    gui.add(trailRenderMat.uniforms.decay, "value", 0.01, .99, .01).name("decay");
    gui.add(updateAgentsMat.uniforms.sa, "value", 1, 90, .1).name("sa");
    gui.add(updateAgentsMat.uniforms.ra, "value", 1, 90, .1).name("ra");
    gui.add(updateAgentsMat.uniforms.so, "value", 1, 90, .1).name("so");
    gui.add(updateAgentsMat.uniforms.ss, "value", 0.1, 10, .1).name("ss");
    gui.add(updateAgentsMat.uniforms.guideWeight, "value", 0, 10, .1).name("guideWeight");
    gui.add(controls, "random");
    gui.add(controls, "radius", .001,.25);
    gui.add(controls, "count", 1, size*size, 1);
}

function initPhysarum(imageData, imageTexture){
    size = 1024;  // particles amount = ( size ^ 2 )
    count = size * size;
    pos = new Float32Array(count * 3);
    uvs = new Float32Array(count * 2);
    ptexdata = new Float32Array(count * 4);
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
        //In here we import the data
        // if (pixel.r !== 0){
        //     ptexdata[id++] = u; // normalized pos x
        //     ptexdata[id++] = v; // normalized pos y
        //     ptexdata[id++] = Math.random(); // normalized angle
        //     ptexdata[id++] = 1
        // }
        // else{
        //     ptexdata[id++] = 0; // normalized pos x
        //     ptexdata[id++] = 0; // normalized pos y
        //     ptexdata[id++] = 1; // normalized angle
        //     ptexdata[id++] = 1
        // }
        ptexdata[id++] = Math.random(); // normalized pos x
        ptexdata[id++] = Math.random(); // normalized pos y
        ptexdata[id++] = 1; // normalized angle
        ptexdata[id++] = 1
    }
    createMat();
    createFBO();
    let materials = [
        trailRenderMat, updateAgentsMat
    ];
    let resolution = new Vector2(w,h);
    updateAgentsMat.uniforms.guide_texture.value = videoTexture;
    materials.forEach( (mat)=>{mat.uniforms.resolution.value = resolution});
    controls = new Controls(renderer, agents);
    controls.count = 50;
    start = Date.now();
    time = 0;
    initPhysarumControl();
}

function getImageTexture(){
    imageData = null;
    let imgTexture = new TextureLoader().load(luan, (result)=>{
        gotImageData = true;
        imageData = getImageData( result.image );
        initPhysarum(imageData, result);
        physarumInitialized = true;
    });
}

function initWebCam(){
    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        let constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };
        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
            // apply the stream to the video element used in the texture
            video.srcObject = stream;
            video.play();
        } ).catch( function ( error ) {
            console.error( 'Unable to access the camera/webcam.', error );
        } );
    } else {
        console.error( 'MediaDevices interface not available.' );
    }
}

function init(){
    w = window.innerWidth;
    h = window.innerHeight;
    renderer = new WebGLRenderer({
        alpha: true
    });
    document.body.appendChild(renderer.domElement);
    renderer.setSize(w, h);
    scene = new Scene();
    camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
    camera.position.z = 1;
    getImageTexture();
    video = document.getElementById( 'video' );
    initWebCam();
    videoTexture = new VideoTexture( video );
}

function renderPhysarum(){
    time = (Date.now() - start) * 0.001;
    trails.material.uniforms.points.value = particleRender.texture;
    trails.render( renderer, time );

    agents.material.uniforms.data.value = trails.texture;
    agents.render(renderer, time);

    particleRender.material.uniforms.agents.value = agents.texture;
    particleRender.render(renderer, time);

    finalRenderMesh.material.uniforms.data.value = trails.texture;
}

function animate(){
    if (physarumInitialized){
        renderPhysarum();
    }
    renderer.setSize(w,h);
    renderer.clear();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

init();
animate();


