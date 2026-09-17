"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from "react";
import type { Band } from "@/lib/games/core/types";
import { ALL_BANDS, BAND_META } from "@/lib/games/core/types";
import { mulberry32 } from "@/lib/games/core/rng";
import {
  buildRound,
} from "@/lib/bridgeBuilder/generate";
import {
  formatDiff,
  mergePieceValues,
  splitPieceValue,
  summarizeRound,
} from "@/lib/bridgeBuilder/engine";
import { computeNextHint, stuckThresholdMs } from "@/lib/bridgeBuilder/hints";
import {
  configFromPlacement,
  difficultyForThird,
  easierBand,
  shouldSuggestEasier,
  type PlacementResultLike,
} from "@/lib/bridgeBuilder/adaptive";
import {
  createSessionSink,
  type GameMode,
} from "@/lib/bridgeBuilder/telemetry";
import {
  closeBridgeSoundContext,
  playBridgeCue,
  type BridgeSoundCue,
} from "@/lib/bridgeBuilder/sound";
import { cancelSpeech, speakLine } from "@/lib/bridgeBuilder/speech";
import { SKILLS_BY_BAND, skillById } from "@/lib/bridgeBuilder/skills";
import {
  BRIDGE_MAX_BRIDGES,
  BRIDGE_SESSION_SECONDS,
} from "@/lib/bridgeBuilder/exactness";
import {
  applyBridgeIntent,
  hydrateBridgeSession,
  type BridgeSessionEffect,
} from "@/lib/bridgeBuilder/session";
import type { AttemptRecord, BridgePuzzle, Piece } from "@/lib/bridgeBuilder/types";

const SESSION_SECONDS = BRIDGE_SESSION_SECONDS;
export const BRIDGE_BUILDER_BREAK_SECONDS = 90;
const BREAK_SECONDS = BRIDGE_BUILDER_BREAK_SECONDS;
const MAX_BRIDGES = BRIDGE_MAX_BRIDGES;
const UNIT_PX = 24;
const CLIFF_PX = 46;
const BEST_KEY = "levelbest.bridge-builder.best";

type Phase = "setup" | "playing" | "saved" | "done";

function newSeed(): number {
  return Date.now() % 1000000;
}

