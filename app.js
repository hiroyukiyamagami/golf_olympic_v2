const STORAGE_KEY = "golfOlympicRound.v1";
const HOLE_COUNT = 18;

const state = {
  players: [],
  scores: [],
  completedHoles: Array(HOLE_COUNT).fill(false),
  currentHole: 0,
};

const setupPanel = document.getElementById("setupPanel");
const scorePanel = document.getElementById("scorePanel");
const setupForm = document.getElementById("setupForm");
const playerCountInput = document.getElementById("playerCount");
const makeNameFieldsButton = document.getElementById("makeNameFields");
const nameFields = document.getElementById("nameFields");
const currentHoleLabel = document.getElementById("currentHoleLabel");
const completedHoles = document.getElementById("completedHoles");
const topPlayer = document.getElementById("topPlayer");
const topScore = document.getElementById("topScore");
const prevHole = document.getElementById("prevHole");
const nextHole = document.getElementById("nextHole");
const holeSelect = document.getElementById("holeSelect");
const scoreInputs = document.getElementById("scoreInputs");
const saveState = document.getElementById("saveState");
const rankingList = document.getElementById("rankingList");
const toggleDetails = document.getElementById("toggleDetails");
const detailArea = document.getElementById("detailArea");
const detailHead = document.getElementById("detailHead");
const detailBody = document.getElementById("detailBody");
const newRound = document.getElementById("newRound");
const resetData = document.getElementById("resetData");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createEmptyScores(playerCount) {
  return Array.from({ length: HOLE_COUNT }, () => Array(playerCount).fill(""));
}

function normalizeNumber(value) {
  if (value === "" || value === "-" || value === "+") {
    return 0;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeScoreInput(value) {
  return value === "" || value === undefined || value === null ? "" : normalizeNumber(value);
}

function isScoreEntered(value) {
  return value !== "" && value !== undefined && value !== null;
}

function saveStateToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveState.textContent = "保存済み";
}

function loadStateFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.players) || !Array.isArray(saved.scores) || saved.players.length === 0) {
      return false;
    }

    state.players = saved.players.map((name, index) => String(name || `メンバー${index + 1}`));
    state.scores = createEmptyScores(state.players.length);
    state.completedHoles = Array(HOLE_COUNT).fill(false);
    saved.scores.slice(0, HOLE_COUNT).forEach((holeScores, holeIndex) => {
      if (!Array.isArray(holeScores)) return;
      state.players.forEach((_, playerIndex) => {
        state.scores[holeIndex][playerIndex] = normalizeScoreInput(holeScores[playerIndex]);
      });
      state.completedHoles[holeIndex] = Array.isArray(saved.completedHoles)
        ? Boolean(saved.completedHoles[holeIndex])
        : state.scores[holeIndex].some((score) => normalizeNumber(score) !== 0);
    });
    state.currentHole = clamp(Number(saved.currentHole) || 0, 0, HOLE_COUNT - 1);
    return true;
  } catch (error) {
    console.warn("保存データを読み込めませんでした", error);
    return false;
  }
}

function renderNameFields(count, names = []) {
  const numericCount = Number(count);
  const safeCount = Number.isFinite(numericCount) && numericCount > 0 ? clamp(numericCount, 1, 12) : 0;
  playerCountInput.value = safeCount ? String(safeCount) : "";
  nameFields.innerHTML = "";

  for (let index = 0; index < safeCount; index += 1) {
    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = `メンバー${index + 1}`;

    const input = document.createElement("input");
    input.type = "text";
    input.name = "playerName";
    input.autocomplete = "off";
    input.placeholder = `例：プレイヤー${index + 1}`;
    input.value = names[index] || "";

    label.appendChild(input);
    nameFields.appendChild(label);
  }
}

function initializeHoleSelect() {
  holeSelect.innerHTML = "";
  for (let hole = 1; hole <= HOLE_COUNT; hole += 1) {
    const option = document.createElement("option");
    option.value = String(hole - 1);
    option.textContent = `${hole}H`;
    holeSelect.appendChild(option);
  }
}

function getTotals() {
  return state.players.map((name, playerIndex) => {
    const total = state.scores.reduce((sum, holeScores) => sum + normalizeNumber(holeScores[playerIndex]), 0);
    return { name, playerIndex, total };
  });
}

function getRanking() {
  return getTotals().sort((a, b) => b.total - a.total || a.playerIndex - b.playerIndex);
}

function getCompletedHoleCount() {
  return state.completedHoles.filter(Boolean).length;
}

function renderHeader() {
  const ranking = getRanking();
  const leader = ranking[0];
  currentHoleLabel.textContent = String(state.currentHole + 1);
  completedHoles.textContent = `${getCompletedHoleCount()}/${HOLE_COUNT}`;
  topPlayer.textContent = leader ? leader.name : "-";
  topScore.textContent = `${leader ? leader.total : 0} pt`;
  holeSelect.value = String(state.currentHole);
  prevHole.disabled = state.currentHole === 0;
  nextHole.disabled = state.currentHole === HOLE_COUNT - 1;
}

