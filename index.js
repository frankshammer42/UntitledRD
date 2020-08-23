//TODO: Refactor the image file
//TODO: Loading Screen?
// TODO: Change webcam order


import 'file-loader?name=[name].[ext]!./src/html/index.html';
import css from './src/main.css';
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
const firstSceneVid = require('./vids/scene01.mp4');
const thirdSceneVid = require('./vids/c5.mp4');

import TWEEN from "@tweenjs/tween.js";

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

// Video Related vars
let videoFirst;
let videoFirstTexture;
let videoWebCam;
let videoWebCamTexture;
let videoThird;
let videoThirdTexture;






//Scene Related variables
//TODO: We Need to have loading for the videos
let sceneState = 0;
let firstScenePhysarumPlay = false;
let thirdScenePlaying = false;
let thirdSceneStartTime = 0;
let thirdSceneSwitchStamps = [5, 50, 90];
let thirdSceneSwitchStampIndex = 0;

//gui
let gui;

//parameters for scenes group
let firstSceneGroupVal = {"decay": 0.9,  "sa": 7.6, "ra": 8.5, "so": 1, "ss":0.1, "guideWeight": 10};
// let secondSceneGroupVal = {"decay": 0.9,  "sa": 4, "ra": 4, "so": 8, "ss":8, "guideWeight": 10};
let thirdSceneGroupVal = {"decay": 0.9,  "sa": 2, "ra": 4, "so": 12, "ss":8, "guideWeight": 10};


// WebMidi.enable(function (err) {
//     if (err) {
//         console.log("WebMidi could not be enabled.", err);
//     } else {
//         console.log("WebMidi enabled!");
//     }
//     console.log(WebMidi.inputs);
//     let input = WebMidi.inputs[0];
//     // input.addListener('noteon', "all",
//     //     function (e) {
//     //
//     //     }
//     // );
//     input.addListener('controlchange', "all",
//         function (e) {
//             // console.log(e);
//             let scale;
//             let value;
//             switch (e.controller.number){
//                 case 3:
//                     scale = e.data[2]/127;
//                     value = scale * 10;
//                     agents.material.uniforms.guideWeight.value = value;
//                     break;
//                 case 9:
//                     scale = e.data[2]/127;
//                     updateAgentsMat.uniforms.sa.value = scale * 90;
//                     break;
//                 case 12:
//                     scale = e.data[2]/127;
//                     value = scale * 90;
//                     updateAgentsMat.uniforms.ra.value = value;
//                     break;
//                 case 13:
//                     scale = e.data[2]/127;
//                     value = scale*90;
//                     updateAgentsMat.uniforms.so.value = value;
//                     break;
//                 case 14:
//                     scale = e.data[2]/127;
//                     value = scale*10;
//                     updateAgentsMat.uniforms.ss.value = value;
//                     // console.log(value);
//                     break;
//                 case 15:
//                     scale = e.data[2]/127;
//             }
//         }
//     );
// });

function tweenCamParameters(){
    console.log("Function is called");
    let currentCamParam = Object.assign({}, firstSceneGroupVal);
    let camParamTWEEN = new TWEEN.Tween(currentCamParam).to(thirdSceneGroupVal, 10000).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(()=>{
            console.log("wtf");
            console.log(currentCamParam);
            updateSceneParameter(currentCamParam);
        })
        .onComplete(()=>{
            console.log("videFinsihed");
            videoFinished();
        })
        .start();
}

function getPixel( imagedata, x, y ) {
    let position = ( x + imagedata.width * y ) * 4, data = imagedata.data;
    return { r: data[ position ], g: data[ position + 1 ], b: data[ position + 2 ], a: data[ position + 3 ] };
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

function getImageData( image ) {
    let canvas = document.createElement( 'canvas' );
    canvas.width = image.width;
    canvas.height = image.height;
    let context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0 );
    return context.getImageData( 0, 0, image.width, image.height );
}

function onClick(){
    if (sceneState === 0){
        document.getElementById("Prompt").hidden = true;
        videoFirst.play();
        firstScenePhysarumPlay = true;
    }
    // setTimeout(initWebCam, 100000);
}

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
            ss: { value: 8},
            currentMousePosition: {value: new Vector2(0, 0)},
            guide_texture: {value: null},
            guideWeight: {value: 10}
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
            },
            guide_texture:{value: null}
        },
        vertexShader: require('./src/glsl/quadvs.glsl'),
        fragmentShader: require('./src/glsl/finalRender.glsl')
    });
}

