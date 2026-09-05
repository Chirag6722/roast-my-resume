import React from 'react';
import { FileText, Flame, Gauge, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: FileText,
    title: 'DROP THE FILE',
    // The uploader accepts these three and refuses legacy .doc, so say so here.
    description: 'PDF, DOCX or TXT, or just paste the text. We read every sad bullet point.',
  },
  {
    icon: Flame,
    title: 'PICK YOUR PAIN',
    description: 'Mild, Medium or Nuclear. Choose wisely.',
  },
  {
    icon: Gauge,
    title: 'GET SCORED',
    description: 'ATS score out of 100, the flaws we found, and the keywords you forgot.',
  },
  {
    icon: Sparkles,
    title: 'GET REWRITTEN',
    description: 'Your own bullets rebuilt as achievements, ready to send.',
  },
];

export const StepCards: React.FC = () => {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl tracking-wide text-white mb-12 text-left">
        HOW THE BURN WORKS
      </h2>

      {/* An ordered list, because these are four steps in sequence and the order
          is part of the meaning. */}
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none p-0 m-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              /* Hover is pure CSS now. The old version tracked it in React state,
                 which did nothing for keyboard or touch users, and the cards
                 carried a pointer cursor despite not being clickable. */
              className="p-7 rounded-sm min-h-[220px] flex flex-col justify-between relative group
                         bg-[#121212] border border-[#242424]
                         transition-all duration-300
                         hover:bg-[#141414] hover:border-[#FF4400] hover:-translate-y-1
                         hover:shadow-[0_0_30px_rgba(255,68,0,0.25)]"
            >
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <Icon className="w-7 h-7 text-[#888888] group-hover:text-[#FF4400] transition-colors duration-300" />
                  <span
                    aria-hidden="true"
                    className="font-bebas text-3xl leading-none text-[#2A2A2A] group-hover:text-[#FF4400]/40 transition-colors duration-300"
                  >
                    {idx + 1}
                  </span>
                </div>

                <h3 className="font-bebas text-2xl md:text-3xl tracking-wider text-white mb-3">
                  {step.title}
                </h3>
              </div>

              <p className="font-mono text-xs md:text-sm text-[#A0A0A0] leading-relaxed">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
