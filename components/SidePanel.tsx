import React, { useState } from 'react';
import { ArrowDownTrayIcon, SparklesIcon, TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { ScrapedField, ScrapedRow, ExportFormat, FieldType } from '../types';
import { cleanDataWithAI } from '../services/geminiService';
import { generateCSV } from '../services/scraperEngine';

interface SidePanelProps {
  isSelecting: boolean;
  toggleSelectionMode: () => void;
  fields: ScrapedField[];
  data: ScrapedRow[];
  onRemoveField: (id: string) => void;
  onUpdateData: (newData: ScrapedRow[]) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isSelecting,
  toggleSelectionMode,
  fields,
  data,
  onRemoveField,
  onUpdateData
}) => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningInstruction, setCleaningInstruction] = useState("Remove currency symbols and text, keep numbers");

  const handleExport = (format: ExportFormat) => {
    if (format === ExportFormat.CSV) {
      const csvContent = generateCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'scraped_data.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'scraped_data.json');
      link.click();
    }
  };

  const handleAIClean = async (fieldId: string) => {
    setIsCleaning(true);
    try {
      // Extract the column data
      const rawColumn = data.map(row => String(row[fieldId]));
      
      // Call Gemini
      const cleanedColumn = await cleanDataWithAI(rawColumn, cleaningInstruction);
      
      // Merge back into data
      const newData = data.map((row, index) => ({
        ...row,
        [fieldId]: cleanedColumn[index] || row[fieldId] // Fallback to original if error/mismatch
      }));
      
      onUpdateData(newData);
    } catch (e) {
      alert("AI Cleaning Failed. Check API Key or Limits.");
      console.error(e);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-brand-600" />
            Smart Scraper
          </h1>
          <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">v1.0.0</span>
        </div>
        <p className="text-xs text-slate-500">Select elements on the page to auto-extract lists.</p>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4 bg-slate-50 border-b border-slate-100">
        <button
          onClick={toggleSelectionMode}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            isSelecting
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
          }`}
        >
          {isSelecting ? (
            <>
              <PauseIcon className="w-4 h-4" /> Stop Selection
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" /> Select Elements
            </>
          )}
        </button>

        {isSelecting && (
          <div className="text-xs text-center text-brand-600 animate-pulse">
            Click on a Title, Price, or Image in the view...
          </div>
        )}
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {fields.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <div className="text-4xl mb-2">👆</div>
            <p className="text-sm text-slate-500">Start selecting elements to build your dataset.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Extracted Columns</h2>
               <span className="text-xs text-slate-400">{data.length} rows found</span>
            </div>
           
            {fields.map((field) => (
              <div key={field.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 group relative hover:border-brand-400 hover:shadow-md hover:z-10 transition-all">
                
                {/* Tooltip Start */}
                <div className="absolute left-0 top-full mt-2 w-full bg-slate-900/95 backdrop-blur text-white text-xs rounded p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 font-medium">Type</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide ${
                          field.type === FieldType.TEXT ? 'bg-blue-500/20 text-blue-200' :
                          field.type === FieldType.LINK ? 'bg-green-500/20 text-green-200' :
                          'bg-purple-500/20 text-purple-200'
                      }`}>{field.type}</span>
                   </div>
                   <div className="space-y-1">
                      <span className="text-slate-400 font-medium block">Selector</span>
                      <code className="font-mono text-[10px] break-all text-slate-300 block bg-slate-800/50 p-1 rounded">
                        {field.selector}
                      </code>
                   </div>
                   {/* Arrow */}
                   <div className="absolute bottom-full left-6 border-[6px] border-transparent border-b-slate-900/95"></div>
                </div>
                {/* Tooltip End */}

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700">{field.name}</h3>
                    <p className="text-xs text-slate-400 font-mono truncate max-w-[150px] cursor-help">{field.selector}</p>
                  </div>
                  <button 
                    onClick={() => onRemoveField(field.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* AI Clean Section */}
                {field.type === FieldType.TEXT && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={cleaningInstruction}
                        onChange={(e) => setCleaningInstruction(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none"
                        placeholder="Prompt..."
                      />
                      <button
                        onClick={() => handleAIClean(field.id)}
                        disabled={isCleaning}
                        className="bg-brand-50 text-brand-600 hover:bg-brand-100 px-2 rounded text-xs font-medium disabled:opacity-50"
                        title="Clean with AI"
                      >
                        {isCleaning ? '...' : <SparklesIcon className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 gap-3">
        <button
          onClick={() => handleExport(ExportFormat.CSV)}
          disabled={data.length === 0}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="w-4 h-4" /> CSV
        </button>
        <button
          onClick={() => handleExport(ExportFormat.JSON)}
          disabled={data.length === 0}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="w-4 h-4" /> JSON
        </button>
      </div>
    </div>
  );
};