import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import '../models/models.dart';
import '../services/api_client.dart';

/// Handles authentication state.
///
/// The tenant API key is embedded in the app ([AppConstants.apiKey]),
/// so users only see email + password.
class AuthProvider with ChangeNotifier {
  ApiClient? _apiClient;
  User? _user;
  String? _accessToken;
  bool _isLoading = false;
  String? _error;

  // ── Public getters ──────────────────────────────────────────
  User? get user => _user;
  String? get accessToken => _accessToken;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _accessToken != null;

  ApiClient get apiClient {
    _apiClient ??=
        ApiClient(apiKey: AppConstants.apiKey, accessToken: _accessToken);
    return _apiClient!;
  }

  void _updateApiClient() {
    _apiClient =
        ApiClient(apiKey: AppConstants.apiKey, accessToken: _accessToken);
  }

  // ── Initialisation (restore saved session) ──────────────────
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      _accessToken = prefs.getString(AppConstants.keyAccessToken);
      if (_accessToken != null) {
        _updateApiClient();
        try {
          _user = await apiClient.getCurrentUser();
        } catch (_) {
          // Token expired or invalid – clear session
          await logout();
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Register ────────────────────────────────────────────────
  Future<void> register(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _updateApiClient();
      final res = await apiClient.register(email, password);
      _user = User.fromJson(res['user']);
      _accessToken = res['accessToken'];
      _updateApiClient();
      await _persistSession();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Login ───────────────────────────────────────────────────
  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _updateApiClient();
      final res = await apiClient.login(email, password);
      _user = User.fromJson(res['user']);
      _accessToken = res['accessToken'];
      _updateApiClient();
      await _persistSession();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Logout ──────────────────────────────────────────────────
  Future<void> logout() async {
    _user = null;
    _accessToken = null;
    _apiClient = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyAccessToken);
    await prefs.remove(AppConstants.keyUserId);
    await prefs.remove(AppConstants.keyUserEmail);
    notifyListeners();
  }

  // ── Helpers ─────────────────────────────────────────────────
  Future<void> _persistSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (_accessToken != null) {
      await prefs.setString(AppConstants.keyAccessToken, _accessToken!);
    }
    if (_user != null) {
      await prefs.setString(AppConstants.keyUserId, _user!.id);
      await prefs.setString(AppConstants.keyUserEmail, _user!.email);
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
