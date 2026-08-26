'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'forgot' | 'forgot-sent';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
      });

      if (resetError) throw resetError;
      setMode('forgot-sent');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot-sent') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📧</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-700">Email enviado</h1>
            <p className="text-gray-500 mt-3">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
            <button
              onClick={() => setMode('login')}
              className="mt-6 text-blue-600 hover:text-blue-700 font-semibold"
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-700">Restablecer contraseña</h1>
            <p className="text-gray-500 mt-2">Ingresa tu email para recibir el enlace</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="tu@email.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-700">Siracusa Lite</h1>
          <p className="text-gray-500 mt-2">Sistema de gestión de riego</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
