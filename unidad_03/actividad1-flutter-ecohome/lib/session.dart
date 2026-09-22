import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Sesión autenticada: el JWT emitido por `POST /api/login` + la identidad.
///
/// Se guarda en el dispositivo (equivalente al `localStorage` de React) para
/// que el usuario no tenga que volver a iniciar sesión al reabrir la app, y
/// se reutiliza tal cual en el catálogo (header Authorization) y en el chat
/// (handshake de Socket.IO).
class Session {
  const Session({
    required this.token,
    required this.username,
    this.userId,
    this.expiresAt,
  });

  final String token;
  final String username;
  final int? userId;
  final DateTime? expiresAt;

  static const _kToken = 'ecohome_token';
  static const _kUsername = 'ecohome_user';

  /// Construye la sesión desde la respuesta de `/api/login`:
  /// `{ message, token, user: { id, username } }`.
  factory Session.fromLoginResponse(Map<String, dynamic> json) {
    final token = json['token'] as String;
    final claims = decodeJwtPayload(token);
    final user = json['user'];

    final username = (user is Map ? user['username'] : null) ??
        claims?['username'] ??
        'usuario';
    final exp = claims?['exp'];

    return Session(
      token: token,
      username: username.toString(),
      userId: (claims?['user_id'] as num?)?.toInt(),
      expiresAt: exp is num
          ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000)
          : null,
    );
  }

  /// El backend firma el JWT con `expiresIn` (2h por defecto). Se valida la
  /// fecha `exp` localmente para no abrir pantallas que el servidor rechazaría.
  bool get isExpired =>
      expiresAt != null && DateTime.now().isAfter(expiresAt!);

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
    await prefs.setString(_kUsername, username);
  }

  /// Devuelve la sesión guardada, o `null` si no hay o ya expiró.
  static Future<Session?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kToken);
    if (token == null) return null;

    final claims = decodeJwtPayload(token);
    if (claims == null) return null;

    final exp = claims['exp'];
    final session = Session(
      token: token,
      username: prefs.getString(_kUsername) ??
          (claims['username'] ?? 'usuario').toString(),
      userId: (claims['user_id'] as num?)?.toInt(),
      expiresAt: exp is num
          ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000)
          : null,
    );
    return session.isExpired ? null : session;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    await prefs.remove(_kUsername);
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
