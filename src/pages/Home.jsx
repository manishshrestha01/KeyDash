import ModesButton from "../components/ModesButton"
import { useState } from "react"
import Timed from "../modes/Timed"
import Sentence from "../modes/Sentence"

const modes = ["Sentence", "Timed"]
const timedModeTypes = [15, 30, 60, 120]

const Home = () => {
  const [selectedMode, setSelectedMode] = useState("Sentence")
  const [selectedTime, setSelectedTime] = useState(15) // Default for timed

  let ModeComponent = null

  if (selectedMode === "Sentence") {
    ModeComponent = <Sentence />
  } else if (selectedMode === "Timed") {
    ModeComponent = <Timed time={selectedTime} />
  }

  return (
    <>
      <section className="mb-4 mt-6 ml-150">
        {/* Modes bar */}
        <div className='flex flex-row gap-10 mb-2 '>
          {modes.map(mode => (
            <ModesButton
              key={mode}
              onClick={() => setSelectedMode(mode)}
              active={selectedMode === mode}
            >
              {mode}
            </ModesButton>
          ))}
        </div>

        {/* If Timed selected, show mode types below */}
        {selectedMode === "Timed" && (
          <div className='flex flex-row gap-2 mb-4'>
            {timedModeTypes.map(time => (
              <ModesButton
                key={time}
                onClick={() => setSelectedTime(time)}
                active={selectedTime === time}
              >
                {time}s
              </ModesButton>
            ))}
          </div>
        )}
      </section>

      {/* Main mode component */}
      <div>
        {ModeComponent}
      </div>
    </>
  )
}

export default Home
