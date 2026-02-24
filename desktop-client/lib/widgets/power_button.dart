import 'dart:math';
import 'package:flutter/material.dart';
import '../constants.dart';

enum PowerButtonState { disconnected, connecting, connected }

class PowerButton extends StatefulWidget {
  final PowerButtonState state;
  final VoidCallback onPressed;
  final double size;

  const PowerButton({
    super.key,
    required this.state,
    required this.onPressed,
    this.size = 140,
  });

  @override
  State<PowerButton> createState() => _PowerButtonState();
}

class _PowerButtonState extends State<PowerButton>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _rotateController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );
    _scaleAnimation = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _syncAnimations();
  }

  @override
  void didUpdateWidget(PowerButton old) {
    super.didUpdateWidget(old);
    if (old.state != widget.state) _syncAnimations();
  }

  void _syncAnimations() {
    if (widget.state == PowerButtonState.connecting) {
      _pulseController.repeat();
      _rotateController.repeat();
    } else {
      _pulseController.stop();
      _pulseController.value = 0;
      _rotateController.stop();
      _rotateController.value = 0;
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotateController.dispose();
    super.dispose();
  }

  Color get _activeColor {
    switch (widget.state) {
      case PowerButtonState.connected:
        return AppColors.connected;
      case PowerButtonState.connecting:
        return AppColors.connecting;
      case PowerButtonState.disconnected:
        return AppColors.disconnected;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseController, _rotateController]),
      builder: (context, child) {
        final scale = widget.state == PowerButtonState.connecting
            ? _scaleAnimation.value
            : 1.0;
        final outerRadius = widget.size / 2 + 20;

        return Transform.scale(
          scale: scale,
          child: GestureDetector(
            onTap: widget.state == PowerButtonState.connecting
                ? null
                : widget.onPressed,
            child: SizedBox(
              width: outerRadius * 2 + 16,
              height: outerRadius * 2 + 16,
              child: CustomPaint(
                painter: _RingPainter(
                  state: widget.state,
                  color: _activeColor,
                  rotation: _rotateController.value,
                  pulseOpacity: widget.state == PowerButtonState.connecting
                      ? (1.0 - _pulseAnimation.value + 1.0).clamp(0.0, 0.5)
                      : 0.0,
                  pulseScale: _pulseAnimation.value,
                ),
                child: Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    curve: Curves.easeInOut,
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surface,
                      border: Border.all(
                        color: _activeColor.withOpacity(0.35),
                        width: 2.5,
                      ),
                      boxShadow: widget.state != PowerButtonState.disconnected
                          ? [
                              BoxShadow(
                                color: _activeColor.withOpacity(0.25),
                                blurRadius: 32,
                                spreadRadius: 2,
                              )
                            ]
                          : null,
                    ),
                    child: Icon(
                      Icons.power_settings_new_rounded,
                      size: widget.size * 0.35,
                      color: _activeColor,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  final PowerButtonState state;
  final Color color;
  final double rotation;
  final double pulseOpacity;
  final double pulseScale;

  _RingPainter({
    required this.state,
    required this.color,
    required this.rotation,
    required this.pulseOpacity,
    required this.pulseScale,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;

    // Pulse ring (connecting state)
    if (state == PowerButtonState.connecting && pulseOpacity > 0) {
      final pulsePaint = Paint()
        ..color = color.withOpacity(pulseOpacity * 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawCircle(center, radius * pulseScale, pulsePaint);
    }

    // Background ring
    final bgPaint = Paint()
      ..color = AppColors.surfaceBorder
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawCircle(center, radius, bgPaint);

    // Active arc / ring
    if (state == PowerButtonState.connecting) {
      final arcPaint = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round;
      final rect = Rect.fromCircle(center: center, radius: radius);
      canvas.drawArc(rect, rotation * 2 * pi, pi * 1.2, false, arcPaint);
    } else if (state == PowerButtonState.connected) {
      final fullPaint = Paint()
        ..shader = SweepGradient(
          colors: [
            color.withOpacity(0.15),
            color,
            color.withOpacity(0.15),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: radius))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3;
      canvas.drawCircle(center, radius, fullPaint);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.state != state ||
      old.rotation != rotation ||
      old.pulseScale != pulseScale ||
      old.color != color;
}
