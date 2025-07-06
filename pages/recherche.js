import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Recherche() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page which has the main search functionality
    router.replace('/');
  }, [router]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection vers la page de recherche...</p>
        </div>
      </div>
    </Layout>
  );
}