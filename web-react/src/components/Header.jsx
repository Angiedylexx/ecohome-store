import Avatar from "./Avatar";
import Icon from "./Icon";

// Barra superior: marca, pestañas (solo en pantallas angostas, donde catálogo y
// chat no caben juntos), indicador "Nombre (N)" y cierre de sesión.
export default function Header({ user, productCount, view, onViewChange, unread, showTabs, onLogout }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><Icon name="leaf" size={18} /></span>
        <span className="brand-name">EcoHome Store</span>
      </div>

      {showTabs && (
        <nav className="tabs" aria-label="Secciones">
          <button type="button" className={view === "catalog" ? "active" : ""} onClick={() => onViewChange("catalog")}>
            <Icon name="package" size={16} /> Catálogo
          </button>
          <button type="button" className={view === "chat" ? "active" : ""} onClick={() => onViewChange("chat")}>
            <Icon name="chat" size={16} /> Chat
            {unread > 0 && <span className="badge" aria-label={`${unread} mensajes nuevos`}>{unread > 9 ? "9+" : unread}</span>}
          </button>
        </nav>
      )}

      <div className="topbar-user">
        <div className="user-pill" title={`Sesión iniciada como ${user.username} (${user.role})`}>
          <Avatar name={user.username} size={28} />
          {/* Formato exacto pedido: Nombre (N) */}
          <span className="user-badge" data-testid="user-badge">
            {user.username} ({productCount ?? "…"})
          </span>
          <span className={`role-tag ${user.role}`}>{user.role}</span>
        </div>
        <button type="button" className="btn ghost sm" onClick={onLogout}>
          <Icon name="logout" size={16} />
          <span className="hide-sm">Salir</span>
        </button>
      </div>
    </header>
  );
}
