import { useState } from "react";
import Modal from "./Modal";

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-text">{message}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn danger" onClick={handleConfirm} disabled={busy}>
          {busy ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
