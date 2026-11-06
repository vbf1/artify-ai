import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:gal/gal.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'config.dart';
import 'services/api_service.dart';

void main() => runApp(const ArtifyApp());

class ArtifyApp extends StatelessWidget {
  const ArtifyApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Artify AI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7845C5)),
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF8F6FC),
        ),
        home: const HomePage(),
      );
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ImagePicker _picker = ImagePicker();
  XFile? _image;
  int _count = 6;
  String _format = '4:5';
  final Set<String> _scenes = {'Festa infantil', 'Parque', 'Cenário clean'};
  String _status =
      'Verifique a conexão com a API para confirmar que a geração está disponível.';
  bool _checkingApi = false;
  bool _generating = false;
  final Set<int> _savingImages = {};
  List<Map<String, dynamic>> _results = [];

  static const _sceneOptions = [
    'Festa infantil',
    'Escola',
    'Parque',
    'Espaço de eventos',
    'Quintal',
    'Evento comunitário',
    'Área de lazer',
    'Cenário clean',
  ];

  Future<void> _pickImage() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 92,
      );
      if (picked == null || !mounted) return;
      final size = await picked.length();
      if (size > 10 * 1024 * 1024) {
        setState(() => _status =
            'A imagem ultrapassa 10 MB. Escolha um arquivo menor.');
        return;
      }
      final extension = picked.name.toLowerCase();
      if (!(extension.endsWith('.jpg') ||
          extension.endsWith('.jpeg') ||
          extension.endsWith('.png') ||
          extension.endsWith('.webp'))) {
        setState(() =>
            _status = 'Formato inválido. Use JPG, PNG ou WEBP.');
        return;
      }
      setState(() {
        _image = picked;
        _results = [];
        _status =
            'Foto selecionada. Escolha as opções e gere suas imagens.';
      });
    } catch (_) {
      if (mounted) {
        setState(() => _status = 'Não foi possível abrir a galeria.');
      }
    }
  }

  Future<void> _generateImages() async {
    if (_image == null || _scenes.isEmpty || _generating) return;
    setState(() { _generating = true; _results = []; _status = 'Enviando foto para a IA...'; });
    try {
      final bytes = await _image!.readAsBytes();
      final name = _image!.name.toLowerCase();
      final mime = name.endsWith('.png') ? 'image/png' : (name.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      final results = await ApiService().generate(
        imageBytes: bytes,
        mimeType: mime,
        count: _count,
        format: _format,
        scenes: _scenes.toList(),
      );
      if (!mounted) return;
      setState(() {
        _results = results;
        _status = '${results.length} imagens geradas. Confira os resultados antes de publicar.';
      });
    } catch (error) {
      if (mounted) setState(() => _status = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _shareImage(Map<String, dynamic> item, int index) async {
    try {
      final dataUrl = item['dataUrl'] as String;
      final parts = dataUrl.split(',');
      if (parts.length != 2) throw Exception('Imagem inválida.');
      final bytes = base64Decode(parts.last);
      final scene = (item['scene'] as String).toLowerCase().replaceAll(' ', '-');
      await Share.shareXFiles(
        [XFile.fromData(bytes, mimeType: 'image/png', name: 'artify-ai-$scene-${index + 1}.png')],
        text: 'Imagem criada com Artify AI — cenário: ${item['scene']}',
        subject: 'Imagem publicitária Artify AI',
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Não foi possível compartilhar: $error')),
        );
      }
    }
  }

  Future<void> _saveImageToGallery(Map<String, dynamic> item, int index) async {
    if (_savingImages.contains(index)) return;
    setState(() => _savingImages.add(index));
    try {
      final dataUrl = item['dataUrl'] as String;
      final parts = dataUrl.split(',');
      if (parts.length != 2) throw Exception('Imagem inválida.');
      final bytes = base64Decode(parts.last);
      final scene = (item['scene'] as String)
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
          .replaceAll(RegExp(r'^-+|-+
    setState(() => _checkingApi = true);
    try {
      final result = await ApiService().health();
      if (!mounted) return;
      setState(() => _status =
          result ? 'API conectada.' : 'API respondeu com estado inesperado.');
    } catch (_) {
      if (mounted) {
        setState(() => _status = 'Não foi possível conectar à API.');
      }
    } finally {
      if (mounted) setState(() => _checkingApi = false);
    }
  }

  Widget _sectionTitle(String number, String title, String subtitle) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: const Color(0xFFECE3FA),
          child: Text(number,
              style: const TextStyle(
                  color: Color(0xFF6536A8), fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 3),
            Text(subtitle, style: const TextStyle(color: Colors.black54)),
          ]),
        ),
      ]);

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('✦ Artify AI',
              style: TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: const Color(0xFFF8F6FC),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
          children: [
            Text('Uma foto. Novas possibilidades.',
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
                'Prepare imagens publicitárias a partir da foto original do seu produto.'),
            const SizedBox(height: 22),
            Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _sectionTitle('01', 'Envie sua foto',
                          'Escolha uma imagem nítida do produto.'),
                      const SizedBox(height: 16),
                      if (_image == null)
                        InkWell(
                          onTap: _pickImage,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 30),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F0FC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: const Color(0xFFD8C8F0)),
                            ),
                            child: const Column(children: [
                              Icon(Icons.add_photo_alternate_outlined,
                                  size: 38, color: Color(0xFF7845C5)),
                              SizedBox(height: 8),
                              Text('Toque para escolher uma foto',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600)),
                              SizedBox(height: 4),
                              Text('JPG, PNG ou WEBP · até 10 MB',
                                  style: TextStyle(
                                      color: Colors.black54, fontSize: 12)),
                            ]),
                          ),
                        )
                      else
                        Column(children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              File(_image!.path),
                              height: 220,
                              width: double.infinity,
                              cacheWidth: 900,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => Container(
                                height: 140,
                                alignment: Alignment.center,
                                child: const Text('Prévia indisponível'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(children: [
                            Expanded(
                                child: Text(_image!.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis)),
                            TextButton(
                                onPressed: () =>
                                    setState(() => _image = null),
                                child: const Text('Remover')),
                            TextButton(
                                onPressed: _pickImage,
                                child: const Text('Trocar')),
                          ]),
                        ]),
                    ]),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _sectionTitle('02', 'Personalize',
                          'Defina as variações que deseja criar.'),
                      const SizedBox(height: 18),
                      const Text('Quantidade de imagens',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                          spacing: 8,
                          children: [3, 6, 9]
                              .map((n) => ChoiceChip(
                                    label: Text('$n imagens'),
                                    selected: _count == n,
                                    onSelected: (_) =>
                                        setState(() => _count = n),
                                  ))
                              .toList()),
                      const SizedBox(height: 16),
                      const Text('Formato',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: ['1:1', '4:5', '16:9']
                            .map((format) => ChoiceChip(
                                  label: Text(format),
                                  selected: _format == format,
                                  onSelected: (_) =>
                                      setState(() => _format = format),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 16),
                      const Text('Cenários',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      ..._sceneOptions.map((scene) => CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                            controlAffinity: ListTileControlAffinity.leading,
                            title: Text(scene),
                            value: _scenes.contains(scene),
                            onChanged: (selected) => setState(() {
                              if (selected == true) {
                                _scenes.add(scene);
                              } else {
                                _scenes.remove(scene);
                              }
                            }),
                          )),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: (_image == null || _scenes.isEmpty || _generating) ? null : _generateImages,
                          icon: _generating ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                          label: Text(_generating ? 'Gerando imagens...' : 'Gerar $_count imagens'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'A geração usa a IA na nuvem. Confira os resultados: a IA pode alterar detalhes do produto.',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                    ]),
              ),
            ),
            if (_results.isNotEmpty) ...[
              const SizedBox(height: 18),
              Text('Suas imagens', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              ..._results.asMap().entries.map((entry) {
                final item = entry.value;
                final encoded = (item['dataUrl'] as String).split(',').last;
                return Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Image.memory(base64Decode(encoded), width: double.infinity, fit: BoxFit.contain),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              item['scene'] as String,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Compartilhar imagem',
                            onPressed: () => _shareImage(item, entry.key),
                            icon: const Icon(Icons.share_outlined),
                          ),
                          TextButton.icon(
                            onPressed: _savingImages.contains(entry.key)
                                ? null
                                : () => _saveImageToGallery(item, entry.key),
                            icon: _savingImages.contains(entry.key)
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.download_outlined),
                            label: Text(_savingImages.contains(entry.key)
                                ? 'Salvando...'
                                : 'Salvar na galeria'),
                          ),
                        ],
                      ),
                    ),
                  ]),
                );
              }),
            ],
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _checkingApi ? null : _checkApi,
              child: Text(_checkingApi
                  ? 'Verificando API...'
                  : 'Verificar conexão com a API'),
            ),
            const SizedBox(height: 8),
            Text(_status, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text('API: ${AppConfig.apiBaseUrl}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      );
}
), '');
      await Gal.putImageBytes(
        bytes,
        album: 'Artify AI',
        name: 'artify-ai-$scene-${index + 1}.png',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Imagem salva na galeria · álbum Artify AI.')),
        );
      }
    } on GalException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Não foi possível salvar: ${error.type.message}')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Falha ao salvar a imagem: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _savingImages.remove(index));
    }
  }

  Future<void> _checkApi() async {
    setState(() => _checkingApi = true);
    try {
      final result = await ApiService().health();
      if (!mounted) return;
      setState(() => _status =
          result ? 'API conectada.' : 'API respondeu com estado inesperado.');
    } catch (_) {
      if (mounted) {
        setState(() => _status = 'Não foi possível conectar à API.');
      }
    } finally {
      if (mounted) setState(() => _checkingApi = false);
    }
  }

  Widget _sectionTitle(String number, String title, String subtitle) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: const Color(0xFFECE3FA),
          child: Text(number,
              style: const TextStyle(
                  color: Color(0xFF6536A8), fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 3),
            Text(subtitle, style: const TextStyle(color: Colors.black54)),
          ]),
        ),
      ]);

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('✦ Artify AI',
              style: TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: const Color(0xFFF8F6FC),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
          children: [
            Text('Uma foto. Novas possibilidades.',
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
                'Prepare imagens publicitárias a partir da foto original do seu produto.'),
            const SizedBox(height: 22),
            Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _sectionTitle('01', 'Envie sua foto',
                          'Escolha uma imagem nítida do produto.'),
                      const SizedBox(height: 16),
                      if (_image == null)
                        InkWell(
                          onTap: _pickImage,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 30),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F0FC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: const Color(0xFFD8C8F0)),
                            ),
                            child: const Column(children: [
                              Icon(Icons.add_photo_alternate_outlined,
                                  size: 38, color: Color(0xFF7845C5)),
                              SizedBox(height: 8),
                              Text('Toque para escolher uma foto',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600)),
                              SizedBox(height: 4),
                              Text('JPG, PNG ou WEBP · até 10 MB',
                                  style: TextStyle(
                                      color: Colors.black54, fontSize: 12)),
                            ]),
                          ),
                        )
                      else
                        Column(children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              File(_image!.path),
                              height: 220,
                              width: double.infinity,
                              cacheWidth: 900,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => Container(
                                height: 140,
                                alignment: Alignment.center,
                                child: const Text('Prévia indisponível'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(children: [
                            Expanded(
                                child: Text(_image!.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis)),
                            TextButton(
                                onPressed: () =>
                                    setState(() => _image = null),
                                child: const Text('Remover')),
                            TextButton(
                                onPressed: _pickImage,
                                child: const Text('Trocar')),
                          ]),
                        ]),
                    ]),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              elevation: 0,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _sectionTitle('02', 'Personalize',
                          'Defina as variações que deseja criar.'),
                      const SizedBox(height: 18),
                      const Text('Quantidade de imagens',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                          spacing: 8,
                          children: [3, 6, 9]
                              .map((n) => ChoiceChip(
                                    label: Text('$n imagens'),
                                    selected: _count == n,
                                    onSelected: (_) =>
                                        setState(() => _count = n),
                                  ))
                              .toList()),
                      const SizedBox(height: 16),
                      const Text('Formato',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: ['1:1', '4:5', '16:9']
                            .map((format) => ChoiceChip(
                                  label: Text(format),
                                  selected: _format == format,
                                  onSelected: (_) =>
                                      setState(() => _format = format),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 16),
                      const Text('Cenários',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      ..._sceneOptions.map((scene) => CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                            controlAffinity: ListTileControlAffinity.leading,
                            title: Text(scene),
                            value: _scenes.contains(scene),
                            onChanged: (selected) => setState(() {
                              if (selected == true) {
                                _scenes.add(scene);
                              } else {
                                _scenes.remove(scene);
                              }
                            }),
                          )),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: (_image == null || _scenes.isEmpty || _generating) ? null : _generateImages,
                          icon: _generating ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                          label: Text(_generating ? 'Gerando imagens...' : 'Gerar $_count imagens'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'A geração usa a IA na nuvem. Confira os resultados: a IA pode alterar detalhes do produto.',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                    ]),
              ),
            ),
            if (_results.isNotEmpty) ...[
              const SizedBox(height: 18),
              Text('Suas imagens', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              ..._results.asMap().entries.map((entry) {
                final item = entry.value;
                final encoded = (item['dataUrl'] as String).split(',').last;
                return Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Image.memory(base64Decode(encoded), width: double.infinity, fit: BoxFit.contain),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              item['scene'] as String,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Compartilhar imagem',
                            onPressed: () => _shareImage(item, entry.key),
                            icon: const Icon(Icons.share_outlined),
                          ),
                          TextButton.icon(
                            onPressed: () => _shareImage(item, entry.key),
                            icon: const Icon(Icons.download_outlined),
                            label: const Text('Salvar / enviar'),
                          ),
                        ],
                      ),
                    ),
                  ]),
                );
              }),
            ],
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _checkingApi ? null : _checkApi,
              child: Text(_checkingApi
                  ? 'Verificando API...'
                  : 'Verificar conexão com a API'),
            ),
            const SizedBox(height: 8),
            Text(_status, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text('API: ${AppConfig.apiBaseUrl}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      );
}
