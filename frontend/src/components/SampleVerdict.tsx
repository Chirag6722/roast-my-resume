import React from 'react';
import { Share2 } from 'lucide-react';

interface SampleVerdictProps {
  onStartRoast: () => void;
}

export const SampleVerdict: React.FC<SampleVerdictProps> = ({ onStartRoast }) => {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto border-t border-[#1C1C1C]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column */}
        <div className="lg:col-span-7 text-left space-y-6">
          <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wide text-white leading-[0.95]">
            THE ROAST IS FREE.<br />
            THE EGO DAMAGE IS <span className="text-[#FF4400] glow-ember">PERMANENT.</span>
          </h2>

          <p className="text-[#A0A0A0] text-base md:text-lg max-w-xl leading-relaxed">
            Every roast comes with a shareable card built for your timeline. Post the burn, keep the rewrite.
          </p>

          <div className="pt-2">
            <button
              onClick={onStartRoast}
              className="inline-flex items-center gap-3 bg-transparent hover:bg-[#FF4400]/10 border-2 border-[#FF4400] text-white px-8 py-3.5 rounded-sm font-bebas text-xl md:text-2xl tracking-wider transition-all duration-200 cursor-pointer group shadow-[0_0_20px_rgba(255,68,0,0.2)] hover:shadow-[0_0_30px_rgba(255,68,0,0.4)]"
            >
              <Share2 className="w-5 h-5 text-[#FF4400] group-hover:rotate-12 transition-transform" />
              START THE FIRE
            </button>
          </div>
        </div>

        {/* Right column - Sample Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#121212] border border-[#262626] p-8 md:p-10 rounded-sm shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-[#FF4400]/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4400]/10 rounded-full blur-3xl pointer-events-none" />

            <span className="font-mono text-xs tracking-widest text-[#777777] font-semibold uppercase block mb-6">
              SAMPLE VERDICT
            </span>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="font-bebas text-7xl md:text-8xl text-[#FF4400] font-bold leading-none tracking-tight">
                42
              </span>
              <span className="font-bebas text-3xl md:text-4xl text-[#666666] tracking-tight">
                /100
              </span>
            </div>

            <div className="border-t border-[#222222] pt-6">
              <p className="font-mono text-sm md:text-base text-[#D0D0D0] italic leading-relaxed">
                &ldquo;An ATS read this and quietly closed the tab.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
