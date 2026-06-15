import { useState, useEffect } from 'react'

function getTheme() {
  return localStorage.getItem('ly-theme') || 'dark'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('ly-theme', theme)
}

export default function Nav({ activeApp, dashboardUrl, fuelUrl }) {
  const [theme, setTheme] = useState(getTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--d-surf)', borderBottom: '1px solid var(--d-border)',
      padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logyard wordmark */}
      <a href={dashboardUrl || '/'} style={{ textDecoration: 'none' }}>
        <div style={{ lineHeight: 1, marginBottom: '2px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--d-text)' }}>Log</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--rust)' }}>yard</span>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--d-sub)' }}>
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
          fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: activeApp === 'dashboard' ? 'var(--rust)' : 'var(--d-sub)',
          textDecoration: 'none', padding: '5px 10px', borderRadius: '6px',
          background: activeApp === 'dashboard' ? 'rgba(204,74,15,0.12)' : 'transparent',
          border: activeApp === 'dashboard' ? '1px solid var(--rust)' : '1px solid var(--d-border)',
        }}>Dashboard</a>
        <a href={fuelUrl || '/fuel'} style={{
          fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: activeApp === 'fuel' ? 'var(--rust)' : 'var(--d-sub)',
          textDecoration: 'none', padding: '5px 10px', borderRadius: '6px',
          background: activeApp === 'fuel' ? 'rgba(204,74,15,0.12)' : 'transparent',
          border: activeApp === 'fuel' ? '1px solid var(--rust)' : '1px solid var(--d-border)',
        }}>Fuel</a>
      </div>
    </div>
  )
}
