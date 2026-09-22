import { useCallback, useEffect, useState } from "react";
import { createProduct, getProducts } from "../api";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});

// Catálogo con columna "Creado por" y formulario de alta (solo rol admin).
// Al crear un producto avisa a App (onProductCreated) para refrescar el
// contador "Nombre (N)" del encabezado sin recargar la página.
export default function Catalog({ user, token, onProductCreated, onAuthError }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await getProducts(token));
      setError("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) return onAuthError();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onAuthError]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await createProduct(token, { name: name.trim(), price: Number(price) });
      setName("");
      setPrice("");
      setNotice(`Producto "${created.name}" creado por ${created.creator?.username}.`);
      // Actualiza la tabla y el contador del encabezado (Arturo (14) -> Arturo (15)).
      await Promise.all([loadProducts(), onProductCreated()]);
    } catch (err) {
      if (err.status === 401) return onAuthError();
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="catalog-card">
      <h2>Catálogo de productos</h2>

      {user.role === "admin" ? (
        <form className="product-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Nombre del producto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0.01"
            step="0.01"
            required
          />
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Guardando..." : "Agregar producto"}
          </button>
        </form>
      ) : (
        <p className="hint">
          Tu rol es «{user.role}»: puedes consultar el catálogo, pero solo un administrador puede crear productos.
        </p>
      )}

      {notice && <p className="auth-info">{notice}</p>}
      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="hint">Cargando productos...</p>
      ) : (
        <div className="table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th className="num">Precio</th>
                <th>Creado por</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan="4" className="hint">El catálogo está vacío.</td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td className="num">{money.format(Number(p.price))}</td>
                  <td>
                    {p.creator ? (
                      <span className={p.creator.username === user.username ? "chip own" : "chip"}>
                        {p.creator.username}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
