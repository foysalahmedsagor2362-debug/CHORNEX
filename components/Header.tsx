import React from 'react';
import { Language } from '../types';
import { Zap, Clock, Activity, Globe } from 'lucide-react';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  isUpdating: boolean;
  lastUpdated: string | null;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  language, 
  setLanguage, 
  isUpdating, 
  lastUpdated,
  refreshInterval,
  setRefreshInterval
}) => {
  return (
    <header className="sticky top-0 z-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-void-card/80 backdrop-blur-xl border border-void-border rounded-2xl shadow-2xl shadow-black/50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative flex items-center justify-center w-10 h-10 bg-black rounded-lg border border-void-border">
                <Zap className="text-white w-5 h-5" fill="currentColor" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                CHORNEX<span className="text-blue-500">.AI</span>
              </h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                Realtime Intelligence
              </p>
            </div>
          </div>

          {/* Center Status (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2 text-gray-400">
              <Activity size={14} className={isUpdating ? "text-blue-500 animate-pulse" : "text-emerald-500"} />
              <span className={isUpdating ? "text-blue-400" : "text-gray-300"}>
                {isUpdating ? 'SYNCING DATA STREAM...' : 'SYSTEM OPERATIONAL'}
              </span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-gray-500 border-l border-void-border pl-6">
                <Clock size={14} />
                <span>UPDATED: {lastUpdated.split(' ')[1]} UTC</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Refresh Rate */}
            <div className="hidden sm:flex items-center bg-void-highlight rounded-lg px-3 py-1.5 border border-void-border">
              <span className="text-[10px] text-gray-500 font-mono mr-2">FREQ</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-medium text-gray-200 focus:outline-none cursor-pointer [&>option]:bg-void-card"
              >
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            </div>

            {/* Language Switcher */}
            <div className="flex bg-void-highlight p-1 rounded-lg border border-void-border">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  language === 'bn'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                BN
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};