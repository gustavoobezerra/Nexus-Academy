import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isTokenExpired } from '../utils/security';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'teacher' | 'student' | 'parent';
  redirectTo?: string;
}

/**
 * Componente para proteger rotas que requerem autenticação
 *
 * Uso:
 * <ProtectedRoute requiredRole="teacher">
 *   <TeacherDashboard />
 * </ProtectedRoute>
 */
export const ProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = '/'
}: ProtectedRouteProps) => {
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();

  // Verificar se está autenticado
  if (!isAuthenticated || !token) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar se o token expirou
  if (isTokenExpired(token)) {
    logout();
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar role se especificado
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * Componente para proteger rotas do portal do aluno
 */
export const StudentProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const studentToken = localStorage.getItem('studentToken');

  if (!studentToken) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  // Verificar se o token expirou
  if (isTokenExpired(studentToken)) {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Componente para página não autorizada
 */
export const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-white mb-4">Acesso Negado</h1>
        <p className="text-slate-400 mb-8">
          Você não tem permissão para acessar esta página.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
        >
          Voltar ao Início
        </a>
      </div>
    </div>
  );
};

export default ProtectedRoute;
