import React, { useState, useCallback } from 'react';
import { SidePanel } from './components/SidePanel';
import { MockBrowser } from './components/MockBrowser';
import { FieldType, ScrapedField, ScrapedRow } from './types';
import { identifyRepeatedList, extractDataFromList, getUniqueSelector } from './services/scraperEngine';

const App: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [fields, setFields] = useState<ScrapedField[]>([]);
  const [data, setData] = useState<ScrapedRow[]>([]);
  const [listContainer, setListContainer] = useState<HTMLElement | null>(null);

  // The logic used when a user clicks an element in the Mock Browser
  const handleElementClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isSelecting) return;
    
    const target = e.target as HTMLElement;
    
    // 1. Identify the list container if not already found
    // If this is the first click, we try to infer the repeating pattern structure
    let currentListContainer = listContainer;
    if (!currentListContainer) {
      currentListContainer = identifyRepeatedList(target);
      if (currentListContainer) {
        setListContainer(currentListContainer.parentElement); // The parent of the list item (e.g., the grid)
        console.log("Identified List Container:", currentListContainer.parentElement);
      } else {
        console.warn("Could not identify a repeatable list pattern.");
        return; // Exit if we can't find a pattern
      }
    }

    // 2. Identify the clicked field relative to the list item
    // The clicked target is inside a list item. 
    // We need a selector relative to the list item.
    // For this prototype, we look for the class name as the selector.
    const fieldSelector = `.${Array.from(target.classList).find(c => c.startsWith('property-')) || target.tagName.toLowerCase()}`;
    const fieldName = fieldSelector.replace('.property-', '') || 'field_' + (fields.length + 1);
    
    // Determine Type
    let type = FieldType.TEXT;
    if (target.tagName === 'IMG') type = FieldType.IMAGE;
    if (target.tagName === 'A') type = FieldType.LINK;

    const newField: ScrapedField = {
      id: fieldName,
      name: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
      selector: fieldSelector,
      type: type
    };

    // Prevent duplicates
    if (fields.some(f => f.id === newField.id)) return;

    const newFields = [...fields, newField];
    setFields(newFields);

    // 3. Extract Data immediately based on known fields
    if (currentListContainer && currentListContainer.parentElement) {
       // We pass the list item class (e.g., .property-card)
       // For the mock, the list items are direct children of the container found by identifyRepeatedList
       // Identify the list item selector:
       const listItemSelector = `.${currentListContainer.classList[0]}` || 'div'; // Heuristic for prototype
       
       const extractedData = extractDataFromList(
         currentListContainer.parentElement, 
         listItemSelector, // e.g. ".property-card"
         newFields.map(f => ({ id: f.id, relativeSelector: f.selector, type: f.type }))
       );
       setData(extractedData);
    }

    // Don't turn off selection mode automatically, allow multiple field selections
  }, [isSelecting, listContainer, fields]);

  const handleRemoveField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    
    // Re-extract without the removed field
    if (listContainer) {
       const listItemSelector = `.${listContainer.children[0].classList[0]}` || 'div';
       const extractedData = extractDataFromList(
         listContainer, 
         listItemSelector,
         newFields.map(f => ({ id: f.id, relativeSelector: f.selector, type: f.type }))
       );
       setData(extractedData);
    }
  };

  // Generate a highlight string for CSS (mocking extension content script injection)
  // We highlight the fields currently selected
  const highlightSelector = fields.length > 0 
    ? fields.map(f => f.selector).join(', ') 
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      {/* Left: Simulated Browser (Content Script Area) */}
      <div className="flex-1 relative z-0">
        <MockBrowser 
          isSelecting={isSelecting} 
          onElementClick={handleElementClick}
          highlightSelector={highlightSelector}
        />
        
        {/* Overlay Help Text */}
        {isSelecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-2 rounded-full shadow-lg z-50 pointer-events-none backdrop-blur-sm">
             Select a data point (e.g., Price, Title)
          </div>
        )}
      </div>

      {/* Right: Side Panel (Extension UI) */}
      <div className="w-[400px] relative z-10">
        <SidePanel 
          isSelecting={isSelecting}
          toggleSelectionMode={() => setIsSelecting(!isSelecting)}
          fields={fields}
          data={data}
          onRemoveField={handleRemoveField}
          onUpdateData={setData}
        />
      </div>
    </div>
  );
};

export default App;
