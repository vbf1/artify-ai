import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiService {
  Future<bool> health() async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/health');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) return false;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['status'] == 'ok' && data['generationEnabled'] == true;
  }

  Future<List<Map<String, dynamic>>> generate({
    required Uint8List imageBytes,
    required String mimeType,
    required int count,
    required String format,
    required List<String> scenes,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/generate');
    final dataUrl = 'data:$mimeType;base64,${base64Encode(imageBytes)}';
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'image': dataUrl,
        'count': count,
        'format': format,
        'scenes': scenes,
      }),
    ).timeout(const Duration(minutes: 8));
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      final error = data['error']?.toString();
      final detail = data['detail']?.toString();
      final message = [
        if (error != null && error.isNotEmpty) error,
        if (detail != null && detail.isNotEmpty) 'Detalhe técnico: $detail',
      ].join(' — ');
      throw Exception(message.isEmpty ? 'Falha ao gerar imagens.' : message);
    }
    final images = data['images'];
    if (images is! List || images.length != count) {
      throw Exception('A IA não retornou todas as imagens esperadas.');
    }
    return images.cast<Map<String, dynamic>>();
  }
}
