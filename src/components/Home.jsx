import { useState } from "react"
import ModesButton from "./ModesButton"
import Timed from "../modes/Timed"
import Sentence from "../modes/Sentence"

const modes = [
  { name: "Sentence" },
  { name: "Timed" }
]

const timedModeTypes = [15, 30, 60, 120]

const sentenceDifficulties = [
  { name: "Easy", key: "easy" },
  { name: "Medium", key: "medium" },
  { name: "Hard", key: "hard" },
  { name: "Extreme", key: "extreme" }
]

const Home = () => {
  const [selectedMode, setSelectedMode] = useState("Sentence")
  const [selectedTime, setSelectedTime] = useState(15)
  const [sentenceDifficulty, setSentenceDifficulty] = useState("easy")
  const [showMobileModal, setShowMobileModal] = useState(false)

  const ModeComponent =
    selectedMode === "Timed"
      ? <Timed time={selectedTime} />
      : <Sentence difficulty={sentenceDifficulty} />

  const closeModal = () => setShowMobileModal(false)

  return (
    <>
      {/* Mobile Button */}
      <div className="md:hidden flex justify-center mt-4">
        <button
          className="bg-yellow-400 text-black px-4 py-2 rounded-full font-semibold text-sm"
          onClick={() => setShowMobileModal(true)}
        >
          Mode
        </button>
      </div>

      {/* Mobile Modal */}
      {showMobileModal && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
    <div className="bg-[#1e1e1e] text-white w-full max-w-xs rounded-3xl p-5 space-y-6">
      {/* Close button */}
      <div className="flex justify-end">
        <button
          onClick={closeModal}
          className="text-white text-2xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* Modes */}
        <div className="flex flex-col space-y-2">
          {modes.map(({ name }) => (
            <button
              key={name}
              onClick={() => setSelectedMode(name)}
              className={`px-5 py-1.5 rounded-full font-semibold text-base transition
                ${selectedMode === name
                  ? "bg-yellow-400 text-black"
                  : "border border-white/30 text-white"}`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Sentence Difficulties */}
        {selectedMode === "Sentence" && (
          <div className="flex flex-col space-y-2">
            {sentenceDifficulties.map(({ name, key }) => (
              <button
                key={key}
                onClick={() => setSentenceDifficulty(key)}
                className={`px-5 py-1.5 rounded-full font-semibold text-base transition
                  ${sentenceDifficulty === key
                    ? "bg-yellow-400 text-black"
                    : "border border-white/30 text-white"}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Timed Durations */}
        {selectedMode === "Timed" && (
          <div className="flex flex-col space-y-2">
            {timedModeTypes.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`px-5 py-1.5 rounded-full font-semibold text-base transition
                  ${selectedTime === time
                    ? "bg-yellow-400 text-black"
                    : "border border-white/30 text-white"}`}
              >
                {time}s
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}



      {/* XL layout */}
      <section className="hidden md:block mb-8 mt-6 mx-auto max-w-4xl">
        {/* Mode Selector */}
        <div className="flex justify-center flex-wrap gap-3 mb-4">
          {modes.map(({ name }) => (
            <ModesButton
              key={name}
              onClick={() => setSelectedMode(name)}
              active={selectedMode === name}
              theme="dark"
            >
              {name}
            </ModesButton>
          ))}
        </div>

        {/* Sentence Mode Difficulty Selector */}
        {selectedMode === "Sentence" && (
          <div className="flex justify-center flex-wrap gap-2 mb-4">
            {sentenceDifficulties.map(({ name, key }) => (
              <ModesButton
                key={key}
                onClick={() => setSentenceDifficulty(key)}
                active={sentenceDifficulty === key}
                theme="dark"
              >
                {name}
              </ModesButton>
            ))}
          </div>
        )}

        {/* Timed Mode Duration Selector */}
        {selectedMode === "Timed" && (
          <div className="flex justify-center flex-wrap gap-2 mb-4">
            {timedModeTypes.map(time => (
              <ModesButton
                key={time}
                onClick={() => setSelectedTime(time)}
                active={selectedTime === time}
                theme="dark"
              >
                {time}s
              </ModesButton>
            ))}
          </div>
        )}
      </section>

      {/* Mode Component */}
      <div>
        {ModeComponent}
      </div>
    </>
  )
}

export default Home
