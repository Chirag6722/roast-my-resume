import React from 'react';

const TICKER_ITEMS = [
  '"TEAM PLAYER" IS NOT A PERSONALITY.',
  'YOUR SUMMARY SAYS NOTHING IN 74 WORDS.',
  '"RESULTS-DRIVEN PROFESSIONAL" — DRIVEN WHERE, EXACTLY?',
  'YOUR SKILLS SECTION LISTS MICROSOFT WORD. IN 2026.',
  'THREE PAGES. ZERO NUMBERS. BOLD CHOICE.',
  'AN ATS READ THIS AND QUIETLY CLOSED THE TAB.',
  '"RESPONSIBLE FOR COLLABORATING" IS NOT A SKILL.'
];

export const MarqueeTicker: React.FC = () => {
  return (
    <div className="w-full bg-[#FF4400] overflow-hidden py-3 text-black select-none border-y border-[#FF6A00] relative shadow-[0_0_25px_rgba(255,68,0,0.4)]">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Repeat list twice for seamless infinite scroll */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={idx} className="flex items-center mx-4 font-mono font-bold text-xs md:text-sm tracking-wider">
            <span>{item}</span>
            <span className="ml-8 text-black/60 font-mono text-sm">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};
