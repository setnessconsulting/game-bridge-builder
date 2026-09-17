(function () {
  var E = window.BBEngine;
  var SESSION_SECONDS = 90;
  var MAX_BRIDGES = 6;

  var state = {
    phase: "setup",
    band: null,
    relaxed: false,
    soundOn: true,
    rng: null,
    seed: 0,
    puzzle: null,
    puzzleIndex: 0,
    placed: [],
    tray: [],
    attempts: 0,
    hintLevelMax: 0,
    hintShownLevel: 0,
    stuckTimerId: null,
    score: 0,
    records: [],
    timeLeft: SESSION_SECONDS,
    timerId: null,
    paused: false,
    busy: false,
    secondOfferedIds: {},
    secondBuildActive: false
  };

  var el = {};
  var audioCtx = null;

  function $(id) {
    return document.getElementById(id);
  }

  function initAudio() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, durMs, type, gainVal, whenOffsetMs) {
    if (!state.soundOn || !audioCtx) return;
    var t0 = audioCtx.currentTime + (whenOffsetMs || 0) / 1000;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainVal || 0.08, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.05);
  }

  var sfx = {
    pickup: function () { tone(320, 60, "triangle", 0.05); },
    place: function () { tone(180, 90, "sine", 0.09); },
    overhang: function () { tone(140, 80, "square", 0.04); tone(120, 80, "square", 0.04, 110); },
    solve: function () { tone(523, 120, "triangle", 0.07); tone(659, 120, "triangle", 0.07, 110); tone(784, 180, "triangle", 0.07, 220); }
  };

  function announce(msg) {
    el.live.textContent = "";
    window.setTimeout(function () { el.live.textContent = msg; }, 30);
  }

  function startBand(band) {
    state.band = band;
    state.seed = Date.now() % 1000000;
    state.rng = E.mulberry32(state.seed);
    state.score = 0;
    state.records = [];
    state.puzzleIndex = 0;
    state.timeLeft = SESSION_SECONDS;
    state.secondOfferedIds = {};
    loadPuzzle();
    state.phase = "playing";
    show("play");
    startTimer();
    announce("Bridge Builder started. The gap needs " + state.puzzle.gapLabel + ".");
  }

  function loadPuzzle() {
    state.puzzle = E.generatePuzzle(state.band, state.rng, ++state.puzzleIndex);
    state.placed = [];
    state.tray = state.puzzle.tray.slice().sort(function (a, b) { return a.units - b.units; });
    state.originalTray = state.tray.slice();
    state.attempts = 0;
    state.hintLevelMax = 0;
    state.hintShownLevel = 0;
    state.busy = false;
    state.secondBuildActive = false;
    clearStuckTimer();
    armStuckTimer();
    renderPuzzle();
  }

  function startTimer() {
    stopTimer();
    if (state.relaxed) {
      el.timer.textContent = "relaxed";
      return;
    }
    el.timer.textContent = state.timeLeft + "s";
    state.timerId = window.setInterval(function () {
      if (state.paused || state.phase !== "playing") return;
      state.timeLeft -= 1;
      el.timer.textContent = state.timeLeft + "s";
      $("hud-progress").style.width = Math.max(0, (state.timeLeft / SESSION_SECONDS) * 100) + "%";
      if (state.timeLeft <= 0) endSession("time");
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function armStuckTimer() {
    clearStuckTimer();
    var threshold = state.relaxed ? 40000 : 20000;
    state.stuckTimerId = window.setTimeout(function () {
      if (state.phase === "playing" && state.hintShownLevel === 0) showHint(1);
    }, threshold);
  }

  function clearStuckTimer() {
    if (state.stuckTimerId !== null) {
      window.clearTimeout(state.stuckTimerId);
      state.stuckTimerId = null;
    }
  }

  function filledUnits() {
    var s = 0;
    for (var i = 0; i < state.placed.length; i++) s += state.placed[i].units;
    return s;
  }

  function tryPlace(piece) {
    if (state.busy || state.phase !== "playing") return;
    var res = E.evaluatePlacement(state.puzzle, filledUnits(), piece.units);
    state.attempts++;
    removePieceFromTray(piece.key);
    if (res.status === "overhang") {
      sfx.overhang();
      renderOverhang(piece, res.diff);
      announce(piece.label + " is too long by " + diffLabel(res.diff) + ". It went back to the tray.");
      window.setTimeout(function () {
        state.tray.push(piece);
        state.tray.sort(function (a, b) { return a.units - b.units; });
        renderTray();
        updateSubline();
      }, 750);
      maybeHintAfterFail();
      return;
    }
    sfx.place();
    state.placed.push(piece);
    if (res.status === "fit") {
      solvePuzzle();
    } else {
      announce("Placed " + piece.label + ". " + diffLabel(res.diff) + " more needed.");
      maybeHintAfterFail();
    }
    renderGapArea();
    updateSubline();
  }

  function diffLabel(units) {
    return state.band === "whole" ? String(units) : E.fmtEighths(units);
  }

  function removePieceFromTray(key) {
    for (var i = 0; i < state.tray.length; i++) {
      if (state.tray[i].key === key) {
        state.tray.splice(i, 1);
        break;
      }
    }
    renderTray();
  }

  function undo() {
    if (state.busy || state.phase !== "playing" || state.placed.length === 0) return;
    var piece = state.placed.pop();
    state.tray.push(piece);
    state.tray.sort(function (a, b) { return a.units - b.units; });
    sfx.pickup();
    renderGapArea();
    renderTray();
    updateSubline();
    announce("Returned " + piece.label + " to the tray.");
  }

  function solutionMembersFromRemaining() {
    var need = state.puzzle.gapUnits - filledUnits();
    var pool = state.tray.map(function (p) { return p.units; }).sort(function (a, b) { return a - b; });
    var found = [];
    function dfs(start, remaining, acc) {
      if (found.length) return;
      if (remaining === 0) { found.push(acc.slice()); return; }
      for (var i = start; i < pool.length; i++) {
        if (i > start && pool[i] === pool[i - 1]) continue;
        if (pool[i] > remaining) break;
        acc.push(pool[i]);
        dfs(i + 1, remaining - pool[i], acc);
        acc.pop();
      }
    }
    dfs(0, need, []);
    return found[0] || null;
  }

  function showHint(level) {
    if (level > state.hintLevelMax) state.hintLevelMax = level;
    state.hintShownLevel = level;
    var need = state.puzzle.gapUnits - filledUnits();
    if (level === 1) {
      el.hintChip.hidden = false;
      el.hintChip.textContent = "Your planks make " + (state.puzzle.gapUnits - need === 0 ? "0" : diffLabel(filledUnits())) + ". The gap still needs " + diffLabel(need) + ".";
      announce(el.hintChip.textContent);
    } else if (level === 2) {
      var combo = solutionMembersFromRemaining();
      if (combo) {
        var targetUnits = combo[0];
        var btns = el.tray.querySelectorAll("button");
        for (var i = 0; i < btns.length; i++) {
          if (Number(btns[i].getAttribute("data-units")) === targetUnits) {
            btns[i].classList.add("hint-piece");
            break;
          }
        }
        announce("The highlighted plank can help.");
      }
    } else if (level === 3) {
      el.ghost.hidden = false;
      announce("Ghost outline shows one place that works.");
    }
  }

  function maybeHintAfterFail() {
    if (state.attempts >= 3 && state.hintShownLevel === 0) {
      el.hintBtn.hidden = false;
    } else if (state.attempts >= 5 && state.hintShownLevel === 1) {
      showHint(2);
    } else if (state.attempts >= 7 && state.hintShownLevel === 2) {
      showHint(3);
    }
  }

  function hideHintUi() {
    el.hintChip.hidden = true;
    el.hintBtn.hidden = true;
    el.ghost.hidden = true;
    var marked = el.tray.querySelectorAll(".hint-piece");
    for (var i = 0; i < marked.length; i++) marked[i].classList.remove("hint-piece");
  }

  function solvePuzzle() {
    state.busy = true;
    clearStuckTimer();
    hideHintUi();
    sfx.solve();
    var pts = state.secondBuildActive ? 5 : E.scorePuzzle(state.hintLevelMax, state.attempts > 1);
    state.score += pts;
    state.records.push({ attempts: state.attempts, hintLevelMax: state.hintLevelMax, points: pts });
    el.score.textContent = String(state.score);
    el.bridge.classList.add("solved");
    el.floatPts.hidden = false;
    el.floatPts.textContent = "+" + pts;
    announce("It fits exactly! Plus " + pts + " points.");
    var pid = state.puzzle.id;
    var canSecond = !state.secondBuildActive && state.puzzle.supportsSecondConstruction && !state.secondOfferedIds[pid];
    var delay = 1300;
    if (canSecond && state.records.length % 2 === 0) {
      state.secondOfferedIds[pid] = true;
      delay = 900;
      window.setTimeout(function () {
        el.secondCard.hidden = false;
      }, 800);
    }
    window.setTimeout(function () {
      if (el.secondCard.hidden) nextOrEnd();
    }, delay + 400);
  }

  function answerSecond(accepted) {
    el.secondCard.hidden = true;
    if (accepted) {
      state.secondBuildActive = true;
      state.placed = [];
      state.tray = state.originalTray.slice();
      state.attempts = 0;
      state.hintLevelMax = 0;
      state.busy = false;
      el.bridge.classList.remove("solved");
      el.floatPts.hidden = true;
      renderGapArea();
      renderTray();
      updateSubline();
      announce("Same gap, different planks. Build it another way!");
      armStuckTimer();
      return;
    }
    nextOrEnd();
  }

  function nextOrEnd() {
    el.floatPts.hidden = true;
    el.bridge.classList.remove("solved");
    if (state.records.length >= MAX_BRIDGES) {
      endSession("bridges");
      return;
    }
    loadPuzzle();
  }

  function endSession(reason) {
    stopTimer();
    clearStuckTimer();
    state.phase = "done";
    var s = E.summarizeSession(state.records);
    $("sum-head").textContent = s.bridges === 1 ? "You built 1 bridge!" : "You built " + s.bridges + " bridges!";
    $("sum-bridges").textContent = String(s.bridges);
    $("sum-points").textContent = String(s.points);
    $("sum-streak").textContent = String(s.bestStreak);
    $("sum-hints").textContent = String(s.hintsUsed);
    $("sum-coaching").textContent = s.coaching;
    $("sum-reason").textContent = reason === "time" ? "Time was up \u2014 everything you finished counts." : "All bridges built!";
    show("done");
    announce("Session complete. " + s.coaching);
  }

  function renderPuzzle() {
    el.gapTotal.textContent = state.puzzle.gapLabel;
    document.querySelector(".bb-instruction").textContent = "Gap needs " + state.puzzle.gapLabel;
    renderGapArea();
    renderTray();
    updateSubline();
    hideHintUi();
  }

  function renderGapArea() {
    var html = "";
    for (var i = 0; i < state.placed.length; i++) {
      var p = state.placed[i];
      html += '<div class="plank" style="width:' + p.units * 30 + 'px">' + p.label + "</div>";
    }
    el.filled.innerHTML = html;
    var openUnits = state.puzzle.gapUnits - filledUnits();
    el.open.style.width = Math.max(0, openUnits * 30) + "px";
    el.open.textContent = openUnits > 0 ? "" : "";
  }

  function renderOverhang(piece, diff) {
    var div = document.createElement("div");
    div.className = "plank overhanging";
    div.style.width = piece.units * 30 + "px";
    div.textContent = piece.label;
    el.filled.appendChild(div);
    el.overhangChip.hidden = false;
    el.overhangChip.textContent = diffLabel(diff) + " too long";
    window.setTimeout(function () {
      el.overhangChip.hidden = true;
      if (div.parentNode) div.parentNode.removeChild(div);
      renderGapArea();
    }, 720);
  }

  function renderTray() {
    el.tray.innerHTML = "";
    for (var i = 0; i < state.tray.length; i++) {
      (function (piece) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tray-piece";
        b.setAttribute("data-units", String(piece.units));
        b.style.width = Math.max(56, piece.units * 30) + "px";
        b.textContent = piece.label;
        b.addEventListener("click", function () {
          initAudio();
          sfx.pickup();
          selectPiece(b);
          tryPlace(piece);
        });
        el.tray.appendChild(b);
      })(state.tray[i]);
    }
  }

  var selectedEl = null;

  function selectPiece(btn) {
    if (selectedEl) selectedEl.classList.remove("selected");
    selectedEl = btn;
    btn.classList.add("selected");
  }

  function updateSubline() {
    var have = filledUnits();
    var need = state.puzzle.gapUnits - have;
    el.subline.textContent = need === 0 ? "" : "Filled " + diffLabel(have) + " \u00B7 " + diffLabel(need) + " more";
  }

  function show(phase) {
    el.setup.hidden = phase !== "setup";
    el.play.hidden = phase !== "playing";
    el.done.hidden = phase !== "done";
  }

  function bindEvents() {
    $("start-whole").addEventListener("click", function () { initAudio(); startBand("whole"); });
    $("start-eighths").addEventListener("click", function () { initAudio(); startBand("eighths"); });
    $("opt-relaxed").addEventListener("change", function (e) { state.relaxed = e.target.checked; });
    $("opt-sound").addEventListener("change", function (e) { state.soundOn = e.target.checked; });
    $("btn-undo").addEventListener("click", undo);
    el.hintBtn = $("btn-hint");
    el.hintBtn.addEventListener("click", function () { showHint(state.hintShownLevel + 1 <= 3 ? state.hintShownLevel + 1 : 3); });
    el.hintChip = $("hint-chip");
    el.ghost = $("ghost-plank");
    $("second-yes").addEventListener("click", function () { answerSecond(true); });
    $("second-no").addEventListener("click", function () { answerSecond(false); });
    $("btn-exit").addEventListener("click", function () {
      stopTimer();
      clearStuckTimer();
      state.phase = "setup";
      show("setup");
      announce("Back to all games. Nothing was saved.");
    });
    $("btn-again").addEventListener("click", function () { show("setup"); state.phase = "setup"; });
    $("btn-exit-2").addEventListener("click", function () {
      stopTimer();
      clearStuckTimer();
      state.phase = "setup";
      show("setup");
    });
    document.addEventListener("keydown", function (ev) {
      if (state.phase !== "playing") return;
      if (ev.key === "u" || ev.key === "U") undo();
      if (ev.key === "Escape") {
        state.paused = !state.paused;
        el.pauseOverlay.hidden = !state.paused;
        announce(state.paused ? "Paused." : "Resumed.");
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && state.phase === "playing") {
        state.paused = true;
        el.pauseOverlay.hidden = false;
      }
    });
    $("btn-resume").addEventListener("click", function () {
      state.paused = false;
      el.pauseOverlay.hidden = true;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    el.setup = $("screen-setup");
    el.play = $("screen-play");
    el.done = $("screen-done");
    el.live = $("bb-live");
    el.gapTotal = $("gap-total");
    el.filled = $("gap-filled");
    el.open = $("gap-open");
    el.tray = $("tray");
    el.score = $("hud-score");
    el.timer = $("hud-timer");
    el.subline = $("subline");
    el.bridge = $("bridge");
    el.floatPts = $("float-points");
    el.overhangChip = $("overhang-chip");
    el.hintBtn = $("btn-hint");
    el.hintChip = $("hint-chip");
    el.ghost = $("ghost-plank");
    el.secondCard = $("second-card");
    el.pauseOverlay = $("pause-overlay");
    bindEvents();
    show("setup");
  });
})();
