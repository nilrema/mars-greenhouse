import React from 'react';
import MarsOverview from './pages/MarsOverview';
import GreenhouseDetail from './pages/GreenhouseDetail';
import { APP_VIEWS } from './lib/appViews';
import { greenhouseModules } from './lib/greenhouseModules';
import {
  createInitialNavigationState,
  openGreenhouseDetail,
  returnToMarsOverview,
} from './lib/navigationState';

function App({
  amplifyState = { configured: false, message: null },
  initialView = APP_VIEWS.MARS_OVERVIEW,
}) {
  const [navigationState, setNavigationState] = React.useState(() =>
    createInitialNavigationState(initialView)
  );
  const { currentView, selectedModuleId, detailContext } = navigationState;

  const selectedModule =
    greenhouseModules.find((module) => module.id === selectedModuleId) ?? greenhouseModules[0];

  function handleOpenGreenhouseDetail(moduleId, context = {}) {
    setNavigationState((previous) => openGreenhouseDetail(previous, moduleId, context));
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.logo}>Mars Greenhouse</h1>
            <p style={styles.subtitle}>Syngenta x AWS START Hack 2026 command center</p>
          </div>
          <div style={styles.headerActions}>
            <nav aria-label="Primary views" style={styles.viewTabs}>
              <button
                type="button"
                onClick={() =>
                  setNavigationState((previous) => returnToMarsOverview(previous))
                }
                style={{
                  ...styles.viewTab,
                  ...(currentView === APP_VIEWS.MARS_OVERVIEW ? styles.viewTabActive : null),
                }}
              >
                Mars Overview
              </button>
              <button
                type="button"
                onClick={() => handleOpenGreenhouseDetail(selectedModule.id)}
                style={{
                  ...styles.viewTab,
                  ...(currentView === APP_VIEWS.GREENHOUSE_DETAIL ? styles.viewTabActive : null),
                }}
              >
                Greenhouse Detail
              </button>
            </nav>
            <div style={styles.environmentTag}>
              {amplifyState.configured ? 'Amplify Connected' : 'Mock Mode'}
            </div>
          </div>
        </div>
      </header>
      {!amplifyState.configured && amplifyState.message ? (
        <div style={styles.notice}>
          <strong>Amplify backend not connected.</strong> {amplifyState.message}
        </div>
      ) : null}
      <main style={styles.main}>
        {currentView === APP_VIEWS.GREENHOUSE_DETAIL ? (
          <GreenhouseDetail
            module={selectedModule}
            crops={detailContext.crops}
            agentEventCount={detailContext.agentEventCount}
            onBackToOverview={() =>
              setNavigationState((previous) => returnToMarsOverview(previous))
            }
          />
        ) : (
          <MarsOverview
            amplifyConfigured={amplifyState.configured}
            selectedModuleId={selectedModule.id}
            onSelectModule={(moduleId) =>
              setNavigationState((previous) => ({
                ...previous,
                selectedModuleId: moduleId,
              }))
            }
            onOpenGreenhouseDetail={(moduleId, context) =>
              handleOpenGreenhouseDetail(moduleId, context)
            }
          />
        )}
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
    flexWrap: 'wrap',
    gap: '0.75rem',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  viewTabs: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewTab: {
    border: '1px solid #30363d',
    backgroundColor: '#0d1117',
    color: '#8b949e',
    borderRadius: '999px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  viewTabActive: {
    color: '#f0f6fc',
    borderColor: '#58a6ff',
    boxShadow: '0 0 0 1px rgba(88, 166, 255, 0.22)',
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
