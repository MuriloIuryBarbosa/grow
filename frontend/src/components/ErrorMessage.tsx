interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error">
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
      <h3 style={{ marginBottom: '0.5rem' }}>Erro</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-primary mt-2" onClick={onRetry}>
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
