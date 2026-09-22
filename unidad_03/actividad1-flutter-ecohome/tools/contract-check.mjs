// Verifica, SIN Flutter, que los backends existentes cumplen el contrato que
// consume la app móvil. Hace exactamente las mismas llamadas que lib/:
//   1. POST /api/login            (api_client.dart -> login)
//   2. GET  /products + Bearer    (api_client.dart -> fetchProducts)
//   3. Socket.IO websocket-only con auth.token, evento "messages" y
//      "new-message" (chat_screen.dart)
//   4. Rechazos: contraseña mala (401) y socket sin token / token falso.
//
// Uso:  node tools/contract-check.mjs
//   CHAT_URL=http://localhost:4001 PRODUCTS_URL=http://localhost:4500
//   DEMO_USER=flutter_demo DEMO_PASS=Demo1234
import { createRequire } from "node:module";

// Reutiliza socket.io-client ya instalado en el cliente React (Unidad 2).
const require = createRequire(
  new URL("../../../unidad_02/actividad3-react-chat-ecohome/package.json", import.meta.url)
);
const { io } = require("socket.io-client");

const CHAT = process.env.CHAT_URL || "http://localhost:4001";
const PRODUCTS = process.env.PRODUCTS_URL || "http://localhost:4500";
const USER = process.env.DEMO_USER || "flutter_demo";
const PASS = process.env.DEMO_PASS || "Demo1234";

let failures = 0;
const ok = (msg) => console.log(`  [OK]   ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  [FAIL] ${msg}`);
};
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
const step = (n, title) => console.log(`\n${n}. ${title}`);

const post = (path, body) =>
  fetch(`${CHAT}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

function connect(auth) {
  return new Promise((resolve) => {
    const socket = io(CHAT, { transports: ["websocket"], auth, reconnection: false });
    const state = { socket, history: null, error: null };
    socket.on("messages", (h) => (state.history = h));
    socket.on("connect", () => resolve(state));
    socket.on("connect_error", (e) => {
      state.error = e.message;
      resolve(state);
    });
    setTimeout(() => resolve(state), 5000);
  });
}

console.log(`Chat/login : ${CHAT}\nCatálogo   : ${PRODUCTS}\nUsuario    : ${USER}`);

// ---- 1. Login -------------------------------------------------------------
step(1, "Login (POST /api/login)");
let r = await post("/api/register", { username: USER, password: PASS });
check([201, 409].includes(r.status), `usuario de demo disponible (register -> ${r.status})`);

r = await post("/api/login", { username: USER, password: PASS });
const login = await r.json();
check(r.status === 200, `login -> 200`);
check(typeof login.token === "string", "respuesta trae data['token']");
check(login.user?.username === USER, `respuesta trae user.username = ${login.user?.username}`);
const token = login.token;
const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
console.log(`         payload JWT: ${JSON.stringify(claims)}`);
check(claims.user_id && claims.username && claims.exp, "JWT con user_id, username y exp (lo que decodifica session.dart)");

r = await post("/api/login", { username: USER, password: "incorrecta" });
check(r.status === 401, `contraseña incorrecta -> ${r.status} (esperado 401)`);

// ---- 2. Catálogo ----------------------------------------------------------
step(2, "Catálogo (GET /products con Authorization: Bearer)");
r = await fetch(`${PRODUCTS}/products`, { headers: { Authorization: `Bearer ${token}` } });
const products = await r.json();
check(r.status === 200, "GET /products -> 200");
check(Array.isArray(products), `respuesta es lista (${products.length} productos)`);
if (products[0]) {
  console.log(`         ejemplo: ${JSON.stringify(products[0])}`);
  check(
    !Number.isNaN(Number(products[0].price)),
    `price llega como ${typeof products[0].price} y es numérico (Product.fromJson lo parsea)`
  );
}

// ---- 3. Chat --------------------------------------------------------------
step(3, "Chat Socket.IO (transports=websocket, auth.token)");
const a = await connect({ token });
check(a.socket.connected, "conexión autenticada establecida");
await new Promise((res) => setTimeout(res, 400));
check(Array.isArray(a.history), `evento "messages" recibido (${a.history?.length ?? 0} de historial)`);

const text = `Hola desde Flutter (verificación ${new Date().toISOString()})`;
const echoed = new Promise((resolve) => {
  a.socket.on("new-message", (m) => m.text === text && resolve(m));
  setTimeout(() => resolve(null), 4000);
});
a.socket.emit("new-message", { text });
const msg = await echoed;
check(!!msg, `evento "new-message" recibido de vuelta`);
if (msg) {
  console.log(`         ${JSON.stringify(msg)}`);
  check(msg.username === USER, `servidor asignó username desde el JWT (${msg.username})`);
  check(msg.id && msg.created_at, "mensaje trae id y created_at persistidos");
}

// Segundo cliente: recibe en tiempo real lo que envía el primero.
const b = await connect({ token });
const live = new Promise((resolve) => {
  b.socket.on("new-message", (m) => resolve(m));
  setTimeout(() => resolve(null), 4000);
});
const text2 = `Segundo mensaje ${Date.now()}`;
a.socket.emit("new-message", { text: text2 });
const got = await live;
check(got?.text === text2, "un segundo cliente recibe el mensaje en tiempo real");
a.socket.close();
b.socket.close();

// ---- 4. Rechazos ----------------------------------------------------------
step(4, "Handshake rechazado (lo que muestra el banner de sesión inválida)");
const noToken = await connect({});
check(!noToken.socket.connected && !!noToken.error, `sin token -> connect_error: "${noToken.error}"`);
const bad = await connect({ token: "token.falso.xyz" });
check(!bad.socket.connected && !!bad.error, `token falso -> connect_error: "${bad.error}"`);
noToken.socket.close();
bad.socket.close();

console.log(failures ? `\nRESULTADO: ${failures} verificación(es) fallaron` : "\nRESULTADO: todas las verificaciones pasaron");
process.exit(failures ? 1 : 0);
