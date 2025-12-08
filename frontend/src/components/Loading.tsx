interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'Carregando...' }: LoadingProps) {
  return (
    <div className="loading">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>{message}</p>
      </div>
    </div>
  );
}
