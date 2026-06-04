import { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from './supabase.js'
import Nav from './Nav.jsx'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || '#'
const FUEL_URL = import.meta.env.VITE_FUEL_URL || '/'

// ─── Style helpers (match dashboard exactly) ──────────────────────────────────
const inputStyle = (extra = {}) => ({
  background: '#0d0d0f', border: '1px solid #2a2a35', color: '#e2e8f0',
  padding: '7px 10px', borderRadius: '4px', fontSize: '12px',
  fontFamily: 'inherit', width: '100%', outline: 'none', ...extra,
})
const selectStyle = (extra = {}) => ({
  background: '#0d0d0f', border: '1px solid #2a2a35', color: '#cbd5e1',
  padding: '7px 10px', borderRadius: '4px', fontSize: '12px',
  fontFamily: 'inherit', width: '100%', cursor: 'pointer', outline: 'none', ...extra,
})
const labelStyle = {
  display: 'block', fontSize: '9px', color: '#4b5563',
  letterSpacing: '0.1em', marginBottom: '5px',
}

// ─── MPG calculation — computed per vehicle so odometers never cross ──────────
function computeMpg(logs) {
  // Group entries by vehicle, compute consecutive odometer MPG within each group
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

function today() {
  return new Date().toISOString().split('T')[0]
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
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
      background: '#10b981', color: '#0d0d0f', padding: '10px 18px',
      borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit',
      fontWeight: 500, animation: 'toastIn 0.2s ease',
    }}>
      {message}
    </div>
  )
}

