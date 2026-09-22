import { io } from "socket.io-client";
import { API_URL } from "./config";

// Crea una conexión de Socket.IO autenticada con el JWT emitido por
// POST /api/login. El token viaja en el handshake (socket.handshake.auth
// .token en el servidor), no en la query string.
export function createSocket(token) {
  return io(API_URL, {
    transports: ["websocket"],
    auth: { token },
  });
}
