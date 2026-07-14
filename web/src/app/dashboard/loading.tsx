// Instant skeleton shown while the dashboard JS loads (server-rendered, no wallet SDK).
export default function DashboardLoading() {
  return (
    <>
      <div
        style={{
          height: 64,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.5rem",
          background: "var(--glass)",
        }}
      >
        <strong className="font-head" style={{ fontSize: "1.05rem" }}>Gatekeep</strong>
        <div className="skeleton" style={{ width: 220, height: 30, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 10 }} />
      </div>
      <div style={{ padding: "1.4rem 1.5rem" }}>
        <div className="skeleton" style={{ width: 120, height: 24, borderRadius: 8, marginBottom: "1rem" }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
            minHeight: "60vh",
          }}
        >
          <div style={{ borderRight: "1px solid var(--border)", padding: "1rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ marginBottom: "1.1rem" }}>
                <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 6, marginBottom: ".5rem" }} />
                <div className="skeleton" style={{ width: "90%", height: 12, borderRadius: 6 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            Loading your inbox…
          </div>
        </div>
      </div>
    </>
  );
}
