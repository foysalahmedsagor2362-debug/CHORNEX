import React, { useState, useEffect } from 'react';
import { NewsHighlight, Language } from '../types';
import { 
  CheckCircle2, Copy, Check, ExternalLink,
  Globe, TrendingUp, Cpu, ShieldAlert, Leaf, Landmark, MapPin, Circle
} from 'lucide-react';

interface NewsCardProps {
  highlight: NewsHighlight;
  language: Language;
  index: number;
}

const STORAGE_KEY = 'chornex_read_articles';

// Map categories to specific accent colors for the left border strip
const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'economy': return 'bg-emerald-500';
    case 'tech': return 'bg-cyan-500';
    case 'security': return 'bg-red-500';
    case 'climate': return 'bg-green-400';
    case 'politics': return 'bg-orange-500';
    case 'bangladesh': return 'bg-teal-500';
    default: return 'bg-blue-600';
  }
};

const getCategoryLabel = (category: string, lang: Language) => {
  if (lang === 'en') return category.toUpperCase();
  const map: Record<string, string> = {
    world: 'বিশ্ব',
    economy: 'অর্থনীতি',
    tech: 'প্রযুক্তি',
    security: 'নিরাপত্তা',
    climate: 'জলবায়ু',
    politics: 'রাজনীতি',
    bangladesh: 'বাংলাদেশ'
  };
  return map[category.toLowerCase()] || category.toUpperCase();
};

const getCategoryIcon = (category: string) => {
  const props = { size: 12, className: "stroke-[2.5]" };
  switch (category.toLowerCase()) {
    case 'world': return <Globe {...props} />;
    case 'economy': return <TrendingUp {...props} />;
    case 'tech': return <Cpu {...props} />;
    case 'security': return <ShieldAlert {...props} />;
    case 'climate': return <Leaf {...props} />;
    case 'politics': return <Landmark {...props} />;
    case 'bangladesh': return <MapPin {...props} />;
    default: return <Circle {...props} />;
  }
};

// Inline SVGs for brands (Lucide removed brand icons in v0.460+)
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.603-2.797 4.16v1.972h4.196l-1.549 3.667h-2.647v7.98c9.486-1.886 16.292-10.298 16.292-20.244 0-11.39-9.231-20.622-20.622-20.622S0 9.232 0 20.622c0 9.946 6.806 18.358 16.292 20.244" fillRule="evenodd"/>
  </svg>
);

export const NewsCard: React.FC<NewsCardProps> = ({ highlight, language, index }) => {
  const [isRead, setIsRead] = useState(false);
  const [copied, setCopied] = useState(false);
  const accentColor = getCategoryColor(highlight.category);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const readList = JSON.parse(stored);
        if (Array.isArray(readList) && readList.includes(highlight.headline)) {
          setIsRead(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [highlight.headline]);

  const handleRead = () => {
    if (!isRead) {
      setIsRead(true);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let readList = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(readList)) readList = [];
        if (!readList.includes(highlight.headline)) {
          readList.push(highlight.headline);
          if (readList.length > 100) readList = readList.slice(readList.length - 100);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(readList));
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${highlight.headline}\n\n${highlight.summary}\n\nVia CHORNEX.AI`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Facebook primarily shares the URL.
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${highlight.headline}\n\n${highlight.summary}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const baseDelay = index * 80;

  return (
    <div 
      key={highlight.headline} // Force re-creation of DOM node to restart animation on content change
      onClick={handleRead}
      className={`
        group relative flex flex-col justify-between
        bg-void-card hover:bg-void-highlight
        border border-void-border hover:border-gray-700
        rounded-r-xl overflow-hidden
        transition-all duration-300 ease-out
        cursor-pointer
        opacity-0 animate-fade-in-up
        ${isRead ? 'opacity-60' : 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60'}
      `}
      style={{ animationDelay: `${baseDelay}ms` }}
    >
      {/* Accent Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor} ${isRead ? 'opacity-30' : 'opacity-100'}`}></div>

      <div className="p-6 pl-8">
        {/* Meta Header */}
        <div className="flex justify-between items-center mb-4">
          <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${accentColor.replace('bg-', 'text-')} flex items-center gap-2`}>
            {getCategoryIcon(highlight.category)}
            {getCategoryLabel(highlight.category, language)}
          </span>
          <span className="text-[10px] font-mono text-gray-600 border border-void-border px-2 py-0.5 rounded">
            {highlight.timestamp}
          </span>
        </div>

        {/* Headline */}
        <h3 className={`text-lg font-bold text-gray-100 mb-3 leading-snug group-hover:text-white transition-colors 
          ${language === 'bn' ? 'font-bengali' : 'font-sans'}
          ${isRead ? 'text-gray-500 line-through decoration-gray-700' : ''}
        `}>
          {highlight.headline}
        </h3>

        {/* Summary */}
        <p 
          className={`text-sm leading-relaxed text-gray-400 group-hover:text-gray-300
            ${language === 'bn' ? 'font-bengali text-base' : 'font-sans'}
            opacity-0 animate-fade-in-up
          `}
          style={{ animationDelay: `${baseDelay + 200}ms` }}
        >
          {highlight.summary}
        </p>
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 border-t border-void-border/50 bg-black/20 flex justify-between items-center mt-auto pl-8">
        <div className="flex gap-4 min-h-[20px]">
          {isRead && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 animate-fade-in-up">
              <CheckCircle2 size={12} /> READ
            </span>
          )}
        </div>
        
        {/* Share Buttons */}
        <div className="flex gap-4 text-gray-600 items-center">
           <button 
             onClick={handleCopy}
             className="hover:text-white transition-colors relative"
             title="Copy Summary"
           >
             {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
           </button>
           <button 
             onClick={handleShareFacebook}
             className="hover:text-[#1877F2] transition-colors"
             title="Share on Facebook"
           >
             <FacebookIcon className="w-[14px] h-[14px]" />
           </button>
           <button 
             onClick={handleShareTwitter}
             className="hover:text-white transition-colors"
             title="Post on X (Twitter)"
           >
             <XIcon className="w-[14px] h-[14px]" />
           </button>
           
           {highlight.url && (
             <>
               <div className="h-3 w-px bg-gray-700 mx-1"></div>
               <a 
                 href={highlight.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 onClick={(e) => e.stopPropagation()}
                 className="hover:text-blue-400 transition-colors flex items-center"
                 title="View Original Source"
               >
                 <ExternalLink size={14} />
               </a>
             </>
           )}
        </div>
      </div>
    </div>
  );
};