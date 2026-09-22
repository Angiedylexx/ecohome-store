import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'session.dart';

/// Cierra la sesión (borra el JWT guardado) y vuelve al login limpiando la
/// pila de navegación. Lo usan el catálogo y el chat.
Future<void> signOut(BuildContext context) async {
  await Session.clear();
  if (!context.mounted) return;
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
    (_) => false,
  );
}
