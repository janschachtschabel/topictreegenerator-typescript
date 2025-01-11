import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Trim whitespace from inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    // Validiere E-Mail und Passwort
    if (!trimmedEmail || !trimmedPassword) {
      setError('Bitte füllen Sie alle Felder aus');
      setLoading(false);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      setLoading(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein');
      setLoading(false);
      return;
    }

    try {
      // Clear any existing sessions first
      await supabase.auth.signOut();

      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.');
          } else {
            throw error;
          }
        } else if (data.user) {
          // Erfolgreiche Registrierung
          setMode('login');
          setError('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword
        });
        
        if (error) {
          if (error.message.includes('Ungültige Anmeldedaten') || 
              error.message.includes('Invalid login credentials') ||
              error.message.includes('Email not found')) {
            setError(
              <span>
                Kein Konto mit dieser E-Mail-Adresse gefunden.{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                >
                  Jetzt registrieren
                </button>
              </span>
            );
          } else if (error.message.includes('Email not confirmed')) {
            setError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse');
          } else if (error.message.includes('network')) {
            setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
          } else {
            setError(`Anmeldefehler: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? 'Willkommen zurück!' : 'Konto erstellen'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'login' ? 'Noch kein Konto?' : 'Bereits registriert?'}{' '}
            <button
              onClick={handleModeSwitch}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {mode === 'login' ? 'Registrieren' : 'Anmelden'}
            </button>
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                E-Mail-Adresse
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="E-Mail-Adresse"
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Passwort"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="text-sm text-gray-600 hover:text-gray-800">
                  {showPassword ? 'Verbergen' : 'Anzeigen'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  <span>Einen Moment...</span>
                </div>
              ) : (
                mode === 'login' ? 'Anmelden' : 'Registrieren'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}