import React from 'react'
import LoginFormV2 from '../../components/auth/LoginFormV2'
import Meta from '../../components/Meta'

const Login = () => {
  return (
    <section>
      <Meta
        title="Login | KeyDash"
        description="Log in or sign up to KeyDash using email or Google OAuth and track your typing progress."
        url="https://keydash.shresthamanish.info.np/login"
      />
      <LoginFormV2 />
    </section>
  )
}

export default Login