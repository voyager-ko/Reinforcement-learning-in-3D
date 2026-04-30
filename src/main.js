import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DrawingRoad } from "./draw";
import { ReinforcementLearningAgent } from "./reinforcmet_agent.js";
import { Robot } from "./robot.js";
import { LearningStatusUI } from "./status.js";
import { CameraController } from "./cameraController.js";


// イベントの管理
const keys = {};

//// 初期化
// レンダラーを作成
const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// シーンを作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// カメラを作成
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let camera_controller = new CameraController();

// 平行光源を作成
// new THREE.DirectionalLight(色, 光の強さ)
const light = new THREE.DirectionalLight(0xFFFFFF, 3);
scene.add(light);


// 道の準備
let road = [[0, 0]];
const floor_group = new THREE.Group();
scene.add(floor_group);

const controlPoints = [
  new THREE.Vector3(-10, 0, 15),
  new THREE.Vector3(-4, 0, 5),
  new THREE.Vector3(-2, 0, -5),
  new THREE.Vector3(-5, 0, -15)
];

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.72,
  metalness: 0.05,
});

const roadEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0xff5c6b,
  transparent: true,
  opacity: 0.78,
});

const centerLineMaterial = new THREE.LineDashedMaterial({
  color: 0xb8ffd2,
  dashSize: 0.75,
  gapSize: 0.48,
  transparent: true,
  opacity: 0.72,
});

const startMaterial = new THREE.MeshStandardMaterial({
  color: 0x5cf2ad,
  emissive: 0x123c2a,
  roughness: 0.42,
});

const goalMaterial = new THREE.MeshStandardMaterial({
  color: 0xf6d35f,
  emissive: 0x4a3106,
  roughness: 0.35,
  metalness: 0.2,
});

const drawingRoad = new DrawingRoad({
  controlPoints,
  roadWidth: 4.5,
  sampleCount: 440,
  material: roadMaterial,
  edgeMaterial: roadEdgeMaterial,
  centerLineMaterial,
  startMaterial,
  goalMaterial,
});
const roadGroup = drawingRoad.create();
scene.add(roadGroup);

const learningUI = new LearningStatusUI({
  title: "ロボット学習状況",
});


const robot = new Robot({
  startPosition: drawingRoad.getStartPoint(),
  startHeading: 0,
});

scene.add(robot.getObject3D());


const agent = new ReinforcementLearningAgent({
  robot: robot.getStateObject(),
  robotGroup: robot.getObject3D(),
  road: drawingRoad,
});



window.addEventListener("mousedown", (event) =>{
  camera_controller.isMouseDonw = true;
  camera_controller.ex_mouseX = event.pageX;
  camera_controller.ex_mouseY = event.pageY;
});

window.addEventListener("mouseup", () => {
  camera_controller.isMouseDonw = false;
});

window.addEventListener("mousemove", (event) => {
  camera_controller.mouseMove(event);
});

window.addEventListener("keydown", (event) => {
  camera_controller.isKeyDonw = true;
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  camera_controller.isKeyDonw = false;
  keys[event.key.toLowerCase()] = false;
});


//// 開始！！
agent.start();
// 毎フレーム時に実行されるループイベントです
function tick() {
    // 毎フレーム学習を1ステップ進める
    renderer.render(scene, camera);


    // update
    if(camera_controller.isKeyDonw === true){
      camera_controller.keyMove(keys);
    } 
    agent.update();
    learningUI.update(agent.getLearningInfo());
    camera_controller.update(camera);
}

renderer.setAnimationLoop(tick);
