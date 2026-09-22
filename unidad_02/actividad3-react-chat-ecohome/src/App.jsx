import { useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import "./App.css";

function readStoredSession() {
  const token = localStorage.getItem("ecohome_token");
  const rawUser = localStorage.getItem("ecohome_user");
  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(readStoredSession);

  function handleAuthenticated(user, token) {
    setSession({ user, token });
  }

  function handleLogout() {
    setSession(null);
  }

  return (
    <div className="app-shell">
      {session ? (
        <Chat user={session.user} token={session.token} onLogout={handleLogout} />
      ) : (
        <Login onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}
