import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorAlert, Field, Input } from '../components/ui';

export default function Login() {
  const { login, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-700">EstibaX</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control integral de activos retornables
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <ErrorAlert message={error} />
          <div className="space-y-4">
            <Field label="Correo electrónico">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                autoComplete="email"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </Field>
          </div>
          <Button type="submit" disabled={cargando} className="mt-6 w-full">
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Acceso restringido · Toda operación queda auditada
        </p>
      </div>
    </div>
  );
}
