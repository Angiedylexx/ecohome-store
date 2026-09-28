import { useCallback, useEffect, useState } from "react";
import { getStats, isAuthError } from "./api";
import Catalog from "./components/Catalog";
import Chat from "./components/Chat";
import Header from "./components/Header";
import Login from "./components/Login";
import { useToast } from "./hooks/toastContext";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { decodeJwt, isExpired } from "./jwt";

const TOKEN_KEY = "ecohome_token";
const USER_KEY = "ecohome_user";

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Sesión persistida (equivalente móvil: SharedPreferences). Se descarta si el
// JWT ya venció para no mostrar pantallas que el servidor rechazaría.
function readStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;

  try {
    if (isExpired(decodeJwt(token))) throw new Error("expirado");
    return { token, user: JSON.parse(rawUser) };
  } catch {
    clearStoredSession();
    return null;
  }
}

export default function App() {
  const toast = useToast();
  const [session, setSession] = useState(readStoredSession);
  const [view, setView] = useState("catalog"); // "catalog" | "chat" (solo en pantallas angostas)
  // Contador de productos creados por el usuario autenticado ("Arturo (14)").
  const [productCount, setProductCount] = useState(null);
  const [unread, setUnread] = useState(0);

  // Con ≥1024px catálogo y chat se ven a la vez; debajo, una pestaña a la vez.
  const wide = useMediaQuery("(min-width: 1024px)");
  const chatVisible = wide || view === "chat";

  const handleViewChange = useCallback((next) => {
    setView(next);
    if (next === "chat") setUnread(0);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setProductCount(null);
    setUnread(0);
    setView("catalog");
    setSession(null);
  }, []);

  const handleSessionLost = useCallback(() => {
    toast.info("Tu sesión expiró. Inicia sesión de nuevo.");
    handleLogout();
  }, [handleLogout, toast]);

  const handleAuthenticated = useCallback((user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSession({ user, token });
  }, []);

  // GET /users/me/stats: se consulta al iniciar sesión y tras cada cambio del catálogo.
  const refreshStats = useCallback(async () => {
    if (!session) return;
    try {
      const stats = await getStats(session.token);
      setProductCount(stats.count);
    } catch (err) {
      if (isAuthError(err)) handleSessionLost();
    }
  }, [session, handleSessionLost]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // El JWT vence (1 h): se cierra la sesión justo entonces en vez de esperar al primer 401.
  useEffect(() => {
    if (!session) return;
    const exp = decodeJwt(session.token)?.exp;
    if (!exp) return;
    const timer = setTimeout(handleSessionLost, Math.max(exp * 1000 - Date.now(), 0));
    return () => clearTimeout(timer);
  }, [session, handleSessionLost]);

  if (!session) return <Login onAuthenticated={handleAuthenticated} />;

  const { user, token } = session;

  return (
    <div className="app">
      <Header
        user={user}
        productCount={productCount}
        view={view}
        onViewChange={handleViewChange}
        unread={unread}
        showTabs={!wide}
        onLogout={handleLogout}
      />
      <main className="layout">
        <div className="pane pane-catalog" hidden={!wide && view !== "catalog"}>
          <Catalog
            user={user}
            token={token}
            productCount={productCount}
            onProductsChanged={refreshStats}
            onAuthError={handleSessionLost}
          />
        </div>
        {/* El chat queda montado aunque esté oculto: conserva la conexión y cuenta los no leídos. */}
        <aside className="pane pane-chat" hidden={!chatVisible}>
          <Chat
            user={user}
            token={token}
            onIncoming={() => !chatVisible && setUnread((n) => n + 1)}
            onAuthError={handleSessionLost}
          />
        </aside>
      </main>
    </div>
  );
}
