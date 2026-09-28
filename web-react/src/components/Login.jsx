import { useState } from "react";
import { login, register } from "../api";
import { SHOW_DEMO_ACCOUNTS } from "../config";
import { decodeJwt } from "../jwt";
import Icon from "./Icon";

const DEMO_ACCOUNTS = [
  { label: "Admin", identifier: "admin", password: "Admin123!", hint: "gestiona todo el catálogo" },
  { label: "Cliente", identifier: "cliente", password: "Cliente123!", hint: "crea y gestiona lo suyo" },
];

const FEATURES = [
  { icon: "shield", title: "Una sola sesión", text: "El mismo JWT protege el catálogo y el chat." },
  { icon: "tag", title: "Trazabilidad", text: "Cada producto muestra quién lo creó." },
  { icon: "zap", title: "Chat en tiempo real", text: "Conversa con el equipo sin recargar." },
];

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [identifier, setIdentifier] = useState(""); // correo o usuario (login)
  const [username, setUsername] = useState(""); // registro
  const [email, setEmail] = useState(""); // registro
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function signIn(id, pass) {
    const { token } = await login(id, pass);
    // La identidad (id, username, role) viaja dentro del JWT.
    const { id: userId, username: name, role } = decodeJwt(token);
    onAuthenticated({ id: userId, username: name, role }, token);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(identifier.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
        // Tras registrarse se entra directo con las mismas credenciales.
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setMode("login");
    setIdentifier(account.identifier);
    setPassword(account.password);
    setError("");
  }

  return (
    <main className="auth-page">
      <aside className="auth-hero">
        <div className="brand brand-lg">
          <span className="brand-mark"><Icon name="leaf" size={22} /></span>
          EcoHome Store
        </div>
        <h1>Productos para un hogar más sostenible.</h1>
        <p>Gestiona el catálogo, sigue quién creó cada producto y coordina con tu equipo desde un solo lugar.</p>
        <ul className="feature-list">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="feature-icon"><Icon name={f.icon} size={18} /></span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="brand auth-brand-mobile">
            <span className="brand-mark"><Icon name="leaf" size={20} /></span>
            EcoHome Store
          </div>
          <h2>{isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
          <p className="muted">
            {isLogin ? "Inicia sesión para ver el catálogo y el chat." : "Regístrate como cliente en pocos segundos."}
          </p>

          <div className="segmented" role="tablist" aria-label="Acceso">
            <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? "active" : ""} onClick={() => switchMode("login")}>
              Iniciar sesión
            </button>
            <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? "active" : ""} onClick={() => switchMode("register")}>
              Registrarse
            </button>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            {isLogin ? (
              <label className="field">
                <span>Correo o usuario</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>Usuario</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    minLength={3}
                    maxLength={50}
                    pattern="[A-Za-z0-9_.\-]+"
                    title="Letras, números, punto, guion y guion bajo"
                    required
                  />
                </label>
                <label className="field">
                  <span>Correo electrónico</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </label>
              </>
            )}

            <label className="field">
              <span>Contraseña</span>
              <div className="input-with-action">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={isLogin ? undefined : 6}
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>
              {!isLogin && <small className="muted">Mínimo 6 caracteres.</small>}
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="btn primary block" disabled={loading}>
              {loading ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta y entrar"}
            </button>
          </form>

          {SHOW_DEMO_ACCOUNTS && isLogin && (
            <div className="demo">
              <span className="demo-title">Cuentas de prueba</span>
              <div className="demo-buttons">
                {DEMO_ACCOUNTS.map((a) => (
                  <button key={a.label} type="button" className="btn ghost" onClick={() => fillDemo(a)}>
                    <strong>{a.label}</strong>
                    <small>{a.hint}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
