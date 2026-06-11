import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase.js'
import Nav from './Nav.jsx'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUEL_URL = import.meta.env.VITE_FUEL_URL || '#'

const DEFAULT_TASKS = [
  { category: 'Engine & Drivetrain', task: '📋 Engine History / Mileage Note', priority: 'High', status: 'In Progress', cost: '', notes: 'Odometer reads 73k miles. Engine was replaced with a unit that has 67k miles on it.' },
  { category: 'Engine & Drivetrain', task: 'Replace spark plugs & ignition coils', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Inspect/replace timing chain & tensioner', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Check engine mounts for wear/cracking', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Inspect drive belts (serpentine/aux)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Check for oil leaks (valve cover, rear main seal)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Replace air filter & clean intake', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Engine & Drivetrain', task: 'Install fuel injector kit', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', task: 'Replace high pressure fuel pump (HPFP)', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', task: 'Replace fuel rail pressure sensor', priority: 'High', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Engine & Drivetrain', task: 'Install oil catch can(s)', priority: 'Medium', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Fluids & Filters', task: 'Full synthetic oil change', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', task: 'Flush & replace coolant', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', task: 'Brake fluid flush', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', task: 'Power steering fluid check/top-off', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', task: 'Replace fuel filter', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Fluids & Filters', task: 'Transmission fluid check/change', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: 'Inspect brake pads & rotors (all 4 corners)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: 'Check calipers for sticking/leaking', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: 'Inspect control arms & bushings', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: 'Check shocks/struts for leaking', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: 'Inspect wheel bearings', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Brakes & Suspension', task: '4-wheel alignment', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Tires & Wheels', task: 'Inspect tires for wear/cracking', priority: 'High', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Tires & Wheels', task: 'Check & set tire pressure', priority: 'Low', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Tires & Wheels', task: 'Rotate tires', priority: 'Low', status: 'Done', cost: '', notes: 'Tires replaced ~2 years ago.' },
  { category: 'Electrical & Battery', task: 'Test/replace battery (likely due at 15yr)', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', task: 'Inspect alternator output', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', task: 'Check all exterior lights (bulbs, lenses)', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', task: 'Test power windows, locks & mirrors', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Electrical & Battery', task: 'Scan for stored OBD-II fault codes', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Convertible Top', task: 'Inspect convertible top fabric for tears/seams', priority: 'High', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', task: 'Test hydraulic top mechanism (full open/close cycle)', priority: 'High', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', task: 'Check hydraulic fluid level for top pump', priority: 'Medium', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', task: 'Inspect & lubricate latches and weatherstripping', priority: 'Medium', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Convertible Top', task: 'Clean & condition top fabric', priority: 'Low', status: 'Done', cost: '', notes: 'Convertible top replaced ~2 years ago.' },
  { category: 'Interior', task: 'Deep clean & condition leather/seats', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', task: 'Inspect carpets & floor mats for moisture/mold', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', task: 'Check HVAC (A/C, heat, blower motor)', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', task: 'Test infotainment/radio & speakers', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Interior', task: 'Install new infotainment head unit', priority: 'Medium', status: 'In Progress', cost: '', notes: 'Parts purchased. Ready to install.' },
  { category: 'Exterior & Body', task: 'Full paint inspection — chips, rust spots', priority: 'Medium', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', task: 'Inspect undercarriage for rust/corrosion', priority: 'High', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', task: 'Clean & treat door jambs and hinges', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
  { category: 'Exterior & Body', task: 'Machine polish & ceramic coat or wax', priority: 'Low', status: 'Not Started', cost: '', notes: '' },
]

const CATEGORIES = ['Engine & Drivetrain', 'Fluids & Filters', 'Brakes & Suspension', 'Tires & Wheels', 'Electrical & Battery', 'Convertible Top', 'Interior', 'Exterior & Body']
const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Not Started', 'In Progress', 'Done']

const STATUS_COLOR = { 'Not Started': '#6b7280', 'In Progress': '#f59e0b', 'Done': '#10b981' }
const PRIORITY_COLOR = { 'High': '#ef4444', 'Medium': '#f97316', 'Low': '#3b82f6' }
const CAT_ICONS = {
  'Engine & Drivetrain': '⚙️', 'Fluids & Filters': '🛢️', 'Brakes & Suspension': '🔧',
  'Tires & Wheels': '🛞', 'Electrical & Battery': '⚡', 'Convertible Top': '🔄',
  'Interior': '🪑', 'Exterior & Body': '🚗',
}

const CSV_TEMPLATE = 'task,category,priority,status,cost,notes,vehicle\nReplace coolant expansion tank,Engine & Drivetrain,High,Not Started,45,Plastic tanks crack with age,2009 Mini Cooper S\nInspect brake booster vacuum hose,Brakes & Suspension,Medium,Not Started,15,Common source of hard brake pedal,2009 Mini Cooper S'

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

// ─── CSV parser (handles quoted fields with commas inside) ───────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [], error: 'File must have a header row and at least one data row.' }

  const parseRow = (line) => {
    const result = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).filter(l => l.trim()).map(l => parseRow(l))
  return { headers, rows }
}

function normalizeRows(headers, rawRows) {
  const taskIdx = headers.indexOf('task')
  const catIdx = headers.indexOf('category')
  const priIdx = headers.indexOf('priority')
  const statusIdx = headers.indexOf('status')
  const costIdx = headers.indexOf('cost')
  const notesIdx = headers.indexOf('notes')
  const vehicleIdx = headers.indexOf('vehicle')

  const errors = []
  if (taskIdx === -1) errors.push('Missing required column: task')
  if (catIdx === -1) errors.push('Missing required column: category')
  if (errors.length) return { rows: [], errors }

  const normalized = []
  rawRows.forEach((cols, i) => {
    const rowNum = i + 2
    const task = cols[taskIdx] || ''
    const category = cols[catIdx] || ''

    if (!task.trim()) { errors.push(`Row ${rowNum}: missing task name — skipped`); return }
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
      task: task.trim(),
      category: category.trim(),
      priority,
      status,
      cost,
      notes: notes.trim(),
      vehicle: vehicle.trim() || null,
      _warnings: [
        !PRIORITIES.includes(rawPriority) && rawPriority ? `priority "${rawPriority}" → defaulted to Medium` : null,
        !STATUSES.includes(rawStatus) && rawStatus ? `status "${rawStatus}" → defaulted to Not Started` : null,
      ].filter(Boolean),
    })
  })

  return { rows: normalized, errors }
}

