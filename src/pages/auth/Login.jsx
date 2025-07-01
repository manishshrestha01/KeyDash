import React from 'react'
import LoginForm from '../../components/auth/LoginForm'
import Meta from '../../components/Meta'

const Login = () => {
  return (
    <section>
      <Meta
        title="Login | KeyDash"
        description="Log in or sign up to KeyDash using email or Google OAuth and track your typing progress."
        url="https://keydash.shresthamanish.info.np/login"
      />
      <LoginForm />
    </section>
  )
}

export default Login