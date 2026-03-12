import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Area, AreaChart, ComposedChart } from "recharts";

const COLORS = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceAlt: "#1a2234",
  border: "#1e2d44",
  borderLight: "#2a3a52",
  text: "#e2e8f0",
  textMuted: "#8892a4",
  textDim: "#5a6478",
  accent: "#3b82f6",
  accentDim: "#1e40af",
  green: "#10b981",
  greenDim: "#065f46",
  amber: "#f59e0b",
  amberDim: "#78350f",
  red: "#ef4444",
  redDim: "#7f1d1d",
  cyan: "#06b6d4",
  purple: "#8b5cf6",
};

const tierColor = (tier) => {
  if (tier === "T1") return COLORS.green;
  if (tier === "T2") return COLORS.amber;
  if (tier === "T3") return COLORS.red;
  return COLORS.textMuted;
};

const vulnColor = (v) => {
  if (v === "high") return COLORS.red;
  if (v === "medium") return COLORS.amber;
  return COLORS.green;
};

const confColor = (c) => {
  if (c === "high") return COLORS.green;
  if (c === "medium") return COLORS.amber;
  return COLORS.red;
};

const Pill = ({ children, color, bg }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
    color: color || COLORS.text, background: bg || COLORS.surfaceAlt,
  }}>{children}</span>
);

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, padding: 16, ...style,
    cursor: onClick ? "pointer" : "default",
  }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 12 }}>{children}</div>
);

const Stat = ({ label, value, sub, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 1 }}>{sub}</div>}
  </div>
);

// Fleet Overview Panel
const FleetOverview = ({ data }) => {
  const fleet = data.fleet || {};
  const sensors = data.sensors || {};
  const count = Object.keys(sensors).length;
  const tiers = fleet.tier_distribution || {};
  const buildings = fleet.buildings || {};
  const fleetSummary = fleet.fleet_summary || {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
      <Card><Stat label="Total Sensors" value={count} /></Card>
      <Card><Stat label="Tier 1" value={tiers.T1 || 0} color={COLORS.green} sub="< 10% anomaly rate" /></Card>
      <Card><Stat label="Tier 2" value={tiers.T2 || 0} color={COLORS.amber} sub="10–30% anomaly rate" /></Card>
      <Card><Stat label="Tier 3" value={tiers.T3 || 0} color={COLORS.red} sub="> 30% anomaly rate" /></Card>
      <Card><Stat label="Buildings" value={Object.keys(buildings).length} sub={Object.keys(buildings).join(", ")} /></Card>
      <Card><Stat label="Fleet Avg Rate" value={
        (() => {
          const rates = Object.values(sensors).map(s => s.profile?.ae_anomaly_rate || 0);
          return rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) + "%" : "—";
        })()
      } /></Card>
    </div>
  );
};

