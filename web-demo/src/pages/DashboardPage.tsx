import { useEffect, useState } from 'react';
import { useCVault } from '../context/CVaultContext';
import type { Device, ServerStatusResponse } from '@cvault/sdk-js';

export default function DashboardPage() {
  const { cvault, user, logout, devices, setDevices, sessions, setSessions } = useCVault();
  const [loading, setLoading] = useState(true);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);
  const [error, setError] = useState('');

  // Load initial data
  useEffect(() => {
    loadData();
    // Refresh data every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [cvault]);

  const loadData = async () => {
    if (!cvault) return;

    try {
      // Load devices
      const devicesResult = await cvault.devices.list();
      setDevices(devicesResult.devices);

      // Load VPN status
      try {
        const statusResult = await cvault.vpn.status();
        setSessions(statusResult.sessions);
      } catch {
        setSessions([]);
      }

      // Load server status
      try {
        const serverResult = await cvault.vpn.serverStatus();
        setServerStatus(serverResult);
      } catch {
        setServerStatus(null);
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvault || !deviceName.trim()) return;

    setRegisteringDevice(true);
    setError('');

    try {
      const device = await cvault.devices.register({
        deviceName: deviceName.trim(),
        deviceType: 'Web',
      });

      setDevices([...devices, device]);
      setDeviceName('');
      setShowRegisterForm(false);
      setSelectedDevice(device);
    } catch (err: any) {
      setError(err.message || 'Failed to register device');
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleConnect = async (deviceId: string) => {
    if (!cvault) return;

    try {
      await cvault.vpn.connect({ deviceId });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    if (!cvault) return;

    try {
      await cvault.vpn.disconnect(deviceId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const handleDownloadConfig = (device: Device) => {
    const blob = new Blob([device.config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${device.deviceName.replace(/\s+/g, '_')}.conf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceSession = (deviceId: string) => {
    return sessions.find(s => s.device.id === deviceId && s.status === 'ACTIVE');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">CVault Dashboard</h1>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="btn-secondary text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Server Peers</p>
                <p className="text-2xl font-bold text-gray-900">{serverStatus?.server.peerCount ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Section */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">My Devices</h2>
            <button
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="btn-primary text-sm"
            >
              {showRegisterForm ? 'Cancel' : '+ Add Device'}
            </button>
          </div>

          {/* Register Device Form */}
          {showRegisterForm && (
            <form onSubmit={handleRegisterDevice} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Device name (e.g., My Laptop)"
                  className="input flex-1"
                  required
                  disabled={registeringDevice}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={registeringDevice}
                >
                  {registeringDevice ? 'Creating...' : 'Register'}
                </button>
              </div>
            </form>
          )}

          {/* Devices List */}
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mb-4">No devices registered yet</p>
              <button
                onClick={() => setShowRegisterForm(true)}
                className="btn-primary"
              >
                Register Your First Device
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const session = getDeviceSession(device.id);
                const isConnected = !!session;

                return (
                  <div
                    key={device.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{device.deviceName}</h3>
                          {isConnected ? (
                            <span className="badge-success">Connected</span>
                          ) : (
                            <span className="badge bg-gray-100 text-gray-600">Disconnected</span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="font-mono">IP: {device.assignedIp}</p>
                          <p>Server: {device.server.region} ({device.server.publicIp})</p>
                          {isConnected && (
                            <p className="text-green-600">
                              Connected since: {new Date(session.connectedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(device.id)}
                            className="btn-danger text-sm"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(device.id)}
                            className="btn-primary text-sm"
                          >
                            Connect
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDevice(device)}
                          className="btn-secondary text-sm"
                        >
                          Config
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Config Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    WireGuard Configuration
                  </h3>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">{selectedDevice.deviceName}</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuration File
                  </label>
                  <pre className="p-4 bg-gray-50 rounded-lg text-xs font-mono overflow-x-auto border border-gray-200">
                    {selectedDevice.config}
                  </pre>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadConfig(selectedDevice)}
                    className="btn-primary flex-1"
                  >
                    Download Config
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDevice.config);
                      alert('Config copied to clipboard!');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    How to use this config:
                  </h4>
                  <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Download the configuration file</li>
                    <li>Install WireGuard on your device</li>
                    <li>Import the configuration file</li>
                    <li>Connect to the VPN</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
