import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader} from "three/addons/loaders/GLTFLoader.js";


export class Robot {
  constructor({
    startPosition = new THREE.Vector3(0, 0, 0),
    startHeading = 0,
    materials = {},
  } = {}) {
    this.position = startPosition.clone();
    this.heading = startHeading;

    this.startPosition = startPosition.clone();
    this.startHeading = startHeading;

    this.materials = {
      body:
        materials.body ??
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          roughness: 0.5,
          metalness: 0.25,
        }),

      head:
        materials.head ??
        new THREE.MeshStandardMaterial({
          color: 0x61d7ff,
          roughness: 0.35,
          metalness: 0.18,
          emissive: 0x0a2530,
        }),

      wheel:
        materials.wheel ??
        new THREE.MeshStandardMaterial({
          color: 0x1a1f22,
          roughness: 0.82,
          metalness: 0.2,
        }),
    };

    this.group = new THREE.Group();

    this.createModel();
    this.updateTransform();
  }

  createModel() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.42, 1.08),
      this.materials.body
    );

    body.position.y = 0.42;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 28, 18),
      this.materials.head
    );

    head.position.set(0, 0.78, -0.18);
    head.castShadow = true;
    this.group.add(head);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.5, 24),
      this.materials.head
    );

    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.47, -0.78);
    nose.castShadow = true;
    this.group.add(nose);

    const wheelGeometry = new THREE.CylinderGeometry(
      0.18,
      0.18,
      0.2,
      24
    );

    for (const x of [-0.52, 0.52]) {
      for (const z of [-0.32, 0.34]) {
        const wheel = new THREE.Mesh(
          wheelGeometry,
          this.materials.wheel
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.22, z);
        wheel.castShadow = true;

        this.group.add(wheel);
      }
    }

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.54, 10),
      this.materials.head
    );

    antenna.position.set(0, 1.08, 0.05);
    antenna.rotation.x = 0.18;
    antenna.castShadow = true;
    this.group.add(antenna);
  }

  updateTransform() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  setPosition(position) {
    this.position.copy(position);
    this.updateTransform();
  }

  setHeading(heading) {
    this.heading = heading;
    this.updateTransform();
  }

  setPose(position, heading) {
    this.position.copy(position);
    this.heading = heading;
    this.updateTransform();
  }

  moveForward(distance) {
    const direction = this.getHeadingVector();

    this.position.addScaledVector(direction, distance);
    this.updateTransform();
  }

  turn(amount) {
    this.heading = this.wrapAngle(this.heading + amount);
    this.updateTransform();
  }

  reset(position = this.startPosition, heading = this.startHeading) {
    this.position.copy(position);
    this.heading = heading;
    this.updateTransform();
  }

  getHeadingVector() {
    return new THREE.Vector3(
      Math.sin(this.heading),
      0,
      -Math.cos(this.heading)
    );
  }

  getObject3D() {
    return this.group;
  }

  getStateObject() {
    return {
      position: this.position,
      heading: this.heading,
    };
  }

  wrapAngle(value) {
    return Math.atan2(Math.sin(value), Math.cos(value));
  }
}