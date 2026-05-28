import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CATEGORIES_ORDER = [
  "Engine & Drivetrain",
  "Fluids & Filters",
  "Brakes & Suspension",
  "Tires & Wheels",
  "Electrical & Battery",
  "Convertible Top",
  "Interior",
  "Exterior & Body",
];

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Not Started", "In Progress", "Done"];

const STATUS_COLOR = {
  "Not Started": "#6b7280",
  "In Progress": "#f59e0b",
  "Done": "#10b981",
};
const PRIORITY_COLOR = {
  "High": "#ef4444",
  "Medium": "#f97316",
  "Low": "#3b82f6",
};
const CAT_ICONS = {
  "Engine & Drivetrain": "⚙️",
  "Fluids & Filters": "🛢️",
  "Brakes & Suspension": "🔧",
  "Tires & Wheels": "🛞",
  "Electrical & Battery": "⚡",
  "Convertible Top": "🔄",
  "Interior": "🪑",
  "Exterior & Body": "🚗",
};

const BLANK_TASK = {
  task: "", category: CATEGORIES_ORDER[0], priority: "Medium",
  status: "Not Started", cost: "", notes: "",
};

// Shared input/select style builders
const inputStyle = (extra = {}) => ({
  background: "#0d0d0f", border: "1px solid #2a2a35", color: "#e2e8f0",
  padding: "7px 10px", borderRadius: "4px", fontSize: "12px",
  fontFamily: "inherit", width: "100%", outline: "none", ...extra,
});
const selectStyle = (extra = {}) => ({
  background: "#0d0d0f", border: "1px solid #2a2a35", color: "#cbd5e1",
  padding: "7px 10px", borderRadius: "4px", fontSize: "12px",
  fontFamily: "inherit", width: "100%", cursor: "pointer", outline: "none", ...extra,
});
const labelStyle = {
  display: "block", fontSize: "9px", color: "#4b5563",
  letterSpacing: "0.1em", marginBottom: "5px",
};

