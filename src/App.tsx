import { Toaster } from 'sonner'
import DetectCSV from './components/DetectCSV'
import { Database, Github } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-bg/70 border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-border flex items-center justify-center">
              <Database className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Type Detector</div>
              <div className="text-xs text-white/50">CSV → DuckDB → ClickHouse</div>
            </div>
          </div>
          <a
            className="btn-outline"
            href="https://github.com/ashot0907/wasm_type_detector"
            target="_blank" rel="noreferrer"
          >
            <Github className="w-4 h-4" />
            Docs
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 space-y-8">
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Beautiful <span className="text-accent">WASM</span> CSV Type Detection
          </h1>
          <p className="text-white/60 mt-2">
            Upload a CSV file and infer column types for ClickHouse via DuckDB running entirely in your browser.
          </p>
        </section>

        <DetectCSV />
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-white/40">
        Built with Vite • DuckDB-WASM • Tailwind
      </footer>

      <Toaster richColors theme="dark" />
    </div>
  )
}
