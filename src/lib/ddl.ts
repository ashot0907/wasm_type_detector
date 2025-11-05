// src/lib/ddl.ts
import { mapDuckToTarget, TARGET_DBS } from './typeMapping'
import type { TargetDB } from './typeMapping'

export type DuckCol = { name: string; duckType: string; nullable?: boolean }

// --- utils ---
const qCH = (id: string) => `\`${id.replace(/`/g, '``')}\``      // ClickHouse/ MySQL backticks
const qPG = (id: string) => `"${id.replace(/"/g, '""')}"`        // PostgreSQL / Oracle quotes
const indent = (s: string, n = 2) => s.split('\n').map(l => ' '.repeat(n) + l).join('\n')

// ClickHouse: Nullable(TYPE) если nullable=true
function chTypeWithNull(t: string, nullable: boolean | undefined) {
  if (!nullable) return t
  // если уже Nullable(...)
  if (/^Nullable\s*\(/i.test(t)) return t
  return `Nullable(${t})`
}

// --- generators ---
function genClickHouse(table: string, cols: DuckCol[]): string {
  const lines = cols.map(c => `${qCH(c.name)} ${chTypeWithNull(mapDuckToTarget(c.duckType, 'ClickHouse'), c.nullable)}`)
  return [
    `CREATE TABLE ${qCH(table)} (`,
    indent(lines.join(',\n')),
    `)`,
    `ENGINE = MergeTree`,
    `ORDER BY tuple();`
  ].join('\n')
}

function genPostgres(table: string, cols: DuckCol[]): string {
  const lines = cols.map(c => `${qPG(c.name)} ${mapDuckToTarget(c.duckType, 'PostgreSQL')}${c.nullable === false ? ' NOT NULL' : ''}`)
  return [
    `CREATE TABLE ${qPG(table)} (`,
    indent(lines.join(',\n')),
    `);`
  ].join('\n')
}

function genMySQL(table: string, cols: DuckCol[]): string {
  const lines = cols.map(c => `${qCH(c.name)} ${mapDuckToTarget(c.duckType, 'MySQL')}${c.nullable === false ? ' NOT NULL' : ''}`)
  return [
    `CREATE TABLE ${qCH(table)} (`,
    indent(lines.join(',\n')),
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ].join('\n')
}

function genOracle(table: string, cols: DuckCol[]): string {
  const lines = cols.map(c => `${qPG(c.name)} ${mapDuckToTarget(c.duckType, 'Oracle')}${c.nullable === false ? ' NOT NULL' : ''}`)
  return [
    `CREATE TABLE ${qPG(table)} (`,
    indent(lines.join(',\n')),
    `);`
  ].join('\n')
}

// MongoDB: JSON Schema draft for $jsonSchema validator (коллекция)
function genMongo(collection: string, cols: DuckCol[]): string {
  const propsLines = cols.map(c => {
    const t = mapDuckToTarget(c.duckType, 'MongoDB')
    const nullable = c.nullable !== false // по умолчанию allow null
    const oneOf = nullable ? `, "oneOf": [ { "bsonType": "${t}" }, { "bsonType": "null" } ]` : `, "bsonType": "${t}"`
    return `"${c.name}": { "description": "${c.duckType}"${oneOf} }`
  })
  return `db.createCollection("${collection}", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
${indent(propsLines.join(',\n'), 8)}
      }
    }
  }
});`
}

// Redis (RedisJSON): пример модели ключа и типов
function genRedis(prefix: string, cols: DuckCol[]): string {
  // Просто даём пример JSON-объекта и подсказки по типам
  const example: Record<string, any> = {}
  cols.forEach(c => {
    const t = mapDuckToTarget(c.duckType, 'Redis')
    example[c.name] = t.startsWith('number') ? 0 : t.startsWith('boolean') ? false : ''
  })
  return `# RedisJSON schema (recommendation)
# Key: ${prefix}:{id}
# Example value:
JSON.SET ${prefix}:{id} $ '${JSON.stringify(example)}'

# Search index example (RediSearch)
FT.CREATE idx_${prefix} ON JSON PREFIX 1 "${prefix}:" SCHEMA
${cols.map(c => `  $.${c.name} AS ${c.name} ${mapDuckToTarget(c.duckType, 'Redis').startsWith('number') ? 'NUMERIC' : 'TEXT'}`).join('\n')}`
}

// Neo4j: свойства узла + опциональное ограничение по id, если есть
function genNeo4j(label: string, cols: DuckCol[]): string {
  const hasId = cols.some(c => c.name.toLowerCase() === 'id')
  const props = cols.map(c => `${c.name}: "${mapDuckToTarget(c.duckType, 'Neo4j')}"`).join(', ')
  return `// Suggested node label: ${label}
${hasId ? `CREATE CONSTRAINT ${label}_id IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE;` : '// Add a unique constraint if applicable'}
/* Properties (recommendation):
{ ${props} }
*/
`
}

// --- main ---
export function generateDDL(tableOrCollection: string, cols: DuckCol[], targets: TargetDB[]): string {
  const chosen = targets.length ? targets : (TARGET_DBS as unknown as TargetDB[])
  const sections: string[] = []

  for (const t of chosen) {
    switch (t) {
      case 'ClickHouse':
        sections.push(`-- ClickHouse\n${genClickHouse(tableOrCollection, cols)}`)
        break
      case 'PostgreSQL':
        sections.push(`-- PostgreSQL\n${genPostgres(tableOrCollection, cols)}`)
        break
      case 'MySQL':
        sections.push(`-- MySQL\n${genMySQL(tableOrCollection, cols)}`)
        break
      case 'Oracle':
        sections.push(`-- Oracle\n${genOracle(tableOrCollection, cols)}`)
        break
      case 'MongoDB':
        sections.push(`-- MongoDB\n${genMongo(tableOrCollection, cols)}`)
        break
      case 'Redis':
        sections.push(`-- Redis (RedisJSON / RediSearch)\n${genRedis(tableOrCollection, cols)}`)
        break
      case 'Neo4j':
        sections.push(`-- Neo4j (Cypher)\n${genNeo4j(tableOrCollection, cols)}`)
        break
    }
  }

  return sections.join('\n\n') + '\n'
}
