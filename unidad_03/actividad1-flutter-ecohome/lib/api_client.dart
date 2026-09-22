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
    this.createdAt,
  });

  final int id;
  final String name;
  final double price;
  final DateTime? createdAt;

  /// `price` es NUMERIC en PostgreSQL, así que el driver `pg` lo entrega como
  /// String ("80000.00"). Se acepta String o número para no depender de eso.
  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: (json['id'] as num).toInt(),
        name: json['name'].toString(),
        price: double.tryParse(json['price'].toString()) ?? 0,
        createdAt: DateTime.tryParse('${json['created_at']}')?.toLocal(),
      );
}

/// Cliente HTTP contra los MISMOS endpoints que usa React (sin endpoints nuevos).
class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// `POST /api/login` -> `{ token, user }`.
  Future<Session> login(String username, String password) async {
    final body = await _send(
      () => _client.post(
        Uri.parse('${AppConfig.chatUrl}/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      ),
    );
    if (body is! Map<String, dynamic> || body['token'] is! String) {
      throw const ApiException('Respuesta inesperada del servidor');
    }
    return Session.fromLoginResponse(body);
  }

  /// `POST /api/register` (201). Igual que en el cliente web.
  Future<void> register(String username, String password) async {
    await _send(
      () => _client.post(
        Uri.parse('${AppConfig.chatUrl}/api/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      ),
    );
  }

  /// `GET /products` con `Authorization: Bearer <jwt>`.
  ///
  /// En el backend de la Unidad 1 la lectura del catálogo es pública (solo
  /// POST/PUT/DELETE exigen JWT + rol admin), por lo que el token se envía
  /// "cuando aplica": no estorba y queda listo si el catálogo se protege.
  Future<List<Product>> fetchProducts(String token) async {
    final body = await _send(
      () => _client.get(
        Uri.parse('${AppConfig.productsUrl}/products'),
        headers: {'Authorization': 'Bearer $token'},
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
      final serverMessage = data is Map ? data['error'] : null;
      throw ApiException(
        serverMessage?.toString() ?? 'Error ${res.statusCode} en la petición',
        statusCode: res.statusCode,
      );
    }
    return data;
  }

  void close() => _client.close();
}
