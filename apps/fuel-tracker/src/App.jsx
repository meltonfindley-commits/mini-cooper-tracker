import '@mini/shared/theme.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from './supabase.js'
import Nav from './Nav.jsx'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || '#'
const FUEL_URL = import.meta.env.VITE_FUEL_URL || '/'

const inputStyle = (extra = {}) => ({
  background: 'var(--d-bg)', border: '1px solid var(--d-border)', color: 'var(--d-text)',
  padding: '7px 10px', borderRadius: '4px', fontSize: '13px',
  fontFamily: "'Barlow', sans-serif", width: '100%', outline: 'none', ...extra,
})
const selectStyle = (extra = {}) => ({
  background: 'var(--d-bg)', border: '1px solid var(--d-border)', color: 'var(--d-muted)',
  padding: '7px 10px', borderRadius: '4px', fontSize: '13px',
  fontFamily: "'Barlow', sans-serif", width: '100%', cursor: 'pointer', outline: 'none', ...extra,
})
const labelStyle = {
  display: 'block', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)',
  letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px',
}

// ─── MPG calculation — per vehicle so odometers never cross ──────────────────
function computeMpg(logs) {
  const groups = {}
  logs.forEach(log => {
    const key = log.vehicle || '__none__'
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  })
  const result = []
  Object.values(groups).forEach(group => {
    const sorted = [...group].sort((a, b) => a.odometer - b.odometer)
    sorted.forEach((log, i) => {
      if (i === 0) { result.push({ ...log, mpg: null }); return }
      const prev = sorted[i - 1]
      const miles = log.odometer - prev.odometer
      const mpg = miles > 0 && log.fuel_amount > 0 ? miles / log.fuel_amount : null
      result.push({ ...log, mpg })
    })
  })
  return result
}

function fmt(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(decimals)
}
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}
function today() { return new Date().toISOString().split('T')[0] }

const FUEL_GRADES = ['Regular', 'Mid-Grade', 'Premium', 'Premium Plus', 'Diesel']

function gradeColor(grade) {
  if (!grade) return 'var(--d-faint)'
  if (grade === 'Premium' || grade === 'Premium Plus') return 'var(--amber)'
  if (grade === 'Mid-Grade') return 'var(--d-muted)'
  if (grade === 'Diesel') return 'var(--green)'
  return 'var(--d-sub)'
}

const DATE_FILTERS = ['All', 'This Week', 'This Month', 'This Year']

function filterByDate(logs, range) {
  if (range === 'All') return logs
  const now = new Date()
  return logs.filter(log => {
    const d = new Date(log.date + 'T00:00:00')
    if (range === 'This Week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0)
      return d >= start
    }
    if (range === 'This Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (range === 'This Year') return d.getFullYear() === now.getFullYear()
    return true
  })
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: '96px', right: '20px', zIndex: 200,
      background: 'var(--green)', color: '#1A1714', padding: '10px 18px',
      borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '12px',
      fontWeight: 500, animation: 'toastIn 0.2s ease', letterSpacing: '0.04em',
    }}>
      ✓ {message}
    </div>
  )
}

