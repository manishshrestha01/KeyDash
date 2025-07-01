import Error from "../components/Error"
import Meta from '../components/Meta'
const Errors = () => {
  return (
    <div>
      <Meta
        title="Errors | KeyDash"
        description="An error occurred while processing your request."
        url="https://keydash.shresthamanish.info.np/errors"
      />
      <Error />
    </div>
  )
}

export default Errors