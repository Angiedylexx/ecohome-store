import { useEffect, useRef } from "react";
import Icon from "./Icon";

// Diálogo modal sobre <dialog>: el navegador gestiona foco, Escape y capa de fondo.
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo (fuera de la tarjeta) cierra.
        if (e.target === ref.current) ref.current.close();
      }}
    >
      <div className="modal-card">
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={() => ref.current.close()} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
