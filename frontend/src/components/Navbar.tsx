import React from 'react';
import { Flame, LogOut, Sparkles, BookOpen, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="w-full bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1F1F1F] sticky top-0 z-50 px-3 sm:px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-0">
        {/* Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 group cursor-pointer text-left min-w-0 shrink"
        >
          <div className="relative flex items-center justify-center">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[#FF4400] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 drop-shadow-[0_0_10px_rgba(255,68,0,0.6)]" />
          </div>
          <span className="font-bebas text-lg sm:text-2xl md:text-3xl tracking-wide sm:tracking-wider text-white font-bold transition-colors group-hover:text-[#FF4400] truncate">
            ROAST<span className="text-[#FF4400]">MY</span>RESUME
          </span>
        </button>

        {/* Right Nav Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-4 md:gap-6 shrink-0">
          {currentPage !== 'landing' && (
            <>
              <button
                onClick={() => onNavigate('roast')}
                className={`font-bebas tracking-wider text-lg px-1.5 sm:px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentPage === 'roast' ? 'text-[#FF4400]' : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#FF4400] shrink-0" />
                <span className="hidden sm:inline">NEW ROAST</span>
              </button>

              <button
                onClick={() => onNavigate('history')}
                className={`font-bebas tracking-wider text-lg px-1.5 sm:px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentPage === 'history' ? 'text-[#FF4400]' : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#FF4400] shrink-0" />
                <span className="hidden sm:inline">HISTORY</span>
              </button>
            </>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <span className="hidden md:inline-block text-xs font-mono uppercase bg-[#181818] border border-[#2B2B2B] px-3 py-1.5 rounded text-[#B0B0B0] truncate max-w-[10rem]">
                {user?.name}
              </span>
              <button
                onClick={() => {
                  logout();
                  onNavigate('landing');
                }}
                className="font-bebas tracking-wider text-lg text-[#A0A0A0] hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">LOG OUT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
              <button
                onClick={() => onNavigate('login')}
                className="font-bebas tracking-wider text-lg md:text-xl text-[#B5B5B5] hover:text-white transition-colors cursor-pointer"
              >
                LOG IN
              </button>

              <button
                onClick={() => onNavigate('roast')}
                className="font-bebas tracking-wider text-lg md:text-xl bg-[#FF4400] hover:bg-[#E63D00] text-white px-3 sm:px-5 py-2 whitespace-nowrap rounded-sm transition-all duration-200 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,68,0,0.35)] cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 fill-white shrink-0" />
                <span className="hidden sm:inline">GET ROASTED</span>
                <span className="sm:hidden">ROAST</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
