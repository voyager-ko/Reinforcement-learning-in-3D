import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader} from "three/addons/loaders/GLTFLoader.js";


export class ReinforcementLearningAgent {
  constructor({
    robot,
    robotGroup,
    road,
    onEpisodeEnd = null,
    onStep = null,
    qTable = null,
    alpha = 0.12,
    gamma = 0.97,
  }) {
    this.robot = robot;
    this.robotGroup = robotGroup;
    this.road = road;

    this.onEpisodeEnd = onEpisodeEnd;
    this.onStep = onStep;

    // ===== 強化学習の基本設定 =====
    this.robotRadius = 0.34;
    this.stepDistance = 0.5;
    this.turnAmount = 0.115;
    this.maxSteps = 1600;
    this.goalProgress = 0.985;

    // 行動
    // -1: 左へ曲がる
    //  0: 直進
    //  1: 右へ曲がる
    this.actions = [-1, 0, 1];
    this.actionNames = ["左", "直進", "右"];

    // Q学習パラメータ
    this.epsilon = 1.0;
    this.alpha = alpha;
    this.gamma = gamma;

    // 学習状態 (qTableが渡された場合は共有、なければ独自に作成)
    this.ownsQTable = qTable === null;
    this.qTable = qTable ?? new Map();

    this.episode = 0;
    this.success = 0;
    this.failures = 0;

    this.step = 0;
    this.totalReward = 0;
    this.lastReward = 0;

    this.previousProgress = 0;
    this.bestProgress = 0;

    this.recentResults = [];

    this.testMode = false;
    this.running = false;
  }

  setTestMode(enabled) {
    this.testMode = enabled;
  }

  start() {
    this.running = true;
    this.resetLearning();
  }

  stop() {
    this.running = false;
  }

  resetLearning() {
    this.episode = 0;
    this.success = 0;
    this.failures = 0;

    this.epsilon = 1.0;
    this.totalReward = 0;
    this.lastReward = 0;

    this.step = 0;
    this.previousProgress = 0;
    this.bestProgress = 0;

    if (this.ownsQTable) {
      this.qTable.clear();
    }
    this.recentResults = [];

    this.startEpisode();
  }

  startEpisode() {
    this.episode += 1;
    this.step = 0;
    this.totalReward = 0;
    this.previousProgress = 0;

    const startPoint = this.road.getStartPoint();
    const startTangent = this.road.tangentAt(0);

    this.robot.position.copy(startPoint);
    this.robot.heading = this.headingFromVector(startTangent);

    // 最初の向きに少しランダム性を入れる
    // これにより、毎回まったく同じ動きになることを防ぐ
    this.robot.heading += (Math.random() - 0.5) * 0.18;

    this.updateRobotTransform();
  }

  finishEpisode(result, message) {
    if (result === "success") {
      this.success += 1;
    } else {
      this.failures += 1;
    }

    this.recentResults.push(result === "success" ? 1 : 0);

    if (this.recentResults.length > 35) {
      this.recentResults.shift();
    }

    if (!this.testMode) {
      // 成功/失敗とエピソード数の両方でepsilonを減衰させる
      const resultDecay = result === "success" ? 0.985 : 0.995;
      const timeFloor = Math.max(0.045, 1.0 / (1 + this.episode * 0.005));
      this.epsilon = Math.min(this.epsilon * resultDecay, timeFloor);
    }

    if (this.onEpisodeEnd) {
      this.onEpisodeEnd({
        result,
        message,
        episode: this.episode,
        success: this.success,
        failures: this.failures,
        epsilon: this.epsilon,
        totalReward: this.totalReward,
      });
    }

    this.startEpisode();
  }

  update() {
    if (!this.running) {
      return;
    }

    this.stepLearning();
  }

  stepLearning() {
    const before = this.nearestRouteInfo(this.robot.position);
    const state = this.encodeState(before);

    const actionIndex = this.chooseAction(state);

    const result = this.moveRobot(actionIndex, before, state);

    if (this.onStep) {
      this.onStep({
        episode: this.episode,
        step: this.step,
        actionIndex,
        actionName: this.actionNames[actionIndex],
        reward: this.lastReward,
        totalReward: this.totalReward,
        progress: this.previousProgress,
        epsilon: this.epsilon,
        success: this.success,
        failures: this.failures,
      });
    }

    if (result.done) {
      this.finishEpisode(result.result, result.message);
    }
  }

  moveRobot(actionIndex, beforeInfo, beforeState) {
    const before = beforeInfo ?? this.nearestRouteInfo(this.robot.position);
    const state = beforeState ?? this.encodeState(before);

    // 行動を反映
    this.robot.heading = this.wrapAngle(
      this.robot.heading + this.actions[actionIndex] * this.turnAmount
    );

    this.robot.position.addScaledVector(
      this.headingVector(this.robot.heading),
      this.stepDistance
    );

    this.step += 1;

    // 移動後の状態
    const after = this.nearestRouteInfo(this.robot.position);
    const nextState = this.encodeState(after);

    // 報酬計算
    const rewardInfo = this.calculateReward(before, after);

    // Q値更新
    this.updateQ(
      state,
      actionIndex,
      rewardInfo.reward,
      nextState,
      rewardInfo.done
    );

    this.totalReward += rewardInfo.reward;
    this.lastReward = rewardInfo.reward;
    this.previousProgress = after.progress;
    this.bestProgress = Math.max(this.bestProgress, after.progress);

    this.updateRobotTransform();

    return rewardInfo;
  }

