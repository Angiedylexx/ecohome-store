import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';
import 'session.dart';

/// Error de la API con un mensaje listo para mostrar al usuario.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  /// 401/403: el token falta, es inválido o expiró -> hay que volver a loguearse.
  bool get isAuthError => statusCode == 401 || statusCode == 403;

  @override
  String toString() => message;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
    this.creatorUsername,
  });

  final int id;
  final String name;
  final double price;

  /// `creator.username` de la API (trazabilidad); `null` en productos
  /// registrados antes de la migración `created_by`.
  final String? creatorUsername;

  /// `price` es NUMERIC en PostgreSQL, así que el driver `pg` lo entrega como
  /// String ("80000.00"). Se acepta String o número para no depender de eso.
  factory Product.fromJson(Map<String, dynamic> json) {
    final creator = json['creator'];
    return Product(
      id: (json['id'] as num).toInt(),
      name: json['name'].toString(),
      price: double.tryParse(json['price'].toString()) ?? 0,
      creatorUsername: creator is Map ? creator['username']?.toString() : null,
    );
  }
}

/// Cliente HTTP contra los MISMOS endpoints que usa React.
class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Map<String, String> _headers(String? token, {bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  /// `POST /auth/login` -> `{ token }`. El usuario/rol salen del JWT.
  /// [identifier] es el correo o el nombre de usuario (el backend acepta ambos).
  Future<Session> login(String identifier, String password) async {
    final idField = identifier.contains('@') ? 'email' : 'username';
    final body = await _send(
      () => _client.post(
        Uri.parse('${AppConfig.apiUrl}/auth/login'),
        headers: _headers(null, json: true),
        body: jsonEncode({idField: identifier, 'password': password}),
      ),
    );
    final token = body is Map ? body['token'] : null;
    final session = token is String ? Session.fromToken(token) : null;
    if (session == null) {
      throw const ApiException('Respuesta inesperada del servidor');
    }
    return session;
  }

  /// `POST /auth/signup` (201). Crea un usuario con rol `cliente` por defecto.
  Future<void> register(String username, String email, String password) async {
    await _send(
      () => _client.post(
        Uri.parse('${AppConfig.apiUrl}/auth/signup'),
        headers: _headers(null, json: true),
        body: jsonEncode(
            {'username': username, 'email': email, 'password': password}),
      ),
    );
  }

  /// `GET /products` (público) -> productos con `creator: {id, username}`.
  Future<List<Product>> fetchProducts(String token) async {
    final body = await _send(
      () => _client.get(
        Uri.parse('${AppConfig.apiUrl}/products'),
        headers: _headers(token),
      ),
    );
    if (body is! List) {
      throw const ApiException('Respuesta inesperada del catálogo');
    }
    return body
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  /// `GET /users/me/stats` (JWT) -> `{ username, count }`: cuántos productos
  /// ha creado el usuario autenticado (métrica "Nombre (N)").
  Future<int> fetchMyProductCount(String token) async {
    final body = await _send(
      () => _client.get(
        Uri.parse('${AppConfig.apiUrl}/users/me/stats'),
        headers: _headers(token),
      ),
    );
    final count = body is Map ? body['count'] : null;
    if (count is! num) {
      throw const ApiException('Respuesta inesperada de las estadísticas');
    }
    return count.toInt();
  }

  /// `POST /products` (JWT + rol admin) -> 201. Solo se envían name y price:
  /// el creador lo toma el servidor del token.
  Future<Product> createProduct(
      String token, String name, double price) async {
    final body = await _send(
      () => _client.post(
        Uri.parse('${AppConfig.apiUrl}/products'),
        headers: _headers(token, json: true),
        body: jsonEncode({'name': name, 'price': price}),
      ),
    );
    if (body is! Map<String, dynamic>) {
      throw const ApiException('Respuesta inesperada al crear el producto');
    }
    return Product.fromJson(body);
  }

  /// Ejecuta la petición, traduce errores de red/HTTP a [ApiException] y
  /// devuelve el JSON decodificado.
  Future<dynamic> _send(Future<http.Response> Function() request) async {
    final http.Response res;
    try {
      res = await request().timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      throw const ApiException(
          'El servidor no respondió. Verifica la IP/puerto y que el backend esté encendido.');
    } on http.ClientException {
      // http >= 1.0 envuelve aquí los fallos de socket (host inalcanzable,
      // conexión rechazada, HTTP en claro bloqueado por el SO, etc.).
      throw const ApiException(
          'No se pudo conectar con el servidor. ¿Misma red Wi-Fi y IP correcta (no localhost)?');
    }

    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        data = null;
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Errores de negocio: {"error": "..."} o, en validaciones, {"errors": [...]}.
      String? message;
      if (data is Map) {
        message = data['error']?.toString();
        if (message == null && data['errors'] is List) {
          message = (data['errors'] as List).join('. ');
        }
      }
      throw ApiException(
        message ?? 'Error ${res.statusCode} en la petición',
        statusCode: res.statusCode,
      );
    }
    return data;
  }

  void close() => _client.close();
}
