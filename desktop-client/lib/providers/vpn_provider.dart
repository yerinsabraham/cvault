import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/wireguard_service.dart';

/// Manages VPN connection state.
///
/// Key improvement: [connectAuto] handles device registration
/// transparently — the user just taps the power button.
class VPNProvider with ChangeNotifier {
  ApiClient? _apiClient;
  final WireGuardService _wg = WireGuardService();

  List<Device> _devices = [];
  List<VPNSession> _sessions = [];
  ServerStatus? _serverStatus;
  Device? _activeDevice;
  bool _isConnected = false;
  bool _isLoading = false;
  String? _error;
  String? _publicIp;
  Timer? _statusTimer;

  // ── Public getters ──────────────────────────────────────────
  List<Device> get devices => _devices;
  List<VPNSession> get sessions => _sessions;
  ServerStatus? get serverStatus => _serverStatus;
  Device? get activeDevice => _activeDevice;
  bool get isConnected => _isConnected;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get publicIp => _publicIp;
  WireGuardService get wireguardService => _wg;

  // ── API client ──────────────────────────────────────────────
  void updateApiClient(String apiKey, String? token) {
    _apiClient = ApiClient(apiKey: apiKey, accessToken: token);
  }

  ApiClient get apiClient {
    if (_apiClient == null) throw Exception('Not logged in');
    return _apiClient!;
  }

  // ── Initialise (called once after login) ────────────────────
  Future<void> initialize() async {
    await loadDevices();
    await loadStatus();
    updatePublicIp();
    _statusTimer?.cancel();
    _statusTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      loadStatus();
      if (_isConnected) updatePublicIp();
    });
  }

  Future<void> loadDevices() async {
    try {
      _devices = await apiClient.listDevices();
      if (_activeDevice == null && _devices.isNotEmpty) {
        _activeDevice = _devices.first;
      }
      _error = null;
    } catch (e) {
      debugPrint('loadDevices: $e');
    }
    notifyListeners();
  }

  Future<void> loadStatus() async {
    // Don't attempt API calls while the tunnel is active or while
    // connecting — DNS for api.creovine.com won't resolve through
    // the WireGuard tunnel.
    if (_isConnected || _isLoading) return;
    try {
      _sessions = await apiClient.getVPNStatus();
      _serverStatus = await apiClient.getServerStatus();
      _isConnected = _wg.isConnected;
      _error = null;
    } catch (e) {
      debugPrint('loadStatus: $e');
    }
    notifyListeners();
  }

  // ── One‐click connect (auto‐registers device if needed) ────
  Future<bool> isSudoersConfigured() => _wg.isSudoersConfigured();
  Future<String?> configureSudoers()  => _wg.configureSudoers();

  Future<void> connectAuto() async {
    if (_isConnected) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Auto-register a device when the user has none
      if (_devices.isEmpty || _activeDevice == null) {
        final hostname = Platform.localHostname;
        final name = hostname.isNotEmpty ? hostname : 'macOS Device';
        debugPrint('[VPN] No active device — registering "$name"');
        final device =
            await apiClient.registerDevice(name, deviceType: 'macOS');
        _devices.add(device);
        _activeDevice = device;
        debugPrint('[VPN] Device registered: ${device.id} ip=${device.assignedIp}');
      }

      final config = _activeDevice!.config;
      debugPrint('[VPN] Using device ${_activeDevice!.id} (${_activeDevice!.deviceName}) ip=${_activeDevice!.assignedIp}');
      debugPrint('[VPN] Config length: ${config.length} bytes');
      if (config.isEmpty) {
        throw Exception('No VPN configuration available. Please try again.');
      }

      // Clear IP immediately so UI shows "Checking…" instead of stale value
      _publicIp = null;
      notifyListeners();

      // Notify the backend BEFORE bringing the tunnel up.
      debugPrint('[VPN] Notifying backend (connectVPN)…');
      await apiClient.connectVPN(_activeDevice!.id);
      debugPrint('[VPN] Backend notified. Bringing tunnel up…');

      await _wg.connect(config);
      _isConnected = true;
      debugPrint('[VPN] Tunnel is UP. Will check IP in 4s…');
      notifyListeners();
      // Give WireGuard 4s to complete its handshake and route traffic,
      // then start fetching the new IP. updatePublicIp retries automatically.
      Future.delayed(const Duration(seconds: 4), updatePublicIp);
      _error = null;
    } catch (e) {
      _error = e.toString();
      _isConnected = false;
      try {
        await _wg.disconnect();
      } catch (_) {}
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Disconnect ──────────────────────────────────────────────
  Future<void> disconnect() async {
    if (!_isConnected) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Bring tunnel down first — this restores normal DNS so we
      // can then reach api.creovine.com to notify the backend.
      await _wg.disconnect();
      if (_activeDevice != null) {
        try {
          await apiClient.disconnectVPN(_activeDevice!.id);
        } catch (e) {
          debugPrint('disconnectVPN backend call failed: $e');
        }
      }
      _isConnected = false;
      updatePublicIp();
      _error = null;
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Public IP ───────────────────────────────────────────────
  int _ipRetryCount = 0;
  static const _maxIpRetries = 10;

  Future<void> updatePublicIp() async {
    debugPrint('[VPN] updatePublicIp called (connected=$_isConnected, retry=$_ipRetryCount)');
    try {
      final ip = await _wg.getPublicIp();
      debugPrint('[VPN] getPublicIp returned: "$ip"');
      if (ip != 'Unknown' && ip.isNotEmpty) {
        _publicIp = ip;
        _ipRetryCount = 0;
        debugPrint('[VPN] ✓ Public IP set to: $ip');
        notifyListeners();
      } else if (_isConnected && _ipRetryCount < _maxIpRetries) {
        // Tunnel up but IP not yet reachable — retry.
        _ipRetryCount++;
        debugPrint('updatePublicIp: retry $_ipRetryCount/$_maxIpRetries');
        notifyListeners();
        Future.delayed(const Duration(seconds: 5), updatePublicIp);
      } else {
        // Give up — show 'Unknown' rather than stuck on "Checking…"
        _publicIp = _isConnected ? 'Unavailable' : null;
        _ipRetryCount = 0;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('getPublicIp: $e');
      if (_isConnected && _ipRetryCount < _maxIpRetries) {
        _ipRetryCount++;
        Future.delayed(const Duration(seconds: 5), updatePublicIp);
      } else {
        _publicIp = _isConnected ? 'Unavailable' : null;
        _ipRetryCount = 0;
      }
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    super.dispose();
  }
}
