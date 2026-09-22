import { useState } from "react";
import { login, register } from "../api";

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "login") {
        // Login en React con JWT: al autenticarse, el token se guarda en
        // localStorage para persistir la sesión entre recargas, y se
        // notifica al componente padre para dar acceso al chat.
        const data = await login(username.trim(), password);
        localStorage.setItem("ecohome_token", data.token);
        localStorage.setItem("ecohome_user", JSON.stringify(data.user));
        onAuthenticated(data.user, data.token);
      } else {
        await register(username.trim(), password);
        setInfo("Cuenta creada. Ahora inicia sesión.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="brand-icon">🔐</div>
      <h1>EcoHome Store</h1>
      <p className="subtitle">Chat interno &mdash; React + JWT</p>

      <div className="tabs">
        <button
          type="button"
          className={mode === "login" ? "tab-btn active" : "tab-btn"}
          onClick={() => { setMode("login"); setError(""); setInfo(""); }}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          className={mode === "register" ? "tab-btn active" : "tab-btn"}
          onClick={() => { setMode("register"); setError(""); setInfo(""); }}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder={mode === "register" ? "Contraseña (mín. 6 caracteres)" : "Contraseña"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        <button type="submit" className="primary" disabled={loading}>
          {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}
      {info && <p className="auth-info">{info}</p>}
    </div>
  );
}
