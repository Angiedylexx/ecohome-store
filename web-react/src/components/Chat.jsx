import { useEffect, useRef, useState } from "react";
import { formatTime } from "../format";
import { useToast } from "../hooks/toastContext";
import { createSocket } from "../socket";
import Avatar from "./Avatar";
import Icon from "./Icon";

const MAX_LENGTH = 500;
// Distancia al final de la lista bajo la cual se considera que el usuario "sigue" la conversación.
const STICK_THRESHOLD = 120;

// Chat en tiempo real (Socket.IO) con el mismo JWT del login.
//  - "messages": historial (últimos 10) al conectar.
//  - "new-message": cada mensaje nuevo, propio o ajeno (el servidor lo guarda y lo reenvía).
// Permanece montado aunque esté oculto para conservar la conexión; `onIncoming`
// avisa a App de mensajes ajenos para mostrar el contador de no leídos.
export default function Chat({ user, token, onIncoming, onAuthError }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [state, setState] = useState("connecting"); // "connecting" | "online" | "offline"
  const [statusText, setStatusText] = useState("Conectando…");
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const stickRef = useRef(true);
  // Referencias estables para usar callbacks actuales dentro del efecto del socket.
  const callbacks = useRef({ onIncoming, onAuthError, toast, username: user.username });
  useEffect(() => {
    callbacks.current = { onIncoming, onAuthError, toast, username: user.username };
  });

  useEffect(() => {
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setState("online");
      setStatusText("En línea");
    });

    // Historial: reemplaza la lista local completa.
    socket.on("messages", (history) => {
      stickRef.current = true;
      setMessages(history);
    });

    socket.on("new-message", (msg) => {
      if (msg.username === callbacks.current.username) stickRef.current = true;
      else callbacks.current.onIncoming?.(msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("message-error", (err) => callbacks.current.toast.error(err?.error || "No se pudo enviar el mensaje"));

    socket.on("connect_error", (err) => {
      setState("offline");
      if (/token|autenticaci/i.test(err.message)) {
        setStatusText("Sesión inválida");
        socket.disconnect();
        callbacks.current.onAuthError?.();
      } else {
        // Socket.IO reintenta solo: se informa y se deja reconectar.
        setStatusText("Sin conexión, reintentando…");
      }
    });

    socket.on("disconnect", () => {
      setState("offline");
      setStatusText("Desconectado");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Mantiene el final de la lista visible salvo que la persona haya subido a leer.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const list = listRef.current;
    stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < STICK_THRESHOLD;
  }

  function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || state !== "online") return;

    // Solo viaja el texto: el servidor asigna user_id/username desde el JWT del socket.
    socketRef.current.emit("new-message", { content });
    setText("");
  }

  const online = state === "online";

  return (
    <section className="chat" aria-label="Chat">
      <header className="chat-head">
        <span className="chat-title"><Icon name="chat" size={18} /> Chat del equipo</span>
        <span className={`status ${state}`}>
          <span className="dot" />
          {statusText}
        </span>
      </header>

      <ul className="messages" ref={listRef} onScroll={handleScroll} aria-live="polite">
        {messages.length === 0 && (
          <li className="chat-empty">
            <Icon name="chat" size={26} />
            <span>Aún no hay mensajes.<br />¡Escribe el primero!</span>
          </li>
        )}
        {messages.map((msg, i) => {
          const own = msg.username === user.username;
          const grouped = messages[i - 1]?.username === msg.username;
          return (
            <li key={msg.id} className={`msg ${own ? "own" : "other"} ${grouped ? "grouped" : ""}`}>
              {!own && (grouped ? <span className="avatar-spacer" /> : <Avatar name={msg.username} size={28} />)}
              <div className="msg-body">
                {!own && !grouped && <span className="msg-sender">{msg.username}</span>}
                <div className="bubble">
                  {msg.content}
                  <time dateTime={msg.created_at}>{formatTime(msg.created_at)}</time>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={online ? "Escribe un mensaje…" : "Esperando conexión…"}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          disabled={!online}
          aria-label="Mensaje"
        />
        <button type="submit" className="send-btn" disabled={!online || !text.trim()} aria-label="Enviar mensaje">
          <Icon name="send" size={18} />
        </button>
        {text.length > MAX_LENGTH - 80 && (
          <span className="char-count">{text.length}/{MAX_LENGTH}</span>
        )}
      </form>
    </section>
  );
}
