import 'package:flutter/material.dart';

/// CVault App Configuration
class AppConstants {
  // Environment
  // Default to PRODUCTION=true so all builds (debug & release) hit the live
  // server. Override with --dart-define=PRODUCTION=false for local dev only.
  static const bool isProduction =
      bool.fromEnvironment('PRODUCTION', defaultValue: true);

  // API — key is embedded; users never see it
  static String get apiBaseUrl => isProduction
      ? 'https://api.creovine.com/cvault/v1'
      : 'http://localhost:3000/cvault/v1';

  static String get apiKey => isProduction
      ? 'afe0d4640d1d23728c6c9cf2396da338c71c361ec6f5d22262a186ad36a4f5e3'
      : 'a148620c598895d8a1bde0d6c7e18735c5c3db63be4e4e10cf7c3376feb49245';

  // Demo credentials
  static const String demoEmail = 'test@example.com';
  static const String demoPassword = 'SecurePass123!';

  // Persistence keys
  static const String keyAccessToken = 'cvault_access_token';
  static const String keyUserId = 'cvault_user_id';
  static const String keyUserEmail = 'cvault_user_email';

  // WireGuard
  static const String wireguardConfigPath = '/tmp/cvault.conf';
  static const String wireguardInterface = 'utun';

  // Branding
  static const String appName = 'CVault';
  static const String appVersion = '1.0.0';
  static const String appTagline = 'Secure VPN by Creovine';
}

/// Dark colour palette
class AppColors {
  static const Color background = Color(0xFF0B0F1A);
  static const Color surface = Color(0xFF151A2E);
  static const Color surfaceLight = Color(0xFF1E2440);
  static const Color surfaceBorder = Color(0xFF2A2F45);

  static const Color primary = Color(0xFF00D2A8);
  static const Color primaryDark = Color(0xFF00A88A);
  static const Color primaryGlow = Color(0x4000D2A8);

  static const Color connected = Color(0xFF00E676);
  static const Color connectedGlow = Color(0x4000E676);
  static const Color connecting = Color(0xFFFFA726);
  static const Color disconnected = Color(0xFF546E7A);

  static const Color error = Color(0xFFFF5252);
  static const Color warning = Color(0xFFFFA726);

  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF8D8E98);
  static const Color textMuted = Color(0xFF4A4B57);

  static const Color inputBackground = Color(0xFF1A1F35);
  static const Color inputBorder = Color(0xFF2E3350);
}

