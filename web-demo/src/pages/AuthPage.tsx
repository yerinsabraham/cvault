import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVault } from '../context/CVaultContext';

export default function AuthPage() {
  const { cvault, setUser, apiKey, setApiKey } = useCVault();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('SecurePass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvault) return;

    setLoading(true);
    setError('');

    try {
      const result = isLogin
        ? await cvault.auth.login({ email, password })
        : await cvault.auth.register({ email, password });

      // Store token
      localStorage.setItem('cvault_token', result.accessToken);
      
      // Set user in context
      setUser(result.user);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setApiKey('');
    navigate('/config');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={handleBack}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Change API Key
        </button>

        <div className="card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-gray-600 text-sm">
              {isLogin ? 'Sign in to your account' : 'Register a new account'}
            </p>
          </div>

          {/* API Key Indicator */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Connected to:</p>
            <p className="text-xs font-mono text-gray-700 truncate">
              API Key: {apiKey.substring(0, 16)}...
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                disabled={loading}
              />
              {!isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Demo Credentials */}
          {isLogin && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                Demo Credentials
              </h3>
              <p className="text-xs text-yellow-800 mb-2">
                Pre-filled for testing:
              </p>
              <div className="text-xs font-mono space-y-1">
                <div className="text-yellow-900">
                  <span className="text-yellow-700">Email:</span> test@example.com
                </div>
                <div className="text-yellow-900">
                  <span className="text-yellow-700">Password:</span> SecurePass123!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
