import { useCallback, useEffect, useMemo, useState } from "react";
import { createProduct, deleteProduct, getProducts, isAuthError, updateProduct } from "../api";
import { formatDate, formatPrice } from "../format";
import { useToast } from "../hooks/toastContext";
import Avatar from "./Avatar";
import ConfirmModal from "./ConfirmModal";
import Icon from "./Icon";
import ProductModal from "./ProductModal";

const SORTS = {
  recent: { label: "Más recientes", fn: (a, b) => b.id - a.id },
  name: { label: "Nombre (A-Z)", fn: (a, b) => a.name.localeCompare(b.name, "es") },
  "price-asc": { label: "Precio: menor a mayor", fn: (a, b) => Number(a.price) - Number(b.price) },
  "price-desc": { label: "Precio: mayor a menor", fn: (a, b) => Number(b.price) - Number(a.price) },
};

function StatCard({ icon, label, value, tone }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span className="stat-icon"><Icon name={icon} size={20} /></span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </div>
    </div>
  );
}

// Catálogo: tarjetas de resumen, búsqueda/filtros y tabla con columna "Creado por".
// Crear (cualquier usuario), editar y borrar (su creador o un admin) refrescan la tabla y avisan a App
// (onProductsChanged) para actualizar el contador "Nombre (N)" sin recargar.
export default function Catalog({ user, token, productCount, onProductsChanged, onAuthError }) {
  const toast = useToast();
  const isAdmin = user.role === "admin";
  // Editar/eliminar: el creador del producto o un admin (el backend lo vuelve a comprobar).
  const canModify = (p) => isAdmin || (p.creator != null && p.creator.id === user.id);

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState("recent");

  const [editing, setEditing] = useState(null); // null | "new" | producto
  const [deleting, setDeleting] = useState(null); // null | producto
  const [highlightId, setHighlightId] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await getProducts(token));
      setError("");
      setStatus("ready");
    } catch (err) {
      if (isAuthError(err)) return onAuthError();
      setError(err.message);
      setStatus((s) => (s === "loading" ? "error" : s));
      throw err;
    }
  }, [token, onAuthError]);

  useEffect(() => {
    loadProducts().catch(() => {});
  }, [loadProducts]);

  useEffect(() => {
    if (highlightId === null) return;
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadProducts(), onProductsChanged()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  // Lanzan el error hacia el modal (que lo muestra dentro del formulario),
  // salvo que la sesión ya no sirva: entonces se vuelve al login.
  async function handleSave(values) {
    try {
      if (editing === "new") {
        const created = await createProduct(token, values);
        setHighlightId(created.id);
        toast.success(`«${created.name}» creado por ${created.creator?.username ?? user.username}.`);
      } else {
        const updated = await updateProduct(token, editing.id, values);
        setHighlightId(updated.id);
        toast.success(`«${updated.name}» actualizado.`);
      }
    } catch (err) {
      if (isAuthError(err)) return onAuthError();
      throw err;
    }
    setEditing(null);
    // Tabla y contador se actualizan a la vez (admin (6) -> admin (7)).
    await Promise.all([loadProducts(), onProductsChanged()]).catch(() => {});
  }

  async function handleDelete() {
    try {
      await deleteProduct(token, deleting.id);
      toast.success(`«${deleting.name}» eliminado.`);
    } catch (err) {
      if (isAuthError(err)) return onAuthError();
      throw err;
    }
    setDeleting(null);
    await Promise.all([loadProducts(), onProductsChanged()]).catch(() => {});
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => !onlyMine || p.creator?.username === user.username)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.creator?.username ?? "").toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [products, query, onlyMine, sort, user.username]);

  const average = useMemo(
    () => (products.length ? products.reduce((sum, p) => sum + Number(p.price), 0) / products.length : 0),
    [products]
  );

  const filtering = query.trim() !== "" || onlyMine;
  const clearFilters = () => {
    setQuery("");
    setOnlyMine(false);
  };

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="page-head">
        <div>
          <h1 id="catalog-title">Catálogo</h1>
          <p className="muted">Productos ecológicos y quién los registró.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={18} /> Nuevo producto
        </button>
      </div>

      <div className="stats">
        <StatCard icon="package" label="Productos" value={status === "ready" ? products.length : "…"} />
        <StatCard icon="user" label="Creados por ti" value={productCount ?? "…"} tone="accent" />
        <StatCard icon="tag" label="Precio promedio" value={status === "ready" && products.length ? formatPrice(average) : "—"} />
      </div>

      {!isAdmin && (
        <p className="notice">
          <Icon name="info" size={16} />
          Puedes crear productos y editar o eliminar los tuyos. Cada producto que crees suma a tu contador.
        </p>
      )}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto o creador…"
            aria-label="Buscar productos"
          />
        </label>
        <button
          type="button"
          className={`chip-toggle ${onlyMine ? "on" : ""}`}
          aria-pressed={onlyMine}
          onClick={() => setOnlyMine((v) => !v)}
        >
          Solo míos
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar por">
          {Object.entries(SORTS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button type="button" className="icon-btn bordered" onClick={handleRefresh} disabled={refreshing} aria-label="Actualizar catálogo" title="Actualizar">
          <Icon name="refresh" className={refreshing ? "spin" : ""} />
        </button>
      </div>

      {status === "error" ? (
        <div className="empty">
          <Icon name="alert" size={28} />
          <strong>No se pudo cargar el catálogo</strong>
          <p className="muted">{error}</p>
          <button type="button" className="btn primary" onClick={handleRefresh}>Reintentar</button>
        </div>
      ) : (
        <div className="table-card">
          <table className="products-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Precio</th>
                <th>Creado por</th>
                <th>Fecha</th>
                <th className="actions-col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {status === "loading" &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="skeleton-row" aria-hidden="true">
                    <td><span className="skeleton w-60" /></td>
                    <td className="num"><span className="skeleton w-40" /></td>
                    <td><span className="skeleton w-50" /></td>
                    <td><span className="skeleton w-40" /></td>
                    <td />
                  </tr>
                ))}

              {status === "ready" &&
                visible.map((p) => (
                  <tr key={p.id} className={p.id === highlightId ? "flash" : ""}>
                    <td data-label="Producto">
                      <span className="product-name">{p.name}</span>
                      <span className="product-id">#{p.id}</span>
                    </td>
                    <td data-label="Precio" className="num price">{formatPrice(p.price)}</td>
                    <td data-label="Creado por">
                      {p.creator ? (
                        <span className={`creator ${p.creator.username === user.username ? "own" : ""}`}>
                          <Avatar name={p.creator.username} size={24} />
                          {p.creator.username}
                          {p.creator.username === user.username && <em>tú</em>}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-label="Fecha" className="muted">{formatDate(p.created_at)}</td>
                    <td className="actions-col">
                      {canModify(p) && (
                        <>
                        <button type="button" className="icon-btn" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} title="Editar">
                          <Icon name="pencil" size={17} />
                        </button>
                        <button type="button" className="icon-btn danger" onClick={() => setDeleting(p)} aria-label={`Eliminar ${p.name}`} title="Eliminar">
                          <Icon name="trash" size={17} />
                        </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {status === "ready" && visible.length === 0 && (
            <div className="empty">
              <Icon name="package" size={28} />
              {filtering ? (
                <>
                  <strong>Sin resultados</strong>
                  <p className="muted">Ningún producto coincide con los filtros.</p>
                  <button type="button" className="btn ghost" onClick={clearFilters}>Limpiar filtros</button>
                </>
              ) : (
                <>
                  <strong>El catálogo está vacío</strong>
                  <p className="muted">Crea el primer producto para empezar.</p>
                </>
              )}
            </div>
          )}

          {status === "ready" && visible.length > 0 && (
            <p className="table-foot muted">
              Mostrando {visible.length} de {products.length} productos
            </p>
          )}
        </div>
      )}

      {editing && (
        <ProductModal
          product={editing === "new" ? null : editing}
          onSubmit={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Seguro que quieres eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
