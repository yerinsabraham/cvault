import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import CVault from '@cvault/sdk-js';
import type { User, Device, VPNSession } from '@cvault/sdk-js';

interface CVaultContextType {
  cvault: CVault | null;
  apiKey: string;
  setApiKey: (key: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  devices: Device[];
  setDevices: (devices: Device[]) => void;
  sessions: VPNSession[];
  setSessions: (sessions: VPNSession[]) => void;
  logout: () => void;
}

const CVaultContext = createContext<CVaultContextType | undefined>(undefined);

export function CVaultProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem('cvault_api_key') || '';
  });
  
  const [cvault, setCVault] = useState<CVault | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('cvault_user');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<VPNSession[]>([]);

  // Initialize SDK when API key is set
  useEffect(() => {
    if (apiKey) {
      const sdk = new CVault({
        apiKey,
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      // Restore token if available
      const token = localStorage.getItem('cvault_token');
      if (token) {
        sdk.auth.setAccessToken(token);
      }

      setCVault(sdk);
      localStorage.setItem('cvault_api_key', apiKey);
    } else {
      setCVault(null);
    }
  }, [apiKey]);

  // Save user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('cvault_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cvault_user');
    }
  }, [user]);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
  };

  const logout = () => {
    if (cvault) {
      cvault.auth.logout();
    }
    setUser(null);
    setDevices([]);
    setSessions([]);
    localStorage.removeItem('cvault_token');
    localStorage.removeItem('cvault_user');
  };

  const isAuthenticated = !!user && (cvault?.auth.isAuthenticated() ?? false);

  return (
    <CVaultContext.Provider
      value={{
        cvault,
        apiKey,
        setApiKey,
        user,
        setUser,
        isAuthenticated,
        devices,
        setDevices,
        sessions,
        setSessions,
        logout,
      }}
    >
      {children}
    </CVaultContext.Provider>
  );
}

export function useCVault() {
  const context = useContext(CVaultContext);
  if (context === undefined) {
    throw new Error('useCVault must be used within a CVaultProvider');
  }
  return context;
}
