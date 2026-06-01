import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from './supabase.js'
import Nav from '@mini/shared/Nav.jsx'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || '#'
const FUEL_URL = import.meta.env.VITE_FUEL_URL || '/'

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

function computeMpg(logs) {
  const sorted = [...logs].sort((a, b) => a.odometer - b.odometer)
  return sorted.map((log, i) => {
    if (i === 0) return { ...log, mpg: null }
    const prev = sorted[i - 1]
    const miles = log.odometer - prev.odometer
    const mpg = miles > 0 && log.fuel_amount > 0 ? miles / log.fuel_amount : null
    return { ...log, mpg }
  })
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/fuel-verify`, {
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

function FillUpModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry ? {
    date: entry.date || today(),
    odometer: entry.odometer ?? '',
    fuel_amount: entry.fuel_amount ?? '',
    fuel_cost: entry.fuel_cost ?? '',
    price_per_gal: entry.price_per_gal ?? '',
    location: entry.location ?? '',
    notes: entry.notes ?? '',
  } : {
    date: today(), odometer: '', fuel_amount: '',
    fuel_cost: '', price_per_gal: '', location: '', notes: '',
  })

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    // Auto-calc price_per_gal from cost + amount
    if (k === 'fuel_cost' || k === 'fuel_amount') {
      const cost = parseFloat(k === 'fuel_cost' ? v : next.fuel_cost)
      const amt = parseFloat(k === 'fuel_amount' ? v : next.fuel_amount)
      if (cost > 0 && amt > 0 && k === 'fuel_cost') {
        next.price_per_gal = (cost / amt).toFixed(3)
      }
    }
    // Auto-calc total cost from price + amount
    if (k === 'price_per_gal' || k === 'fuel_amount') {
      const price = parseFloat(k === 'price_per_gal' ? v : next.price_per_gal)
      const amt = parseFloat(k === 'fuel_amount' ? v : next.fuel_amount)
      if (price > 0 && amt > 0 && k === 'price_per_gal') {
        next.fuel_cost = (price * amt).toFixed(2)
      }
    }
    return next
  })

  const valid = form.date && form.odometer && form.fuel_amount

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111116', border: '1px solid #2a2a35', borderRadius: '6px',
        padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#f59e0b', letterSpacing: '0.08em', marginBottom: '20px' }}>
          {entry ? 'EDIT FILL-UP' : 'ADD FILL-UP'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ color: '#6b7280', marginBottom: '2px' }}>{fmtDate(d.date)}</div>
      <div style={{ color: '#f59e0b' }}>{fmt(d.mpg)} MPG</div>
      {d.odometer && <div style={{ color: '#4b5563', fontSize: '10px' }}>{d.odometer.toLocaleString()} mi</div>}
    </div>
  )
}

const DATE_FILTERS = ['All', 'This Week', 'This Month', 'This Year']

function filterByDate(logs, range) {
  if (range === 'All') return logs
  const now = new Date()
  return logs.filter(log => {
    const d = new Date(log.date + 'T00:00:00')
    if (range === 'This Week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      return d >= start
    }
    if (range === 'This Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (range === 'This Year') return d.getFullYear() === now.getFullYear()
    return true
  })
}

export default function App() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fillups')
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('adminSession') === 'true')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPass') || '')
  const [showLogin, setShowLogin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [dateFilter, setDateFilter] = useState('All')

  const showToast = (msg) => setToast(msg)

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
    if (!error) setLogs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const callFn = async (fnName, payload) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, ...payload }),
    })
    return res.json()
  }

  const handleSave = async (form) => {
    const row = {
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
      showToast('Fill-up updated')
      setEditEntry(null)
    } else {
      await callFn('fuel-insert', { row })
      showToast('Fill-up added')
      setShowAdd(false)
    }
    fetchLogs()
  }

  const handleDelete = async (id) => {
    await callFn('fuel-delete', { id })
    showToast('Entry deleted')
    fetchLogs()
    setConfirmDelete(null)
  }

  const handleAdminSuccess = (pass) => {
    setIsAdmin(true)
    setAdminPassword(pass)
    setShowLogin(false)
    showToast('Admin access granted')
  }

  // Compute MPG for all logs (sorted ascending by odometer for calculation)
  const logsWithMpg = computeMpg(logs)
  // Re-sort descending for display
  const displayLogs = [...logsWithMpg].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.id - a.id
  })

  // Stats
  const mpgValues = logsWithMpg.filter(l => l.mpg != null).map(l => l.mpg)
  const avgMpg = mpgValues.length >= 1 ? mpgValues.reduce((s, v) => s + v, 0) / mpgValues.length : null
  const odoValues = logs.map(l => l.odometer).filter(Boolean)
  const totalMiles = odoValues.length >= 2 ? Math.max(...odoValues) - Math.min(...odoValues) : null
  const costs = logs.map(l => l.fuel_cost).filter(v => v != null)
  const totalSpent = costs.length ? costs.reduce((s, v) => s + v, 0) : null

  // Chart data — last 10 with MPG, ascending by date
  const chartData = displayLogs
    .filter(l => l.mpg != null)
    .slice(0, 10)
    .reverse()

  const filteredLogs = filterByDate(displayLogs, dateFilter)

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
      `}</style>

      <Nav activeApp="fuel" dashboardUrl={DASHBOARD_URL} fuelUrl={FUEL_URL} />

      {/* Stats Header */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'TOTAL FILL-UPS', value: logs.length, color: '#94a3b8' },
            { label: 'AVG MPG', value: logs.length >= 2 ? `${fmt(avgMpg)} mpg` : '—', color: '#f59e0b' },
            { label: 'TOTAL MILES', value: totalMiles != null ? totalMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: '#10b981' },
            { label: 'TOTAL SPENT', value: totalSpent != null ? `$${totalSpent.toFixed(2)}` : '—', color: '#818cf8' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.value}</div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={fetchLogs} style={{
              background: 'none', border: '1px solid #2a2a35', color: '#6b7280',
              padding: '5px 12px', borderRadius: '4px', fontSize: '10px',
              fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              ↻ REFRESH
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Admin */}
      <div style={{ background: '#111116', borderBottom: '1px solid #2a2a35', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {[['fillups', 'FILL-UPS'], ['history', 'HISTORY']].map(([id, label]) => (
            <button key={id} className="tab-btn" onClick={() => setActiveTab(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: '11px', letterSpacing: '0.1em',
              color: activeTab === id ? '#f59e0b' : '#6b7280',
              borderBottom: activeTab === id ? '2px solid #f59e0b' : '2px solid transparent',
              fontFamily: 'inherit',
            }}>
              {label}
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
          <div style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center', padding: '48px' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
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
              }}>
                ADD FIRST FILL-UP
              </button>
            )}
          </div>
        ) : activeTab === 'fillups' ? (
          <>
            {/* MPG Trend Chart */}
            {chartData.length >= 2 && (
              <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', padding: '16px 16px 8px', marginBottom: '24px' }}>
                <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.12em', marginBottom: '12px' }}>MPG TREND (LAST {chartData.length} FILL-UPS)</div>
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
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 110px 80px 70px 90px 1fr', gap: '0', padding: '8px 14px', borderBottom: '1px solid #1e1e28' }}>
                {['DATE', 'ODOMETER', 'GALLONS', 'MPG', 'COST', 'LOCATION'].map(h => (
                  <div key={h} style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {displayLogs.slice(0, 5).map((log, i) => (
                <div key={log.id} className="task-row" style={{
                  display: 'grid', gridTemplateColumns: '100px 110px 80px 70px 90px 1fr',
                  gap: '0', padding: '9px 14px',
                  borderBottom: i < Math.min(displayLogs.length, 5) - 1 ? '1px solid #1e1e28' : 'none',
                  background: 'transparent',
                }}>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{fmtDate(log.date)}</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{log.odometer?.toLocaleString()} mi</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(log.fuel_amount, 3)} gal</div>
                  <div style={{ fontSize: '11px', color: log.mpg ? '#f59e0b' : '#4b5563' }}>
                    {log.mpg ? fmt(log.mpg) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: log.fuel_cost != null ? '#818cf8' : '#4b5563' }}>
                    {log.fuel_cost != null ? `$${log.fuel_cost.toFixed(2)}` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.location || '—'}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* HISTORY TAB */
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em', alignSelf: 'center' }}>DATE RANGE</div>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }}>
                {DATE_FILTERS.map(f => <option key={f}>{f}</option>)}
              </select>
              <span style={{ fontSize: '10px', color: '#4b5563', marginLeft: '4px' }}>
                {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div style={{ background: '#111116', border: '1px solid #1e1e28', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 110px 80px 70px 90px 80px 1fr auto', gap: '0', padding: '8px 14px', borderBottom: '1px solid #1e1e28' }}>
                {['DATE', 'ODOMETER', 'GALLONS', 'MPG', 'COST', '$/GAL', 'LOCATION', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '9px', color: '#4b5563', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>

              {filteredLogs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>
                  No entries for selected range
                </div>
              ) : filteredLogs.map((log, i) => (
                <div key={log.id} className="task-row" style={{
                  display: 'grid', gridTemplateColumns: '100px 110px 80px 70px 90px 80px 1fr auto',
                  gap: '0', padding: '9px 14px', alignItems: 'center',
                  borderBottom: i < filteredLogs.length - 1 ? '1px solid #1e1e28' : 'none',
                  background: 'transparent',
                }}>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{fmtDate(log.date)}</div>
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
                  <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>
                    {log.location || '—'}
                  </div>
                  {isAdmin && (
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
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      {isAdmin && logs.length > 0 && (
        <button className="fab" onClick={() => setShowAdd(true)} style={{
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
      {(showAdd) && <FillUpModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
      {editEntry && <FillUpModal entry={editEntry} onClose={() => setEditEntry(null)} onSave={handleSave} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
