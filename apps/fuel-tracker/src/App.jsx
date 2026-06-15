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
  display: 'block', fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)',
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
      borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '11px',
      fontWeight: 500, animation: 'toastIn 0.2s ease', letterSpacing: '0.04em',
    }}>
      ✓ {message}
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
      } else setError('Invalid password')
    } catch { setError('Connection error') }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '320px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--rust)', marginBottom: '18px' }}>Admin Login</div>
        <label style={labelStyle}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle()} autoFocus />
        {error && <div style={{ color: 'var(--rust)', fontFamily: "'DM Mono', monospace", fontSize: '11px', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handleLogin} disabled={loading} style={{ flex: 1, background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Checking...' : 'Login'}</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
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
    if (vehicles.some(v => v.id !== vehicle.id && v.name === trimmed)) { setError('A vehicle with that name already exists'); return }
    onSave(vehicle.id, vehicle.name, trimmed)
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '360px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '18px' }}>Rename Vehicle</div>
        <label style={labelStyle}>Vehicle Name</label>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} style={inputStyle()} autoFocus />
        {error && <div style={{ color: 'var(--rust)', fontSize: '11px', marginTop: '6px', fontFamily: "'DM Mono', monospace" }}>{error}</div>}
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
          <div style={{ color: 'var(--rust)', fontSize: '11px', background: 'rgba(204,74,15,0.08)', border: '1px solid rgba(204,74,15,0.3)', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', fontFamily: "'DM Mono', monospace" }}>
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
    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '6px', padding: '8px 12px', fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>
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
  const [form, setForm] = useState({
    year: vehicle?.year ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    trim: vehicle?.trim_level ?? '',
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
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '4px' }}>Name Preview</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '15px', color: 'var(--d-text)' }}>
                {composedName}
                {form.color && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · {form.color}</span>}
                {form.originalMileage && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · orig {parseInt(form.originalMileage).toLocaleString()} mi</span>}
                {form.mileage && <span style={{ color: 'var(--d-sub)', fontWeight: 400, fontSize: '13px' }}> · cur {parseInt(form.mileage).toLocaleString()} mi</span>}
              </div>
            </div>
          )}
          {error && <div style={{ color: 'var(--rust)', fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>{error}</div>}
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
          return (
            <div key={v.id} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--d-text)' }}>{v.name}</div>
                  {(v.make || v.model || v.trim_level) && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-sub)', marginTop: '2px', letterSpacing: '0.06em' }}>
                      {[v.make, v.model, v.trim_level].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => setEditingVehicle(v)} title="Edit" className="vehicle-icon-btn" style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', cursor: 'pointer', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>✏ Edit</button>
                    <button onClick={() => setDeletingVehicle(v)} title="Remove" className="vehicle-icon-btn" style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', cursor: 'pointer', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>× Del</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                {v.color && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🎨 {v.color}</span>}
                {v.current_mileage && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ODO {Number(v.current_mileage).toLocaleString()} mi</span>}
              </div>
              {lastFillup && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--d-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>Last Fill-Up</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--green)' }}>{fmtDate(lastFillup)}</span>
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
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('adminSession') === 'true')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPass') || '')
  const [showLogin, setShowLogin] = useState(false)
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

  useEffect(() => { Promise.all([fetchLogs(), fetchVehicles()]) }, [fetchLogs, fetchVehicles])

  const callFn = async (fnName, payload) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, ...payload }),
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
    const result = await callFn('fuel-vehicle-update', { id, oldName, ...fields })
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

  const handleAdminSuccess = (pass) => {
    setIsAdmin(true); setAdminPassword(pass); setShowLogin(false); showToast('Admin access granted')
  }

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

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", background: 'var(--d-bg)', minHeight: '100vh', color: 'var(--d-text)', paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --rust: #CC4A0F; --amber: #E8943A; --amber-text: #8B5A00;
          --green: #34D399; --green-text: #166B52; --purple: #818CF8; --purple-text: #4A50C4;
          --d-bg: #1A1714; --d-surf: #242120; --d-card: #2C2926; --d-border: #3D3530;
          --d-text: #F0EBE1; --d-muted: #D9D0C1; --d-sub: #9E9894; --d-faint: #857F7A;
          --l-bg: #F4EFE6; --l-surf: #EDE7DC; --l-card: #E8E1D4; --l-border: #CFC6B8;
          --l-text: #1E1A17; --l-muted: #3D3530; --l-sub: #6F6358; --l-faint: #6B5C53;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--d-surf); }
        ::-webkit-scrollbar-thumb { background: var(--d-border); border-radius: 3px; }
        input, select, textarea { outline: none; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .vehicle-icon-btn:hover { color: var(--d-muted) !important; }
        .add-vehicle-btn:hover { border-color: var(--rust) !important; color: var(--rust) !important; }
        .chip-scroll::-webkit-scrollbar { display: none; }
        [data-theme="light"] {
          --d-bg: var(--l-bg); --d-surf: var(--l-surf); --d-card: var(--l-card); --d-border: var(--l-border);
          --d-text: var(--l-text); --d-muted: var(--l-muted); --d-sub: var(--l-sub); --d-faint: var(--l-faint);
        }
      `}</style>

      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <Nav activeApp="fuel" dashboardUrl={DASHBOARD_URL} fuelUrl={FUEL_URL} />

        {/* Stats hero card */}
        <div style={{ margin: '16px 20px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '16px' }}>
          {/* vehicle filter + admin/refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)' }}>Stats</span>
            <select value={statsVehicleFilter} onChange={e => setStatsVehicleFilter(e.target.value)} style={{ background: 'var(--d-surf)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '3px 8px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>
              {vehicleOptions.map(v => <option key={v}>{v}</option>)}
            </select>
            <button onClick={handleRefresh} style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>↻</button>
            {isAdmin ? (
              <button onClick={() => { setIsAdmin(false); sessionStorage.clear() }} style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--green)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>Admin ✓</button>
            ) : (
              <button onClick={() => setShowLogin(true)} style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>Login</button>
            )}
          </div>

          {/* Stat row */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--d-border)' }}>
            {[
              { label: 'Fill-ups', value: statsLogs.length, color: 'var(--d-muted)' },
              { label: 'Avg MPG', value: statsLogs.length >= 2 ? fmt(avgMpg) : '—', color: 'var(--amber)', suffix: statsLogs.length >= 2 ? ' mpg' : '' },
              { label: 'Miles', value: totalMiles != null ? totalMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: 'var(--green)' },
              { label: 'Spent', value: totalSpent != null ? `$${totalSpent.toFixed(0)}` : '—', color: 'var(--purple)' },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', paddingTop: '10px', borderLeft: i > 0 ? '1px solid var(--d-border)' : 'none' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Page content */}
        <div style={{ paddingBottom: '96px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px' }}>
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
                        {(v.make || v.model || v.trim_level) && (
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-sub)', marginTop: '2px', letterSpacing: '0.06em' }}>
                            {[v.make, v.model, v.trim_level].filter(Boolean).join(' · ')}
                          </div>
                        )}
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
                        {lastFillup && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>Last Fill-Up</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-sub)' }}>{fmtDate(lastFillup)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {logs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)' }}>No fill-up data yet — record your first fill-up in the Fill-Ups tab</div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'fillups' ? (
            <>
              {/* Filter row */}
              <div className="chip-scroll" style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '0 20px 10px', WebkitOverflowScrolling: 'touch', alignItems: 'center' }}>
                <select value={historyVehicleFilter} onChange={e => setHistoryVehicleFilter(e.target.value)} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '6px 10px', borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer', flexShrink: 0 }}>
                  {vehicleOptions.map(v => <option key={v}>{v}</option>)}
                </select>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '6px 10px', borderRadius: '8px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer', flexShrink: 0 }}>
                  {DATE_FILTERS.map(f => <option key={f}>{f}</option>)}
                </select>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-faint)', whiteSpace: 'nowrap' }}>{historyLogs.length} {historyLogs.length === 1 ? 'entry' : 'entries'}</span>
              </div>

              {/* Fill-up card list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '0 20px' }}>
                {historyLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛽</div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Fill-ups Yet</div>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-faint)', marginTop: '8px' }}>Use the + button to record your first fill-up</div>
                  </div>
                ) : historyLogs.map(log => (
                  <div key={log.id} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--d-text)' }}>{log.vehicle || '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--d-faint)' }}>{fmtDate(log.date)}</span>
                        {isAdmin && (
                          confirmDelete === log.id ? (
                            <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <button onClick={() => handleDelete(log.id)} style={{ background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', cursor: 'pointer' }}>Yes</button>
                              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '8px', cursor: 'pointer' }}>No</button>
                            </span>
                          ) : (
                            <span style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => setEditEntry(log)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => setConfirmDelete(log.id)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '5px', padding: '3px 8px', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', cursor: 'pointer' }}>Del</button>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: log.mpg ? 'var(--amber)' : 'var(--d-faint)' }}>{log.mpg ? fmt(log.mpg) : '—'}</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)', marginLeft: '3px' }}>mpg</span></div>
                      <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--d-muted)' }}>{fmt(log.fuel_amount, 3)}</span><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)', marginLeft: '3px' }}>gal</span></div>
                      {log.fuel_cost != null && <div><span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--purple)' }}>${log.fuel_cost.toFixed(2)}</span></div>}
                      {log.price_per_gal != null && <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>${fmt(log.price_per_gal, 3)}/gal</span></div>}
                      <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>{log.odometer?.toLocaleString()} mi</span></div>
                      {log.fuel_grade && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: gradeColor(log.fuel_grade) }}>{log.fuel_grade}</span>}
                    </div>
                    {log.location && <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-faint)' }}>{log.location}</div>}
                    {log.notes && <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-faint)', marginTop: '2px' }}>{log.notes}</div>}
                  </div>
                ))}
              </div>
            </>
          ) : activeTab === 'garage' ? (
            <div style={{ padding: '0 0 8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', padding: '4px 20px 12px' }}>My Garage</div>
              <VehiclesPanel vehicles={vehicles} logs={logs} isAdmin={isAdmin} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
              {!isAdmin && vehicles.length > 0 && (
                <div style={{ margin: '0 20px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>
                  Login as admin to add or manage vehicles
                </div>
              )}
              {vehicles.length === 0 && !isAdmin && (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚗</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Vehicles Yet</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '0 20px 8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginBottom: '14px' }}>Stats</div>

              {logs.length < 2 ? (
                <div style={{ textAlign: 'center', padding: '40px', fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-faint)' }}>Record at least 2 fill-ups to see charts</div>
              ) : (
                <>
                  {/* MPG trend line */}
                  {chartData.length >= 2 && (
                    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px 8px', marginBottom: '10px' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>MPG Trend</div>
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

                  {/* Avg MPG by vehicle */}
                  {mpgByVehicle.length > 0 && (
                    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Average MPG by Vehicle</div>
                      <ResponsiveContainer width="100%" height={mpgByVehicle.length * 36 + 10}>
                        <BarChart data={mpgByVehicle} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 80 }}>
                          <XAxis type="number" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#9E9894', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip formatter={v => [`${v} mpg`, 'Avg MPG']} contentStyle={{ background: '#2C2926', border: '1px solid #3D3530', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#D9D0C1' }} />
                          <Bar dataKey="mpg" fill="#E8943A" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Monthly spend */}
                  {monthlySpendData.length > 1 && (
                    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Monthly Fuel Spend</div>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={monthlySpendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                          <XAxis dataKey="month" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `$${v}`} />
                          <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Spent']} contentStyle={{ background: '#2C2926', border: '1px solid #3D3530', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#D9D0C1' }} />
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

        {/* FAB — fill-ups tab and garage tab, admin only */}
        {isAdmin && (activeTab === 'fillups' || activeTab === 'garage') && (
          <div style={{ position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', pointerEvents: 'none', zIndex: 90 }}>
            <button
              onClick={() => activeTab === 'fillups' ? setShowAdd(true) : setShowAddVehicle(true)}
              style={{ position: 'absolute', right: '16px', bottom: '0', width: '56px', height: '56px', borderRadius: '16px', background: 'var(--rust)', color: '#fff', border: 'none', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(204,74,15,0.5)', cursor: 'pointer', pointerEvents: 'all' }}
            >+</button>
          </div>
        )}

        {/* Bottom navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '76px', background: 'var(--d-surf)', borderTop: '1px solid var(--d-border)', display: 'flex', alignItems: 'stretch', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
          {NAV_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: activeTab === tab.id ? 1 : 0.35 }}>
              <span style={{ fontSize: '17px' }}>{tab.icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: activeTab === tab.id ? 'var(--rust)' : 'var(--d-sub)' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={handleAdminSuccess} />}
      {showAddVehicle && <VehicleFormModal vehicles={vehicles} onClose={() => setShowAddVehicle(false)} onSave={async fields => { await handleAddVehicle(fields); setShowAddVehicle(false) }} />}
      {showAdd && <FillUpModal vehicles={vehicles} onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {editEntry && <FillUpModal entry={editEntry} vehicles={vehicles} onClose={() => setEditEntry(null)} onSave={handleSave} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