export default function MiniCooperTracker() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState({ category: "All", status: "All", priority: "All" });
  const [expandedTask, setExpandedTask] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin auth
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("adminSession") === "true");
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem("adminPass") || "");
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // New task modal
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ ...BLANK_TASK });
  const [saving, setSaving] = useState(false);

  // Delete confirm — stores the id of the task pending deletion
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Edit task modal
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("id")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setTasks(data || []);
        setLoading(false);
      });
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsAdmin(true);
        setAdminPassword(loginInput);
        sessionStorage.setItem("adminSession", "true");
        sessionStorage.setItem("adminPass", loginInput);
        setShowLogin(false);
        setLoginInput("");
      } else {
        setLoginError("Incorrect password.");
      }
    } catch {
      setLoginError("Login failed. Try again.");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminPassword("");
    sessionStorage.removeItem("adminSession");
    sessionStorage.removeItem("adminPass");
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const updateTask = async (id, changes) => {
    if (!isAdmin) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    await fetch(`${SUPABASE_URL}/functions/v1/admin-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, taskId: id, changes }),
    });
  };

  const createTask = async () => {
    if (!isAdmin || !newTask.task.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          task: {
            task: newTask.task.trim(),
            category: newTask.category,
            priority: newTask.priority,
            status: newTask.status,
            cost: newTask.cost !== "" ? newTask.cost : null,
            notes: newTask.notes || null,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.task) {
        setTasks(prev => [...prev, data.task]);
        setShowNewTask(false);
        setNewTask({ ...BLANK_TASK });
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const deleteTask = async (id) => {
    if (!isAdmin) return;
    // Optimistic remove
    setTasks(prev => prev.filter(t => t.id !== id));
    setExpandedTask(null);
    setConfirmDelete(null);
    await fetch(`${SUPABASE_URL}/functions/v1/admin-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, taskId: id }),
    });
  };

  const openEdit = (task) => {
    setEditForm({
      task:     task.task     || "",
      category: task.category || CATEGORIES_ORDER[0],
      priority: task.priority || "Medium",
      status:   task.status   || "Not Started",
      cost:     task.cost  ?? "",
      notes:    task.notes || "",
    });
    setEditTask(task);
  };

  const saveEdit = () => {
    if (!editTask || !editForm.task.trim()) return;
    updateTask(editTask.id, {
      task:     editForm.task.trim(),
      category: editForm.category,
      priority: editForm.priority,
      status:   editForm.status,
      cost:     editForm.cost !== "" ? editForm.cost : null,
      notes:    editForm.notes || null,
    });
    setEditTask(null);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filtered = tasks.filter(t =>
    (filter.category === "All" || t.category === filter.category) &&
    (filter.status === "All" || t.status === filter.status) &&
    (filter.priority === "All" || t.priority === filter.priority)
  );

  const totalCost = tasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
  const doneCost = tasks.filter(t => t.status === "Done").reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
  const doneCount = tasks.filter(t => t.status === "Done").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;
  const highPendingCount = tasks.filter(t => t.priority === "High" && t.status !== "Done").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const grouped = CATEGORIES_ORDER.reduce((acc, cat) => {
    acc[cat] = filtered.filter(t => t.category === cat);
    return acc;
  }, {});

  // ── Loading / error screens ───────────────────────────────────────────────

  if (loading) return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#f59e0b" }}>
      Loading...
    </div>
  );

  if (error) return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#ef4444", padding: "24px" }}>
      <div>
        <div style={{ fontSize: "14px", marginBottom: "8px" }}>Connection error:</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>{error}</div>
        <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "12px" }}>Check that your .env.local file has the correct Supabase URL and key.</div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0d0d0f", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a1f; }
        ::-webkit-scrollbar-thumb { background: #3a3a45; border-radius: 3px; }
        .task-row:hover { background: #1a1a22 !important; }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { opacity: 0.85; }
        select, input { outline: none; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; }
        .expand-row { animation: slideDown 0.15s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .progress-bar-inner { transition: width 0.5s ease; }
        select:disabled { opacity: 0.4; cursor: not-allowed; }
        input:disabled { opacity: 0.4; cursor: not-allowed; }
        .admin-btn { background: none; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.15s; padding: 0; }
        .admin-btn:hover { opacity: 0.6; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .fab { transition: transform 0.15s, box-shadow 0.15s; }
        .fab:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(245,158,11,0.45) !important; }
        .fab:active { transform: translateY(0); }
        .del-btn { background: none; border: 1px solid #3a3a45; color: #6b7280; padding: 4px 10px; border-radius: 3px; font-size: 10px; font-family: inherit; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; }
        .del-btn:hover { border-color: #ef4444; color: #ef4444; }
        .del-confirm-btn { border: none; padding: 4px 12px; border-radius: 3px; font-size: 10px; font-family: inherit; cursor: pointer; font-weight: 500; }
        .edit-btn { background: none; border: 1px solid #3a3a45; color: #6b7280; padding: 4px 10px; border-radius: 3px; font-size: 10px; font-family: inherit; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; }
        .edit-btn:hover { border-color: #f59e0b; color: #f59e0b; }
      `}</style>

      {/* ── Admin login modal ─────────────────────────────────────────────── */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => { setShowLogin(false); setLoginInput(""); setLoginError(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #2a2a35", borderRadius: "8px", padding: "24px 28px", width: "300px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.1em", color: "#f59e0b", marginBottom: "16px" }}>
              ADMIN LOGIN
            </div>
            <input
              type="password" autoFocus placeholder="Password"
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleLogin();
                if (e.key === "Escape") { setShowLogin(false); setLoginInput(""); setLoginError(""); }
              }}
              style={{ ...inputStyle(), marginBottom: "8px" }}
            />
            {loginError && <div style={{ fontSize: "11px", color: "#ef4444", marginBottom: "10px" }}>{loginError}</div>}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button onClick={() => { setShowLogin(false); setLoginInput(""); setLoginError(""); }}
                style={{ background: "none", border: "1px solid #3a3a45", color: "#6b7280", padding: "6px 14px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleLogin} disabled={loginLoading}
                style={{ background: "#f59e0b", border: "none", color: "#0d0d0f", padding: "6px 16px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer", fontWeight: 500, opacity: loginLoading ? 0.6 : 1 }}>
                {loginLoading ? "..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New task modal ────────────────────────────────────────────────── */}
      {showNewTask && (
        <div className="modal-overlay" onClick={() => { setShowNewTask(false); setNewTask({ ...BLANK_TASK }); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #2a2a35", borderRadius: "8px", padding: "24px 28px", width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.1em", color: "#f59e0b", marginBottom: "20px" }}>
              NEW TASK
            </div>

            {/* Task name */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>TASK NAME *</label>
              <input
                autoFocus type="text" placeholder="Describe the task..."
                value={newTask.task}
                onChange={e => setNewTask(p => ({ ...p, task: e.target.value }))}
                onKeyDown={e => e.key === "Escape" && setShowNewTask(false)}
                style={inputStyle()}
              />
            </div>

            {/* Category / Priority / Status row */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 160px" }}>
                <label style={labelStyle}>CATEGORY</label>
                <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))} style={selectStyle()}>
                  {CATEGORIES_ORDER.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <label style={labelStyle}>PRIORITY</label>
                <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={selectStyle()}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 110px" }}>
                <label style={labelStyle}>STATUS</label>
                <select value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))} style={selectStyle()}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Cost / Notes row */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "22px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 110px" }}>
                <label style={labelStyle}>ESTIMATED COST ($)</label>
                <input type="number" placeholder="0" value={newTask.cost}
                  onChange={e => setNewTask(p => ({ ...p, cost: e.target.value }))}
                  style={inputStyle({ color: "#818cf8" })}
                />
              </div>
              <div style={{ flex: "3 1 200px" }}>
                <label style={labelStyle}>NOTES</label>
                <input type="text" placeholder="Shop quotes, part numbers..." value={newTask.notes}
                  onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && createTask()}
                  style={inputStyle()}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNewTask(false); setNewTask({ ...BLANK_TASK }); }}
                style={{ background: "none", border: "1px solid #3a3a45", color: "#6b7280", padding: "7px 16px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={createTask} disabled={!newTask.task.trim() || saving}
                style={{ background: newTask.task.trim() ? "#f59e0b" : "#2a2a35", border: "none", color: newTask.task.trim() ? "#0d0d0f" : "#4b5563", padding: "7px 20px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: newTask.task.trim() ? "pointer" : "not-allowed", fontWeight: 500, transition: "all 0.15s" }}>
                {saving ? "Saving..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit task modal ──────────────────────────────────────────────── */}
      {editTask && (
        <div className="modal-overlay" onClick={() => setEditTask(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111116", border: "1px solid #2a2a35", borderRadius: "8px", padding: "24px 28px", width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "20px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.1em", color: "#f59e0b" }}>
                EDIT TASK
              </div>
              <div style={{ fontSize: "10px", color: "#3a3a45", letterSpacing: "0.06em" }}>#{editTask.id}</div>
            </div>

            {/* Task name */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>TASK NAME *</label>
              <input
                autoFocus type="text" placeholder="Describe the task..."
                value={editForm.task}
                onChange={e => setEditForm(p => ({ ...p, task: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                style={inputStyle()}
              />
            </div>

            {/* Category / Priority / Status */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 160px" }}>
                <label style={labelStyle}>CATEGORY</label>
                <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={selectStyle()}>
                  {CATEGORIES_ORDER.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <label style={labelStyle}>PRIORITY</label>
                <select value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))} style={selectStyle()}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 110px" }}>
                <label style={labelStyle}>STATUS</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={selectStyle()}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Cost / Notes */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "22px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 110px" }}>
                <label style={labelStyle}>ESTIMATED COST ($)</label>
                <input type="number" placeholder="0" value={editForm.cost}
                  onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
                  style={inputStyle({ color: "#818cf8" })}
                />
              </div>
              <div style={{ flex: "3 1 200px" }}>
                <label style={labelStyle}>NOTES</label>
                <input type="text" placeholder="Shop quotes, part numbers..."
                  value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                  style={inputStyle()}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditTask(null)}
                style={{ background: "none", border: "1px solid #3a3a45", color: "#6b7280", padding: "7px 16px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={!editForm.task?.trim()}
                style={{ background: editForm.task?.trim() ? "#f59e0b" : "#2a2a35", border: "none", color: editForm.task?.trim() ? "#0d0d0f" : "#4b5563", padding: "7px 20px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: editForm.task?.trim() ? "pointer" : "not-allowed", fontWeight: 500, transition: "all 0.15s" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#111116", borderBottom: "1px solid #2a2a35", padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "0.08em", color: "#fff", lineHeight: 1 }}>
              🏎 MINI COOPER REVIVAL
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.12em", marginTop: "4px" }}>
              2009 CONVERTIBLE — RESTORATION PROJECT TRACKER
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>OVERALL PROGRESS</div>
            <div style={{ fontSize: "22px", fontFamily: "'Bebas Neue', sans-serif", color: progressPct === 100 ? "#10b981" : "#f59e0b" }}>
              {progressPct}%
            </div>
            <div style={{ marginTop: "6px" }}>
              {isAdmin ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#10b981", border: "1px solid #10b981", padding: "2px 6px", borderRadius: "3px" }}>ADMIN</span>
                  <button className="admin-btn" onClick={handleLogout} style={{ fontSize: "10px", color: "#4b5563" }}>Logout</button>
                </div>
              ) : (
                <button className="admin-btn" onClick={() => setShowLogin(true)} style={{ fontSize: "10px", color: "#3a3a45" }}>
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px", background: "#2a2a35", borderRadius: "2px", height: "4px", overflow: "hidden" }}>
          <div className="progress-bar-inner" style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #10b981)", borderRadius: "2px" }} />
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "14px", flexWrap: "wrap" }}>
          {[
            { label: "TOTAL TASKS", value: tasks.length, color: "#94a3b8" },
            { label: "DONE", value: doneCount, color: "#10b981" },
            { label: "IN PROGRESS", value: inProgressCount, color: "#f59e0b" },
            { label: "HIGH PRIORITY PENDING", value: highPendingCount, color: "#ef4444" },
            { label: "ESTIMATED SPEND", value: `$${totalCost.toLocaleString()}`, color: "#818cf8" },
            { label: "SPENT (DONE)", value: `$${doneCost.toLocaleString()}`, color: "#34d399" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "9px", color: "#4b5563", letterSpacing: "0.12em" }}>{s.label}</div>
              <div style={{ fontSize: "18px", fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ background: "#111116", borderBottom: "1px solid #2a2a35", padding: "0 24px", display: "flex" }}>
        {["tasks", "summary"].map(tab => (
          <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 18px", fontSize: "11px", letterSpacing: "0.1em",
            color: activeTab === tab ? "#f59e0b" : "#6b7280",
            borderBottom: activeTab === tab ? "2px solid #f59e0b" : "2px solid transparent",
            fontFamily: "inherit",
          }}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 24px" }}>
        {activeTab === "tasks" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              {[
                { key: "category", options: ["All", ...CATEGORIES_ORDER] },
                { key: "status", options: ["All", ...STATUSES] },
                { key: "priority", options: ["All", ...PRIORITIES] },
              ].map(f => (
                <select key={f.key} value={filter[f.key]}
                  onChange={e => setFilter(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ background: "#1a1a22", border: "1px solid #2a2a35", color: "#cbd5e1", padding: "6px 10px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
              <button onClick={() => setFilter({ category: "All", status: "All", priority: "All" })}
                style={{ background: "none", border: "1px solid #3a3a45", color: "#6b7280", padding: "6px 12px", borderRadius: "4px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                Clear
              </button>
            </div>

            {/* Task groups */}
            {CATEGORIES_ORDER.map(cat => {
              const catTasks = grouped[cat];
              if (!catTasks || catTasks.length === 0) return null;
              const catDone = catTasks.filter(t => t.status === "Done").length;
              return (
                <div key={cat} style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #1e1e28" }}>
                    <span style={{ fontSize: "14px" }}>{CAT_ICONS[cat]}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em", color: "#94a3b8", fontSize: "13px" }}>{cat}</span>
                    <span style={{ marginLeft: "auto", fontSize: "10px", color: "#4b5563" }}>{catDone}/{catTasks.length} done</span>
                  </div>

                  {catTasks.map(task => (
                    <div key={task.id}>
                      {/* Task row */}
                      <div className="task-row"
                        onClick={() => {
                          if (expandedTask === task.id) { setExpandedTask(null); setConfirmDelete(null); setEditTask(null); }
                          else { setExpandedTask(task.id); setConfirmDelete(null); }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "8px 10px", borderRadius: "4px", cursor: "pointer",
                          background: expandedTask === task.id ? "#1a1a22" : "transparent",
                          borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
                          marginBottom: "2px",
                        }}>
                        <select
                          value={task.status}
                          disabled={!isAdmin}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateTask(task.id, { status: e.target.value })}
                          style={{
                            background: "#0d0d0f", border: "1px solid #2a2a35",
                            color: STATUS_COLOR[task.status], padding: "2px 6px",
                            borderRadius: "3px", fontSize: "10px", fontFamily: "inherit",
                            cursor: isAdmin ? "pointer" : "not-allowed", minWidth: "100px",
                          }}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <span className="pill" style={{ background: PRIORITY_COLOR[task.priority] + "22", color: PRIORITY_COLOR[task.priority], minWidth: "46px", textAlign: "center" }}>
                          {task.priority}
                        </span>
                        <span style={{ flex: 1, fontSize: "12px", color: task.status === "Done" ? "#4b5563" : "#cbd5e1", textDecoration: task.status === "Done" ? "line-through" : "none" }}>
                          {task.task}
                        </span>
                        {task.cost && (
                          <span style={{ fontSize: "11px", color: "#818cf8" }}>${parseFloat(task.cost).toLocaleString()}</span>
                        )}
                        <span style={{ fontSize: "10px", color: "#3a3a45" }}>{expandedTask === task.id ? "▲" : "▼"}</span>
                      </div>

                      {/* Expanded panel */}
                      {expandedTask === task.id && (
                        <div className="expand-row" style={{ background: "#13131a", border: "1px solid #2a2a35", borderRadius: "0 4px 4px 4px", padding: "12px 14px", marginBottom: "4px" }}>
                          {/* Cost + Notes */}
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: "160px" }}>
                              <div style={{ fontSize: "9px", color: "#4b5563", letterSpacing: "0.1em", marginBottom: "4px" }}>ESTIMATED COST ($)</div>
                              <input type="number" placeholder="0" value={task.cost ?? ""}
                                disabled={!isAdmin}
                                onChange={e => updateTask(task.id, { cost: e.target.value })}
                                style={{ background: "#0d0d0f", border: "1px solid #2a2a35", color: "#818cf8", padding: "5px 8px", borderRadius: "3px", fontSize: "12px", fontFamily: "inherit", width: "100%", cursor: isAdmin ? "text" : "not-allowed" }} />
                            </div>
                            <div style={{ flex: 3, minWidth: "200px" }}>
                              <div style={{ fontSize: "9px", color: "#4b5563", letterSpacing: "0.1em", marginBottom: "4px" }}>NOTES</div>
                              <input type="text" placeholder={isAdmin ? "Add notes, shop quotes, part numbers..." : ""}
                                value={task.notes || ""}
                                disabled={!isAdmin}
                                onChange={e => updateTask(task.id, { notes: e.target.value })}
                                style={{ background: "#0d0d0f", border: "1px solid #2a2a35", color: "#cbd5e1", padding: "5px 8px", borderRadius: "3px", fontSize: "12px", fontFamily: "inherit", width: "100%", cursor: isAdmin ? "text" : "not-allowed" }} />
                            </div>
                          </div>

                          {/* Admin action row — Edit (left) · Delete (right) */}
                          {isAdmin && (
                            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #1e1e28", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                              {/* Edit */}
                              <button className="edit-btn"
                                onClick={e => { e.stopPropagation(); setConfirmDelete(null); openEdit(task); }}>
                                Edit task
                              </button>

                              {/* Delete / confirm */}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {confirmDelete === task.id ? (
                                  <>
                                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Delete this task?</span>
                                    <button className="del-confirm-btn"
                                      onClick={() => setConfirmDelete(null)}
                                      style={{ background: "#1a1a22", color: "#6b7280" }}>
                                      Cancel
                                    </button>
                                    <button className="del-confirm-btn"
                                      onClick={() => deleteTask(task.id)}
                                      style={{ background: "#ef4444", color: "#fff" }}>
                                      Yes, delete
                                    </button>
                                  </>
                                ) : (
                                  <button className="del-btn"
                                    onClick={e => { e.stopPropagation(); setConfirmDelete(task.id); }}>
                                    Delete task
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}

        {activeTab === "summary" && (
          <div style={{ maxWidth: "600px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: "16px" }}>
              CATEGORY BREAKDOWN
            </div>
            {CATEGORIES_ORDER.map(cat => {
              const catTasks = tasks.filter(t => t.category === cat);
              if (catTasks.length === 0) return null;
              const done = catTasks.filter(t => t.status === "Done").length;
              const inProg = catTasks.filter(t => t.status === "In Progress").length;
              const pct = Math.round((done / catTasks.length) * 100);
              const catCost = catTasks.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);
              return (
                <div key={cat} style={{ marginBottom: "14px", background: "#111116", border: "1px solid #1e1e28", borderRadius: "6px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span>{CAT_ICONS[cat]}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em", fontSize: "14px" }}>{cat}</span>
                    <span style={{ marginLeft: "auto", fontSize: "10px", color: "#4b5563" }}>{done}/{catTasks.length}</span>
                    {catCost > 0 && <span style={{ fontSize: "11px", color: "#818cf8" }}>${catCost.toLocaleString()}</span>}
                  </div>
                  <div style={{ background: "#1a1a22", borderRadius: "2px", height: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#10b981" : "#f59e0b", borderRadius: "2px", transition: "width 0.4s" }} />
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                    <span style={{ fontSize: "10px", color: "#10b981" }}>✓ {done} done</span>
                    {inProg > 0 && <span style={{ fontSize: "10px", color: "#f59e0b" }}>◐ {inProg} in progress</span>}
                    <span style={{ fontSize: "10px", color: "#6b7280" }}>{catTasks.length - done - inProg} remaining</span>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: "20px", background: "#111116", border: "1px solid #2a2a35", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "14px", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: "10px" }}>COST SUMMARY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "#6b7280" }}>Total estimated</span>
                  <span style={{ color: "#818cf8" }}>${totalCost.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "#6b7280" }}>Spent (completed tasks)</span>
                  <span style={{ color: "#34d399" }}>${doneCost.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderTop: "1px solid #2a2a35", paddingTop: "6px" }}>
                  <span style={{ color: "#6b7280" }}>Remaining budget</span>
                  <span style={{ color: "#f59e0b" }}>${(totalCost - doneCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating + NEW TASK button (admin only) ───────────────────────── */}
      {isAdmin && (
        <button
          className="fab"
          onClick={() => setShowNewTask(true)}
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 50,
            background: "#f59e0b", border: "none", color: "#0d0d0f",
            padding: "13px 22px", borderRadius: "6px",
            fontSize: "12px", fontFamily: "inherit", fontWeight: 500,
            letterSpacing: "0.06em", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
          }}>
          + NEW TASK
        </button>
      )}
    </div>
  );
}
