import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MakingRoad } from "./draw";



 // サイズを指定
const width = 960;
const height = 540;

let rot = 0;
let ex_mouseX = 0;
let ex_mouseY = 0;
let dx = 0;
let dy = 0;
let r = 0.1;

let theta = 0;
let theta1= 0;
let speed = 1.3;

let cameraLookAt = [0, 0, 0];
let cameraPos = [0, 700, 0];
let isMouseDown = false;

cameraLookAt[0] = cameraPos[0] + r * Math.sin(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);
cameraLookAt[1] = cameraPos[1] + r * Math.sin(theta1 * Math.PI / 180);
cameraLookAt[2] = cameraPos[2] + r * Math.cos(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);



// レンダラーを作成
const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.setAnimationLoop(tick);

// シーンを作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// カメラを作成
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 0, 0);
camera.lookAt(new THREE.Vector3(0, 0, 0));


// 点光源を作成
// new THREE.PointLight(色, 光の強さ, 距離, 光の減衰率)
const light = new THREE.PointLight(0xffffff, 2, 50, 1.0);
scene.add(light);

// 照明を可視化するヘルパー
const lightHelper = new THREE.PointLightHelper(light);
scene.add(lightHelper);

window.addEventListener("mousedown", (event) =>{
  isMouseDown = true;

  ex_mouseX = event.pageX;
  ex_mouseY = event.pageY;
});

window.addEventListener("mouseup", () => {
  isMouseDown = false;
});

window.addEventListener("mousemove", (event) => {
    
    if(!isMouseDown){
      return;
    }

    console.log("HELLO");
    dx = (event.pageX - ex_mouseX);
    dy = (event.pageY - ex_mouseY);
    console.log(dx);

    theta += dx * 0.1;
    theta1 += dy * 0.1;
    theta1 = Math.max(-89, Math.min(89, theta1));

    cameraLookAt[0] = cameraPos[0] + r * Math.sin(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);
    cameraLookAt[1] = cameraPos[1] + r * Math.sin((theta1 * Math.PI) / 180);
    cameraLookAt[2] = cameraPos[2] + r * Math.cos(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);

    console.log(theta1);
    console.log(theta);
    ex_mouseX = event.pageX;
    ex_mouseY = event.pageY;
});

const keys = {};

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

function keyMove(){
    cameraPos[0] += 0.8 * Math.sin(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);
    cameraPos[1] += 0.8 * Math.sin((theta1 * Math.PI) / 180);
    cameraPos[2] += 0.8 * Math.cos(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);

    cameraLookAt[0] += 0.8 * Math.sin(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);
    cameraLookAt[1] += 0.8 * Math.sin((theta1 * Math.PI) / 180);
    cameraLookAt[2] += 0.8 * Math.cos(theta * Math.PI / 180) * Math.cos(theta1 * Math.PI / 180);
} 



// 毎フレーム時に実行されるループイベントです
function tick() {
  // レンダリング
  renderer.render(scene, camera);

  if(keys["w"]) keyMove();

  camera.lookAt(new THREE.Vector3(cameraLookAt[0], cameraLookAt[1], cameraLookAt[2]));
  camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

}
