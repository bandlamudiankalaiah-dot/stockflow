export default function FullPageLoader({ label = "Loading…" }) {
  return (
    <div className="sf-full-loader">
      <div className="sf-loader-mark">
        <i className="bi bi-box-seam" aria-hidden="true" />
      </div>
      <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      <p className="mb-0 text-secondary small">{label}</p>
    </div>
  );
}