// ─── Admin Login Modal ────────────────────────────────────────────────────────
function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [signupSent, setSignupSent] = useState(false)

  const switchMode = (m) => { setMode(m); setError(''); setPassword(''); setConfirm('') }

  const handleSignIn = async () => {
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  const handleSignUp = async () => {
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) setError(authError.message)
    else setSignupSent(true)
    setLoading(false)
  }

  const handleForgot = async () => {
    if (!email) { setError('Enter your email above first'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (authError) setError(authError.message)
    else setResetSent(true)
    setLoading(false)
  }

  const monoBtn = (active) => ({
    flex: 1, padding: '6px', background: active ? 'var(--rust)' : 'none',
    border: `1px solid ${active ? 'var(--rust)' : 'var(--d-border)'}`,
    color: active ? '#fff' : 'var(--d-faint)', borderRadius: '6px',
    fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.08em', cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--d-bg)' }}>
      <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '28px 32px', width: '320px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '26px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>
          <span style={{ color: 'var(--d-text)' }}>LOG</span><span style={{ color: 'var(--rust)' }}>YARD</span>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          <button style={monoBtn(mode === 'signin')} onClick={() => switchMode('signin')}>Sign In</button>
          <button style={monoBtn(mode === 'signup')} onClick={() => switchMode('signup')}>Sign Up</button>
        </div>

        {signupSent ? (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--green)', lineHeight: 1.6 }}>
            Check your email at <strong>{email}</strong> and click the confirmation link to activate your account.
          </div>
        ) : resetSent ? (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--green)', lineHeight: 1.6 }}>
            Reset link sent to <strong>{email}</strong>. Check your email and click the link to set a new password.
          </div>
        ) : (
          <>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle()} autoFocus />
            <label style={{ ...labelStyle, marginTop: '12px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => mode === 'signin' && e.key === 'Enter' && handleSignIn()} style={inputStyle()} />
            {mode === 'signup' && (
              <>
                <label style={{ ...labelStyle, marginTop: '12px' }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()} style={inputStyle()} />
              </>
            )}
            {error && <div style={{ color: 'var(--rust)', fontFamily: "'DM Mono', monospace", fontSize: '11px', marginTop: '8px' }}>{error}</div>}
            <button onClick={mode === 'signin' ? handleSignIn : handleSignUp} disabled={loading} style={{
              width: '100%', marginTop: '20px', background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px',
              padding: '10px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>{loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign In' : 'Create Account')}</button>
            {mode === 'signin' && (
              <button onClick={handleForgot} disabled={loading} style={{
                width: '100%', marginTop: '10px', background: 'none', border: 'none',
                fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--d-faint)', cursor: 'pointer', opacity: loading ? 0.4 : 1,
              }}>Forgot password?</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) { setError(authError.message); setLoading(false); return }
    setDone(true)
    setTimeout(onDone, 2000)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--d-bg)' }}>
      <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '28px 32px', width: '320px' }}>
        {done ? (
          <>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '8px' }}>Password Updated</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-sub)' }}>Taking you to the app...</div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rust)', marginBottom: '4px' }}>Set New Password</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)', marginBottom: '24px' }}>Choose a new password</div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle()} autoFocus />
            <label style={{ ...labelStyle, marginTop: '12px' }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()} style={inputStyle()} />
            {error && <div style={{ color: 'var(--rust)', fontFamily: "'DM Mono', monospace", fontSize: '11px', marginTop: '8px' }}>{error}</div>}
            <button onClick={handleReset} disabled={loading} style={{
              width: '100%', marginTop: '20px', background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px',
              padding: '10px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>{loading ? 'Updating...' : 'Update Password'}</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Rename Vehicle Modal ─────────────────────────────────────────────────────
function RenameVehicleModal({ vehicle, vehicles, onClose, onSave }) {
  const [name, setName] = useState(vehicle.name)
  const [error, setError] = useState('')
  const handle = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Name cannot be empty'); return }
    if (trimmed === vehicle.name) { onClose(); return }
    if (vehicles.some(v => v.id !== vehicle.id && v.name === trimmed)) { setError('A vehicle with that name already exists'); return }
    onSave(vehicle.id, vehicle.name, trimmed)
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '360px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '18px' }}>Rename Vehicle</div>
        <label style={labelStyle}>Vehicle Name</label>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} style={inputStyle()} autoFocus />
        {error && <div style={{ color: 'var(--rust)', fontSize: '12px', marginTop: '6px', fontFamily: "'DM Mono', monospace" }}>{error}</div>}
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-sub)', marginTop: '10px', lineHeight: 1.5 }}>All existing fuel log entries will be updated to the new name.</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handle} style={{ flex: 1, background: 'var(--amber)', color: '#1A1714', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Save &amp; Update</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Vehicle Modal ─────────────────────────────────────────────────────
function DeleteVehicleModal({ vehicle, entryCount, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '360px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: '16px' }}>Delete Vehicle</div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '14px', color: 'var(--d-text)', marginBottom: '10px' }}>
          Remove <strong style={{ color: 'var(--amber)' }}>{vehicle.name}</strong> from your vehicle list?
        </div>
        {entryCount > 0 ? (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-sub)', background: 'var(--d-surf)', border: '1px solid var(--d-border)', borderRadius: '7px', padding: '10px 12px', lineHeight: 1.6 }}>
            This vehicle has <strong style={{ color: 'var(--amber)' }}>{entryCount} fuel log {entryCount === 1 ? 'entry' : 'entries'}</strong>. Those entries will be kept — only the vehicle name is removed from the list.
          </div>
        ) : (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-sub)' }}>This vehicle has no log entries.</div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button onClick={onConfirm} style={{ flex: 1, background: 'rgba(204,74,15,0.1)', border: '1px solid var(--rust)', color: 'var(--rust)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Confirm Delete</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Fill-Up Modal ────────────────────────────────────────────────────────────
function FillUpModal({ entry, vehicles, onClose, onSave }) {
  const defaultVehicle = entry?.vehicle || (vehicles.length > 0 ? vehicles[0].name : '')
  const [form, setForm] = useState(entry ? {
    vehicle: entry.vehicle || defaultVehicle,
    date: entry.date || today(),
    odometer: entry.odometer ?? '',
    fuel_amount: entry.fuel_amount ?? '',
    fuel_cost: entry.fuel_cost ?? '',
    price_per_gal: entry.price_per_gal ?? '',
    fuel_grade: entry.fuel_grade ?? '',
    location: entry.location ?? '',
    notes: entry.notes ?? '',
  } : {
    vehicle: defaultVehicle, date: today(), odometer: '',
    fuel_amount: '', fuel_cost: '', price_per_gal: '', fuel_grade: '', location: '', notes: '',
  })

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'fuel_cost') {
      const cost = parseFloat(v); const amt = parseFloat(next.fuel_amount)
      if (cost > 0 && amt > 0) next.price_per_gal = (cost / amt).toFixed(3)
    }
    if (k === 'price_per_gal') {
      const price = parseFloat(v); const amt = parseFloat(next.fuel_amount)
      if (price > 0 && amt > 0) next.fuel_cost = (price * amt).toFixed(2)
    }
    if (k === 'fuel_amount') {
      const amt = parseFloat(v)
      if (next.fuel_cost && !next.price_per_gal) {
        const cost = parseFloat(next.fuel_cost)
        if (cost > 0 && amt > 0) next.price_per_gal = (cost / amt).toFixed(3)
      } else if (next.price_per_gal) {
        const price = parseFloat(next.price_per_gal)
        if (price > 0 && amt > 0) next.fuel_cost = (price * amt).toFixed(2)
      }
    }
    return next
  })

  const valid = form.vehicle && form.date && form.odometer && form.fuel_amount
  const noVehicles = vehicles.length === 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '20px' }}>{entry ? 'Edit Fill-Up' : 'Add Fill-Up'}</div>

        {noVehicles && (
          <div style={{ color: 'var(--rust)', fontSize: '12px', background: 'rgba(204,74,15,0.08)', border: '1px solid rgba(204,74,15,0.3)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', fontFamily: "'DM Mono', monospace" }}>
            No vehicles found. Add a vehicle in the My Vehicles panel first.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Vehicle *</label>
            <select value={form.vehicle} onChange={e => set('vehicle', e.target.value)} style={selectStyle()} disabled={noVehicles}>
              {noVehicles ? <option value="">— No vehicles —</option> : vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Odometer * (mi)</label>
              <input type="number" step="0.1" value={form.odometer} onChange={e => set('odometer', e.target.value)} style={inputStyle()} placeholder="e.g. 73842" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fuel (gal) *</label>
              <input type="number" step="0.001" value={form.fuel_amount} onChange={e => set('fuel_amount', e.target.value)} style={inputStyle()} placeholder="8.432" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Total Cost ($)</label>
              <input type="number" step="0.01" value={form.fuel_cost} onChange={e => set('fuel_cost', e.target.value)} style={inputStyle()} placeholder="32.50" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Price/gal ($)</label>
              <input type="number" step="0.001" value={form.price_per_gal} onChange={e => set('price_per_gal', e.target.value)} style={inputStyle()} placeholder="3.459" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Fuel Grade</label>
            <select value={form.fuel_grade} onChange={e => set('fuel_grade', e.target.value)} style={selectStyle()}>
              <option value="">— Select grade —</option>
              <option value="Regular">Regular (87)</option>
              <option value="Mid-Grade">Mid-Grade (89)</option>
              <option value="Premium">Premium (91)</option>
              <option value="Premium Plus">Premium Plus (93)</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="Gas station or city" />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} style={inputStyle()} placeholder="Any notes..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => valid && onSave(form)} style={{ flex: 1, background: valid ? 'var(--amber)' : 'var(--d-border)', color: valid ? '#1A1714' : 'var(--d-faint)', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: valid ? 'pointer' : 'default' }}>{entry ? 'Save Changes' : 'Add Fill-Up'}</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '6px', padding: '8px 12px', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>
      <div style={{ color: 'var(--d-sub)', marginBottom: '2px' }}>{fmtDate(d.date)}</div>
      {d.vehicle && <div style={{ color: 'var(--d-muted)', fontSize: '10px', marginBottom: '2px' }}>{d.vehicle}</div>}
      <div style={{ color: 'var(--amber)' }}>{fmt(d.mpg)} MPG</div>
      {d.odometer && <div style={{ color: 'var(--d-faint)', fontSize: '10px' }}>{d.odometer.toLocaleString()} mi</div>}
    </div>
  )
}

