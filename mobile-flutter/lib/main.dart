import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'screens/products_screen.dart';
import 'session.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Si quedó un JWT vigente en el dispositivo se entra directo al catálogo
  // (misma lógica que App.jsx con localStorage); si no, al login.
  final session = await Session.load();
  runApp(EcoHomeApp(initialSession: session));
}

class EcoHomeApp extends StatelessWidget {
  const EcoHomeApp({super.key, this.initialSession});

  final Session? initialSession;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EcoHome Store',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D32)),
      ),
      home: initialSession == null
          ? const LoginScreen()
          : ProductsScreen(session: initialSession!),
    );
  }
}
