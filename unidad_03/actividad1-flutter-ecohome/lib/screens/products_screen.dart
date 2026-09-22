import 'package:flutter/material.dart';

import '../api_client.dart';
import '../navigation.dart';
import '../session.dart';
import 'chat_screen.dart';

/// Catálogo: `GET /products` con `Authorization: Bearer <jwt>` (DataTable).
class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, required this.session});

  final Session session;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _api = ApiClient();
  late Future<List<Product>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  Future<List<Product>> _load() async {
    try {
      return await _api.fetchProducts(widget.session.token);
    } on ApiException catch (e) {
      // Token inválido/expirado: se descarta la sesión y se vuelve al login.
      if (e.isAuthError && mounted) {
        await signOut(context);
      }
      rethrow;
    }
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    try {
      await next;
    } catch (_) {
      // El error ya se pinta en el FutureBuilder.
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Catálogo'),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: () => signOut(context),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(28),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Sesión: ${session.username}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ),
      ),
      body: FutureBuilder<List<Product>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorView(
              message: snapshot.error.toString(),
              onRetry: _refresh,
            );
          }
          final products = snapshot.data!;
          if (products.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('El catálogo está vacío.')),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: _ProductsTable(products: products),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        // Se reutiliza la misma sesión (token + username): sin nuevo login.
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ChatScreen(session: session)),
        ),
        icon: const Icon(Icons.chat_bubble_outline),
        label: const Text('Chat'),
      ),
    );
  }
}

class _ProductsTable extends StatelessWidget {
  const _ProductsTable({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        // Espacio inferior para que el botón flotante no tape la última fila.
        padding: const EdgeInsets.only(bottom: 88),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: constraints.maxWidth),
            child: DataTable(
              columns: const [
                DataColumn(label: Text('ID'), numeric: true),
                DataColumn(label: Text('Producto')),
                DataColumn(label: Text('Precio'), numeric: true),
              ],
              rows: [
                for (final p in products)
                  DataRow(cells: [
                    DataCell(Text('${p.id}')),
                    DataCell(Text(p.name)),
                    DataCell(Text(_formatPrice(p.price))),
                  ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 80000.0 -> "$80.000" (miles con punto; decimales solo si existen).
String _formatPrice(double value) {
  final hasDecimals = value != value.roundToDouble();
  final fixed = value.toStringAsFixed(hasDecimals ? 2 : 0);
  final parts = fixed.split('.');
  final grouped = parts[0].replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => '.',
  );
  return '\$$grouped${parts.length > 1 ? ',${parts[1]}' : ''}';
}
