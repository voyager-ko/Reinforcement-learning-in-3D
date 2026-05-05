export class LearningStatusUI {
  constructor({
    parent = document.body,
    title = "強化学習ステータス",
  } = {}) {
    this.parent = parent;
    this.title = title;

    this.elements = {};

    this.container = this.createContainer();
    this.parent.appendChild(this.container);
  }

  createContainer() {
    const container = document.createElement("div");

    container.style.color = "#ffffff";
    container.style.fontFamily =
      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

    const titleElement = document.createElement("h2");
    titleElement.textContent = this.title;
    titleElement.style.fontSize = "16px";
    titleElement.style.margin = "0 0 12px 0";
    titleElement.style.fontWeight = "700";

    container.appendChild(titleElement);

    this.elements.status = this.createStatusText("学習中");
    container.appendChild(this.elements.status);

    this.elements.carCount = this.createRow(container, "台数", "1");
    this.elements.episode = this.createRow(container, "試行回数", "0");
    this.elements.success = this.createRow(container, "成功回数", "0");
    this.elements.failures = this.createRow(container, "失敗回数", "0");
    this.elements.successRate = this.createRow(container, "成功率", "0%");
    this.elements.epsilon = this.createRow(container, "探索率 ε", "1.00");
    this.elements.reward = this.createRow(container, "累積報酬", "0.0");
    this.elements.lastReward = this.createRow(container, "直前の報酬", "0.0");
    this.elements.qTableSize = this.createRow(container, "状態数", "0");

    this.elements.progressBar = this.createProgressBar(
      container,
      "現在の進行度"
    );

    this.elements.bestProgressBar = this.createProgressBar(
      container,
      "最高到達度"
    );

    return container;
  }

  createStatusText(text) {
    const status = document.createElement("div");

    status.textContent = text;
    status.style.marginBottom = "12px";
    status.style.padding = "8px 10px";
    status.style.borderRadius = "10px";
    status.style.background = "rgba(97, 215, 255, 0.15)";
    status.style.color = "#61d7ff";
    status.style.fontSize = "13px";
    status.style.fontWeight = "600";

    return status;
  }

  createRow(container, label, initialValue) {
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.margin = "7px 0";
    row.style.fontSize = "13px";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    labelElement.style.color = "rgba(255, 255, 255, 0.72)";

    const valueElement = document.createElement("span");
    valueElement.textContent = initialValue;
    valueElement.style.fontWeight = "700";
    valueElement.style.color = "#ffffff";

    row.appendChild(labelElement);
    row.appendChild(valueElement);
    container.appendChild(row);

    return valueElement;
  }

  createProgressBar(container, label) {
    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "14px";

    const labelElement = document.createElement("div");
    labelElement.textContent = label;
    labelElement.style.fontSize = "12px";
    labelElement.style.marginBottom = "6px";
    labelElement.style.color = "rgba(255, 255, 255, 0.72)";

    const barBackground = document.createElement("div");
    barBackground.style.width = "100%";
    barBackground.style.height = "10px";
    barBackground.style.borderRadius = "999px";
    barBackground.style.background = "rgba(255, 255, 255, 0.14)";
    barBackground.style.overflow = "hidden";

    const barFill = document.createElement("div");
    barFill.style.width = "0%";
    barFill.style.height = "100%";
    barFill.style.borderRadius = "999px";
    barFill.style.background = "#5cf2ad";
    barFill.style.transition = "width 0.15s ease";

    barBackground.appendChild(barFill);
    wrapper.appendChild(labelElement);
    wrapper.appendChild(barBackground);
    container.appendChild(wrapper);

    return barFill;
  }

  update(info) {
    this.elements.carCount.textContent = String(info.carCount ?? 1);
    this.elements.episode.textContent = String(info.episode ?? 0);
    this.elements.success.textContent = String(info.success ?? 0);
    this.elements.failures.textContent = String(info.failures ?? 0);

    const successRate = info.successRate ?? 0;
    this.elements.successRate.textContent = `${Math.round(successRate * 100)}%`;

    this.elements.epsilon.textContent = (info.epsilon ?? 0).toFixed(2);
    this.elements.reward.textContent = (info.totalReward ?? 0).toFixed(1);
    this.elements.lastReward.textContent = (info.lastReward ?? 0).toFixed(2);
    this.elements.qTableSize.textContent = String(info.qTableSize ?? 0);

    const progress = this.toPercent(info.progress ?? 0);
    const bestProgress = this.toPercent(info.bestProgress ?? 0);

    this.elements.progressBar.style.width = `${progress}%`;
    this.elements.bestProgressBar.style.width = `${bestProgress}%`;

    this.updateStatus(info);
  }

  updateStatus(info) {
    if (info.lastResult === "success") {
      this.elements.status.textContent = "ゴール成功";
      this.elements.status.style.background = "rgba(92, 242, 173, 0.15)";
      this.elements.status.style.color = "#5cf2ad";
      return;
    }

    if (info.lastResult === "fail") {
      this.elements.status.textContent = "失敗して再挑戦中";
      this.elements.status.style.background = "rgba(255, 92, 107, 0.15)";
      this.elements.status.style.color = "#ff5c6b";
      return;
    }

    this.elements.status.textContent = "学習中";
    this.elements.status.style.background = "rgba(97, 215, 255, 0.15)";
    this.elements.status.style.color = "#61d7ff";
  }

  toPercent(value) {
    return Math.max(0, Math.min(100, value * 100));
  }

  show() {
    this.container.style.display = "block";
  }

  hide() {
    this.container.style.display = "none";
  }

  toggle() {
    this.container.style.display =
      this.container.style.display === "none" ? "block" : "none";
  }
}