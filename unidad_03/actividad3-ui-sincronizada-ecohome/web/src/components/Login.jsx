import { useState } from "react";
import { login, register } from "../api";
import { decodeJwt } from "../jwt";

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { token } = await login(email.trim(), password);
        // La identidad (id, username, role) viaja dentro del JWT.
        const { id, username: name, role } = decodeJwt(token);
        const user = { id, username: name, role };
        localStorage.setItem("ecohome_token", token);
        localStorage.setItem("ecohome_user", JSON.stringify(user));
        onAuthenticated(user, token);
      } else {
        await register(username.trim(), email.trim(), password);
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
      <div className="brand-icon">🌿</div>
      <h1>EcoHome Store</h1>
      <p className="subtitle">Catálogo y chat &mdash; React + JWT</p>

      <div className="tabs">
        <button
          type="button"
          className={mode === "login" ? "tab-btn active" : "tab-btn"}
          onClick={() => switchMode("login")}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          className={mode === "register" ? "tab-btn active" : "tab-btn"}
          onClick={() => switchMode("register")}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        )}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
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
