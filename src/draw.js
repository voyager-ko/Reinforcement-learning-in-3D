import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

export class DrawingRoad {
  constructor({
    controlPoints,
    roadWidth = 2.5,
    sampleCount = 440,
    material,
    edgeMaterial,
    centerLineMaterial,
    startMaterial,
    goalMaterial,
  }) {
    this.controlPoints = controlPoints;
    this.roadWidth = roadWidth;
    this.roadHalf = roadWidth / 2;
    this.sampleCount = sampleCount;

    this.material = material;
    this.edgeMaterial = edgeMaterial;
    this.centerLineMaterial = centerLineMaterial;
    this.startMaterial = startMaterial;
    this.goalMaterial = goalMaterial;

    this.group = new THREE.Group();

    this.curve = new THREE.CatmullRomCurve3(
      this.controlPoints,
      false,
      "centripetal",
      0.32
    );

    this.centerSamples = this.curve.getSpacedPoints(this.sampleCount);
    this.startPoint = this.centerSamples[0].clone();
    this.goalPoint = this.centerSamples[this.centerSamples.length - 1].clone();
  }

  create() {
    this.createRoadBody();
    this.createCenterLine();
    this.createEdges();
    this.createStartMarker();
    this.createGoalMarker();

    return this.group;
  }

  createRoadBody() {
    const geometry = this.createRoadGeometry();

    const road = new THREE.Mesh(geometry, this.material);
    road.receiveShadow = true;
    road.castShadow = true;

    this.group.add(road);
  }

  createRoadGeometry() {
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let index = 0; index < this.centerSamples.length; index++) {
      const center = this.centerSamples[index];

      const tangent = this.tangentAt(index);

      const normal = new THREE.Vector3(
        -tangent.z,
        0,
        tangent.x
      ).normalize();

      const left = center
        .clone()
        .addScaledVector(normal, this.roadHalf)
        .setY(0.02);

      const right = center
        .clone()
        .addScaledVector(normal, -this.roadHalf)
        .setY(0.02);

      vertices.push(
        left.x,
        left.y,
        left.z,
        right.x,
        right.y,
        right.z
      );

      uvs.push(0, index / this.sampleCount);
      uvs.push(1, index / this.sampleCount);

      if (index < this.centerSamples.length - 1) {
        const a = index * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(uvs, 2)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  createCenterLine() {
    if (!this.centerLineMaterial) return;

    const points = this.centerSamples.map((point) =>
      point.clone().setY(0.055)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const centerLine = new THREE.Line(
      geometry,
      this.centerLineMaterial
    );

    centerLine.computeLineDistances();

    this.group.add(centerLine);
  }

  createEdges() {
    if (!this.edgeMaterial) return;

    const leftEdge = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.createEdgePoints(1)),
      this.edgeMaterial
    );

    const rightEdge = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.createEdgePoints(-1)),
      this.edgeMaterial
    );

    this.group.add(leftEdge);
    this.group.add(rightEdge);
  }

  createEdgePoints(side) {
    return this.centerSamples.map((center, index) => {
      const tangent = this.tangentAt(index);

      const normal = new THREE.Vector3(
        -tangent.z,
        0,
        tangent.x
      ).normalize();

      return center
        .clone()
        .addScaledVector(normal, side * this.roadHalf)
        .setY(0.08);
    });
  }

  createStartMarker() {
    if (!this.startMaterial) return;

    const start = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.08, 48),
      this.startMaterial
    );

    start.position.copy(this.startPoint).setY(0.065);
    start.receiveShadow = true;
    start.castShadow = true;

    this.group.add(start);
  }

  createGoalMarker() {
    if (!this.goalMaterial) return;

    const goal = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.09, 16, 56),
      this.goalMaterial
    );

    goal.rotation.x = Math.PI / 2;
    goal.position.copy(this.goalPoint).setY(0.28);
    goal.castShadow = true;

    this.group.add(goal);

    const goalPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 1.8, 24),
      this.goalMaterial
    );

    goalPillar.position.copy(this.goalPoint).setY(0.9);
    goalPillar.castShadow = true;

    this.group.add(goalPillar);
  }

  tangentAt(index) {
    const previous = this.centerSamples[
      Math.max(0, index - 1)
    ];

    const next = this.centerSamples[
      Math.min(this.centerSamples.length - 1, index + 1)
    ];

    return next.clone().sub(previous).normalize();
  }

  getStartPoint() {
    return this.startPoint.clone();
  }

  getGoalPoint() {
    return this.goalPoint.clone();
  }

  getCenterSamples() {
    return this.centerSamples;
  }

  getCurve() {
    return this.curve;
  }

  getGroup() {
    return this.group;
  }

  getRoadHalf() {
  return this.roadHalf;
}
}