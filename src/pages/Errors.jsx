import Error from "../components/Error"
import Meta from '../components/Meta'
const Errors = () => {
  return (
    <div>
      <Meta
        title="Page Not Found | KeyDash"
        description="The page you're looking for doesn't exist. Go back to KeyDash and test your typing speed."
        url="https://keydash.shresthamanish.info.np/errors"
        noIndex
        noFollow
      />
      <Error />
    </div>
  )
}

export default Errors
