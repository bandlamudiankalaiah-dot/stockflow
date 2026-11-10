export default function SummaryCard({ label, value, hint, icon, tone = "blue" }) {
  return (
    <div className="sf-stat-card">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <p className="sf-stat-label mb-2">{label}</p>
          <p className="sf-stat-value mb-1">{value}</p>
          {hint ? <p className="sf-stat-hint mb-0">{hint}</p> : null}
        </div>
        <div className={`sf-stat-icon sf-tone-${tone}`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
