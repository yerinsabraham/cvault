import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';
import '../models/models.dart';

/// API Client for CVault Backend
class ApiClient {
  final String baseUrl;
  String? apiKey;
  String? accessToken;

  ApiClient({
    String? baseUrl,
    this.apiKey,
    this.accessToken,
  }) : baseUrl = baseUrl ?? AppConstants.apiBaseUrl;

  /// Set API Key
  void setApiKey(String key) {
    apiKey = key;
  }

  /// Set Access Token
  void setAccessToken(String token) {
    accessToken = token;
  }

  /// Get common headers
  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey != null) {
      headers['X-API-Key'] = apiKey!;
    }
    if (accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    }
    return headers;
  }

  /// Register new user
  Future<Map<String, dynamic>> register(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Registration failed: ${response.body}');
    }
  }

  /// Login user
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Login failed: ${response.body}');
    }
  }

  /// Get current user
  Future<User> getCurrentUser() async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get user: ${response.body}');
    }
  }

  /// Register device
  Future<Device> registerDevice(String deviceName, {String? deviceType}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/devices'),
      headers: _headers,
      body: jsonEncode({
        'deviceName': deviceName,
        'deviceType': deviceType ?? 'macOS',
      }),
    );

    if (response.statusCode == 201) {
      return Device.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Device registration failed: ${response.body}');
    }
  }

  /// List user devices
  Future<List<Device>> listDevices() async {
    final response = await http.get(
      Uri.parse('$baseUrl/devices'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final devices = (data['devices'] as List)
          .map((json) => Device.fromJson(json))
          .toList();
      return devices;
    } else {
      throw Exception('Failed to list devices: ${response.body}');
    }
  }

  /// Get device config
  Future<String> getDeviceConfig(String deviceId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/devices/$deviceId/config'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['config'];
    } else {
      throw Exception('Failed to get config: ${response.body}');
    }
  }

  /// Delete device
  Future<void> deleteDevice(String deviceId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/devices/$deviceId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete device: ${response.body}');
    }
  }

  /// Connect to VPN
  Future<Map<String, dynamic>> connectVPN(String deviceId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/vpn/connect'),
      headers: _headers,
      body: jsonEncode({'deviceId': deviceId}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Connect failed: ${response.body}');
    }
  }

  /// Disconnect from VPN
  Future<void> disconnectVPN(String deviceId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/vpn/disconnect'),
      headers: _headers,
      body: jsonEncode({'deviceId': deviceId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Disconnect failed: ${response.body}');
    }
  }

  /// Get VPN status
  Future<List<VPNSession>> getVPNStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/vpn/status'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final sessions = (data['sessions'] as List)
          .map((json) => VPNSession.fromJson(json))
          .toList();
      return sessions;
    } else {
      throw Exception('Failed to get status: ${response.body}');
    }
  }

  /// Get server status
  Future<ServerStatus> getServerStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/vpn/server/status'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return ServerStatus.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get server status: ${response.body}');
    }
  }

  /// Health check
  Future<bool> healthCheck() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/health'));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
