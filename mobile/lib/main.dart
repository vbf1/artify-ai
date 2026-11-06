import 'package:flutter/material.dart';
import 'config.dart';
import 'services/api_service.dart';

void main() => runApp(const ArtifyApp());

class ArtifyApp extends StatelessWidget {
  const ArtifyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Artify AI', debugShowCheckedModeBanner: false,
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7845C5)), useMaterial3: true),
    home: const HomePage(),
  );
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String status = 'A geração real será habilitada após configurar um provedor de imagens.';
  Future<void> checkApi() async {
    try { final result = await ApiService().health(); setState(() => status = result ? 'API conectada.' : 'API respondeu com estado inesperado.'); }
    catch (_) { setState(() => status = 'Não foi possível conectar à API.'); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('✦ Artify AI')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      const SizedBox(height: 20), Text('Uma foto. Novas possibilidades.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 10), const Text('Prepare imagens publicitárias a partir da foto original do seu produto.'),
      const SizedBox(height: 28), Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('01 · Envie sua foto', style: TextStyle(fontWeight: FontWeight.bold)), const SizedBox(height: 12), const Text('O seletor de imagem será conectado na próxima etapa.'),
      ]))),
      const SizedBox(height: 12), Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('02 · Personalize', style: TextStyle(fontWeight: FontWeight.bold)), const SizedBox(height: 12), const Text('Quantidade: 3, 6 ou 9 imagens'), const Text('Formatos: 1:1, 4:5 ou 16:9'), const Text('Cenários: festa, escola, parque e outros.'),
        const SizedBox(height: 16), const FilledButton(onPressed: null, child: Text('Gerar imagens')), const SizedBox(height: 8), const Text('Geração ainda não configurada; nenhum resultado será simulado.'),
      ]))),
      const SizedBox(height: 20), OutlinedButton(onPressed: checkApi, child: const Text('Verificar conexão com a API')), const SizedBox(height: 8), Text(status), const SizedBox(height: 8), Text('API: ${AppConfig.apiBaseUrl}', style: Theme.of(context).textTheme.bodySmall),
    ]),
  );
}
