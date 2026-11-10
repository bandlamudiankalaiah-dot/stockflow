export default function EmptyState({ icon = "bi-inboxes", title, message, action }) {
  return (
    <div className="sf-empty">
      <div className="sf-empty-icon">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <h6 className="fw-semibold mb-1">{title}</h6>
      <p className="text-secondary small mb-3">{message}</p>
      {action}
    </div>
  );
}
