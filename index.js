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
const firstSceneVid = require('./vids/first.mp4');
const thirdSceneVid = require('./vids/third.mp4');

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

let textureSArray = [];



//Scene Related variables
//TODO: We Need to have loading for the videos
let sceneState = 0;
let firstScenePhysarumPlay = false;
let thirdScenePlaying = false;
let thirdSceneStartTime = 0;

let thirdSceneSwitchStamps = [10, 32];
let thirdSceneSwitchStampIndex = 0;

// We can make it purely random
let forthSceneSwitchStamps = [5, 7, 10, 12, 18, 20, 25, 29, 31, 32];
let forthSceneSwitchVidIndex = [0, 1, 2, 1, 0, 2, 0, 1, 2, 1];


let forthScenePlaying = false;
let forthSceneStartTime = 0;
let forthSceneSwitchStampIndex = 0;


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

function sceneFourCutGenerate(){
    let numberOfCuts = 20;
    let prevTime = 0;
    forthSceneSwitchStamps = [];
    for (let i=0; i<numberOfCuts; i++){
        let cutAdd = 1 + Math.random();
        let currentTime = cutAdd + prevTime;
        forthSceneSwitchStamps.push(currentTime);
        prevTime = currentTime;
        if (i < numberOfCuts - 1){
            if (i === 0){
                let cutIndex = Math.floor(Math.random() * 3);
                forthSceneSwitchVidIndex.push(cutIndex);
            }
            else{
                let prevIndex = forthSceneSwitchVidIndex[i-1];
                let currentIndex = Math.floor(Math.random() * 3);
                while (currentIndex === prevIndex){
                    currentIndex = Math.floor(Math.random() * 3);
                }
                forthSceneSwitchVidIndex.push(currentIndex);
            }
        }
        else{
            forthSceneSwitchVidIndex.push(1);
        }
    }
    console.log(forthSceneSwitchStamps);
    console.log(forthSceneSwitchVidIndex);
}

function tweenCamParameters(start, target, time){
    let currentCamParam = Object.assign({}, start);
    let camParamTWEEN = new TWEEN.Tween(currentCamParam).to(target, time).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(()=>{
            console.log("wtf");
            console.log(currentCamParam);
            updateSceneParameter(currentCamParam);
        })
        .onComplete(()=>{
            videoFinished();
        })
        .start();
}

function onClick(){
    if (sceneState === 0){
        document.getElementById("center").hidden = true;
        document.getElementById("require").hidden = true;
        document.getElementById("menubar").hidden = true;
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
 	// initPhysarumControl();
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

function forthSceneCamSwitch(){
    let videoIndex =  forthSceneSwitchVidIndex[forthSceneSwitchStampIndex];
    updateAgentsMat.uniforms.guide_texture.value = textureSArray[videoIndex];

}

function videoFinished(){
    console.log("Video Finished");
    if (sceneState === 0){
        sceneState += 1;
        initWebCam();
        tweenCamParameters(firstSceneGroupVal, thirdSceneGroupVal, 40000);
        updateAgentsMat.uniforms.guide_texture.value = videoWebCamTexture;
    }
    else if (sceneState === 1){
        videoThird.play();
        updateAgentsMat.uniforms.guide_texture.value = videoThirdTexture;
        sceneState += 1;
        thirdScenePlaying = true;
        thirdSceneStartTime = Date.now()/1000;
    }
    else if (sceneState === 2){
        videoFirst.currentTime = 0;
        videoThird.currentTime = 0;
        videoFirst.play();
        videoThird.play();

        //TODO: Maybe looping that shit?
        videoFirst.removeEventListener("ended", videoFinished);
        videoThird.removeEventListener("ended", videoFinished);

        videoFirst.addEventListener("ended", ()=>{console.log("should be this shit")}, false);
        videoThird.addEventListener("ended", ()=>{console.log("should be this shit")}, false);

        updateAgentsMat.uniforms.guide_texture.value = videoWebCamTexture;
        sceneState += 1;
        thirdScenePlaying = false;
        forthSceneStartTime = Date.now()/1000;
        forthScenePlaying = true;
        console.log("start to make chose");
        let forthSceneGroupVal = {"decay": 0.9,  "sa": 2, "ra": 4, "so": 50, "ss":8, "guideWeight": 10};
        tweenCamParameters(thirdSceneGroupVal, forthSceneGroupVal, 50000);
    }
    else if (sceneState === 3){
        let current = {"decay": 0.9,  "sa": 2, "ra": 4, "so": 50, "ss":8, "guideWeight": 10};
        let target = {"decay": 0.9,  "sa": 2, "ra": 4, "so": 12, "ss":8, "guideWeight": 10};
        sceneState += 1;
        tweenCamParameters(current, target,  20000);
    }
    else if (sceneState === 4){
        let current = {"decay": 0.9,  "sa": 2, "ra": 4, "so": 12, "ss":8, "guideWeight": 10};
        let target = {"decay": 0.0,  "sa": 2, "ra": 4, "so": 12, "ss":8, "guideWeight": 10};
        tweenCamParameters(current, target,  20000);
        sceneState += 1;
    }
    else if (sceneState === 5){
        console.log("jump");
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

    textureSArray = [videoFirstTexture, videoWebCamTexture, videoThirdTexture];

    sceneFourCutGenerate();

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
            if (thirdSceneSwitchStampIndex < thirdSceneSwitchStamps.length){
                if (currentTime - thirdSceneStartTime > thirdSceneSwitchStamps[thirdSceneSwitchStampIndex]){
                    console.log("third cam Switch");
                    thirdSceneCamSwitch();
                    thirdSceneSwitchStampIndex += 1;
                }
            }
        }
        if (forthScenePlaying){
            let currentTime  = Date.now()/1000;
            if (forthSceneSwitchStampIndex < forthSceneSwitchStamps.length){
                if (currentTime - forthSceneStartTime > forthSceneSwitchStamps[forthSceneSwitchStampIndex]){
                    console.log("forth cam Switch");
                    forthSceneCamSwitch();
                    forthSceneSwitchStampIndex += 1;
                }
            }
            else{
                forthScenePlaying = false;
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
