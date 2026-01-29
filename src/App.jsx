import Routes from "./Routes"
import { Analytics } from "@vercel/analytics/react"

const App = () => {
  return (
    <>
      <Routes/>
      <Analytics />
    </>
  )
}

export default App