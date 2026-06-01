import { useState, useEffect } from 'react'

export default function Nav({ activeApp, dashboardUrl, fuelUrl }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const linkStyle = (app) => ({
    color: activeApp === app ? '#f59e0b' : '#6b7280',
    borderBottom: activeApp === app ? '2px solid #f59e0b' : '2px solid transparent',
    textDecoration: 'none',
    fontSize: '10px',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    letterSpacing: '0.1em',
    padding: '4px 0',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#111116',
      borderBottom: '1px solid #2a2a35',
      backdropFilter: 'blur(8px)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Logo / Brand */}
      <a href={dashboardUrl || '/'} style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🚗</span>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '20px',
              letterSpacing: '0.08em',
              color: '#f59e0b',
              lineHeight: 1,
            }}>
              MINI COOPER REVIVAL
            </div>
            <div style={{
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: '9px',
              color: '#6b7280',
              letterSpacing: '0.12em',
              marginTop: '2px',
            }}>
              2009 CONVERTIBLE
            </div>
          </div>
        </div>
      </a>

      {/* Desktop nav links */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href={dashboardUrl || '/'} style={linkStyle('dashboard')}>
            RESTORATION
          </a>
          <a href={fuelUrl || '/fuel'} style={linkStyle('fuel')}>
            FUEL TRACKER
          </a>
        </div>
      )}

      {/* Mobile hamburger */}
      {isMobile && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none',
              border: '1px solid #2a2a35',
              color: '#6b7280',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ☰
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '36px',
              right: 0,
              background: '#111116',
              border: '1px solid #2a2a35',
              borderRadius: '6px',
              padding: '8px 0',
              minWidth: '160px',
              zIndex: 100,
            }}>
              <a
                href={dashboardUrl || '/'}
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                  letterSpacing: '0.1em',
                  color: activeApp === 'dashboard' ? '#f59e0b' : '#94a3b8',
                  textDecoration: 'none',
                }}
              >
                RESTORATION
              </a>
              <a
                href={fuelUrl || '/fuel'}
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                  letterSpacing: '0.1em',
                  color: activeApp === 'fuel' ? '#f59e0b' : '#94a3b8',
                  textDecoration: 'none',
                }}
              >
                FUEL TRACKER
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
