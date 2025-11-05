// src/lib/duckdb.ts
import * as duckdb from '@duckdb/duckdb-wasm'

let _db: duckdb.AsyncDuckDB | null = null
let _conn: duckdb.AsyncDuckDBConnection | null = null
let _initPromise: Promise<duckdb.AsyncDuckDB> | null = null

// создаём воркер; если прямой импорт запрещён CSP — используем blob fallback
async function createWorkerSameOrigin(url: string) {
  try {
    return new Worker(url) // без передачи { type }, чтобы не трогать workerType
  } catch {
    const resp = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!resp.ok) throw new Error(`Failed to fetch worker: ${resp.status}`)
    const code = await resp.text()
    const blob = new Blob([code], { type: 'application/javascript' })
    const blobURL = URL.createObjectURL(blob)
    return new Worker(blobURL)
  }
}

async function createDB(): Promise<duckdb.AsyncDuckDB> {
  if (_db) return _db
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    const bundles = duckdb.getJsDelivrBundles()
    const bundle = await duckdb.selectBundle(bundles)
    if (!bundle?.mainWorker || !bundle?.mainModule) {
      throw new Error('duckdb-wasm: no compatible bundle')
    }

    // ВАЖНО: не используем bundle.workerType
    const worker = await createWorkerSameOrigin(String(bundle.mainWorker))
    const logger = new duckdb.ConsoleLogger()
    const db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule as string, (bundle as any).pthreadWorker)
    _db = db
    return db
  })()

  return _initPromise
}

export async function getConnection() {
  const db = await createDB()
  if (_conn) return _conn
  _conn = await db.connect()
  return _conn
}

export type DuckCol = { name: string; duckType: string }

// Детектим типы по CSV (DuckDB → DESCRIBE read_csv_auto)
export async function detectCsvDuckTypes(file: File): Promise<DuckCol[]> {
  const conn = await getConnection()
  const buf = new Uint8Array(await file.arrayBuffer())
  const safe = file.name.replace(/[^a-z0-9_.-]/gi, '_') || 'file'
  const vpath = `/${Date.now()}_${safe}`

  // регистрируем копию буфера (worker может детачить)
  const copy = new Uint8Array(buf.byteLength)
  copy.set(buf)
  await (await createDB()).registerFileBuffer(vpath, copy)

  const opts = [
    'HEADER=TRUE',
    'SAMPLE_SIZE=-1',
    'IGNORE_ERRORS=TRUE',
    'MAX_LINE_SIZE=10000000',
    'NULL_PADDING=TRUE',
  ].join(', ')

  const res = await conn.query(`DESCRIBE SELECT * FROM read_csv_auto('${vpath}', ${opts})`)
  const rows = res.toArray().map((r: any) => ({
    name: r.column_name as string,
    duckType: r.column_type as string,
  }))

  try { await (await createDB()).dropFile?.(vpath) } catch {}

  return rows
}
