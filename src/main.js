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

function resetCameraForRoad() {
  const samples = drawingRoad.getCenterSamples();
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  samples.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  });
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const margin = 1.5;
  const roadHalf = drawingRoad.getRoadHalf();
  const extentX = (maxX - minX) + roadHalf * 2;
  const extentZ = (maxZ - minZ) + roadHalf * 2;
  const fovRad = 75 * Math.PI / 180;
  const tanHalfFov = Math.tan(fovRad / 2);
  const aspectRatio = window.innerWidth / window.innerHeight;
  const heightForZ = (extentZ * margin / 2) / tanHalfFov;
  const heightForX = (extentX * margin / 2) / (tanHalfFov * aspectRatio);
  const height = Math.max(heightForZ, heightForX);
  camera_controller.resetToTopView(centerX, centerZ, height);
}

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
  resetCameraForRoad();
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
  parent: document.getElementById("status-mount"),
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

let cumulativeStats = { episode: 0, success: 0, failures: 0 };

function buildAgents(count, alpha, gamma, keepTable = false) {
  let inheritedEpsilon = 1.0;

  if (keepTable && agents.length > 0) {
    const infos = agents.map(a => a.getLearningInfo());
    cumulativeStats.episode  += infos.reduce((s, i) => s + i.episode,  0);
    cumulativeStats.success  += infos.reduce((s, i) => s + i.success,  0);
    cumulativeStats.failures += infos.reduce((s, i) => s + i.failures, 0);
    inheritedEpsilon = infos.reduce((s, i) => s + i.epsilon, 0) / infos.length;
  } else if (!keepTable) {
    cumulativeStats = { episode: 0, success: 0, failures: 0 };
  }

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
      initialEpsilon: inheritedEpsilon,
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
    episode:      infos.reduce((s, i) => s + i.episode,  0) + cumulativeStats.episode,
    success:      infos.reduce((s, i) => s + i.success,  0) + cumulativeStats.success,
    failures:     infos.reduce((s, i) => s + i.failures, 0) + cumulativeStats.failures,
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

document.getElementById("settings-apply").addEventListener("click", () => {
  const { count, alpha, gamma } = readSettings();
  buildAgents(count, alpha, gamma, true);
});

document.getElementById("settings-reset").addEventListener("click", () => {
  const { count, alpha, gamma } = readSettings();
  buildAgents(count, alpha, gamma, false);
});


const drawer = document.getElementById("side-drawer");

window.addEventListener("mousedown", (event) =>{
  if (event.target.closest("#side-drawer")) return;
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
  if (document.activeElement && document.activeElement.closest("#side-drawer")) return;
  camera_controller.isKeyDonw = true;
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  if (document.activeElement && document.activeElement.closest("#side-drawer")) return;
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
