import { useEffect, useRef, useState } from "react";
import { createSocket } from "../socket";

export default function Chat({ user, token, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Conectando...");
  const [online, setOnline] = useState(false);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setOnline(true);
      setStatus("En línea");
    });

    // Historial: el backend emite "messages" justo después de conectar,
    // con los últimos 10 mensajes en orden cronológico. React los pinta
    // reemplazando el estado local completo.
    socket.on("messages", (history) => {
      setMessages(history);
    });

    // Tiempo real: cada mensaje nuevo (propio o de otros) llega por este
    // evento y se agrega al final de la lista ya renderizada.
    socket.on("new-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("connect_error", (err) => {
      setOnline(false);
      setStatus(`Error de autenticación: ${err.message}`);
    });

    socket.on("disconnect", () => {
      setOnline(false);
      setStatus("Desconectado");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current) return;

    // El cliente solo envía el texto; el servidor asigna user_id/username
    // reales a partir del JWT verificado en el socket (socket.user).
    socketRef.current.emit("new-message", { text: trimmed });
    setText("");
  }

  function handleLogout() {
    socketRef.current?.disconnect();
    localStorage.removeItem("ecohome_token");
    localStorage.removeItem("ecohome_user");
    onLogout();
  }

  return (
    <section className="chat-card">
      <header className="chat-header">
        <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
        <div className="info">
          <strong>{user.username}</strong>
          <span>
            <span className={online ? "dot" : "dot offline"} />
            {status}
          </span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Salir</button>
      </header>

      <ul className="messages" ref={listRef}>
        {messages.length === 0 && (
          <li className="msg-row system">
            <div className="bubble">Sin mensajes todavía. ¡Escribe el primero!</div>
          </li>
        )}
        {messages.map((msg) => {
          const isOwn = msg.username === user.username;
          const time = new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li key={msg.id} className={`msg-row ${isOwn ? "own" : "other"}`}>
              {!isOwn && <div className="msg-sender">{msg.username}</div>}
              <div className="bubble">{msg.text}</div>
              <div className="msg-time">{time}</div>
            </li>
          );
        })}
      </ul>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="send-btn" aria-label="Enviar">➤</button>
      </form>
    </section>
  );
}
