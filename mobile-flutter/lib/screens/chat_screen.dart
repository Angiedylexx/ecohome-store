// ignore_for_file: library_prefixes
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config.dart';
import '../navigation.dart';
import '../session.dart';

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.username,
    required this.content,
    this.createdAt,
  });

  final int? id;
  final String username;
  final String content;
  final DateTime? createdAt;

  /// Mensaje persistido por el backend: `{ id, user_id, username, content, created_at }`.
  factory ChatMessage.fromJson(Map<dynamic, dynamic> json) => ChatMessage(
        id: (json['id'] as num?)?.toInt(),
        username: '${json['username'] ?? '?'}',
        content: '${json['content'] ?? ''}',
        createdAt: DateTime.tryParse('${json['created_at']}')?.toLocal(),
      );
}

/// Chat en tiempo real (Socket.IO) autenticado con el MISMO JWT del login.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.session});

  final Session session;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<ChatMessage> _messages = [];

  late final IO.Socket _socket;
  bool _online = false;
  String _status = 'Conectando...';
  bool _authFailed = false;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  void _connect() {
    _socket = IO.io(
      AppConfig.apiUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          // El JWT va en el handshake (socket.handshake.auth.token), que es lo
          // que valida `io.use(...)` en el backend. No se manda por query.
          .setAuth({'token': widget.session.token})
          .disableAutoConnect()
          .build(),
    );

    _socket.onConnect((_) {
      if (!mounted) return;
      setState(() {
        _online = true;
        _authFailed = false;
        _status = 'En línea';
      });
    });

    // Historial: el backend emite "messages" solo a este socket al conectar
    // (últimos 10, del más antiguo al más reciente). Reemplaza la lista.
    _socket.on('messages', (data) {
      if (!mounted || data is! List) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(data.whereType<Map>().map(ChatMessage.fromJson));
      });
      _scrollToBottom();
    });

    // Tiempo real: mensajes propios y ajenos llegan por "new-message"
    // (el servidor hace io.emit tras guardarlos en PostgreSQL).
    _socket.on('new-message', (data) {
      if (!mounted || data is! Map) return;
      setState(() => _messages.add(ChatMessage.fromJson(data)));
      _scrollToBottom();
    });

    _socket.on('message-error', (data) {
      if (!mounted) return;
      final detail = data is Map ? data['error'] : null;
      _snack('${detail ?? 'No se pudo enviar el mensaje'}');
    });

    // Handshake rechazado (token ausente/expirado) o servidor inalcanzable.
    _socket.onConnectError((err) {
      if (!mounted) return;
      final text = '$err';
      final isAuth = text.contains('Token') || text.contains('Autenticación');
      setState(() {
        _online = false;
        _authFailed = isAuth;
        _status = isAuth
            ? 'Sesión inválida o expirada'
            : 'Sin conexión con el chat';
      });
    });

    _socket.onDisconnect((_) {
      if (!mounted) return;
      setState(() {
        _online = false;
        _status = 'Desconectado';
      });
    });

    _socket.connect();
  }

  @override
  void dispose() {
    // dispose() desconecta y elimina todos los listeners (evita fugas).
    _socket.dispose();
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _send() {
    final text = _textCtrl.text.trim();
    if (text.isEmpty || !_online) return;

    // Solo se envía el contenido: el servidor toma user_id/username del JWT
    // verificado en el socket (así nadie puede suplantar a otro usuario).
    _socket.emit('new-message', {'content': text});
    _textCtrl.clear();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              child: Text(widget.session.username.isEmpty
                  ? '?'
                  : widget.session.username[0].toUpperCase()),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.session.username,
                      style: Theme.of(context).textTheme.titleMedium),
                  Row(
                    children: [
                      Icon(Icons.circle,
                          size: 10,
                          color: _online ? Colors.green : scheme.outline),
                      const SizedBox(width: 6),
                      Text(_status,
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_authFailed)
            MaterialBanner(
              content: const Text(
                  'Tu sesión expiró o el token no es válido. Inicia sesión de nuevo.'),
              actions: [
                TextButton(
                  onPressed: () => signOut(context),
                  child: const Text('Ir al login'),
                ),
              ],
            ),
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Text('Sin mensajes todavía. ¡Escribe el primero!'))
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (context, i) => _Bubble(
                      message: _messages[i],
                      isOwn: _messages[i].username == widget.session.username,
                    ),
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textCtrl,
                      enabled: _online,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Escribe un mensaje...',
                        border: const OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(24)),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: 'Enviar',
                    onPressed: _online ? _send : null,
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.isOwn});

  final ChatMessage message;
  final bool isOwn;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final time = message.createdAt == null
        ? ''
        : '${message.createdAt!.hour.toString().padLeft(2, '0')}:'
            '${message.createdAt!.minute.toString().padLeft(2, '0')}';

    return Align(
      alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isOwn ? scheme.primaryContainer : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isOwn)
              Text(
                message.username,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            Text(message.content),
            Align(
              alignment: Alignment.centerRight,
              child: Text(time, style: Theme.of(context).textTheme.labelSmall),
            ),
          ],
        ),
      ),
    );
  }
}
