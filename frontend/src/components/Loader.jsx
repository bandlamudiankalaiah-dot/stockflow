export default function Loader({ label = "Loading data…" }) {
  return (
    <div className="sf-loading" role="status">
      <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
