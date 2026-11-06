import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiService {
  Future<bool> health() async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/health');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) return false;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['status'] == 'ok';
  }
}
