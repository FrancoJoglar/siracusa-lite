'use client';

import { useState, useEffect } from 'react';
import { Calendario } from '@/components/Calendario';
import { Login } from '@/components/Login';
import { Solicitudes } from '@/components/Solicitudes';
import { Recetas } from '@/components/Recetas';

export default function Home() {
  const [view, setView] = useState('calendario');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') || 'calendario';
    setView(hash);

    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'calendario';
      setView(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const navigateTo = (newView: string) => {
    window.location.hash = newView;
  };

  const showToast = (msg: string) => {
    setToast(msg);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Login onLogin={() => setIsLoggedIn(true)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {view === 'calendario' && <Calendario navigateTo={navigateTo} />}
      {view === 'solicitudes' && <Solicitudes onToast={showToast} />}
      {view === 'recetas' && <Recetas onToast={showToast} />}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
