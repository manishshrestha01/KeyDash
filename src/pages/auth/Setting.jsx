import React from 'react'
import Settings from '../../components/auth/Settings'
import Meta from '../../components/Meta'


const Setting = () => {
  return (
    <section>
      <Meta
        title="Settings | KeyDash"
        description="Manage your account settings and preferences on KeyDash."
        url="https://keydash.shresthamanish.info.np/settings"
      />
      <Settings />
    </section>
  )
}

export default Setting