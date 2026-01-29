import React, { useEffect, useRef, useState } from "react";
import timedData from "../assets/english/timed.json";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const getRandomSentence = () => {
  const arr = timedData.words;
  const words = [];

  for (let i = 0; i < 100; i++) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const word = arr[randomIndex];

    words.push(word);
  }

  return words.join(" ");
};

const getCharsPerLine = () => {
  if (typeof window === 'undefined') return 50;
  if (window.innerWidth >= 1280) return 50;
  if (window.innerWidth >= 1024) return 40;
  if (window.innerWidth >= 768) return 35;
  if (window.innerWidth >= 640) return 40;
  if (window.innerWidth >= 425) return 35;
  if (window.innerWidth >= 375) return 30;
  if (window.innerWidth >= 320) return 25;
  return 20;
};

const Timed = ({ time }) => {
  const [target, setTarget] = useState("");
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [restartCount, setRestartCount] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(time);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [mistakes, setMistakes] = useState(0);

  const inputRef = useRef(input);
  const startTimeRef = useRef(startTime);

  // Get current logged-in user
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Reset on restart or time change
  useEffect(() => {
    const sentence = getRandomSentence();
    setTarget(sentence);
    setInput("");
    setStartTime(null);
    setCurrentCharIdx(0);
    setWpm(0);
    setAccuracy(100);
    setMistakes(0);
    setIsTimeUp(false);
    setTimeLeft(time);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [restartCount, time]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  // Timer logic
  useEffect(() => {
    if (startTime && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsTimeUp(true);
            handleFinish(inputRef.current, startTimeRef.current, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime]);

  // Update stats when input changes
  useEffect(() => {
    setCurrentCharIdx(input.length);

    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++;
    }

    // Real-time Stats calculation
    const totalTyped = input.length;
    const durationSec = startTime ? (Date.now() - startTime) / 1000 : 0;
    const wpmVal = durationSec > 0 ? correct / 5 / (durationSec / 60) : 0;
    const accVal = totalTyped > 0 ? (correct / totalTyped) * 100 : 100;
    const mistakesVal = totalTyped - correct;

    setWpm(Math.round(wpmVal));
    setAccuracy(accVal);
    setMistakes(mistakesVal);
  }, [input, startTime, target]);

  // Save score and navigate to results
  const handleFinish = async (
    finalInput = inputRef.current,
    finishStartTime = startTimeRef.current,
    forcedTimeUp = false
  ) => {
    if (!finishStartTime) return;

    let durationSec;
    if (forcedTimeUp || isTimeUp) {
      durationSec = time;
    } else {
      durationSec = time - timeLeft;
    }

    let correctChars = 0;
    for (let i = 0; i < finalInput.length; i++) {
      if (finalInput[i] === target[i]) correctChars++;
    }
    // Scoreboard Stats calculation
    const totalTyped = finalInput.length;
    const wpmVal =
      durationSec > 0 ? correctChars / 5 / (durationSec / 60) : 0;
    const accVal =
      totalTyped > 0 ? (correctChars / totalTyped) * 100 : 0;
    const mistakesVal = totalTyped - correctChars;

    // Insert into leaderboard_timed table
    if (user && user.id) {
      const { error } = await supabase.from("leaderboard_timed").insert([
        {
          user_id: user.id,
          wpm: Math.round(wpmVal),
          accuracy: accVal,
          time: durationSec,
        },
      ]);
      if (error) {
        console.error("Error saving score:", error);
      }
    }

    navigate("/results", {
      state: {
        target,
        input: finalInput,
        durationSec,
        wpm: Math.round(wpmVal),
        acc: accVal.toFixed(1),
        mistakes: mistakesVal,
      },
    });
  };

   // Handle typing input
   const handleInput = (e) => {
    if (isTimeUp) return;
    const val = e.target.value;

    // Prevent deletions: ignore any change that shortens the input (disables backspace/delete and cuts)
    if (val.length < input.length) return;

    if (val.length > 0 && !startTime) {
      setStartTime(Date.now());
    }

    if (
      val.length > target.length ||
      (val.trimEnd().endsWith(".") &&
        val.trim().split(/\s+/).length >= target.trim().split(/\s+/).length)
    ) {
      handleFinish(val);
      return;
    }

    setInput(val);
  };

  // Prevent Backspace and Delete keys
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      return;
    }
  };

  // Handle restart button click
  const handleRestart = () => {
    setRestartCount((c) => c + 1);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [restartCount, time]);

  // Render colored text with caret and error highlights
  const renderColoredText = () => {
    const words = target.split(" ");
    const lines = [];
    let line = [];
    let lineLen = 0;
    let charIndex = 0;

    words.forEach((word, wIdx) => {
      const wordChars = word.split("").map((c, i) => {
        let cls = "text-muted";

        if (charIndex < input.length) {
          cls =
            input[charIndex] === c
              ? "text-correct"
              : "text-error underline underline-offset-2";
        }

        const isCaret = charIndex === currentCharIdx;

        const charSpan = (
          <span key={`${wIdx}-${i}`} className={`relative ${cls}`} style={{ lineHeight: "inherit" }}>
            {c}
            {isCaret && (
              <span className="caret absolute top-0 left-0 w-[2px] h-[1.4em] bg-caret animate-blink" />
            )}
          </span>
        );

        charIndex++;
        return charSpan;
      });
      
      // Add a space after the word
      const isSpaceCaret = charIndex === currentCharIdx;
      const spaceCorrect = input[charIndex] === " ";
      const spaceClass =
        charIndex < input.length
          ? spaceCorrect
            ? "text-correct"
            : "text-error underline underline-offset-2"
          : "text-muted";

      wordChars.push(
        <span key={`${wIdx}-space`} className={`relative ${spaceClass}`}>
          {" "}
          {isSpaceCaret && (
            <span className="caret absolute top-0 left-0 w-[2px] h-[1.4em] bg-caret animate-blink" />
          )}
        </span>
      );
      charIndex++;

      line.push(
        <span
          key={`word-${wIdx}`}
          className="inline-block whitespace-pre"
        >
          {wordChars}
        </span>
      );
      lineLen += word.length + 1;
    });


    if (line.length > 0) {
      lines.push(
        <div key={`line-${lines.length}`} style={{ scrollSnapAlign: "start" }}>
          {line}
        </div>
      );
    }

    return lines;
  };

  return (
    <div className="flex flex-col items-center pt-8 -mt-6">
      {/* Timer display */}
      <div className="text-yellow-300 font-medium mb-4 mt-15 xl:mt-0 lg:mt-0 md:mt-3 sm:mt-10 sm:mb-0 
          text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-4xl
          px-2 sm:px-4 md:px-8 lg:px-12 xl:px-16
          py-1 sm:py-2 md:py-3 lg:py-4 xl:py-5
          rounded-lg sm:rounded-xl md:rounded-2xl" 
          style={{
            wordBreak: 'keep-all',
            textAlign: 'center',
            minWidth: '5.5rem',
            display: 'inline-block',
          }}>
            {timeLeft}
            </div>

      {/* Typing area */}
      <div
        ref={containerRef}
        className="relative w-full max-w-7xl sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[7.5rem] sm:h-[8.5rem] md:h-[9.5rem] lg:h-[10.5rem] overflow-hidden cursor-text px-2 sm:px-4 md:px-8 xl:mt-0 lg:mt-0 md:mt-10 sm:mt-15 mt-10"
        style={{
          fontFamily: `"Fira Code","JetBrains Mono",monospace`,
          fontSize: "1.1rem",
          lineHeight: "2rem",
          // Responsive font size and line height
          ...(window.innerWidth >= 640 && { fontSize: "1.8rem", lineHeight: "2.7rem" }),
          ...(window.innerWidth >= 768 && { fontSize: "1.8rem", lineHeight: "3rem" }),
          ...(window.innerWidth >= 1024 && { fontSize: "2.1rem", lineHeight: "3.5rem" }),
          ...(window.innerWidth >= 1280 && { fontSize: "2.3rem", lineHeight: "3.5rem" }),
        }}
        onClick={() => textareaRef.current?.focus()}
      >
        <div
          className="absolute inset-0 flex flex-col transition-transform duration-200 px-1 sm:px-2 md:px-4"
          style={{
            // Responsive scroll offset for all devices
            transform: `translateY(-${
              Math.max(0, Math.floor(currentCharIdx / getCharsPerLine()) - 2) * (
                window.innerWidth >= 1280 ? 3.5 :
                window.innerWidth >= 1024 ? 3.2 :
                window.innerWidth >= 768 ? 3 :
                window.innerWidth >= 640 ? 2.5 :
                2
              )
            }rem)`
          }}
        >
          {renderColoredText()}
        </div>

        <textarea
          ref={textareaRef}
          className="absolute inset-0 opacity-0 resize-none text-2xl"
          value={input}
          onChange={handleInput}
          onPaste={(e) => e.preventDefault()}
          onKeyDown={handleKeyDown}
          spellCheck="false"
          autoFocus
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Restart button */}
      <button
        onClick={handleRestart}
        className="mt-6 p-3 rounded-full bg-transparent text-[#636569] hover:text-white transition-colors"
        aria-label="Restart"
      >
        <svg
          viewBox="-13.44 -13.44 50.88 50.88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 rotate-90"
        >
          <g clipPath="url(#clip0)">
            <path
              d="M12 2.99982C16.9706 2.99982 21 7.02925 21 11.9998C21 16.9704 16.9706 20.9998 12 20.9998C7.02944 20.9998 3 16.9704 3 11.9998C3 9.17255 4.30367 6.64977 6.34267 4.99982"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 4.49982H7V8.49982"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </button>

      {/* Stats display */}
      <div className="xl:-ml-260 xl:-mt-18 xl:text-2xl xl:rounded-2xl xl:px-7 xl:py-5 lg:-ml-190 lg:-mt-18 lg:text-2xl lg:rounded-2xl lg:px-7 lg:py-5 md:-ml-130 md:-mt-93 md:text-xl md:rounded-2xl md:px-4 md:py-2 sm:-ml-105 sm:-mt-90 sm:text-xl sm:rounded-2xl sm:px-2 sm:py-1 -ml-60 -mt-85 text-base rounded-xl px-2 py-1 bg-yellow-400 text-black font-mono shadow-lg z-10">
        <div>WPM = {wpm}</div>
        <div>Acc = {accuracy.toFixed(1)}%</div>
        <div>Error = {mistakes}</div>
      </div>
    </div>
  );
};

export default Timed;
