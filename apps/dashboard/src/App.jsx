import { useState, useEffect, useCallback, useRef } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from './supabase.js'
import Nav from './Nav.jsx'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUEL_URL = import.meta.env.VITE_FUEL_URL || '#'

const DEFAULT_TASKS = [
  { category: 'Engine & Drivetrain', service: '📋 Engine History / Mileage Note', priority: 'High', status: 'In Progress', cost: '', notes: 'Odometer reads 73k miles. Engine was replaced with a unit that has 67k miles on it.' },
  { category: 'Engine & Drivetrain', service: 'Replace spark plugs & ignition coils', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Inspect/replace timing chain & tensioner', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Check engine mounts for wear/cracking', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Inspect drive belts (serpentine/aux)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Check for oil leaks (valve cover, rear main seal)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Replace air filter & clean intake', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', service: 'Install fuel injector kit', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', service: 'Replace high pressure fuel pump (HPFP)', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', service: 'Replace fuel rail pressure sensor', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', service: 'Install oil catch can(s)', priority: 'Medium', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Fluids & Filters', service: 'Full synthetic oil change', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', service: 'Flush & replace coolant', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', service: 'Brake fluid flush', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', service: 'Power steering fluid check/top-off', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', service: 'Replace fuel filter', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', service: 'Transmission fluid check/change', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: 'Inspect brake pads & rotors (all 4 corners)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: 'Check calipers for sticking/leaking', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: 'Inspect control arms & bushings', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: 'Check shocks/struts for leaking', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: 'Inspect wheel bearings', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', service: '4-wheel alignment', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Tires & Wheels', service: 'Inspect tires for wear/cracking', priority: 'High', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Tires & Wheels', service: 'Check & set tire pressure', priority: 'Low', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Tires & Wheels', service: 'Rotate tires', priority: 'Low', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Electrical & Battery', service: 'Test/replace battery (likely due at 15yr)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', service: 'Inspect alternator output', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', service: 'Check all exterior lights (bulbs, lenses)', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', service: 'Test power windows, locks & mirrors', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', service: 'Scan for stored OBD-II fault codes', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Convertible Top', service: 'Inspect convertible top fabric for tears/seams', priority: 'High', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', service: 'Test hydraulic top mechanism (full open/close cycle)', priority: 'High', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', service: 'Check hydraulic fluid level for top pump', priority: 'Medium', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', service: 'Inspect & lubricate latches and weatherstripping', priority: 'Medium', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', service: 'Clean & condition top fabric', priority: 'Low', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Interior', service: 'Deep clean & condition leather/seats', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', service: 'Inspect carpets & floor mats for moisture/mold', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', service: 'Check HVAC (A/C, heat, blower motor)', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', service: 'Test infotainment/radio & speakers', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', service: 'Install new infotainment head unit', priority: 'Medium', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Exterior & Body', service: 'Full paint inspection — chips, rust spots', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', service: 'Inspect undercarriage for rust/corrosion', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', service: 'Clean & treat door jambs and hinges', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', service: 'Machine polish & ceramic coat or wax', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
]

const CATEGORIES = ['Engine & Drivetrain', 'Fluids & Filters', 'Brakes & Suspension', 'Tires & Wheels', 'Electrical & Battery', 'Convertible Top', 'Interior', 'Exterior & Body']
const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Not Started', 'In Progress', 'Done']

// Hex values aligned to CSS variable palette — used in template literals for bg opacity
const STATUS_COLOR = { 'Not Started': '#3D3530', 'In Progress': '#E8943A', 'Done': '#34D399' }
const PRIORITY_COLOR = { 'High': '#CC4A0F', 'Medium': '#E8943A', 'Low': '#9E9894' }
const CAT_ICONS = {
  'Engine & Drivetrain': '⚙️', 'Fluids & Filters': '🛢️', 'Brakes & Suspension': '🔧',
  'Tires & Wheels': '🛞', 'Electrical & Battery': '⚡', 'Convertible Top': '🔄',
  'Interior': '🪑', 'Exterior & Body': '🚗',
}

const CSV_TEMPLATE = 'service,category,priority,status,cost,notes,vehicle\nReplace coolant expansion tank,Engine & Drivetrain,High,Not Started,45,Plastic tanks crack with age,2009 Mini Cooper S\nInspect brake booster vacuum hose,Brakes & Suspension,Medium,Not Started,15,Common source of hard brake pedal,2009 Mini Cooper S'

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

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

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [], error: 'File must have a header row and at least one data row.' }
  const parseRow = (line) => {
    const result = []; let cur = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).filter(l => l.trim()).map(l => parseRow(l))
  return { headers, rows }
}

