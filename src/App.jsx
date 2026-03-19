import React from 'react';
import Dashboard from './pages/Dashboard';

function App({ amplifyState = { configured: false, message: null } }) {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.logo}>Mars Greenhouse</h1>
            <p style={styles.subtitle}>Syngenta x AWS START Hack 2026 dashboard</p>
          </div>
          <div style={styles.environmentTag}>
            {amplifyState.configured ? 'Amplify Connected' : 'Mock Mode'}
          </div>
        </div>
      </header>
      {!amplifyState.configured && amplifyState.message ? (
        <div style={styles.notice}>
          <strong>Amplify backend not connected.</strong> {amplifyState.message}
        </div>
      ) : null}
      <main style={styles.main}>
        <Dashboard amplifyConfigured={amplifyState.configured} />
      </main>
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span style={styles.footerText}>
            Syngenta x AWS START Hack 2026 • Martian Greenhouse Management System
          </span>
          <span style={styles.footerStatus}>
            System Status: <span style={styles.statusOnline}>● Online</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0d1117',
    color: '#e6edf3',
  },
  header: {
    backgroundColor: '#161b22',
    borderBottom: '1px solid #30363d',
    padding: '1rem 1.5rem',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#58a6ff',
    fontWeight: '600',
  },
  subtitle: {
    margin: '0.3rem 0 0',
    color: '#8b949e',
    fontSize: '0.9rem',
  },
  environmentTag: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '999px',
    color: '#e6edf3',
    fontSize: '0.8rem',
    fontWeight: '600',
    padding: '0.45rem 0.9rem',
  },
  notice: {
    maxWidth: '1400px',
    margin: '1rem auto 0',
    backgroundColor: '#261a00',
    color: '#f2cc60',
    border: '1px solid #5e4420',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    width: 'calc(100% - 3rem)',
    boxSizing: 'border-box',
  },
  main: {
    flex: 1,
    padding: '1.5rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  footer: {
    backgroundColor: '#161b22',
    borderTop: '1px solid #30363d',
    padding: '1rem 1.5rem',
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
  footerText: {
    color: '#8b949e',
  },
  footerStatus: {
    color: '#8b949e',
  },
  statusOnline: {
    color: '#3fb950',
    fontWeight: '500',
  },
};

export default App;
