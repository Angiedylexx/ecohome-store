/// Configuración de red del cliente móvil.
///
/// `localhost` NO sirve en un emulador/teléfono (apunta al propio dispositivo),
/// por eso el host se inyecta al compilar con `--dart-define`:
///
///   Emulador Android (por defecto): 10.0.2.2 = el PC anfitrión
///   Teléfono físico (misma Wi-Fi):  flutter run --dart-define=API_HOST=192.168.1.34
///   Backend desplegado (Render):    flutter run --dart-define=API_URL=https://mi-api.onrender.com
class AppConfig {
  AppConfig._();

  static const String _host =
      String.fromEnvironment('API_HOST', defaultValue: '10.0.2.2');

  /// Backend unificado (Express + Socket.IO): /auth/login, /products,
  /// /users/me/stats y el chat en tiempo real, todo con el mismo JWT.
  static const String apiUrl =
      String.fromEnvironment('API_URL', defaultValue: 'http://$_host:4500');

  static const Duration requestTimeout = Duration(seconds: 10);
}
