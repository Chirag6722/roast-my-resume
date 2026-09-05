import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register, continueAsGuest } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check the server's own rules here so the answer is instant, rather than
    // waiting for a round trip to say the password is one character short.
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill out all fields.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Your name needs at least 2 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Your password needs at least 6 characters.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      onNavigate('roast');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <h1 className="font-bebas text-6xl sm:text-7xl md:text-8xl text-white font-bold leading-[0.9] tracking-tight">
            SIGN UP.<br />
            GET <span className="text-[#FF4400] glow-ember">TORCHED.</span>
          </h1>

          <p className="text-[#A5A5A5] text-base md:text-lg max-w-md leading-relaxed">
            Free account. Unlimited roasts. Every rewrite and ATS score saved to your history.
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                continueAsGuest();
                onNavigate('roast');
              }}
              className="font-mono text-xs text-[#777777] hover:text-[#FF4400] transition-colors underline cursor-pointer"
            >
              Or skip and continue as guest →
            </button>
          </div>
        </div>

        {/* Right column - Create Account Box */}
        <div className="lg:col-span-6">
          <div className="bg-[#121212] border border-[#262626] p-8 md:p-10 rounded-sm shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <span className="font-mono text-xs tracking-widest text-[#777777] font-semibold uppercase block mb-8">
              CREATE ACCOUNT
            </span>

            {error && (
              <div role="alert" className="mb-6 bg-red-500/10 border border-red-500/30 p-3 rounded-sm flex items-start gap-2 text-red-400 font-mono text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-[#888888] block mb-2 font-medium">
                  NAME
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your Name"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#FF4400] px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-[#888888] block mb-2 font-medium">
                  EMAIL
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#FF4400] px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-[#888888] font-medium">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="font-mono text-[10px] uppercase tracking-wider text-[#777777] hover:text-[#FF4400] transition-colors cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#FF4400] px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#FF4400] hover:bg-[#E63D00] text-white py-3.5 rounded-sm font-bebas text-2xl tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(255,68,0,0.3)] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#1F1F1F] text-center">
              <p className="font-mono text-xs text-[#777777]">
                Already roasted?{' '}
                <button
                  onClick={() => onNavigate('login')}
                  className="text-[#FF4400] hover:underline font-semibold cursor-pointer ml-1"
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