function renderScoreInputs() {
  scoreInputs.innerHTML = "";

  state.players.forEach((name, playerIndex) => {
    const row = document.createElement("label");
    row.className = "score-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = name;

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.step = "1";
    input.value = state.scores[state.currentHole][playerIndex];
    input.ariaLabel = `${name} ${state.currentHole + 1}ホールのポイント`;
    input.addEventListener("input", () => {
      state.scores[state.currentHole][playerIndex] = normalizeScoreInput(input.value);
      state.completedHoles[state.currentHole] = state.scores[state.currentHole].some((score) => isScoreEntered(score));
      saveState.textContent = "保存中...";
      saveStateToStorage();
      renderAll(false);
    });

    row.append(nameSpan, input);
    scoreInputs.appendChild(row);
  });
}

function renderRanking() {
  rankingList.innerHTML = "";
  getRanking().forEach((player, index) => {
    const item = document.createElement("li");
    item.className = "rank-item";

    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.textContent = String(index + 1);

    const name = document.createElement("span");
    name.textContent = player.name;

    const points = document.createElement("span");
    points.className = "rank-points";
    points.textContent = `${player.total} pt`;

    item.append(badge, name, points);
    rankingList.appendChild(item);
  });
}

function renderDetails() {
  detailHead.innerHTML = "";
  detailBody.innerHTML = "";

  const headRow = document.createElement("tr");
  const playerHeader = document.createElement("th");
  playerHeader.textContent = "メンバー";
  headRow.appendChild(playerHeader);

  for (let hole = 1; hole <= HOLE_COUNT; hole += 1) {
    const th = document.createElement("th");
    th.textContent = `${hole}H`;
    headRow.appendChild(th);
  }

  const totalHeader = document.createElement("th");
  totalHeader.textContent = "合計";
  headRow.appendChild(totalHeader);
  detailHead.appendChild(headRow);

  getRanking().forEach((player) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = player.name;
    row.appendChild(nameCell);

    state.scores.forEach((holeScores) => {
      const cell = document.createElement("td");
      const rawScore = holeScores[player.playerIndex];
      cell.textContent = isScoreEntered(rawScore) ? normalizeNumber(rawScore) : "";
      row.appendChild(cell);
    });

    const totalCell = document.createElement("td");
    totalCell.textContent = player.total;
    row.appendChild(totalCell);
    detailBody.appendChild(row);
  });
}

function renderAll(includeInputs = true) {
  renderHeader();
  if (includeInputs) renderScoreInputs();
  renderRanking();
  renderDetails();
}

function showScorePanel() {
  setupPanel.classList.add("hidden");
  scorePanel.classList.remove("hidden");
  renderAll();
}

function startRound(names) {
  state.players = names;
  state.scores = createEmptyScores(names.length);
  state.completedHoles = Array(HOLE_COUNT).fill(false);
  state.currentHole = 0;
  saveStateToStorage();
  showScorePanel();
}

function showSetup(names = []) {
  scorePanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");
  renderNameFields(names.length || "", names);
}

makeNameFieldsButton.addEventListener("click", () => {
  const currentNames = Array.from(document.querySelectorAll('input[name="playerName"]')).map((input) => input.value.trim());
  renderNameFields(playerCountInput.value, currentNames);
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInputs = Array.from(document.querySelectorAll('input[name="playerName"]'));
  if (nameInputs.length === 0) {
    renderNameFields(playerCountInput.value);
    return;
  }
  const names = nameInputs.map((input, index) => input.value.trim() || `メンバー${index + 1}`);
  startRound(names);
});

prevHole.addEventListener("click", () => {
  state.currentHole = clamp(state.currentHole - 1, 0, HOLE_COUNT - 1);
  saveStateToStorage();
  renderAll();
});

nextHole.addEventListener("click", () => {
  state.currentHole = clamp(state.currentHole + 1, 0, HOLE_COUNT - 1);
  saveStateToStorage();
  renderAll();
});

holeSelect.addEventListener("change", () => {
  state.currentHole = clamp(Number(holeSelect.value) || 0, 0, HOLE_COUNT - 1);
  saveStateToStorage();
  renderAll();
});

toggleDetails.addEventListener("click", () => {
  const isHidden = detailArea.classList.toggle("hidden");
  toggleDetails.setAttribute("aria-expanded", String(!isHidden));
  toggleDetails.textContent = isHidden ? "詳細表示" : "詳細を閉じる";
});

newRound.addEventListener("click", () => {
  if (!confirm("現在の入力内容を保存したまま、新しいラウンド設定画面へ戻りますか？")) return;
  showSetup();
});

resetData.addEventListener("click", () => {
  if (!confirm("保存済みデータをすべて削除します。よろしいですか？")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.players = [];
  state.scores = [];
  state.completedHoles = Array(HOLE_COUNT).fill(false);
  state.currentHole = 0;
  showSetup();
});

initializeHoleSelect();
if (loadStateFromStorage()) {
  showScorePanel();
} else {
  showSetup();
}
