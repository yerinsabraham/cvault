import 'dart:io';

/// WireGuard VPN Service — manages the tunnel on macOS and Windows.
///
/// macOS  : uses wg-quick (via sudo / sudoers rule)
/// Windows: uses wireguard.exe /installtunnel  (app runs as admin via manifest)
class WireGuardService {
  String? _configPath;
  String? _wgQuickPath;   // macOS only
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  // ── Platform helpers ─────────────────────────────────────────────────────

  bool get _isMac     => Platform.isMacOS;
  bool get _isWindows => Platform.isWindows;

  // ── Sudoers setup (macOS only) ─────────────────────────────────────────

  /// Returns true if wg-quick can run without a password prompt (macOS only).
  /// On Windows always returns true — elevation is handled by the app manifest.
  Future<bool> isSudoersConfigured() async {
    if (!_isMac) return true;
    try {
      final wgPath = await _findWgQuick();
      if (wgPath == null) return false;
      // -n = non-interactive; exits non-zero if a password would be required
      final result = await Process.run(
        'sudo',
        ['-n', wgPath, '--version'],
        runInShell: false,
      );
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Uses macOS's native admin dialog (osascript) to write a sudoers rule.
  /// On Windows this is a no-op (returns null = success immediately).
  Future<String?> configureSudoers() async {
    if (!_isMac) return null;
    try {
      final username = Platform.environment['USER'] ?? 'root';
      final wgLocal = '/usr/local/bin/wg-quick';
      final wgBrew  = '/opt/homebrew/bin/wg-quick';

      // Write the sudoers rule to a temp script to avoid quote-escaping
      // issues inside AppleScript strings.
      const scriptPath = '/tmp/cvault_setup.sh';
      final scriptContent = '''#!/bin/sh
RULE="$username ALL=(ALL) NOPASSWD: $wgLocal, $wgBrew"
echo "\$RULE" > /etc/sudoers.d/cvault
chmod 440 /etc/sudoers.d/cvault
''';
      await File(scriptPath).writeAsString(scriptContent);
      await Process.run('chmod', ['+x', scriptPath]);

      // osascript shows the native "CVault wants to make changes" dialog.
      // We pass the script path — no embedded quotes needed.
      final result = await Process.run(
        'osascript',
        ['-e', 'do shell script "$scriptPath" with administrator privileges'],
        runInShell: false,
      );

      // Clean up temp script
      try { await File(scriptPath).delete(); } catch (_) {}

      if (result.exitCode == 0) return null;
      final err = result.stderr.toString().trim();
      if (err.contains('User cancelled') || err.contains('-128')) {
        return 'cancelled';
      }
      return err.isNotEmpty ? err : 'Setup failed (exit ${result.exitCode})';
    } catch (e) {
      return e.toString();
    }
  }

  // ── macOS: find wg-quick ─────────────────────────────────────────────────

  Future<String?> _findWgQuick() async {
    if (!_isMac) return null;
    if (_wgQuickPath != null) return _wgQuickPath;
    for (final path in [
      '/usr/local/bin/wg-quick',
      '/opt/homebrew/bin/wg-quick',
      '/usr/bin/wg-quick',
    ]) {
      if (await File(path).exists()) {
        _wgQuickPath = path;
        return path;
      }
    }
    return null;
  }

  // ── Windows: find wireguard.exe ──────────────────────────────────────────

  Future<String?> _findWireGuardExe() async {
    if (!_isWindows) return null;
    for (final path in [
      r'C:\Program Files\WireGuard\wireguard.exe',
      r'C:\Program Files (x86)\WireGuard\wireguard.exe',
    ]) {
      if (await File(path).exists()) return path;
    }
    // Fallback: try PATH
    try {
      final r = await Process.run('where', ['wireguard.exe'], runInShell: true);
      if (r.exitCode == 0) {
        final p = r.stdout.toString().trim().split('\n').first.trim();
        if (p.isNotEmpty) return p;
      }
    } catch (_) {}
    return null;
  }

  String get _tunnelName => 'cvault'; // tunnel name = config file name without .conf

  // ── Connect ──────────────────────────────────────────────────────────────

  Future<void> connect(String config) async {
    if (_isConnected) throw Exception('Already connected to VPN');
    if (config.isEmpty) throw Exception('Empty config received from server');

    print('[WireGuard] Received config (${config.length} bytes)');

    if (_isMac) {
      await _connectMac(config);
    } else if (_isWindows) {
      await _connectWindows(config);
    } else {
      throw Exception('Unsupported platform: ${Platform.operatingSystem}');
    }
  }

  Future<void> _connectMac(String config) async {
    _configPath = '/tmp/cvault.conf';
    await File(_configPath!).writeAsString(config);
    print('[WireGuard] Config written to $_configPath');

    final wgQuickPath = await _findWgQuick();
    if (wgQuickPath == null) {
      throw Exception(
          'WireGuard is not installed.\nInstall it with: brew install wireguard-tools');
    }
    print('[WireGuard] Using wg-quick at: $wgQuickPath');

    // Bring down any existing tunnel silently
    await Process.run('sudo', [wgQuickPath, 'down', _configPath!], runInShell: true);
    await Future.delayed(const Duration(seconds: 1));

    print('[WireGuard] Running: sudo $wgQuickPath up $_configPath');
    final result = await Process.run(
      'sudo', [wgQuickPath, 'up', _configPath!], runInShell: true,
    );

    print('[WireGuard] Exit code: ${result.exitCode}');
    print('[WireGuard] Stdout: ${result.stdout}');
    print('[WireGuard] Stderr: ${result.stderr}');

    if (result.exitCode != 0) throw Exception('wg-quick failed: ${result.stderr}');

    await Future.delayed(const Duration(seconds: 3));
    _isConnected = true;
    print('[WireGuard] VPN connected (macOS)');
  }

  Future<void> _connectWindows(String config) async {
    final wireguardExe = await _findWireGuardExe();
    if (wireguardExe == null) {
      throw Exception(
          'WireGuard is not installed.\n'
          'Download and install it from: https://www.wireguard.com/install/');
    }

    // Write config to %TEMP%\cvault.conf
    final tempDir = Platform.environment['TEMP'] ??
        Platform.environment['TMP'] ?? r'C:\Temp';
    _configPath = '$tempDir\\$_tunnelName.conf';
    await File(_configPath!).writeAsString(config);
    print('[WireGuard] Config written to $_configPath');

    // Uninstall any existing tunnel first (ignore errors)
    await Process.run(wireguardExe, ['/uninstalltunnel', _tunnelName], runInShell: false);
    await Future.delayed(const Duration(seconds: 1));

    print('[WireGuard] Running: $wireguardExe /installtunnel $_configPath');
    final result = await Process.run(
      wireguardExe, ['/installtunnel', _configPath!], runInShell: false,
    );

    print('[WireGuard] Exit code: ${result.exitCode}');
    print('[WireGuard] Stdout: ${result.stdout}');
    print('[WireGuard] Stderr: ${result.stderr}');

    if (result.exitCode != 0) {
      throw Exception('WireGuard install tunnel failed: ${result.stderr}');
    }

    await Future.delayed(const Duration(seconds: 3));
    _isConnected = true;
    print('[WireGuard] VPN connected (Windows)');
  }

  // ── Disconnect ───────────────────────────────────────────────────────────

  Future<void> disconnect() async {
    if (!_isConnected || _configPath == null) throw Exception('Not connected to VPN');

    try {
      if (_isMac) {
        await _disconnectMac();
      } else if (_isWindows) {
        await _disconnectWindows();
      }
    } catch (e) {
      _isConnected = false;
      print('[WireGuard] Exception during disconnect: $e');
      rethrow;
    }
  }

  Future<void> _disconnectMac() async {
    final wgQuickPath = await _findWgQuick();
    if (wgQuickPath == null) throw Exception('WireGuard not found');

    print('[WireGuard] Disconnecting (macOS)...');
    final result = await Process.run(
      'sudo', [wgQuickPath, 'down', _configPath!], runInShell: true,
    );
    print('[WireGuard] Exit code: ${result.exitCode}');
    print('[WireGuard] Stdout: ${result.stdout}');
    print('[WireGuard] Stderr: ${result.stderr}');

    _isConnected = false;
    print('[WireGuard] Disconnected (macOS)');
  }

  Future<void> _disconnectWindows() async {
    final wireguardExe = await _findWireGuardExe();
    if (wireguardExe == null) throw Exception('WireGuard not found');

    print('[WireGuard] Disconnecting (Windows)...');
    final result = await Process.run(
      wireguardExe, ['/uninstalltunnel', _tunnelName], runInShell: false,
    );
    print('[WireGuard] Exit code: ${result.exitCode}');
    print('[WireGuard] Stdout: ${result.stdout}');
    print('[WireGuard] Stderr: ${result.stderr}');

    _isConnected = false;
    print('[WireGuard] Disconnected (Windows)');
  }

  // ── Status ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStatus() async {
    try {
      if (_isMac) {
        final result = await Process.run('sudo', ['wg', 'show']);
        if (result.exitCode == 0) {
          final output = result.stdout.toString();
          return {'connected': output.isNotEmpty && output.contains('interface:'), 'output': output};
        }
      } else if (_isWindows) {
        // Check if the WireGuard tunnel Windows Service is running
        final result = await Process.run(
          'powershell',
          ['-NoProfile', '-Command',
           'Get-Service -Name "WireGuardTunnel\$$_tunnelName" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status'],
          runInShell: false,
        );
        final status = result.stdout.toString().trim();
        return {'connected': status == 'Running', 'output': status};
      }
      return {'connected': false, 'output': ''};
    } catch (e) {
      return {'connected': false, 'error': e.toString()};
    }
  }

  // ── Check installed ──────────────────────────────────────────────────────

  Future<bool> isWireGuardInstalled() async {
    if (_isMac)     return (await _findWgQuick()) != null;
    if (_isWindows) return (await _findWireGuardExe()) != null;
    return false;
  }

  /// Get public IP — tries multiple endpoints so it works
  /// even when DNS or routing through the WireGuard tunnel is slow.
  Future<String> getPublicIp({int retries = 8}) async {
    // Endpoints in priority order.
    // Cloudflare trace is IP-based (no DNS). Others need DNS but
    // wg-quick sets DNS to 1.1.1.1 / 8.8.8.8 which routes through tunnel.
    const endpoints = [
      'https://1.1.1.1/cdn-cgi/trace',
      'http://1.1.1.1/cdn-cgi/trace',
      'https://icanhazip.com',
      'https://api.ipify.org',
    ];

    for (int i = 0; i < retries; i++) {
      for (final url in endpoints) {
        try {
          final result = await Process.run(
            'curl',
            ['-s', '--max-time', '6', '--insecure', url],
            runInShell: true,
          );
          if (result.exitCode == 0) {
            final body = result.stdout.toString().trim();
            if (url.contains('/cdn-cgi/trace')) {
              final match = RegExp(r'ip=(\S+)').firstMatch(body);
              if (match != null && match.group(1)!.isNotEmpty) {
                print('[WireGuard] Public IP from $url: ${match.group(1)}');
                return match.group(1)!;
              }
            } else {
              // Plain-text endpoint — validate it looks like an IPv4 address
              final plain = body.split('\n').first.trim();
              if (RegExp(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$').hasMatch(plain)) {
                print('[WireGuard] Public IP from $url: $plain');
                return plain;
              }
            }
          }
        } catch (_) {}
      }
      if (i < retries - 1) await Future.delayed(const Duration(seconds: 3));
    }
    return 'Unknown';
  }

  /// Cleanup
  Future<void> cleanup() async {
    if (_isConnected) {
      await disconnect();
    }

    if (_configPath != null) {
      try {
        final file = File(_configPath!);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (e) {
        print('[WireGuard] Cleanup error: $e');
      }
    }
  }
}