// ─── Components ───────────────────────────────────────────────────────────────

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

function AdminLoginModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        sessionStorage.setItem('adminSession', 'true')
        sessionStorage.setItem('adminPass', password)
        onSuccess(password)
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px',
        padding: '28px', width: '320px',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '18px' }}>
          ADMIN LOGIN
        </div>
        <label style={labelStyle}>PASSWORD</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={inputStyle()}
          autoFocus
        />
        {error && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={handleLogin} disabled={loading} style={{
            flex: 1, background: '#f59e0b', color: '#0d0d0f', border: 'none',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit',
            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            {loading ? 'CHECKING...' : 'LOGIN'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            CANCEL
          </button>
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
          All existing tasks assigned to this vehicle will be updated to the new name.
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
function DeleteVehicleModal({ vehicle, taskCount, onClose, onConfirm }) {
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
        {taskCount > 0 ? (
          <div style={{ fontSize: '11px', color: '#6b7280', background: '#13131a', border: '1px solid #1e1e28', borderRadius: '4px', padding: '10px 12px', lineHeight: 1.6 }}>
            This vehicle has <strong style={{ color: '#f97316' }}>{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</strong> assigned. Those tasks will be kept — only the vehicle name is removed from the list.
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#6b7280' }}>This vehicle has no tasks assigned.</div>
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

// ─── Vehicles Panel ───────────────────────────────────────────────────────────
function VehiclesPanel({ vehicles, tasks, isAdmin, onAdd, onRename, onDelete }) {
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

  const taskCount = (vehicleName) => tasks.filter(t => t.vehicle === vehicleName).length

  return (
    <>
      <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em', marginBottom: '10px' }}>MY VEHICLES</div>

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
          taskCount={taskCount(deletingVehicle.name)}
          onClose={() => setDeletingVehicle(null)}
          onConfirm={() => { onDelete(deletingVehicle.id, deletingVehicle.name); setDeletingVehicle(null) }}
        />
      )}
    </>
  )
}

function TaskModal({ task, vehicles, onClose, onSave }) {
  const [form, setForm] = useState(task || {
    category: CATEGORIES[0], task: '', priority: 'Medium', status: 'Not Started', cost: '', notes: '', vehicle: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px',
        padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '20px' }}>
          {task ? 'EDIT TASK' : 'ADD TASK'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>VEHICLE</label>
            <select value={form.vehicle || ''} onChange={e => set('vehicle', e.target.value || null)} style={selectStyle()}>
              <option value="">— No vehicle —</option>
              {vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>CATEGORY *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={selectStyle()}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>TASK *</label>
            <input value={form.task} onChange={e => set('task', e.target.value)} style={inputStyle()} placeholder="Describe the task..." />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PRIORITY</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={selectStyle()}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>STATUS</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle()}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>ESTIMATED COST ($)</label>
            <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} style={inputStyle()} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inputStyle(), resize: 'vertical' }} placeholder="Part numbers, shop quotes, details..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => onSave(form)} style={{
            flex: 1, background: '#f59e0b', color: '#0d0d0f', border: 'none',
            borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit',
            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            {task ? 'SAVE CHANGES' : 'ADD TASK'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            CANCEL
          </button>
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
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const processFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseErrors(['File must be a .csv file.'])
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const { headers, rows, error } = parseCSV(text)
      if (error) { setParseErrors([error]); return }
      const { rows: normalized, errors } = normalizeRows(headers, rows)
      setParseErrors(errors)
      setPreviewRows(normalized)
      if (normalized.length > 0) setStage('preview')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const handleFileChange = (e) => {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  const handleConfirm = async () => {
    setStage('uploading')
    setUploadError('')
    const rows = previewRows.map(({ _warnings, ...r }) => r)
    try {
      const result = await onUpload(rows)
      if (result.ok) {
        setUploadCount(result.count ?? rows.length)
        setStage('done')
      } else {
        setUploadError(result.error?.message || 'Upload failed. Check console for details.')
        setStage('preview')
      }
    } catch (err) {
      setUploadError('Network error — upload failed.')
      setStage('preview')
    }
  }

  const reset = () => {
    setStage('drop')
    setPreviewRows([])
    setParseErrors([])
    setUploadError('')
  }

  const allWarnings = previewRows.flatMap(r => r._warnings || [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px',
        padding: '28px', width: '720px', maxWidth: '95vw', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', gap: '0',
      }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#f59e0b', letterSpacing: '0.08em' }}>
            BULK UPLOAD TASKS
          </div>
          <button onClick={downloadTemplate} style={{
            background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            padding: '4px 10px', borderRadius: '3px', fontSize: '9px',
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.08em',
          }}>
            ↓ DOWNLOAD TEMPLATE
          </button>
        </div>

        {stage === 'drop' && (
          <div style={{ marginBottom: '16px', background: '#13131a', border: '1px solid #1e1e28', borderRadius: '4px', padding: '10px 14px' }}>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', marginBottom: '6px' }}>REQUIRED CSV COLUMNS</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { col: 'task', note: 'required', color: '#ef4444' },
                { col: 'category', note: 'required', color: '#ef4444' },
                { col: 'priority', note: 'High / Medium / Low', color: '#6b7280' },
                { col: 'status', note: 'Not Started / In Progress / Done', color: '#6b7280' },
                { col: 'cost', note: 'number', color: '#6b7280' },
                { col: 'notes', note: 'text', color: '#6b7280' },
                { col: 'vehicle', note: 'optional', color: '#6b7280' },
              ].map(({ col, note, color }) => (
                <div key={col} style={{ background: '#0d0d0f', border: '1px solid #2a2a35', borderRadius: '3px', padding: '3px 8px' }}>
                  <span style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 500 }}>{col}</span>
                  <span style={{ fontSize: '9px', color, marginLeft: '5px' }}>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'drop' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#f59e0b' : '#2a2a35'}`,
              borderRadius: '6px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(245,158,11,0.04)' : '#0d0d0f',
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#94a3b8', letterSpacing: '0.08em' }}>
              DROP CSV FILE HERE
            </div>
            <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '6px' }}>or click to browse</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        )}

        {parseErrors.length > 0 && stage !== 'done' && (
          <div style={{ marginBottom: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '10px 14px' }}>
            <div style={{ fontSize: '9px', color: '#ef4444', letterSpacing: '0.1em', marginBottom: '5px' }}>
              {stage === 'drop' ? 'ERRORS' : `SKIPPED ROWS (${parseErrors.length})`}
            </div>
            {parseErrors.map((e, i) => (
              <div key={i} style={{ fontSize: '10px', color: '#ef4444', marginBottom: '2px' }}>• {e}</div>
            ))}
          </div>
        )}

        {allWarnings.length > 0 && stage === 'preview' && (
          <div style={{ marginBottom: '14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '4px', padding: '10px 14px' }}>
            <div style={{ fontSize: '9px', color: '#f97316', letterSpacing: '0.1em', marginBottom: '5px' }}>WARNINGS — VALUES DEFAULTED</div>
            {allWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: '10px', color: '#f97316', marginBottom: '2px' }}>• {w}</div>
            ))}
          </div>
        )}

        {uploadError && (
          <div style={{ marginBottom: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '10px 14px' }}>
            <div style={{ fontSize: '10px', color: '#ef4444' }}>⚠ {uploadError}</div>
          </div>
        )}

        {stage === 'preview' && previewRows.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', marginBottom: '8px' }}>
              PREVIEW — {previewRows.length} {previewRows.length === 1 ? 'TASK' : 'TASKS'} READY TO IMPORT
            </div>
            <div style={{ background: '#13131a', border: '1px solid #1e1e28', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 70px 90px 60px', gap: 0, padding: '7px 12px', borderBottom: '1px solid #1e1e28' }}>
                {['TASK', 'CATEGORY', 'VEHICLE', 'PRIORITY', 'STATUS', 'COST'].map(h => (
                  <div key={h} style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {previewRows.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 70px 90px 60px',
                  gap: 0, padding: '7px 12px',
                  borderBottom: i < previewRows.length - 1 ? '1px solid #1e1e28' : 'none',
                  background: row._warnings?.length ? 'rgba(249,115,22,0.04)' : 'transparent',
                }}>
                  <div style={{ fontSize: '10px', color: '#cbd5e1', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={row.task}>
                    {row.task}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.category}
                  </div>
                  <div style={{ fontSize: '10px', color: row.vehicle ? '#cbd5e1' : '#3a3a45', paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.vehicle || '—'}
                  </div>
                  <div>
                    <span className="pill" style={{ background: PRIORITY_COLOR[row.priority] + '22', color: PRIORITY_COLOR[row.priority] }}>
                      {row.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: STATUS_COLOR[row.status] }}>{row.status}</div>
                  <div style={{ fontSize: '10px', color: row.cost ? '#818cf8' : '#3a3a45' }}>
                    {row.cost ? `$${row.cost}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '12px' }}>
            Uploading {previewRows.length} tasks...
          </div>
        )}

        {stage === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#10b981', letterSpacing: '0.08em' }}>
              {uploadCount} {uploadCount === 1 ? 'TASK' : 'TASKS'} ADDED
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          {stage === 'preview' && (
            <>
              <button onClick={handleConfirm} style={{
                flex: 1, background: '#f59e0b', color: '#0d0d0f', border: 'none',
                borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit',
                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
              }}>
                IMPORT {previewRows.length} {previewRows.length === 1 ? 'TASK' : 'TASKS'}
              </button>
              <button onClick={reset} style={{
                background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
                borderRadius: '4px', padding: '9px 16px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
              }}>
                BACK
              </button>
            </>
          )}
          {stage === 'done' && (
            <button onClick={onClose} style={{
              flex: 1, background: '#10b981', color: '#0d0d0f', border: 'none',
              borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit',
              fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              DONE
            </button>
          )}
          {(stage === 'drop' || stage === 'uploading') && (
            <button onClick={onClose} disabled={stage === 'uploading'} style={{
              flex: 1, background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
              borderRadius: '4px', padding: '9px', fontSize: '11px', fontFamily: 'inherit',
              cursor: stage === 'uploading' ? 'default' : 'pointer',
            }}>
              CANCEL
            </button>
          )}
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
  const [activeTab, setActiveTab] = useState('tasks')
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('adminSession') === 'true')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPass') || '')
  const [showLogin, setShowLogin] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const showToast = (msg) => setToast(msg)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('id')
    if (!error) setTasks(data || [])
    setLoading(false)
  }, [])

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').order('name')
    setVehicles(data || [])
  }, [])

  useEffect(() => {
    Promise.all([fetchTasks(), fetchVehicles()])
  }, [fetchTasks, fetchVehicles])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase.channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  const callFn = async (fnName, payload) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, ...payload }),
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch {
      console.error(`[callFn] ${fnName} returned non-JSON (${res.status}):`, text)
      return { ok: false, error: { message: `Server error (${res.status})` } }
    }
  }

  // ── Vehicle CRUD ─────────────────────────────────────────────────────────
  const handleAddVehicle = async (name) => {
    const result = await callFn('admin-vehicle-insert', { name })
    if (result.ok) { showToast(`Vehicle "${name}" added`); fetchVehicles() }
    else showToast(result.error?.message || 'Failed to add vehicle')
  }

  const handleRenameVehicle = async (id, oldName, newName) => {
    const result = await callFn('admin-vehicle-update', { id, oldName, newName })
    if (result.ok) {
      showToast(`Renamed "${oldName}" → "${newName}" (${result.updatedTasks ?? 0} tasks updated)`)
      fetchVehicles(); fetchTasks()
    } else showToast(result.error?.message || 'Rename failed')
  }

  const handleDeleteVehicle = async (id, name) => {
    const result = await callFn('admin-vehicle-delete', { id })
    if (result.ok) { showToast(`Vehicle "${name}" removed`); fetchVehicles() }
    else showToast('Delete failed')
  }

  // ── Task CRUD ─────────────────────────────────────────────────────────────
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
    if (!form.task.trim()) return
    const data = await callFn('admin-insert', { row: { ...form, vehicle: form.vehicle || null } })
    if (data.ok) { showToast('Task added'); fetchTasks() }
    else { showToast('Error: ' + (data.error?.message || data.error || 'could not add task')) }
    setShowAddTask(false)
  }

  const handleEditTask = async (form) => {
    const { id, ...fields } = form
    await callFn('admin-update', { id: editingTask.id, fields: { ...fields, vehicle: fields.vehicle || null } })
    showToast('Task updated')
    fetchTasks()
    setEditingTask(null)
  }

  const handleDelete = async (id) => {
    await callFn('admin-delete', { id })
    showToast('Task deleted')
    fetchTasks()
    setConfirmDelete(null)
  }

  const handleBulkUpload = async (rows) => {
    const result = await callFn('admin-bulk-insert', { rows })
    if (result.ok) {
      fetchTasks()
      showToast(`${result.count ?? rows.length} tasks imported`)
    }
    return result
  }

  const handleAdminSuccess = (pass) => {
    setIsAdmin(true)
    setAdminPassword(pass)
    setShowLogin(false)
    showToast('Admin access granted')
  }

  // ── Computed data ────────────────────────────────────────────────────────
  const vehicleOptions = ['All', ...vehicles.map(v => v.name)]

  // Stats and summary respect vehicle filter
  const filteredByVehicle = vehicleFilter === 'All' ? tasks : tasks.filter(t => t.vehicle === vehicleFilter)

  const totalCost = filteredByVehicle.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
  const doneCost = filteredByVehicle.filter(t => t.status === 'Done').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
  const doneCount = filteredByVehicle.filter(t => t.status === 'Done').length
  const inProgressCount = filteredByVehicle.filter(t => t.status === 'In Progress').length
  const highPendingCount = filteredByVehicle.filter(t => t.priority === 'High' && t.status !== 'Done').length
  const progressPct = filteredByVehicle.length ? Math.round((doneCount / filteredByVehicle.length) * 100) : 0

  const filtered = filteredByVehicle.filter(t =>
    (filter.category === 'All' || t.category === filter.category) &&
    (filter.status === 'All' || t.status === filter.status) &&
    (filter.priority === 'All' || t.priority === filter.priority)
  )

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter(t => t.category === cat)
    return acc
  }, {})

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: '#0d0d0f', minHeight: '100vh', color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a1f; }
        ::-webkit-scrollbar-thumb { background: #3a3a45; border-radius: 3px; }
        .task-row:hover { background: #1a1a22 !important; }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { opacity: 0.85; }
        select, input, textarea { outline: none; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .fab { transition: transform 0.15s, box-shadow 0.15s; }
        .fab:hover { transform: translateY(-2px); }
        .fab:active { transform: translateY(0); }
        .del-btn { background: none; border: 1px solid #3a3a45; color: #6b7280; padding: 4px 10px; border-radius: 3px; font-size: 10px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
        .del-btn:hover { border-color: #ef4444; color: #ef4444; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .expand-row { animation: slideDown 0.15s ease; }
        .progress-bar-inner { transition: width 0.5s ease; }
        .upload-btn:hover { border-color: #f59e0b !important; color: #f59e0b !important; }
        .vehicle-icon-btn:hover { color: #94a3b8 !important; }
        .add-vehicle-btn:hover { border-color: #f59e0b !important; color: #f59e0b !important; }
      `}</style>

      <Nav activeApp="dashboard" dashboardUrl="/" fuelUrl={FUEL_URL} />

      {/* Stats Header */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '16px 24px' }}>
        {/* Vehicle filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>VEHICLE</div>
          <select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value)}
            style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {vehicleOptions.map(v => <option key={v}>{v}</option>)}
          </select>
          {vehicleFilter !== 'All' && (
            <span style={{ fontSize: '10px', color: '#4b5563' }}>
              — {filteredByVehicle.length} {filteredByVehicle.length === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', flex: 1 }}>
            {[
              { label: 'TOTAL TASKS', value: filteredByVehicle.length, color: '#94a3b8' },
              { label: 'DONE', value: doneCount, color: '#10b981' },
              { label: 'IN PROGRESS', value: inProgressCount, color: '#f59e0b' },
              { label: 'HIGH PRIORITY PENDING', value: highPendingCount, color: '#ef4444' },
              { label: 'ESTIMATED SPEND', value: `$${totalCost.toLocaleString()}`, color: '#818cf8' },
              { label: 'SPENT (DONE)', value: `$${doneCost.toLocaleString()}`, color: '#34d399' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em' }}>OVERALL PROGRESS</div>
            <div style={{ fontSize: '22px', fontFamily: "'Bebas Neue', sans-serif", color: progressPct === 100 ? '#10b981' : '#f59e0b' }}>{progressPct}%</div>
          </div>
        </div>
        <div style={{ background: '#2a2a35', borderRadius: '2px', height: '4px', overflow: 'hidden' }}>
          <div className="progress-bar-inner" style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Tabs + Admin */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {['tasks', 'summary'].map(tab => (
            <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: '11px', letterSpacing: '0.1em',
              color: activeTab === tab ? '#f59e0b' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
              fontFamily: 'inherit',
            }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        {isAdmin ? (
          <button onClick={() => { setIsAdmin(false); sessionStorage.clear() }} style={{
            background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
            padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            ADMIN ✓ (logout)
          </button>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{
            background: 'none', border: '1px solid #2a2a35', color: '#4b5563',
            padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            ADMIN LOGIN
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center', padding: '48px' }}>Loading tasks...</div>
        ) : activeTab === 'tasks' ? (
          <>
            {/* Vehicles panel — admin only */}
            {isAdmin && (
              <VehiclesPanel
                vehicles={vehicles}
                tasks={tasks}
                isAdmin={isAdmin}
                onAdd={handleAddVehicle}
                onRename={handleRenameVehicle}
                onDelete={handleDeleteVehicle}
              />
            )}

            {/* Filter bar + bulk upload */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: 'Category', key: 'category', options: ['All', ...CATEGORIES] },
                { label: 'Status', key: 'status', options: ['All', ...STATUSES] },
                { label: 'Priority', key: 'priority', options: ['All', ...PRIORITIES] },
              ].map(f => (
                <select key={f.key} value={filter[f.key]} onChange={e => setFilter(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
              <button onClick={() => setFilter({ category: 'All', status: 'All', priority: 'All' })}
                style={{ background: 'none', border: '1px solid #3a3a45', color: '#6b7280', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                Clear
              </button>

              {isAdmin && (
                <button className="upload-btn" onClick={() => setShowBulkUpload(true)} style={{
                  background: 'none', border: '1px solid #3a3a45', color: '#6b7280',
                  padding: '6px 12px', borderRadius: '4px', fontSize: '11px',
                  fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.05em',
                  marginLeft: 'auto', transition: 'all 0.15s',
                }}>
                  ↑ BULK UPLOAD CSV
                </button>
              )}
            </div>

            {tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#6b7280', letterSpacing: '0.1em' }}>NO TASKS YET</div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                    <button onClick={() => setShowAddTask(true)} style={{
                      background: '#f59e0b', color: '#0d0d0f', border: 'none',
                      borderRadius: '4px', padding: '8px 20px', fontSize: '11px', fontFamily: 'inherit',
                      fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                    }}>
                      ADD FIRST TASK
                    </button>
                    <button onClick={() => setShowBulkUpload(true)} style={{
                      background: 'none', border: '1px solid #3a3a45', color: '#6b7280',
                      borderRadius: '4px', padding: '8px 20px', fontSize: '11px', fontFamily: 'inherit',
                      cursor: 'pointer', letterSpacing: '0.05em',
                    }}>
                      ↑ BULK UPLOAD CSV
                    </button>
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 && tasks.length > 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#4b5563', fontSize: '12px' }}>
                No tasks match the current filters
              </div>
            )}

            {CATEGORIES.map(cat => {
              const catTasks = grouped[cat]
              if (!catTasks || catTasks.length === 0) return null
              const catDone = catTasks.filter(t => t.status === 'Done').length
              return (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #1e1e28' }}>
                    <span style={{ fontSize: '14px' }}>{CAT_ICONS[cat]}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em', color: '#94a3b8', fontSize: '13px' }}>{cat}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#4b5563' }}>{catDone}/{catTasks.length} done</span>
                  </div>
                  {catTasks.map(task => (
                    <div key={task.id}>
                      <div className="task-row" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: '4px', cursor: 'pointer',
                          background: expandedTask === task.id ? '#1a1a22' : 'transparent',
                          borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
                          marginBottom: '2px',
                        }}>
                        <select value={task.status} onClick={e => e.stopPropagation()}
                          onChange={e => isAdmin ? handleStatusChange(task.id, e.target.value) : null}
                          disabled={!isAdmin}
                          style={{ background: '#0d0d0f', border: '1px solid #2a2a35', color: STATUS_COLOR[task.status], padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'inherit', cursor: isAdmin ? 'pointer' : 'default', minWidth: '100px' }}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <span className="pill" style={{ background: PRIORITY_COLOR[task.priority] + '22', color: PRIORITY_COLOR[task.priority], minWidth: '46px', textAlign: 'center' }}>
                          {task.priority}
                        </span>
                        <span style={{ flex: 1, fontSize: '12px', color: task.status === 'Done' ? '#4b5563' : '#cbd5e1', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
                          {task.task}
                        </span>
                        {task.vehicle && vehicleFilter === 'All' && (
                          <span style={{ fontSize: '9px', color: '#4b5563', background: '#13131a', border: '1px solid #1e1e28', borderRadius: '3px', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                            {task.vehicle}
                          </span>
                        )}
                        {task.cost && <span style={{ fontSize: '11px', color: '#818cf8' }}>${parseFloat(task.cost).toLocaleString()}</span>}
                        {isAdmin && (
                          <>
                            <button className="del-btn" onClick={e => { e.stopPropagation(); setEditingTask(task) }}>EDIT</button>
                            {confirmDelete === task.id ? (
                              <span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '10px' }}>
                                <span style={{ color: '#6b7280' }}>Delete?</span>
                                <button className="del-btn" onClick={() => handleDelete(task.id)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>YES</button>
                                <button className="del-btn" onClick={() => setConfirmDelete(null)}>NO</button>
                              </span>
                            ) : (
                              <button className="del-btn" onClick={e => { e.stopPropagation(); setConfirmDelete(task.id) }}>DEL</button>
                            )}
                          </>
                        )}
                        <span style={{ fontSize: '10px', color: '#3a3a45' }}>{expandedTask === task.id ? '▲' : '▼'}</span>
                      </div>

                      {expandedTask === task.id && (
                        <div className="expand-row" style={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: '0 4px 4px 4px', padding: '12px 14px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <div style={{ ...labelStyle, marginBottom: '4px' }}>ESTIMATED COST ($)</div>
                              <input type="number" placeholder="0" value={task.cost}
                                onChange={e => isAdmin && handleFieldChange(task.id, 'cost', e.target.value)}
                                readOnly={!isAdmin}
                                style={{ background: '#0d0d0f', border: '1px solid #2a2a35', color: '#818cf8', padding: '5px 8px', borderRadius: '3px', fontSize: '12px', fontFamily: 'inherit', width: '100%' }} />
                            </div>
                            <div style={{ flex: 3, minWidth: '200px' }}>
                              <div style={{ ...labelStyle, marginBottom: '4px' }}>NOTES</div>
                              <input type="text" placeholder="Add notes, shop quotes, part numbers..." value={task.notes}
                                onChange={e => isAdmin && handleFieldChange(task.id, 'notes', e.target.value)}
                                readOnly={!isAdmin}
                                style={{ background: '#0d0d0f', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '5px 8px', borderRadius: '3px', fontSize: '12px', fontFamily: 'inherit', width: '100%' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        ) : (
          /* ── SUMMARY TAB ────────────────────────────────────────────────────── */
          <div style={{ maxWidth: '600px' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '16px' }}>
              CATEGORY BREAKDOWN{vehicleFilter !== 'All' ? ` — ${vehicleFilter}` : ''}
            </div>
            {CATEGORIES.map(cat => {
              const catTasks = filteredByVehicle.filter(t => t.category === cat)
              if (!catTasks.length) return null
              const done = catTasks.filter(t => t.status === 'Done').length
              const inProg = catTasks.filter(t => t.status === 'In Progress').length
              const pct = Math.round((done / catTasks.length) * 100)
              const catCost = catTasks.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
              return (
                <div key={cat} style={{ marginBottom: '14px', background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span>{CAT_ICONS[cat]}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '14px' }}>{cat}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#4b5563' }}>{done}/{catTasks.length}</span>
                    {catCost > 0 && <span style={{ fontSize: '11px', color: '#818cf8' }}>${catCost.toLocaleString()}</span>}
                  </div>
                  <div style={{ background: '#1a1a22', borderRadius: '2px', height: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : '#f59e0b', borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#10b981' }}>✓ {done} done</span>
                    {inProg > 0 && <span style={{ fontSize: '10px', color: '#f59e0b' }}>◐ {inProg} in progress</span>}
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{catTasks.length - done - inProg} remaining</span>
                  </div>
                </div>
              )
            })}

            {/* Per-vehicle breakdown (only shown when viewing all vehicles) */}
            {vehicleFilter === 'All' && vehicles.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '16px' }}>
                  BY VEHICLE
                </div>
                {[...vehicles, { id: 0, name: null }].map(v => {
                  const vTasks = v.name ? tasks.filter(t => t.vehicle === v.name) : tasks.filter(t => !t.vehicle)
                  if (!vTasks.length) return null
                  const vDone = vTasks.filter(t => t.status === 'Done').length
                  const vPct = Math.round((vDone / vTasks.length) * 100)
                  const vCost = vTasks.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
                  return (
                    <div key={v.id} style={{ marginBottom: '10px', background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: v.name ? '#cbd5e1' : '#4b5563', fontWeight: 500 }}>{v.name || '(no vehicle)'}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#4b5563' }}>{vDone}/{vTasks.length}</span>
                        {vCost > 0 && <span style={{ fontSize: '11px', color: '#818cf8' }}>${vCost.toLocaleString()}</span>}
                      </div>
                      <div style={{ background: '#1a1a22', borderRadius: '2px', height: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${vPct}%`, height: '100%', background: vPct === 100 ? '#10b981' : '#f59e0b', borderRadius: '2px', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop: '20px', background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '10px' }}>
                COST SUMMARY{vehicleFilter !== 'All' ? ` — ${vehicleFilter}` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Total estimated</span>
                  <span style={{ color: '#818cf8' }}>${totalCost.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Spent (completed tasks)</span>
                  <span style={{ color: '#34d399' }}>${doneCost.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #2a2a35', paddingTop: '6px' }}>
                  <span style={{ color: '#6b7280' }}>Remaining budget</span>
                  <span style={{ color: '#f59e0b' }}>${(totalCost - doneCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB — add single task (admin only) */}
      {isAdmin && activeTab === 'tasks' && (
        <button className="fab" onClick={() => setShowAddTask(true)} style={{
          position: 'fixed', bottom: '28px', right: '28px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: '#f59e0b', color: '#0d0d0f', border: 'none',
          fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          +
        </button>
      )}

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onSuccess={handleAdminSuccess} />}
      {showAddTask && <TaskModal vehicles={vehicles} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
      {editingTask && <TaskModal task={editingTask} vehicles={vehicles} onClose={() => setEditingTask(null)} onSave={handleEditTask} />}
      {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} onUpload={handleBulkUpload} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