  calculateReward(before, after) {
    const progressDelta = after.progress - before.progress;

    const headingError = Math.abs(
      this.wrapAngle(this.robot.heading - after.heading)
    );

    const roadHalf = this.road.getRoadHalf();

    const centerScore = Math.max(
      0,
      1 - after.distance / roadHalf
    );

    const alignmentScore =
      (Math.cos(headingError) + 1) * 0.5;

    const offRoad =
      after.distance + this.robotRadius * 0.2 > roadHalf;

    const reachedGoal =
      after.progress > this.goalProgress &&
      after.distance < roadHalf * 0.84;

    const timedOut = this.step > this.maxSteps;

    let reward = 0;

    // 前に進んだら報酬
    reward += progressDelta * 30;

    // 中心線に近いほど報酬
    reward += centerScore * 4.0;

    // 道の向きとロボットの向きが近いほど報酬
    reward += alignmentScore * 2.0;

    // 向きがずれているほど少し減点
    reward -= headingError * 0.3;

    // 1ステップごとに少し減点
    reward -= 0.018;

    // 後ろに戻るような動きは減点
    if (progressDelta < -0.004) {
      reward -= 0.45;
    }

    if (offRoad) {
      reward -= 13.5;

      return {
        reward,
        done: true,
        result: "fail",
        message: `失敗: 道から外れました`,
      };
    }

    if (timedOut) {
      reward -= 5;

      return {
        reward,
        done: true,
        result: "fail",
        message: "失敗: 時間切れ",
      };
    }

    if (reachedGoal) {
      reward += 34;

      return {
        reward,
        done: true,
        result: "success",
        message: `成功: ${this.step} step / 報酬 ${this.totalReward.toFixed(1)}`,
      };
    }

    return {
      reward,
      done: false,
      result: null,
      message: "",
    };
  }

  chooseAction(state) {
    // テストモード中またはepsilonを下回った場合はQ値が最大の行動を選ぶ
    if (this.testMode || Math.random() >= this.epsilon) {
      const values = this.getQValues(state);
      const max = Math.max(...values);

      const bestActions = [];

      values.forEach((value, index) => {
        if (value === max) {
          bestActions.push(index);
        }
      });

      return bestActions[Math.floor(Math.random() * bestActions.length)];
    }

    return Math.floor(Math.random() * this.actions.length);
  }

  updateQ(state, actionIndex, reward, nextState, terminal) {
    if (this.testMode) return;

    const values = this.getQValues(state);
    const nextValues = this.getQValues(nextState);

    const nextBest = terminal ? 0 : Math.max(...nextValues);

    values[actionIndex] +=
      this.alpha *
      (reward + this.gamma * nextBest - values[actionIndex]);
  }

  getQValues(state) {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, [0, 0, 0]);
    }

    return this.qTable.get(state);
  }

  encodeState(info) {
    const roadHalf = this.road.getRoadHalf();

    const progressBin = this.clamp(
      Math.floor(info.progress * 34),
      0,
      33
    );

    const offsetRatio = this.clamp(
      info.signedOffset / roadHalf,
      -1.45,
      1.45
    );

    const offsetBin = this.clamp(
      Math.floor((offsetRatio + 1.45) / 0.42),
      0,
      6
    );

    const angleError = this.clamp(
      this.wrapAngle(this.robot.heading - info.heading),
      -1.7,
      1.7
    );

    const angleBin = this.clamp(
      Math.floor((angleError + 1.7) / 0.38),
      0,
      8
    );

    return `${progressBin}:${offsetBin}:${angleBin}`;
  }

  nearestRouteInfo(position) {
    const centerSamples = this.road.getCenterSamples();

    let bestIndex = 0;
    let bestDistanceSq = Infinity;

    for (let index = 0; index < centerSamples.length; index += 1) {
      const point = centerSamples[index];

      const dx = position.x - point.x;
      const dz = position.z - point.z;

      const distanceSq = dx * dx + dz * dz;

      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestIndex = index;
      }
    }

    const center = centerSamples[bestIndex];
    const tangent = this.road.tangentAt(bestIndex);

    const normal = new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x
    ).normalize();

    const toRobot = new THREE.Vector3(
      position.x - center.x,
      0,
      position.z - center.z
    );

    return {
      index: bestIndex,
      center,
      tangent,
      heading: this.headingFromVector(tangent),
      signedOffset: toRobot.dot(normal),
      distance: Math.sqrt(bestDistanceSq),
      progress: bestIndex / (centerSamples.length - 1),
    };
  }

  updateRobotTransform() {
    if (!this.robotGroup) {
      return;
    }

    this.robotGroup.position.copy(this.robot.position);
    this.robotGroup.rotation.y = this.robot.heading;
  }

  recentSuccessRate() {
    if (this.recentResults.length === 0) {
      return 0;
    }

    const total = this.recentResults.reduce(
      (sum, value) => sum + value,
      0
    );

    return total / this.recentResults.length;
  }

  getLearningInfo() {
    return {
      episode: this.episode,
      success: this.success,
      failures: this.failures,
      epsilon: this.epsilon,
      totalReward: this.totalReward,
      lastReward: this.lastReward,
      step: this.step,
      progress: this.previousProgress,
      bestProgress: this.bestProgress,
      successRate: this.recentSuccessRate(),
      qTableSize: this.qTable.size,
    };
  }

  headingFromVector(vector) {
    return Math.atan2(vector.x, -vector.z);
  }

  headingVector(heading) {
    return new THREE.Vector3(
      Math.sin(heading),
      0,
      -Math.cos(heading)
    );
  }

  wrapAngle(value) {
    return Math.atan2(Math.sin(value), Math.cos(value));
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
}