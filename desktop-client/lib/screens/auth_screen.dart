import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants.dart';
import '../providers/auth_provider.dart';

/// Clean dark login / sign-up screen.
///
/// The tenant API key is embedded — users only enter email + password.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _isLogin = true;
  bool _obscure = true;
  bool _submitting = false;
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) {
        setState(() => _isLogin = _tabCtrl.index == 0);
      }
    });
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _tabCtrl.dispose();
    super.dispose();
  }

  // ── Submit ────────────────────────────────────────────────────
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_isLogin && _passCtrl.text != _confirmCtrl.text) {
      _snack('Passwords do not match');
      return;
    }
    setState(() => _submitting = true);
    final auth = context.read<AuthProvider>();
    try {
      if (_isLogin) {
        await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
      } else {
        await auth.register(_emailCtrl.text.trim(), _passCtrl.text);
      }
    } catch (e) {
      if (mounted) {
        _snack(e.toString().replaceAll('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _tryDemo() {
    _emailCtrl.text = AppConstants.demoEmail;
    _passCtrl.text = AppConstants.demoPassword;
    _tabCtrl.animateTo(0);
    setState(() => _isLogin = true);
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontSize: 13)),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 36),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 48),

                // ── Logo ──
                _buildLogo(),
                const SizedBox(height: 20),
                const Text(
                  'CVault',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Secure VPN by Creovine',
                  style:
                      TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 40),

                // ── Tab bar ──
                _buildTabBar(),
                const SizedBox(height: 28),

                // ── Form ──
                _buildForm(),
                const SizedBox(height: 24),

                // ── Demo shortcut ──
                TextButton.icon(
                  onPressed: _tryDemo,
                  icon: const Icon(Icons.play_circle_outline, size: 18),
                  label: const Text('Try Demo',
                      style: TextStyle(fontSize: 13)),
                ),

                const SizedBox(height: 16),
                Text(
                  'v${AppConstants.appVersion}',
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Sub-widgets ───────────────────────────────────────────────

  Widget _buildLogo() {
    return Image.asset(
      'assets/images/cvault_logo.png',
      width: 80,
      height: 80,
    );
  }

  Widget _buildTabBar() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: TabBar(
        controller: _tabCtrl,
        indicator: BoxDecoration(
          color: AppColors.primary.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle:
            const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        tabs: const [Tab(text: 'Log In'), Tab(text: 'Sign Up')],
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Email
          TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'Email address',
              prefixIcon:
                  Icon(Icons.email_outlined, color: AppColors.textMuted, size: 20),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Email required';
              if (!v.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 14),

          // Password
          TextFormField(
            controller: _passCtrl,
            obscureText: _obscure,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline,
                  color: AppColors.textMuted, size: 20),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: AppColors.textMuted,
                  size: 20,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Password required';
              if (v.length < 8) return 'Min 8 characters';
              return null;
            },
          ),

          // Confirm password (sign-up only)
          if (!_isLogin) ...[
            const SizedBox(height: 14),
            TextFormField(
              controller: _confirmCtrl,
              obscureText: true,
              style:
                  const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Confirm password',
                prefixIcon: Icon(Icons.lock_outline,
                    color: AppColors.textMuted, size: 20),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Please confirm';
                return null;
              },
            ),
          ],

          const SizedBox(height: 26),

          // Submit
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(_isLogin ? 'Log In' : 'Create Account'),
            ),
          ),
        ],
      ),
    );
  }
}