// Sensor Table
const SensorTable = ({ data, selectedSensor, onSelect }) => {
  const sensors = Object.values(data.sensors || {});
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState(1);

  const sorted = useMemo(() => {
    return [...sensors].sort((a, b) => {
      let va, vb;
      if (sortKey === "name") { va = a.name; vb = b.name; }
      else if (sortKey === "tier") { va = a.profile?.model_tier || "Z"; vb = b.profile?.model_tier || "Z"; }
      else if (sortKey === "ae_rate") { va = a.profile?.ae_anomaly_rate || 0; vb = b.profile?.ae_anomaly_rate || 0; }
      else if (sortKey === "clusters") { va = a.profile?.total_clusters || 0; vb = b.profile?.total_clusters || 0; }
      else if (sortKey === "sp") { va = a.profile?.single_point_fraction || 0; vb = b.profile?.single_point_fraction || 0; }
      else if (sortKey === "reporting") { va = a.recommendations?.calculation_reporting?.recommended_interval_min || 0; vb = b.recommendations?.calculation_reporting?.recommended_interval_min || 0; }
      else { va = a.name; vb = b.name; }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [sensors, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(-sortDir);
    else { setSortKey(key); setSortDir(1); }
  };

  const hdr = (label, key, w) => (
    <th onClick={() => toggleSort(key)} style={{
      padding: "8px 6px", textAlign: "left", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 1, color: COLORS.textMuted,
      cursor: "pointer", width: w, borderBottom: `1px solid ${COLORS.border}`,
      userSelect: "none",
    }}>
      {label} {sortKey === key ? (sortDir === 1 ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <Card style={{ overflowX: "auto", padding: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: COLORS.surfaceAlt }}>
            {hdr("Sensor", "name", "30%")}
            {hdr("Tier", "tier", "6%")}
            {hdr("AE Rate", "ae_rate", "8%")}
            {hdr("Clusters", "clusters", "8%")}
            {hdr("SP%", "sp", "7%")}
            {hdr("Vuln", "vuln", "7%")}
            {hdr("Urgent", "urgent", "8%")}
            {hdr("Less", "less", "7%")}
            {hdr("Report", "reporting", "8%")}
            {hdr("Analytics", "analytics", "8%")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const p = s.profile || {};
            const r = s.recommendations || {};
            const isSelected = s.name === selectedSensor;
            return (
              <tr key={s.name} onClick={() => onSelect(s.name)} style={{
                cursor: "pointer", background: isSelected ? COLORS.accentDim + "40" : "transparent",
                borderLeft: isSelected ? `3px solid ${COLORS.accent}` : "3px solid transparent",
              }}>
                <td style={{ padding: "7px 6px", color: COLORS.text, fontWeight: isSelected ? 600 : 400, fontSize: 11 }}>
                  {s.name.replace("FLOWMETER-", "").replace("MUWP-", "")}
                </td>
                <td style={{ padding: "7px 6px" }}><Pill color={tierColor(p.model_tier)} bg={tierColor(p.model_tier) + "20"}>{p.model_tier || "?"}</Pill></td>
                <td style={{ padding: "7px 6px", color: COLORS.text, fontFamily: "monospace", fontSize: 11 }}>{(p.ae_anomaly_rate || 0).toFixed(1)}%</td>
                <td style={{ padding: "7px 6px", color: COLORS.text, fontFamily: "monospace", fontSize: 11 }}>{p.total_clusters || 0}</td>
                <td style={{ padding: "7px 6px", color: COLORS.text, fontFamily: "monospace", fontSize: 11 }}>{((p.single_point_fraction || 0) * 100).toFixed(0)}%</td>
                <td style={{ padding: "7px 6px" }}><Pill color={vulnColor(p.vulnerability)} bg={vulnColor(p.vulnerability) + "20"}>{p.vulnerability || "?"}</Pill></td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontSize: 11, color: COLORS.textMuted }}>{r.alarm_urgent_critical?.recommended_interval_min || "—"}m</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontSize: 11, color: COLORS.textMuted }}>{r.alarm_less_critical?.recommended_interval_min || "—"}m</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontSize: 11, color: COLORS.cyan }}>{r.calculation_reporting?.recommended_interval_min || "—"}m</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontSize: 11, color: COLORS.purple }}>{r.calculation_analytics?.recommended_interval_min || "—"}m</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

// Anomaly Timeline Chart
const TimelineChart = ({ sensor }) => {
  const timeline = sensor.hourly_timeline || [];
  if (!timeline.length) return <div style={{ color: COLORS.textDim, fontSize: 12 }}>No timeline data</div>;

  const chartData = timeline.map(d => ({
    hour: d.hour.slice(5, 13),
    anomalies: d.anomaly_count,
    iqr: d.iqr_anomaly_count || 0,
    meanScore: d.mean_score,
    rate: d.anomaly_rate,
  }));

  // Downsample if too many points
  const step = Math.max(1, Math.floor(chartData.length / 200));
  const sampled = chartData.filter((_, i) => i % step === 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={sampled} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: COLORS.textDim }} interval={Math.floor(sampled.length / 6)} />
        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: COLORS.textDim }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: COLORS.textDim }} />
        <Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.text }} />
        <Area yAxisId="left" type="monotone" dataKey="anomalies" fill={COLORS.red + "30"} stroke={COLORS.red} strokeWidth={1} name="AE Anomalies" />
        <Area yAxisId="left" type="monotone" dataKey="iqr" fill={COLORS.amber + "20"} stroke={COLORS.amber} strokeWidth={1} name="IQR Anomalies" />
        <Line yAxisId="right" type="monotone" dataKey="meanScore" stroke={COLORS.cyan} strokeWidth={1} dot={false} name="Mean Score" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Degradation Curve Chart
