import { FieldType, ScrapedRow } from '../types';

/**
 * Helper to generate a unique CSS selector for an element.
 * Simplistic implementation for prototype purposes.
 */
export const getUniqueSelector = (el: HTMLElement): string => {
  if (el.id) return `#${el.id}`;
  if (el.className) {
    const classes = Array.from(el.classList).join('.');
    // Basic class selector, usually safe for Tailwind setups if specific enough
    return `${el.tagName.toLowerCase()}.${classes}`; 
  }
  return el.tagName.toLowerCase();
};

/**
 * Finds the "List Container" based on a selected element.
 * It traverses up to find an element that has siblings with the same class structure.
 */
export const identifyRepeatedList = (target: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = target;
  
  // Traverse up 5 levels max to find a list item
  for (let i = 0; i < 5; i++) {
    if (!current || current.tagName === 'BODY') break;
    
    const parent = current.parentElement;
    if (!parent) break;

    // Check siblings (simulating finding "other rows")
    const similarSiblings = Array.from(parent.children).filter(child => 
      child !== current && 
      child.tagName === current!.tagName && 
      child.className === current!.className
    );

    if (similarSiblings.length > 0) {
      return current; // This `current` is the "Row" or "Card"
    }
    current = parent;
  }
  return null; // Could not identify a list
};

/**
 * Extracts data from all items in the list based on the user's selection inside one item.
 */
export const extractDataFromList = (
  rootContainer: HTMLElement, // The parent of the list items (e.g., the <ul> or grid <div>)
  itemSelector: string, // The selector for the item (e.g., "li.card")
  fields: { id: string; relativeSelector: string; type: FieldType }[]
): ScrapedRow[] => {
  
  const items = Array.from(rootContainer.querySelectorAll(itemSelector));
  
  return items.map((item, index) => {
    const row: ScrapedRow = { id: `row-${index}` };
    
    fields.forEach(field => {
      // Find the element inside this specific row item
      // Note: relativeSelector needs to be handled carefully. 
      // For this prototype, we assume the relativeSelector is a class or tag 
      // that can be found via querySelector inside the item.
      const el = item.querySelector(field.relativeSelector);
      
      if (el) {
        if (field.type === FieldType.IMAGE && el instanceof HTMLImageElement) {
          row[field.id] = el.src;
        } else if (field.type === FieldType.LINK && el instanceof HTMLAnchorElement) {
          row[field.id] = el.href;
        } else {
          row[field.id] = el.textContent?.trim() || '';
        }
      } else {
        row[field.id] = '';
      }
    });
    
    return row;
  });
};

export const generateCSV = (data: ScrapedRow[]): string => {
  if (data.length === 0) return '';
  const keys = Object.keys(data[0]).filter(k => k !== 'id');
  const header = keys.join(',');
  const rows = data.map(row => 
    keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...rows].join('\n');
};
