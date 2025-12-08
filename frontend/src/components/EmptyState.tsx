interface EmptyStateProps {
  icon?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = '📭', message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</p>
      <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{message}</p>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
