var BBEngine = (function () {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gcd(a, b) {
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function shuffle(rng, arr) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  var EIGHTH_LABELS = { 1: "\u215B", 2: "\u00BC", 3: "\u215C", 4: "\u00BD", 5: "\u215D", 6: "\u00BE", 7: "\u215E" };

  function fmtEighths(u) {
    if (u % 8 === 0) return String(u / 8);
    var whole = Math.floor(u / 8);
    var frac = EIGHTH_LABELS[u % 8];
    return whole > 0 ? whole + " " + frac : frac;
  }

  function countSubsetSolutions(valuesSorted, target) {
    var count = 0;
    function dfs(start, remaining) {
      if (remaining === 0) {
        count++;
        return;
      }
      for (var i = start; i < valuesSorted.length; i++) {
        if (i > start && valuesSorted[i] === valuesSorted[i - 1]) continue;
        if (valuesSorted[i] > remaining) break;
        dfs(i + 1, remaining - valuesSorted[i]);
      }
    }
    dfs(0, target);
    return count;
  }

  function generatePuzzle(band, rng, idCounter) {
    var units, gapLabel, ticks, parts, k, decoys, trayValues;
    if (band === "whole") {
      units = 7 + Math.floor(rng() * 6);
      gapLabel = String(units);
      ticks = false;
      k = rng() < 0.5 ? 2 : 3;
      parts = [];
      var remaining = units;
      for (var i = 0; i < k - 1; i++) {
        var minNext = 2 * (k - 1 - i);
        var hi = remaining - minNext;
        var p = 2 + Math.floor(rng() * Math.max(1, hi - 2 + 1));
        if (p > hi) p = hi;
        if (p < 2) p = 2;
        parts.push(p);
        remaining -= p;
      }
      parts.push(remaining);
      decoys = [];
      var decoyCount = 2;
      for (var d = 0; d < decoyCount; d++) {
        if (rng() < 0.35) {
          decoys.push(units + 1 + Math.floor(rng() * 2));
        } else {
          var v = 1 + Math.floor(rng() * (units + 1));
          decoys.push(v);
        }
      }
      trayValues = shuffle(rng, parts.concat(decoys));
    } else {
      units = 8;
      gapLabel = "1";
      ticks = true;
      var pool = [1, 2, 3, 4];
      k = rng() < 0.5 ? 2 : 3;
      parts = [];
      remaining = units;
      for (var j = 0; j < k - 1; j++) {
        var needLeft = k - 1 - j;
        var options = [];
        for (var oi = 0; oi < pool.length; oi++) {
          var cand = pool[oi];
          if (cand <= remaining - needLeft && remaining - cand >= needLeft) options.push(cand);
        }
        var pick = options.length ? options[Math.floor(rng() * options.length)] : 2;
        if (pick > remaining) pick = remaining;
        parts.push(pick);
        remaining -= pick;
      }
      parts.push(remaining);
      decoys = [];
      for (var d2 = 0; d2 < 2; d2++) {
        decoys.push(pool[Math.floor(rng() * pool.length)]);
      }
      trayValues = shuffle(rng, parts.concat(decoys));
    }
    var solutions = countSubsetSolutions(trayValues.slice().sort(function (a, b) { return a - b; }), units);
    var labels = {};
    if (band === "whole") {
      for (var li = 0; li < trayValues.length; li++) labels[li] = String(trayValues[li]);
    } else {
      for (var lj = 0; lj < trayValues.length; lj++) labels[lj] = fmtEighths(trayValues[lj]);
    }
    return {
      id: idCounter,
      band: band,
      gapUnits: units,
      gapLabel: gapLabel,
      ticksVisible: ticks,
      tray: trayValues.map(function (v, idx) { return { key: "p" + idCounter + "-" + idx, units: v, label: band === "whole" ? String(v) : fmtEighths(v) }; }),
      parPieces: parts.length,
      solutionCount: solutions,
      supportsSecondConstruction: solutions >= 2
    };
  }

  function evaluatePlacement(puzzle, currentUnits, pieceUnits) {
    var total = currentUnits + pieceUnits;
    if (total === puzzle.gapUnits) return { status: "fit", diff: 0, total: total };
    if (total < puzzle.gapUnits) return { status: "partial", diff: puzzle.gapUnits - total, total: total };
    return { status: "overhang", diff: total - puzzle.gapUnits, total: total };
  }

  function scorePuzzle(hintsUsedMaxLevel, hadOverhang) {
    var points = 10;
    if (hintsUsedMaxLevel === 0) points += 2;
    return points;
  }

  function summarizeSession(records) {
    var bridges = records.length;
    var points = 0;
    var hints = 0;
    var attemptsTotal = 0;
    var streak = 0;
    var bestStreak = 0;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      points += r.points;
      hints += r.hintLevelMax;
      attemptsTotal += r.attempts;
      if (r.attempts <= 1 && r.hintLevelMax === 0) {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    }
    var coaching;
    if (bridges === 0) {
      coaching = "Every try teaches your hands how numbers fit.";
    } else if (bestStreak >= 3) {
      coaching = "You found fits on the first try again and again \u2014 strong number sense.";
    } else if (hints === 0 && bridges > 0) {
      coaching = "You built every bridge with no hints. Try finding a second way next round.";
    } else if (attemptsTotal / bridges <= 2) {
      coaching = "Quick, careful building. Watch which lengths team up well.";
    } else {
      coaching = "You kept adjusting until it fit exactly \u2014 that is how builders think.";
    }
    return { bridges: bridges, points: points, hintsUsed: hints, bestStreak: bestStreak, coaching: coaching };
  }

  return {
    mulberry32: mulberry32,
    generatePuzzle: generatePuzzle,
    evaluatePlacement: evaluatePlacement,
    scorePuzzle: scorePuzzle,
    summarizeSession: summarizeSession,
    countSubsetSolutions: countSubsetSolutions,
    fmtEighths: fmtEighths
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = BBEngine;
}
