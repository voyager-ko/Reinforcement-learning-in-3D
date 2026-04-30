import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

const keysPressed = {};
const loader = new GLTFLoader();
let characterController;
const floor_group = new THREE.Group();
let maze = [[0, 0]];
let plane_size = 10;

class CharacterController{

    constructor(model, animations, camera, url){
        this.model = model;
        this.camera = camera;
        this.url = url;

        // モデルのアニメーションを管理
        this.mixer = new THREE.AnimationMixer(model);
        this.animationsMap = new Map();

        this.currentAction = "idle";
        this.fadeDuration = 0.2;
        this.runVelocity = 10;

        animations.forEach((clip) => {

            this.animationsMap.set(
                clip.name.toLowerCase(),
                this.mixer.clipAction(clip)
            );
        });

        // ? is オプショナルチェーン
        this.animationsMap.get(this.currentAction)?.play();
    }

    switchAction(newAction){
        if(this.currentAction === newAction) return;

        const current = this.animationsMap.get(this.currentAction);
        const next = this.animationsMap.get(newAction);

        current?.fadeOut(this.fadeDuration);

        next?.reset()
         .fadeIn(this.fadeDuration)
        .play();
        this.currentAction = newAction;
    }

    move(keysPressed) {
        const speed = 0.001;

        if(this.isOnGroud(this.model, floor_group)){
            if (keysPressed["KeyW"] === true) {
            this.model.position.z -= speed;
            }

            if (keysPressed["KeyS"] === true) {
                this.model.position.z += speed;
            }

            if (keysPressed["KeyA"] === true) {
                this.model.position.x -= speed;
            }

            if (keysPressed["KeyD"] === true) {
                this.model.position.x += speed;
            }
        }else{
            this.model.position.set(0, 0, 0);
        }
    }

    update(delta, keysPressed){

        const isMoving = 
            keysPressed["KeyW"] ||
            keysPressed["KeyA"] ||
            keysPressed["KeyS"] ||
            keysPressed["KeyD"];

        if(isMoving){
            this.switchAction("run");
            this.move(keysPressed);
        }else{
            this.switchAction("idle");
        }

        // アニメーションを進める. 実際に動く
        this.mixer.update(delta);
    }

    isOnGroud(model, floorGroup){
        const raycaster = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);
        
        const origin = model.position.clone();
        origin.y += 10;

        raycaster.set(origin, down);
        const intersects = raycaster.intersectObject(floorGroup, true);

        // if hit
        if(intersects.length > 0){
            return true;
        }else{
            return false;
        }
    }
}


// レンダラーを作成
const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// シーンを作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF);

// カメラを作成
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// 床の追加
scene.add(floor_group);
for(let i=0; i<maze.length; i++){
    for(let j=0; j<maze[i].length; j++){
        if(maze[i][j] == 0){
            const geometry = new THREE.PlaneGeometry(plane_size, plane_size);
            const material = new THREE.MeshBasicMaterial( {color: 0x00FF00, side: THREE.DoubleSide} );
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(j * plane_size, i * plane_size, 0);
            floor_group.add(plane);
        }else if(maze[i][j] == 1){

        }else if(maze[i][j] == 2){
            const geometry = new THREE.PlaneGeometry(plane_size, plane_size);
            const material = new THREE.MeshBasicMaterial( {color: 0xFFF000, side: THREE.DoubleSide} );
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(j * plane_size, i * plane_size, 0);
            floor_group.add(plane);
        }
    }   
}
floor_group.rotation.x = Math.PI / 2;

document.addEventListener("keydown", (event) => {
  keysPressed[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keysPressed[event.code] = false;
});

// キャラクターモデルの追加
const addModel = (url, character) => {
    const loader = new GLTFLoader();
    loader.load(url, function (gltf) {
        const model = gltf.scene;

        // だいたいの人間の大きさに合わせる
        model.scale.set(0.9, 0.9, 0.9);

        model.position.set(0, 0, 0);

        characterController = new CharacterController(
            model,
            gltf.animations,
            camera
         );
        scene.add(model);
    });
};

// オブジェクトを読み込み
const loadObjs = async () => {
    // キャラクターモデルの追加
    await addModel('./models/Xbot.glb');
};

loadObjs();


const clock = new THREE.Clock();

renderer.setAnimationLoop(animate);

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (characterController) {
    characterController.update(delta, keysPressed);
  }

  renderer.render(scene, camera);
}