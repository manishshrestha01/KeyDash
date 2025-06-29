import ModesButton from "../components/ModesButton"
import { useState } from "react"
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

  const ModeComponent =
    selectedMode === "Timed"
      ? <Timed time={selectedTime} />
      : <Sentence difficulty={sentenceDifficulty} />

  return (
    <>
      <section className="mb-8 mt-6 mx-auto max-w-4xl">
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

      {/* Render Selected Mode Component */}
      <div>
        {ModeComponent}
      </div>
    </>
  )
}

export default Home
