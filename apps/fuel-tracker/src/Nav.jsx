import { useState, useEffect } from 'react'

function getTheme() {
  return localStorage.getItem('ly-theme') || 'dark'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('ly-theme', theme)
}

export default function Nav({ activeApp, dashboardUrl, fuelUrl, user, onSignOut }) {
  const [theme, setTheme] = useState(getTheme)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const initials = user?.email ? user.email.split('@')[0].slice(0, 2).toUpperCase() : '?'

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--d-surf)', borderBottom: '1px solid var(--d-border)',
      padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logyard wordmark */}
      <a href={dashboardUrl || '/'} style={{ textDecoration: 'none' }}>
        <div style={{ lineHeight: 1, marginBottom: '2px' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--d-text)' }}>Log</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--rust)' }}>yard</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--d-sub)' }}>
          YOUR CARS. THEIR WHOLE STORY.
        </div>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Theme toggle */}
        <button onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{
          background: 'none', border: '1px solid var(--d-border)', borderRadius: '6px',
          color: 'var(--d-sub)', cursor: 'pointer', padding: '5px 8px', fontSize: '13px', lineHeight: 1,
        }}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

        {/* App switcher */}
        <a href={dashboardUrl || '/'} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: activeApp === 'dashboard' ? 'var(--rust)' : 'var(--d-sub)',
          textDecoration: 'none', padding: '5px 10px', borderRadius: '6px',
          background: activeApp === 'dashboard' ? 'rgba(204,74,15,0.12)' : 'transparent',
          border: activeApp === 'dashboard' ? '1px solid var(--rust)' : '1px solid var(--d-border)',
        }}>Dashboard</a>
        <a href={fuelUrl || '/fuel'} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: activeApp === 'fuel' ? 'var(--rust)' : 'var(--d-sub)',
          textDecoration: 'none', padding: '5px 10px', borderRadius: '6px',
          background: activeApp === 'fuel' ? 'rgba(204,74,15,0.12)' : 'transparent',
          border: activeApp === 'fuel' ? '1px solid var(--rust)' : '1px solid var(--d-border)',
        }}>Fuel</a>

        {/* Avatar */}
        {user && (
          <div style={{ position: 'relative', marginLeft: '4px' }}>
            <button onClick={() => setShowMenu(m => !m)} style={{
              width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--d-border)',
              background: 'var(--rust)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initials}</button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '38px', zIndex: 100,
                  background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '8px',
                  padding: '8px 0', minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ padding: '6px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--d-sub)', borderBottom: '1px solid var(--d-border)', marginBottom: '4px' }}>
                    {user.email}
                  </div>
                  <button onClick={onSignOut} style={{
                    width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none', border: 'none',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--rust)', cursor: 'pointer',
                  }}>Sign out</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
