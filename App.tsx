import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { NewsCard } from './components/NewsCard';
import { Footer } from './components/Footer';
import { fetchNewsUpdates } from './services/geminiService';
import { AppState, Language, NewsHighlight } from './types';
import { WifiOff, RefreshCw, Layers, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  // Increase default refresh to 5 minutes to prevent 429 quota exhaustion
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); 
  const [state, setState] = useState<AppState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    sources: []
  });

  const previousHighlightsRef = useRef<NewsHighlight[]>([]);

  const loadNews = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
        setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      if (isAutoRefresh) await new Promise(r => setTimeout(r, 1000));
      
      const { data, sources } = await fetchNewsUpdates(language, previousHighlightsRef.current);
      
      setState(prev => {
        // If status is NO NEW UPDATE or QUOTA_EXCEEDED, keep old data but update meta if needed
        let newData = data;
        
        if (data.status === 'NO NEW UPDATE' && prev.data) {
             newData = { ...prev.data, generated_at: data.generated_at, status: data.status };
        } else if (data.status === 'QUOTA_EXCEEDED') {
             // If we got quota exceeded, we are displaying cached data.
             // We can use the cached data returned from service.
             newData = data;
        }

        // Only update reference highlights if we actually got a fresh OK response
        if (data.status === 'OK') {
            previousHighlightsRef.current = data.highlights;
        }

        return {
          data: newData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          sources: sources.length > 0 ? sources : prev.sources,
        };
      });
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || "Connection lost. The neural feed is temporarily unavailable.",
      }));
    }
  }, [language]);

  useEffect(() => {
    loadNews(); 
    const intervalId = setInterval(() => loadNews(true), refreshInterval);
    return () => clearInterval(intervalId);
  }, [loadNews, refreshInterval]);

  const handleLanguageChange = (lang: Language) => {
    if (lang !== language) {
      setLanguage(lang);
    }
  };

  // Date formatter for hero section
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <Header 
        language={language} 
        setLanguage={handleLanguageChange}
        isUpdating={state.loading && state.data !== null}
        lastUpdated={state.data?.generated_at || null}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
      />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8">
        
        {/* Hero / Date Header */}
        <div className="mb-10 mt-4 border-b border-void-border pb-6 flex items-end justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">Global Briefing</h2>
            <p className="text-gray-500 font-mono text-sm">{today} • EDITION</p>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
             {state.data && state.data.status === 'NO NEW UPDATE' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-void-card border border-void-border rounded text-xs text-gray-500">
                   <Layers size={12} />
                   CACHED VIEW
                </div>
             )}
             {state.data && state.data.status === 'QUOTA_EXCEEDED' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-500">
                   <AlertTriangle size={12} />
                   HIGH TRAFFIC: SERVING ARCHIVE
                </div>
             )}
          </div>
        </div>

        {/* Error State */}
        {state.error && !state.data && (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-void-border rounded-2xl bg-void-card/50">
            <div className="bg-red-500/10 p-6 rounded-full mb-6 ring-1 ring-red-500/20">
              <WifiOff className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Signal Interrupted</h2>
            <p className="text-gray-500 max-w-md mb-8">{state.error}</p>
            <button 
              onClick={() => loadNews()}
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded font-bold transition-colors"
            >
              <RefreshCw size={16} />
              Reconnect
            </button>
          </div>
        )}

        {/* Skeleton Loader (Matches new Card Design) */}
        {state.loading && !state.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="relative bg-void-card border border-void-border rounded-r-xl p-6 h-64 flex flex-col overflow-hidden"
              >
                {/* Simulated Accent Strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-void-border"></div>
                
                <div className="pl-4 flex justify-between mb-8">
                  <div className="h-3 w-20 bg-void-highlight rounded animate-pulse"></div>
                  <div className="h-3 w-12 bg-void-highlight rounded animate-pulse"></div>
                </div>
                
                <div className="pl-4 space-y-3 mb-6">
                  <div className="h-6 w-11/12 bg-void-highlight rounded animate-pulse"></div>
                  <div className="h-6 w-3/4 bg-void-highlight rounded animate-pulse"></div>
                </div>
                
                <div className="pl-4 mt-auto pt-4 border-t border-void-border/50">
                   <div className="h-3 w-1/3 bg-void-highlight rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content Grid */}
        {state.data && (
          <>
            {state.data.highlights.length === 0 ? (
               <div className="text-center py-32 text-gray-600 font-mono">
                 // NO ACTIVE SIGNALS DETECTED
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {state.data.highlights.map((highlight, index) => (
                  <NewsCard 
                    key={`${index}-${highlight.headline}`} 
                    highlight={highlight} 
                    language={language}
                    index={index} 
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer sources={state.sources} />
    </div>
  );
};

export default App;