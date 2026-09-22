import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Sesión autenticada: el JWT emitido por `POST /auth/login`.
///
/// La identidad (id, username, role) viaja DENTRO del token (`{id, username,
/// role, iat, exp}`), por eso `POST /auth/login` solo responde `{ token }`.
/// Se guarda en el dispositivo (equivalente al `localStorage` de React) y se
/// reutiliza en el catálogo, las estadísticas y el chat sin volver a pedir
/// credenciales.
class Session {
  const Session({
    required this.token,
    required this.username,
    required this.role,
    this.userId,
    this.expiresAt,
  });

  final String token;
  final String username;
  final String role;
  final int? userId;
  final DateTime? expiresAt;

  static const _kToken = 'ecohome_token';

  /// Solo el rol `admin` puede crear productos (`POST /products`).
  bool get isAdmin => role == 'admin';

  /// Construye la sesión a partir del JWT; `null` si el token no es legible.
  static Session? fromToken(String token) {
    final claims = decodeJwtPayload(token);
    if (claims == null || claims['username'] == null) return null;

    final exp = claims['exp'];
    return Session(
      token: token,
      username: claims['username'].toString(),
      role: (claims['role'] ?? 'cliente').toString(),
      userId: (claims['id'] as num?)?.toInt(),
      expiresAt: exp is num
          ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000)
          : null,
    );
  }

  /// El backend firma el JWT con `expiresIn: 1h`. Se valida `exp` localmente
  /// para no abrir pantallas que el servidor rechazaría.
  bool get isExpired =>
      expiresAt != null && DateTime.now().isAfter(expiresAt!);

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
  }

  /// Devuelve la sesión guardada, o `null` si no hay o ya expiró.
  static Future<Session?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kToken);
    if (token == null) return null;

    final session = fromToken(token);
    return (session == null || session.isExpired) ? null : session;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
  }
}

/// Lee el payload (sin verificar la firma: eso solo lo puede hacer el
/// servidor, que posee el secreto) de un JWT `header.payload.signature`.
Map<String, dynamic>? decodeJwtPayload(String token) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    final decoded = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
    final map = jsonDecode(decoded);
    return map is Map<String, dynamic> ? map : null;
  } catch (_) {
    return null;
  }
}
