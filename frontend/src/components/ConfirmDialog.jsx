export default function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  variant = "danger",
  icon = "bi-exclamation-triangle",
}) {
  if (!show) return null;

  return (
    <>
      <div
        className="sf-modal-backdrop"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div className="modal d-block sf-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content sf-modal-content">
            <div className="modal-body p-4">
              <div className={`sf-modal-icon sf-tone-${variant}`}>
                <i className={`bi ${icon}`} aria-hidden="true" />
              </div>
              <h5 className="fw-semibold mb-2">{title}</h5>
              <div className="text-secondary small mb-4">{message}</div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={onCancel}
                  disabled={loading}
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  className={`btn btn-${variant}`}
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  ) : null}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
