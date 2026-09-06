import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoastPage } from './pages/RoastPage';
import { HistoryPage } from './pages/HistoryPage';
import type { RoastResult } from './types';
import { isUnknownPath, pageFromPath, pathForPage, type Page } from './routes';

export const AppContent: React.FC = () => {
  // The URL is the source of truth for which screen is showing, so back,
  // forward, refresh and shared links all behave the way people expect.
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [selectedRoast, setSelectedRoast] = useState<RoastResult | null>(null);

  // An address nobody recognises should read as the landing page rather than
  // leaving a bogus path in the bar.
  useEffect(() => {
    if (isUnknownPath(window.location.pathname)) {
      window.history.replaceState({}, '', pathForPage('landing'));
    }
  }, []);

  // Back and forward move between screens instead of leaving the site.
  useEffect(() => {
    const onPopState = () => setCurrentPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goTo = useCallback((page: Page, { replace = false } = {}) => {
    const path = pathForPage(page);
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path);
      else window.history.pushState({}, '', path);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigate = useCallback((page: string) => goTo(page as Page), [goTo]);

  const handleSelectRoastFromHistory = useCallback((roast: RoastResult) => {
    setSelectedRoast(roast);
    goTo('roast');
  }, [goTo]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] flex flex-col font-sans selection:bg-[#FF4400] selection:text-white">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="flex-1 w-full">
        {currentPage === 'landing' && (
          <LandingPage
            onStartRoast={() => handleNavigate('roast')}
            onLoginClick={() => handleNavigate('login')}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'roast' && (
          <RoastPage
            initialRoastResult={selectedRoast}
            onViewHistory={() => handleNavigate('history')}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            onNavigate={handleNavigate}
            onSelectRoast={handleSelectRoastFromHistory}
          />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
