import React, { useMemo, useState } from 'react'
import { detectCsvDuckTypes } from '../lib/duckdb'
import { mapDuckToTarget, TARGET_DBS } from '../lib/typeMapping'
import type { TargetDB } from '../lib/typeMapping'
import { generateDDL } from '../lib/ddl'
import { toast, Toaster } from 'sonner'
import {
  UploadCloud, Sparkles, FileText, Loader2, Database,
  CheckSquare, Clipboard, Download
} from 'lucide-react'
import clsx from 'clsx'

type Row = { name: string; duckType: string; nullable?: boolean }

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
}

// безопасно экранируем CSV-ячейку
function csvCell(v: any): string {
  const s = String(v ?? '')
  // если есть запятая/кавычка/перенос строки — оборачиваем в кавычки и удваиваем кавычки
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default function DetectCSV() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [tableName, setTableName] = useState('my_table')
  const [selectedDBs, setSelectedDBs] = useState<TargetDB[]>(['ClickHouse'])

  // Export modal state
  const [showExport, setShowExport] = useState(false)
  const exportText = useMemo(() => {
    if (!rows.length) return ''
    return generateDDL(tableName || 'my_table', rows, selectedDBs)
  }, [rows, tableName, selectedDBs])

  const niceName = useMemo(() => file?.name || 'Choose CSV', [file])

  async function onDetect() {
    if (!file) { toast.error('Upload CSV first'); return }
    if (selectedDBs.length === 0) { toast.error('Select at least one DB'); return }
    setLoading(true); setRows([])
    try {
      const cols = await detectCsvDuckTypes(file)
      if (!cols.length) toast.error('No columns detected')
      else { setRows(cols); toast.success(`Types detected for ${selectedDBs.join(', ')}`) }
    } catch (e) {
      console.error(e)
      toast.error('Detection failed')
    } finally {
      setLoading(false)
    }
  }

  function onExport() {
    if (!rows.length) { toast.error('Nothing to export'); return }
    setShowExport(true)
  }

  // === Copy query ===
  async function copyQuery() {
    try {
      await navigator.clipboard.writeText(exportText)
      toast.success('Query copied to clipboard')
    } catch {
      toast.error('Copy failed')
    }
  }

  // === Export the on-screen table as CSV ===
  function exportGridAsCSV() {
    if (!rows.length) { toast.error('Nothing to export'); return }
    // Заголовки: Name, ... Target Type (DB) по выбору, DuckDB Type
    const header = ['Name', ...selectedDBs.map(db => `Target Type (${db})`), 'DuckDB Type']
    const body = rows.map(r => {
      const perDb = selectedDBs.map(db => mapDuckToTarget(r.duckType, db))
      return [r.name || 'EmptyHeader', ...perDb, r.duckType]
    })

    const lines = [
      header.map(csvCell).join(','),
      ...body.map(row => row.map(csvCell).join(','))
    ]
    const csv = lines.join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.download = `${tableName || 'detected_types'}.csv`
    a.href = URL.createObjectURL(blob)
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="card p-6">
      <Toaster richColors theme="dark" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/5 flex items-center justify-center border border-border">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">CSV → Multi-DB Type Detector</h2>
            <p className="text-white/60 text-sm">Загрузи CSV, выбери базы и жми Detect / Export</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span className="badge">WASM</span>
          <span className="badge">DuckDB</span>
          <span className="badge">Vite</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 card p-4 space-y-4">
          <label
            htmlFor="file"
            className={clsx(
              'w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer',
              'border-border hover:border-accent/60 transition'
            )}
          >
            <UploadCloud className="w-6 h-6 mb-2 text-white/70" />
            <span className="text-sm text-white/80">{niceName}</span>
            <input
              id="file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <Database className="mt-2 w-4 h-4 text-white/70" />
              <div className="w-full">
                <div className="text-xs text-white/60 mb-1">Target databases (multi-select)</div>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_DBS.map(db => {
                    const checked = selectedDBs.includes(db)
                    return (
                      <button
                        key={db}
                        type="button"
                        onClick={() => setSelectedDBs(prev => toggle(prev, db))}
                        className={clsx(
                          'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                          checked ? 'border-accent bg-white/5' : 'border-border hover:border-accent/40'
                        )}
                        title={db}
                        aria-pressed={checked}
                      >
                        <span>{db}</span>
                        {checked && <CheckSquare className="w-4 h-4 text-accent" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-1">Table/Collection name</div>
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="my_table"
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              className={clsx('btn', loading && 'opacity-60 pointer-events-none')}
              onClick={onDetect}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Detect for {selectedDBs.length ? selectedDBs.join(', ') : '—'}
            </button>

            <button
              className={clsx('btn-outline', (!rows.length || loading) && 'opacity-60 pointer-events-none')}
              onClick={onExport}
              title="Export"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="card p-4 space-y-2">
          <h3 className="text-sm text-white/70">Hints</h3>
          <ul className="text-sm text-white/60 list-disc ml-5 space-y-1">
            <li>Определение типов делает DuckDB (в браузере)</li>
            <li>Export показывает DDL и может выгрузить текущую таблицу в CSV</li>
            <li>Название файла берётся из «Table/Collection name»</li>
          </ul>
        </div>
      </div>

      {/* таблица */}
      <div className="mt-6">
        <h3 className="text-lg mb-3">
          Detected columns {rows.length ? `(${rows.length})` : ''} → Targets:&nbsp;
          <span className="text-accent">{selectedDBs.length ? selectedDBs.join(', ') : '—'}</span>
        </h3>
        <div className="overflow-auto border border-border rounded-xl">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Name</th>
                {selectedDBs.map(db => (
                  <th key={db}>Target Type ({db})</th>
                ))}
                <th>DuckDB Type</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3 + selectedDBs.length} className="py-8 text-center text-white/60">Detecting…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={3 + selectedDBs.length} className="py-8 text-center text-white/40">Нет данных</td></tr>
              ) : (
                rows.map((c, i) => (
                  <tr key={`${c.name}-${i}`}>
                    <td className="text-white/60">{i + 1}</td>
                    <td className="font-medium">{c.name || <span className="text-white/50">EmptyHeader</span>}</td>
                    {selectedDBs.map(db => (
                      <td key={`${db}-${i}`}>
                        <span className="badge">{mapDuckToTarget(c.duckType, db)}</span>
                      </td>
                    ))}
                    <td className="text-white/70">{c.duckType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-4xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="font-semibold">Export — {tableName}</div>
              <button className="btn-outline" onClick={() => setShowExport(false)}>Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                {/* Copy query */}
                <button className="btn" onClick={copyQuery}>
                  <Clipboard className="w-4 h-4" /> Copy query
                </button>

                {/* Export visible grid as CSV */}
                <button className="btn-outline" onClick={exportGridAsCSV}>
                  <Download className="w-4 h-4" /> Export Types as CSV file
                </button>
              </div>

              <div className="text-xs text-white/60">Preview / editable</div>
              <textarea
                readOnly
                value={exportText}
                className="w-full h-[50vh] font-mono text-sm bg-[#0f121a] border border-border rounded-lg p-3"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