// ─── Admin Login Modal ────────────────────────────────────────────────────────
function AdminLoginModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/fuel-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        sessionStorage.setItem('adminSession', 'true')
        sessionStorage.setItem('adminPass', password)
        onSuccess(password)
      } else { setError('Invalid password') }
    } catch { setError('Connection error') }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px', padding: '28px', width: '320px',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '18px' }}>
          ADMIN LOGIN
        </div>
        <label style={labelStyle}>PASSWORD</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle()} autoFocus />
        {error && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handleLogin} disabled={loading} style={{
            flex: 1, background: '#f59e0b', color: '#0d0d0f', border: 'none', borderRadius: '4px',
            padding: '8px', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}>{loading ? 'CHECKING...' : 'LOGIN'}</button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>CANCEL</button>
        </div>
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
    if (vehicles.some(v => v.id !== vehicle.id && v.name === trimmed)) {
      setError('A vehicle with that name already exists'); return
    }
    onSave(vehicle.id, vehicle.name, trimmed)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px', padding: '28px', width: '360px',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '18px' }}>
          RENAME VEHICLE
        </div>
        <label style={labelStyle}>VEHICLE NAME</label>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()} style={inputStyle()} autoFocus />
        {error && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>{error}</div>}
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '10px', lineHeight: 1.5 }}>
          All existing fuel log entries will be updated to the new name.
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handle} style={{
            flex: 1, background: '#f59e0b', color: '#0d0d0f', border: 'none', borderRadius: '4px',
            padding: '8px', fontSize: '11px', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}>SAVE &amp; UPDATE RECORDS</button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>CANCEL</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Vehicle Confirm Modal ─────────────────────────────────────────────
function DeleteVehicleModal({ vehicle, entryCount, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px', padding: '28px', width: '360px',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#ef4444', letterSpacing: '0.08em', marginBottom: '16px' }}>
          DELETE VEHICLE
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
          Remove <strong style={{ color: '#f59e0b' }}>{vehicle.name}</strong> from your vehicle list?
        </div>
        {entryCount > 0 ? (
          <div style={{ fontSize: '11px', color: '#6b7280', background: '#13131a', border: '1px solid #1e1e28', borderRadius: '4px', padding: '10px 12px', lineHeight: 1.6 }}>
            This vehicle has <strong style={{ color: '#f97316' }}>{entryCount} fuel log {entryCount === 1 ? 'entry' : 'entries'}</strong>. Those entries will be kept — only the vehicle name is removed from the list.
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#6b7280' }}>This vehicle has no log entries.</div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button onClick={onConfirm} style={{
            flex: 1, background: 'none', border: '1px solid #ef4444', color: '#ef4444',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>CONFIRM DELETE</button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>CANCEL</button>
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
    location: entry.location ?? '',
    notes: entry.notes ?? '',
  } : {
    vehicle: defaultVehicle, date: today(), odometer: '',
    fuel_amount: '', fuel_cost: '', price_per_gal: '', location: '', notes: '',
  })

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if ((k === 'fuel_cost' || k === 'fuel_amount') && k === 'fuel_cost') {
      const cost = parseFloat(v); const amt = parseFloat(next.fuel_amount)
      if (cost > 0 && amt > 0) next.price_per_gal = (cost / amt).toFixed(3)
    }
    if ((k === 'price_per_gal' || k === 'fuel_amount') && k === 'price_per_gal') {
      const price = parseFloat(v); const amt = parseFloat(next.fuel_amount)
      if (price > 0 && amt > 0) next.fuel_cost = (price * amt).toFixed(2)
    }
    // also recalc price_per_gal when gallons change (if cost is set)
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
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px',
        padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '20px' }}>
          {entry ? 'EDIT FILL-UP' : 'ADD FILL-UP'}
        </div>

        {noVehicles ? (
          <div style={{ color: '#f97316', fontSize: '11px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '4px', padding: '10px 14px', marginBottom: '14px' }}>
            No vehicles found. Add a vehicle in the My Vehicles panel first.
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Vehicle */}
          <div>
            <label style={labelStyle}>VEHICLE *</label>
            <select value={form.vehicle} onChange={e => set('vehicle', e.target.value)} style={selectStyle()} disabled={noVehicles}>
              {noVehicles
                ? <option value="">— No vehicles —</option>
                : vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
              }
            </select>
          </div>

          {/* Date + Odometer */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>DATE *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ODOMETER * (miles)</label>
              <input type="number" step="0.1" value={form.odometer} onChange={e => set('odometer', e.target.value)} style={inputStyle()} placeholder="e.g. 73842" />
            </div>
          </div>

          {/* Fuel + Cost + Price */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>FUEL (GAL) *</label>
              <input type="number" step="0.001" value={form.fuel_amount} onChange={e => set('fuel_amount', e.target.value)} style={inputStyle()} placeholder="e.g. 8.432" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>TOTAL COST ($)</label>
              <input type="number" step="0.01" value={form.fuel_cost} onChange={e => set('fuel_cost', e.target.value)} style={inputStyle()} placeholder="e.g. 32.50" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PRICE/GAL ($)</label>
              <input type="number" step="0.001" value={form.price_per_gal} onChange={e => set('price_per_gal', e.target.value)} style={inputStyle()} placeholder="e.g. 3.459" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>LOCATION</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="Gas station or city" />
          </div>
          <div>
            <label style={labelStyle}>NOTES</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} style={inputStyle()} placeholder="Any notes..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => valid && onSave(form)} style={{
            flex: 1, background: valid ? '#f59e0b' : '#2a2a35', color: valid ? '#0d0d0f' : '#4b5563',
            border: 'none', borderRadius: '4px', padding: '9px', fontSize: '11px',
            fontFamily: 'inherit', fontWeight: 600, cursor: valid ? 'pointer' : 'default', letterSpacing: '0.05em',
          }}>
            {entry ? 'SAVE CHANGES' : 'ADD FILL-UP'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>CANCEL</button>
        </div>
      </div>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ color: '#6b7280', marginBottom: '2px' }}>{fmtDate(d.date)}</div>
      {d.vehicle && <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>{d.vehicle}</div>}
      <div style={{ color: '#f59e0b' }}>{fmt(d.mpg)} MPG</div>
      {d.odometer && <div style={{ color: '#4b5563', fontSize: '10px' }}>{d.odometer.toLocaleString()} mi</div>}
    </div>
  )
}