function normalizeRows(headers, rawRows) {
  const serviceIdx = headers.indexOf('service'), catIdx = headers.indexOf('category')
  const priIdx = headers.indexOf('priority'), statusIdx = headers.indexOf('status')
  const costIdx = headers.indexOf('cost'), notesIdx = headers.indexOf('notes')
  const vehicleIdx = headers.indexOf('vehicle')
  const errors = []
  if (serviceIdx === -1) errors.push('Missing required column: service')
  if (catIdx === -1) errors.push('Missing required column: category')
  if (errors.length) return { rows: [], errors }
  const normalized = []
  rawRows.forEach((cols, i) => {
    const rowNum = i + 2
    const service = cols[serviceIdx] || '', category = cols[catIdx] || ''
    if (!service.trim()) { errors.push(`Row ${rowNum}: missing service name — skipped`); return }
    if (!category.trim()) { errors.push(`Row ${rowNum}: missing category — skipped`); return }
    const rawPriority = priIdx >= 0 ? (cols[priIdx] || '') : ''
    const priority = PRIORITIES.includes(rawPriority) ? rawPriority : 'Medium'
    const rawStatus = statusIdx >= 0 ? (cols[statusIdx] || '') : ''
    const status = STATUSES.includes(rawStatus) ? rawStatus : 'Not Started'
    const rawCost = costIdx >= 0 ? (cols[costIdx] || '') : ''
    const cost = rawCost && !isNaN(parseFloat(rawCost)) ? rawCost : ''
    const notes = notesIdx >= 0 ? (cols[notesIdx] || '') : ''
    const vehicle = vehicleIdx >= 0 ? (cols[vehicleIdx] || '') : ''
    normalized.push({
      service: service.trim(), category: category.trim(), priority, status, cost,
      notes: notes.trim(), vehicle: vehicle.trim() || null,
      _warnings: [
        !PRIORITIES.includes(rawPriority) && rawPriority ? `priority "${rawPriority}" → defaulted to Medium` : null,
        !STATUSES.includes(rawStatus) && rawStatus ? `status "${rawStatus}" → defaulted to Not Started` : null,
      ].filter(Boolean),
    })
  })
  return { rows: normalized, errors }
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) { sessionStorage.setItem('adminSession', 'true'); sessionStorage.setItem('adminPass', password); onSuccess(password) }
      else setError('Invalid password')
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
          <button onClick={handleLogin} disabled={loading} style={{
            flex: 1, background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px',
            padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}>{loading ? 'Checking...' : 'Login'}</button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)',
            borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer',
          }}>Cancel</button>
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
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-sub)', marginTop: '10px', lineHeight: 1.5 }}>All existing services assigned to this vehicle will be updated to the new name.</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handle} style={{ flex: 1, background: 'var(--amber)', color: '#1A1714', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Save &amp; Update</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Vehicle Modal ─────────────────────────────────────────────────────
function DeleteVehicleModal({ vehicle, taskCount, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '360px' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: '16px' }}>Delete Vehicle</div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '14px', color: 'var(--d-text)', marginBottom: '10px' }}>
          Remove <strong style={{ color: 'var(--amber)' }}>{vehicle.name}</strong> from your vehicle list?
        </div>
        {taskCount > 0 ? (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-sub)', background: 'var(--d-surf)', border: '1px solid var(--d-border)', borderRadius: '7px', padding: '10px 12px', lineHeight: 1.6 }}>
            This vehicle has <strong style={{ color: 'var(--amber)' }}>{taskCount} {taskCount === 1 ? 'service' : 'services'}</strong> assigned. Those services will be kept — only the vehicle name is removed from the list.
          </div>
        ) : (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'var(--d-sub)' }}>This vehicle has no services assigned.</div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button onClick={onConfirm} style={{ flex: 1, background: 'rgba(204,74,15,0.1)', border: '1px solid var(--rust)', color: 'var(--rust)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Confirm Delete</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
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
function VehiclesPanel({ vehicles, tasks, isAdmin, onEdit, onDelete }) {
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const taskCount = (vehicleName) => tasks.filter(t => t.vehicle === vehicleName).length
  const lastService = (vehicleName) => {
    const vTasks = tasks.filter(t => t.vehicle === vehicleName && t.service_date)
    if (!vTasks.length) return null
    return vTasks.sort((a, b) => b.service_date.localeCompare(a.service_date))[0]
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
          const svc = lastService(v.name)
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
              {svc && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--d-border)' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)', marginBottom: '3px' }}>Last Service</div>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-muted)' }}>{svc.service}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--green)', marginTop: '2px' }}>{fmtDate(svc.service_date)}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {editingVehicle && <VehicleFormModal vehicle={editingVehicle} vehicles={vehicles} onClose={() => setEditingVehicle(null)} onSave={async (fields) => { await onEdit(editingVehicle.id, editingVehicle.name, fields); setEditingVehicle(null) }} />}
      {deletingVehicle && <DeleteVehicleModal vehicle={deletingVehicle} taskCount={taskCount(deletingVehicle.name)} onClose={() => setDeletingVehicle(null)} onConfirm={() => { onDelete(deletingVehicle.id, deletingVehicle.name); setDeletingVehicle(null) }} />}
    </>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, vehicles, onClose, onSave }) {
  const [form, setForm] = useState(task || { category: CATEGORIES[0], service: '', priority: 'Medium', status: 'Not Started', cost: '', notes: '', vehicle: '', service_date: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '20px' }}>{task ? 'Edit Service' : 'Add Service'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label style={labelStyle}>Vehicle</label>
            <select value={form.vehicle || ''} onChange={e => set('vehicle', e.target.value || null)} style={selectStyle()}>
              <option value="">— No vehicle —</option>
              {vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={selectStyle()}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Description *</label>
            <input value={form.service} onChange={e => set('service', e.target.value)} style={inputStyle()} placeholder="Describe the service..." />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={selectStyle()}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle()}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Service Date</label>
            <input type="date" value={form.service_date || ''} onChange={e => set('service_date', e.target.value || null)} style={inputStyle()} />
          </div>
          <div><label style={labelStyle}>Estimated Cost ($)</label>
            <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} style={inputStyle()} placeholder="0" />
          </div>
          <div><label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inputStyle(), resize: 'vertical' }} placeholder="Part numbers, shop quotes, details..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} style={{ flex: 1, background: 'var(--amber)', color: '#1A1714', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>{task ? 'Save Changes' : 'Add Service'}</button>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onUpload }) {
  const [stage, setStage] = useState('drop')
  const [dragging, setDragging] = useState(false)
  const [parseErrors, setParseErrors] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tasks-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const processFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') { setParseErrors(['File must be a .csv file.']); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const { headers, rows, error } = parseCSV(e.target.result)
      if (error) { setParseErrors([error]); return }
      const { rows: normalized, errors } = normalizeRows(headers, rows)
      setParseErrors(errors); setPreviewRows(normalized)
      if (normalized.length > 0) setStage('preview')
    }
    reader.readAsText(file)
  }

  const handleConfirm = async () => {
    setStage('uploading'); setUploadError('')
    const rows = previewRows.map(({ _warnings, ...r }) => r)
    try {
      const result = await onUpload(rows)
      if (result.ok) { setUploadCount(result.count ?? rows.length); setStage('done') }
      else { setUploadError(result.error?.message || 'Upload failed.'); setStage('preview') }
    } catch { setUploadError('Network error — upload failed.'); setStage('preview') }
  }

  const reset = () => { setStage('drop'); setPreviewRows([]); setParseErrors([]); setUploadError('') }
  const allWarnings = previewRows.flatMap(r => r._warnings || [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '24px 28px', width: '680px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--amber)' }}>Bulk Upload Services</div>
          <button onClick={downloadTemplate} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', padding: '4px 10px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer' }}>↓ Template</button>
        </div>

        {stage === 'drop' && (
          <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? 'var(--rust)' : 'var(--d-border)'}`, borderRadius: '10px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(204,74,15,0.04)' : 'var(--d-surf)', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--d-muted)', letterSpacing: '0.06em' }}>Drop CSV file here</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)', marginTop: '6px' }}>or click to browse</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e => { processFile(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />
          </div>
        )}

        {parseErrors.length > 0 && stage !== 'done' && (
          <div style={{ background: 'rgba(204,74,15,0.08)', border: '1px solid rgba(204,74,15,0.3)', borderRadius: '7px', padding: '10px 14px' }}>
            {parseErrors.map((e, i) => <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--rust)', marginBottom: '2px' }}>• {e}</div>)}
          </div>
        )}

        {allWarnings.length > 0 && stage === 'preview' && (
          <div style={{ background: 'rgba(232,148,58,0.08)', border: '1px solid rgba(232,148,58,0.3)', borderRadius: '7px', padding: '10px 14px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--amber)', marginBottom: '5px' }}>Warnings — values defaulted</div>
            {allWarnings.map((w, i) => <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--amber)', marginBottom: '2px' }}>• {w}</div>)}
          </div>
        )}

        {uploadError && <div style={{ background: 'rgba(204,74,15,0.08)', border: '1px solid rgba(204,74,15,0.3)', borderRadius: '7px', padding: '10px 14px' }}><div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--rust)' }}>⚠ {uploadError}</div></div>}

        {stage === 'preview' && previewRows.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)', marginBottom: '8px' }}>Preview — {previewRows.length} {previewRows.length === 1 ? 'service' : 'services'} ready</div>
            <div style={{ background: 'var(--d-surf)', border: '1px solid var(--d-border)', borderRadius: '7px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 70px 90px 60px', padding: '7px 12px', borderBottom: '1px solid var(--d-border)' }}>
                {['Service', 'Category', 'Vehicle', 'Priority', 'Status', 'Cost'].map(h => <div key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>{h}</div>)}
              </div>
              {previewRows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 70px 90px 60px', padding: '7px 12px', borderBottom: i < previewRows.length - 1 ? '1px solid var(--d-border)' : 'none', background: row._warnings?.length ? 'rgba(232,148,58,0.04)' : 'transparent' }}>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-text)', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.service}</div>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: 'var(--d-muted)', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.category}</div>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '12px', color: row.vehicle ? 'var(--d-text)' : 'var(--d-faint)', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.vehicle || '—'}</div>
                  <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: PRIORITY_COLOR[row.priority] + '22', color: PRIORITY_COLOR[row.priority] }}>{row.priority}</span></div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: STATUS_COLOR[row.status] }}>{row.status}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: row.cost ? 'var(--purple)' : 'var(--d-faint)' }}>{row.cost ? `$${row.cost}` : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'uploading' && <div style={{ textAlign: 'center', padding: '32px', fontFamily: "'Barlow', sans-serif", color: 'var(--d-sub)', fontSize: '14px' }}>Uploading {previewRows.length} services...</div>}
        {stage === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--green)' }}>{uploadCount} {uploadCount === 1 ? 'Service' : 'Services'} Added</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {stage === 'preview' && <>
            <button onClick={handleConfirm} style={{ flex: 1, background: 'var(--amber)', color: '#1A1714', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Import {previewRows.length} {previewRows.length === 1 ? 'Service' : 'Services'}</button>
            <button onClick={reset} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px 16px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Back</button>
          </>}
          {stage === 'done' && <button onClick={onClose} style={{ flex: 1, background: 'var(--green)', color: '#1A1714', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Done</button>}
          {(stage === 'drop' || stage === 'uploading') && <button onClick={onClose} disabled={stage === 'uploading'} style={{ flex: 1, background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '9px', fontFamily: "'DM Mono', monospace", fontSize: '10px', textTransform: 'uppercase', cursor: stage === 'uploading' ? 'default' : 'pointer' }}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ category: 'All', status: 'All', priority: 'All' })
  const [vehicleFilter, setVehicleFilter] = useState('All')
  const [expandedTask, setExpandedTask] = useState(null)
  const [activeTab, setActiveTab] = useState('service')
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('adminSession') === 'true')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPass') || '')
  const [showLogin, setShowLogin] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const showToast = (msg) => setToast(msg)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('*').order('id')
    if (!error) setTasks(data || [])
    setLoading(false)
  }, [])

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').order('name')
    setVehicles(data || [])
  }, [])

  useEffect(() => { Promise.all([fetchTasks(), fetchVehicles()]) }, [fetchTasks, fetchVehicles])

  useEffect(() => {
    const channel = supabase.channel('services-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  const callFn = async (fnName, payload) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, ...payload }),
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch {
      console.error(`[callFn] ${fnName} returned non-JSON (${res.status}):`, text)
      return { ok: false, error: { message: `Server error (${res.status})` } }
    }
  }

  const handleAddVehicle = async (fields) => {
    const result = await callFn('admin-vehicle-insert', fields)
    if (result.ok) { showToast(`Vehicle "${fields.name}" added`); fetchVehicles() }
    else showToast(result.error?.message || 'Failed to add vehicle')
  }
  const handleEditVehicle = async (id, oldName, fields) => {
    const { name, ...rest } = fields
    const result = await callFn('admin-vehicle-update', { id, oldName, newName: name, ...rest })
    if (result.ok) {
      const renamed = fields.name !== oldName
      showToast(renamed ? `Updated & renamed → "${fields.name}" (${result.updatedTasks ?? 0} services updated)` : `Vehicle "${fields.name}" updated`)
      fetchVehicles(); if (renamed) fetchTasks()
    } else showToast(result.error?.message || 'Update failed')
  }
  const handleDeleteVehicle = async (id, name) => {
    const result = await callFn('admin-vehicle-delete', { id })
    if (result.ok) { showToast(`Vehicle "${name}" removed`); fetchVehicles() }
    else showToast('Delete failed')
  }

  const handleStatusChange = async (id, status) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await callFn('admin-update', { id, fields: { status } })
  }
  const handleFieldChange = async (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
    const debounceKey = `debounce_${id}_${field}`
    clearTimeout(window[debounceKey])
    window[debounceKey] = setTimeout(() => callFn('admin-update', { id, fields: { [field]: value } }), 800)
  }
  const handleAddTask = async (form) => {
    if (!form.service.trim()) return
    const data = await callFn('admin-insert', { row: { ...form, vehicle: form.vehicle || null } })
    if (data.ok) { showToast('Service added'); fetchTasks() }
    else showToast('Error: ' + (data.error?.message || data.error || 'could not add service'))
    setShowAddTask(false)
  }
  const handleEditTask = async (form) => {
    const { id, ...fields } = form
    await callFn('admin-update', { id: editingTask.id, fields: { ...fields, vehicle: fields.vehicle || null } })
    showToast('Service updated'); fetchTasks(); setEditingTask(null)
  }
  const handleDelete = async (id) => {
    await callFn('admin-delete', { id })
    showToast('Service deleted'); fetchTasks(); setConfirmDelete(null); setExpandedTask(null)
  }
  const handleBulkUpload = async (rows) => {
    const result = await callFn('admin-bulk-insert', { rows })
    if (result.ok) { fetchTasks(); showToast(`${result.count ?? rows.length} services imported`) }
    return result
  }
  const handleAdminSuccess = (pass) => {
    setIsAdmin(true); setAdminPassword(pass); setShowLogin(false); showToast('Admin access granted')
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const vehicleOptions = ['All', ...vehicles.map(v => v.name)]
  const filteredByVehicle = vehicleFilter === 'All' ? tasks : tasks.filter(t => t.vehicle === vehicleFilter)
  const totalCost = filteredByVehicle.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
  const doneCost = filteredByVehicle.filter(t => t.status === 'Done').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
  const doneCount = filteredByVehicle.filter(t => t.status === 'Done').length
  const inProgressCount = filteredByVehicle.filter(t => t.status === 'In Progress').length
  const highPendingCount = filteredByVehicle.filter(t => t.priority === 'High' && t.status !== 'Done').length
  const remainCount = filteredByVehicle.filter(t => t.status === 'Not Started').length
  const progressPct = filteredByVehicle.length ? Math.round((doneCount / filteredByVehicle.length) * 100) : 0

  const filtered = filteredByVehicle.filter(t =>
    (filter.category === 'All' || t.category === filter.category) &&
    (filter.status === 'All' || t.status === filter.status) &&
    (filter.priority === 'All' || t.priority === filter.priority)
  )
  const grouped = CATEGORIES.reduce((acc, cat) => { acc[cat] = filtered.filter(t => t.category === cat); return acc }, {})

  // Stats tab computed data
  const statusPieData = [
    { name: 'Done', value: doneCount, color: '#34D399' },
    { name: 'In Progress', value: inProgressCount, color: '#E8943A' },
    { name: 'Not Started', value: remainCount, color: '#3D3530' },
  ].filter(d => d.value > 0)

  const catBarData = CATEGORIES.map(cat => {
    const catTasks = filteredByVehicle.filter(t => t.category === cat)
    if (!catTasks.length) return null
    const done = catTasks.filter(t => t.status === 'Done').length
    return { name: cat.split(' & ')[0].split(' ')[0], full: cat, pct: Math.round((done / catTasks.length) * 100) }
  }).filter(Boolean)

  const costBarData = CATEGORIES.map(cat => {
    const cost = filteredByVehicle.filter(t => t.category === cat).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
    if (!cost) return null
    return { name: cat.split(' & ')[0].split(' ')[0], cost: parseFloat(cost.toFixed(0)) }
  }).filter(Boolean).sort((a, b) => b.cost - a.cost)

  // Filter chips
  const CHIPS = [
    { label: 'All', filter: { category: 'All', status: 'All', priority: 'All' } },
    { label: 'High Priority', filter: { category: 'All', status: 'All', priority: 'High' } },
    { label: 'In Progress', filter: { category: 'All', status: 'In Progress', priority: 'All' } },
    { label: 'Not Started', filter: { category: 'All', status: 'Not Started', priority: 'All' } },
    { label: 'Done', filter: { category: 'All', status: 'Done', priority: 'All' } },
    ...CATEGORIES.map(cat => ({ label: `${CAT_ICONS[cat]} ${cat}`, filter: { category: cat, status: 'All', priority: 'All' } })),
  ]
  const activeChipIndex = CHIPS.findIndex(c => c.filter.category === filter.category && c.filter.status === filter.status && c.filter.priority === filter.priority)

  const NAV_TABS = [
    { id: 'garage', icon: '🏎', label: 'Garage' },
    { id: 'service', icon: '📋', label: 'Service' },
    { id: 'summary', icon: '📊', label: 'Summary' },
    { id: 'stats', icon: '⚙️', label: 'Stats' },
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
        input, textarea, select { outline: none; font-family: inherit; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .progress-bar-inner { transition: width 0.5s ease; }
        .expand-row { animation: slideDown 0.15s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .chip-scroll::-webkit-scrollbar { display: none; }
        .vehicle-icon-btn:hover { color: var(--d-muted) !important; }
        .add-vehicle-btn:hover { border-color: var(--rust) !important; color: var(--rust) !important; }
        [data-theme="light"] {
          --d-bg: var(--l-bg); --d-surf: var(--l-surf); --d-card: var(--l-card); --d-border: var(--l-border);
          --d-text: var(--l-text); --d-muted: var(--l-muted); --d-sub: var(--l-sub); --d-faint: var(--l-faint);
        }
      `}</style>

      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <Nav activeApp="dashboard" dashboardUrl="/" fuelUrl={FUEL_URL} />

        {/* Progress Hero Card */}
        <div style={{ margin: '16px 20px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '12px', padding: '16px' }}>
          {/* Vehicle filter */}
          {vehicles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)' }}>Vehicle</span>
              <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} style={{ background: 'var(--d-surf)', border: '1px solid var(--d-border)', color: 'var(--d-muted)', padding: '3px 8px', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', cursor: 'pointer' }}>
                {vehicleOptions.map(v => <option key={v}>{v}</option>)}
              </select>
              {isAdmin ? (
                <button onClick={() => { setIsAdmin(false); sessionStorage.clear() }} style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--green)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>Admin ✓</button>
              ) : (
                <button onClick={() => setShowLogin(true)} style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-faint)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>Login</button>
              )}
            </div>
          )}

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '42px', color: 'var(--amber)', lineHeight: 1 }}>{progressPct}%</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-sub)', marginTop: '2px' }}>Overall Progress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '28px', color: 'var(--rust)', lineHeight: 1 }}>{highPendingCount}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginTop: '2px' }}>High</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '20px', color: 'var(--purple)', lineHeight: 1 }}>${totalCost > 0 ? (totalCost / 1000).toFixed(1) + 'k' : '0'}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginTop: '2px' }}>Est. Spend</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'var(--d-border)', borderRadius: '3px', height: '6px', overflow: 'hidden', marginBottom: '14px' }}>
            <div className="progress-bar-inner" style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--rust), var(--amber))', borderRadius: '3px' }} />
          </div>

          {/* Stat row */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--d-border)' }}>
            {[
              { value: doneCount, label: 'Done', color: 'var(--green)' },
              { value: inProgressCount, label: 'In Prog', color: 'var(--amber)' },
              { value: remainCount, label: 'Remain', color: 'var(--d-sub)' },
              { value: filteredByVehicle.length, label: 'Total', color: 'var(--d-muted)' },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', paddingTop: '10px', borderLeft: i > 0 ? '1px solid var(--d-border)' : 'none' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ paddingBottom: '96px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--d-sub)' }}>Loading services...</div>
          ) : activeTab === 'service' ? (
            <>

              {/* Filter chips */}
              <div className="chip-scroll" style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '0 20px 2px', marginBottom: '14px', WebkitOverflowScrolling: 'touch' }}>
                {CHIPS.map((chip, i) => {
                  const isActive = i === activeChipIndex || (activeChipIndex === -1 && i === 0)
                  return (
                    <button key={chip.label} onClick={() => setFilter(chip.filter)} style={{
                      flexShrink: 0, whiteSpace: 'nowrap', borderRadius: '20px', padding: '6px 12px',
                      border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace",
                      fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
                      background: isActive ? 'rgba(204,74,15,0.15)' : 'var(--d-card)',
                      color: isActive ? 'var(--rust)' : 'var(--d-sub)',
                      outline: isActive ? '1px solid var(--rust)' : '1px solid var(--d-border)',
                    }}>{chip.label}</button>
                  )
                })}
                {isAdmin && (
                  <button onClick={() => setShowBulkUpload(true)} style={{
                    flexShrink: 0, whiteSpace: 'nowrap', borderRadius: '20px', padding: '6px 12px',
                    border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace",
                    fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'var(--d-card)', color: 'var(--d-sub)', outline: '1px solid var(--d-border)',
                  }}>↑ Bulk Upload</button>
                )}
              </div>

              {tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--d-sub)', letterSpacing: '0.06em' }}>No Services Yet</div>
                </div>
              )}

              {filtered.length === 0 && tasks.length > 0 && (
                <div style={{ textAlign: 'center', padding: '32px', fontFamily: "'Barlow', sans-serif", fontSize: '14px', color: 'var(--d-faint)' }}>No services match the current filters</div>
              )}

              {/* Task list */}
              {CATEGORIES.map(cat => {
                const catTasks = grouped[cat]
                if (!catTasks || catTasks.length === 0) return null
                const catDone = catTasks.filter(t => t.status === 'Done').length
                return (
                  <div key={cat} style={{ marginBottom: '16px' }}>
                    {/* Category header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 20px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px' }}>{CAT_ICONS[cat]}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--d-sub)' }}>{cat}</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--d-border)' }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)' }}>{catDone}/{catTasks.length}</span>
                    </div>

                    {catTasks.map(task => {
                      const isExpanded = expandedTask === task.id
                      const accentColor = STATUS_COLOR[task.status]
                      return (
                        <div key={task.id} style={{ margin: '0 20px 7px' }}>
                          {/* Task row */}
                          <div onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'var(--d-card)', border: '1px solid var(--d-border)',
                            borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
                            borderBottom: isExpanded ? 'none' : '1px solid var(--d-border)',
                            cursor: 'pointer', minHeight: '48px', padding: '12px 14px', overflow: 'hidden',
                          }}>
                            <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: accentColor, flexShrink: 0, margin: '-12px 0' }} />
                            <span style={{ flex: 1, fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '14px', color: task.status === 'Done' ? 'var(--d-faint)' : 'var(--d-text)', textDecoration: task.status === 'Done' ? 'line-through' : 'none', minWidth: 0 }}>
                              {task.service}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span style={{
                                fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '4px',
                                background: task.status === 'Not Started' ? 'rgba(157,152,148,0.12)' : task.status === 'In Progress' ? 'rgba(232,148,58,0.15)' : 'rgba(52,211,153,0.12)',
                                color: task.status === 'Not Started' ? 'var(--d-sub)' : task.status === 'In Progress' ? 'var(--amber)' : 'var(--green)',
                              }}>
                                {task.status === 'Not Started' ? 'Pending' : task.status === 'In Progress' ? 'Active' : 'Done'}
                              </span>
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', color: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
                              {task.cost && parseFloat(task.cost) > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '11px', color: 'var(--purple)' }}>${parseFloat(task.cost).toLocaleString()}</span>}
                              {task.vehicle && vehicleFilter === 'All' && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)', background: 'var(--d-surf)', border: '1px solid var(--d-border)', borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>{task.vehicle}</span>}
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-faint)' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </div>

                          {/* Expanded panel */}
                          {isExpanded && (
                            <div className="expand-row" style={{ background: 'var(--d-surf)', borderRadius: '0 0 10px 10px', border: '1px solid var(--d-border)', borderTop: 'none', padding: '12px 14px 14px' }}>
                              {/* Status chips */}
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--d-faint)', marginBottom: '6px' }}>Change Status</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {STATUSES.map(s => {
                                    const isActive = task.status === s
                                    const col = s === 'Not Started' ? 'var(--d-sub)' : s === 'In Progress' ? 'var(--amber)' : 'var(--green)'
                                    const bg = isActive ? (s === 'Not Started' ? 'rgba(157,152,148,0.2)' : s === 'In Progress' ? 'rgba(232,148,58,0.2)' : 'rgba(52,211,153,0.2)') : 'transparent'
                                    return (
                                      <button key={s} onClick={e => { e.stopPropagation(); if (isAdmin) handleStatusChange(task.id, s) }} style={{
                                        flex: 1, minHeight: '36px', borderRadius: '6px',
                                        border: isActive ? `1px solid ${col}` : '1px solid var(--d-border)',
                                        background: bg, color: isActive ? col : 'var(--d-sub)',
                                        fontFamily: "'DM Mono', monospace", fontSize: '8px',
                                        textTransform: 'uppercase', letterSpacing: '0.08em',
                                        cursor: isAdmin ? 'pointer' : 'default',
                                      }}>{isActive ? '● ' : ''}{s}</button>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* Cost */}
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--d-faint)', marginBottom: '5px' }}>Estimated Cost</div>
                                <input type="number" placeholder="0" value={task.cost ?? ''}
                                  readOnly={!isAdmin}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => isAdmin && handleFieldChange(task.id, 'cost', e.target.value)}
                                  style={{ width: '100%', padding: '9px 10px', borderRadius: '7px', background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--purple)', fontSize: '14px', minHeight: '44px', fontFamily: "'DM Mono', monospace" }} />
                              </div>
                              {/* Notes */}
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--d-faint)', marginBottom: '5px' }}>Notes</div>
                                <textarea placeholder={isAdmin ? 'Add notes, shop quotes, part numbers...' : ''} value={task.notes || ''}
                                  readOnly={!isAdmin}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => isAdmin && handleFieldChange(task.id, 'notes', e.target.value)}
                                  style={{ width: '100%', padding: '9px 10px', borderRadius: '7px', background: 'var(--d-card)', border: '1px solid var(--d-border)', color: 'var(--d-text)', fontSize: '14px', minHeight: '72px', resize: 'none', fontFamily: "'Barlow', sans-serif" }} />
                              </div>
                              {/* Admin actions */}
                              {isAdmin && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                  <button onClick={e => { e.stopPropagation(); setEditingTask(task) }} style={{ background: 'rgba(129,140,248,0.1)', color: 'var(--purple)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: '7px', padding: '9px 14px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                                  {confirmDelete === task.id ? (
                                    <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--d-sub)' }}>Delete?</span>
                                      <button onClick={() => handleDelete(task.id)} style={{ background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 12px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer' }}>Yes</button>
                                      <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: '1px solid var(--d-border)', color: 'var(--d-sub)', borderRadius: '7px', padding: '7px 12px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer' }}>No</button>
                                    </span>
                                  ) : (
                                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(task.id) }} style={{ background: 'rgba(204,74,15,0.1)', color: 'var(--rust)', border: '1px solid rgba(204,74,15,0.2)', borderRadius: '7px', padding: '9px 14px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer' }}>Delete</button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          ) : activeTab === 'summary' ? (
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', padding: '0 20px', marginBottom: '14px' }}>
                Category Breakdown{vehicleFilter !== 'All' ? ` — ${vehicleFilter}` : ''}
              </div>
              {CATEGORIES.map(cat => {
                const catTasks = filteredByVehicle.filter(t => t.category === cat)
                if (!catTasks.length) return null
                const done = catTasks.filter(t => t.status === 'Done').length
                const inProg = catTasks.filter(t => t.status === 'In Progress').length
                const pct = Math.round((done / catTasks.length) * 100)
                const catCost = catTasks.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
                return (
                  <div key={cat} style={{ margin: '0 20px 8px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span>{CAT_ICONS[cat]}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', color: 'var(--d-text)' }}>{cat}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)' }}>{done}/{catTasks.length}</span>
                      {catCost > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '11px', color: 'var(--purple)' }}>${catCost.toLocaleString()}</span>}
                    </div>
                    <div style={{ background: 'var(--d-border)', borderRadius: '2px', height: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--amber)', borderRadius: '2px', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--green)' }}>✓ {done} done</span>
                      {inProg > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--amber)' }}>◐ {inProg} in progress</span>}
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-sub)' }}>{catTasks.length - done - inProg} remaining</span>
                    </div>
                  </div>
                )
              })}

              {/* By vehicle */}
              {vehicleFilter === 'All' && vehicles.length > 0 && (
                <div style={{ margin: '20px 20px 8px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginBottom: '10px' }}>By Vehicle</div>
                  {[...vehicles, { id: 0, name: null }].map(v => {
                    const vTasks = v.name ? tasks.filter(t => t.vehicle === v.name) : tasks.filter(t => !t.vehicle)
                    if (!vTasks.length) return null
                    const vDone = vTasks.filter(t => t.status === 'Done').length
                    const vPct = Math.round((vDone / vTasks.length) * 100)
                    const vCost = vTasks.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
                    return (
                      <div key={v.id} style={{ marginBottom: '8px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '13px', color: v.name ? 'var(--d-text)' : 'var(--d-faint)' }}>{v.name || '(no vehicle)'}</span>
                          <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-faint)' }}>{vDone}/{vTasks.length}</span>
                          {vCost > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '11px', color: 'var(--purple)' }}>${vCost.toLocaleString()}</span>}
                        </div>
                        <div style={{ background: 'var(--d-border)', borderRadius: '2px', height: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${vPct}%`, height: '100%', background: vPct === 100 ? 'var(--green)' : 'var(--amber)', borderRadius: '2px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Cost summary */}
              <div style={{ margin: '16px 20px 8px', background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginBottom: '10px' }}>Cost Summary{vehicleFilter !== 'All' ? ` — ${vehicleFilter}` : ''}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Total estimated', value: `$${totalCost.toLocaleString()}`, color: 'var(--purple)' },
                    { label: 'Spent (completed)', value: `$${doneCost.toLocaleString()}`, color: 'var(--green)' },
                    { label: 'Remaining budget', value: `$${(totalCost - doneCost).toLocaleString()}`, color: 'var(--amber)', border: true },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: r.border ? '8px' : 0, borderTop: r.border ? '1px solid var(--d-border)' : 'none' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)' }}>{r.label}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '11px', color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'garage' ? (
            <div style={{ padding: '0 0 8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', padding: '4px 20px 12px' }}>My Garage</div>
              <VehiclesPanel vehicles={vehicles} tasks={tasks} isAdmin={isAdmin} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
              {!isAdmin && vehicles.length > 0 && (
                <div style={{ margin: '0 20px', fontFamily: "'DM Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-faint)' }}>
                  Login as admin to add or manage vehicles
                </div>
              )}
              {vehicles.length === 0 && !isAdmin && (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏎</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', color: 'var(--d-sub)' }}>No Vehicles Yet</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '0 20px 8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--d-sub)', marginBottom: '14px' }}>
                Stats{vehicleFilter !== 'All' ? ` — ${vehicleFilter}` : ''}
              </div>

              {filteredByVehicle.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--d-faint)' }}>No task data to visualize yet</div>
              ) : (
                <>
                  {/* Status donut */}
                  <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Task Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PieChart width={120} height={120}>
                        <Pie data={statusPieData} cx={55} cy={55} innerRadius={36} outerRadius={52} dataKey="value" stroke="none">
                          {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {statusPieData.map(d => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', color: 'var(--d-sub)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{d.name}</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', color: d.color }}>{d.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Completion by category */}
                  <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Completion by Category</div>
                    <ResponsiveContainer width="100%" height={catBarData.length * 28 + 10}>
                      <BarChart data={catBarData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 56 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#9E9894', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={56} />
                        <Tooltip formatter={(v, _, p) => [`${v}%`, p.payload.full]} contentStyle={{ background: '#2C2926', border: '1px solid #3D3530', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#D9D0C1' }} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                          {catBarData.map((d, i) => <Cell key={i} fill={d.pct === 100 ? '#34D399' : '#E8943A'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cost by category */}
                  {costBarData.length > 0 && (
                    <div style={{ background: 'var(--d-card)', border: '1px solid var(--d-border)', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--d-faint)', marginBottom: '10px' }}>Estimated Cost by Category</div>
                      <ResponsiveContainer width="100%" height={costBarData.length * 28 + 10}>
                        <BarChart data={costBarData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 56 }}>
                          <XAxis type="number" tick={{ fill: '#857F7A', fontSize: 8, fontFamily: 'DM Mono, monospace' }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#9E9894', fontSize: 8, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={56} />
                          <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Estimated']} contentStyle={{ background: '#2C2926', border: '1px solid #3D3530', borderRadius: '6px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#D9D0C1' }} />
                          <Bar dataKey="cost" fill="#818CF8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* FAB — service tab and garage tab, admin only */}
        {isAdmin && (activeTab === 'service' || activeTab === 'garage') && (
          <div style={{ position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', pointerEvents: 'none', zIndex: 90 }}>
            <button
              onClick={() => activeTab === 'service' ? setShowAddTask(true) : setShowAddVehicle(true)}
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
      {showAddTask && <TaskModal vehicles={vehicles} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
      {editingTask && <TaskModal task={editingTask} vehicles={vehicles} onClose={() => setEditingTask(null)} onSave={handleEditTask} />}
      {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} onUpload={handleBulkUpload} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
