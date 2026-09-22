/// Configuración de red del cliente móvil.
///
/// `localhost` NO sirve en un emulador/teléfono (apunta al propio dispositivo),
/// por eso el host se inyecta al compilar con `--dart-define`:
///
///   Emulador Android (por defecto): 10.0.2.2 = el PC anfitrión
///   Teléfono físico (misma Wi-Fi):  flutter run --dart-define=API_HOST=192.168.1.34
///   Backend desplegado (Render):    flutter run \
///       --dart-define=CHAT_URL=https://mi-chat.onrender.com \
///       --dart-define=PRODUCTS_URL=https://mi-catalogo.onrender.com
class AppConfig {
  AppConfig._();

  static const String _host =
      String.fromEnvironment('API_HOST', defaultValue: '10.0.2.2');

  /// Backend Unidad 2 (Express + Socket.IO + JWT + PostgreSQL):
  /// POST /api/login, POST /api/register y el chat en tiempo real.
  static const String chatUrl =
      String.fromEnvironment('CHAT_URL', defaultValue: 'http://$_host:4001');

  /// Backend Unidad 1 (Express + PostgreSQL): GET /products.
  static const String productsUrl = String.fromEnvironment('PRODUCTS_URL',
      defaultValue: 'http://$_host:4500');

  static const Duration requestTimeout = Duration(seconds: 10);
}
