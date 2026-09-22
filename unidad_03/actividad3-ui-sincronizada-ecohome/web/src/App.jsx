import { useCallback, useEffect, useState } from "react";
import Login from "./components/Login";
import Catalog from "./components/Catalog";
import Chat from "./components/Chat";
import { getStats } from "./api";
import { decodeJwt, isExpired } from "./jwt";
import "./App.css";

// Sesión persistida (equivalente móvil: SharedPreferences). Se descarta si el
// JWT ya venció para no mostrar pantallas que el servidor rechazaría.
function readStoredSession() {
  const token = localStorage.getItem("ecohome_token");
  const rawUser = localStorage.getItem("ecohome_user");
  if (!token || !rawUser) return null;

  try {
    if (isExpired(decodeJwt(token))) throw new Error("expirado");
    return { token, user: JSON.parse(rawUser) };
  } catch {
    localStorage.removeItem("ecohome_token");
    localStorage.removeItem("ecohome_user");
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(readStoredSession);
  const [view, setView] = useState("catalog"); // "catalog" | "chat"
  // Contador de productos creados por el usuario autenticado ("Arturo (14)").
  const [userProductCount, setUserProductCount] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("ecohome_token");
    localStorage.removeItem("ecohome_user");
    setUserProductCount(null);
    setView("catalog");
    setSession(null);
  }, []);

  // GET /users/me/stats: se consulta al iniciar sesión y tras cada alta.
  const refreshStats = useCallback(async () => {
    if (!session) return;
    try {
      const stats = await getStats(session.token);
      setUserProductCount(stats.count);
    } catch (err) {
      if (err.status === 401 || err.status === 403) handleLogout();
    }
  }, [session, handleLogout]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (!session) {
    return (
      <div className="app-shell">
        <Login onAuthenticated={(user, token) => setSession({ user, token })} />
      </div>
    );
  }

  const { user, token } = session;

  return (
    <div className="app-shell">
      <div className="workspace">
        <header className="topbar">
          <span className="brand">🌿 EcoHome Store</span>
          <nav>
            <button
              className={view === "catalog" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("catalog")}
            >
              Catálogo
            </button>
            <button
              className={view === "chat" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("chat")}
            >
              Chat
            </button>
          </nav>
          {/* Formato exacto pedido: Nombre (N) */}
          <span className="user-badge" data-testid="user-badge">
            {user.username} ({userProductCount ?? "…"})
          </span>
          <button className="logout-btn dark" onClick={handleLogout}>
            Salir
          </button>
        </header>

        {view === "catalog" ? (
          <Catalog user={user} token={token} onProductCreated={refreshStats} onAuthError={handleLogout} />
        ) : (
          <div className="chat-wrap">
            <Chat user={user} token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
