import React, { useState, useCallback } from 'react';
import { SidePanel } from './components/SidePanel';
import { MockBrowser } from './components/MockBrowser';
import { FieldType, ScrapedField, ScrapedRow } from './types';
import { identifyRepeatedList, extractDataFromList, ListContext } from './services/scraperEngine';

const App: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [fields, setFields] = useState<ScrapedField[]>([]);
  const [data, setData] = useState<ScrapedRow[]>([]);
  
  // Store the full context of the identified list
  const [listContext, setListContext] = useState<ListContext | null>(null);

  const handleElementClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isSelecting) return;
    
    const target = e.target as HTMLElement;
    
    let currentContext = listContext;
    let contextChanged = false;
    let itemInList: Element | null = null;

    // --- 1. Context Identification Strategy ---
    
    if (currentContext && currentContext.container.contains(target)) {
      // CASE A: User clicked inside the EXISTING list container.
      // We assume they want to add a column to the current list, not start a new one.
      
      // Find which item they clicked
      // 1. Try finding the exact item selector going up
      itemInList = target.closest(currentContext.itemSelector);
      
      // 2. Fallback: If closest() fails (e.g. selector issue), walk up to direct child of container
      if (!itemInList) {
         let parent = target;
         while (parent.parentElement && parent.parentElement !== currentContext.container) {
            parent = parent.parentElement;
         }
         if (parent.parentElement === currentContext.container) {
            itemInList = parent;
         }
      }
    } 
    
    if (!itemInList) {
      // CASE B: User clicked outside current list OR we couldn't map the click to an item in the current list.
      // We attempt to identify a NEW list.
      
      const found = identifyRepeatedList(target);
      if (found) {
        // Did we actually find a different list?
        if (!currentContext || found.container !== currentContext.container) {
          const confirmReset = fields.length > 0 
             ? window.confirm("You are selecting a new list. This will clear your current extracted data. Continue?") 
             : true;
             
          if (!confirmReset) return;

          currentContext = found;
          setListContext(found);
          setFields([]); // Reset fields for new list
          contextChanged = true;
          itemInList = found.foundItem;
        } else {
          // It identified the SAME list (redundant calculation but safe)
          itemInList = found.foundItem;
        }
      } else {
        // Clicked something that doesn't look like a list.
        console.warn("No repeated list pattern found.");
        return;
      }
    }

    if (!itemInList || !currentContext) return;

    // --- 2. Field Selector Logic ---

    let fieldSelector = '';
    let fieldName = '';
    let type = FieldType.TEXT;

    // Is it the Root Item?
    if (target === itemInList) {
        fieldSelector = '_ROOT_';
        fieldName = 'Item Content';
    } else {
        // Determine relative selector
        // Priority: 
        // 1. Property-specific classes (Mock specific logic, but useful)
        const propClass = Array.from(target.classList).find(c => c.startsWith('property-'));
        
        if (propClass) {
            fieldSelector = `.${propClass}`;
            fieldName = propClass.replace('property-', '');
        } else {
            // 2. Generic Classes (ignoring common states)
            const validClasses = Array.from(target.classList).filter(c => 
                !['ng-binding', 'v-html', 'active', 'selected', 'hover', 'focus'].includes(c)
            );
            
            if (validClasses.length > 0) {
                // Use the longest class name as it's usually more specific
                const bestClass = validClasses.reduce((a, b) => a.length > b.length ? a : b);
                fieldSelector = `.${bestClass}`;
                fieldName = bestClass.replace(/[-_]/g, ' ');
            } else {
                // 3. Tag Name fallback
                fieldSelector = target.tagName.toLowerCase();
                fieldName = fieldSelector;
            }
        }
    }

    if (target.tagName === 'IMG') type = FieldType.IMAGE;
    if (target.tagName === 'A') type = FieldType.LINK;

    const prettyName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const uniqueId = `${fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    // --- 3. Duplicate Handling ---

    if (!contextChanged) {
      const existingField = fields.find(f => f.selector === fieldSelector);
      
      if (existingField) {
         const userChoice = window.confirm(
           `Field "${existingField.name}" already uses this selector (${fieldSelector}).\n\nOK: Update existing field.\nCancel: Add as a NEW duplicate column.`
         );
         
         if (userChoice) {
            // UPDATE
            const updatedFields = fields.map(f => 
               f.id === existingField.id ? { ...f, name: prettyName, type } : f
            );
            setFields(updatedFields);
            updateData(currentContext, updatedFields);
            return;
         }
         // If cancel, we fall through to ADD new field
      }
    }

    // --- 4. Add New Field ---
    
    const newField: ScrapedField = {
      id: uniqueId,
      name: prettyName,
      selector: fieldSelector,
      type: type
    };

    const updatedFields = contextChanged ? [newField] : [...fields, newField];
    setFields(updatedFields);
    updateData(currentContext, updatedFields);

  }, [isSelecting, listContext, fields]);

  const updateData = (ctx: ListContext, currentFields: ScrapedField[]) => {
    const extractedData = extractDataFromList(
      ctx.container, 
      ctx.itemSelector, 
      currentFields.map(f => ({ id: f.id, relativeSelector: f.selector, type: f.type }))
    );
    setData(extractedData);
  };

  const handleRemoveField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    if (listContext) {
      updateData(listContext, newFields);
    }
  };

  const highlightSelector = fields.length > 0 
    ? fields.map(f => f.selector === '_ROOT_' ? listContext?.itemSelector || '' : f.selector).join(', ') 
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      <div className="flex-1 relative z-0">
        <MockBrowser 
          isSelecting={isSelecting} 
          onElementClick={handleElementClick}
          highlightSelector={highlightSelector}
        />
        {isSelecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-2 rounded-full shadow-lg z-50 pointer-events-none backdrop-blur-sm text-sm font-medium border border-white/20">
             {listContext ? 'Adding fields to existing list...' : 'Select an element to identify a list'}
          </div>
        )}
      </div>
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
