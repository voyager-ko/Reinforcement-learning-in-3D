import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
camera.position.set(10, 10, 10);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// 軸の追加
const axesHelper = new THREE.AxesHelper( 1000 );
scene.add( axesHelper );


// 床の追加
let maze = [[0, 0, 0, 0, 0, 1], 
            [0, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 2]];
let plane_size = 5;
const floor_group = new THREE.Group();
scene.add(floor_group);

for(let i=0; i<maze.length; i++){
    for(let j=0; j<maze[i].length; j++){

        if(maze[i][j] == 0){
            const geometry = new THREE.PlaneGeometry(plane_size, plane_size);
            const material = new THREE.MeshBasicMaterial( {color: 0xFFFFFF, side: THREE.DoubleSide} );
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
// キャラクターのマテリアル
const characterMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('rgb(220, 220, 220)'),
    transparent: true,
    opacity: 0.5,
});

// レイキャスト
const raycaster = new THREE.Raycaster();

// 下向きベクトル
const downDirection = new THREE.Vector3(0, -1, 0);

// キャラクターモデルの追加
const addModel = (url) => {
    const loader = new GLTFLoader();
    loader.load(url, function (gltf) {
        const model = gltf.scene;

        // だいたいの人間の大きさに合わせる
        model.scale.set(0.9, 0.9, 0.9);

        model.position.set(0, 0, 0);

        scene.add(model);
    });
};

// オブジェクトを読み込み
const loadObjs = async () => {
    // キャラクターモデルの追加
    await addModel('./models/Xbot.glb');
};

loadObjs();

renderer.setAnimationLoop(tick);

// 毎フレーム時に実行されるループイベントです
function tick() {
  // レンダリング
  renderer.render(scene, camera);

}