function initPhysarumControl(){
    gui = new dat.GUI();
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

function randomNumberInCircle(radius){
    let randomRadius = radius * Math.random();
    let randomAngle =  Math.random() * 2 * Math.PI;
    let x = randomRadius * Math.cos(randomAngle);
    let y = randomRadius * Math.sin(randomAngle);
    y *= window.innerWidth / window.innerHeight;
    x += 0.5;
    y += 0.5;
    return [x,y];
}

function initPhysarum(){
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
        // let circlePoints = randomNumberInCircle(0.1);
        // ptexdata[id++] = circlePoints[0]; // normalized pos x
        // ptexdata[id++] = circlePoints[1]; // normalized pos y
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
    updateAgentsMat.uniforms.guide_texture.value = videoFirstTexture;
    // finalRenderMat.uniforms.guide_texture.value = videoTexture;
    materials.forEach( (mat)=>{mat.uniforms.resolution.value = resolution});
    controls = new Controls(renderer, agents);
    controls.count = 50;
    start = Date.now();
    time = 0;
 	initPhysarumControl();
}

function initWebCam(){
    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        let constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };
        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
            // apply the stream to the video element used in the texture
            videoWebCam.srcObject = stream;
            videoWebCam.play();
        } ).catch( function ( error ) {
            console.error( 'Unable to access the camera/webcam.', error );
        } );
    } else {
        console.error( 'MediaDevices interface not available.' );
    }
}


function updateSceneParameter(sceneParameter){
    trailRenderMat.uniforms.decay.value = sceneParameter.decay;
    updateAgentsMat.uniforms.sa.value = sceneParameter.sa;
    updateAgentsMat.uniforms.ra.value = sceneParameter.ra;
    updateAgentsMat.uniforms.so.value = sceneParameter.so;
    updateAgentsMat.uniforms.ss.value = sceneParameter.ss;
    updateAgentsMat.uniforms.guideWeight.value = sceneParameter.guideWeight;
}

function thirdSceneSwitchCircle(time){
    let initialSwitchTime = time;
    setTimeout(()=>{
        updateAgentsMat.uniforms.guide_texture.value = videoWebCamTexture;
        setTimeout(() => {
            updateAgentsMat.uniforms.guide_texture.value = videoThirdTexture;
        }, 2000);
    }, initialSwitchTime);
}


function thirdSceneCamSwitch(){
    let initialSwitchTime = 1000;
    thirdSceneSwitchCircle(initialSwitchTime);
    // thirdSceneSwitchCircle(initialSwitchTime + 5000);
    // thirdSceneSwitchCircle(initialSwitchTime + 9000);
}


function videoFinished(){
    console.log("Video Finished");
    if (sceneState === 0){
        sceneState += 1;
        initWebCam();
        tweenCamParameters();
        updateAgentsMat.uniforms.guide_texture.value = videoWebCamTexture;
    }
    else if (sceneState === 1){
        videoThird.play();
        updateAgentsMat.uniforms.guide_texture.value = videoThirdTexture;
        sceneState += 1;
        thirdScenePlaying = true;
        thirdSceneStartTime = Date.now()/1000;
    }
}

function init(){
    w = window.innerWidth;
    h = window.innerHeight;
    renderer = new WebGLRenderer({
        alpha: true
    });
    document.body.appendChild(renderer.domElement);
    window.addEventListener("click", function(event) {
        onClick();
    });
    renderer.setSize(w, h);
    scene = new Scene();
    camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
    camera.position.z = 1;
    // getImageTexture();

    videoFirst = document.getElementById( 'first' );
    videoFirst.src = firstSceneVid;
    videoFirst.addEventListener("ended", videoFinished, false);
    videoFirstTexture = new VideoTexture( videoFirst );

    videoWebCam = document.getElementById( 'second' );
    videoWebCam.src = firstSceneVid;
    videoWebCamTexture = new VideoTexture( videoWebCam );

    videoThird = document.getElementById( 'third' );
    videoThird.src = thirdSceneVid;
    videoThird.addEventListener("ended", videoFinished, false);
    videoThirdTexture = new VideoTexture( videoThird );


    initPhysarum();
    updateSceneParameter(firstSceneGroupVal);
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
    if (firstScenePhysarumPlay){
        renderPhysarum();
        TWEEN.update();
        if (thirdScenePlaying){
            let currentTime  = Date.now()/1000;
            console.log(currentTime - thirdSceneStartTime);
            if (thirdSceneSwitchStampIndex < thirdSceneSwitchStamps.length){
                if (currentTime - thirdSceneStartTime > thirdSceneSwitchStamps[thirdSceneSwitchStampIndex]){
                    console.log("cam Switch");
                    thirdSceneCamSwitch();
                    thirdSceneSwitchStampIndex += 1;
                }
            }
        }
    }
    renderer.setSize(w,h);
    renderer.clear();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

init();
animate();
