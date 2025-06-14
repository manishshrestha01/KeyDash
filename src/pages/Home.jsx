import Navbar from "../components/Navbar"
import ModesButton from "../components/ModesButton"
import { useState } from "react"
import Timed from "../modes/Timed"
import Paragraph from "../modes/Paragraph"

const modes = ["Paragraph", "Timed"]

const Home = () => {
  const [selectedMode, setSelectedMode] = useState("Paragraph")

  let ModeComponent = null
  if (selectedMode === "Timed") ModeComponent = <Timed />
  if (selectedMode === "Paragraph") ModeComponent = <Paragraph />

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