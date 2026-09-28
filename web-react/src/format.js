const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// `price` llega como string ("80000.00") porque NUMERIC viaja así desde pg.
export const formatPrice = (value) => money.format(Number(value));

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

export const initial = (name = "?") => name.charAt(0).toUpperCase();

// Color estable por usuario (mismo nombre -> mismo tono en tabla y chat).
const HUES = [142, 168, 190, 34, 12, 262, 320, 84];
export function hueFor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}
