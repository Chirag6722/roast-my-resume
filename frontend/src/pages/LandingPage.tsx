import React from 'react';
import { LiveGrill } from '../components/LiveGrill';
import { MarqueeTicker } from '../components/MarqueeTicker';
import { StepCards } from '../components/StepCards';
import { SampleVerdict } from '../components/SampleVerdict';

interface LandingPageProps {
  onStartRoast: () => void;
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRoast, onLoginClick }) => {
  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & CTA */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Tagline */}
            <div className="inline-block">
              <span className="font-mono text-xs md:text-sm tracking-widest text-[#FF4400] font-bold uppercase">
                BRUTALLY HONEST RESUME FEEDBACK
              </span>
            </div>

            {/* Massive Display Title */}
            <h1 className="font-bebas text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white font-bold leading-[0.88] tracking-tight">
              YOUR RESUME<br />
              IS ABOUT TO<br />
              <span className="text-[#FF4400] glow-ember">CATCH FIRE.</span>
            </h1>

            {/* Subtext */}
            <p className="text-[#A5A5A5] text-base md:text-lg max-w-xl leading-relaxed pt-2">
              Upload it. We roast it (mild to nuclear), score it against the robots that reject you,
              tell you exactly what to fix section by section, and hand back a rewritten version that
              doesn&apos;t suck.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={onStartRoast}
                className="bg-[#FF4400] hover:bg-[#E63D00] text-white px-8 py-4 rounded-sm font-bebas text-2xl md:text-3xl tracking-wider transition-all duration-200 transform hover:scale-[1.02] shadow-[0_0_30px_rgba(255,68,0,0.4)] cursor-pointer flex items-center gap-2"
              >
                ROAST MY RESUME
              </button>

              <button
                onClick={onLoginClick}
                className="bg-[#121212] hover:bg-[#1C1C1C] border border-[#2B2B2B] hover:border-[#444444] text-[#D0D0D0] hover:text-white px-6 py-4 rounded-sm font-bebas text-xl md:text-2xl tracking-wider transition-all duration-200 cursor-pointer"
              >
                I ALREADY HAVE AN ACCOUNT
              </button>
            </div>
          </div>

          {/* Right Column: Live From The Grill */}
          <div className="lg:col-span-5">
            <LiveGrill onStartRoast={onStartRoast} />
          </div>
        </div>
      </section>

      {/* Marquee Ticker */}
      <MarqueeTicker />

      {/* How The Burn Works */}
      <StepCards />

      {/* The Roast is Free / Sample Verdict */}
      <SampleVerdict onStartRoast={onStartRoast} />

      {/* Footer */}
      <footer className="w-full border-t border-[#1C1C1C] py-12 px-6 text-center mt-auto bg-[#070707]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[#777777] font-mono text-xs">
          <div>
            ROASTMYRESUME — FEEDBACK SO HONEST IT HURTS.
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onStartRoast} className="hover:text-[#FF4400] transition-colors">
              ROAST
            </button>
            <button onClick={onLoginClick} className="hover:text-[#FF4400] transition-colors">
              LOG IN
            </button>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
