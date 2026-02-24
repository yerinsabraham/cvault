import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CVaultProvider, useCVault } from './context/CVaultContext';
import ConfigPage from './pages/ConfigPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, apiKey } = useCVault();
  
  if (!apiKey) {
    return <Navigate to="/config" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, apiKey } = useCVault();
  
  if (!apiKey) {
    return <>{children}</>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/config"
        element={
          <PublicRoute>
            <ConfigPage />
          </PublicRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/config" replace />} />
      <Route path="*" element={<Navigate to="/config" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CVaultProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </CVaultProvider>
    </BrowserRouter>
  );
}

export default App;
