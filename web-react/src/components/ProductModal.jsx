import { useState } from "react";
import Modal from "./Modal";

// Crear (product = null) o editar un producto. `onSubmit` devuelve una promesa;
// si rechaza, el mensaje se muestra dentro del formulario y el modal sigue abierto.
export default function ProductModal({ product, onSubmit, onClose }) {
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(Number(product.price)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const priceNumber = Number(price);
    if (!name.trim()) return setError("Escribe el nombre del producto.");
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return setError("El precio debe ser un número mayor a 0.");
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({ name: name.trim(), price: priceNumber });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bombillo LED 9W"
            maxLength={150}
            autoFocus
          />
        </label>
        <label className="field">
          <span>Precio (COP)</span>
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            min="0.01"
            step="0.01"
          />
        </label>
        {editing && (
          <p className="hint">
            Creado por <strong>{product.creator?.username ?? "—"}</strong>: el creador original no cambia al editar.
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
