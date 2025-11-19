import React from "react";

export default function Notification({ isOpen, onClose, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Notification</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button onClick={onClose} className="btn btn-primary">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