const DegradationChart = ({ sensor }) => {
  const deg = sensor.degradation || [];
  if (!deg.length) return <div style={{ color: COLORS.textDim, fontSize: 12 }}>No degradation data</div>;

  const chartData = deg.map(d => ({
    interval: d.target_interval_min + "m",
    clusterPres: Math.round((d.cluster_preservation_rate || 0) * 100),
    aeDetect: Math.round((d.ae_detection_rate || 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="interval" tick={{ fontSize: 10, fill: COLORS.textDim }} />
        <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} domain={[0, 100]} unit="%" />
        <Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.text }} />
        <Line type="monotone" dataKey="clusterPres" stroke={COLORS.green} strokeWidth={2} name="Cluster Preservation %" dot={{ r: 3, fill: COLORS.green }} />
        <Line type="monotone" dataKey="aeDetect" stroke={COLORS.red} strokeWidth={2} strokeDasharray="4 4" name="Point Detection %" dot={{ r: 3, fill: COLORS.red }} />
        <Legend wrapperStyle={{ fontSize: 10, color: COLORS.textMuted }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Cluster Profile
const ClusterProfile = ({ sensor }) => {
  const wins = sensor.anomaly_windows || [];
  if (!wins.length) return <div style={{ color: COLORS.textDim, fontSize: 12 }}>No clusters</div>;

  // Duration histogram
  const bins = [
    { label: "0 min", min: 0, max: 0.01 },
    { label: "< 5m", min: 0.01, max: 5 },
    { label: "5-15m", min: 5, max: 15 },
    { label: "15-30m", min: 15, max: 30 },
    { label: "30-60m", min: 30, max: 60 },
    { label: "> 60m", min: 60, max: Infinity },
  ];

  const histData = bins.map(b => ({
    label: b.label,
    count: wins.filter(w => w.duration_min >= b.min && w.duration_min < b.max).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={histData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLORS.textDim }} />
        <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} />
        <Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.text }} />
        <Bar dataKey="count" name="Clusters" radius={[3, 3, 0, 0]}>
          {histData.map((d, i) => (
            <Cell key={i} fill={i === 0 ? COLORS.red : i < 3 ? COLORS.amber : COLORS.green} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Sensor Detail Panel
const SensorDetail = ({ sensor }) => {
  const p = sensor.profile || {};
  const r = sensor.recommendations || {};
  const j = sensor.justification || "";
  const [showJust, setShowJust] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{sensor.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
              Building {p.building} · Native {p.native_interval_min}m · {p.total_clusters || 0} clusters · {p.clusters_per_day || 0}/day
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill color={tierColor(p.model_tier)} bg={tierColor(p.model_tier) + "20"}>{p.model_tier}</Pill>
            <Pill color={vulnColor(p.vulnerability)} bg={vulnColor(p.vulnerability) + "20"}>{p.vulnerability} vuln</Pill>
            <Pill color={confColor(p.confidence)} bg={confColor(p.confidence) + "20"}>{p.confidence} conf</Pill>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <SectionTitle>Recommended Intervals</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Object.entries(COLORS).length && ["alarm_urgent_critical", "alarm_less_critical", "calculation_reporting", "calculation_analytics"].map(ctx => {
            const rec = r[ctx] || {};
            const labels = { alarm_urgent_critical: "Urgent", alarm_less_critical: "Less Critical", calculation_reporting: "Reporting", calculation_analytics: "Analytics" };
            const colors = { alarm_urgent_critical: COLORS.red, alarm_less_critical: COLORS.amber, calculation_reporting: COLORS.cyan, calculation_analytics: COLORS.purple };
            return (
              <div key={ctx} style={{ textAlign: "center", padding: 10, background: COLORS.surfaceAlt, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{labels[ctx]}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: colors[ctx], fontFamily: "'JetBrains Mono', monospace" }}>
                  {rec.recommended_interval_min ?? "—"}<span style={{ fontSize: 11, fontWeight: 400 }}>m</span>
                </div>
                <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 2 }}>{rec.method || ""}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionTitle>Anomaly Timeline (Hourly)</SectionTitle>
          <TimelineChart sensor={sensor} />
        </Card>
        <Card>
          <SectionTitle>Degradation Curve</SectionTitle>
          <DegradationChart sensor={sensor} />
        </Card>
      </div>

      {/* Cluster Profile */}
      <Card>
        <SectionTitle>Cluster Duration Distribution</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ClusterProfile sensor={sensor} />
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
            <div>Median duration: <span style={{ color: COLORS.text }}>{p.cluster_duration_median ?? "—"} min</span></div>
            <div>P10–P90: <span style={{ color: COLORS.text }}>{p.cluster_duration_p10 ?? "—"} – {p.cluster_duration_p90 ?? "—"} min</span></div>
            <div>Max duration: <span style={{ color: COLORS.text }}>{p.cluster_duration_max ?? "—"} min</span></div>
            <div>Single-point: <span style={{ color: COLORS.text }}>{p.single_point_clusters ?? 0}/{p.total_clusters || 0} ({((p.single_point_fraction || 0) * 100).toFixed(0)}%)</span></div>
            <div>Total anomaly time: <span style={{ color: COLORS.text }}>{p.total_anomaly_duration_min ?? 0} min</span></div>
            <div>Peak score: <span style={{ color: COLORS.text }}>{p.peak_score_median ?? "—"} median / {p.peak_score_max ?? "—"} max</span></div>
          </div>
        </div>
      </Card>

      {/* Justification */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showJust ? 12 : 0 }}>
          <SectionTitle>Justification</SectionTitle>
          <button onClick={() => setShowJust(!showJust)} style={{
            background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted, fontSize: 10, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
          }}>{showJust ? "Hide" : "Show"}</button>
        </div>
        {showJust && (
          <pre style={{
            fontSize: 11, lineHeight: 1.6, color: COLORS.textMuted,
            whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace",
            background: COLORS.bg, padding: 12, borderRadius: 6, margin: 0,
            maxHeight: 400, overflowY: "auto",
          }}>{j}</pre>
        )}
      </Card>
    </div>
  );
};

// Main App
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [view, setView] = useState("fleet"); // fleet | detail

  // Auto-load from public folder on mount
  useState(() => {
    fetch("/dashboard_data.json")
      .then(res => {
        if (!res.ok) throw new Error("Not found in public/");
        return res.json();
      })
      .then(parsed => {
        setData(parsed);
        const firstSensor = Object.keys(parsed.sensors || {})[0];
        if (firstSensor) setSelectedSensor(firstSensor);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        // Strip BOM if present
        const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
        const parsed = JSON.parse(clean);
        setData(parsed);
        const firstSensor = Object.keys(parsed.sensors || {})[0];
        if (firstSensor) setSelectedSensor(firstSensor);
      } catch (err) {
        alert("Invalid JSON file: " + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const selectSensor = useCallback((name) => {
    setSelectedSensor(name);
    setView("detail");
  }, []);

  if (!data) {
    return (
      <div style={{
        minHeight: "100vh", background: COLORS.bg, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20,
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, letterSpacing: -0.5 }}>
          Sensor Anomaly Dashboard
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 8 }}>
          {loading ? "Loading..." : "Place dashboard_data.json in public/ folder, or upload below"}
        </div>
        {!loading && (
          <label style={{
            padding: "10px 24px", background: COLORS.accent, color: "#fff",
            borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            Upload JSON
            <input type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}
      </div>
    );
  }

  const sensorData = data.sensors?.[selectedSensor];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Sensor Anomaly Dashboard</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setView("fleet")} style={{
              background: view === "fleet" ? COLORS.accent : "transparent",
              border: `1px solid ${view === "fleet" ? COLORS.accent : COLORS.border}`,
              color: view === "fleet" ? "#fff" : COLORS.textMuted,
              padding: "4px 12px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}>Fleet</button>
            <button onClick={() => setView("detail")} style={{
              background: view === "detail" ? COLORS.accent : "transparent",
              border: `1px solid ${view === "detail" ? COLORS.accent : COLORS.border}`,
              color: view === "detail" ? "#fff" : COLORS.textMuted,
              padding: "4px 12px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}>Detail</button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim }}>
          {Object.keys(data.sensors || {}).length} sensors · v{data.pipeline_version || "?"}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        {view === "fleet" && (
          <>
            <FleetOverview data={data} />
            <SectionTitle>Sensor Fleet</SectionTitle>
            <SensorTable data={data} selectedSensor={selectedSensor} onSelect={selectSensor} />
          </>
        )}

        {view === "detail" && sensorData && (
          <SensorDetail sensor={sensorData} />
        )}

        {view === "detail" && !sensorData && (
          <Card><div style={{ color: COLORS.textDim, textAlign: "center", padding: 40 }}>Select a sensor from Fleet view</div></Card>
        )}
      </div>
    </div>
  );
}
