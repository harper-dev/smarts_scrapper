export enum FieldType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  LINK = 'LINK'
}

export interface ScrapedField {
  id: string;
  name: string;
  selector: string; // CSS Selector or XPath
  type: FieldType;
  sampleValue?: string;
}

export interface ScrapedRow {
  id: string;
  [key: string]: string | number; // Dynamic keys based on field names
}

export interface ScraperState {
  isActive: boolean;
  targetContainer: string | null; // Selector for the repeatable list item
  fields: ScrapedField[];
  data: ScrapedRow[];
}

export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON'
}

// Gemini Service Types
export interface CleanDataRequest {
  data: string[];
  instruction: string; // e.g. "Remove currency symbols", "Extract domain"
}
