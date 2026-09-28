import 'package:flutter/material.dart';

import '../api_client.dart';
import '../navigation.dart';
import '../session.dart';
import 'chat_screen.dart';

/// Catálogo: `GET /products` (tarjetas con nombre, precio y "Creado por"), contador
/// "Nombre (N)" desde `GET /users/me/stats` y alta de productos (`POST /products`,
/// cualquier usuario autenticado) tras la cual tabla y contador se actualizan al instante.
class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, required this.session});

  final Session session;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _api = ApiClient();
  late Future<List<Product>> _future;

  /// Productos creados por el usuario autenticado; `null` mientras carga.
  int? _productCount;

  @override
  void initState() {
    super.initState();
    _future = _loadProducts();
    _loadStats();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  /// Token inválido/expirado (401/403): se descarta la sesión y se vuelve al login.
  Future<void> _handleAuthError(ApiException e) async {
    if (e.isAuthError && mounted) await signOut(context);
  }

  Future<List<Product>> _loadProducts() async {
    try {
      return await _api.fetchProducts(widget.session.token);
    } on ApiException catch (e) {
      await _handleAuthError(e);
      rethrow;
    }
  }

  /// Consulta el contador y lo pinta con setState: "Arturo (14)" -> "Arturo (15)".
  Future<void> _loadStats() async {
    try {
      final count = await _api.fetchMyProductCount(widget.session.token);
      if (mounted) setState(() => _productCount = count);
    } on ApiException catch (e) {
      await _handleAuthError(e);
      // Otros errores: el título conserva el último valor conocido.
    }
  }

  Future<void> _refreshAll() async {
    final next = _loadProducts();
    setState(() => _future = next);
    await Future.wait([
      next.then<void>((_) {}, onError: (_) {}),
      _loadStats(),
    ]);
  }

  Future<void> _addProduct() async {
    final input = await showDialog<({String name, double price})>(
      context: context,
      builder: (_) => const _AddProductDialog(),
    );
    if (input == null) return;

    try {
      final created = await _api.createProduct(
          widget.session.token, input.name, input.price);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'Producto "${created.name}" creado por ${created.creatorUsername ?? widget.session.username}'),
      ));
      // 201: se recargan la tabla y el contador -> el título cambia solo.
      await _refreshAll();
    } on ApiException catch (e) {
      await _handleAuthError(e);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    return Scaffold(
      appBar: AppBar(
        // Formato exacto pedido: Nombre (N)
        title: Text('${session.username} (${_productCount ?? '…'})'),
        actions: [
          IconButton(
            tooltip: 'Chat',
            icon: const Icon(Icons.chat_bubble_outline),
            // Se reutiliza la misma sesión (JWT): sin nuevo login.
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ChatScreen(session: session)),
            ),
          ),
          IconButton(
            tooltip: 'Actualizar',
            icon: const Icon(Icons.refresh),
            onPressed: _refreshAll,
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
              'Catálogo · rol ${session.role}',
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
              onRetry: _refreshAll,
            );
          }
          final products = snapshot.data!;
          if (products.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refreshAll,
              child: ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('El catálogo está vacío.')),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refreshAll,
            child: _ProductsList(
              products: products,
              currentUser: session.username,
            ),
          );
        },
      ),
      // Cualquier usuario autenticado puede crear productos: el creador queda
      // registrado con su id y el contador "Nombre (N)" sube.
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addProduct,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo producto'),
      ),
    );
  }
}

/// Lista de tarjetas (cabe en cualquier ancho de teléfono): nombre, precio y
/// creador de cada producto. El creador propio se resalta.
class _ProductsList extends StatelessWidget {
  const _ProductsList({required this.products, required this.currentUser});

  final List<Product> products;
  final String currentUser;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      // Espacio inferior para que el botón flotante no tape la última tarjeta.
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final p = products[i];
        final creator = p.creatorUsername;
        final isOwn = creator != null && creator == currentUser;

        return Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.person_outline,
                              size: 16,
                              color: isOwn ? scheme.primary : scheme.outline),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              creator == null
                                  ? 'Creado por: —'
                                  : 'Creado por: $creator${isOwn ? ' (tú)' : ''}',
                              overflow: TextOverflow.ellipsis,
                              style: textTheme.bodySmall?.copyWith(
                                color: isOwn ? scheme.primary : null,
                                fontWeight:
                                    isOwn ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  _formatPrice(p.price),
                  style: textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _AddProductDialog extends StatefulWidget {
  const _AddProductDialog();

  @override
  State<_AddProductDialog> createState() => _AddProductDialogState();
}

class _AddProductDialogState extends State<_AddProductDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  double? _parsePrice(String? raw) =>
      double.tryParse((raw ?? '').trim().replaceAll(',', '.'));

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      (name: _nameCtrl.text.trim(), price: _parsePrice(_priceCtrl.text)!),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nuevo producto'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nameCtrl,
              autofocus: true,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Nombre'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Ingresa el nombre' : null,
            ),
            TextFormField(
              controller: _priceCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: const InputDecoration(labelText: 'Precio'),
              validator: (v) {
                final price = _parsePrice(v);
                return (price == null || price <= 0)
                    ? 'Ingresa un precio mayor a 0'
                    : null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Guardar')),
      ],
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