// ─── Vehicles Panel ───────────────────────────────────────────────────────────
function VehiclesPanel({ vehicles, logs, isAdmin, onAdd, onRename, onDelete }) {
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')
  const [renamingVehicle, setRenamingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const inputRef = useRef()

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) { setAddError('Enter a vehicle name'); return }
    if (vehicles.some(v => v.name === trimmed)) { setAddError('That name already exists'); return }
    setAddError('')
    setNewName('')
    onAdd(trimmed)
  }

  const entryCount = (vehicleName) => logs.filter(l => l.vehicle === vehicleName).length

  return (
    <>
      <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em', marginBottom: '10px' }}>MY VEHICLES</div>

        {/* Vehicle chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: isAdmin ? '12px' : '0' }}>
          {vehicles.length === 0 && (
            <span style={{ fontSize: '11px', color: '#3a3a45' }}>
              {isAdmin ? 'No vehicles yet — add one below.' : 'No vehicles configured.'}
            </span>
          )}
          {vehicles.map(v => (
            <span key={v.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#13131a', border: '1px solid #2a2a35',
              borderRadius: '4px', padding: '5px 10px', fontSize: '11px', color: '#cbd5e1',
            }}>
              {v.name}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setRenamingVehicle(v)}
                    title="Rename vehicle"
                    style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '0 2px', fontSize: '11px', lineHeight: 1 }}
                    className="vehicle-icon-btn"
                  >✏</button>
                  <button
                    onClick={() => setDeletingVehicle(v)}
                    title="Remove vehicle"
                    style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '0 2px', fontSize: '13px', lineHeight: 1 }}
                    className="vehicle-icon-btn"
                  >×</button>
                </>
              )}
            </span>
          ))}
        </div>

        {/* Add vehicle — admin only */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Vehicle name (e.g. 2009 Mini Cooper S)"
                style={inputStyle({ flex: 1 })}
              />
              <button onClick={handleAdd} style={{
                background: 'none', border: '1px solid #2a2a35', color: '#94a3b8',
                borderRadius: '4px', padding: '7px 14px', fontSize: '10px',
                fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.05em',
              }}
                className="add-vehicle-btn"
              >
                + ADD VEHICLE
              </button>
            </div>
            {addError && <div style={{ fontSize: '10px', color: '#ef4444' }}>{addError}</div>}
          </div>
        )}
      </div>

      {renamingVehicle && (
        <RenameVehicleModal
          vehicle={renamingVehicle}
          vehicles={vehicles}
          onClose={() => setRenamingVehicle(null)}
          onSave={(id, oldName, newName) => { onRename(id, oldName, newName); setRenamingVehicle(null) }}
        />
      )}
      {deletingVehicle && (
        <DeleteVehicleModal
          vehicle={deletingVehicle}
          entryCount={entryCount(deletingVehicle.name)}
          onClose={() => setDeletingVehicle(null)}
          onConfirm={() => { onDelete(deletingVehicle.id, deletingVehicle.name); setDeletingVehicle(null) }}
        />
      )}
    </>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fillups')
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('adminSession') === 'true')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPass') || '')
  const [showLogin, setShowLogin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  // Independent filters per user guide spec
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

  useEffect(() => {
    Promise.all([fetchLogs(), fetchVehicles()])
  }, [fetchLogs, fetchVehicles])

  const callFn = async (fnName, payload) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, ...payload }),
    })
    return res.json()
  }

  // ── Vehicle CRUD ─────────────────────────────────────────────────────────
  const handleAddVehicle = async (name) => {
    const result = await callFn('fuel-vehicle-insert', { name })
    if (result.ok) { showToast(`Vehicle "${name}" added`); fetchVehicles() }
    else showToast(result.error?.message || 'Failed to add vehicle')
  }

  const handleRenameVehicle = async (id, oldName, newName) => {
    const result = await callFn('fuel-vehicle-update', { id, oldName, newName })
    if (result.ok) {
      showToast(`Renamed "${oldName}" → "${newName}" (${result.updatedLogs ?? 0} entries updated)`)
      fetchVehicles(); fetchLogs()
    } else showToast('Rename failed')
  }

  const handleDeleteVehicle = async (id, name) => {
    const result = await callFn('fuel-vehicle-delete', { id })
    if (result.ok) { showToast(`Vehicle "${name}" removed`); fetchVehicles() }
    else showToast('Delete failed')
  }

  // ── Fill-up CRUD ─────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    const row = {
      vehicle: form.vehicle || null,
      date: form.date,
      odometer: parseFloat(form.odometer),
      fuel_amount: parseFloat(form.fuel_amount),
      fuel_cost: form.fuel_cost ? parseFloat(form.fuel_cost) : null,
      price_per_gal: form.price_per_gal ? parseFloat(form.price_per_gal) : null,
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

  const handleAdminSuccess = (pass) => {
    setIsAdmin(true); setAdminPassword(pass); setShowLogin(false); showToast('Admin access granted')
  }

  const handleRefresh = () => { fetchLogs(); fetchVehicles() }

  // ── Computed data ────────────────────────────────────────────────────────
  const logsWithMpg = computeMpg(logs)

  // Stats use their own independent vehicle filter
  const statsLogs = statsVehicleFilter === 'All'
    ? logsWithMpg
    : logsWithMpg.filter(l => l.vehicle === statsVehicleFilter)

  const mpgValues = statsLogs.filter(l => l.mpg != null).map(l => l.mpg)
  const avgMpg = mpgValues.length >= 1 ? mpgValues.reduce((s, v) => s + v, 0) / mpgValues.length : null
  const odoValues = statsLogs.map(l => l.odometer).filter(Boolean)
  const totalMiles = odoValues.length >= 2 ? Math.max(...odoValues) - Math.min(...odoValues) : null
  const costs = statsLogs.map(l => l.fuel_cost).filter(v => v != null)
  const totalSpent = costs.length ? costs.reduce((s, v) => s + v, 0) : null

  // Display order: most recent first
  const displayLogs = [...logsWithMpg].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.id - a.id
  })

  // Chart data: last 10 entries that have MPG data (ascending for chart display)
  const chartData = displayLogs.filter(l => l.mpg != null).slice(0, 10).reverse()

  // History tab: apply both vehicle + date filters
  const historyLogs = filterByDate(
    historyVehicleFilter === 'All' ? displayLogs : displayLogs.filter(l => l.vehicle === historyVehicleFilter),
    dateFilter
  )

  // Unique vehicle names present in logs (for dropdowns)
  const vehicleOptions = ['All', ...vehicles.map(v => v.name)]

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: '#0d0d0f', minHeight: '100vh', color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a1f; }
        ::-webkit-scrollbar-thumb { background: #3a3a45; border-radius: 3px; }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { opacity: 0.85; }
        .task-row:hover { background: #1a1a22 !important; }
        select, input, textarea { outline: none; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .fab { transition: transform 0.15s, box-shadow 0.15s; }
        .fab:hover { transform: translateY(-2px); }
        .fab:active { transform: translateY(0); }
        .del-btn { background: none; border: 1px solid #3a3a45; color: #6b7280; padding: 4px 10px; border-radius: 3px; font-size: 10px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
        .del-btn:hover { border-color: #ef4444; color: #ef4444; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .vehicle-icon-btn:hover { color: #94a3b8 !important; }
        .add-vehicle-btn:hover { border-color: #f59e0b !important; color: #f59e0b !important; }
      `}</style>

      <Nav activeApp="fuel" dashboardUrl={DASHBOARD_URL} fuelUrl={FUEL_URL} />

      {/* ── Stats Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '16px 24px' }}>
        {/* Vehicle filter for stats (independent of log filters per spec) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>STATS FOR</div>
          <select
            value={statsVehicleFilter}
            onChange={e => setStatsVehicleFilter(e.target.value)}
            style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {vehicleOptions.map(v => <option key={v}>{v}</option>)}
          </select>
          {statsVehicleFilter !== 'All' && (
            <span style={{ fontSize: '10px', color: '#4b5563' }}>
              — {statsLogs.length} {statsLogs.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleRefresh} style={{
              background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
              padding: '4px 10px', borderRadius: '4px', fontSize: '10px',
              fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.05em',
            }}>↻ REFRESH</button>
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {[
            { label: 'TOTAL FILL-UPS', value: statsLogs.length, color: '#94a3b8' },
            { label: 'AVG MPG', value: statsLogs.length >= 2 ? `${fmt(avgMpg)} mpg` : '—', color: '#f59e0b' },
            { label: 'TOTAL MILES', value: totalMiles != null ? totalMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: '#10b981' },
            { label: 'TOTAL SPENT', value: totalSpent != null ? `$${totalSpent.toFixed(2)}` : '—', color: '#818cf8' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs + Admin ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {[['fillups', 'FILL-UPS'], ['history', 'HISTORY']].map(([id, label]) => (
            <button key={id} className="tab-btn" onClick={() => setActiveTab(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: '11px', letterSpacing: '0.1em',
              color: activeTab === id ? '#f59e0b' : '#6b7280',
              borderBottom: activeTab === id ? '2px solid #f59e0b' : '2px solid transparent',
              fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>
        {isAdmin ? (
          <button onClick={() => { setIsAdmin(false); sessionStorage.clear() }} style={{
            background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer',
          }}>ADMIN ✓ (logout)</button>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{
            background: 'none', border: '1px solid #2a2a35', color: '#4b5563',
            padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer',
          }}>ADMIN LOGIN</button>
        )}
      </div>

      {/* ── Page Content ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center', padding: '48px' }}>Loading...</div>

        ) : activeTab === 'fillups' ? (
          <>
            {/* Vehicles panel — always visible on fill-ups tab */}
            <VehiclesPanel
              vehicles={vehicles}
              logs={logs}
              isAdmin={isAdmin}
              onAdd={handleAddVehicle}
              onRename={handleRenameVehicle}
              onDelete={handleDeleteVehicle}
            />

            {/* Empty state */}
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>⛽</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#e2e8f0', letterSpacing: '0.1em' }}>
                  NO FILL-UPS LOGGED YET
                </div>
                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', letterSpacing: '0.05em' }}>
                  Track every fill-up to see MPG trends and fuel costs
                </div>
                {isAdmin && (
                  <button onClick={() => setShowAdd(true)} style={{
                    marginTop: '20px', background: '#f59e0b', color: '#0d0d0f', border: 'none',
                    borderRadius: '4px', padding: '10px 24px', fontSize: '11px', fontFamily: 'inherit',
                    fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                  }}>ADD FIRST FILL-UP</button>
                )}
              </div>
            ) : (
              <>
                {/* MPG Trend Chart */}
                {chartData.length >= 2 && (
                  <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '16px 16px 8px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em', marginBottom: '12px' }}>
                      MPG TREND — LAST {chartData.length} FILL-UPS
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <XAxis dataKey="date" tick={{ fill: '#3a3a45', fontSize: 9, fontFamily: 'inherit' }} tickFormatter={fmtDate} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#3a3a45', fontSize: 9, fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="mpg" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5, fill: '#f59e0b' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent 5 fill-ups */}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '12px' }}>
                  RECENT FILL-UPS
                </div>
                <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 80px 70px 80px 1fr', gap: 0, padding: '8px 14px', borderBottom: '1px solid #1e1e28' }}>
                    {['DATE', 'VEHICLE', 'ODOMETER', 'GALLONS', 'MPG', 'COST', 'LOCATION'].map(h => (
                      <div key={h} style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>{h}</div>
                    ))}
                  </div>
                  {displayLogs.slice(0, 5).map((log, i) => (
                    <div key={log.id} className="task-row" style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr 110px 80px 70px 80px 1fr',
                      gap: 0, padding: '9px 14px',
                      borderBottom: i < Math.min(displayLogs.length, 5) - 1 ? '1px solid #1e1e28' : 'none',
                      background: 'transparent',
                    }}>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{fmtDate(log.date)}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.vehicle || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{log.odometer?.toLocaleString()} mi</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(log.fuel_amount, 3)} gal</div>
                      <div style={{ fontSize: '11px', color: log.mpg ? '#f59e0b' : '#4b5563' }}>
                        {log.mpg ? fmt(log.mpg) : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: log.fuel_cost != null ? '#818cf8' : '#4b5563' }}>
                        {log.fuel_cost != null ? `$${log.fuel_cost.toFixed(2)}` : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.location || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>

        ) : (
          /* ── HISTORY TAB ────────────────────────────────────────────────────── */
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Vehicle filter — independent from stats filter */}
              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', alignSelf: 'center' }}>VEHICLE</div>
              <select value={historyVehicleFilter} onChange={e => setHistoryVehicleFilter(e.target.value)}
                style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                {vehicleOptions.map(v => <option key={v}>{v}</option>)}
              </select>

              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', alignSelf: 'center' }}>DATE</div>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                {DATE_FILTERS.map(f => <option key={f}>{f}</option>)}
              </select>

              <span style={{ fontSize: '10px', color: '#4b5563', marginLeft: '4px' }}>
                {historyLogs.length} {historyLogs.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 80px 60px 80px 70px 1fr auto', gap: 0, padding: '8px 14px', borderBottom: '1px solid #1e1e28' }}>
                {['DATE', 'VEHICLE', 'ODOMETER', 'GALLONS', 'MPG', 'COST', '$/GAL', 'LOCATION', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>

              {historyLogs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>
                  No entries for selected filters
                </div>
              ) : historyLogs.map((log, i) => (
                <div key={log.id} className="task-row" style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 110px 80px 60px 80px 70px 1fr auto',
                  gap: 0, padding: '9px 14px', alignItems: 'center',
                  borderBottom: i < historyLogs.length - 1 ? '1px solid #1e1e28' : 'none',
                  background: 'transparent',
                }}>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{fmtDate(log.date)}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.vehicle || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{log.odometer?.toLocaleString()} mi</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(log.fuel_amount, 3)}</div>
                  <div style={{ fontSize: '11px', color: log.mpg ? '#f59e0b' : '#4b5563' }}>
                    {log.mpg ? fmt(log.mpg) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: log.fuel_cost != null ? '#818cf8' : '#4b5563' }}>
                    {log.fuel_cost != null ? `$${log.fuel_cost.toFixed(2)}` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {log.price_per_gal != null ? `$${fmt(log.price_per_gal, 3)}` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.location || '—'}
                  </div>
                  {isAdmin ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button className="del-btn" onClick={() => setEditEntry(log)}>EDIT</button>
                      {confirmDelete === log.id ? (
                        <span style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '10px' }}>
                          <button className="del-btn" onClick={() => handleDelete(log.id)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>YES</button>
                          <button className="del-btn" onClick={() => setConfirmDelete(null)}>NO</button>
                        </span>
                      ) : (
                        <button className="del-btn" onClick={() => setConfirmDelete(log.id)}>DEL</button>
                      )}
                    </div>
                  ) : <div />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB — add fill-up (admin + has logs) */}
      {isAdmin && logs.length > 0 && (
        <button className="fab" onClick={() => setShowAdd(true)} style={{
          position: 'fixed', bottom: '28px', right: '28px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: '#f59e0b', color: '#0d0d0f', border: 'none',
          fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      )}

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={handleAdminSuccess} />}
      {showAdd && <FillUpModal vehicles={vehicles} onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {editEntry && <FillUpModal entry={editEntry} vehicles={vehicles} onClose={() => setEditEntry(null)} onSave={handleSave} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
