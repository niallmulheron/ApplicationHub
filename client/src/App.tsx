import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.tsx';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Applications } from './pages/Applications.tsx';
import { Companies } from './pages/Companies.tsx';
import { Contacts } from './pages/Contacts.tsx';
import { Analytics } from './pages/Analytics.tsx';
import { Profile } from './pages/Profile.tsx';
import { Board } from './pages/Board.tsx';
import { Login } from './pages/Login.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="board" element={<Board />} />
        <Route path="companies" element={<Companies />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
