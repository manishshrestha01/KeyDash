import ModesButton from "../components/ModesButton"
import { useState } from "react"
import Timed from "../modes/Timed"
import Sentence from "../modes/Sentence"

const modes = [
  { name: "Sentence", icon: "✏️" },
  { name: "Timed", icon: "⏱️" }
]

const timedModeTypes = [15, 30, 60, 120]

const Home = () => {
  const [selectedMode, setSelectedMode] = useState("Sentence")
  const [selectedTime, setSelectedTime] = useState(15)

  const ModeComponent = selectedMode === "Timed"
    ? <Timed time={selectedTime} />
    : <Sentence />

  return (
    <>
      <section className="mb-4 mt-6 ml-150">
        {/* Mode buttons */}
        <div className='flex flex-row gap-3 mb-3'>
          {modes.map(({ name, icon }) => (
            <ModesButton
              key={name}
              onClick={() => setSelectedMode(name)}
              active={selectedMode === name}
              icon={icon}
              theme="dark" // Change to "light" if needed
            >
              {name}
            </ModesButton>
          ))}
        </div>

        {/* Timed durations */}
        {selectedMode === "Timed" && (
          <div className='flex flex-row gap-2 mb-4'>
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

      {/* Render Mode */}
      <div>
        {ModeComponent}
      </div>
    </>
  )
}

export default Home
