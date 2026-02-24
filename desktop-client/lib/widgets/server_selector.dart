import 'package:flutter/material.dart';
import '../constants.dart';

/// Represents a VPN server location.
class ServerLocation {
  final String region;
  final String country;
  final String city;
  final String flagEmoji;
  final bool isAvailable;

  const ServerLocation({
    required this.region,
    required this.country,
    required this.city,
    required this.flagEmoji,
    this.isAvailable = true,
  });
}

/// A tappable row that shows the selected server and opens a picker dialog.
class ServerSelector extends StatelessWidget {
  final ServerLocation? selectedServer;
  final List<ServerLocation> servers;
  final ValueChanged<ServerLocation>? onServerSelected;
  final bool isConnected;

  const ServerSelector({
    super.key,
    this.selectedServer,
    required this.servers,
    this.onServerSelected,
    this.isConnected = false,
  });

  /// Default VPN locations — only the first is currently live.
  static const List<ServerLocation> defaultServers = [
    ServerLocation(
        region: 'us-east',
        country: 'United States',
        city: 'New York',
        flagEmoji: '🇺🇸'),
    ServerLocation(
        region: 'eu-west',
        country: 'Germany',
        city: 'Frankfurt',
        flagEmoji: '🇩🇪',
        isAvailable: false),
    ServerLocation(
        region: 'eu-north',
        country: 'United Kingdom',
        city: 'London',
        flagEmoji: '🇬🇧',
        isAvailable: false),
    ServerLocation(
        region: 'ap-southeast',
        country: 'Singapore',
        city: 'Singapore',
        flagEmoji: '🇸🇬',
        isAvailable: false),
    ServerLocation(
        region: 'ap-northeast',
        country: 'Japan',
        city: 'Tokyo',
        flagEmoji: '🇯🇵',
        isAvailable: false),
  ];

  @override
  Widget build(BuildContext context) {
    final current =
        selectedServer ?? (servers.isNotEmpty ? servers.first : defaultServers.first);

    return GestureDetector(
      onTap: isConnected ? null : () => _showPicker(context),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Row(
          children: [
            Text(current.flagEmoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    current.country,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    current.city,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.expand_more_rounded,
              color:
                  isConnected ? AppColors.textMuted : AppColors.textSecondary,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }

  void _showPicker(BuildContext context) {
    final all = servers.isNotEmpty ? servers : defaultServers;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 340),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Select Location',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Choose your VPN server',
                  style:
                      TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 16),
                ...all.map((s) => _serverTile(ctx, s)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _serverTile(BuildContext ctx, ServerLocation server) {
    final isSelected = selectedServer?.region == server.region;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: isSelected
            ? AppColors.primary.withOpacity(0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: server.isAvailable
              ? () {
                  onServerSelected?.call(server);
                  Navigator.pop(ctx);
                }
              : null,
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Text(server.flagEmoji, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        server.country,
                        style: TextStyle(
                          color: server.isAvailable
                              ? AppColors.textPrimary
                              : AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        server.city,
                        style: TextStyle(
                          color: server.isAvailable
                              ? AppColors.textSecondary
                              : AppColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (server.isAvailable && isSelected)
                  const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                if (!server.isAvailable)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.textMuted.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Soon',
                      style:
                          TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