function nowMs(): number {
  return Date.now();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readBestScore(): number | null {
  try {
    const raw = window.sessionStorage.getItem(BEST_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeBestScore(score: number): void {
  try {
    window.sessionStorage.setItem(BEST_KEY, String(score));
  } catch {
    return;
  }
}

interface BridgeBuilderProps {
  onExit?: () => void;
  onReturnToPractice?: () => void;
  mode?: GameMode;
  autoStart?: boolean;
  initialBand?: Band | null;
  placementResult?: PlacementResultLike | null;
}

export default function BridgeBuilder({
  onExit,
  onReturnToPractice,
  mode = "free",
  autoStart = false,
  initialBand = null,
  placementResult = null,
}: BridgeBuilderProps) {
  const [effectiveMode, setEffectiveMode] = useState<GameMode>(mode);
  const isBreak = effectiveMode === "break";
  const [phase, setPhase] = useState<Phase>("setup");
  const [band, setBand] = useState<Band | null>(null);
  const [relaxed, setRelaxed] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [puzzle, setPuzzle] = useState<BridgePuzzle | null>(null);
  const [originalTray, setOriginalTray] = useState<Piece[]>([]);
  const [placed, setPlaced] = useState<Piece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [records, setRecords] = useState<AttemptRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(isBreak ? BREAK_SECONDS : SESSION_SECONDS);
  const [paused, setPaused] = useState(false);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [attempts, setAttempts] = useState(0);
  const [failedPlacements, setFailedPlacements] = useState(0);
  const [secondActive, setSecondActive] = useState(false);
  const [secondOfferOpen, setSecondOfferOpen] = useState(false);
  const [overhang, setOverhang] = useState<{ units: number; label: string; key: number } | null>(null);
  const [floatPoints, setFloatPoints] = useState<string | null>(null);
  const [announceText, setAnnounceText] = useState("");
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [stuckRun, setStuckRun] = useState(0);
  const [savedCountdown, setSavedCountdown] = useState(3);
  const [starsTotal, setStarsTotal] = useState(0);
  const [narrationOn, setNarrationOn] = useState(false);
  const [dotFaces, setDotFaces] = useState(true);
  const [scanOn, setScanOn] = useState(false);
  const [combineFromId, setCombineFromId] = useState<string | null>(null);
  const [queue, setQueue] = useState<BridgePuzzle[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [savedConstruction, setSavedConstruction] = useState<{
    pieces: number;
    filledUnits: number;
    gapUnits: number;
  } | null>(null);


  const rngRef = useRef<() => number>(() => 0.5);
  const sinkRef = useRef<ReturnType<typeof createSessionSink> | null>(null);
  const soundRef = useRef<AudioContext | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const lastAnnouncementRef = useRef("");
  const lastProgressAtRef = useRef(0);
  const sessionStartedAtRef = useRef(0);
  const timerDeadlineRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);
  const breakReturnSentRef = useRef(false);
  const busyRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const placeSelectedRef = useRef<(piece?: Piece) => void>(() => undefined);
  const recordsRef = useRef(records);
  const pieceRefs = useRef(new Map<string, HTMLButtonElement>());
  const secondFirstButtonRef = useRef<HTMLButtonElement | null>(null);
  const secondLastButtonRef = useRef<HTMLButtonElement | null>(null);
  const secondTitleRef = useRef<HTMLElement | null>(null);
  const pauseResumeRef = useRef<HTMLButtonElement | null>(null);
  const pauseReturnRef = useRef<HTMLElement | null>(null);
  const dialogReturnRef = useRef<HTMLElement | null>(null);
  const announceTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    piece: Piece;
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);

  const config = useMemo(() => configFromPlacement(placementResult), [placementResult]);

  useEffect(() => {
    (window as unknown as { __bbReady?: boolean }).__bbReady = true;
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setBestScore(readBestScore()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {

    return () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
      if (announceTimerRef.current !== null) window.clearTimeout(announceTimerRef.current);
      closeBridgeSoundContext(soundRef);
    };
  }, []);

  const announce = useCallback(
    (text: string) => {
      lastAnnouncementRef.current = text;
      setAnnounceText("");
      if (announceTimerRef.current !== null) window.clearTimeout(announceTimerRef.current);
      announceTimerRef.current = window.setTimeout(() => {
        announceTimerRef.current = null;
        setAnnounceText(text);
      }, 30);
      speakLine({ enabled: narrationOn }, text);
    },
    [narrationOn]
  );

  const cue = useCallback(
    (soundCue: BridgeSoundCue) => {
      if (!soundOn) return;
      playBridgeCue(soundRef, soundCue);
    },
    [soundOn]
  );

  const later = useCallback((fn: () => void, ms: number) => {
    let id = 0;
    id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((timerId) => timerId !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const cancelScheduled = useCallback(() => {
    for (const timerId of timersRef.current) window.clearTimeout(timerId);
    timersRef.current = [];
  }, []);

  const filledUnits = useMemo(
    () =>
      (puzzle?.presetPlaced.reduce((a, p) => a + p.units, 0) ?? 0) +
      placed.reduce((a, p) => a + p.units, 0),
    [puzzle, placed]
  );

  const placedIds = useMemo(() => new Set(placed.map((p) => p.id)), [placed]);
  const traySorted = useMemo(
    () => originalTray.filter((p) => !placedIds.has(p.id)).sort((a, b) => a.units - b.units),
    [originalTray, placedIds]
  );

  const focusAfterPieceRemoval = useCallback(
    (piece: Piece) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active.getAttribute("data-piece-id") !== piece.id) return;

      const currentIndex = traySorted.findIndex((candidate) => candidate.id === piece.id);
      const nextPiece =
        traySorted.slice(currentIndex + 1).find((candidate) => candidate.id !== piece.id) ??
        traySorted.slice(0, Math.max(0, currentIndex)).find((candidate) => candidate.id !== piece.id);

      window.setTimeout(() => {
        const currentActive = document.activeElement;
        if (
          currentActive instanceof HTMLElement &&
          currentActive !== document.body &&
          currentActive !== active
        ) {
          return;
        }
        if (nextPiece) {
          pieceRefs.current.get(nextPiece.id)?.focus({ preventScroll: true });
        } else {
          headingRef.current?.focus({ preventScroll: true });
        }
      }, 0);
    },
    [traySorted]
  );

  const openUnits = puzzle ? puzzle.gapUnits - filledUnits : 0;

  const emit = useCallback(
    (type: Parameters<NonNullable<typeof sinkRef.current>["emit"]>[0], payload: Record<string, unknown>) => {
      sinkRef.current?.emit(type, payload);
    },
    []
  );

  const finishSession = useCallback(
    (reason: "time" | "bridges" | "exit") => {
      busyRef.current = true;
      cancelScheduled();
      timerDeadlineRef.current = null;
      pausedRemainingRef.current = null;
      const summary = summarizeRound(recordsRef.current);
      const previousBest = readBestScore();
      const isNewBest = summary.points > 0 && (previousBest === null || summary.points > previousBest);
      if (isNewBest) writeBestScore(summary.points);
      setNewBest(isNewBest);
      setBestScore(isNewBest ? summary.points : previousBest);
      emit("session_end", {
        reason,
        bridgesBuilt: summary.bridges,
        points: summary.points,
        bestStreak: summary.bestStreak,
        hintsUsed: summary.hintsUsed,
        durationMs: sessionStartedAtRef.current
          ? Math.max(0, nowMs() - sessionStartedAtRef.current)
          : 0,
      });
      setPhase(reason === "exit" ? "setup" : "done");
      busyRef.current = false;
      if (reason !== "exit") announce(`Session complete. ${summary.coaching}`);
    },
    [cancelScheduled, emit, announce]
  );

  const startBand = useCallback(
    (nextBand: Band, focus?: string | null) => {
      cancelScheduled();
      const seed = newSeed();
      rngRef.current = mulberry32(seed);
      sinkRef.current = createSessionSink(effectiveMode);
      setBand(nextBand);

      setScore(0);
      setStarsTotal(0);
      recordsRef.current = [];
      setRecords([]);
      setStuckRun(0);
      const startedAt = nowMs();
      const totalSeconds = isBreak ? BREAK_SECONDS : SESSION_SECONDS;
      setTimeLeft(totalSeconds);
      sessionStartedAtRef.current = startedAt;
      timerDeadlineRef.current =
        effectiveMode === "sandbox" || relaxed ? null : startedAt + totalSeconds * 1000;
      pausedRemainingRef.current = null;
      breakReturnSentRef.current = false;
      setNewBest(false);
      setPhase("playing");
      cue("pickup");

      const round = buildRound(nextBand, rngRef.current, {
        length: MAX_BRIDGES,
        biasedSkillIds: focus
          ? [focus]
          : config.biasedSkillIds.filter((id) => id.startsWith("bb-")),
        difficulty: difficultyForThird(config.third),
      });
      setQueue(round.puzzles);
      setQueueIndex(0);
      const first = round.puzzles[0]!;
      setPuzzle(first);
      setOriginalTray(first.tray);
      setPlaced([]);
      setSelectedPieceId(null);
      setHintLevel(0);
      setAttempts(0);
      setFailedPlacements(0);
      setSecondActive(false);
      setSecondOfferOpen(false);
      setFloatPoints(null);
      setSavedConstruction(null);
      setPaused(false);
      setOverhang(null);
      setCombineFromId(null);
      lastProgressAtRef.current = nowMs();
      emit("session_start", { band: nextBand, seed, focusSkill: focus ?? null });
      if (isBreak) {
        emit("break_flow", {
          event: "started",
          unlocked: true,
          started: true,
          endedReason: null,
          returnedToPractice: false,
        });
      }
      emit("puzzle_start", {
        skillId: first.skillId,
        puzzleId: first.id,
        gapValue: first.gapLabel,
        solutionCount: first.solutionCount,
      });
      const focusName = focus ? skillById(focus)?.id.replace(/^bb-/, "").replace(/-/g, " ") : null;
      announce(
        `Bridge Builder started.${focusName ? ` Focus: ${focusName}.` : ""} The gap needs ${first.gapLabel}.`
      );
      const focusAtStart = document.activeElement;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (
          active === document.body ||
          active === document.documentElement ||
          active === focusAtStart ||
          active === headingRef.current
        ) {
          headingRef.current?.focus({ preventScroll: true });
        }
      }, 50);
    },
    [cancelScheduled, effectiveMode, isBreak, relaxed, config.third, config.biasedSkillIds, cue, emit, announce]
  );

  useEffect(() => {
    if (!autoStart || mode !== "break" || !initialBand || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startBand(initialBand);
  }, [autoStart, initialBand, mode, startBand]);

  const loadNextPuzzle = useCallback(() => {
    if (!band) return;
    const focusAtTransition = document.activeElement;
    const nextIndex = queueIndex + 1;
    let workingQueue = queue;
    if (effectiveMode === "sandbox" && nextIndex >= queue.length) {
      workingQueue = [...queue, ...buildRound(band, rngRef.current, { length: 6 }).puzzles];
      setQueue(workingQueue);
    }
    if (!effectiveMode || (effectiveMode !== "sandbox" && nextIndex >= workingQueue.length)) {
      finishSession("bridges");
      return;
    }
    setQueueIndex(nextIndex);
    const next = workingQueue[nextIndex]!;
    setPuzzle(next);
    setOriginalTray(next.tray);
    setPlaced([]);
    setSelectedPieceId(null);
    setCombineFromId(null);
    setHintLevel(0);
    setAttempts(0);
    setFailedPlacements(0);
    setSecondActive(false);
    setSecondOfferOpen(false);
    setFloatPoints(null);
    setOverhang(null);
    setPaused(false);
    busyRef.current = false;
    lastProgressAtRef.current = nowMs();
    emit("puzzle_start", {
      skillId: next.skillId,
      puzzleId: next.id,
      gapValue: next.gapLabel,
      solutionCount: next.solutionCount,
    });
    announce(`Gap needs ${next.gapLabel}.`);
    window.setTimeout(() => {
      const active = document.activeElement;
      if (
        active === document.body ||
        active === document.documentElement ||
        active === focusAtTransition ||
        active === headingRef.current
      ) {
        headingRef.current?.focus({ preventScroll: true });
      }
    }, 40);
  }, [band, effectiveMode, queue, queueIndex, rngRef, emit, announce, finishSession]);

  const handleExpiry = useCallback(() => {
    if (isBreak) {
      emit("break_flow", {
        event: "expired",
        unlocked: true,
        started: false,
        endedReason: "timer",
        returnedToPractice: false,
        bridgesSoFar: recordsRef.current.length,
      });
      setSavedConstruction({
        pieces: (puzzle?.presetPlaced.length ?? 0) + placed.length,
        filledUnits,
        gapUnits: puzzle?.gapUnits ?? 0,
      });
      setPhase("saved");
      setSavedCountdown(3);
      announce("Time! Your work is saved.");
      return;
    }
    finishSession("time");
  }, [filledUnits, isBreak, emit, finishSession, announce, placed.length, puzzle]);

  useEffect(() => {
    if (phase !== "playing" || relaxed || effectiveMode === "sandbox") {
      timerDeadlineRef.current = null;
      pausedRemainingRef.current = null;
      return;
    }

    if (paused) {
      if (timerDeadlineRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((timerDeadlineRef.current - nowMs()) / 1000));
        pausedRemainingRef.current = remaining;
        timerDeadlineRef.current = null;
        setTimeLeft(remaining);
      }
      return;
    }

    if (timerDeadlineRef.current === null) {
      const remaining = pausedRemainingRef.current ?? (isBreak ? BREAK_SECONDS : SESSION_SECONDS);
      pausedRemainingRef.current = null;
      timerDeadlineRef.current = nowMs() + remaining * 1000;
    }

    const tick = () => {
      const deadline = timerDeadlineRef.current;
      if (deadline === null) return;
      const remaining = Math.max(0, Math.ceil((deadline - nowMs()) / 1000));
      setTimeLeft((current) => (current === remaining ? current : remaining));
      if (remaining <= 0) {
        timerDeadlineRef.current = null;
        handleExpiry();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [effectiveMode, isBreak, phase, paused, relaxed, handleExpiry]);

  const returnFromBreak = useCallback(
    (endedReason: "timer" | "done" | "exit") => {
      if (!isBreak || breakReturnSentRef.current) return;
      breakReturnSentRef.current = true;
      emit("break_flow", {
        event: "returned",
        unlocked: true,
        started: false,
        endedReason,
        returnedToPractice: true,
      });
      onReturnToPractice?.();
    },
    [emit, isBreak, onReturnToPractice]
  );

  useEffect(() => {

    if (phase !== "saved") return;
    const id = window.setTimeout(() => {
      if (savedCountdown <= 1) {
        if (onReturnToPractice) returnFromBreak("timer");
        else setPhase("done");
        return;
      }
      setSavedCountdown((v) => v - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [phase, savedCountdown, onReturnToPractice, returnFromBreak]);

  useEffect(() => {

    if (!secondOfferOpen || phase !== "playing") return;
    const id = window.setTimeout(() => {
      emit("second_build", { accepted: false, timedOut: true });
      setSecondOfferOpen(false);
      if (recordsRef.current.length >= MAX_BRIDGES) finishSession("bridges");
      else loadNextPuzzle();
    }, 6000);
    return () => window.clearTimeout(id);
  }, [secondOfferOpen, phase, effectiveMode, emit, finishSession, loadNextPuzzle]);

  useEffect(() => {

    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      if (document.hidden && !paused) {
        pauseReturnRef.current =
          document.activeElement instanceof HTMLElement && document.activeElement !== document.body
            ? document.activeElement
            : headingRef.current;
        setPaused(true);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, paused]);


  useEffect(() => {

    if (phase === "done" || phase === "saved") {
      window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 40);
    }
  }, [phase]);

  useEffect(() => {
    if (paused) {
      const id = window.setTimeout(() => pauseResumeRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    const target = pauseReturnRef.current;
    pauseReturnRef.current = null;
    if (!target?.isConnected) return;
    const id = window.setTimeout(() => target.focus(), 0);
    return () => window.clearTimeout(id);
  }, [paused]);

  useEffect(() => {
    if (!secondOfferOpen) return;
    const id = window.setTimeout(() => secondFirstButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [secondOfferOpen]);

  useEffect(() => {

    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const threshold = stuckThresholdMs(relaxed);
      if (
        (nowMs() - lastProgressAtRef.current > threshold || failedPlacements >= 3) &&
        hintLevel === 0
      ) {
        setHintLevel(1);
        emit("hint_shown", { level: 1, auto: true });
        announce(computeNextHint(
          {
            gapUnits: puzzle?.gapUnits ?? 0,
            filledUnits,
            trayValues: traySorted.map((p) => p.units),
            attempts,
            hintLevelShown: 0,
          },
          { denominator: puzzle?.denominator ?? 1, formatDiff }
        )?.message ?? "");
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [phase, relaxed, hintLevel, attempts, failedPlacements, puzzle, filledUnits, traySorted, emit, announce]);

  useEffect(() => {
    if (!scanOn || phase !== "playing" || paused || busyRef.current || traySorted.length === 0) return;
    const id = window.setInterval(() => {
      setSelectedPieceId((current) => {
        const ids = traySorted.map((p) => p.id);
        if (ids.length === 0) return current;
        const idx = current ? ids.indexOf(current) : -1;
        return ids[(idx + 1) % ids.length] ?? ids[0]!;
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [scanOn, phase, paused, traySorted]);

  const placeSelected = useCallback((override?: Piece) => {
    if (
      !puzzle ||
      phase !== "playing" ||
      paused ||
      busyRef.current ||
      (effectiveMode !== "sandbox" && !relaxed && timeLeft <= 0)
    ) return;
    const piece = override ?? traySorted.find((p) => p.id === selectedPieceId);
    if (!piece) {
      announce("Tap a plank first, then the gap.");
      return;
    }

    const session = hydrateBridgeSession({
      puzzle,
      tray: originalTray,
      placed,
      selectedPieceId,
      attempts,
      failedPlacements,
      hintLevel,
      secondActive,
      score,
      starsTotal,
      bridgesSolved: recordsRef.current.length,
    });
    const { state: next, effects } = applyBridgeIntent(session, {
      type: "placePiece",
      pieceId: piece.id,
    });

    for (const effect of effects) {
      if (effect.type === "telemetry") {
        emit(
          effect.event as Parameters<NonNullable<typeof sinkRef.current>["emit"]>[0],
          effect.payload
        );
      } else if (effect.type === "cue") {
        cue(effect.cue);
      } else if (effect.type === "announce") {
        // Exact-fit announcement is handled below with star/score UI.
        if (next.phase !== "exact") announce(effect.text);
      }
    }

    setAttempts(next.attempts);
    setFailedPlacements(next.failedPlacements);
    setSelectedPieceId(next.selectedPieceId);
    setCombineFromId(null);
    lastProgressAtRef.current = nowMs();

    if (next.lastOutcome?.status === "overhang") {
      setOverhang({
        units: next.lastOverhang?.units ?? piece.units,
        label: next.lastOverhang?.label ?? piece.label,
        key: nowMs(),
      });
      later(() => setOverhang(null), 800);
      return;
    }

    setPlaced(next.placed);
    if (next.phase !== "exact" && next.placed.some((p) => p.id === piece.id)) {
      focusAfterPieceRemoval(piece);
    }

    if (next.lastOutcome?.status === "overshoot") {
      return;
    }

    if (next.phase === "exact") {
      busyRef.current = true;
      const earned =
        next.score - score;
      const earnedStars = next.starsTotal - starsTotal;
      const recordAttempt: AttemptRecord = {
        attempts: next.attempts,
        hintLevelMax: hintLevel,
        secondBuild: secondActive,
        points: earned,
      };
      setScore(next.score);
      setStarsTotal(next.starsTotal);
      setRecords((r) => {
        const nextRecords = [...r, recordAttempt];
        recordsRef.current = nextRecords;
        return nextRecords;
      });
      setFloatPoints(`${"\u2605".repeat(earnedStars)} +${earned}`);
      const nextRecords = [...records, recordAttempt];
      const summary = summarizeRound(nextRecords);
      emit("streak_update", { best: summary.bestStreak });
      const hardSolve = next.attempts >= 4 || hintLevel >= 2;
      setStuckRun((run) => (hardSolve ? run + 1 : 0));
      announce(
        secondActive
          ? `Different build fits! Plus ${earned} points.`
          : `It fits exactly! Plus ${earned} points.`
      );

      const offerSecond = effects.some((effect) => effect.type === "offerSecondBuild");
      if (offerSecond) {
        dialogReturnRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
        later(() => {
          setFloatPoints(null);
          setSecondOfferOpen(true);
        }, prefersReducedMotion() ? 300 : 800);
      } else {
        later(
          () => {
            setFloatPoints(null);
            if (nextRecords.length >= MAX_BRIDGES) {
              finishSession("bridges");
            } else {
              loadNextPuzzle();
            }
          },
          prefersReducedMotion() ? 500 : 1300
        );
      }
      return;
    }

    if (effects.some((effect: BridgeSessionEffect) => effect.type === "freshTray")) {
      setPlaced([]);
    }
  }, [
    puzzle, phase, paused, traySorted, selectedPieceId, placed, attempts, failedPlacements,
    hintLevel, secondActive, records, score, starsTotal, originalTray, cue, emit, announce,
    later, finishSession, loadNextPuzzle, effectiveMode, relaxed, timeLeft, focusAfterPieceRemoval,
  ]);

  const handlePiecePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, piece: Piece) => {
      if (phase !== "playing" || paused || busyRef.current) return;
      dragRef.current = {
        piece,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragged: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [paused, phase]
  );

  const handlePiecePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId || drag.dragged) return;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= 8) return;
      drag.dragged = true;
      setDraggingPieceId(drag.piece.id);
    },
    []
  );

  const handlePiecePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDraggingPieceId(null);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // The browser may release capture before pointerup on touch.
      }
      if (!drag.dragged) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const open = target instanceof Element ? target.closest(".bb-open") : null;
      if (open) placeSelected(drag.piece);
      else announce("Drop the plank on the open gap, or tap it to select it.");
    },
    [announce, placeSelected]
  );

  const handlePiecePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDraggingPieceId(null);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
    },
    []
  );

  useEffect(() => {

    placeSelectedRef.current = placeSelected;
    recordsRef.current = records;
  });

  const restoreDialogFocus = useCallback(() => {
    const target = dialogReturnRef.current;
    dialogReturnRef.current = null;
    window.setTimeout(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const acceptSecondBuild = useCallback(() => {
    if (!puzzle || phase !== "playing") return;
    setSecondOfferOpen(false);
    setSecondActive(true);
    setPlaced([]);
    setSelectedPieceId(null);
    setHintLevel(0);
    setAttempts(0);
    busyRef.current = false;
    emit("second_build", { accepted: true, puzzleId: puzzle.id });
    announce("Same gap, different planks. Build it another way!");
    lastProgressAtRef.current = nowMs();
    restoreDialogFocus();
  }, [puzzle, phase, emit, announce, restoreDialogFocus]);

  const declineSecondBuild = useCallback(() => {
    setSecondOfferOpen(false);
    emit("second_build", { accepted: false });
    restoreDialogFocus();
    if (records.length >= MAX_BRIDGES) finishSession("bridges");
    else loadNextPuzzle();
  }, [records.length, emit, finishSession, loadNextPuzzle, restoreDialogFocus]);

  const liftPlank = useCallback(
    (piece: Piece) => {
      if (!puzzle || phase !== "playing" || busyRef.current) return;
      const session = hydrateBridgeSession({
        puzzle,
        tray: originalTray,
        placed,
        selectedPieceId,
        attempts,
        failedPlacements,
        hintLevel,
        secondActive,
        score,
        starsTotal,
        bridgesSolved: recordsRef.current.length,
      });
      const { state: next, effects } = applyBridgeIntent(session, {
        type: "removePiece",
        pieceId: piece.id,
      });
      setPlaced(next.placed);
      for (const effect of effects) {
        if (effect.type === "telemetry") {
          emit(
            effect.event as Parameters<NonNullable<typeof sinkRef.current>["emit"]>[0],
            effect.payload
          );
        } else if (effect.type === "announce") {
          announce(effect.text);
        }
      }
      window.setTimeout(() => pieceRefs.current.get(piece.id)?.focus({ preventScroll: true }), 0);
      lastProgressAtRef.current = nowMs();
    },
    [
      puzzle,
      phase,
      originalTray,
      placed,
      selectedPieceId,
      attempts,
      failedPlacements,
      hintLevel,
      secondActive,
      score,
      starsTotal,
      emit,
      announce,
    ]
  );

  const splitLastPlank = useCallback(() => {
    if (phase !== "playing" || busyRef.current || placed.length === 0) return;
    const last = placed[placed.length - 1];
    const halves = splitPieceValue(last.units);
    if (!halves) {
      announce("That plank is too small to split.");
      return;
    }
    setPlaced((list) => list.slice(0, -1));
    const [l, r] = halves;
    const mk = (units: number, suffix: string): Piece => ({
      id: `${last.id}-s${suffix}-${nowMs() % 100000}`,
      units,
      label: formatDiff(units, puzzle?.denominator ?? 1),
      kind: "plank",
    });
    setOriginalTray((t) => [...t, mk(l, "a"), mk(r, "b")]);
    emit("piece_split", { fromUnits: last.units, into: halves });
    announce(`Split ${formatDiff(last.units, puzzle?.denominator ?? 1)} into two.`);
    lastProgressAtRef.current = nowMs();
  }, [phase, placed, puzzle, emit, announce]);

  const commitMerge = useCallback(
    (second: Piece) => {
      if (!combineFromId || !puzzle) return;
      const first = traySorted.find((p) => p.id === combineFromId);
      if (!first || first.id === second.id) {
        setCombineFromId(null);
        return;
      }
      const mergedUnits = mergePieceValues(first.units, second.units, puzzle.gapUnits);
      if (mergedUnits === null) {
        announce("Those will not combine — the gap is not that long.");
        setCombineFromId(null);
        return;
      }
      const merged: Piece = {
        id: `merge-${nowMs() % 1000000}`,
        units: mergedUnits,
        label: formatDiff(mergedUnits, puzzle.denominator),
        kind: "plank",
      };
      setOriginalTray((t) =>
        t
          .filter((p) => p.id !== first.id && p.id !== second.id)
          .concat([merged])
      );
      setSelectedPieceId(null);
      setCombineFromId(null);
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.bb-tray .bb-piece[tabindex="0"]')?.focus({
          preventScroll: true,
        });
      }, 0);
      cue("pickup");
      emit("piece_merge", { a: first.units, b: second.units, result: mergedUnits });
      announce(`Combined into ${merged.label}.`);
    },
    [combineFromId, puzzle, traySorted, cue, emit, announce]
  );

  const undo = useCallback(() => {
    if (phase !== "playing" || placed.length === 0 || busyRef.current) return;
    const piece = placed[placed.length - 1];
    setPlaced(placed.slice(0, -1));
    setSelectedPieceId(null);
    lastProgressAtRef.current = nowMs();
    announce(`Removed ${piece.label}.`);
  }, [phase, placed, announce]);

  const requestHint = useCallback(() => {
    if (!puzzle || phase !== "playing" || hintLevel >= 3) return;
    const nextLevel = (Math.min(hintLevel + 1, 3)) as 1 | 2 | 3;
    const outcome = computeNextHint(
      {
        gapUnits: puzzle.gapUnits,
        filledUnits,
        trayValues: traySorted.map((p) => p.units),
        attempts,
        hintLevelShown: (nextLevel - 1) as 0 | 1 | 2,
      },
      {
        denominator: puzzle.denominator,
        formatDiff,
        pieces: new Map(traySorted.map((p) => [p.units, p.id])),
      }
    );
    if (!outcome) return;
    setHintLevel(nextLevel);
    emit("hint_shown", { level: nextLevel, auto: false, puzzleId: puzzle.id });
    if (outcome.message) announce(outcome.message);
    else if (outcome.level === 2) announce("A highlighted plank can help.");
    else announce("The ghost outline shows one spot that works.");
  }, [puzzle, phase, hintLevel, filledUnits, traySorted, attempts, emit, announce]);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      const ids = traySorted.map((p) => p.id);
      if (ids.length === 0) return;
      const currentIndex = selectedPieceId ? ids.indexOf(selectedPieceId) : direction === 1 ? -1 : 0;
      const nextId = ids[Math.max(0, Math.min(ids.length - 1, currentIndex + direction))];
      if (!nextId) return;
      setSelectedPieceId(nextId);
      window.setTimeout(() => pieceRefs.current.get(nextId)?.focus(), 0);
    },
    [selectedPieceId, traySorted]
  );

  const trapSecondDialog = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const first = secondFirstButtonRef.current;
    const last = secondLastButtonRef.current;
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (phase !== "playing") return;
        if (secondOfferOpen) {
          declineSecondBuild();
          return;
        }
        if (combineFromId) setCombineFromId(null);
        if (!paused) {
          pauseReturnRef.current =
            document.activeElement instanceof HTMLElement && document.activeElement !== document.body
              ? document.activeElement
              : headingRef.current;
        }
        setPaused((p) => !p);
        return;
      }
      if (phase !== "playing" || paused) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const nativeControl = target?.closest("button, a, input, textarea, select");
      const gamePiece = target?.closest(".bb-piece");
      if (nativeControl && !gamePiece) return;
      if (event.key === "u" || event.key === "U") {
        undo();
        return;
      }
      if (event.key === "c" || event.key === "C") {
        if (combineFromId) {
          setCombineFromId(null);
          announce("Combine cancelled.");
        } else {
          const sel = selectedPieceId ?? traySorted[0]?.id ?? null;
          if (!sel) announce("Tap a plank first.");
          else {
            setSelectedPieceId(sel);
            setCombineFromId(sel);
            announce("Now tap another plank to combine them.");
          }
        }
        return;
      }
      if (event.key === "r" || event.key === "R") {
        announce(lastAnnouncementRef.current);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const active = document.activeElement as HTMLElement | null;
        const focusedId =
          active && active.classList.contains("bb-piece") ? active.getAttribute("data-piece-id") : null;
        const focusedPiece = focusedId
          ? traySorted.find((p) => p.id === focusedId)
          : undefined;
        placeSelectedRef.current(focusedPiece ?? (selectedPieceId ? traySorted.find((p) => p.id === selectedPieceId) : undefined));
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, paused, secondOfferOpen, combineFromId, selectedPieceId, traySorted, undo, announce, moveSelection, declineSecondBuild]);

  const hintOutcome = useMemo(() => {
    if (!puzzle || hintLevel === 0) return null;
    return computeNextHint(
      {
        gapUnits: puzzle.gapUnits,
        filledUnits,
        trayValues: traySorted.map((p) => p.units),
        attempts,
        hintLevelShown: (hintLevel - 1) as 0 | 1 | 2,
      },
      {
        denominator: puzzle.denominator,
        formatDiff,
        pieces: new Map(traySorted.map((p) => [p.units, p.id])),
      }
    );
  }, [puzzle, hintLevel, filledUnits, traySorted, attempts]);

  const totalSeconds = isBreak ? BREAK_SECONDS : SESSION_SECONDS;
  const ringPercent = Math.max(0, Math.min(1, timeLeft / totalSeconds));
  const progressPercent = relaxed
    ? Math.max(0, Math.min(1, records.length / MAX_BRIDGES))
    : ringPercent;

  if (phase === "setup") {
    return (
      <div className="demo-panel">
        <div className="demo-status bb-status">
          <span>
            Bridge Builder{isBreak ? " · break time" : ""} · pick your level
          </span>
          <button type="button" className="link-button" onClick={onExit}>
            All games
          </button>
        </div>

        <h2 className="sr-only">Choose a Bridge Builder level</h2>

        {isBreak ? (
          <div className="notice" style={{ marginBottom: 16 }}>
            Lesson block complete! You have {BREAK_SECONDS} seconds of building time, then we head
            back to practice.
          </div>
        ) : null}

        <div className="setup-block">
          {ALL_BANDS.map((id) => (
            <div key={id} style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="subject-card"
                style={{ width: "100%" }}
                onClick={() => startBand(id)}
              >
                <strong>{BAND_META[id].label}</strong>
                <span>{BAND_META[id].detail}</span>
              </button>
              {!isBreak ? (
                <div className="bb-skill-chips" role="group" aria-label={`Focus a ${BAND_META[id].label} skill`}>
                  {SKILLS_BY_BAND[id].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="bb-chip"
                      title={s.ccss.join(", ")}
                      onClick={(e) => {
                        e.stopPropagation();
                        startBand(id, s.id);
                      }}
                    >
                      {s.id.replace(/^bb-/, "").replace(/-/g, " ")}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {effectiveMode === "sandbox" ? (
          <p className="microcopy">
            Workshop is on — no clock or score.{" "}
            <button type="button" className="link-button" onClick={() => setEffectiveMode("free")}>
              Exit workshop
            </button>
          </p>
        ) : null}

        {!isBreak ? (
          <>
            <label style={{ display: "block", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={relaxed}
                onChange={(e) => setRelaxed(e.target.checked)}
              />{" "}
              Relaxed build (no clock)
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={soundOn}
                onChange={(e) => setSoundOn(e.target.checked)}
              />{" "}
              Sound effects
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={narrationOn}
                onChange={(e) => {
                  setNarrationOn(e.target.checked);
                  if (e.target.checked) cancelSpeech();
                }}
              />{" "}
              Read game announcements aloud
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={dotFaces}
                onChange={(e) => setDotFaces(e.target.checked)}
              />{" "}
              Dot faces on small planks (count the dots)
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={scanOn}
                onChange={(e) => setScanOn(e.target.checked)}
              />{" "}
              Switch/scan access (auto-advance selection)
            </label>
          </>
        ) : null}

        {!isBreak ? (
          <button
            type="button"
            className="subject-card"
            style={{ width: "100%", marginBottom: 12 }}
            onClick={() => setEffectiveMode("sandbox")}
          >
            <strong>Workshop (free build)</strong>
            <span>Any gap, no clock, no score — just try combinations</span>
          </button>
        ) : null}

        <p className="microcopy">
          Drag or tap planks into the gap so the bridge fits exactly.{" "}
          {isBreak
            ? `${BREAK_SECONDS} seconds of break, then straight back to practice.`
            : `${SESSION_SECONDS} seconds or ${MAX_BRIDGES} bridges — whichever comes first.`}
          {bestScore !== null ? ` Best this visit: ${bestScore} points (clears when you close the tab).` : ""}
        </p>
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div className="demo-panel closing-copy" role="status" aria-live="assertive">
        <div className="eyebrow">Break complete</div>
        <h2 ref={headingRef} tabIndex={-1}>
          Saved! Back to practice.
        </h2>
        <p className="lede">
          You built {records.length} {records.length === 1 ? "bridge" : "bridges"} during your
          break. Returning in {savedCountdown}s…
        </p>
        {savedConstruction ? (
          <p className="microcopy" data-testid="saved-construction">
            Your current bridge is saved at {formatDiff(savedConstruction.filledUnits, puzzle?.denominator ?? 1)} of {formatDiff(savedConstruction.gapUnits, puzzle?.denominator ?? 1)} with {savedConstruction.pieces} {savedConstruction.pieces === 1 ? "piece" : "pieces"}.
          </p>
        ) : null}
        <div className="demo-controls" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              if (onReturnToPractice) returnFromBreak("timer");
              else if (onExit) onExit();
              else setPhase("done");
            }}
          >
            Back to practice now
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const summary = summarizeRound(records);
    return (
      <div className="demo-panel closing-copy">
        <div className="eyebrow">{isBreak ? "Break complete" : "Round complete"}</div>
        <h2 ref={headingRef} tabIndex={-1}>
          You built {summary.bridges} {summary.bridges === 1 ? "bridge" : "bridges"}!
        </h2>
        {newBest ? <p className="lede"><strong>New personal best!</strong></p> : null}
        <div className="bb-lanterns" aria-hidden="true">
          {Array.from({ length: MAX_BRIDGES }).map((_, i) => (
            <span key={i} className={i < records.length ? "bb-lantern lit" : "bb-lantern"} />
          ))}
        </div>
        <div className="brief-grid" style={{ textAlign: "left" }}>
          <div className="brief-box">
            <span>Bridges</span>
            <strong>{summary.bridges}</strong>
          </div>
          <div className="brief-box">
            <span>Points</span>
            <strong>{summary.points}</strong>
          </div>
          <div className="brief-box">
            <span>Best streak</span>
            <strong>{summary.bestStreak}</strong>
          </div>
          <div className="brief-box">
            <span>Hints used</span>
            <strong>{summary.hintsUsed}</strong>
          </div>
          <div className="brief-box">
            <span>Stars</span>
            <strong>{starsTotal} {"\u2605"}</strong>
          </div>
        </div>
        <p id="bb-coaching" className="lede" style={{ margin: "0 auto 8px", maxWidth: 520 }}>
          {summary.coaching}
        </p>
        {shouldSuggestEasier(stuckRun) && easierBand(band ?? "g12") ? (
          <p className="microcopy">
            Tricky round — try{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                const down = easierBand(band ?? "g12");
                if (down) {
                  setBand(down);
                  startBand(down);
                }
              }}
            >
              one level easier ({BAND_META[easierBand(band ?? "g12") as Band].label})
            </button>
            ?
          </p>
        ) : null}
        <div className="demo-controls" style={{ justifyContent: "center" }}>
          <button type="button" onClick={() => setPhase("setup")} className="button primary">
            {isBreak ? "Done" : "Play again"}
          </button>
          <button type="button" className="link-button" onClick={onExit}>
            All games
          </button>
        </div>
        <p className="microcopy">
          Nothing about you is saved — your best score lives in this tab only and clears when you
          close it.
        </p>
      </div>
    );
  }

  const ghostWidth =
    hintLevel >= 3 && hintOutcome?.ghostUnits ? hintOutcome.ghostUnits * UNIT_PX : 0;
  const bridgeUnits = puzzle
    ? Math.max(puzzle.gapUnits, filledUnits + Math.abs(openUnits))
    : 0;
  const bridgeWidth = Math.max(320, bridgeUnits * UNIT_PX + CLIFF_PX * 2);

  return (
    <div className="demo-panel">
      <div className="demo-status bb-status">
        <span>
          {effectiveMode === "sandbox"
            ? "Workshop · free build"
            : `Bridge Builder · Score ${score}${secondActive ? " · another way" : ""}`}
        </span>
        {isBreak ? (
          <span
            className={`bb-ring ${timeLeft <= 10 ? "bb-ring-low" : ""}`}
            style={{ "--bb-p": `${ringPercent * 360}deg` } as CSSProperties}
            role="timer"
            aria-label={`${timeLeft} seconds until practice`}
          >
            <span>{timeLeft}</span>
          </span>
        ) : effectiveMode === "sandbox" ? null : relaxed ? (
          <span className="microcopy">relaxed</span>
        ) : (
          <span className={`timer ${timeLeft <= 10 ? "timer-low" : ""}`}>{timeLeft}s</span>
        )}
        <button
          type="button"
          className="link-button"
          aria-pressed={!soundOn}
          aria-label={soundOn ? "Mute sound effects" : "Unmute sound effects"}
          onClick={() => setSoundOn((s) => !s)}
        >
          {soundOn ? "\uD83D\uDD08" : "\uD83D\uDD07"}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => (isBreak && onReturnToPractice ? returnFromBreak("exit") : finishSession("exit"))}
        >
          Exit
        </button>
      </div>

      {effectiveMode !== "sandbox" ? (
        <div
          className="progress"
          role="progressbar"
          aria-label={relaxed ? "Bridges built" : isBreak ? "Break time remaining" : "Round time remaining"}
          aria-valuemin={0}
          aria-valuemax={relaxed ? MAX_BRIDGES : totalSeconds}
          aria-valuenow={relaxed ? records.length : timeLeft}
          aria-valuetext={
            relaxed
              ? `${records.length} of ${MAX_BRIDGES} bridges built`
              : `${timeLeft} seconds remaining`
          }
        >
          <span style={{ width: `${progressPercent * 100}%` }} />
        </div>
      ) : null}

      {effectiveMode !== "sandbox" && queue.length > 0 ? (
        <div
          className="bb-strip"
          data-testid="bb-strip"
          role="list"
          aria-label="Bridges this round"
        >
          {queue.map((q, i) => (
            <span
              key={q.id}
              role="listitem"
              className={[
                "bb-stop",
                i < queueIndex ? "bb-stop-done" : "",
                i === queueIndex ? "bb-stop-now" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {i < queueIndex ? "\u2713 " : ""}
              {q.gapLabel}
            </span>
          ))}
          <span
            className="bb-strip-skill"
            role="listitem"
            aria-label={`Current skill: ${skillById(puzzle?.skillId ?? "")?.id.replace(/^bb-/, "").replace(/-/g, " ") ?? ""}`}
          >
            {skillById(puzzle?.skillId ?? "")?.id.replace(/^bb-/, "").replace(/-/g, " ") ?? ""}
          </span>
        </div>
      ) : null}

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="bb-instruction"
        aria-describedby="bb-subline"
        data-gap-units={puzzle?.gapUnits ?? 0}
      >
        Gap needs {puzzle?.gapLabel ?? "…"}
        {puzzle?.legs ? (
          <span className="microcopy"> · brace between legs {puzzle.legs.a} and {puzzle.legs.b}</span>
        ) : null}
        {puzzle?.scaleNote && puzzle.scaleNote !== "alt" ? (
          <span className="microcopy"> · {puzzle.scaleNote}</span>
        ) : null}
      </h2>
      <p id="bb-subline" className="microcopy" data-filled-units={filledUnits}>
        Puzzle {Math.min(records.length + 1, MAX_BRIDGES)} of {MAX_BRIDGES}
        {puzzle && puzzle.presetPlaced.length > 0
          ? ` · pre-built section: ${formatDiff(puzzle.presetPlaced.reduce((a, p) => a + p.units, 0), puzzle.denominator)}`
          : ""}
        {filledUnits > 0 ? ` · Filled ${formatDiff(filledUnits, puzzle?.denominator ?? 1)}` : ""}
      </p>

      <div className="bb-bridge-wrap">
        <div
          className={`bb-bridge ${floatPoints ? "bb-solved" : ""}`}
          style={{ width: bridgeWidth }}
        >
          <div className="bb-cliff bb-cliff-left" />
          <div className="bb-cliff bb-cliff-right" />
          <div className="bb-gap-zone">
            {(puzzle?.presetPlaced ?? []).map((p) => (
              <div
                key={p.id}
                className="bb-plank bb-plank-preset"
                style={{ width: Math.abs(p.units) * UNIT_PX }}
                aria-hidden="true"
              >
                {p.label}
              </div>
            ))}
            {placed.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                title="Tap to pick this plank back up"
                aria-label={`Placed ${p.label}. Activate to pick it back up.`}
                className={`bb-plank ${p.kind.startsWith("beam") ? "bb-plank-beam" : ""}`}
                data-piece-id={p.id}
                style={{
                  width: Math.abs(p.units) * UNIT_PX,
                  ...(puzzle?.groupSize && p.units % puzzle.groupSize === 0
                    ? {
                        backgroundImage:
                          `repeating-linear-gradient(90deg, transparent 0 ${((puzzle.groupSize - 1) * UNIT_PX)}px,` +
                          ` rgba(255,255,255,.35) ${((puzzle.groupSize - 1) * UNIT_PX)}px,` +
                          ` rgba(255,255,255,.35) ${(puzzle.groupSize * UNIT_PX) - 4}px, transparent ${(puzzle.groupSize * UNIT_PX) - 4}px)`,
                      }
                    : {}),
                }}
                onClick={() => liftPlank(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    liftPlank(p);
                  }
                }}
              >
                <span className="bb-touch-target" aria-hidden="true" />
                {p.label}
              </div>
            ))}
            {openUnits !== 0 ? (
              <div
                className={`bb-open ${openUnits < 0 ? "bb-open-adjustment" : ""}`}
                style={{ width: Math.max(Math.abs(openUnits), 1) * UNIT_PX }}
                role="button"
                tabIndex={0}
                aria-label={
                  openUnits < 0
                    ? `Over by ${formatDiff(Math.abs(openUnits), puzzle?.denominator ?? 1)}. Activate to place a selected minus shim and return to the target.`
                    : `Open gap of ${formatDiff(openUnits, puzzle?.denominator ?? 1)}. Activate to place the selected plank.`
                }
                onClick={() => placeSelected()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    placeSelected();
                  }
                }}
              >
                <span className="bb-touch-target" aria-hidden="true" />
                {openUnits < 0 ? <span aria-hidden="true">− shim</span> : null}
              </div>
            ) : null}
          </div>
          {ghostWidth > 0 ? (
            <div
              className="bb-ghost"
              style={{
                left: CLIFF_PX + filledUnits * UNIT_PX,
                width: ghostWidth,
              }}
              aria-hidden="true"
            />
          ) : null}
          {overhang ? (
            <>
              <div
                className="bb-plank bb-plank-overhang"
                style={{ left: CLIFF_PX + filledUnits * UNIT_PX, width: overhang.units * UNIT_PX }}
                aria-hidden="true"
              >
                {overhang.label}
              </div>
              <div className="bb-diff-chip" aria-hidden="true">
                {overhang.label} too long — trim {formatDiff(
                  overhang.units + filledUnits - (puzzle?.gapUnits ?? 0),
                  puzzle?.denominator ?? 1
                )}
              </div>
            </>
          ) : null}
          {openUnits < 0 ? (
            <div className="bb-diff-chip bb-diff-chip-adjust" aria-hidden="true">
              Over by {formatDiff(Math.abs(openUnits), puzzle?.denominator ?? 1)} — add a minus shim
            </div>
          ) : null}
          {floatPoints ? <div className="bb-float" aria-hidden="true">{floatPoints}</div> : null}
          <div className="bb-critter" aria-hidden="true" />
        </div>
      </div>

      {combineFromId ? (
        <div className="bb-hint-chip" role="note">
          Pick another plank to combine them into one (Esc cancels).
        </div>
      ) : null}

      <div className="bb-tray" role="group" aria-label="Plank tray">
        {traySorted.map((piece) => (
          <button
            key={piece.id}
            type="button"
            ref={(element) => {
              if (element) pieceRefs.current.set(piece.id, element);
              else pieceRefs.current.delete(piece.id);
            }}
            tabIndex={
              selectedPieceId
                ? selectedPieceId === piece.id
                  ? 0
                  : -1
                : piece.id === traySorted[0]?.id
                  ? 0
                  : -1
            }
            className={[
              "bb-piece",
              draggingPieceId === piece.id ? "bb-piece-dragging" : "",
              selectedPieceId === piece.id ? "bb-piece-selected" : "",
              hintLevel >= 2 && hintOutcome?.highlightPieceId === piece.id ? "bb-piece-hint" : "",
              piece.units < 0 ? "bb-piece-shim" : "",
              piece.kind === "beam-x" || piece.kind === "beam-2x" ? "bb-piece-beam" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            // Keep the same 24 px/unit visual scale as the bridge. The
            // 180 px cap protects large algebra values on phone/zoom layouts;
            // short Grade-1 planks no longer collapse to the same width.
            style={{ width: Math.min(180, Math.abs(piece.units) * UNIT_PX) }}
            data-units={piece.units}
            data-piece-id={piece.id}
            aria-pressed={selectedPieceId === piece.id}
            aria-label={
              piece.units < 0
                ? `${piece.label} minus shim. Use after an overshoot.`
                : `${piece.label} plank`
            }
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              cue("pickup");
              if (combineFromId) {
                commitMerge(piece);
                return;
              }
              if (selectedPieceId === piece.id) placeSelected();
              else setSelectedPieceId(piece.id);
            }}
            onPointerDown={(event) => handlePiecePointerDown(event, piece)}
            onPointerMove={handlePiecePointerMove}
            onPointerUp={handlePiecePointerUp}
            onPointerCancel={handlePiecePointerCancel}
          >
            {dotFaces && band === "g12" && piece.units > 0 && piece.units <= 10 ? (
              <span className="bb-dots" aria-hidden="true">
                {Array.from({ length: piece.units }).map((_, di) => (
                  <i key={di} />
                ))}
                <span className="sr-only">{piece.label}</span>
              </span>
            ) : (
              piece.label
            )}
          </button>
        ))}
      </div>

      {hintLevel >= 1 && hintOutcome?.message ? (
        <div className="bb-hint-chip" role="note">
          {hintOutcome.message}
        </div>
      ) : null}

      <div className="demo-controls">
        <button type="button" className="link-button" onClick={undo}>
          Undo
        </button>
        <button
          type="button"
          className="link-button"
          onClick={splitLastPlank}
          disabled={placed.length === 0 || (placed[placed.length - 1]?.units ?? 0) < 2}
        >
          ✂ Split last
        </button>
        <button
          type="button"
          className="link-button"
          aria-pressed={!!combineFromId}
          disabled={traySorted.length < 2}
          onClick={() => {
            if (combineFromId) {
              setCombineFromId(null);
              return;
            }
            const sel = selectedPieceId ?? traySorted[0]?.id ?? null;
            if (!sel) {
              announce("Tap a plank first, then pick one to combine it with.");
              return;
            }
            setSelectedPieceId(sel);
            setCombineFromId(sel);
            announce("Now tap another plank to combine them.");
          }}
        >
          ⧉ Combine
        </button>
        <button
          type="button"
          className="link-button"
          onClick={requestHint}
          disabled={hintLevel >= 3}
        >
          Hint ✨
        </button>
        <span className="microcopy bb-controls-help">
          Tap a plank, then the gap · Arrows move · Enter places · U undo · C combine · R repeat · Esc pause
        </span>
      </div>

      {secondOfferOpen ? (
        <div
          className="bb-second-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bb-second-title"
          aria-describedby="bb-second-description"
          onKeyDown={trapSecondDialog}
        >
          <strong id="bb-second-title" ref={secondTitleRef}>Build it another way? +5 points</strong>
          <p id="bb-second-description" className="microcopy">Same gap — fresh planks, different plan.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              ref={secondFirstButtonRef}
              type="button"
              className="button primary"
              onClick={acceptSecondBuild}
            >
              Sure!
            </button>
            <button
              ref={secondLastButtonRef}
              type="button"
              className="button"
              onClick={declineSecondBuild}
            >
              Keep building
            </button>
          </div>
        </div>
      ) : null}

      {paused ? (
        <div
          className="bb-pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bb-pause-title"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              pauseResumeRef.current?.focus();
            }
          }}
        >
          <h2 id="bb-pause-title">Paused — take your time.</h2>
          <button
            ref={pauseResumeRef}
            type="button"
            className="button primary"
            onClick={() => setPaused(false)}
          >
            Resume
          </button>
        </div>
      ) : null}

      <p ref={liveRef} className="bb-caption" role="status" aria-live="polite" aria-atomic="true">
        <span className="sr-only">Game update: </span>{announceText}
      </p>
    </div>
  );
}
