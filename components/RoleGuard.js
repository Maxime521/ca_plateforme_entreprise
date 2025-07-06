import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { canAccessFeature } from '../utils/rolePermissions';

export default function RoleGuard({ children, requiredRole, requiredFeature, fallbackPath = '/' }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Check role requirement
      if (requiredRole && userRole !== requiredRole) {
        router.push(fallbackPath);
        return;
      }

      // Check feature requirement
      if (requiredFeature && !canAccessFeature(userRole, requiredFeature)) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [user, userRole, loading, router, requiredRole, requiredFeature, fallbackPath]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-bg dark:to-dark-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authorized
  if (user && requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-bg dark:to-dark-surface">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Accès restreint
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cette page nécessite des privilèges administrateur
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Show access denied for feature restriction
  if (user && requiredFeature && !canAccessFeature(userRole, requiredFeature)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-bg dark:to-dark-surface">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⛔</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Fonctionnalité non disponible
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cette fonctionnalité n&apos;est pas disponible pour votre niveau d&apos;accès
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  return children;
}
