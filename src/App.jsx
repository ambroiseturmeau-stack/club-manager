import { useState, useMemo } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: "Admin Club", email: "admin@club.fr", role: "admin", password: "admin123" },
  { id: 2, name: "Jean Dupont", email: "jean@club.fr", role: "coach", password: "coach123" },
  { id: 3, name: "Marie Martin", email: "marie@club.fr", role: "coach", password: "coach456" },
  { id: 4, name: "Paul Bernard", email: "paul@club.fr", role: "coach", password: "coach789" },
];

const ACTIVITY_LIST = ["Entraînement", "Fartage", "Course", "Administration"];

const DEFAULT_RATES = { "Entraînement": 28, "Fartage": 22, "Course": 25, "Administration": 20 };
const DEFAULT_BUDGETS = { "Entraînement": 5000, "Fartage": 2000, "Course": 3000, "Administration": 1500 };

const INITIAL_ENTRIES = [
  { id: 1, coachId: 2, coachName: "Jean Dupont", activity: "Entraînement", date: "2026-04-07", hours: 3, note: "Groupe A" },
  { id: 2, coachId: 2, coachName: "Jean Dupont", activity: "Course", date: "2026-04-14", hours: 2, note: "" },
  { id: 3, coachId: 3, coachName: "Marie Martin", activity: "Fartage", date: "2026-04-08", hours: 4, note: "Skis compétition" },
  { id: 4, coachId: 3, coachName: "Marie Martin", activity: "Administration", date: "2026-04-15", hours: 1.5, note: "Réunion" },
  { id: 5, coachId: 4, coachName: "Paul Bernard", activity: "Entraînement", date: "2026-04-10", hours: 2, note: "U15" },
  { id: 6, coachId: 4, coachName: "Paul Bernard", activity: "Course", date: "2026-04-17", hours: 3, note: "Slalom géant" },
  { id: 7, coachId: 2, coachName: "Jean Dupont", activity: "Administration", date: "2026-04-21", hours: 2, note: "" },
  { id: 8, coachId: 3, coachName: "Marie Martin", activity: "Entraînement", date: "2026-04-22", hours: 3, note: "Biathlon" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["L","M","M","J","V","S","D"];

// Activity colors
const ACT_COLORS = {
  "Entraînement": { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", bar: "#3b82f6" },
  "Fartage":      { bg: "rgba(16,185,129,0.15)", text: "#34d399", bar: "#10b981" },
  "Course":       { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", bar: "#f59e0b" },
  "Administration":{ bg: "rgba(168,85,247,0.15)", text: "#c084fc", bar: "#a855f7" },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ activity }) {
  const c = ACT_COLORS[activity] || { bg: "rgba(255,255,255,0.1)", text: "#e2e8f0" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {activity}
    </span>
  );
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
      <select {...props} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", ...props.style }}>
        {children}
      </select>
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

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function CalendarPicker({ selected, onSelect, markedDates = [] }) {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const days = getDaysInMonth(y, m);
  const first = getFirstDay(y, m);
  const prev = () => m === 0 ? (setM(11), setY(v => v - 1)) : setM(v => v - 1);
  const next = () => m === 11 ? (setM(0), setY(v => v + 1)) : setM(v => v + 1);
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div style={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prev} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>‹</button>
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{MONTHS[m]} {y}</span>
        <button onClick={next} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#64748b", cursor: "pointer", fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: "center", color: "#334155", fontSize: 10, fontWeight: 800, padding: "2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {Array(first).fill(null).map((_, i) => <div key={"x" + i} />)}
        {Array(days).fill(null).map((_, i) => {
          const day = i + 1;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSel = selected === ds;
          const isToday = ds === todayStr;
          const hasEntry = markedDates.includes(ds);
          return (
            <div key={day} onClick={() => onSelect(ds)} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, cursor: "pointer", fontSize: 12, background: isSel ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : isToday ? "rgba(59,130,246,0.12)" : "transparent", color: isSel ? "#fff" : isToday ? "#60a5fa" : "#94a3b8", fontWeight: isSel ? 700 : 400, border: isToday && !isSel ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent", position: "relative" }}>
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
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    const u = MOCK_USERS.find(u => u.email === email && u.password === pwd);
    if (u) onLogin(u); else setErr("Identifiants incorrects");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", fontFamily: "'Sora', sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      {/* Background orbs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", top: "10%", left: "20%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", bottom: "20%", right: "15%", pointerEvents: "none" }} />

      <div style={{ width: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#1e3a5f,#0f4c81)", border: "1px solid rgba(59,130,246,0.3)", marginBottom: 20, boxShadow: "0 0 40px rgba(59,130,246,0.15)" }}>
            <span style={{ fontSize: 32 }}>⛷️</span>
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Club Manager</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "6px 0 0" }}>Gestion des heures d'entraînement</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32 }}>
          {err && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>⚠️ {err}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" type="email" placeholder="votre@email.fr" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Mot de passe" type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
            <button onClick={handle} style={{ background: "linear-gradient(135deg,#3b82f6,#06b6d4)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, fontFamily: "inherit", letterSpacing: 0.3 }}>
              Se connecter →
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 16 }}>
          <p style={{ color: "#334155", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px", fontWeight: 700 }}>Comptes de démonstration</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["👑 Admin", "admin@club.fr", "admin123"], ["🎿 Jean Dupont", "jean@club.fr", "coach123"], ["🎿 Marie Martin", "marie@club.fr", "coach456"]].map(([n, e, p]) => (
              <div key={e} onClick={() => { setEmail(e); setPwd(p); }} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                <span style={{ color: "#475569", fontSize: 12 }}>{n}</span>
                <span style={{ color: "#334155", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT SHELL ─────────────────────────────────────────────────────────────
function Shell({ user, tab, setTab, onLogout, children }) {
  const isAdmin = user.role === "admin";
  const coachTabs = [["saisie", "✏️", "Saisie"], ["rapport", "📊", "Mon rapport"]];
  const adminTabs = [["dashboard", "🏠", "Dashboard"], ["rapports", "📈", "Rapports"], ["budget", "💰", "Budgets"], ["parametres", "⚙️", "Paramètres"]];
  const tabs = isAdmin ? adminTabs : coachTabs;

  return (
    <div style={{ minHeight: "100vh", background: "#080d14", fontFamily: "'Sora', sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Top bar — brand */}
      <div style={{ background: "#0c1422", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⛷️</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9", letterSpacing: -0.3 }}>Club Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "#334155", fontSize: 11 }}>{isAdmin ? "👑 Administrateur" : "🎿 Entraîneur"}</div>
          </div>
          <button onClick={onLogout} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: "#0a111d", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 28px", display: "flex", gap: 2, flexShrink: 0 }}>
        {tabs.map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 18px", border: "none", background: "transparent", color: tab === k ? "#60a5fa" : "#475569", fontWeight: tab === k ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === k ? "2px solid #3b82f6" : "2px solid transparent", marginBottom: -1, transition: "all .15s" }}>
            <span style={{ fontSize: 14 }}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── COACH: SAISIE ────────────────────────────────────────────────────────────
function CoachSaisie({ user, entries, setEntries }) {
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0, 10));
  const [activity, setActivity] = useState(ACTIVITY_LIST[0]);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState(null);

  const myEntries = entries.filter(e => e.coachId === user.id);
  const markedDates = myEntries.map(e => e.date);

  const todayEntries = myEntries.filter(e => e.date === selDate);

  const handleSave = () => {
    if (!hours || isNaN(parseFloat(hours)) || parseFloat(hours) <= 0) return;
    const h = parseFloat(hours);
    if (editId) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, activity, date: selDate, hours: h, note } : e));
      setEditId(null);
    } else {
      setEntries(prev => [...prev, { id: Date.now(), coachId: user.id, coachName: user.name, activity, date: selDate, hours: h, note }]);
    }
    setHours(""); setNote(""); setActivity(ACTIVITY_LIST[0]);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const handleEdit = (e) => { setEditId(e.id); setActivity(e.activity); setHours(String(e.hours)); setNote(e.note); setSelDate(e.date); };
  const handleDelete = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  return (
    <div>
      <SectionTitle sub="Sélectionnez une date et saisissez vos heures">Saisie des heures</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8", fontWeight: 600 }}>
              {editId ? "✏️ Modifier la saisie" : "➕ Nouvelle saisie"}
            </h3>
            {saved && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", color: "#34d399", fontSize: 13, marginBottom: 16 }}>✅ Saisie enregistrée !</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "12px 16px", color: "#60a5fa", fontWeight: 600, fontSize: 14 }}>
                📅 {new Date(selDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>

              <Select label="Activité" value={activity} onChange={e => setActivity(e.target.value)}>
                {ACTIVITY_LIST.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>

              <Select label="Heures effectuées" value={hours} onChange={e => setHours(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8].map(h => (
                  <option key={h} value={h}>{h}h{h % 1 !== 0 ? "30" : "00"}</option>
                ))}
              </Select>

              <Input label="Note (optionnel)" placeholder="Groupe, remarques..." value={note} onChange={e => setNote(e.target.value)} />

              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={handleSave} disabled={!hours} style={{ flex: 1 }}>
                  {editId ? "Modifier" : "Enregistrer"}
                </Btn>
                {editId && <Btn variant="ghost" onClick={() => { setEditId(null); setHours(""); setNote(""); }}>Annuler</Btn>}
              </div>
            </div>
          </Card>

          {/* Entries for selected date */}
          {todayEntries.length > 0 && (
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b", fontWeight: 600 }}>Saisies pour ce jour</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todayEntries.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Badge activity={e.activity} />
                      <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{e.hours}h</span>
                      {e.note && <span style={{ color: "#475569", fontSize: 12 }}>— {e.note}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => handleEdit(e)}>✏️</Btn>
                      <Btn small variant="danger" onClick={() => handleDelete(e.id)}>🗑️</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CalendarPicker selected={selDate} onSelect={setSelDate} markedDates={markedDates} />
          <Card style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center", padding: "12px 8px", background: "rgba(59,130,246,0.08)", borderRadius: 10 }}>
                <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 24 }}>{myEntries.reduce((s, e) => s + e.hours, 0)}h</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Total heures</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 8px", background: "rgba(16,185,129,0.08)", borderRadius: 10 }}>
                <div style={{ color: "#34d399", fontWeight: 700, fontSize: 24 }}>{myEntries.length}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Séances</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── COACH: RAPPORT ───────────────────────────────────────────────────────────
function CoachRapport({ user, entries }) {
  const [filterMonth, setFilterMonth] = useState("all");
  const myEntries = entries.filter(e => e.coachId === user.id);
  const months = [...new Set(myEntries.map(e => e.date.slice(0, 7)))].sort().reverse();

  const filtered = filterMonth === "all" ? myEntries : myEntries.filter(e => e.date.startsWith(filterMonth));
  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);

  const byActivity = ACTIVITY_LIST.map(a => ({
    activity: a,
    hours: filtered.filter(e => e.activity === a).reduce((s, e) => s + e.hours, 0),
    count: filtered.filter(e => e.activity === a).length,
  })).filter(x => x.hours > 0);

  return (
    <div>
      <SectionTitle sub="Visualisez vos heures par activité">Mon rapport d'activité</SectionTitle>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        <Select label="Filtrer par mois" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 220 }}>
          <option value="all">Tous les mois</option>
          {months.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split("-")[1]) - 1]} {m.split("-")[0]}</option>)}
        </Select>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total heures", value: `${totalHours}h`, color: "#60a5fa", icon: "⏱️" },
          { label: "Séances", value: filtered.length, color: "#34d399", icon: "📋" },
          { label: "Activités", value: byActivity.length, color: "#fbbf24", icon: "🎿" },
        ].map(k => (
          <Card key={k.label} style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 28, letterSpacing: -1 }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* By activity */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par activité</h3>
          {byActivity.length === 0 && <p style={{ color: "#334155", fontSize: 13 }}>Aucune donnée</p>}
          {byActivity.map(a => (
            <div key={a.activity} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Badge activity={a.activity} />
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{a.hours}h</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 6 }}>
                <div style={{ background: ACT_COLORS[a.activity]?.bar || "#3b82f6", height: "100%", borderRadius: 99, width: `${(a.hours / totalHours) * 100}%`, transition: "width .4s" }} />
              </div>
              <div style={{ color: "#334155", fontSize: 11, marginTop: 4 }}>{a.count} séance{a.count > 1 ? "s" : ""} — {Math.round((a.hours / totalHours) * 100)}%</div>
            </div>
          ))}
        </Card>

        {/* History */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Historique des saisies</h3>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>{new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR")}</div>
                  <Badge activity={e.activity} />
                  {e.note && <span style={{ color: "#334155", fontSize: 11, marginLeft: 8 }}>{e.note}</span>}
                </div>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>{e.hours}h</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN: DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ entries, rates, budgets }) {
  const coaches = MOCK_USERS.filter(u => u.role === "coach");
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + e.hours * (rates[e.activity] || 0), 0);
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  const coachStats = coaches.map(u => {
    const ces = entries.filter(e => e.coachId === u.id);
    const h = ces.reduce((s, e) => s + e.hours, 0);
    const c = ces.reduce((s, e) => s + e.hours * (rates[e.activity] || 0), 0);
    return { name: u.name, hours: h, cost: c, sessions: ces.length };
  });

  const actStats = ACTIVITY_LIST.map(a => {
    const aes = entries.filter(e => e.activity === a);
    const h = aes.reduce((s, e) => s + e.hours, 0);
    const c = h * (rates[a] || 0);
    const b = budgets[a] || 0;
    return { activity: a, hours: h, cost: c, budget: b, remaining: b - c };
  });

  return (
    <div>
      <SectionTitle sub="Vue d'ensemble du club">Dashboard</SectionTitle>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Heures totales", value: `${totalHours}h`, color: "#60a5fa", icon: "⏱️", sub: "Toutes activités" },
          { label: "Coût total", value: fmt(totalCost), color: "#34d399", icon: "💶", sub: "Engagé" },
          { label: "Budget total", value: fmt(totalBudget), color: "#fbbf24", icon: "🏦", sub: "Alloué" },
          { label: "Restant", value: fmt(totalBudget - totalCost), color: totalBudget - totalCost >= 0 ? "#a78bfa" : "#f87171", icon: "📊", sub: totalBudget - totalCost >= 0 ? "Disponible" : "Dépassement" },
        ].map(k => (
          <Card key={k.label} style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>{k.value}</div>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{k.label}</div>
            <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Coach stats */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Heures par entraîneur</h3>
          {coachStats.map(c => (
            <div key={c.name} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>🎿 {c.name}</span>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: "#60a5fa", fontWeight: 700 }}>{c.hours}h</span>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>{fmt(c.cost)}</span>
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 6 }}>
                <div style={{ background: "linear-gradient(90deg,#3b82f6,#06b6d4)", height: "100%", borderRadius: 99, width: `${totalHours ? (c.hours / Math.max(...coachStats.map(x => x.hours))) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Activity budget summary */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Suivi budget par activité</h3>
          {actStats.map(a => {
            const pct = a.budget ? Math.min((a.cost / a.budget) * 100, 100) : 0;
            const over = a.cost > a.budget;
            return (
              <div key={a.activity} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                  <Badge activity={a.activity} />
                  <span style={{ color: over ? "#f87171" : "#34d399", fontWeight: 700, fontSize: 13 }}>
                    {fmt(a.remaining)} {over ? "⚠️" : ""}
                  </span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ background: over ? "linear-gradient(90deg,#ef4444,#f97316)" : ACT_COLORS[a.activity]?.bar || "#3b82f6", height: "100%", borderRadius: 99, width: `${pct}%`, transition: "width .4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ color: "#334155", fontSize: 10 }}>{fmt(a.cost)} dépensé</span>
                  <span style={{ color: "#334155", fontSize: 10 }}>{fmt(a.budget)} budget</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN: RAPPORTS ──────────────────────────────────────────────────────────
function AdminRapports({ entries, rates }) {
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterActivity, setFilterActivity] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const coaches = MOCK_USERS.filter(u => u.role === "coach");
  const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort().reverse();

  const filtered = entries.filter(e => {
    if (filterCoach !== "all" && e.coachName !== filterCoach) return false;
    if (filterActivity !== "all" && e.activity !== filterActivity) return false;
    if (filterMonth !== "all" && !e.date.startsWith(filterMonth)) return false;
    return true;
  });

  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
  const totalCost = filtered.reduce((s, e) => s + e.hours * (rates[e.activity] || 0), 0);

  const coachStats = coaches.map(u => {
    const ces = filtered.filter(e => e.coachId === u.id);
    return { name: u.name, hours: ces.reduce((s, e) => s + e.hours, 0), cost: ces.reduce((s, e) => s + e.hours * (rates[e.activity] || 0), 0), sessions: ces.length };
  });

  const actStats = ACTIVITY_LIST.map(a => {
    const aes = filtered.filter(e => e.activity === a);
    const h = aes.reduce((s, e) => s + e.hours, 0);
    return { activity: a, hours: h, cost: h * (rates[a] || 0) };
  }).filter(x => x.hours > 0);

  return (
    <div>
      <SectionTitle sub="Filtrez et analysez les données">Rapports détaillés</SectionTitle>

      {/* Filters */}
      <Card style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
          <Select label="Entraîneur" value={filterCoach} onChange={e => setFilterCoach(e.target.value)}>
            <option value="all">Tous les entraîneurs</option>
            {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select label="Activité" value={filterActivity} onChange={e => setFilterActivity(e.target.value)}>
            <option value="all">Toutes les activités</option>
            {ACTIVITY_LIST.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select label="Mois" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="all">Tous les mois</option>
            {months.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split("-")[1]) - 1]} {m.split("-")[0]}</option>)}
          </Select>
          <div style={{ textAlign: "right", paddingBottom: 2 }}>
            <div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 20 }}>{totalHours}h</div>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: 16 }}>{fmt(totalCost)}</div>
          </div>
        </div>
      </Card>

      {/* Matrix */}
      <Card style={{ marginBottom: 20, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Matrice heures — Entraîneur × Activité</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Entraîneur</th>
              {actStats.map(a => <th key={a.activity} style={{ padding: "10px 12px", textAlign: "center", color: ACT_COLORS[a.activity]?.text || "#e2e8f0", fontWeight: 600 }}>{a.activity}</th>)}
              <th style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24", fontWeight: 700 }}>Total h</th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: "#34d399", fontWeight: 700 }}>Coût</th>
            </tr>
          </thead>
          <tbody>
            {coachStats.map(c => (
              <tr key={c.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", color: "#e2e8f0", fontWeight: 500 }}>🎿 {c.name}</td>
                {actStats.map(a => {
                  const h = filtered.filter(e => e.coachName === c.name && e.activity === a.activity).reduce((s, e) => s + e.hours, 0);
                  return <td key={a.activity} style={{ padding: "12px", textAlign: "center", color: h ? "#e2e8f0" : "#1e293b", fontWeight: h ? 600 : 400 }}>{h ? `${h}h` : "—"}</td>;
                })}
                <td style={{ padding: "12px", textAlign: "center", color: "#fbbf24", fontWeight: 700 }}>{c.hours}h</td>
                <td style={{ padding: "12px", textAlign: "center", color: "#34d399", fontWeight: 700 }}>{fmt(c.cost)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Total</td>
              {actStats.map(a => <td key={a.activity} style={{ padding: "12px", textAlign: "center", color: ACT_COLORS[a.activity]?.text || "#e2e8f0", fontWeight: 700 }}>{a.hours}h</td>)}
              <td style={{ padding: "12px", textAlign: "center", color: "#fbbf24", fontWeight: 800, fontSize: 15 }}>{totalHours}h</td>
              <td style={{ padding: "12px", textAlign: "center", color: "#34d399", fontWeight: 800, fontSize: 15 }}>{fmt(totalCost)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Detail list */}
      <Card style={{ overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#94a3b8" }}>Détail des saisies ({filtered.length})</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Date", "Entraîneur", "Activité", "Heures", "Taux horaire", "Coût", "Note"].map(h => (
                <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#334155", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "10px 14px", color: "#64748b" }}>{new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR")}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 500 }}>{e.coachName}</td>
                <td style={{ padding: "10px 14px" }}><Badge activity={e.activity} /></td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontWeight: 600 }}>{e.hours}h</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{fmt(rates[e.activity] || 0)}/h</td>
                <td style={{ padding: "10px 14px", color: "#34d399", fontWeight: 700 }}>{fmt(e.hours * (rates[e.activity] || 0))}</td>
                <td style={{ padding: "10px 14px", color: "#475569", fontSize: 12 }}>{e.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN: BUDGET ────────────────────────────────────────────────────────────
function AdminBudget({ entries, rates, budgets, setBudgets }) {
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState("");

  const actStats = ACTIVITY_LIST.map(a => {
    const aes = entries.filter(e => e.activity === a);
    const h = aes.reduce((s, e) => s + e.hours, 0);
    const cost = h * (rates[a] || 0);
    const budget = budgets[a] || 0;
    const remaining = budget - cost;
    const pct = budget ? Math.min((cost / budget) * 100, 100) : 0;
    return { activity: a, hours: h, cost, budget, remaining, pct };
  });

  const totalBudget = actStats.reduce((s, a) => s + a.budget, 0);
  const totalCost = actStats.reduce((s, a) => s + a.cost, 0);
  const totalRemaining = totalBudget - totalCost;

  const saveBudget = (activity) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0) setBudgets(prev => ({ ...prev, [activity]: v }));
    setEditing(null); setVal("");
  };

  return (
    <div>
      <SectionTitle sub="Définissez et suivez les budgets par activité">Gestion des budgets</SectionTitle>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Budget total", value: fmt(totalBudget), color: "#fbbf24", icon: "🏦" },
          { label: "Coût engagé", value: fmt(totalCost), color: "#f87171", icon: "💶" },
          { label: "Restant disponible", value: fmt(totalRemaining), color: totalRemaining >= 0 ? "#34d399" : "#f87171", icon: totalRemaining >= 0 ? "✅" : "⚠️" },
        ].map(k => (
          <Card key={k.label} style={{ padding: "22px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontWeight: 800, fontSize: 24 }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Per activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {actStats.map(a => {
          const over = a.remaining < 0;
          const c = ACT_COLORS[a.activity];
          return (
            <Card key={a.activity}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <Badge activity={a.activity} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: over ? "#f87171" : "#34d399", fontWeight: 800, fontSize: 20 }}>{fmt(a.remaining)}</div>
                  <div style={{ color: "#334155", fontSize: 11 }}>{over ? "⚠️ Dépassement" : "Restant"}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 10, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ background: over ? "linear-gradient(90deg,#ef4444,#f97316)" : c?.bar || "#3b82f6", height: "100%", borderRadius: 99, width: `${a.pct}%`, transition: "width .5s" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Heures", value: `${a.hours}h`, color: "#60a5fa" },
                  { label: "Coût", value: fmt(a.cost), color: "#f87171" },
                  { label: "Budget", value: fmt(a.budget), color: "#fbbf24" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.value}</div>
                    <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {editing === a.activity ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={val} onChange={e => setVal(e.target.value)} placeholder="Nouveau budget (€)" style={{ ...{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", flex: 1, fontFamily: "inherit" } }} onKeyDown={e => e.key === "Enter" && saveBudget(a.activity)} />
                  <Btn small onClick={() => saveBudget(a.activity)} variant="success">✓</Btn>
                  <Btn small onClick={() => setEditing(null)} variant="ghost">✕</Btn>
                </div>
              ) : (
                <Btn small variant="ghost" onClick={() => { setEditing(a.activity); setVal(String(a.budget)); }} style={{ width: "100%" }}>
                  ✏️ Modifier le budget
                </Btn>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN: PARAMÈTRES ────────────────────────────────────────────────────────
function AdminParametres({ rates, setRates }) {
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState("");

  const saveRate = (activity) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0) setRates(prev => ({ ...prev, [activity]: v }));
    setEditing(null); setVal("");
  };

  return (
    <div>
      <SectionTitle sub="Définissez les taux horaires par activité (visible admin uniquement)">Paramètres — Coûts horaires</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {ACTIVITY_LIST.map(a => {
          const c = ACT_COLORS[a];
          return (
            <Card key={a}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Badge activity={a} />
                <div style={{ color: "#34d399", fontWeight: 800, fontSize: 22 }}>{fmt(rates[a] || 0)}<span style={{ fontSize: 12, color: "#475569", fontWeight: 400 }}>/h</span></div>
              </div>
              {editing === a ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={val} onChange={e => setVal(e.target.value)} placeholder="Taux (€/h)" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", flex: 1, fontFamily: "inherit" }} onKeyDown={e => e.key === "Enter" && saveRate(a)} />
                  <Btn small onClick={() => saveRate(a)} variant="success">✓ Enregistrer</Btn>
                  <Btn small onClick={() => setEditing(null)} variant="ghost">✕</Btn>
                </div>
              ) : (
                <Btn small variant="ghost" onClick={() => { setEditing(a); setVal(String(rates[a] || "")); }} style={{ width: "100%" }}>
                  ✏️ Modifier le taux
                </Btn>
              )}
            </Card>
          );
        })}
      </div>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#94a3b8" }}>👥 Gestion des entraîneurs</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOCK_USERS.filter(u => u.role === "coach").map(u => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>🎿 {u.name}</div>
                <div style={{ color: "#334155", fontSize: 12, marginTop: 2, fontFamily: "'Space Mono', monospace" }}>{u.email}</div>
              </div>
              <span style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", padding: "3px 12px", borderRadius: 99, fontSize: 12 }}>Entraîneur</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 16, marginBottom: 0 }}>
          💡 Pour ajouter des entraîneurs, connectez Supabase Auth et gérez les utilisateurs depuis le dashboard Supabase.
        </p>
      </Card>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);

  const handleLogin = (u) => {
    setUser(u);
    setTab(u.role === "admin" ? "dashboard" : "saisie");
  };

  const handleLogout = () => { setUser(null); setTab(null); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const renderTab = () => {
    if (user.role === "coach") {
      if (tab === "saisie") return <CoachSaisie user={user} entries={entries} setEntries={setEntries} />;
      if (tab === "rapport") return <CoachRapport user={user} entries={entries} />;
    } else {
      if (tab === "dashboard") return <AdminDashboard entries={entries} rates={rates} budgets={budgets} />;
      if (tab === "rapports") return <AdminRapports entries={entries} rates={rates} />;
      if (tab === "budget") return <AdminBudget entries={entries} rates={rates} budgets={budgets} setBudgets={setBudgets} />;
      if (tab === "parametres") return <AdminParametres rates={rates} setRates={setRates} />;
    }
    return null;
  };

  return (
    <Shell user={user} tab={tab} setTab={setTab} onLogout={handleLogout}>
      {renderTab()}
    </Shell>
  );
}
