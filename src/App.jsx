import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACTIVITY_LIST = ["Entraînement", "Fartage", "Course", "Administration"];
const CATEGORIES = ["U8", "U10", "U12", "U14", "U16", "U18", "Master"];
const ACTIVITIES_WITH_CATEGORIES = ["Entraînement", "Course"];
const DEFAULT_RATES = { "Entraînement": 28, "Fartage": 22, "Course": 25, "Administration": 20 };
const DEFAULT_BUDGETS = { "Entraînement": 5000, "Fartage": 2000, "Course": 3000, "Administration": 1500 };
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["L","M","M","J","V","S","D"];
// Saisons disponibles : Décembre → Avril
const SEASONS = [
  { label: "2025 / 2026", startYear: 2025 },
  { label: "2026 / 2027", startYear: 2026 },
];

function getSeasonMonths(startYear) {
  return [
    { year: startYear,     month: 11 }, // Décembre
    { year: startYear + 1, month: 0  }, // Janvier
    { year: startYear + 1, month: 1  }, // Février
    { year: startYear + 1, month: 2  }, // Mars
    { year: startYear + 1, month: 3  }, // Avril
  ];
}

const ACT_COLORS = {
  "Entraînement":  { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", bar: "#3b82f6" },
  "Fartage":       { bg: "rgba(16,185,129,0.15)",  text: "#34d399", bar: "#10b981" },
  "Course":        { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24", bar: "#f59e0b" },
  "Administration":{ bg: "rgba(168,85,247,0.15)",  text: "#c084fc", bar: "#a855f7" },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ activity }) {
  const c = ACT_COLORS[activity] || { bg: "rgba(255,255,255,0.1)", text: "#e2e8f0" };
  return <span style={{ background: c.bg, color: c.text, padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{activity}</span>;
}
function Card({ children, style = {} }) {
  return <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant = "primary", disabled = false, small = false, style = {} }) {
  const base = { border: "none", borderRadius: 10, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.5 : 1, ...style };
  const sizes = small ? { padding: "7px 14px", fontSize: 12 } : { padding: "12px 20px", fontSize: 14 };
  const variants = {
    primary: { background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "#fff" },
    danger:  { background: "linear-gradient(135deg,#ef4444,#f97316)", color: "#fff" },
    ghost:   { background: "rgba(255,255,255,0.06)", color: "#94a3b8" },
    success: { background: "linear-gradient(135deg,#10b981,#06b6d4)", color: "#fff" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes, ...variants[variant] }}>{children}</button>;
}
function Input({ label, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
      <input {...props} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
    </div>
  );
}
function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
      <select {...props} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", ...props.style }}>{children}</select>
    </div>
  );
}
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>{children}</h2>
      {sub && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

// ─── CALENDRIERS ──────────────────────────────────────────────────────────────
function CalendarPicker({ selected, onSelect, markedDates = [] }) {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const days = getDaysInMonth(y, m);
  const first = getFirstDay(y, m);
  const todayStr = today.toISOString().slice(0, 10);
  const prev = () => m === 0 ? (setM(11), setY(v => v-1)) : setM(v => v-1);
  const next = () => m === 11 ? (setM(0), setY(v => v+1)) : setM(v => v+1);
  return (
    <div style={{ background: "#0f1724", padding: 20, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prev} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>&#8249;</button>
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{MONTHS[m]} {y}</span>
        <button onClick={next} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>&#8250;</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: "center", color: "#334155", fontSize: 10, fontWeight: 800 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {Array(first).fill(null).map((_, i) => <div key={"e"+i} />)}
        {Array(days).fill(null).map((_, i) => {
          const day = i+1;
          const ds = y+"-"+String(m+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
          const isSel = selected === ds, isToday = ds === todayStr, hasEntry = markedDates.includes(ds);
          return (
            <div key={day} onClick={() => onSelect(ds)} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, cursor: "pointer", fontSize: 12, background: isSel ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : isToday ? "rgba(59,130,246,0.12)" : "transparent", color: isSel ? "#fff" : isToday ? "#60a5fa" : "#94a3b8", fontWeight: isSel||isToday ? 700 : 400, border: isToday&&!isSel ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent", position: "relative" }}>
              {day}
              {hasEntry && !isSel && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: "#34d399" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiCalendarPicker({ selectedDates, onToggle, markedDates = [] }) {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const days = getDaysInMonth(y, m);
  const first = getFirstDay(y, m);
  const todayStr = today.toISOString().slice(0, 10);
  const prev = () => m === 0 ? (setM(11), setY(v => v-1)) : setM(v => v-1);
  const next = () => m === 11 ? (setM(0), setY(v => v+1)) : setM(v => v+1);
  return (
    <div style={{ background: "#0f1724", padding: 20, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prev} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>&#8249;</button>
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{MONTHS[m]} {y}</span>
        <button onClick={next} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>&#8250;</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: "center", color: "#334155", fontSize: 10, fontWeight: 800 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {Array(first).fill(null).map((_, i) => <div key={"x"+i} />)}
        {Array(days).fill(null).map((_, i) => {
          const day = i+1;
          const ds = y+"-"+String(m+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
          const isSel = selectedDates.includes(ds), isToday = ds === todayStr, hasEntry = markedDates.includes(ds);
          return (
            <div key={day} onClick={() => onToggle(ds)} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, cursor: "pointer", fontSize: 12, background: isSel ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : isToday ? "rgba(59,130,246,0.12)" : "transparent", color: isSel ? "#fff" : isToday ? "#60a5fa" : "#94a3b8", fontWeight: isSel ? 700 : 400, border: isToday&&!isSel ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent", position: "relative" }}>
              {day}
              {hasEntry && !isSel && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: "#34d399" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, users }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const handle = () => {
    const u = (users || []).find(u => u.email === email && u.password === pwd);
    if (u) onLogin(u); else setErr("Identifiants incorrects");
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", fontFamily: "'Sora', sans-serif", position: "relative", overflow: "hidden", padding: "20px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", top: "10%", left: "20%", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#1e3a5f,#0f4c81)", border: "1px solid rgba(59,130,246,0.3)", marginBottom: 20, boxShadow: "0 0 40px rgba(59,130,246,0.15)" }}>
            <span style={{ fontSize: 32 }}>⛷️</span>
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Club Manager</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "6px 0 0" }}>Gestion des heures d'entraînement</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32 }}>
          {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>⚠️ {err}</div>}
          <form action="#" onSubmit={e => { e.preventDefault(); handle(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }} autoComplete="on">
            <div>
              <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Mot de passe</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <button type="submit" style={{ background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
              Se connecter →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function Shell({ user, tab, setTab, onLogout, children }) {
  const isAdmin = user.role === "admin";
  const isReferent = user.role === "referent" || user.is_referent === true;
  const coachTabs = [
    ["saisie","✏️","Saisie"],
    ["rapport","📊","Rapport"],
    ["calendrier","📅","Calendrier"],
    ["compte","👤","Compte"],
  ];
  const adminTabs = [["dashboard","🏠","Dashboard"],["rapports","📈","Rapports"],["budget","💰","Budgets"],["calendrier","📅","Calendrier"],["parametres","⚙️","Params"]];
  const tabs = isAdmin ? adminTabs : coachTabs;
  return (
    <div style={{ minHeight: "100vh", background: "#080d14", fontFamily: "'Sora', sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* Ligne 1 — Club Manager */}
      <div style={{ background: "#0a111d", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⛷️</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9", letterSpacing: -0.2 }}>Club Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b", fontSize: 11 }}>{isAdmin ? "👑" : isReferent ? "🎿⭐" : "🎿"} {user.name}</span>
          <button onClick={onLogout} style={{ padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Quitter</button>
        </div>
      </div>
      {/* Ligne 2 — Onglets (scrollable horizontal sur mobile) */}
      <div style={{ background: "#0c1422", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", flexShrink: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {tabs.map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 16px", border: "none", background: tab === k ? "rgba(59,130,246,0.1)" : "transparent", color: tab === k ? "#60a5fa" : "#475569", fontWeight: tab === k ? 600 : 400, fontSize: 11, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === k ? "2px solid #3b82f6" : "2px solid transparent", marginBottom: -1, transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {/* Contenu */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>{children}</div>
    </div>
  );
}

// ─── COACH : SAISIE ───────────────────────────────────────────────────────────
function CoachSaisie({ user, entries, dbOps }) {
  const [selectedDates, setSelectedDates] = useState([new Date().toISOString().slice(0,10)]);
  const [showCal, setShowCal] = useState(false);
  const [activity, setActivity] = useState(ACTIVITY_LIST[0]);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState([]);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const myEntries = entries.filter(e => e.coachId === user.id);
  const markedDates = myEntries.map(e => e.date);
  const showCats = ACTIVITIES_WITH_CATEGORIES.includes(activity);
  const todayEntries = myEntries.filter(e => selectedDates.includes(e.date) && selectedDates.length === 1);

  const toggleDate = (d) => setSelectedDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const toggleCat = (cat) => setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const resetForm = () => { setHours(""); setNote(""); setActivity(ACTIVITY_LIST[0]); setCategories([]); setEditId(null); setSelectedDates([new Date().toISOString().slice(0,10)]); };
  const formatDate = (d) => new Date(d+"T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const handleSave = async () => {
    if (!hours || parseFloat(hours) <= 0) return;
    if (showCats && categories.length === 0) return;
    if (selectedDates.length === 0) return;
    setSaving(true);
    const h = parseFloat(hours);
    if (editId) {
      await dbOps.updateEntry(editId, { activity, date: selectedDates[0], hours: h, note, categories: showCats ? categories : [] });
      setEditId(null);
    } else {
      for (const date of selectedDates) {
        await dbOps.addEntry({ coachId: user.id, coachName: user.name, activity, date, hours: h, note, categories: showCats ? categories : [] });
      }
    }
    resetForm(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const handleEdit = (e) => { setEditId(e.id); setActivity(e.activity); setHours(String(e.hours)); setNote(e.note); setSelectedDates([e.date]); setCategories(e.categories || []); };
  const handleDelete = async (id) => { await dbOps.deleteEntry(id); setDeleteId(null); };

  const fieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: "100%" }}>
      <SectionTitle sub="Saisissez vos heures pour la ou les dates sélectionnées">Saisie des heures</SectionTitle>
      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>{editId ? "✏️ Modifier la saisie" : "➕ Nouvelle saisie"}</h3>
        {saved && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", color: "#34d399", fontSize: 13, marginBottom: 16 }}>✅ {selectedDates.length > 1 ? `${selectedDates.length} saisies enregistrées !` : "Saisie enregistrée !"}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Dates */}
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Date(s) <span style={{ color: "#ef4444" }}>*</span>
              {selectedDates.length > 1 && <span style={{ color: "#34d399", fontWeight: 600, marginLeft: 8 }}>({selectedDates.length} jours)</span>}
            </label>
            {selectedDates.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {[...selectedDates].sort().map(d => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "4px 10px" }}>
                    <span style={{ color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>📅 {formatDate(d)}</span>
                    {!editId && <span onClick={() => toggleDate(d)} style={{ color: "#334155", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>×</span>}
                  </div>
                ))}
              </div>
            )}
            <div onClick={() => setShowCal(!showCal)} style={{ background: "rgba(255,255,255,0.04)", border: showCal ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#64748b", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
              <span>{showCal ? "Fermer le calendrier" : "📅 Ajouter / modifier des dates"}</span>
              <span style={{ fontSize: 11 }}>{showCal ? "▲" : "▼"}</span>
            </div>
            {showCal && (
              <div style={{ marginTop: 6, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: "rgba(59,130,246,0.06)", padding: "8px 14px", fontSize: 11, color: "#475569" }}>💡 Cliquez sur plusieurs jours pour les sélectionner. Recliquez pour désélectionner.</div>
                <MultiCalendarPicker selectedDates={selectedDates} onToggle={toggleDate} markedDates={markedDates} />
              </div>
            )}
          </div>

          {/* Activité */}
          <Select label="Activité" value={activity} onChange={e => { setActivity(e.target.value); setCategories([]); }}>
            {ACTIVITY_LIST.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>

          {/* Catégories */}
          {showCats && (
            <div>
              <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Catégories <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const sel = categories.includes(cat);
                  return <div key={cat} onClick={() => toggleCat(cat)} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, cursor: "pointer", border: `2px solid ${sel ? "#3b82f6" : "rgba(255,255,255,0.08)"}`, background: sel ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", color: sel ? "#60a5fa" : "#475569", fontWeight: sel ? 700 : 400, fontSize: 13, userSelect: "none" }}>{cat}{sel && <div style={{ fontSize: 10, marginTop: 2, color: "#34d399" }}>✓</div>}</div>;
                })}
              </div>
              {categories.length === 0 && <div style={{ color: "#f87171", fontSize: 11, marginTop: 6 }}>⚠️ Sélectionnez au moins une catégorie</div>}
            </div>
          )}

          {/* Heures */}
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Heures effectuées par journée<span style={{ color: "#ef4444" }}>*</span></label>
            <select value={hours} onChange={e => setHours(e.target.value)} style={{ ...fieldStyle, background: !hours ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.04)", border: !hours ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", color: hours ? "#000" : "#64748b" }}>
              <option value="">— Sélectionner —</option>
              {[1,1.5,2,2.5,3,3.5,4,5,6,7,8].map(h => <option key={h} value={h}>{h}h</option>)}
            </select>
            {!hours && <div style={{ color: "#f87171", fontSize: 11, marginTop: 5 }}>⚠️ Les heures sont obligatoires</div>}
          </div>

          <Input label="Note (optionnel)" placeholder="Groupe, remarques..." value={note} onChange={e => setNote(e.target.value)} />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={handleSave} disabled={!hours || saving || selectedDates.length === 0 || (showCats && categories.length === 0)} style={{ flex: 1 }}>
              {saving ? "Enregistrement..." : editId ? "Modifier" : selectedDates.length > 1 ? `Enregistrer (${selectedDates.length} jours)` : "Enregistrer"}
            </Btn>
            {editId && <Btn variant="ghost" onClick={resetForm}>Annuler</Btn>}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
          <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 22 }}>{myEntries.reduce((s,e) => s+e.hours, 0)}h</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Total heures</div>
        </div>
        <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 22 }}>{myEntries.length}</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Séances</div>
        </div>
      </div>

      {/* Saisies du jour */}
      {todayEntries.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>Saisies pour ce jour</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayEntries.map(e => (
              <div key={e.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge activity={e.activity} />
                    {e.categories && e.categories.map(c => <span key={c} style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{c}</span>)}
                    <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{e.hours}h</span>
                    {e.note && <span style={{ color: "#475569", fontSize: 12 }}>— {e.note}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => handleEdit(e)}>✏️</Btn>
                    <Btn small variant="danger" onClick={() => setDeleteId(e.id)}>🗑️</Btn>
                  </div>
                </div>
                {deleteId === e.id && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 14px", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#f87171", fontSize: 13 }}>⚠️ Confirmer la suppression ?</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small variant="danger" onClick={() => handleDelete(e.id)}>Supprimer</Btn>
                      <Btn small variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── COACH : RAPPORT ──────────────────────────────────────────────────────────
function CoachRapport({ user, entries, dbOps }) {
  const [filterMonth, setFilterMonth] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [editHoursId, setEditHoursId] = useState(null);
  const [editHoursVal, setEditHoursVal] = useState("");

  const myEntries = entries.filter(e => e.coachId === user.id);
  const months = [...new Set(myEntries.map(e => e.date.slice(0,7)))].sort().reverse();
  const filtered = filterMonth === "all" ? myEntries : myEntries.filter(e => e.date.startsWith(filterMonth));
  const totalHours = filtered.reduce((s,e) => s+e.hours, 0);

  const byActivity = ACTIVITY_LIST.map(a => {
    const aes = filtered.filter(e => e.activity === a);
    const hours = aes.reduce((s,e) => s+e.hours, 0);
    const hasCategories = ACTIVITIES_WITH_CATEGORIES.includes(a);
    const byCategory = hasCategories ? CATEGORIES.map(cat => ({ cat, hours: aes.filter(e => e.categories && e.categories.includes(cat)).reduce((s,e) => s+e.hours, 0) })).filter(x => x.hours > 0) : [];
    return { activity: a, hours, count: aes.length, hasCategories, byCategory };
  }).filter(x => x.hours > 0);

  const handleDelete = async (id) => { await dbOps.deleteEntry(id); setDeleteId(null); };
  const handleEditHours = (id) => { const e = entries.find(x => x.id === id); setEditHoursVal(String(e.hours)); setEditHoursId(id); setDeleteId(null); };
  const handleSaveHours = async (id) => { const v = parseFloat(editHoursVal); if (!isNaN(v) && v > 0) { await dbOps.updateEntry(id, { hours: v }); } setEditHoursId(null); setEditHoursVal(""); };

  return (
    <div>
      <SectionTitle sub="Visualisez vos heures par activité">Mon rapport d'activité</SectionTitle>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Select label="Filtrer par mois" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: 150, flex: "1 1 140px" }}>
          <option value="all">Tous les mois</option>
          {months.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split("-")[1])-1]} {m.split("-")[0]}</option>)}
        </Select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[{ label: "Total heures", value: `${totalHours}h`, color: "#60a5fa", icon: "⏱️" }, { label: "Séances", value: filtered.length, color: "#34d399", icon: "📋" }, { label: "Activités", value: byActivity.length, color: "#fbbf24", icon: "🎿" }].map(k => (
          <Card key={k.label} style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 28 }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par activité</h3>
          {byActivity.length === 0 && <p style={{ color: "#334155", fontSize: 13 }}>Aucune donnée</p>}
          {byActivity.map(a => (
            <div key={a.activity} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Badge activity={a.activity} /><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{a.hours}h</span></div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 6 }}><div style={{ background: ACT_COLORS[a.activity]?.bar || "#3b82f6", height: "100%", borderRadius: 99, width: `${(a.hours/totalHours)*100}%` }} /></div>
              <div style={{ color: "#334155", fontSize: 11, marginTop: 4 }}>{a.count} séance{a.count>1?"s":""} — {Math.round((a.hours/totalHours)*100)}%</div>
              {a.hasCategories && a.byCategory.length > 0 && (
                <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: "2px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.byCategory.map(c => (
                    <div key={c.cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{c.cat}</span>
                      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>{c.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Historique des saisies</h3>
          <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>{new Date(e.date+"T00:00:00").toLocaleDateString("fr-FR")}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Badge activity={e.activity} />
                      {e.categories && e.categories.map(c => <span key={c} style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{c}</span>)}
                      {e.note && <span style={{ color: "#334155", fontSize: 11 }}>{e.note}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {editHoursId === e.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <select value={editHoursVal} onChange={ev => setEditHoursVal(ev.target.value)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 6, padding: "3px 6px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit" }}>
                          {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}h</option>)}
                        </select>
                        <Btn small variant="success" onClick={() => handleSaveHours(e.id)}>✓</Btn>
                        <Btn small variant="ghost" onClick={() => setEditHoursId(null)}>✕</Btn>
                      </div>
                    ) : <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>{e.hours}h</span>}
                    <Btn small variant="ghost" onClick={() => handleEditHours(e.id)}>✏️</Btn>
                    <Btn small variant="danger" onClick={() => setDeleteId(e.id)}>🗑️</Btn>
                  </div>
                </div>
                {deleteId === e.id && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#f87171", fontSize: 13 }}>⚠️ Confirmer la suppression ?</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small variant="danger" onClick={() => handleDelete(e.id)}>Supprimer</Btn>
                      <Btn small variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN : DASHBOARD ────────────────────────────────────────────────────────
function AdminDashboard({ entries, rates, budgets }) {
  const coaches = ["Jean Dupont","Marie Martin","Broisou"];
  const totalHours = entries.reduce((s,e) => s+e.hours, 0);
  const totalCost = entries.reduce((s,e) => s+e.hours*(rates[e.activity]||0), 0);
  const totalBudget = Object.values(budgets).reduce((s,v) => s+v, 0);

  const coachStats = [...new Set(entries.map(e => e.coachName))].map(name => {
    const ces = entries.filter(e => e.coachName === name);
    return { name, hours: ces.reduce((s,e) => s+e.hours,0), cost: ces.reduce((s,e) => s+e.hours*(rates[e.activity]||0),0), sessions: ces.length };
  });

  const actStats = ACTIVITY_LIST.map(a => {
    const aes = entries.filter(e => e.activity === a);
    const h = aes.reduce((s,e) => s+e.hours, 0);
    const cost = h*(rates[a]||0);
    const budget = budgets[a]||0;
    return { activity: a, hours: h, cost, budget, remaining: budget-cost, pct: budget ? Math.min((cost/budget)*100,100) : 0 };
  });

  return (
    <div>
      <SectionTitle sub="Vue d'ensemble du club">Dashboard</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[{ label: "Heures totales", value: `${totalHours}h`, color: "#60a5fa", icon: "⏱️" }, { label: "Coût total", value: fmt(totalCost), color: "#34d399", icon: "💶" }, { label: "Budget total", value: fmt(totalBudget), color: "#fbbf24", icon: "🏦" }, { label: "Restant", value: fmt(totalBudget-totalCost), color: totalBudget-totalCost>=0?"#a78bfa":"#f87171", icon: totalBudget-totalCost>=0?"📊":"⚠️" }].map(k => (
          <Card key={k.label} style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 22 }}>{k.value}</div>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par entraîneur</h3>
          {coachStats.map(c => (
            <div key={c.name} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🎿 {c.name}</span>
                <div style={{ display: "flex", gap: 16 }}><span style={{ color: "#60a5fa", fontWeight: 700 }}>{c.hours}h</span><span style={{ color: "#34d399", fontWeight: 700 }}>{fmt(c.cost)}</span></div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 6 }}><div style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", height: "100%", borderRadius: 99, width: `${totalHours?(c.hours/Math.max(...coachStats.map(x=>x.hours)))*100:0}%` }} /></div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Budget par activité</h3>
          {actStats.map(a => (
            <div key={a.activity} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                <Badge activity={a.activity} />
                <span style={{ color: a.remaining>=0?"#34d399":"#f87171", fontWeight: 700, fontSize: 13 }}>{fmt(a.remaining)}{a.remaining<0?" ⚠️":""}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 8, overflow: "hidden" }}><div style={{ background: a.remaining<0?"linear-gradient(90deg,#ef4444,#f97316)":ACT_COLORS[a.activity]?.bar||"#3b82f6", height: "100%", borderRadius: 99, width: `${a.pct}%` }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span style={{ color: "#334155", fontSize: 10 }}>{fmt(a.cost)} dépensé</span><span style={{ color: "#334155", fontSize: 10 }}>{fmt(a.budget)} budget</span></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── CALENDRIER COMPOSANTS ───────────────────────────────────────────────────

// Mini calendar month view for the planning
function CalMois({ yearMonth, events, selectedDates, onToggleDate, onDeleteEvent, canEditDays = false }) {
  const { year, month } = yearMonth;
  const days = getDaysInMonth(year, month);
  const first = getFirstDay(year, month);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      {/* Header mois */}
      <div style={{ background: "rgba(59,130,246,0.12)", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#60a5fa" }}>{MONTHS[month]} {year}</span>
      </div>
      {/* Grille jours */}
      <div style={{ padding: 12 }}>
        {/* Entêtes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {["L","M","M","J","V","S","D"].map((d,i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#334155", fontWeight: 700, padding: "2px 0" }}>{d}</div>
          ))}
        </div>
        {/* Jours */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {Array(first).fill(null).map((_, i) => <div key={"e"+i} />)}
          {Array(days).fill(null).map((_, i) => {
            const day = i + 1;
            const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dayEvents = events.filter(e => e.date === ds);
            const isToday = ds === today;
            const isSel = selectedDates && selectedDates.includes(ds);
            const hasEntr = dayEvents.some(e => e.activity === "Entraînement");
            const hasCourse = dayEvents.some(e => e.activity === "Course");
            return (
              <div key={day} style={{ minHeight: 44, borderRadius: 6, background: isSel ? "rgba(59,130,246,0.2)" : isToday ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)", border: isSel ? "2px solid rgba(59,130,246,0.6)" : isToday ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent", padding: "3px", cursor: "pointer", position: "relative" }}
                onClick={() => onToggleDate(ds)}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#60a5fa" : "#94a3b8", marginBottom: 2, textAlign: "right", paddingRight: 2 }}>{day}</div>
                {hasEntr && <div style={{ background: ACT_COLORS["Entraînement"].bg, borderLeft: `2px solid ${ACT_COLORS["Entraînement"].bar}`, borderRadius: 3, padding: "1px 4px", fontSize: 9, color: ACT_COLORS["Entraînement"].text, fontWeight: 600, marginBottom: 1, lineHeight: 1.4 }}>
                  Entr. {dayEvents.filter(e=>e.activity==="Entraînement").map(e=>e.categories?.join(",")).join(" / ")}
                </div>}
                {hasCourse && <div style={{ background: ACT_COLORS["Course"].bg, borderLeft: `2px solid ${ACT_COLORS["Course"].bar}`, borderRadius: 3, padding: "1px 4px", fontSize: 9, color: ACT_COLORS["Course"].text, fontWeight: 600, lineHeight: 1.4 }}>
                  Course {dayEvents.filter(e=>e.activity==="Course").map(e=>e.categories?.join(",")).join(" / ")}
                </div>}
                {dayEvents.length > 0 && canEditDays && (
                  <div style={{ position: "absolute", top: 2, left: 2, cursor: "pointer", fontSize: 9, color: "#ef4444", fontWeight: 700, lineHeight: 1 }}
                    onClick={ev => { ev.stopPropagation(); onDeleteEvent(ds); }}>x</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Modal pour ajouter un événement au calendrier
function AddEventModal({ dates, onSave, onClose, coaches }) {
  const [activity, setActivity] = useState("Entrainement");
  const [categories, setCategories] = useState([]);
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("2");
  const [selectedCoach, setSelectedCoach] = useState(coaches.length > 0 ? coaches[0].id : null);
  const isCourse = activity === "Course";
  const canSave = categories.length > 0 && (!isCourse || note.trim().length > 0) && hours && selectedCoach;
  const toggleCat = (c) => setCategories(p => p.includes(c) ? p.filter(x=>x!==c) : [...p, c]);
  const fStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const formatDate = (d) => new Date(d+"T00:00:00").toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#f1f5f9" }}>Ajouter une activite</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[...dates].sort().map(d => (
                <span key={d} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "2px 9px", fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>
                  {formatDate(d)}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#94a3b8", cursor: "pointer", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>x</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Activite</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Entrainement","Course"].map(a => (
                <div key={a} onClick={() => { setActivity(a); setCategories([]); }} style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, cursor: "pointer", border: "2px solid " + (activity===a ? (ACT_COLORS[a] ? ACT_COLORS[a].bar : "#3b82f6") : "rgba(255,255,255,0.08)"), background: activity===a ? (ACT_COLORS[a] ? ACT_COLORS[a].bg : "rgba(59,130,246,0.15)") : "rgba(255,255,255,0.02)", color: activity===a ? (ACT_COLORS[a] ? ACT_COLORS[a].text : "#60a5fa") : "#475569", fontWeight: activity===a ? 700 : 400, fontSize: 13, userSelect: "none" }}>{a}</div>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Categories <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(65px, 1fr))", gap: 6 }}>
              {CATEGORIES.map(cat => {
                const sel = categories.includes(cat);
                return <div key={cat} onClick={() => toggleCat(cat)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, cursor: "pointer", border: "2px solid " + (sel ? "#3b82f6" : "rgba(255,255,255,0.08)"), background: sel ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)", color: sel ? "#60a5fa" : "#475569", fontSize: 12, fontWeight: sel ? 700 : 400, userSelect: "none" }}>{cat}</div>;
              })}
            </div>
            {categories.length === 0 && <p style={{ color: "#f87171", fontSize: 11, margin: "5px 0 0" }}>Selectionnez au moins une categorie</p>}
          </div>
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Entraineur <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {coaches.map(c => {
                const sel = selectedCoach === c.id;
                return (
                  <div key={c.id} onClick={() => setSelectedCoach(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: "2px solid " + (sel ? "#3b82f6" : "rgba(255,255,255,0.08)"), background: sel ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)", userSelect: "none" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: sel ? "#3b82f6" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <span style={{ color: sel ? "#e2e8f0" : "#64748b", fontSize: 13, fontWeight: sel ? 600 : 400 }}>🎿 {c.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Heures <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={hours} onChange={e => setHours(e.target.value)} style={fStyle}>
              {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}h</option>)}
            </select>
          </div>
          {isCourse && (
            <div>
              <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Note course <span style={{ color: "#ef4444" }}>*</span></label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Slalom geant, depart 9h..." style={fStyle} />
              {!note.trim() && <p style={{ color: "#f87171", fontSize: 11, margin: "5px 0 0" }}>Note obligatoire pour une course</p>}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn onClick={() => { const coach = coaches.find(c => c.id === selectedCoach); onSave({ activity, categories, hours: parseInt(hours), note, coachId: selectedCoach, coachName: coach ? coach.name : "" }); }} disabled={!canSave} style={{ flex: 1 }}>
              {dates.length > 1 ? "Ajouter (" + dates.length + " jours)" : "Ajouter"}
            </Btn>
            <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendrierView({ user, calEvents, dbOps, rates, isAdmin = false, canEdit = false, users = [] }) {
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[0].startYear);
  const calendarMonths = getSeasonMonths(selectedSeason);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteDate, setDeleteDate] = useState(null);

  // All coaches (role coach)
  const coaches = users.filter(u => u.role === "coach");

  const toggleDate = (date) => {
    if (!canEdit) return;
    setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const openModal = () => {
    if (selectedDates.length === 0 || !canEdit) return;
    setShowModal(true);
  };

  const handleSaveEvent = async ({ activity, categories, hours, note, coachId, coachName }) => {
    for (const date of selectedDates) {
      await dbOps.addCalEvent({ coachId, coachName, activity, date, categories, hours, note });
    }
    setShowModal(false);
    setSelectedDates([]);
  };

  const handleDeleteDay = async (date) => {
    const toDelete = calEvents.filter(e => e.date === date);
    for (const e of toDelete) await dbOps.deleteCalEvent(e.id);
    setDeleteDate(null);
  };

  const totalEntrHours = calEvents.filter(e => e.activity === "Entraînement").reduce((s,e) => s+e.hours, 0);
  const totalCourseHours = calEvents.filter(e => e.activity === "Course").reduce((s,e) => s+e.hours, 0);
  const costEntr = totalEntrHours * (rates ? (rates["Entraînement"] || 0) : 0);
  const costCourse = totalCourseHours * (rates ? (rates["Course"] || 0) : 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Calendrier</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>{canEdit ? "Cliquez sur plusieurs jours pour les selectionner, puis ajoutez une activite" : "Planning de l equipe - Decembre a Avril"}</p>
        </div>
        {/* Sélecteur de saison */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SEASONS.map(s => (
            <button key={s.startYear} onClick={() => { setSelectedSeason(s.startYear); setSelectedDates([]); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: selectedSeason === s.startYear ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "rgba(255,255,255,0.06)", color: selectedSeason === s.startYear ? "#fff" : "#64748b", fontWeight: selectedSeason === s.startYear ? 700 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ⛷️ {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton ajouter + dates sélectionnées — visible seulement si canEdit */}
      {canEdit && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <Btn onClick={openModal} disabled={selectedDates.length === 0} variant="primary" small>
              {selectedDates.length === 0 ? "Selectionnez des jours" : "Ajouter activite (" + selectedDates.length + " jour" + (selectedDates.length > 1 ? "s" : "") + ")"}
            </Btn>
            {selectedDates.length > 0 && (
              <Btn variant="ghost" small onClick={() => setSelectedDates([])}>Effacer selection</Btn>
            )}
          </div>
          {selectedDates.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[...selectedDates].sort().map(d => (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "3px 10px" }}>
                  <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>{new Date(d+"T00:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
                  <span onClick={() => toggleDate(d)} style={{ color: "#475569", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>x</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!canEdit && (
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
          👁️ Lecture seule — Seuls les référents et l'admin peuvent ajouter des activités
        </p>
      )}

      {/* Legende */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {["Entraînement","Course"].map(a => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, background: ACT_COLORS[a] ? ACT_COLORS[a].bg : "rgba(255,255,255,0.1)", border: "1px solid " + (ACT_COLORS[a] ? ACT_COLORS[a].bar : "#fff"), borderRadius: 99, padding: "4px 10px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACT_COLORS[a] ? ACT_COLORS[a].bar : "#fff" }} />
            <span style={{ color: ACT_COLORS[a] ? ACT_COLORS[a].text : "#fff", fontSize: 11, fontWeight: 600 }}>{a}</span>
          </div>
        ))}
        <span style={{ color: "#64748b", fontSize: 11, alignSelf: "center" }}>← Bleu = jour selectionne</span>
      </div>

      {/* Mois */}
      {calendarMonths.map(ym => (
        <CalMois
          key={ym.year+"-"+ym.month}
          yearMonth={ym}
          events={calEvents}
          selectedDates={selectedDates}
          onToggleDate={toggleDate}
          onDeleteEvent={(date) => setDeleteDate(date)}
          canEditDays={canEdit}
        />
      ))}

      {/* Confirmation suppression */}
      {deleteDate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, textAlign: "center" }}>
            <p style={{ color: "#f87171", fontSize: 14, marginBottom: 16 }}>Supprimer toutes les activites du {new Date(deleteDate+"T00:00:00").toLocaleDateString("fr-FR")} ?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn variant="danger" onClick={() => handleDeleteDay(deleteDate)}>Supprimer</Btn>
              <Btn variant="ghost" onClick={() => setDeleteDate(null)}>Annuler</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout */}
      {showModal && selectedDates.length > 0 && (
        <AddEventModal dates={selectedDates} onSave={handleSaveEvent} onClose={() => setShowModal(false)} coaches={coaches} />
      )}

      {/* Résumé heures par entraîneur — visible par tous */}
      {(() => { const seasonEvents = calEvents.filter(e => { const d = new Date(e.date+'T00:00:00'); return calendarMonths.some(m => m.year === d.getFullYear() && m.month === d.getMonth()); }); return seasonEvents.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#94a3b8" }}>🎿 Heures cumulées par entraîneur</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...new Set(calEvents.map(e => e.coachName))].sort().map(name => {
              const ces = calEvents.filter(e => e.coachName === name);
              const entr = ces.filter(e => e.activity === "Entraînement").reduce((s,e) => s+e.hours, 0);
              const course = ces.filter(e => e.activity === "Course").reduce((s,e) => s+e.hours, 0);
              const total = entr + course;
              return (
                <div key={name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: entr > 0 || course > 0 ? 10 : 0 }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>🎿 {name}</span>
                    <span style={{ color: "#60a5fa", fontWeight: 800, fontSize: 16 }}>{total}h</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {entr > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].bg : "rgba(59,130,246,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].bar : "#3b82f6" }} />
                        <span style={{ color: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].text : "#60a5fa", fontSize: 12, fontWeight: 600 }}>Entraînement : {entr}h</span>
                      </div>
                    )}
                    {course > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: ACT_COLORS["Course"] ? ACT_COLORS["Course"].bg : "rgba(245,158,11,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACT_COLORS["Course"] ? ACT_COLORS["Course"].bar : "#f59e0b" }} />
                        <span style={{ color: ACT_COLORS["Course"] ? ACT_COLORS["Course"].text : "#fbbf24", fontSize: 12, fontWeight: 600 }}>Course : {course}h</span>
                      </div>
                    )}
                  </div>
                  {/* Barre de progression */}
                  {total > 0 && (() => {
                    const allNames = [...new Set(calEvents.map(e => e.coachName))];
                    const maxHours = Math.max(...allNames.map(n => calEvents.filter(e=>e.coachName===n).reduce((s,e)=>s+e.hours,0)), 1);
                    return (
                      <div style={{ marginTop: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, width: ((total/maxHours)*100)+"%" , background: "linear-gradient(90deg,#3b82f6,#60a5fa)", transition: "width .4s" }} />
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Total global */}
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Total heures planifiées</span>
            <div style={{ display: "flex", gap: 16 }}>
              {seasonEvents.filter(e=>e.activity==="Entraînement").reduce((s,e)=>s+e.hours,0) > 0 && (
                <span style={{ color: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].text : "#60a5fa", fontSize: 13 }}>
                  Entr: {seasonEvents.filter(e=>e.activity==="Entraînement").reduce((s,e)=>s+e.hours,0)}h
                </span>
              )}
              {seasonEvents.filter(e=>e.activity==="Course").reduce((s,e)=>s+e.hours,0) > 0 && (
                <span style={{ color: ACT_COLORS["Course"] ? ACT_COLORS["Course"].text : "#fbbf24", fontSize: 13 }}>
                  Course: {seasonEvents.filter(e=>e.activity==="Course").reduce((s,e)=>s+e.hours,0)}h
                </span>
              )}
              <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 16 }}>
                {seasonEvents.reduce((s,e)=>s+e.hours,0)}h
              </span>
            </div>
          </div>
        </div>
      ); })()}

      {/* Couts admin */}
      {isAdmin && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#94a3b8" }}>Couts planifies</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Entrainements", hours: totalEntrHours, cost: costEntr, color: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].text : "#60a5fa", bg: ACT_COLORS["Entraînement"] ? ACT_COLORS["Entraînement"].bg : "rgba(59,130,246,0.1)" },
              { label: "Courses",       hours: totalCourseHours, cost: costCourse, color: ACT_COLORS["Course"] ? ACT_COLORS["Course"].text : "#fbbf24", bg: ACT_COLORS["Course"] ? ACT_COLORS["Course"].bg : "rgba(245,158,11,0.1)" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ color: s.color, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{s.label}</div>
                <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 20 }}>{fmt(s.cost)}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.hours}h planifiees</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Cout total planifie</span>
            <span style={{ color: "#34d399", fontWeight: 800, fontSize: 20 }}>{fmt(costEntr + costCourse)}</span>
          </div>
          {calEvents.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>Detail par entraineur</h4>
              {[...new Set(calEvents.map(e => e.coachName))].map(name => {
                const ces = calEvents.filter(e => e.coachName === name);
                const entr = ces.filter(e=>e.activity==="Entraînement").reduce((s,e)=>s+e.hours,0);
                const course = ces.filter(e=>e.activity==="Course").reduce((s,e)=>s+e.hours,0);
                const cost = entr*(rates ? rates["Entraînement"]||0 : 0) + course*(rates ? rates["Course"]||0 : 0);
                return (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ color: "#e2e8f0", fontSize: 13 }}>🎿 {name}</span>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {entr > 0 && <span style={{ color: "#60a5fa", fontSize: 11 }}>Entr: {entr}h</span>}
                      {course > 0 && <span style={{ color: "#fbbf24", fontSize: 11 }}>Course: {course}h</span>}
                      <span style={{ color: "#34d399", fontWeight: 600, fontSize: 12 }}>{fmt(cost)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── EXPORT EXCEL ────────────────────────────────────────────────────────────
function exportExcel(entries, rates) {
  // Build CSV content (opens in Excel)
  const headers = ["Date", "Entraîneur", "Activité", "Catégories", "Heures", "Taux horaire (€/h)", "Coût (€)", "Note"];
  const rows = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => [
      new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR"),
      e.coachName,
      e.activity,
      e.categories && e.categories.length > 0 ? e.categories.join(", ") : "",
      e.hours,
      rates[e.activity] || 0,
      (e.hours * (rates[e.activity] || 0)).toFixed(2),
      e.note || "",
    ]);

  // Add totals row
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + e.hours * (rates[e.activity] || 0), 0);
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["TOTAL", "", "", "", totalHours, "", totalCost.toFixed(2), ""]);

  // Build CSV with BOM for Excel UTF-8
  const BOM = "﻿";
  const csvContent = BOM + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
  link.href = url;
  link.download = `club-manager-rapport-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── ADMIN : RAPPORTS ─────────────────────────────────────────────────────────
function AdminRapports({ entries, rates }) {
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterActivity, setFilterActivity] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const coaches = [...new Set(entries.map(e => e.coachName))];
  const months = [...new Set(entries.map(e => e.date.slice(0,7)))].sort().reverse();

  const filtered = entries.filter(e => {
    if (filterCoach !== "all" && e.coachName !== filterCoach) return false;
    if (filterActivity !== "all" && e.activity !== filterActivity) return false;
    if (filterMonth !== "all" && !e.date.startsWith(filterMonth)) return false;
    return true;
  });

  const totalHours = filtered.reduce((s,e) => s+e.hours, 0);
  const totalCost = filtered.reduce((s,e) => s+e.hours*(rates[e.activity]||0), 0);

  const coachStats = coaches.map(name => {
    const ces = filtered.filter(e => e.coachName === name);
    return { name, hours: ces.reduce((s,e) => s+e.hours,0), cost: ces.reduce((s,e) => s+e.hours*(rates[e.activity]||0),0) };
  });

  const actStats = ACTIVITY_LIST.map(a => {
    const aes = filtered.filter(e => e.activity === a);
    const h = aes.reduce((s,e) => s+e.hours, 0);
    const hasCategories = ACTIVITIES_WITH_CATEGORIES.includes(a);
    const byCategory = hasCategories ? CATEGORIES.map(cat => ({ cat, hours: aes.filter(e => e.categories&&e.categories.includes(cat)).reduce((s,e) => s+e.hours,0) })).filter(x => x.hours>0) : [];
    return { activity: a, hours: h, cost: h*(rates[a]||0), hasCategories, byCategory };
  }).filter(x => x.hours > 0);

  return (
    <div>
      <SectionTitle sub="Filtrez et analysez les données">Rapports détaillés</SectionTitle>
      <Card style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Select label="Entraîneur" value={filterCoach} onChange={e => setFilterCoach(e.target.value)}>
            <option value="all">Tous</option>
            {coaches.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Activité" value={filterActivity} onChange={e => setFilterActivity(e.target.value)}>
            <option value="all">Toutes</option>
            {ACTIVITY_LIST.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select label="Mois" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="all">Tous</option>
            {months.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split("-")[1])-1]} {m.split("-")[0]}</option>)}
          </Select>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 20 }}>{totalHours}h</div>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: 16 }}>{fmt(totalCost)}</div>
          </div>
        </div>
      </Card>

      {/* Matrice heures */}
      <Card style={{ marginBottom: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "#94a3b8" }}>Matrice heures — Entraîneur × Activité</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <th style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Entraîneur</th>
            {actStats.map(a => <th key={a.activity} style={{ padding: "10px 12px", textAlign: "center", color: ACT_COLORS[a.activity]?.text||"#e2e8f0", fontWeight: 600 }}>{a.activity}</th>)}
            <th style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24", fontWeight: 700 }}>Total h</th>
            <th style={{ padding: "10px 12px", textAlign: "center", color: "#34d399", fontWeight: 700 }}>Coût</th>
          </tr></thead>
          <tbody>
            {coachStats.map(c => (
              <tr key={c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontWeight: 500 }}>🎿 {c.name}</td>
                {actStats.map(a => { const h = filtered.filter(e => e.coachName===c.name&&e.activity===a.activity).reduce((s,e) => s+e.hours,0); return <td key={a.activity} style={{ padding: "12px", textAlign: "center", color: h?"#e2e8f0":"#1e293b", fontWeight: h?600:400 }}>{h?`${h}h`:"—"}</td>; })}
                <td style={{ padding: "12px", textAlign: "center", color: "#fbbf24", fontWeight: 700 }}>{c.hours}h</td>
                <td style={{ padding: "12px", textAlign: "center", color: "#34d399", fontWeight: 700 }}>{fmt(c.cost)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Total</td>
              {actStats.map(a => <td key={a.activity} style={{ padding: "12px", textAlign: "center", color: ACT_COLORS[a.activity]?.text||"#e2e8f0", fontWeight: 700 }}>{a.hours}h</td>)}
              <td style={{ padding: "12px", textAlign: "center", color: "#fbbf24", fontWeight: 800, fontSize: 15 }}>{totalHours}h</td>
              <td style={{ padding: "12px", textAlign: "center", color: "#34d399", fontWeight: 800, fontSize: 15 }}>{fmt(totalCost)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Rapport catégories */}
      {filtered.some(e => e.categories&&e.categories.length>0) && (
        <Card style={{ marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#94a3b8" }}>Heures par entraîneur × catégorie</h3>
          <p style={{ color: "#334155", fontSize: 12, margin: "0 0 20px" }}>Cumul pour Entraînement et Course</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Entraîneur</th>
              {CATEGORIES.map(cat => <th key={cat} style={{ padding: "10px 16px", textAlign: "center", color: "#fbbf24", fontWeight: 700 }}>{cat}</th>)}
              <th style={{ padding: "10px 16px", textAlign: "center", color: "#60a5fa", fontWeight: 700 }}>Total</th>
            </tr></thead>
            <tbody>
              {coachStats.map(c => {
                const coachEntries = filtered.filter(e => e.coachName===c.name&&e.categories&&e.categories.length>0);
                const catH = CATEGORIES.map(cat => ({ cat, hours: coachEntries.filter(e => e.categories.includes(cat)).reduce((s,e) => s+e.hours,0) }));
                const total = catH.reduce((s,c) => s+c.hours, 0);
                if (total===0) return null;
                return (
                  <tr key={c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 16px", color: "#e2e8f0", fontWeight: 500 }}>🎿 {c.name}</td>
                    {catH.map(c => <td key={c.cat} style={{ padding: "12px 16px", textAlign: "center" }}>{c.hours>0?(<div><div style={{ color: "#e2e8f0", fontWeight: 700 }}>{c.hours}h</div><div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 4, marginTop: 4 }}><div style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)", height: "100%", borderRadius: 99, width: `${total?(c.hours/total)*100:0}%` }} /></div></div>):<span style={{ color: "#1e293b" }}>—</span>}</td>)}
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#60a5fa", fontWeight: 800 }}>{total}h</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Total</td>
                {CATEGORIES.map(cat => { const h = filtered.filter(e => e.categories&&e.categories.includes(cat)).reduce((s,e) => s+e.hours,0); return <td key={cat} style={{ padding: "12px 16px", textAlign: "center", color: "#fbbf24", fontWeight: 800 }}>{h>0?`${h}h`:"—"}</td>; })}
                <td style={{ padding: "12px 16px", textAlign: "center", color: "#60a5fa", fontWeight: 800 }}>{filtered.filter(e => e.categories&&e.categories.length>0).reduce((s,e) => s+e.hours,0)}h</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Catégories par activité */}
      {actStats.some(a => a.hasCategories&&a.byCategory.length>0) && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par catégorie (U8 / U10 / U12 / U14 / U16 / U18 / Master)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {actStats.filter(a => a.hasCategories&&a.byCategory.length>0).map(a => (
              <div key={a.activity}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Badge activity={a.activity} /><span style={{ color: "#64748b", fontSize: 12 }}>Total : <strong style={{ color: "#e2e8f0" }}>{a.hours}h</strong></span></div>
                {a.byCategory.map(c => (
                  <div key={c.cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{c.cat}</span>
                      <div style={{ display: "flex", gap: 12 }}><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{c.hours}h</span><span style={{ color: "#34d399", fontWeight: 600 }}>{fmt(c.hours*(rates[a.activity]||0))}</span></div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 6 }}><div style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)", height: "100%", borderRadius: 99, width: `${a.hours?(c.hours/a.hours)*100:0}%` }} /></div>
                    <div style={{ color: "#334155", fontSize: 10, marginTop: 3 }}>{a.hours?Math.round((c.hours/a.hours)*100):0}% du total</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Détail saisies */}
      <Card style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>Détail des saisies ({filtered.length})</h3>
          <button onClick={() => exportExcel(filtered, rates)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(135deg,#10b981,#06b6d4)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            📥 Exporter Excel
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["Date","Entraîneur","Activité","Catégories","Heures","Taux","Coût","Note"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#334155", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "10px 14px", color: "#64748b" }}>{new Date(e.date+"T00:00:00").toLocaleDateString("fr-FR")}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 500 }}>{e.coachName}</td>
                <td style={{ padding: "10px 14px" }}><Badge activity={e.activity} /></td>
                <td style={{ padding: "10px 14px" }}>{e.categories&&e.categories.length>0?<div style={{ display: "flex", gap: 4 }}>{e.categories.map(c => <span key={c} style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{c}</span>)}</div>:<span style={{ color: "#334155", fontSize: 12 }}>—</span>}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{e.hours}h</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{fmt(rates[e.activity]||0)}/h</td>
                <td style={{ padding: "10px 14px", color: "#34d399", fontWeight: 700 }}>{fmt(e.hours*(rates[e.activity]||0))}</td>
                <td style={{ padding: "10px 14px", color: "#475569", fontSize: 12 }}>{e.note||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN : BUDGET ───────────────────────────────────────────────────────────
function AdminBudget({ entries, rates, budgets, dbOps }) {
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState("");
  const actStats = ACTIVITY_LIST.map(a => {
    const aes = entries.filter(e => e.activity === a);
    const h = aes.reduce((s,e) => s+e.hours, 0);
    const cost = h*(rates[a]||0);
    const budget = budgets[a]||0;
    return { activity: a, hours: h, cost, budget, remaining: budget-cost, pct: budget?Math.min((cost/budget)*100,100):0 };
  });
  const totalBudget = actStats.reduce((s,a) => s+a.budget, 0);
  const totalCost = actStats.reduce((s,a) => s+a.cost, 0);
  const saveBudget = async (activity) => {
    const v = parseFloat(val);
    if (!isNaN(v)&&v>=0) { await dbOps.updateBudget(activity, v); }
    setEditing(null); setVal("");
  };
  return (
    <div>
      <SectionTitle sub="Définissez et suivez les budgets par activité">Gestion des budgets</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[{ label: "Budget total", value: fmt(totalBudget), color: "#fbbf24", icon: "🏦" }, { label: "Coût engagé", value: fmt(totalCost), color: "#f87171", icon: "💶" }, { label: "Restant", value: fmt(totalBudget-totalCost), color: totalBudget-totalCost>=0?"#34d399":"#f87171", icon: totalBudget-totalCost>=0?"✅":"⚠️" }].map(k => (
          <Card key={k.label} style={{ padding: "22px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 24 }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {actStats.map(a => {
          const over = a.remaining < 0;
          return (
            <Card key={a.activity}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <Badge activity={a.activity} />
                <div style={{ textAlign: "right" }}><div style={{ color: over?"#f87171":"#34d399", fontWeight: 800, fontSize: 20 }}>{fmt(a.remaining)}</div><div style={{ color: "#334155", fontSize: 11 }}>{over?"⚠️ Dépassement":"Restant"}</div></div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 10, marginBottom: 12, overflow: "hidden" }}><div style={{ background: over?"linear-gradient(90deg,#ef4444,#f97316)":ACT_COLORS[a.activity]?.bar||"#3b82f6", height: "100%", borderRadius: 99, width: `${a.pct}%` }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                {[{ label: "Heures", value: `${a.hours}h`, color: "#60a5fa" }, { label: "Coût", value: fmt(a.cost), color: "#f87171" }, { label: "Budget", value: fmt(a.budget), color: "#fbbf24" }].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}><div style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.value}</div><div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>{s.label}</div></div>
                ))}
              </div>
              {editing === a.activity ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={val} onChange={e => setVal(e.target.value)} placeholder="Nouveau budget (€)" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", flex: 1, fontFamily: "inherit" }} onKeyDown={e => e.key==="Enter"&&saveBudget(a.activity)} />
                  <Btn small onClick={() => saveBudget(a.activity)} variant="success">✓</Btn>
                  <Btn small onClick={() => setEditing(null)} variant="ghost">✕</Btn>
                </div>
              ) : <Btn small variant="ghost" onClick={() => { setEditing(a.activity); setVal(String(a.budget)); }} style={{ width: "100%" }}>✏️ Modifier le budget</Btn>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN : PARAMÈTRES ───────────────────────────────────────────────────────
function AdminParametres({ rates, users, dbOps }) {
  const [editingRate, setEditingRate] = useState(null);
  const [rateVal, setRateVal] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoach, setNewCoach] = useState({ name: "", email: "", password: "" });
  const [editCoachId, setEditCoachId] = useState(null);
  const [editCoachData, setEditCoachData] = useState({});
  const [deleteCoachId, setDeleteCoachId] = useState(null);
  const [coachMsg, setCoachMsg] = useState(null);
  const [oldPwd, setOldPwd] = useState(""); const [newPwd, setNewPwd] = useState(""); const [confirmPwd, setConfirmPwd] = useState(""); const [pwdMsg, setPwdMsg] = useState(null);
  const adminUser = users.find(u => u.role === "admin");
  const coaches = users.filter(u => u.role === "coach");
  const fieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const showCoachMsg = (type, text) => { setCoachMsg({ type, text }); setTimeout(() => setCoachMsg(null), 3000); };
  const saveRate = async (activity) => { const v = parseFloat(rateVal); if (!isNaN(v)&&v>=0) { await dbOps.updateRate(activity, v); } setEditingRate(null); setRateVal(""); };
  const handleAddCoach = async () => {
    if (!newCoach.name||!newCoach.email||!newCoach.password) { showCoachMsg("error","Tous les champs sont obligatoires."); return; }
    if (users.find(u => u.email===newCoach.email)) { showCoachMsg("error","Email déjà utilisé."); return; }
    if (newCoach.password.length<6) { showCoachMsg("error","Mot de passe min. 6 caractères."); return; }
    const error = await dbOps.addUser({ ...newCoach, is_referent: newCoach.is_referent || false });
    if (error) { showCoachMsg("error","Erreur: "+error.message); return; }
    setNewCoach({ name:"", email:"", password:"", is_referent: false }); setShowAddForm(false);
    showCoachMsg("success",`Entraîneur ${newCoach.name} ajouté !`);
  };
  const handleDeleteCoach = async (id) => { await dbOps.deleteUser(id); setDeleteCoachId(null); showCoachMsg("success","Entraîneur supprimé."); };
  const handleSaveCoach = async (id) => {
    if (!editCoachData.name||!editCoachData.email) { showCoachMsg("error","Nom et email obligatoires."); return; }
    await dbOps.updateUser(id, editCoachData); setEditCoachId(null); showCoachMsg("success","Modifié avec succès.");
  };
  const handleChangePwd = async () => {
    if (!oldPwd||!newPwd||!confirmPwd) { setPwdMsg({ type:"error", text:"Tous les champs sont obligatoires." }); return; }
    if (adminUser.password!==oldPwd) { setPwdMsg({ type:"error", text:"Ancien mot de passe incorrect." }); return; }
    if (newPwd.length<6) { setPwdMsg({ type:"error", text:"Minimum 6 caractères." }); return; }
    if (newPwd!==confirmPwd) { setPwdMsg({ type:"error", text:"Les mots de passe ne correspondent pas." }); return; }
    await dbOps.updateUser(adminUser.id, { name: adminUser.name, email: adminUser.email, password: newPwd });
    setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    setPwdMsg({ type:"success", text:"Mot de passe modifié !" }); setTimeout(() => setPwdMsg(null), 3000);
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      <SectionTitle sub="Taux horaires, entraîneurs et mot de passe">Paramètres</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {/* Taux horaires */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <h3 style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 15 }}>⚙️ Taux horaires</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ACTIVITY_LIST.map(a => (
              <Card key={a} style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Badge activity={a} /><span style={{ color: "#34d399", fontWeight: 800, fontSize: 18 }}>{fmt(rates[a]||0)}<span style={{ fontSize: 11, color: "#475569", fontWeight: 400 }}>/h</span></span></div>
                {editingRate === a ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input value={rateVal} onChange={e => setRateVal(e.target.value)} placeholder="€/h" style={fieldStyle} onKeyDown={e => e.key==="Enter"&&saveRate(a)} />
                    <Btn small onClick={() => saveRate(a)} variant="success">✓</Btn>
                    <Btn small onClick={() => setEditingRate(null)} variant="ghost">✕</Btn>
                  </div>
                ) : <Btn small variant="ghost" onClick={() => { setEditingRate(a); setRateVal(String(rates[a]||"")); }} style={{ width: "100%", marginTop: 10 }}>✏️ Modifier</Btn>}
              </Card>
            ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Gestion entraîneurs */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#94a3b8", fontSize: 15 }}>👥 Entraîneurs</h3>
              <Btn small onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm?"ghost":"primary"}>{showAddForm?"✕ Annuler":"➕ Ajouter"}</Btn>
            </div>
            {coachMsg && <div style={{ background: coachMsg.type==="success"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)", border: `1px solid ${coachMsg.type==="success"?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "10px 14px", color: coachMsg.type==="success"?"#34d399":"#f87171", fontSize: 13, marginBottom: 14 }}>{coachMsg.type==="success"?"✅":"⚠️"} {coachMsg.text}</div>}
            {showAddForm && (
              <Card style={{ marginBottom: 14, padding: 18 }}>
                <h4 style={{ margin: "0 0 14px", color: "#94a3b8", fontSize: 13 }}>Nouvel entraîneur</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={newCoach.name} onChange={e => setNewCoach(p => ({...p,name:e.target.value}))} placeholder="Nom complet" style={fieldStyle} />
                  <input value={newCoach.email} onChange={e => setNewCoach(p => ({...p,email:e.target.value}))} placeholder="Email" type="email" style={fieldStyle} />
                  <input value={newCoach.password} onChange={e => setNewCoach(p => ({...p,password:e.target.value}))} placeholder="Mot de passe (6 car. min.)" type="password" style={fieldStyle} />
                  <div>
                    <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Rôles (cumulables)</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: "#e2e8f0", fontSize: 13 }}>🎿 Entraîneur</span>
                        <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600 }}>✅ Toujours actif</span>
                      </div>
                      <div onClick={() => setNewCoach(p => ({...p, is_referent: !p.is_referent}))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: (newCoach.is_referent||false) ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${(newCoach.is_referent||false) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", userSelect: "none" }}>
                        <span style={{ color: "#e2e8f0", fontSize: 13 }}>⭐ Référent</span>
                        <div style={{ width: 36, height: 20, borderRadius: 99, background: (newCoach.is_referent||false) ? "#3b82f6" : "rgba(255,255,255,0.1)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                          <div style={{ position: "absolute", top: 2, left: (newCoach.is_referent||false) ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Btn onClick={handleAddCoach} variant="success">Ajouter</Btn>
                </div>
              </Card>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {coaches.map(c => (
                <div key={c.id}>
                  <Card style={{ padding: 14 }}>
                    {editCoachId === c.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={editCoachData.name||""} onChange={e => setEditCoachData(p => ({...p,name:e.target.value}))} placeholder="Nom" style={fieldStyle} />
                        <input value={editCoachData.email||""} onChange={e => setEditCoachData(p => ({...p,email:e.target.value}))} placeholder="Email" style={fieldStyle} />
                        <input value={editCoachData.password||""} onChange={e => setEditCoachData(p => ({...p,password:e.target.value}))} placeholder="Nouveau mot de passe (vide = inchangé)" type="password" style={fieldStyle} />
                        <div>
                          <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Rôles (cumulables)</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                              <span style={{ color: "#e2e8f0", fontSize: 13 }}>🎿 Entraîneur</span>
                              <span style={{ color: "#34d399", fontSize: 11, fontWeight: 600 }}>✅ Toujours actif</span>
                            </div>
                            <div onClick={() => setEditCoachData(p => ({...p, is_referent: !p.is_referent}))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: (editCoachData.is_referent||false) ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${(editCoachData.is_referent||false) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", userSelect: "none" }}>
                              <span style={{ color: "#e2e8f0", fontSize: 13 }}>⭐ Référent</span>
                              <div style={{ width: 36, height: 20, borderRadius: 99, background: (editCoachData.is_referent||false) ? "#3b82f6" : "rgba(255,255,255,0.1)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                                <div style={{ position: "absolute", top: 2, left: (editCoachData.is_referent||false) ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}><Btn small variant="success" onClick={() => handleSaveCoach(c.id)}>✓ Enregistrer</Btn><Btn small variant="ghost" onClick={() => setEditCoachId(null)}>✕ Annuler</Btn></div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {c.name}
                            <span style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: 10, padding: "1px 7px", borderRadius: 99 }}>🎿 Entraîneur</span>
                            {c.is_referent && <span style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 10, padding: "1px 7px", borderRadius: 99 }}>⭐ Référent</span>}
                          </div>
                          <div style={{ color: "#334155", fontSize: 11, marginTop: 3 }}>{c.email}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}><Btn small variant="ghost" onClick={() => { setEditCoachId(c.id); setEditCoachData({ name:c.name, email:c.email, password:"", is_referent: c.is_referent||false }); }}>✏️</Btn><Btn small variant="danger" onClick={() => setDeleteCoachId(c.id)}>🗑️</Btn></div>
                      </div>
                    )}
                  </Card>
                  {deleteCoachId === c.id && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#f87171", fontSize: 13 }}>⚠️ Supprimer {c.name} ?</span>
                      <div style={{ display: "flex", gap: 8 }}><Btn small variant="danger" onClick={() => handleDeleteCoach(c.id)}>Supprimer</Btn><Btn small variant="ghost" onClick={() => setDeleteCoachId(null)}>Annuler</Btn></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mot de passe admin */}
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>🔒 Mon mot de passe</h3>
            {pwdMsg && <div style={{ background: pwdMsg.type==="success"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)", border: `1px solid ${pwdMsg.type==="success"?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "10px 14px", color: pwdMsg.type==="success"?"#34d399":"#f87171", fontSize: 13, marginBottom: 14 }}>{pwdMsg.type==="success"?"✅":"⚠️"} {pwdMsg.text}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="Ancien mot de passe" style={fieldStyle} />
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" style={fieldStyle} />
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirmer" style={fieldStyle} onKeyDown={e => e.key==="Enter"&&handleChangePwd()} />
              <Btn onClick={handleChangePwd} variant="primary">Modifier le mot de passe</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── MON COMPTE ───────────────────────────────────────────────────────────────
function MonCompte({ user, users, dbOps }) {
  const [oldPwd, setOldPwd] = useState(""); const [newPwd, setNewPwd] = useState(""); const [confirmPwd, setConfirmPwd] = useState(""); const [msg, setMsg] = useState(null);
  const handleChange = async () => {
    if (!oldPwd||!newPwd||!confirmPwd) { setMsg({ type:"error", text:"Tous les champs sont obligatoires." }); return; }
    const current = users.find(u => u.id===user.id);
    if (current.password!==oldPwd) { setMsg({ type:"error", text:"Ancien mot de passe incorrect." }); return; }
    if (newPwd.length<6) { setMsg({ type:"error", text:"Minimum 6 caractères." }); return; }
    if (newPwd!==confirmPwd) { setMsg({ type:"error", text:"Les mots de passe ne correspondent pas." }); return; }
    await dbOps.updateUser(user.id, { name: user.name, email: user.email, password: newPwd });
    setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    setMsg({ type:"success", text:"Mot de passe modifié avec succès !" }); setTimeout(() => setMsg(null), 3000);
  };
  return (
    <div style={{ maxWidth: "100%" }}>
      <SectionTitle sub="Gérez vos informations personnelles">Mon compte</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>👤 Informations</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ label: "Nom", value: user.name }, { label: "Email", value: user.email }, { label: "Rôle(s)", value: user.is_referent ? "🎿 Entraîneur + ⭐ Référent" : "🎿 Entraîneur" }].map(f => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <span style={{ color: "#64748b", fontSize: 13 }}>{f.label}</span><span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{f.value}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>🔒 Modifier le mot de passe</h3>
        {msg && <div style={{ background: msg.type==="success"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)", border: `1px solid ${msg.type==="success"?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "10px 14px", color: msg.type==="success"?"#34d399":"#f87171", fontSize: 13, marginBottom: 16 }}>{msg.type==="success"?"✅":"⚠️"} {msg.text}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[["Ancien mot de passe", oldPwd, setOldPwd], ["Nouveau mot de passe", newPwd, setNewPwd], ["Confirmer le mot de passe", confirmPwd, setConfirmPwd]].map(([label, val, setter]) => (
            <div key={label}>
              <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>
              <input type="password" value={val} onChange={e => setter(e.target.value)} placeholder="••••••••" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} onKeyDown={e => e.key==="Enter"&&handleChange()} />
            </div>
          ))}
          <Btn onClick={handleChange} variant="primary">Modifier le mot de passe</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);

  // ── Helpers cookies ──
  const setCookie = (name, value, days = 30) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  };
  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // ── Chargement initial ──
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*").order("id");
        if (profilesError) throw profilesError;
        const userList = profilesData || [];
        setUsers(userList);

        // Restaurer session via cookie
        try {
          const saved = getCookie("club_session");
          if (saved) {
            const parsed = JSON.parse(saved);
            const found = userList.find(u => u.id === parsed.id);
            if (found) { setUser(found); setTab(found.role === "admin" ? "dashboard" : "saisie"); }
          }
        } catch(e) {}

        const { data: entriesData, error: entriesError } = await supabase.from("entries").select("*").order("date", { ascending: false });
        if (entriesError) throw entriesError;
        setEntries((entriesData || []).map(e => ({ id: e.id, coachId: e.coach_id, coachName: e.coach_name, activity: e.activity, date: e.date, hours: parseFloat(e.hours), note: e.note || "", categories: e.categories || [] })));

        const { data: ratesData } = await supabase.from("rates").select("*");
        if (ratesData && ratesData.length > 0) { const r = {}; ratesData.forEach(x => { r[x.activity] = parseFloat(x.hourly_rate); }); setRates(r); }

        const { data: budgetsData } = await supabase.from("budgets").select("*");
        if (budgetsData && budgetsData.length > 0) { const b = {}; budgetsData.forEach(x => { b[x.activity] = parseFloat(x.amount); }); setBudgets(b); }
      } catch (err) {
        setDbError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleLogin = (u) => {
    try { setCookie("club_session", JSON.stringify({ id: u.id }), 30); } catch(e) {}
    setUser(u); setTab(u.role === "admin" ? "dashboard" : "saisie");
  };

  const handleLogout = () => {
    try { deleteCookie("club_session"); } catch(e) {}
    setUser(null); setTab(null);
  };

  // ── Opérations Supabase ──
  const addEntry = useCallback(async (entry) => {
    const { data, error } = await supabase.from("entries").insert({ coach_id: entry.coachId, coach_name: entry.coachName, activity: entry.activity, date: entry.date, hours: entry.hours, note: entry.note || "", categories: entry.categories || [] }).select().single();
    if (!error && data) setEntries(prev => [{ ...entry, id: data.id }, ...prev]);
  }, []);

  const updateEntry = useCallback(async (id, updates) => {
    const existing = entries.find(e => e.id === id);
    const merged = { ...existing, ...updates };
    await supabase.from("entries").update({ activity: merged.activity, date: merged.date, hours: merged.hours, note: merged.note || "", categories: merged.categories || [] }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? merged : e));
  }, [entries]);

  const deleteEntry = useCallback(async (id) => {
    await supabase.from("entries").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateRate = useCallback(async (activity, value) => {
    await supabase.from("rates").upsert({ activity, hourly_rate: value });
    setRates(prev => ({ ...prev, [activity]: value }));
  }, []);

  const updateBudget = useCallback(async (activity, value) => {
    await supabase.from("budgets").upsert({ activity, amount: value });
    setBudgets(prev => ({ ...prev, [activity]: value }));
  }, []);

  const addUser = useCallback(async (newUser) => {
    const { data, error } = await supabase.from("profiles").insert({ name: newUser.name, email: newUser.email, password: newUser.password, role: "coach", is_referent: newUser.is_referent || false }).select().single();
    if (!error && data) setUsers(prev => [...prev, data]);
    return error;
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    const payload = { name: updates.name, email: updates.email };
    if (updates.password) payload.password = updates.password;
    if (updates.is_referent !== undefined) payload.is_referent = updates.is_referent;
    await supabase.from("profiles").update(payload).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback(async (id) => {
    await supabase.from("profiles").delete().eq("id", id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // ── Cal events state ──
  const [calEvents, setCalEvents] = useState([]);

  // Load cal events
  useEffect(() => {
    const loadCalEvents = async () => {
      const { data } = await supabase.from("cal_events").select("*").order("date");
      if (data) setCalEvents(data.map(e => ({ id: e.id, coachId: e.coach_id, coachName: e.coach_name, activity: e.activity, date: e.date, categories: e.categories || [], hours: e.hours || 2, note: e.note || "" })));
    };
    loadCalEvents();
  }, []);

  const addCalEvent = useCallback(async (ev) => {
    const { data, error } = await supabase.from("cal_events").insert({ coach_id: ev.coachId, coach_name: ev.coachName, activity: ev.activity, date: ev.date, categories: ev.categories || [], hours: ev.hours || 2, note: ev.note || "" }).select().single();
    if (!error && data) setCalEvents(prev => [...prev, { id: data.id, coachId: data.coach_id, coachName: data.coach_name, activity: data.activity, date: data.date, categories: data.categories || [], hours: data.hours, note: data.note || "" }]);
  }, []);

  const deleteCalEvent = useCallback(async (id) => {
    await supabase.from("cal_events").delete().eq("id", id);
    setCalEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const dbOps = { addEntry, updateEntry, deleteEntry, updateRate, updateBudget, addUser, updateUser, deleteUser, addCalEvent, deleteCalEvent };

  // ── Écrans chargement/erreur ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080d14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⛷️</div>
        <div style={{ color: "#60a5fa", fontSize: 16, fontWeight: 600 }}>Chargement en cours...</div>
        <div style={{ color: "#334155", fontSize: 13, marginTop: 8 }}>Connexion à Supabase</div>
      </div>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: "#080d14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", maxWidth: 440, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: "#f87171", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Erreur de connexion Supabase</div>
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "14px 18px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>{dbError}</div>
        <div style={{ color: "#475569", fontSize: 12 }}>Vérifiez vos variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le fichier .env</div>
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} users={users} />;

  const renderTab = () => {
    const isReferent = user.is_referent === true;
    if (user.role === "coach") {
      if (tab === "saisie") return <CoachSaisie user={user} entries={entries} dbOps={dbOps} />;
      if (tab === "rapport") return <CoachRapport user={user} entries={entries} dbOps={dbOps} />;
      if (tab === "calendrier") return <CalendrierView user={user} calEvents={calEvents} dbOps={dbOps} rates={rates} isAdmin={false} canEdit={isReferent} users={users} />;
      if (tab === "compte") return <MonCompte user={user} users={users} dbOps={dbOps} />;
    } else {
      if (tab === "dashboard") return <AdminDashboard entries={entries} rates={rates} budgets={budgets} />;
      if (tab === "rapports") return <AdminRapports entries={entries} rates={rates} />;
      if (tab === "budget") return <AdminBudget entries={entries} rates={rates} budgets={budgets} dbOps={dbOps} />;
      if (tab === "calendrier") return <CalendrierView user={user} calEvents={calEvents} dbOps={dbOps} rates={rates} isAdmin={true} canEdit={true} users={users} />;
      if (tab === "parametres") return <AdminParametres rates={rates} users={users} dbOps={dbOps} />;
    }
    return null;
  };

  return (
    <Shell user={user} tab={tab} setTab={setTab} onLogout={handleLogout}>
      {renderTab()}
    </Shell>
  );
}
