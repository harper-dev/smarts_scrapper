import { FieldType, ScrapedRow } from '../types';

export interface ListContext {
  container: HTMLElement;
  itemSelector: string;
  foundItem: HTMLElement;
}

/**
 * Helper: Text extraction that is smarter than textContent.
 * Preserves structure, adds spaces between block elements, and ignores hidden junk.
 */
const getTextFromElement = (el: Element): string => {
  if (!el) return '';
  
  // Use innerText if available as it approximates the rendered text (handling display:none, block spacing etc)
  if ((el as HTMLElement).innerText) {
    // Clean up excessive whitespace
    return (el as HTMLElement).innerText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Fallback for environments where innerText might be unreliable or for XML/SVG nodes
  const clone = el.cloneNode(true) as HTMLElement;
  
  // Remove scripts, styles, and hidden elements
  const junk = clone.querySelectorAll('script, style, noscript, [hidden], [aria-hidden="true"]');
  junk.forEach(j => j.remove());

  // Ensure space around block elements to prevent "TitlePrice" merging
  const blockTags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'tr', 'button', 'section', 'article'];
  blockTags.forEach(tag => {
    const elements = clone.querySelectorAll(tag);
    elements.forEach(e => {
      if (tag === 'br') {
        e.replaceWith(' ');
      } else {
        e.after(' '); 
        e.before(' ');
      }
    });
  });

  let text = clone.textContent || '';
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Finds the "List Container" and determines the item selector.
 * Returns the container, the specific selector for items, and the actual item element found.
 */
export const identifyRepeatedList = (target: HTMLElement): ListContext | null => {
  let current: HTMLElement | null = target;
  
  // Traverse up to find a potential list item wrapper
  for (let i = 0; i < 8; i++) {
    if (!current || current.tagName === 'BODY' || current.tagName === 'HTML') break;
    
    const parent = current.parentElement;
    if (!parent) break;

    // Check Siblings: Are there other elements with the same tag?
    const tag = current.tagName;
    const siblings = Array.from(parent.children).filter(child => 
      child !== current && 
      child.tagName === tag
    );

    if (siblings.length > 0) {
      // Found siblings. This parent is likely the container.
      let selector = tag.toLowerCase();
      const currentClasses = Array.from(current.classList);

      if (currentClasses.length > 0) {
        // Find classes common to all siblings
        const commonClasses = currentClasses.filter(cls => 
           siblings.every(sib => sib.classList.contains(cls))
        );

        if (commonClasses.length > 0) {
           // Sort by complexity to find the most specific component class
           commonClasses.sort((a, b) => {
             const aScore = (a.includes('-') || a.includes('_') ? 10 : 0) + a.length;
             const bScore = (b.includes('-') || b.includes('_') ? 10 : 0) + b.length;
             return bScore - aScore;
           });
           selector += `.${commonClasses[0]}`;
        }
      }
      
      // Check if this selector finds multiple items in the parent
      // We accept even 1 match if the structure strongly suggests a list, 
      // but >= 2 is safer for "repeated" lists.
      const matches = parent.querySelectorAll(`:scope > ${selector}`);
      
      if (matches.length >= 1) { 
         return {
           container: parent,
           itemSelector: selector,
           foundItem: current
         };
      }
    }
    current = parent;
  }
  return null;
};

/**
 * Extracts data from all items in the list based on the user's selection inside one item.
 */
export const extractDataFromList = (
  rootContainer: HTMLElement,
  itemSelector: string,
  fields: { id: string; relativeSelector: string; type: FieldType }[]
): ScrapedRow[] => {
  
  // Get all items
  let items = Array.from(rootContainer.querySelectorAll(`:scope > ${itemSelector}`));
  
  // Fallback: if direct children check fails, try generic find
  if (items.length === 0) {
    items = Array.from(rootContainer.querySelectorAll(itemSelector));
  }
  
  return items.map((item, index) => {
    const row: ScrapedRow = { id: `row-${index}` };
    
    fields.forEach(field => {
      let el: Element | null = null;
      
      if (field.relativeSelector === '_ROOT_') {
        el = item;
      } else {
        // We look for the selector inside the item.
        // Note: If selector starts with tag (e.g. 'h3'), querySelector works fine.
        el = item.querySelector(field.relativeSelector);
      }
      
      if (el) {
        if (field.type === FieldType.IMAGE && el instanceof HTMLImageElement) {
          row[field.id] = el.src;
        } else if (field.type === FieldType.LINK && el instanceof HTMLAnchorElement) {
          row[field.id] = el.href;
        } else {
          row[field.id] = getTextFromElement(el);
        }
      } else {
        // If not found, try to match roughly by tag if selector was class-based but class is missing on this specific item
        // (Robustness fallback)
        if (field.relativeSelector.startsWith('.')) {
             // This is risky, might grab wrong thing. 
             // Better to return empty than wrong data for now.
             row[field.id] = ''; 
        } else {
             row[field.id] = '';
        }
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
    keys.map(k => {
      const val = row[k] === undefined || row[k] === null ? '' : String(row[k]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};
