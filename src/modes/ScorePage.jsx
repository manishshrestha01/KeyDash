import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getWordSpans = (text = "") => {
  const spans = [];
  const regex = /\S+/g;
  let match = regex.exec(text);
  while (match) {
    spans.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    match = regex.exec(text);
  }
  return spans;
};

const formatSeconds = (value) => `${Math.max(0, value).toFixed(2)}s`;
const toVisibleChar = (char, emptySymbol = "·") => {
  if (char === " ") return "␣";
  if (char === "\n") return "↵";
  if (char === "\t") return "⇥";
  return char || emptySymbol;
};

const createShareCode = (length = 8) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
};

const ScorePage = () => {
  const { user, profile } = useAuth();
  const { shareCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [shareStatus, setShareStatus] = useState("");
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [shareImageDataUrl, setShareImageDataUrl] = useState("");
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [generatedShareCode, setGeneratedShareCode] = useState(shareCode || "");
  const [resolvedResultState, setResolvedResultState] = useState(null);
  const [isLoadingSharedResult, setIsLoadingSharedResult] = useState(false);
  const [sharedResultError, setSharedResultError] = useState("");
  const shareCardRef = useRef(null);

  const resultState = location.state || resolvedResultState || {};
  const {
    target = "",
    input = "",
    durationSec: stateDurationSec = 0,
    wpm: stateWpm,
    acc: stateAcc,
    mistakes: stateMistakes,
    mode: stateMode = "typing",
    subMode: stateSubMode = "",
    sharedBy: stateSharedBy = "",
    mistakenIndices,
    charTimings: stateCharTimings,
    corrections: stateCorrections,
  } = resultState;

  useEffect(() => {
    if (shareCode) {
      setGeneratedShareCode(shareCode);
    }
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode || location.state) return;

    let isMounted = true;
    setIsLoadingSharedResult(true);
    setSharedResultError("");

    const loadSharedResult = async () => {
      const { data: sharedRow, error: sharedError } = await supabase
        .from("shared_results")
        .select("share_code, wpm, accuracy, mode, typing_history_id, user_id, created_at")
        .eq("share_code", shareCode)
        .maybeSingle();

      if (!isMounted) return;

      if (sharedError || !sharedRow) {
        console.error("Failed to load shared result:", sharedError);
        setResolvedResultState(null);
        setSharedResultError("Shared result not found.");
        setIsLoadingSharedResult(false);
        return;
      }

      let nextState = {
        target: "",
        input: "",
        durationSec: 0,
        wpm: sharedRow.wpm,
        acc: Number(sharedRow.accuracy),
        mistakes: 0,
        mistakenIndices: [],
        charTimings: [],
        corrections: 0,
        mode: sharedRow.mode || "typing",
        subMode: "",
        sharedBy: "",
      };

      if (sharedRow.typing_history_id) {
        const { data: historyRow, error: historyError } = await supabase
          .from("typing_history")
          .select(
            "mode, sub_mode, original_text, typed_text, wpm, accuracy, errors, duration_seconds, mistake_indices, corrections"
          )
          .eq("id", sharedRow.typing_history_id)
          .maybeSingle();

        if (!historyError && historyRow) {
          nextState = {
            ...nextState,
            target: historyRow.original_text || "",
            input: historyRow.typed_text || "",
            durationSec: toNumber(historyRow.duration_seconds, 0),
            wpm: toNumber(historyRow.wpm, sharedRow.wpm),
            acc: toNumber(historyRow.accuracy, Number(sharedRow.accuracy)),
            mistakes: toNumber(historyRow.errors, 0),
            mistakenIndices: Array.isArray(historyRow.mistake_indices) ? historyRow.mistake_indices : [],
            corrections: toNumber(historyRow.corrections, 0),
            mode: historyRow.mode || nextState.mode,
            subMode: historyRow.sub_mode || "",
          };
        }
      }

      if (sharedRow.user_id) {
        const { data: ownerProfile, error: ownerError } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", sharedRow.user_id)
          .maybeSingle();

        if (!ownerError && ownerProfile?.display_name) {
          nextState.sharedBy = ownerProfile.display_name;
        }
      }

      if (!isMounted) return;
      setResolvedResultState(nextState);
      setSharedResultError("");
      setIsLoadingSharedResult(false);
    };

    loadSharedResult();

    return () => {
      isMounted = false;
    };
  }, [location.state, shareCode]);

  const durationSec = toNumber(stateDurationSec, 0);

  const mistakenIndexSet = useMemo(
    () => new Set(Array.isArray(mistakenIndices) ? mistakenIndices : []),
    [mistakenIndices]
  );

  // Compute basic stats from input/target as fallback
  let correct = 0;
  if (target && input) {
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++;
    }
  }

  const baseWpm = durationSec > 0 ? correct / 5 / (durationSec / 60) : 0;
  const baseWpmInt = Math.round(baseWpm);
  const baseAccuracy = input.length > 0 ? (correct / input.length) * 100 : 0;
  const baseMistakes = input.length > 0 ? Math.max(0, input.length - correct) : 0;

  const parsedWpm = toNumber(stateWpm, NaN);
  const parsedAcc = toNumber(stateAcc, NaN);
  const parsedMistakes = toNumber(stateMistakes, NaN);

  const displayWpm = Number.isFinite(parsedWpm) ? Math.round(parsedWpm) : baseWpmInt;
  const displayAcc = Number.isFinite(parsedAcc) ? parsedAcc : parseFloat(baseAccuracy.toFixed(1));
  const displayMistakes = Number.isFinite(parsedMistakes)
    ? Math.max(0, Math.round(parsedMistakes))
    : baseMistakes;
  const displayedCorrectChars = Math.max(0, input.length - displayMistakes);

  // Chart data
  const chartDurationSec = durationSec > 0 ? durationSec : Math.max(1, input.length / 5);
  const seconds = Math.max(1, Math.ceil(chartDurationSec));
  const timeLabels = Array.from({ length: seconds }, (_, i) => (i + 1).toString());
  if (seconds > 1 && chartDurationSec % 1 !== 0) {
    timeLabels[seconds - 1] = chartDurationSec.toFixed(1);
  }

  let cumulativeCorrect = Array(seconds).fill(0);
  let cumulativeMistakes = Array(seconds).fill(0);
  if (target && input.length > 0) {
    if (mistakenIndexSet.size > 0) {
      const typedPerSec = Array(seconds).fill(0);
      const mistakesPerSec = Array(seconds).fill(0);
      for (let i = 0; i < input.length; i++) {
        const charTime = ((i + 1) * chartDurationSec) / input.length;
        const secIdx = Math.min(Math.floor(charTime), seconds - 1);
        typedPerSec[secIdx] += 1;
        if (mistakenIndexSet.has(i)) mistakesPerSec[secIdx] += 1;
      }
      for (let i = 1; i < seconds; i++) {
        typedPerSec[i] += typedPerSec[i - 1];
        mistakesPerSec[i] += mistakesPerSec[i - 1];
      }
      cumulativeMistakes = mistakesPerSec;
      cumulativeCorrect = typedPerSec.map((typed, idx) => Math.max(0, typed - mistakesPerSec[idx]));
    } else {
      for (let i = 0; i < input.length; i++) {
        const charTime = ((i + 1) * chartDurationSec) / input.length;
        const secIdx = Math.min(Math.floor(charTime), seconds - 1);
        if (input[i] === target[i]) {
          cumulativeCorrect[secIdx] += 1;
        } else {
          cumulativeMistakes[secIdx] += 1;
        }
      }
      for (let i = 1; i < seconds; i++) {
        cumulativeCorrect[i] += cumulativeCorrect[i - 1];
        cumulativeMistakes[i] += cumulativeMistakes[i - 1];
      }
    }
  }

  const wpmData = cumulativeCorrect.map((correctSoFar, i) => {
    let elapsedSec = i + 1;
    if (i === seconds - 1 && chartDurationSec % 1 !== 0) {
      elapsedSec = chartDurationSec;
      correctSoFar =
        mistakenIndexSet.size > 0
          ? cumulativeCorrect[cumulativeCorrect.length - 1]
          : correct;
    }
    const timeMin = elapsedSec / 60;
    return timeMin > 0 ? Math.round(correctSoFar / 5 / timeMin) : 0;
  });
  if (wpmData.length > 0) {
    wpmData[wpmData.length - 1] = displayWpm;
  }

  const data = {
    labels: timeLabels,
    datasets: [
      {
        label: "WPM",
        data: wpmData,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251, 191, 36, 0.1)",
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: "y",
      },
      {
        label: "Errors",
        data: cumulativeMistakes,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#9ca3af",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#fbbf24",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(251, 191, 36, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        titleFont: {
          family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          size: 14,
          weight: "600",
        },
        bodyFont: {
          family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          size: 13,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255,255,255,0.05)",
          drawBorder: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "Time (seconds)",
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
        grid: {
          color: "rgba(255,255,255,0.05)",
          drawBorder: false,
        },
        ticks: {
          color: "#fbbf24",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "WPM",
          color: "#fbbf24",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#ef4444",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
          },
        },
        title: {
          display: true,
          text: "Errors",
          color: "#ef4444",
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            size: 12,
          },
        },
      },
    },
  };

  const parsedCharEvents = useMemo(() => {
    if (!Array.isArray(stateCharTimings) || stateCharTimings.length === 0) return [];

    return stateCharTimings
      .map((entry) => {
        const index = toNumber(entry?.index, NaN);
        const time = toNumber(entry?.time, NaN);
        if (!Number.isFinite(index) || !Number.isFinite(time) || index < 0) {
          return null;
        }

        const rawType = typeof entry?.type === "string" ? entry.type.toLowerCase() : "insert";
        const type = rawType === "delete" ? "delete" : "insert";

        return {
          index: Math.floor(index),
          time,
          type,
          char: typeof entry?.char === "string" ? entry.char : "",
          correct: typeof entry?.correct === "boolean" ? entry.correct : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  }, [stateCharTimings]);

  const wordAnalysis = useMemo(() => {
    const spans = getWordSpans(target);
    if (spans.length === 0) {
      return {
        words: [],
        slowWords: [],
        avgSecondsPerChar: 0,
        estimatedTiming: true,
      };
    }

    const safeDuration = chartDurationSec > 0 ? chartDurationSec : 1;
    const typingChars = Math.max(1, input.length || target.length);
    const avgCharMs = (safeDuration * 1000) / typingChars;
    const localMistakenSet = new Set(Array.isArray(mistakenIndices) ? mistakenIndices : []);

    let timingEntries = parsedCharEvents
      .filter((entry) => entry.type !== "delete")
      .map((entry) => ({ index: entry.index, time: entry.time }));

    let estimatedTiming = false;
    if (timingEntries.length === 0) {
      estimatedTiming = true;
      const estimatedCharCount = Math.max(1, input.length);
      timingEntries = Array.from({ length: estimatedCharCount }, (_, i) => ({
        index: i,
        time: ((i + 1) / estimatedCharCount) * safeDuration * 1000,
      }));
    }

    const minTime = Math.min(...timingEntries.map((entry) => entry.time));
    const latestTimingByIndex = new Map();
    timingEntries.forEach((entry) => {
      const normalizedTime = entry.time - minTime;
      const previous = latestTimingByIndex.get(entry.index);
      if (typeof previous !== "number" || normalizedTime > previous) {
        latestTimingByIndex.set(entry.index, normalizedTime);
      }
    });

    const words = spans.map((span, idx) => {
      const expected = span.word;
      const typedStart = Math.min(span.start, input.length);
      const typedEnd = Math.min(span.end, input.length);
      const typed = typedEnd > typedStart ? input.slice(typedStart, typedEnd) : "";
      const typedLen = typed.length;
      const hasReachedWord = input.length > span.start;
      const isPartial = typedLen > 0 && typedLen < expected.length;

      let mistakes = 0;
      if (localMistakenSet.size > 0) {
        for (let i = span.start; i < typedEnd; i++) {
          if (localMistakenSet.has(i)) mistakes++;
        }
      } else {
        for (let i = span.start; i < typedEnd; i++) {
          if ((input[i] || "") !== target[i]) mistakes++;
        }
      }

      const observedTimes = [];
      for (let i = span.start; i < typedEnd; i++) {
        const time = latestTimingByIndex.get(i);
        if (typeof time === "number") observedTimes.push(time);
      }

      let durationMs = 0;
      if (typedLen === 0) {
        durationMs = 0;
      } else if (observedTimes.length >= 2) {
        durationMs = Math.max(
          avgCharMs,
          Math.max(...observedTimes) - Math.min(...observedTimes) + avgCharMs
        );
      } else {
        durationMs = Math.max(avgCharMs, typedLen * avgCharMs);
      }

      const wordSeconds = durationMs / 1000;
      const secondsPerChar = typedLen > 0 ? wordSeconds / Math.max(1, typedLen) : 0;
      let status = "Not Reached";
      if (typedLen > 0) {
        if (mistakes > 0) {
          status = "Mistakes";
        } else if (isPartial) {
          status = "Partial";
        } else {
          status = "Clean";
        }
      } else if (hasReachedWord) {
        status = "Partial";
      }

      return {
        id: `${idx}-${span.start}`,
        index: idx + 1,
        start: span.start,
        expected,
        typed,
        mistakes: Math.max(0, mistakes),
        seconds: wordSeconds,
        secondsPerChar,
        status,
      };
    });

    const typedWords = words.filter((word) => word.typed.length > 0);
    const slowWords = [...typedWords]
      .filter((word) => word.typed.length > 0)
      .sort((a, b) => b.secondsPerChar - a.secondsPerChar)
      .slice(0, 5);

    const avgSecondsPerChar =
      typedWords.length > 0
        ? typedWords.reduce((sum, word) => sum + word.secondsPerChar, 0) / typedWords.length
        : 0;

    return {
      words,
      slowWords,
      avgSecondsPerChar,
      estimatedTiming,
    };
  }, [chartDurationSec, input, mistakenIndices, parsedCharEvents, target]);

  const paragraphAnalysis = useMemo(() => {
    const deletedEvents = parsedCharEvents.filter(
      (entry) => entry.type === "delete" && typeof entry.char === "string" && entry.char.length > 0
    );

    const erasedByIndex = new Map();
    deletedEvents.forEach((event) => {
      const existing = erasedByIndex.get(event.index) || [];
      existing.push(event.char);
      erasedByIndex.set(event.index, existing);
    });

    const highestErasedIndex =
      deletedEvents.length > 0
        ? Math.max(...deletedEvents.map((event) => event.index)) + 1
        : 0;
    // In timed/incomplete runs, only score the portion the user actually reached.
    const analyzedLength = Math.max(input.length, highestErasedIndex);
    const targetAnalyzedSlice = target.slice(0, analyzedLength);
    const inputAnalyzedSlice = input.slice(0, analyzedLength);
    const expectedSpaces = [...targetAnalyzedSlice].filter((char) => char === " ").length;
    const typedSpaces = [...inputAnalyzedSlice].filter((char) => char === " ").length;
    const maxLen = analyzedLength;

    const chars = Array.from({ length: maxLen }, (_, index) => {
      const expectedChar = target[index] || "";
      const typedChar = input[index] || "";
      const wasMistyped = mistakenIndexSet.has(index);
      const erasedChars = erasedByIndex.get(index) || [];
      const hasErasedChar = erasedChars.length > 0;
      const isCorrect =
        expectedChar &&
        typedChar &&
        expectedChar === typedChar &&
        !wasMistyped;
      const isMissing = expectedChar && !typedChar;
      const isWrong = expectedChar && typedChar && expectedChar !== typedChar;
      const isMissingSpace = expectedChar === " " && typedChar !== " ";
      const isExtraSpace = typedChar === " " && expectedChar !== " ";
      const isExtraTypedChar = typedChar && !expectedChar;
      const isCorrected =
        (expectedChar && typedChar && expectedChar === typedChar && (wasMistyped || hasErasedChar)) ||
        (!expectedChar && !typedChar && hasErasedChar);

      let mistakeLabel = "";
      if (isMissingSpace) {
        mistakeLabel = "␣→·";
      } else if (isExtraSpace) {
        mistakeLabel = "·→␣";
      } else if (isMissing) {
        mistakeLabel = `${toVisibleChar(expectedChar)}→·`;
      } else if (isExtraTypedChar) {
        mistakeLabel = `·→${toVisibleChar(typedChar)}`;
      } else if (isWrong) {
        mistakeLabel = `${toVisibleChar(expectedChar)}→${toVisibleChar(typedChar)}`;
      } else if (wasMistyped && typedChar && expectedChar && typedChar === expectedChar) {
        // The user eventually corrected this position, but had a historical error.
        mistakeLabel = `${toVisibleChar(expectedChar)}*`;
      }

      return {
        index,
        expectedChar,
        typedChar,
        wasMistyped,
        erasedChars,
        isCorrect,
        isMissing,
        isWrong,
        isMissingSpace,
        isExtraSpace,
        isExtraTypedChar,
        isCorrected,
        mistakeLabel,
      };
    });

    const mistakeCount = chars.filter((charData) => charData.mistakeLabel).length;
    const correctedCount = chars.filter((charData) => charData.isCorrected).length;

    return {
      chars,
      analyzedLength,
      totalTargetLength: target.length,
      expectedSpaces,
      typedSpaces,
      missingSpaces: Math.max(0, expectedSpaces - typedSpaces),
      extraSpaces: Math.max(0, typedSpaces - expectedSpaces),
      correctedCount,
      mistakeCount,
    };
  }, [input, mistakenIndexSet, parsedCharEvents, target]);

  const recommendations = useMemo(() => {
    const list = [];
    const totalChars = Math.max(1, input.length);
    const errorRate = (displayMistakes / totalChars) * 100;
    const corrections = Math.max(0, Math.round(toNumber(stateCorrections, 0)));
    const slowestWord = wordAnalysis.slowWords[0];

    if (displayAcc < 92 || errorRate > 7) {
      list.push("Accuracy dropped in this run. Slow down slightly and prioritize clean key presses before increasing speed.");
    }

    if (paragraphAnalysis.missingSpaces > 0) {
      list.push(`You likely skipped spaces (${paragraphAnalysis.missingSpaces}). Watch for word boundaries and tap space deliberately.`);
    }

    if (corrections > Math.max(4, totalChars * 0.08)) {
      list.push("You corrected often with backspace. Try typing in smaller word chunks to reduce resets.");
    }

    if (
      slowestWord &&
      wordAnalysis.avgSecondsPerChar > 0 &&
      slowestWord.secondsPerChar > wordAnalysis.avgSecondsPerChar * 1.35
    ) {
      list.push(`You slowed down most on "${slowestWord.expected}". Repeat words with similar letter patterns to build flow.`);
    }

    if (displayWpm < 35) {
      list.push("Build speed with short 3-5 minute sessions at a steady rhythm, then gradually push pace.");
    } else if (displayWpm >= 60 && displayAcc >= 95) {
      list.push("Strong performance. Increase difficulty or reduce timer length to keep challenging your ceiling.");
    }

    if (list.length === 0) {
      list.push("Consistent run. Keep repeating this mode and aim to reduce one or two mistakes each attempt.");
    }

    return list.slice(0, 3);
  }, [
    displayAcc,
    displayMistakes,
    displayWpm,
    input.length,
    paragraphAnalysis.missingSpaces,
    stateCorrections,
    wordAnalysis,
  ]);

  const handlePlayAgain = () => navigate("/");

  const getPerformanceRating = () => {
    if (displayWpm >= 80 && displayAcc >= 98) return { text: "Exceptional!", color: "text-purple-400" };
    if (displayWpm >= 60 && displayAcc >= 95) return { text: "Excellent!", color: "text-green-400" };
    if (displayWpm >= 40 && displayAcc >= 90) return { text: "Good Job!", color: "text-blue-400" };
    if (displayWpm >= 30 && displayAcc >= 85) return { text: "Keep Practicing!", color: "text-yellow-400" };
    return { text: "Room to Improve", color: "text-orange-400" };
  };

  const rating = getPerformanceRating();
  const shareDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );
  const baseAppUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/`
      : "https://keydash.shresthamanish.info.np/";
  const activeShareCode = generatedShareCode || shareCode || "";
  const shareResultUrl = activeShareCode ? `${baseAppUrl}s/${activeShareCode}` : baseAppUrl;
  const shareOwnerName = stateSharedBy || profile?.display_name || "";
  const shareCaption = useMemo(
    () =>
      `I just scored ${displayWpm} WPM with ${displayAcc.toFixed(
        1
      )}% accuracy on KeyDash. Can you beat me?`,
    [displayAcc, displayWpm]
  );

  const resolveTypingHistoryIdForShare = async () => {
    if (!user?.id) return null;

    const { data: recentRows, error: recentError } = await supabase
      .from("typing_history")
      .select("id, wpm, accuracy, duration_seconds, errors, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (recentError || !Array.isArray(recentRows) || recentRows.length === 0) {
      return null;
    }

    const targetAcc = Number(displayAcc.toFixed(2));
    const targetDuration = Number(chartDurationSec.toFixed(2));
    const targetErrors = Number(displayMistakes);

    const matchedRow = recentRows.find((row) => {
      const rowAcc = Number(row.accuracy);
      const rowDuration = Number(row.duration_seconds);
      const rowErrors = Number(row.errors || 0);

      return (
        Math.abs(Number(row.wpm) - displayWpm) <= 1 &&
        Math.abs(rowAcc - targetAcc) <= 0.25 &&
        Math.abs(rowDuration - targetDuration) <= 3 &&
        Math.abs(rowErrors - targetErrors) <= 2
      );
    });

    return matchedRow?.id || recentRows[0]?.id || null;
  };

  const ensureShareCode = async () => {
    const existingCode = generatedShareCode || shareCode;
    if (existingCode) return existingCode;

    if (!user?.id) {
      setShareStatus("Login is required to generate a shareable link preview.");
      return null;
    }

    setIsCreatingShareLink(true);
    setShareStatus("");

    try {
      const typingHistoryId = await resolveTypingHistoryIdForShare();
      const modeLabel = stateSubMode ? `${stateMode}:${stateSubMode}` : stateMode || "typing";

      for (let attempt = 0; attempt < 4; attempt++) {
        const candidateCode = createShareCode(8);
        const { error: insertError } = await supabase.from("shared_results").insert({
          user_id: user.id,
          typing_history_id: typingHistoryId,
          share_code: candidateCode,
          wpm: displayWpm,
          accuracy: Number(displayAcc.toFixed(2)),
          mode: modeLabel,
          image_url: null,
        });

        if (!insertError) {
          setGeneratedShareCode(candidateCode);
          setShareStatus("Share link is ready.");
          return candidateCode;
        }

        if (insertError.code !== "23505") {
          console.error("Failed to create shared result:", insertError);
          break;
        }
      }
    } finally {
      setIsCreatingShareLink(false);
    }

    setShareStatus("Unable to create share link. Please try again.");
    return null;
  };

  const generateShareImage = async () => {
    if (!shareCardRef.current) {
      setShareStatus("Share card is not ready yet. Please try again.");
      return null;
    }

    setIsGeneratingShareImage(true);
    setShareStatus("");

    try {
      const pixelRatio =
        typeof window !== "undefined"
          ? Math.min(4, Math.max(2, window.devicePixelRatio || 2))
          : 2;

      const imageUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#0a0f1a",
      });

      setShareImageDataUrl(imageUrl);
      return imageUrl;
    } catch (error) {
      console.error("Failed to generate share image:", error);
      setShareStatus("Unable to generate image right now. Please try again.");
      return null;
    } finally {
      setIsGeneratingShareImage(false);
    }
  };

  const handleDownloadShareImage = async () => {
    const imageUrl = shareImageDataUrl || (await generateShareImage());
    if (!imageUrl) return;

    const safeAcc = displayAcc.toFixed(1).replace(".", "-");
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `keydash-result-${displayWpm}wpm-${safeAcc}acc.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShareStatus("Result card downloaded.");
  };

  const getPlatformShareUrl = (platform, linkUrl) => {
    const text = encodeURIComponent(shareCaption);
    const url = encodeURIComponent(linkUrl || baseAppUrl);

    switch (platform) {
      case "twitter":
        return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      case "whatsapp":
        return `https://wa.me/?text=${encodeURIComponent(`${shareCaption} ${linkUrl || baseAppUrl}`)}`;
      default:
        return "";
    }
  };

  const handleSocialShare = async (platform) => {
    const code = await ensureShareCode();
    const linkUrl = code ? `${baseAppUrl}s/${code}` : baseAppUrl;
    const shareUrl = getPlatformShareUrl(platform, linkUrl);
    if (!shareUrl) return;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=640,height=720");
  };

  const handleCopyShareText = async () => {
    try {
      const code = await ensureShareCode();
      const linkUrl = code ? `${baseAppUrl}s/${code}` : baseAppUrl;
      await navigator.clipboard.writeText(`${shareCaption} ${linkUrl}`);
      setShareStatus("Share caption copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy share caption:", error);
      setShareStatus("Unable to copy caption. Please copy it manually.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      setShareStatus("Native share is not supported on this device.");
      return;
    }

    try {
      const code = await ensureShareCode();
      const linkUrl = code ? `${baseAppUrl}s/${code}` : baseAppUrl;
      const imageUrl = shareImageDataUrl || (await generateShareImage());
      if (!imageUrl) return;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `keydash-result-${displayWpm}wpm.png`, {
        type: "image/png",
      });

      const sharePayload = {
        title: "My KeyDash Result",
        text: shareCaption,
        url: linkUrl,
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...sharePayload, files: [file] });
      } else {
        await navigator.share(sharePayload);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Native share failed:", error);
      setShareStatus("Share failed. Try downloading the image instead.");
    }
  };

  const renderTypedWord = (word) => {
    const maxLen = Math.max(word.expected.length, word.typed.length);
    if (maxLen === 0) {
      return <span className="text-gray-500">-</span>;
    }

    return (
      <span className="font-mono text-sm flex flex-wrap gap-0.5">
        {Array.from({ length: maxLen }, (_, i) => {
          const expectedChar = word.expected[i] || "";
          const typedChar = word.typed[i] || "";
          const globalIndex = word.start + i;

          let className = "text-gray-500";
          let displayChar = typedChar || "_";

          if (typedChar && expectedChar && typedChar === expectedChar && !mistakenIndexSet.has(globalIndex)) {
            className = "text-green-300";
          } else if (!typedChar && expectedChar) {
            className = "text-yellow-300 underline decoration-dashed";
          } else if (typedChar && !expectedChar) {
            className = "text-orange-300 bg-orange-500/20 rounded px-0.5";
          } else {
            className = "text-red-300 bg-red-500/20 rounded px-0.5";
          }

          return (
            <span key={`${word.id}-${i}`} className={className}>
              {displayChar}
            </span>
          );
        })}
      </span>
    );
  };

  const historicalWrongByIndex = useMemo(() => {
    const wrongByIndex = new Map();
    parsedCharEvents.forEach((event) => {
      if (event.type !== "insert") return;
      if (event.correct !== false) return;
      if (typeof event.char !== "string" || event.char.length === 0) return;
      wrongByIndex.set(event.index, event.char);
    });
    return wrongByIndex;
  }, [parsedCharEvents]);

  const paragraphMistakeView = useMemo(
    () =>
      paragraphAnalysis.chars.map((charData) => {
        const hasErasedChar = charData.erasedChars.length > 0;
        const latestErasedChar = hasErasedChar
          ? charData.erasedChars[charData.erasedChars.length - 1] || ""
          : "";
        const historicalWrongChar = historicalWrongByIndex.get(charData.index) || "";
        const isFixed =
          charData.wasMistyped &&
          !!charData.typedChar &&
          !!charData.expectedChar &&
          charData.typedChar === charData.expectedChar;
        const isIncorrect =
          charData.isWrong ||
          charData.isExtraTypedChar ||
          charData.isMissing ||
          charData.isMissingSpace ||
          charData.isExtraSpace;
        const isCountedMistake = Boolean(charData.mistakeLabel);

        const label = charData.typedChar ? toVisibleChar(charData.typedChar) : "·";
        const baseView = {
          index: charData.index,
          label,
          className: "text-gray-500",
        };

        // Keep red highlights strictly aligned to counted mistake positions.
        if (!isCountedMistake) {
          return baseView;
        }

        // In the Mistakes row, always use red for counted mistake markers.
        if (isIncorrect) {
          return {
            index: charData.index,
            label,
            className: "text-red-200 bg-red-500/35 rounded px-[1px]",
          };
        }

        if (isFixed || hasErasedChar) {
          const wrongChar = latestErasedChar || historicalWrongChar;
          if (wrongChar) {
            return {
              index: charData.index,
              label: toVisibleChar(wrongChar),
              className: "text-red-200 bg-red-500/35 rounded px-[1px]",
            };
          }
          return {
            index: charData.index,
            label,
            className: "text-red-200 bg-red-500/35 rounded px-[1px]",
          };
        }

        return {
          index: charData.index,
          label,
          className: "text-red-200 bg-red-500/35 rounded px-[1px]",
        };
      }),
    [historicalWrongByIndex, paragraphAnalysis.chars]
  );

  const paragraphCorrectedView = useMemo(
    () =>
      paragraphAnalysis.chars.map((charData) => {
        if (!charData.isCorrected) {
          return {
            index: charData.index,
            label: "·",
            className: "text-gray-600",
          };
        }

        const latestErasedChar =
          charData.erasedChars.length > 0
            ? charData.erasedChars[charData.erasedChars.length - 1] || ""
            : "";
        const correctedLabel = charData.expectedChar
          ? toVisibleChar(charData.expectedChar)
          : toVisibleChar(latestErasedChar);

        return {
          index: charData.index,
          label: correctedLabel,
          className: "text-yellow-100 bg-yellow-500/25 rounded px-[1px]",
        };
      }),
    [paragraphAnalysis.chars]
  );

  const hasResolvedResult = Boolean(location.state || resolvedResultState);

  if (isLoadingSharedResult) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen text-center p-6"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
      >
        <h2 className="text-3xl font-bold mb-2 text-white">Loading Shared Result</h2>
        <p className="text-gray-400">Fetching score data...</p>
      </div>
    );
  }

  if (shareCode && !hasResolvedResult && sharedResultError) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen text-center p-6"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
      >
        <h2 className="text-3xl font-bold mb-2 text-white">Shared Result Not Found</h2>
        <p className="text-gray-400 mb-6">
          This share link may be invalid or expired.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-yellow-400 text-black rounded-full font-semibold hover:bg-yellow-500 transition"
        >
          Go to Typing Test
        </button>
      </div>
    );
  }

  if (!hasResolvedResult) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen text-center p-6"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
      >
        <h2 className="text-3xl font-bold mb-4">No Result Found</h2>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-yellow-400 text-black rounded-full font-semibold hover:bg-yellow-500 transition"
        >
          Go to Typing Test
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12 bg-[#0a0f1a]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Results
        </h1>
        <p className={`text-xl md:text-2xl font-medium ${rating.color}`}>
          {rating.text}
        </p>
      </motion.div>

      {/* Main Stats Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl"
      >
        {/* Primary Stats - WPM & Accuracy */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50 backdrop-blur-xl">
            <div className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
              Words Per Minute
            </div>
            <div className="text-5xl md:text-7xl font-bold text-yellow-400 tracking-tight">
              {displayWpm}
            </div>
            <div className="mt-2 text-gray-500 text-sm">wpm</div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50 backdrop-blur-xl">
            <div className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
              Accuracy
            </div>
            <div className={`text-5xl md:text-7xl font-bold tracking-tight ${displayAcc >= 95 ? "text-green-400" : displayAcc >= 80 ? "text-yellow-400" : "text-red-400"}`}>
              {displayAcc.toFixed(1)}
            </div>
            <div className="mt-2 text-gray-500 text-sm">percent</div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Errors
            </div>
            <div className="text-2xl md:text-4xl font-bold text-red-400">
              {displayMistakes}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Characters
            </div>
            <div className="text-2xl md:text-4xl font-bold text-blue-400">
              <span className="text-green-400">{displayedCorrectChars}</span>
              <span className="text-gray-500 text-lg md:text-2xl">/{input.length}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-4 md:p-6 border border-gray-800/50">
            <div className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-1">
              Time
            </div>
            <div className="text-2xl md:text-4xl font-bold text-purple-400">
              {chartDurationSec.toFixed(1)}
              <span className="text-lg md:text-xl text-gray-500">s</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-4 md:p-6 border border-gray-800/50"
        >
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">
            Performance Over Time
          </h3>
          <div className="h-64 md:h-80">
            <Line data={data} options={options} />
          </div>
        </motion.div>

        {/* Timing + Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-5 border border-gray-800/50">
            <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider mb-3">
              Words That Took The Most Time
            </h3>
            {wordAnalysis.slowWords.length === 0 ? (
              <p className="text-gray-500 text-sm">No word timing data available for this run.</p>
            ) : (
              <div className="space-y-2">
                {wordAnalysis.slowWords.map((word) => (
                  <div
                    key={`slow-${word.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#111722] border border-gray-800/60"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-mono truncate">{word.expected}</p>
                      <p className="text-xs text-gray-500">
                        {word.status} • {word.mistakes} mistake{word.mistakes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-yellow-400 font-semibold">{formatSeconds(word.seconds)}</p>
                      <p className="text-xs text-gray-500">{word.secondsPerChar.toFixed(2)}s/char</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {wordAnalysis.estimatedTiming && (
              <p className="text-xs text-gray-500 mt-3">
                Timing is estimated for this run because detailed keystroke timings were not available.
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-5 border border-gray-800/50">
            <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider mb-3">
              Recommendations
            </h3>
            <div className="space-y-2.5">
              {recommendations.map((tip, idx) => (
                <div
                  key={`tip-${idx}`}
                  className="p-2.5 rounded-lg bg-[#111722] border border-gray-800/60 text-sm text-gray-200"
                >
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Typed Words Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-4 md:p-6 border border-gray-800/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider">
              Typed Words Review
            </h3>
            <p className="text-xs text-gray-500">
              Green = correct, Red = wrong, Yellow = missed character
            </p>
          </div>

          {wordAnalysis.words.length === 0 ? (
            <p className="text-gray-500 text-sm">No words available to review.</p>
          ) : (
            <div className="max-h-[26rem] overflow-auto rounded-xl border border-gray-800/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#111722]">
                  <tr className="text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Expected</th>
                    <th className="text-left px-3 py-2">You Typed</th>
                    <th className="text-left px-3 py-2">Mistakes</th>
                    <th className="text-left px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {wordAnalysis.words.map((word) => (
                    <tr key={word.id} className="border-t border-gray-800/60">
                      <td className="px-3 py-2 text-gray-500">{word.index}</td>
                      <td className="px-3 py-2 text-gray-200 font-mono">{word.expected}</td>
                      <td className="px-3 py-2">{renderTypedWord(word)}</td>
                      <td className={`px-3 py-2 font-semibold ${word.mistakes > 0 ? "text-red-400" : "text-green-400"}`}>
                        {word.mistakes}
                      </td>
                      <td className="px-3 py-2 text-yellow-400">{formatSeconds(word.seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Paragraph Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33 }}
          className="mt-6 bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-4 md:p-6 border border-gray-800/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider">
              Paragraph Review (Spaces Visible)
            </h3>
            <p className="text-xs text-gray-500">
              ␣ = space, ↵ = newline, · = missing, red text = incorrect typed, yellow highlight = corrected mistake
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <span className="px-2 py-1 rounded bg-[#111722] border border-gray-800/60 text-gray-300">
              Analyzed chars: {paragraphAnalysis.analyzedLength}/{paragraphAnalysis.totalTargetLength}
            </span>
            <span className="px-2 py-1 rounded bg-[#111722] border border-gray-800/60 text-gray-300">
              Expected spaces: {paragraphAnalysis.expectedSpaces}
            </span>
            <span className="px-2 py-1 rounded bg-[#111722] border border-gray-800/60 text-gray-300">
              Typed spaces: {paragraphAnalysis.typedSpaces}
            </span>
            <span className="px-2 py-1 rounded bg-[#111722] border border-gray-800/60 text-gray-300">
              Mistake positions: {paragraphAnalysis.mistakeCount}
            </span>
            <span className="px-2 py-1 rounded bg-[#111722] border border-gray-800/60 text-gray-300">
              Corrected mistakes: {paragraphAnalysis.correctedCount}
            </span>
            {paragraphAnalysis.missingSpaces > 0 && (
              <span className="px-2 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-300">
                Missing spaces: {paragraphAnalysis.missingSpaces}
              </span>
            )}
            {paragraphAnalysis.extraSpaces > 0 && (
              <span className="px-2 py-1 rounded bg-orange-500/15 border border-orange-500/40 text-orange-300">
                Extra spaces: {paragraphAnalysis.extraSpaces}
              </span>
            )}
          </div>

          <div className="space-y-4 max-h-[22rem] overflow-auto rounded-xl border border-gray-800/60 p-3 bg-[#101521]">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Target</p>
              <div className="rounded-lg border border-gray-800/60 bg-[#0d1320] px-3 py-2">
                <p className="text-sm md:text-[15px] leading-7 whitespace-pre-wrap break-words text-gray-300 font-normal">
                  {target || "·"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">You Typed</p>
              <div className="rounded-lg border border-gray-800/60 bg-[#0d1320] px-3 py-2">
                <p className="text-sm md:text-[15px] leading-7 whitespace-pre-wrap break-words text-gray-200 font-normal">
                  {input || "·"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Mistakes</p>
              <div className="rounded-lg border border-gray-800/60 bg-[#0d1320] px-3 py-2">
                <p className="font-mono text-sm md:text-[15px] leading-7 whitespace-pre-wrap break-words text-red-200 font-normal">
                  {paragraphMistakeView.length === 0
                    ? "·"
                    : paragraphMistakeView.map((charData) => (
                        <span key={`mistake-view-${charData.index}`} className={charData.className}>
                          {charData.label}
                        </span>
                      ))}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Corrected Mistakes</p>
              <div className="rounded-lg border border-gray-800/60 bg-[#0d1320] px-3 py-2">
                <p className="font-mono text-sm md:text-[15px] leading-7 whitespace-pre-wrap break-words text-yellow-100 font-normal">
                  {paragraphCorrectedView.length === 0
                    ? "·"
                    : paragraphCorrectedView.map((charData) => (
                        <span key={`corrected-view-${charData.index}`} className={charData.className}>
                          {charData.label}
                        </span>
                      ))}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Social Sharing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        className="mt-6 w-full max-w-4xl"
      >
        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-4 md:p-6 border border-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-gray-300 text-sm font-medium uppercase tracking-wider">
              Social Sharing
            </h3>
            <p className="text-xs text-gray-500">
              Generate a result card, download it, and share your score.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-800/60 bg-[#101521] p-3">
              <div
                ref={shareCardRef}
                className="relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#0e1524] via-[#131d31] to-[#1b2740] p-5 aspect-[16/9] flex flex-col justify-between"
              >
                <div className="pointer-events-none absolute -top-14 -right-14 w-40 h-40 rounded-full bg-yellow-400/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-blue-500/20 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300 font-semibold">
                      KeyDash Result
                    </p>
                    <p className={`mt-1 text-xs font-medium ${rating.color}`}>{rating.text}</p>
                    {shareOwnerName && (
                      <p className="mt-1 text-[11px] text-gray-400">By {shareOwnerName}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{shareDateLabel}</p>
                </div>

                <div className="relative mt-2">
                  <p className="text-4xl sm:text-5xl font-bold text-yellow-300 leading-none">
                    {displayWpm}
                    <span className="text-lg sm:text-xl text-yellow-100 ml-1">WPM</span>
                  </p>
                </div>

                <div className="relative grid grid-cols-3 gap-2 mt-4">
                  <div className="rounded-xl bg-black/25 border border-white/10 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Accuracy</p>
                    <p className="text-sm sm:text-base font-semibold text-green-300">
                      {displayAcc.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/25 border border-white/10 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Errors</p>
                    <p className="text-sm sm:text-base font-semibold text-red-300">{displayMistakes}</p>
                  </div>
                  <div className="rounded-xl bg-black/25 border border-white/10 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Time</p>
                    <p className="text-sm sm:text-base font-semibold text-purple-300">
                      {chartDurationSec.toFixed(1)}s
                    </p>
                  </div>
                </div>

                <p className="relative mt-3 text-[11px] text-gray-400">
                  {activeShareCode ? `keydash.shresthamanish.info.np/s/${activeShareCode}` : "Create link to enable rich previews"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={ensureShareCode}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  {isCreatingShareLink ? "Preparing Link..." : activeShareCode ? "Link Ready" : "Create Share Link"}
                </button>
                <button
                  onClick={handleCopyShareText}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-gray-700 bg-[#0f141f] hover:bg-[#1b2333] text-gray-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  {isCreatingShareLink ? "Preparing..." : "Copy Caption + Link"}
                </button>
              </div>

              {activeShareCode && (
                <div className="rounded-xl border border-gray-700/80 bg-[#0f141f] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Share URL</p>
                  <p className="text-xs text-gray-200 break-all">{shareResultUrl}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSocialShare("twitter")}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-gray-700 bg-[#0f141f] hover:bg-black text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  Share on X
                </button>
                <button
                  onClick={() => handleSocialShare("facebook")}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-blue-400/40 bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-blue-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  Share on Facebook
                </button>
                <button
                  onClick={() => handleSocialShare("linkedin")}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-sky-400/40 bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-sky-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  Share on LinkedIn
                </button>
                <button
                  onClick={() => handleSocialShare("whatsapp")}
                  disabled={isCreatingShareLink}
                  className="rounded-xl border border-emerald-400/40 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-emerald-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  Share on WhatsApp
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleDownloadShareImage}
                  disabled={isGeneratingShareImage || isCreatingShareLink}
                  className="rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  {isGeneratingShareImage ? "Generating..." : "Download Card"}
                </button>
                <button
                  onClick={handleNativeShare}
                  disabled={isGeneratingShareImage || isCreatingShareLink}
                  className="rounded-xl border border-gray-700 bg-[#0f141f] hover:bg-[#1b2333] text-gray-200 text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                >
                  Share Image
                </button>
                <button
                  onClick={() => navigate(activeShareCode ? `/results/${activeShareCode}` : "/results")}
                  className="rounded-xl border border-gray-700 bg-[#0f141f] hover:bg-[#1b2333] text-gray-200 text-sm font-semibold px-4 py-2.5 transition"
                >
                  Open Shared Page
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Tip: use <span className="text-gray-300 font-medium">Download Card</span> to post the
                image directly on any platform.
              </p>

              {shareStatus && (
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-200">
                  {shareStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-8 flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={handlePlayAgain}
          className="px-8 py-4 rounded-full bg-yellow-400 text-black text-lg font-semibold hover:bg-yellow-500 hover:scale-105 transition-all duration-200 shadow-lg shadow-yellow-400/20"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="px-8 py-4 rounded-full bg-transparent text-white text-lg font-semibold border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all duration-200"
        >
          View Leaderboard
        </button>
      </motion.div>
    </div>
  );
};

export default ScorePage;