// ─── Vehicle Form Modal (Add + Edit) ─────────────────────────────────────────
function VehicleFormModal({ vehicle, vehicles, onClose, onSave }) {
  const isEdit = !!vehicle

  // For vehicles created before the extended-fields migration, year/make/model/trim_level
  // are NULL. Fall back to parsing the composed name (e.g. "2009 Mini Cooper S").
  const parsedFromName = (() => {
    if (!isEdit || (vehicle.year || vehicle.make || vehicle.model)) return {}
    const parts = (vehicle.name || '').trim().split(/\s+/)
    const year = parts[0] && /^\d{4}$/.test(parts[0]) ? parts[0] : ''
    const rest = year ? parts.slice(1) : parts
    const make = rest[0] || ''
    const model = rest[1] || ''
    const trim = rest.slice(2).join(' ')
    return { year, make, model, trim }
  })()

  const [form, setForm] = useState({
    year: vehicle?.year ?? parsedFromName.year ?? '',
    make: vehicle?.make ?? parsedFromName.make ?? '',
    model: vehicle?.model ?? parsedFromName.model ?? '',
    trim: vehicle?.trim_level ?? parsedFromName.trim ?? '',
    color: vehicle?.color ?? '',
    originalMileage: vehicle?.original_mileage ?? '',
    mileage: vehicle?.current_mileage ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const composedName = [form.year, form.make, form.model, form.trim].filter(Boolean).join(' ').trim()

  const handle = async () => {
    if (!form.year || !form.make || !form.model) { setError('Year, make, and model are required'); return }
    if (!isEdit && vehicles.some(v => v.name === composedName)) { setError('A vehicle with that name already exists'); return }
    setSaving(true)
    await onSave({
      name: composedName,
      year: form.year,
      make: form.make,
      model: form.model,
      trim_level: form.trim,
      color: form.color,
      original_mileage: form.originalMileage || null,
      current_mileage: form.mileage || null,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber)', marginBottom: '20px' }}>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: '0 0 90px' }}>
              <label style={labelStyle}>Year *</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} style={inputStyle()} placeholder="2009" min="1900" max="2099" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Make *</label>
              <input value={form.make} onChange={e => set('make', e.target.value)} style={inputStyle()} placeholder="Mini" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Model *</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle()} placeholder="Cooper" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Trim / Sub-model</label>
              <input value={form.trim} onChange={e => set('trim', e.target.value)} style={inputStyle()} placeholder="S, JCW, Base..." />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Color</label>
            <input value={form.color} onChange={e => set('color', e.target.value)} style={inputStyle()} placeholder="e.g. Chili Red" />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Original Mileage</label>
              <input type="number" value={form.originalMileage} onChange={e => set('originalMileage', e.target.value)} style={inputStyle()} placeholder="e.g. 0" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Current Mileage</label>
              <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} style={inputStyle()} placeholder="e.g. 73000" />
            </div>
          </div>
          {composedName && (
            <div style={{ background: 'var(--d-surf)', border: '1px solid var(--d-border)', borderRadius: '7px', padding: '10px 14px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '4px' }}>Name Preview</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '15px', color: 'var(--d-text)' }}>
                {composedName}
                {form.color && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · {form.color}</span>}
                {form.originalMileage && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · orig {parseInt(form.originalMileage).toLocaleString()} mi</span>}
                {form.mileage && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · cur {parseInt(form.mileage).toLocaleString()} mi</span>}
              </div>
            </div>
          )}
          {error && <div style={{ color: 'var(--rust)', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={handle} disabled={saving} style={{ flex: 1, background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Vehicle'}</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Vehicles Panel ───────────────────────────────────────────────────────────
function VehiclesPanel({ vehicles, logs, isAdmin, onEdit, onDelete }) {
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const entryCount = (vehicleName) => logs.filter(l => l.vehicle === vehicleName).length
  const lastFillupDate = (vehicleName) => {
    const vLogs = logs.filter(l => l.vehicle === vehicleName && l.date)
    if (!vLogs.length) return null
    return vLogs.sort((a, b) => b.date.localeCompare(a.date))[0].date
  }

  return (
    <>
      <div style={{ margin: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {vehicles.length === 0 && (
          <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '14px', fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)' }}>
            {isAdmin ? 'No vehicles yet — tap + to add one.' : 'No vehicles configured.'}
          </div>
        )}
        {vehicles.map(v => {
          const lastFillup = lastFillupDate(v.name)
          const colorMap = { black: '#333', white: '#fff', silver: '#c0c0c0', gray: '#808080', grey: '#808080', red: '#e53e3e', blue: '#3b82f6', green: '#38a169', yellow: '#ecc94b', orange: '#dd6b20', brown: '#8b4513', gold: '#d4a017', beige: '#f5f5dc', midnight: '#1a1a2e' }
          const colorDot = v.color ? (colorMap[v.color.split(' ')[0].toLowerCase()] || 'var(--d-sub)') : null
          return (
            <div key={v.id} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', color: 'var(--d-text)' }}>{v.name}</div>
                  {(v.make || v.model || v.trim_level) && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {[v.make, v.model, v.trim_level].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {v.color && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorDot, border: colorDot === '#fff' || colorDot === '#f5f5dc' ? '1px solid var(--d-border)' : 'none', display: 'inline-block' }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{v.color}</span>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => setEditingVehicle(v)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edit</button>
                    <button onClick={() => setDeletingVehicle(v)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--rust)', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Del</button>
                  </div>
                )}
              </div>
              {lastFillup ? (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--d-border)' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)' }}>Last Fill-Up</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--d-text)', marginTop: '2px' }}>{new Date(lastFillup + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              ) : (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--d-border)' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)', padding: '4px 0' }}>No fill-ups yet</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {editingVehicle && <VehicleFormModal vehicle={editingVehicle} vehicles={vehicles} onClose={() => setEditingVehicle(null)} onSave={async (fields) => { await onEdit(editingVehicle.id, editingVehicle.name, fields); setEditingVehicle(null) }} />}
      {deletingVehicle && <DeleteVehicleModal vehicle={deletingVehicle} entryCount={entryCount(deletingVehicle.name)} onClose={() => setDeletingVehicle(null)} onConfirm={() => { onDelete(deletingVehicle.id, deletingVehicle.name); setDeletingVehicle(null) }} />}
    </>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState(() => window.location.hash.includes('type=recovery'))
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session); setAuthLoading(false)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [statsVehicleFilter, setStatsVehicleFilter] = useState('All')
  const [historyVehicleFilter, setHistoryVehicleFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')

  const showToast = (msg) => setToast(msg)

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').order('name')
    setVehicles(data || [])
  }, [])

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('fuel_logs').select('*')
      .order('date', { ascending: false }).order('id', { ascending: false })
    if (!error) setLogs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (session) Promise.all([fetchLogs(), fetchVehicles()]) }, [session, fetchLogs, fetchVehicles])

  const callFn = async (fnName, payload) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      try { return JSON.parse(text) } catch {
        console.error(`[callFn] ${fnName} returned non-JSON (${res.status}):`, text)
        return { ok: false, error: { message: `Server error (${res.status})` } }
      }
    } catch (err) {
      console.error(`[callFn] ${fnName} network error:`, err)
      return { ok: false, error: { message: 'Network error' } }
    }
  }

  const handleAddVehicle = async (fields) => {
    const result = await callFn('fuel-vehicle-insert', fields)
    if (result.ok) { showToast(`Vehicle "${fields.name}" added`); fetchVehicles() }
    else showToast(result.error?.message || 'Failed to add vehicle')
  }
  const handleEditVehicle = async (id, oldName, fields) => {
    const { name, ...rest } = fields
    const result = await callFn('fuel-vehicle-update', { id, oldName, newName: name, ...rest })
    if (result.ok) {
      const renamed = fields.name !== oldName
      showToast(renamed ? `Updated & renamed → "${fields.name}" (${result.updatedLogs ?? 0} entries updated)` : `Vehicle "${fields.name}" updated`)
      fetchVehicles(); if (renamed) fetchLogs()
    } else showToast(result.error?.message || 'Update failed')
  }
  const handleDeleteVehicle = async (id, name) => {
    const result = await callFn('fuel-vehicle-delete', { id })
    if (result.ok) { showToast(`Vehicle "${name}" removed`); fetchVehicles() }
    else showToast('Delete failed')
  }

  const handleSave = async (form) => {
    const row = {
      vehicle: form.vehicle || null,
      date: form.date,
      odometer: parseFloat(form.odometer),
      fuel_amount: parseFloat(form.fuel_amount),
      fuel_cost: form.fuel_cost ? parseFloat(form.fuel_cost) : null,
      price_per_gal: form.price_per_gal ? parseFloat(form.price_per_gal) : null,
      fuel_grade: form.fuel_grade || null,
      location: form.location || null,
      notes: form.notes || null,
    }
    if (editEntry) {
      await callFn('fuel-update', { id: editEntry.id, fields: row })
      showToast('Fill-up updated'); setEditEntry(null)
    } else {
      await callFn('fuel-insert', { row })
      showToast('Fill-up added'); setShowAdd(false)
    }
    fetchLogs()
  }

  const handleDelete = async (id) => {
    await callFn('fuel-delete', { id })
    showToast('Entry deleted'); fetchLogs(); setConfirmDelete(null)
  }

  const user = session?.user ?? null
  const isAdmin = !!user

  const handleRefresh = () => { fetchLogs(); fetchVehicles() }

  // ── Computed ──────────────────────────────────────────────────────────────
  const logsWithMpg = computeMpg(logs)

  const statsLogs = statsVehicleFilter === 'All'
    ? logsWithMpg
    : logsWithMpg.filter(l => l.vehicle === statsVehicleFilter)

  const mpgValues = statsLogs.filter(l => l.mpg != null).map(l => l.mpg)
  const avgMpg = mpgValues.length >= 1 ? mpgValues.reduce((s, v) => s + v, 0) / mpgValues.length : null
  const odoValues = statsLogs.map(l => l.odometer).filter(Boolean)
  const totalMiles = odoValues.length >= 2 ? Math.max(...odoValues) - Math.min(...odoValues) : null
  const costs = statsLogs.map(l => l.fuel_cost).filter(v => v != null)
  const totalSpent = costs.length ? costs.reduce((s, v) => s + v, 0) : null

  const displayLogs = [...logsWithMpg].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.id - a.id
  })

  const chartData = displayLogs.filter(l => l.mpg != null).slice(0, 10).reverse()

  const historyLogs = filterByDate(
    historyVehicleFilter === 'All' ? displayLogs : displayLogs.filter(l => l.vehicle === historyVehicleFilter),
    dateFilter
  )

  const vehicleOptions = ['All', ...vehicles.map(v => v.name)]

  // Stats charts data
  const mpgByVehicle = vehicles.map(v => {
    const vLogs = logsWithMpg.filter(l => l.vehicle === v.name && l.mpg != null)
    if (!vLogs.length) return null
    const avg = vLogs.reduce((s, l) => s + l.mpg, 0) / vLogs.length
    const shortName = v.name?.split(' ').slice(-2).join(' ') || v.name || '—'
    return { name: shortName, mpg: parseFloat(avg.toFixed(1)) }
  }).filter(Boolean)

  const monthlySpendData = (() => {
    const acc = {}
    logs.forEach(l => {
      if (!l.fuel_cost || !l.date) return
      const key = l.date.slice(0, 7)
      acc[key] = (acc[key] || 0) + l.fuel_cost
    })
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), cost: parseFloat(v.toFixed(2)) }))
  })()

  const NAV_TABS = [
    { id: 'garage', icon: '🚗', label: 'Garage' },
    { id: 'summary', icon: '📊', label: 'Summary' },
    { id: 'fillups', icon: '⛽', label: 'Fill-ups' },
    { id: 'stats', icon: '📈', label: 'Stats' },
  ]

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--d-bg)' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)' }}>Loading...</div>
    </div>
  )
  if (isRecovery) return <ResetPasswordPage onDone={() => setIsRecovery(false)} />
  if (!user) return <LoginPage />

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", background: 'var(--d-bg)', minHeight: '100vh', color: 'var(--d-text)', paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ maxWidth: isMobile ? '430px' : '1400px', margin: '0 auto', padding: isMobile ? '0' : '0 24px' }}>
        <Nav activeApp="fuel" dashboardUrl={DASHBOARD_URL} fuelUrl={FUEL_URL} user={user} onSignOut={() => supabase.auth.signOut()} />

        {/* Stats hero card */}
        <div style={{ margin: '16px 20px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)' }}>Stats</span>
            <select value={statsVehicleFilter} onChange={e => setStatsVehicleFilter(e.target.value)} style={{ background: 'var(--d-surf)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '3px 8px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '10px', cursor: 'pointer' }}>
              {vehicleOptions.map(v => <option key={v}>{v}</option>)}
            </select>
            <button onClick={handleRefresh} style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>↻</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Fill-ups', value: statsLogs.length, color: 'var(--d-muted)' },
              { label: 'Avg MPG', value: statsLogs.length >= 2 ? fmt(avgMpg) : '—', color: 'var(--amber)' },
              { label: 'Miles', value: totalMiles != null ? totalMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: 'var(--green)' },
              { label: 'Spent', value: totalSpent != null ? `$${totalSpent.toFixed(0)}` : '—', color: 'var(--purple)' },
            ].map(s => (
              <div key={s.label} style={{ border: '1px solid var(--d-border)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '28px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop sidebar + content, mobile single column */}
        <div style={{ display: isMobile ? 'block' : 'flex', paddingBottom: isMobile ? '96px' : '32px' }}>

          {/* ── Desktop sidebar ── */}
          {!isMobile && (
            <aside style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--d-border)', marginRight: '24px', paddingTop: '4px', position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
              {NAV_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px',
                  background: activeTab === tab.id ? 'rgba(204,74,15,0.1)' : 'transparent',
                  border: 'none', borderLeft: `2px solid ${activeTab === tab.id ? 'var(--rust)' : 'transparent'}`,
                  cursor: 'pointer', color: activeTab === tab.id ? 'var(--rust)' : 'var(--d-sub)',
                  fontFamily: "'DM Mono', monospace", fontSize: '11px', textTransform: 'uppercase',
                  letterSpacing: '0.08em', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
              {isAdmin && (activeTab === 'fillups' || activeTab === 'garage') && (
                <button onClick={() => activeTab === 'fillups' ? setShowAdd(true) : setShowAddVehicle(true)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  width: 'calc(100% - 24px)', margin: '14px 12px 6px', padding: '9px 14px',
                  background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>+ {activeTab === 'fillups' ? 'Add Fill-up' : 'Add Vehicle'}</button>
              )}
            </aside>
          )}

          {/* ── Main content ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--d-sub)' }}>Loading...</div>
            ) : activeTab === 'summary' ? (
              <div style={{ padding: '0 0 8px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', padding: '4px 20px 12px' }}>Summary by Vehicle</div>
                {vehicles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛽</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Vehicles</div>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)', marginTop: '8px' }}>Add vehicles in the Garage tab first</div>
                  </div>
                ) : (
                  <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', flexDirection: 'column', gap: '10px', padding: '0 20px' }}>
                    {vehicles.map(v => {
                      const vLogs = logsWithMpg.filter(l => l.vehicle === v.name)
                      const vMpgVals = vLogs.filter(l => l.mpg != null).map(l => l.mpg)
                      const vAvgMpg = vMpgVals.length ? vMpgVals.reduce((s, x) => s + x, 0) / vMpgVals.length : null
                      const vOdos = vLogs.map(l => l.odometer).filter(Boolean)
                      const vMiles = vOdos.length >= 2 ? Math.max(...vOdos) - Math.min(...vOdos) : null
                      const vSpent = vLogs.filter(l => l.fuel_cost != null).reduce((s, l) => s + l.fuel_cost, 0)
                      const lastFillup = [...vLogs].sort((a, b) => b.date?.localeCompare(a.date))[0]?.date || null
                      return (
                        <div key={v.id} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--d-text)' }}>{v.name}</div>
                          {(v.make || v.model || v.trim_level) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)', marginTop: '2px', letterSpacing: '0.06em' }}>{[v.make, v.model, v.trim_level].filter(Boolean).join(' · ')}</div>}
                          <div style={{ display: 'flex', borderTop: '1px solid var(--d-border)', paddingTop: '8px', marginTop: '10px' }}>
                            {[
                              { label: 'Fill-ups', value: vLogs.length, color: '#D9D0C1' },
                              { label: 'Avg MPG', value: vAvgMpg ? fmt(vAvgMpg) : '—', color: '#E8943A' },
                              { label: 'Miles', value: vMiles != null ? vMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: '#34D399' },
                              { label: 'Spent', value: vSpent > 0 ? `$${vSpent.toFixed(0)}` : '—', color: '#818CF8' },
                            ].map((s, i) => (
                              <div key={s.label} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid var(--d-border)' : 'none' }}>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--d-faint)', marginTop: '3px' }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                          {lastFillup && <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>Last Fill-Up</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>{fmtDate(lastFillup)}</span></div>}
                        </div>
                      )
                    })}
                    {logs.length === 0 && <div style={{ textAlign: 'center', padding: '16px', fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)' }}>No fill-up data yet — record your first fill-up in the Fill-Ups tab</div>}
                  </div>
                )}
              </div>
            ) : activeTab === 'fillups' ? (
              <>
                {/* Filter row */}
                <div style={{ display: 'flex', gap: '7px', padding: '0 20px 10px', alignItems: 'center', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }} className={isMobile ? 'chip-scroll' : ''}>
                  <select value={historyVehicleFilter} onChange={e => setHistoryVehicleFilter(e.target.value)} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '6px 10px', borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', cursor: 'pointer', flexShrink: 0 }}>
                    {vehicleOptions.map(v => <option key={v}>{v}</option>)}
                  </select>
                  <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '6px 10px', borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', cursor: 'pointer', flexShrink: 0 }}>
                    {DATE_FILTERS.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)', whiteSpace: 'nowrap' }}>{historyLogs.length} {historyLogs.length === 1 ? 'entry' : 'entries'}</span>
                </div>

                {historyLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛽</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Fill-ups Yet</div>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)', marginTop: '8px' }}>Use the + button to record your first fill-up</div>
                  </div>
                ) : isMobile ? (
                  /* Mobile: card list */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '0 20px' }}>
                    {historyLogs.map(log => (
                      <div key={log.id} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--d-text)' }}>{log.vehicle || '—'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)' }}>{fmtDate(log.date)}</span>
                            {isAdmin && (confirmDelete === log.id ? <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><button onClick={() => handleDelete(log.id)} style={{ background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Yes</button><button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', cursor: 'pointer' }}>No</button></span> : <span style={{ display: 'flex', gap: '4px' }}><button onClick={() => setEditEntry(log)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button><button onClick={() => setConfirmDelete(log.id)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Del</button></span>)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: log.mpg ? 'var(--amber)' : 'var(--d-faint)' }}>{log.mpg ? fmt(log.mpg) : '—'}</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)', marginLeft: '3px' }}>mpg</span></div>
                          <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--d-muted)' }}>{fmt(log.fuel_amount, 3)}</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)', marginLeft: '3px' }}>gal</span></div>
                          {log.fuel_cost != null && <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--purple)' }}>${log.fuel_cost.toFixed(2)}</span></div>}
                          {log.price_per_gal != null && <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>${fmt(log.price_per_gal, 3)}/gal</span></div>}
                          <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>{log.odometer?.toLocaleString()} mi</span></div>
                          {log.fuel_grade && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: gradeColor(log.fuel_grade) }}>{log.fuel_grade}</span>}
                        </div>
                        {log.location && <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-faint)' }}>{log.location}</div>}
                        {log.notes && <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-faint)', marginTop: '2px' }}>{log.notes}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Desktop: data table */
                  <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', overflow: 'hidden', margin: '0 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px 80px 80px 80px 90px 70px', padding: '8px 14px', background: 'var(--d-surf)', borderBottom: '1px solid var(--d-border)' }}>
                      {['Date', 'Vehicle', 'MPG', 'Gallons', 'Cost', '$/gal', 'Odometer', 'Grade'].map(h => (
                        <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>{h}</span>
                      ))}
                    </div>
                    {historyLogs.map(log => (
                      <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px 80px 80px 80px 90px 70px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--d-border)', minHeight: '44px' }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-sub)' }}>{fmtDate(log.date)}</span>
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--d-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{log.vehicle || '—'}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '14px', color: log.mpg ? 'var(--amber)' : 'var(--d-faint)' }}>{log.mpg ? fmt(log.mpg) : '—'}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-muted)' }}>{fmt(log.fuel_amount, 3)}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '12px', color: log.fuel_cost != null ? 'var(--purple)' : 'var(--d-faint)' }}>{log.fuel_cost != null ? `$${log.fuel_cost.toFixed(2)}` : '—'}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-sub)' }}>{log.price_per_gal != null ? `$${fmt(log.price_per_gal, 3)}` : '—'}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-sub)' }}>{log.odometer?.toLocaleString() ?? '—'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {log.fuel_grade && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: gradeColor(log.fuel_grade) }}>{log.fuel_grade}</span>}
                          {isAdmin && (confirmDelete === log.id ? <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><button onClick={() => handleDelete(log.id)} style={{ background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>Yes</button><button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '4px', padding: '2px 6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>No</button></span> : <span style={{ display: 'flex', gap: '3px' }}><button onClick={() => setEditEntry(log)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '4px', padding: '2px 6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>Edit</button><button onClick={() => setConfirmDelete(log.id)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '4px', padding: '2px 6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>Del</button></span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : activeTab === 'garage' ? (
              <div style={{ padding: '0 0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)' }}>My Garage</div>
                  {isAdmin && <button onClick={() => setShowAddVehicle(true)} style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--rust)', cursor: 'pointer', letterSpacing: '0.06em' }}>+ ADD</button>}
                </div>
                <VehiclesPanel vehicles={vehicles} logs={logs} isAdmin={isAdmin} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
                {!isAdmin && vehicles.length > 0 && <div style={{ margin: '0 20px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>Login as admin to add or manage vehicles</div>}
                {vehicles.length === 0 && !isAdmin && <div style={{ textAlign: 'center', padding: '48px 24px' }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>🚗</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Vehicles Yet</div></div>}
              </div>
            ) : (
              /* Stats tab */
              <div style={{ padding: '0 20px 8px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginBottom: '14px' }}>Stats</div>
                {logs.length < 2 ? (
                  <div style={{ textAlign: 'center', padding: '40px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--d-faint)' }}>Record at least 2 fill-ups to see charts</div>
                ) : (
                  <>
                    <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      {chartData.length >= 2 && (
                        <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px 8px', marginBottom: isMobile ? '10px' : 0 }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>MPG Trend</div>
                          <ResponsiveContainer width="100%" height={130}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                              <XAxis dataKey="date" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} tickFormatter={fmtDate} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Line type="monotone" dataKey="mpg" stroke="#E8943A" strokeWidth={2} dot={{ fill: '#E8943A', r: 3 }} activeDot={{ r: 5, fill: '#E8943A' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {mpgByVehicle.length > 0 && (
                        <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px', marginBottom: isMobile ? '10px' : 0 }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Average MPG by Vehicle</div>
                          <ResponsiveContainer width="100%" height={mpgByVehicle.length * 36 + 10}>
                            <BarChart data={mpgByVehicle} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 80 }}>
                              <XAxis type="number" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                              <YAxis type="category" dataKey="name" tick={{ fill: '#9E9894', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={80} />
                              <Tooltip formatter={v => [`${v} mpg`, 'Avg MPG']} contentStyle={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--d-muted)' }} labelStyle={{ color: 'var(--d-text)', fontWeight: 500 }} itemStyle={{ color: 'var(--d-muted)' }} />
                              <Bar dataKey="mpg" fill="#E8943A" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                    {monthlySpendData.length > 1 && (
                      <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Monthly Fuel Spend</div>
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={monthlySpendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <XAxis dataKey="month" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `$${v}`} />
                            <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Spent']} contentStyle={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--d-muted)' }} labelStyle={{ color: 'var(--d-text)', fontWeight: 500 }} itemStyle={{ color: 'var(--d-muted)' }} />
                            <Bar dataKey="cost" fill="#818CF8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAB — mobile only */}
        {isMobile && isAdmin && (activeTab === 'fillups' || activeTab === 'garage') && (
          <div style={{ position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', pointerEvents: 'none', zIndex: 90 }}>
            <button onClick={() => activeTab === 'fillups' ? setShowAdd(true) : setShowAddVehicle(true)} style={{ position: 'absolute', right: '16px', bottom: '0', width: '56px', height: '56px', borderRadius: '16px', background: 'var(--rust)', color: '#fff', border: 'none', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(204,74,15,0.5)', cursor: 'pointer', pointerEvents: 'all' }}>+</button>
          </div>
        )}

        {/* Bottom navigation — mobile only */}
        {isMobile && (
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '76px', background: 'var(--d-surf)', borderTop: '1px solid var(--d-border)', display: 'flex', alignItems: 'stretch', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
            {NAV_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: activeTab === tab.id ? 1 : 0.35 }}>
                <span style={{ fontSize: '17px' }}>{tab.icon}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: activeTab === tab.id ? 'var(--rust)' : 'var(--d-sub)' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAddVehicle && <VehicleFormModal vehicles={vehicles} onClose={() => setShowAddVehicle(false)} onSave={async fields => { await handleAddVehicle(fields); setShowAddVehicle(false) }} />}
      {showAdd && <FillUpModal vehicles={vehicles} onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {editEntry && <FillUpModal entry={editEntry} vehicles={vehicles} onClose={() => setEditEntry(null)} onSave={handleSave} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
