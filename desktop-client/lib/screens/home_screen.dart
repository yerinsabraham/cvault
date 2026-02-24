import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants.dart';
import '../providers/auth_provider.dart';
import '../providers/vpn_provider.dart';
import '../widgets/power_button.dart';
import '../widgets/server_selector.dart';

/// Main VPN screen with power button, server selector, and status.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Timer? _timer;
  Duration _elapsed = Duration.zero;
  ServerLocation _server = ServerSelector.defaultServers.first;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VPNProvider>().initialize();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  // ── Timer ───────────────────────────────────────────────────
  void _startTimer() {
    _elapsed = Duration.zero;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed += const Duration(seconds: 1));
    });
  }

  void _stopTimer() {
    _timer?.cancel();
    _elapsed = Duration.zero;
  }

  String _fmt(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  // ── Connect / disconnect ────────────────────────────────────
  Future<void> _toggle() async {
    final vpn = context.read<VPNProvider>();
    try {
      if (vpn.isConnected) {
        await vpn.disconnect();
        _stopTimer();
      } else {
        // One-time sudoers setup check
        final ready = await vpn.isSudoersConfigured();
        if (!ready && mounted) {
          final proceed = await _showSudoersSetupDialog();
          if (!proceed) return;
        }
        await vpn.connectAuto();
        _startTimer();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll('Exception: ', ''),
              style: const TextStyle(fontSize: 13),
            ),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  /// Shows the one-time permissions setup dialog.
  /// Returns true if setup succeeded (or was already done), false to cancel.
  Future<bool> _showSudoersSetupDialog() async {
    final vpn = context.read<VPNProvider>();
    bool setting = false;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Dialog(
          backgroundColor: AppColors.surface,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withOpacity(0.12),
                    ),
                    child: const Icon(Icons.admin_panel_settings_rounded,
                        color: AppColors.primary, size: 28),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'One-Time Setup Required',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'CVault needs one-time permission to manage VPN tunnels. '
                    'macOS will ask for your administrator password — this is a '
                    'standard security prompt and will never be shown again.',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  if (setting)
                    const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.primary),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(
                                  color: AppColors.surfaceBorder),
                              foregroundColor: AppColors.textSecondary,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Not Now'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () async {
                              setS(() => setting = true);
                              final err = await vpn.configureSudoers();
                              if (ctx.mounted) {
                                Navigator.pop(ctx, err == null);
                                if (err != null && err != 'cancelled') {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Setup failed: $err'),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                }
                              }
                            },
                            child: const Text('Allow'),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    return result == true;
  }

  void _logout() async {
    final vpn = context.read<VPNProvider>();
    if (vpn.isConnected) {
      try {
        await vpn.disconnect();
      } catch (_) {}
      _stopTimer();
    }
    if (mounted) await context.read<AuthProvider>().logout();
  }

  // ── Build ─────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Consumer<VPNProvider>(
        builder: (context, vpn, _) {
          final btnState = vpn.isLoading
              ? PowerButtonState.connecting
              : vpn.isConnected
                  ? PowerButtonState.connected
                  : PowerButtonState.disconnected;

          final statusLabel = vpn.isLoading
              ? 'Connecting…'
              : vpn.isConnected
                  ? 'Connected'
                  : 'Tap to connect';

          final statusColor = vpn.isLoading
              ? AppColors.connecting
              : vpn.isConnected
                  ? AppColors.connected
                  : AppColors.textSecondary;

          return Column(
            children: [
              _topBar(),
              Expanded(
                child: SingleChildScrollView(
                  physics: const NeverScrollableScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: MediaQuery.of(context).size.height -
                          MediaQuery.of(context).padding.top - 86,
                    ),
                    child: IntrinsicHeight(
                      child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 10),

                      // Server selector
                      ServerSelector(
                        selectedServer: _server,
                        servers: ServerSelector.defaultServers,
                        isConnected: vpn.isConnected,
                        onServerSelected: (s) =>
                            setState(() => _server = s),
                      ),

                      const Spacer(flex: 3),

                      // Power button
                      PowerButton(
                        state: btnState,
                        onPressed: _toggle,
                        size: 130,
                      ),

                      const SizedBox(height: 16),

                      // Status
                      Text(
                        statusLabel,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                          letterSpacing: 0.3,
                        ),
                      ),

                      // Timer
                      if (vpn.isConnected) ...[
                        const SizedBox(height: 4),
                        Text(
                          _fmt(_elapsed),
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],

                      // Error
                      if (vpn.error != null) ...[
                        const SizedBox(height: 10),
                        _errorBanner(vpn),
                      ],

                      const Spacer(flex: 2),

                      // IP card
                      _ipCard(vpn),
                      const SizedBox(height: 10),

                      // Stats row
                      _statsRow(vpn),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
          ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Sub-widgets ───────────────────────────────────────────────

  Widget _topBar() {
    final auth = context.watch<AuthProvider>();
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 44, 12, 10),
      child: Row(
        children: [
          // Logo
          Image.asset(
            'assets/images/cvault_logo.png',
            width: 32,
            height: 32,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('CVault',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                Text(auth.user?.email ?? '',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded,
                size: 20, color: AppColors.textSecondary),
            onPressed: _logout,
            tooltip: 'Log out',
          ),
        ],
      ),
    );
  }

  Widget _errorBanner(VPNProvider vpn) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.error.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              vpn.error!.replaceAll('Exception: ', ''),
              style: const TextStyle(color: AppColors.error, fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          GestureDetector(
            onTap: vpn.clearError,
            child: const Icon(Icons.close, color: AppColors.error, size: 16),
          ),
        ],
      ),
    );
  }

  Widget _ipCard(VPNProvider vpn) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.language_rounded,
                color: vpn.isConnected
                    ? AppColors.connected
                    : AppColors.textMuted,
                size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vpn.isConnected ? 'Protected IP' : 'Your IP',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(height: 2),
                Text(
                  vpn.publicIp ?? 'Checking…',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
          _statusBadge(vpn.isConnected),
        ],
      ),
    );
  }

  Widget _statusBadge(bool secure) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: secure
            ? AppColors.connected.withOpacity(0.12)
            : AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            secure ? Icons.lock_rounded : Icons.lock_open_rounded,
            size: 12,
            color: secure ? AppColors.connected : AppColors.error,
          ),
          const SizedBox(width: 4),
          Text(
            secure ? 'Secure' : 'Exposed',
            style: TextStyle(
              color: secure ? AppColors.connected : AppColors.error,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statsRow(VPNProvider vpn) {
    return Row(
      children: [
        _stat(Icons.devices_rounded, 'Devices', '${vpn.devices.length}'),
        const SizedBox(width: 10),
        _stat(
          Icons.wifi_rounded,
          'Sessions',
          '${vpn.sessions.where((s) => s.status == 'ACTIVE').length}',
        ),
        const SizedBox(width: 10),
        _stat(
          Icons.timer_outlined,
          'Uptime',
          vpn.isConnected ? _fmt(_elapsed) : '--:--',
        ),
      ],
    );
  }

  Widget _stat(IconData icon, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.textMuted),
            const SizedBox(height: 6),
            Text(value,
                style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
