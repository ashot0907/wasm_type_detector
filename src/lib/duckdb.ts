// src/lib/duckdb.ts
import * as duckdb from '@duckdb/duckdb-wasm'

let _db: duckdb.AsyncDuckDB | null = null
let _conn: duckdb.AsyncDuckDBConnection | null = null
let _initPromise: Promise<duckdb.AsyncDuckDB> | null = null

async function createWorkerSameOrigin(url: string, type: WorkerOptions['type'] = 'classic') {
  try { return new Worker(url, { type }) }
  catch {
    const resp = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!resp.ok) throw new Error(`Failed to fetch worker: ${resp.status}`)
    const code = await resp.text()
    const blob = new Blob([code], { type: 'application/javascript' })
    const blobURL = URL.createObjectURL(blob)
    return new Worker(blobURL, { type })
  }
}

async function createDB(): Promise<duckdb.AsyncDuckDB> {
  if (_db) return _db
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const bundles = duckdb.getJsDelivrBundles()
    const bundle = await duckdb.selectBundle(bundles)
    if (!bundle?.mainWorker || !bundle?.mainModule) throw new Error('duckdb-wasm: no compatible bundle')
    const worker = await createWorkerSameOrigin(bundle.mainWorker, (bundle.workerType as any) ?? 'classic')
    const logger = new duckdb.ConsoleLogger()
    const db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
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

export async function detectCsvDuckTypes(file: File): Promise<DuckCol[]> {
  const conn = await getConnection()
  const buf = new Uint8Array(await file.arrayBuffer())
  const safe = file.name.replace(/[^a-z0-9_.-]/gi, '_') || 'file'
  const vpath = `/${Date.now()}_${safe}`
  const copy = new Uint8Array(buf.byteLength); copy.set(buf)
  await (await createDB()).registerFileBuffer(vpath, copy)

  const opts = [
    "HEADER=TRUE",
    "SAMPLE_SIZE=-1",
    "IGNORE_ERRORS=TRUE",
    "MAX_LINE_SIZE=10000000",
    "NULL_PADDING=TRUE",
  ].join(', ')

  const res = await conn.query(`DESCRIBE SELECT * FROM read_csv_auto('${vpath}', ${opts})`)
  const rows = res.toArray().map((r: any) => ({
    name: r.column_name as string,
    duckType: r.column_type as string,
  }))

  try { await (await createDB()).dropFile?.(vpath) } catch {}
  return rows
}
