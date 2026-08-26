'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Error desconocido';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error de autenticación</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
