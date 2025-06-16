import Navbar from "../components/Navbar"
import ModesButton from "../components/ModesButton"
import { useState } from "react"
import Timed from "../modes/Timed"
import Sentence from "../modes/Sentence"

const modes = ["Sentence", "Timed"]

const Home = () => {
  const [selectedMode, setSelectedMode] = useState("Sentence")

  let ModeComponent = null
  if (selectedMode === "Timed") ModeComponent = <Timed />
  if (selectedMode === "Sentence") ModeComponent = <Sentence />

  return (
    <>
    <section>
      
      <h1>Home Page</h1>
    </section>

    <div className='flex flex-row'>
      {modes.map(mode => (
        <ModesButton key={mode} onClick={() => setSelectedMode(mode)}>
          {mode}
        </ModesButton>
      ))}
    </div>

    <div>
      {ModeComponent}
    </div>
    </>
  )
}

export default Home