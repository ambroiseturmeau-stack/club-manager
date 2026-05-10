import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACTIVITY_LIST = ["Entraînement", "Fartage", "Course", "Administration"];
const CATEGORIES = ["U8", "U10", "U12"];
const ACTIVITIES_WITH_CATEGORIES = ["Entraînement", "Course"];
const DEFAULT_RATES = { "Entraînement": 28, "Fartage": 22, "Course": 25, "Administration": 20 };
const DEFAULT_BUDGETS = { "Entraînement": 5000, "Fartage": 2000, "Course": 3000, "Administration": 1500 };
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["L","M","M","J","V","S","D"];
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
  return <div style={{ background: "#161f2e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28, ...style }}>{children}</div>;
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
    <div style={{ marginBottom: 24 }}>
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", fontFamily: "'Sora', sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", top: "10%", left: "20%", pointerEvents: "none" }} />
      <div style={{ width: 400, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#1e3a5f,#0f4c81)", border: "1px solid rgba(59,130,246,0.3)", marginBottom: 20, boxShadow: "0 0 40px rgba(59,130,246,0.15)" }}>
            <span style={{ fontSize: 32 }}>⛷️</span>
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Club Manager</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "6px 0 0" }}>Gestion des heures d'entraînement</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32 }}>
          {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>⚠️ {err}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" type="email" placeholder="votre@email.fr" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Mot de passe" type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
            <button onClick={handle} style={{ background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
              Se connecter →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function Shell({ user, tab, setTab, onLogout, children }) {
  const isAdmin = user.role === "admin";
  const coachTabs = [["saisie","✏️","Saisie des heures"],["rapport","📊","Mon rapport"],["compte","👤","Mon compte"]];
  const adminTabs = [["dashboard","🏠","Dashboard"],["rapports","📈","Rapports"],["budget","💰","Budgets"],["parametres","⚙️","Paramètres"]];
  const tabs = isAdmin ? adminTabs : coachTabs;
  return (
    <div style={{ minHeight: "100vh", background: "#080d14", fontFamily: "'Sora', sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* Ligne 1 — Club Manager */}
      <div style={{ background: "#0a111d", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "9px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⛷️</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9", letterSpacing: -0.2 }}>Club Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>{isAdmin ? "👑" : "🎿"} {user.name}</span>
          <button onClick={onLogout} style={{ padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Déconnexion</button>
        </div>
      </div>
      {/* Ligne 2 — Onglets */}
      <div style={{ background: "#0c1422", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 24px", display: "flex", flexShrink: 0 }}>
        {tabs.map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 18px", border: "none", background: tab === k ? "rgba(59,130,246,0.1)" : "transparent", color: tab === k ? "#60a5fa" : "#475569", fontWeight: tab === k ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === k ? "2px solid #3b82f6" : "2px solid transparent", marginBottom: -1, transition: "all .15s" }}>
            <span style={{ fontSize: 14 }}>{icon}</span>{label}
          </button>
        ))}
      </div>
      {/* Contenu */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>{children}</div>
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
    <div style={{ maxWidth: 560 }}>
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
              <div style={{ display: "flex", gap: 10 }}>
                {CATEGORIES.map(cat => {
                  const sel = categories.includes(cat);
                  return <div key={cat} onClick={() => toggleCat(cat)} style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, cursor: "pointer", border: `2px solid ${sel ? "#3b82f6" : "rgba(255,255,255,0.08)"}`, background: sel ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", color: sel ? "#60a5fa" : "#475569", fontWeight: sel ? 700 : 400, fontSize: 14, userSelect: "none" }}>{cat}{sel && <div style={{ fontSize: 10, marginTop: 2, color: "#34d399" }}>✓</div>}</div>;
                })}
              </div>
              {categories.length === 0 && <div style={{ color: "#f87171", fontSize: 11, marginTop: 6 }}>⚠️ Sélectionnez au moins une catégorie</div>}
            </div>
          )}

          {/* Heures */}
          <div>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Heures effectuées <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={hours} onChange={e => setHours(e.target.value)} style={{ ...fieldStyle, background: !hours ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.04)", border: !hours ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", color: hours ? "#000" : "#64748b" }}>
              <option value="">— Sélectionner —</option>
              {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}h</option>)}
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
        <Select label="Filtrer par mois" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 220 }}>
          <option value="all">Tous les mois</option>
          {months.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split("-")[1])-1]} {m.split("-")[0]}</option>)}
        </Select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
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
      <Card style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
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
      <Card style={{ marginBottom: 20, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Matrice heures — Entraîneur × Activité</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par catégorie (U8 / U10 / U12)</h3>
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
      <Card style={{ overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Détail des saisies ({filtered.length})</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[{ label: "Budget total", value: fmt(totalBudget), color: "#fbbf24", icon: "🏦" }, { label: "Coût engagé", value: fmt(totalCost), color: "#f87171", icon: "💶" }, { label: "Restant", value: fmt(totalBudget-totalCost), color: totalBudget-totalCost>=0?"#34d399":"#f87171", icon: totalBudget-totalCost>=0?"✅":"⚠️" }].map(k => (
          <Card key={k.label} style={{ padding: "22px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 24 }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {actStats.map(a => {
          const over = a.remaining < 0;
          return (
            <Card key={a.activity}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <Badge activity={a.activity} />
                <div style={{ textAlign: "right" }}><div style={{ color: over?"#f87171":"#34d399", fontWeight: 800, fontSize: 20 }}>{fmt(a.remaining)}</div><div style={{ color: "#334155", fontSize: 11 }}>{over?"⚠️ Dépassement":"Restant"}</div></div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 10, marginBottom: 12, overflow: "hidden" }}><div style={{ background: over?"linear-gradient(90deg,#ef4444,#f97316)":ACT_COLORS[a.activity]?.bar||"#3b82f6", height: "100%", borderRadius: 99, width: `${a.pct}%` }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
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
    const error = await dbOps.addUser(newCoach);
    if (error) { showCoachMsg("error","Erreur: "+error.message); return; }
    setNewCoach({ name:"", email:"", password:"" }); setShowAddForm(false);
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
    <div style={{ width: "100%" }}>
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
                        <div style={{ display: "flex", gap: 8 }}><Btn small variant="success" onClick={() => handleSaveCoach(c.id)}>✓ Enregistrer</Btn><Btn small variant="ghost" onClick={() => setEditCoachId(null)}>✕ Annuler</Btn></div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>🎿 {c.name}</div><div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>{c.email}</div></div>
                        <div style={{ display: "flex", gap: 6 }}><Btn small variant="ghost" onClick={() => { setEditCoachId(c.id); setEditCoachData({ name:c.name, email:c.email, password:"" }); }}>✏️</Btn><Btn small variant="danger" onClick={() => setDeleteCoachId(c.id)}>🗑️</Btn></div>
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
    <div style={{ maxWidth: 480 }}>
      <SectionTitle sub="Gérez vos informations personnelles">Mon compte</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>👤 Informations</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ label: "Nom", value: user.name }, { label: "Email", value: user.email }, { label: "Rôle", value: "🎿 Entraîneur" }].map(f => (
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

  // ── Chargement initial ──
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*").order("id");
        if (profilesError) throw profilesError;
        const userList = profilesData || [];
        setUsers(userList);

        // Restaurer session
        try {
          const saved = localStorage.getItem("club_session");
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
    try { localStorage.setItem("club_session", JSON.stringify({ id: u.id })); } catch(e) {}
    setUser(u); setTab(u.role === "admin" ? "dashboard" : "saisie");
  };

  const handleLogout = () => {
    try { localStorage.removeItem("club_session"); } catch(e) {}
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
    const { data, error } = await supabase.from("profiles").insert({ name: newUser.name, email: newUser.email, password: newUser.password, role: "coach" }).select().single();
    if (!error && data) setUsers(prev => [...prev, data]);
    return error;
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    const payload = { name: updates.name, email: updates.email };
    if (updates.password) payload.password = updates.password;
    await supabase.from("profiles").update(payload).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback(async (id) => {
    await supabase.from("profiles").delete().eq("id", id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const dbOps = { addEntry, updateEntry, deleteEntry, updateRate, updateBudget, addUser, updateUser, deleteUser };

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
    if (user.role === "coach") {
      if (tab === "saisie") return <CoachSaisie user={user} entries={entries} dbOps={dbOps} />;
      if (tab === "rapport") return <CoachRapport user={user} entries={entries} dbOps={dbOps} />;
      if (tab === "compte") return <MonCompte user={user} users={users} dbOps={dbOps} />;
    } else {
      if (tab === "dashboard") return <AdminDashboard entries={entries} rates={rates} budgets={budgets} />;
      if (tab === "rapports") return <AdminRapports entries={entries} rates={rates} />;
      if (tab === "budget") return <AdminBudget entries={entries} rates={rates} budgets={budgets} dbOps={dbOps} />;
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
