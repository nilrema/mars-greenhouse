import { useNavigate } from 'react-router-dom';

export default function ModuleDetail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full border border-border bg-card rounded-lg p-6 text-center">
        <div className="text-[12px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Future Stub</div>
        <h1 className="text-xl font-semibold mb-3">Detailed Greenhouse View</h1>
        <p className="text-sm text-muted-foreground leading-6 mb-5">
          The active demo currently focuses on the screenshot-style single-console overview. This route stays in the
          codebase as a placeholder for later deep-dive module detail work.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Back to Main Console
        </button>
      </div>
    </div>
  );
}
