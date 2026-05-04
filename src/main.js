import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DrawingRoad } from "./draw";
import { ReinforcementLearningAgent } from "./reinforcmet_agent.js";
import { Robot } from "./robot.js";
import { LearningStatusUI } from "./status.js";
import { CameraController } from "./cameraController.js";


const keys = {};

const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let camera_controller = new CameraController();

const light = new THREE.DirectionalLight(0xFFFFFF, 3);
scene.add(light);

// 道のマテリアル (再利用のためモジュール上位に定義)
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

// 道路オブジェクト (buildRoad で差し替え可能)
let drawingRoad = null;
let roadGroup = null;

function buildRoad(controlPoints) {
  if (roadGroup) scene.remove(roadGroup);

  drawingRoad = new DrawingRoad({
    controlPoints,
    roadWidth: 7.5,
    sampleCount: 440,
    material: roadMaterial,
    edgeMaterial: roadEdgeMaterial,
    centerLineMaterial,
    startMaterial,
    goalMaterial,
  });

  roadGroup = drawingRoad.create();
  scene.add(roadGroup);
}

// 迷路ビルダー側HTMLから呼ばれるブリッジ
// plainPoints: [{x, y, z}, ...] の配列
window.rebuildRoad = (plainPoints) => {
  const controlPoints = plainPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
  buildRoad(controlPoints);
  const { count, alpha, gamma } = readSettings();
  buildAgents(count, alpha, gamma, false);
};


const learningUI = new LearningStatusUI({
  title: "ロボット学習状況",
});

const CAR_COLORS = [
  0xffd166,
  0xff6b9d,
  0x6bd4ff,
  0xa8ff6b,
  0xff9f6b,
  0xd06bff,
  0xff6b6b,
  0x6bffe8,
];

let agents = [];
let robots = [];
const sharedQTable = new Map();

function buildAgents(count, alpha, gamma, keepTable = false) {
  robots.forEach(r => scene.remove(r.getObject3D()));
  agents = [];
  robots = [];
  if (!keepTable) {
    sharedQTable.clear();
  }

  for (let i = 0; i < count; i++) {
    const robot = new Robot({
      startPosition: drawingRoad.getStartPoint(),
      startHeading: 0,
      materials: {
        body: new THREE.MeshStandardMaterial({
          color: CAR_COLORS[i % CAR_COLORS.length],
          roughness: 0.5,
          metalness: 0.25,
        }),
      },
    });
    scene.add(robot.getObject3D());

    const agent = new ReinforcementLearningAgent({
      robot: robot.getStateObject(),
      robotGroup: robot.getObject3D(),
      road: drawingRoad,
      qTable: sharedQTable,
      alpha,
      gamma,
    });

    robots.push(robot);
    agents.push(agent);
    agent.start();
  }
}

function getAggregatedInfo() {
  if (agents.length === 0) return {};
  const infos = agents.map(a => a.getLearningInfo());
  return {
    episode:      infos.reduce((s, i) => s + i.episode, 0),
    success:      infos.reduce((s, i) => s + i.success, 0),
    failures:     infos.reduce((s, i) => s + i.failures, 0),
    epsilon:      infos.reduce((s, i) => s + i.epsilon, 0) / infos.length,
    totalReward:  infos.reduce((s, i) => s + i.totalReward, 0),
    lastReward:   infos.reduce((s, i) => s + i.lastReward, 0) / infos.length,
    step:         infos.reduce((s, i) => s + i.step, 0),
    progress:     Math.max(...infos.map(i => i.progress)),
    bestProgress: Math.max(...infos.map(i => i.bestProgress)),
    successRate:  infos.reduce((s, i) => s + i.successRate, 0) / infos.length,
    qTableSize:   infos[0].qTableSize,
    carCount:     agents.length,
  };
}

function readSettings() {
  return {
    count: parseInt(document.getElementById("setting-car-count").value, 10),
    alpha: parseFloat(document.getElementById("setting-alpha").value),
    gamma: parseFloat(document.getElementById("setting-gamma").value),
  };
}

let isTestMode = false;

function setTestMode(enabled) {
  isTestMode = enabled;
  agents.forEach(a => a.setTestMode(enabled));
  const btn = document.getElementById("mode-toggle");
  if (enabled) {
    btn.textContent = "テストモード中（クリックで学習に戻す）";
    btn.classList.replace("mode-training", "mode-test");
  } else {
    btn.textContent = "学習モード中（クリックでテストへ）";
    btn.classList.replace("mode-test", "mode-training");
  }
}

document.getElementById("mode-toggle").addEventListener("click", () => {
  setTestMode(!isTestMode);
});

document.getElementById("settings-apply").addEventListener("click", () => {
  const { count, alpha, gamma } = readSettings();
  buildAgents(count, alpha, gamma, true);
});

document.getElementById("settings-reset").addEventListener("click", () => {
  const { count, alpha, gamma } = readSettings();
  buildAgents(count, alpha, gamma, false);
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
buildRoad([
  new THREE.Vector3(-10, 0, 15),
  new THREE.Vector3(-4, 0, 5),
  new THREE.Vector3(-2, 0, -5),
  new THREE.Vector3(-5, 0, -15),
]);
buildAgents(1, 0.12, 0.97);

function tick() {
  renderer.render(scene, camera);

  if(camera_controller.isKeyDonw === true){
    camera_controller.keyMove(keys);
  }
  agents.forEach(agent => agent.update());
  learningUI.update(getAggregatedInfo());
  camera_controller.update(camera);
}

renderer.setAnimationLoop(tick);
