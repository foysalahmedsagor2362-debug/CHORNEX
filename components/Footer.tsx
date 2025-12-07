import React from 'react';
import { GroundingSource } from '../types';
import { Link2 } from 'lucide-react';

interface FooterProps {
  sources: GroundingSource[];
}

export const Footer: React.FC<FooterProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <footer className="mt-16 py-12 border-t border-void-border bg-black">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          
          {/* Brand Mark */}
          <div className="max-w-xs">
            <h4 className="text-sm font-bold text-white mb-2">CHORNEX.AI</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Automated intelligence engine synthesizing global events into concise briefings. Powered by Google Gemini 2.5 Flash.
            </p>
          </div>

          {/* Sources Grid */}
          <div className="flex-1">
            <h5 className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Link2 size={12} />
              Verified Sources
            </h5>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-white hover:bg-void-border bg-void-highlight px-3 py-1.5 rounded-md border border-void-border transition-all truncate max-w-[250px]"
                >
                  {source.title || new URL(source.uri).hostname.replace('www.', '')}
                </a>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-void-border text-center">
          <p className="text-[10px] text-gray-700 font-mono">
            SYSTEM ID: CHORNEX-V2 • LATENCY: LOW • ENCRYPTION: TLS 1.3
          </p>
        </div>
      </div>
    </footer>
  );
};