import React from "react";

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title = "Confirm Deletion", message, projectName }) {
  if (!isOpen) return null;

  const confirmationMessage = message || (
    <>
      Are you sure you want to permanently delete the project: <strong>{projectName}</strong>?
    </>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {confirmationMessage}
          </p>
          <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--danger)' }}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
