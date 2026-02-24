import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVault } from '../context/CVaultContext';

export default function ConfigPage() {
  const { setApiKey } = useCVault();
  const navigate = useNavigate();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setApiKey(input.trim());
      navigate('/auth');
    }
  };

  const handleUseDemoKey = () => {
    const demoKey = 'a148620c598895d8a1bde0d6c7e18735c5c3db63be4e4e10cf7c3376feb49245';
    setApiKey(demoKey);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CVault Web Demo</h1>
            <p className="text-gray-600">
              Enter your tenant API key to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                id="apiKey"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your CVault API key"
                className="input"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Your API key is stored locally in your browser and never sent to anyone except the CVault API.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full">
              Continue
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              onClick={handleUseDemoKey}
              className="btn-secondary w-full mt-4"
            >
              Use Demo API Key
            </button>
            <p className="mt-2 text-xs text-center text-gray-500">
              For testing purposes only. Connected to localhost:3000
            </p>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Don't have an API key?
            </h3>
            <p className="text-xs text-blue-800 mb-2">
              CVault is a B2B VPN platform for businesses. To get your API key:
            </p>
            <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Sign up at cvault.io</li>
              <li>Create a tenant account</li>
              <li>Get your API key from the dashboard</li>
            </ol>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          This is a reference implementation for businesses integrating CVault.
        </p>
      </div>
    </div>
  );
}
