import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl2 border border-gray-100 bg-white shadow-card ${className}`}>
      {title && (
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            {title}
          </h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  red: 'bg-red-50 text-danger ring-red-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function Badge({ color = 'gray', children }: { color?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColors[color] ?? badgeColors.gray}`}
    >
      {children}
    </span>
  );
}

export function BadgeEstado({ value }: { value: string }) {
  const colors: Record<string, string> = {
    BUENO: 'green',
    REGULAR: 'yellow',
    DANADO: 'orange',
    CRITICO: 'red',
    DISPONIBLE: 'green',
    EN_TRANSITO: 'blue',
    EN_CLIENTE: 'blue',
    EN_REPARACION: 'yellow',
    PERDIDA: 'red',
    BAJA: 'gray',
    LIBRE: 'green',
    BLOQUEADO: 'red',
    BORRADOR: 'gray',
    CONFIRMADO: 'green',
    REVERTIDO: 'red',
    ENTRADA: 'green',
    SALIDA: 'blue',
    TRASLADO: 'blue',
    DEVOLUCION: 'yellow',
    PRESTAMO: 'blue',
    DANIO: 'orange',
    REPARACION: 'yellow',
    INVENTARIO_INICIAL: 'gray',
    AJUSTE: 'gray',
    REVERSION: 'red',
    PROPIA: 'blue',
    ERCOL: 'yellow',
    TERCERO: 'gray',
  };
  return <Badge color={colors[value] ?? 'gray'}>{value.replaceAll('_', ' ')}</Badge>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const buttonVariants: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary:
    'border border-gray-200 bg-white text-ink hover:bg-gray-50 focus-visible:outline-gray-400',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:outline-danger',
  ghost: 'text-gray-600 hover:bg-gray-100 focus-visible:outline-gray-400',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl2 px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="block w-full rounded-xl2 border-0 px-3 py-2 text-sm text-ink ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="block w-full rounded-xl2 border-0 bg-white px-3 py-2 text-sm text-ink ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-brand-600"
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl2 border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
      {label}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-8 text-center text-sm text-gray-500">{message}</div>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl2 bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
