import { useState, useRef, useCallback } from 'react';
import { X, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { downloadTemplate, parseBuildingsFile, mergeParsedBuildings } from '../../utils/excelIO';

export default function UploadBuildingsDialog({ open, onClose }) {
  const { buildings: allBuildings, applyImport, notify } = useApp();
  const buildings = allBuildings.filter(b => !b.isDraft);
  const [parsed, setParsed]         = useState(null);
  const [fileName, setFileName]     = useState('');
  const [error, setError]           = useState('');
  const [fillDefaults, setFillDef]  = useState(true);
  const [strategy, setStrategy]     = useState('replace');    // replace | skip
  const [dragOver, setDragOver]     = useState(false);
  const [busy, setBusy]             = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(''); setBusy(true);
    try {
      const rows = await parseBuildingsFile(file);
      if (!rows.length) throw new Error('No valid rows found. Make sure the file has a "name" column and data rows below row 2.');
      setParsed(rows);
      setFileName(file.name);
    } catch (e) {
      setError(e.message || 'Failed to parse file.');
      setParsed(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const duplicates = parsed
    ? parsed.filter(p => buildings.some(b => String(b.name).toLowerCase() === String(p.name).toLowerCase()))
    : [];
  const newOnes = parsed ? parsed.length - duplicates.length : 0;

  const apply = () => {
    if (!parsed) return;
    const { added, updated } = mergeParsedBuildings(buildings, parsed, { strategy, fillDefaults });
    const msg = `Imported ${added.length} new · ${updated.length} updated (${strategy === 'skip' ? 'skipped existing' : 'replaced existing'}).`;
    applyImport(added, updated, msg);
    reset();
    onClose();
  };

  const reset = () => { setParsed(null); setFileName(''); setError(''); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={22} className="text-emerald-700" />
            <h3 className="text-lg font-bold text-slate-800">Upload buildings (Excel)</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Step 1 — template */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-700 font-bold">1</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">Download the template</div>
              <div className="text-sm text-slate-600 mt-0.5">Open it in Excel, fill one building per row, then come back and drag it in.</div>
            </div>
            <button onClick={downloadTemplate}
                    className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} /> Template
            </button>
          </div>

          {/* Step 2 — drop zone */}
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">2</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800 mb-2">Upload your filled file</div>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                   onDragLeave={() => setDragOver(false)}
                   onDrop={onDrop}
                   onClick={() => inputRef.current?.click()}
                   className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition ${
                     dragOver ? 'border-emerald-500 bg-emerald-50' :
                     parsed ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 bg-white'
                   }`}>
                {busy ? (
                  <div className="text-slate-600 text-sm">Parsing file…</div>
                ) : parsed ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-800 text-sm">
                    <CheckCircle2 size={18} />
                    <span className="font-semibold">{fileName}</span>
                    <span className="text-slate-500">· {parsed.length} row(s)</span>
                  </div>
                ) : (
                  <div className="text-slate-600">
                    <Upload size={22} className="mx-auto mb-2 text-slate-400" />
                    <div className="text-sm">Drag & drop .xlsx here, or click to browse</div>
                  </div>
                )}
                <input ref={inputRef} type="file" accept=".xlsx,.xls"
                       className="hidden"
                       onChange={e => handleFile(e.target.files?.[0])} />
              </div>
              {error && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </div>

          {/* Step 3 — preview + options */}
          {parsed && (
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">3</div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium">{newOnes} new</span>
                  {duplicates.length > 0 && (
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">{duplicates.length} already exist</span>
                  )}
                </div>

                {duplicates.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                    <div className="font-semibold text-amber-900 flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} /> Name collisions detected
                    </div>
                    <div className="text-amber-800 text-xs mb-2 break-words">
                      {duplicates.slice(0, 5).map(d => d.name).join(', ')}
                      {duplicates.length > 5 ? ` (+${duplicates.length - 5} more)` : ''}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} />
                        <span>Replace existing with uploaded values</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={strategy === 'skip'} onChange={() => setStrategy('skip')} />
                        <span>Keep existing, skip duplicates</span>
                      </label>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={fillDefaults} onChange={e => setFillDef(e.target.checked)} className="mt-0.5" />
                  <span>
                    <b>Fill empty cells with typology defaults</b>
                    <span className="block text-xs text-slate-500">Missing values left empty will remain empty and be flagged as incomplete in the app.</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={apply}
                  disabled={!parsed || busy}
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Import {parsed ? `(${strategy === 'skip' ? newOnes : parsed.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
