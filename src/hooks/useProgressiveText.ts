import { useEffect, useMemo, useRef, useState } from "react";

type Cadence = "chunk";

type ProgressiveOptions = {
  minCps?: number;
  maxCps?: number;
  backlogThreshold?: number;
  maxCharsPerFrame?: number;
};

type ProgressiveConfig = {
  active: boolean;
  onTick?: () => void;
  cadence?: Cadence;
  options?: ProgressiveOptions;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const useProgressiveText = (fullText: string, config: ProgressiveConfig) => {
  const { active, onTick, cadence = "chunk", options } = config;
  const {
    minCps = 24,
    maxCps = 240,
    backlogThreshold = 400,
    maxCharsPerFrame = 120,
  } = options ?? {};

  const [displayedText, setDisplayedText] = useState(fullText);
  const displayedRef = useRef(fullText);
  const lastFullRef = useRef(fullText);
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const activeRef = useRef(active);
  const onTickRef = useRef(onTick);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
  };

  const scheduleLoop = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(runLoop);
  };

  const runLoop = (timestamp: number) => {
    rafRef.current = null;

    if (!activeRef.current) {
      stopLoop();
      return;
    }

    if (!lastTickRef.current) {
      lastTickRef.current = timestamp;
    }

    const elapsedMs = Math.max(0, timestamp - lastTickRef.current);
    lastTickRef.current = timestamp;

    const backlog = bufferRef.current.length;
    if (backlog === 0) {
      stopLoop();
      return;
    }

    const speedScale = clamp01(backlog / backlogThreshold);
    const cps = minCps + (maxCps - minCps) * speedScale;
    const charsToAppend = Math.min(
      maxCharsPerFrame,
      Math.max(1, Math.floor((cps * elapsedMs) / 1000))
    );

    const nextChunk = bufferRef.current.slice(0, charsToAppend);
    bufferRef.current = bufferRef.current.slice(charsToAppend);
    if (nextChunk) {
      displayedRef.current += nextChunk;
      setDisplayedText(displayedRef.current);
      onTickRef.current?.();
    }

    if (bufferRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      stopLoop();
    }
  };

  useEffect(() => {
    activeRef.current = active;
    onTickRef.current = onTick;
  }, [active, onTick]);

  useEffect(() => {
    if (!active) {
      bufferRef.current = "";
      lastFullRef.current = fullText;
      displayedRef.current = fullText;
      setDisplayedText(fullText);
      stopLoop();
      return;
    }

    const lastFull = lastFullRef.current;
    if (fullText.length >= lastFull.length && fullText.startsWith(lastFull)) {
      const diff = fullText.slice(lastFull.length);
      if (diff.length > 0) {
        bufferRef.current += diff;
        lastFullRef.current = fullText;
        if (cadence === "chunk") {
          scheduleLoop();
        }
      }
    } else {
      bufferRef.current = "";
      lastFullRef.current = fullText;
      displayedRef.current = fullText;
      setDisplayedText(fullText);
      stopLoop();
    }
  }, [active, cadence, fullText]);

  useEffect(() => () => stopLoop(), []);

  return useMemo(
    () => ({
      displayedText,
      backlogLength: bufferRef.current.length,
    }),
    [displayedText]
  );
};
