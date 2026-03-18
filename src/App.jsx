import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Dashboard from './pages/Dashboard';

// Configure Amplify (this will be replaced with actual config from amplify/backend.ts)
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: 'https://your-graphql-endpoint.appsync-api.us-east-2.amazonaws.com/graphql',
      region: 'us-east-2',
      defaultAuthMode: 'apiKey',
      apiKey: 'your-api-key'
    }
  }
});

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={styles.app}>
          <header style={styles.header}>
            <div style={styles.headerContent}>
              <h1 style={styles.logo}>Mars Greenhouse</h1>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user?.username || 'Operator'}</span>
                <button onClick={signOut} style={styles.signOutButton}>
                  Sign Out
                </button>
              </div>
            </div>
          </header>
          <main style={styles.main}>
            <Dashboard />
          </main>
          <footer style={styles.footer}>
            <div style={styles.footerContent}>
              <span style={styles.footerText}>
                Syngenta × AWS START Hack 2026 • Martian Greenhouse Management System
              </span>
              <span style={styles.footerStatus}>
                System Status: <span style={styles.statusOnline}>● Online</span>
              </span>
            </div>
          </footer>
        </div>
      )}
    </Authenticator>
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
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    color: '#8b949e',
    fontSize: '0.9rem',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    color: '#f85149',
    border: '1px solid #f85149',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
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