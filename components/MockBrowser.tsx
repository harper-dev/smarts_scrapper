import React, { useEffect, useRef } from 'react';

interface MockBrowserProps {
  isSelecting: boolean;
  onElementClick: (e: React.MouseEvent<HTMLElement>) => void;
  highlightSelector: string | null;
}

const SAMPLE_DATA = [
  { id: 1, title: "Luxury Villa in Beverly Hills", price: "$4,500,000", type: "House", img: "https://picsum.photos/300/200?random=1", badge: "New" },
  { id: 2, title: "Modern Apartment Downtown", price: "$850,000", type: "Apartment", img: "https://picsum.photos/300/200?random=2", badge: "Hot" },
  { id: 3, title: "Cozy Cottage by the Lake", price: "$320,000", type: "Cottage", img: "https://picsum.photos/300/200?random=3", badge: "Sale" },
  { id: 4, title: "Industrial Loft", price: "$1,200/mo", type: "Rental", img: "https://picsum.photos/300/200?random=4", badge: "Rent" },
  { id: 5, title: "Seaside Condo", price: "$600,000", type: "Condo", img: "https://picsum.photos/300/200?random=5", badge: "View" },
  { id: 6, title: "Mountain Retreat Cabin", price: "$450,000", type: "Cabin", img: "https://picsum.photos/300/200?random=6", badge: "Eco" },
];

export const MockBrowser: React.FC<MockBrowserProps> = ({ isSelecting, onElementClick, highlightSelector }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle hover effects during selection mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isSelecting) return;

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target !== container) {
        target.style.outline = "2px solid #3b82f6";
        target.style.cursor = "crosshair";
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.style.outline = "";
      target.style.cursor = "";
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [isSelecting]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Browser Bar */}
      <div className="bg-gray-200 p-2 flex items-center gap-2 border-b border-gray-300">
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="bg-white flex-1 rounded px-3 py-1 text-xs text-gray-500 flex items-center">
          <span className="mr-2">🔒</span> https://www.awesome-real-estate-demo.com/listings
        </div>
      </div>

      {/* Web Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-8 relative"
        onClick={(e) => {
          if (isSelecting) {
            e.preventDefault();
            e.stopPropagation();
            onElementClick(e);
          }
        }}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 site-title">Dream Homes For You</h1>
          <p className="text-gray-600">Find your perfect place from our exclusive listings.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 property-grid">
          {SAMPLE_DATA.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow property-card group">
              <div className="relative h-48 overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover property-image group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded property-badge">
                  {item.badge}
                </span>
              </div>
              <div className="p-4">
                <div className="text-xs font-bold text-brand-600 mb-1 uppercase tracking-wide property-type">{item.type}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 property-title leading-tight">{item.title}</h3>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xl font-bold text-slate-800 property-price">{item.price}</span>
                  <button className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors">Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center text-gray-400 text-sm">
          &copy; 2024 Mock Real Estate Corp. All rights reserved.
        </div>
      </div>
      
      {/* Highlighting Overlay (Simulating Chrome Extension Highlight) */}
      {highlightSelector && (
         <style>{`
            ${highlightSelector} {
              background-color: rgba(59, 130, 246, 0.1) !important;
              outline: 2px dashed #3b82f6 !important;
            }
         `}</style>
      )}
    </div>
  );
};
