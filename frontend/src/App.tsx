import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoastPage } from './pages/RoastPage';
import { HistoryPage } from './pages/HistoryPage';
import type { RoastResult } from './types';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [selectedRoast, setSelectedRoast] = useState<RoastResult | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRoastFromHistory = (roast: RoastResult) => {
    setSelectedRoast(roast);
    setCurrentPage('roast');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
