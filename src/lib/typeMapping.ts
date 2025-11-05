// src/lib/typeMapping.ts

// --- runtime список целевых СУБД ---
export const TARGET_DBS = [
  'ClickHouse',
  'PostgreSQL',
  'MySQL',
  'Oracle',
  'MongoDB',
  'Redis',
  'Neo4j',
] as const;

// --- тип из массива ---
export type TargetDB = typeof TARGET_DBS[number];

// --- общие хелперы ---
const U = (t: string) => (t || '').trim().toUpperCase();
const isDec = (t: string) => U(t).startsWith('DECIMAL');
const isTs64 = (t: string) => {
  const x = U(t);
  return (
    x.startsWith('TIMESTAMP_MS') ||
    x.startsWith('TIMESTAMP_NS') ||
    x.includes('_MS') ||
    x.includes('_NS')
  );
};

/* ---------- ClickHouse ---------- */
export function duckToCH(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'Decimal(38,9)';
  if (t.startsWith('TIMESTAMP')) return isTs64(t) ? 'DateTime64' : 'DateTime';
  const map: Record<string, string> = {
    BOOLEAN: 'String',
    TINYINT: 'Int8',
    SMALLINT: 'Int16',
    INTEGER: 'Int32',
    BIGINT: 'Int64',
    UTINYINT: 'Int8',
    USMALLINT: 'Int16',
    UINTEGER: 'Int32',
    UBIGINT: 'Int64',
    FLOAT: 'Float32',
    DOUBLE: 'Float64',
    DATE: 'Date',
    VARCHAR: 'String',
    STRING: 'String',
    BLOB: 'String',
    UUID: 'UUID',
    JSON: 'String',
    STRUCT: 'Nested',
    LIST: 'Array(String)',
  };
  return map[t] ?? 'String';
}

/* ---------- PostgreSQL ---------- */
export function duckToPG(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'numeric(38,9)';
  if (t.startsWith('TIMESTAMP')) return isTs64(t) ? 'timestamp(6)' : 'timestamp';
  const map: Record<string, string> = {
    BOOLEAN: 'boolean',
    TINYINT: 'smallint',
    SMALLINT: 'smallint',
    INTEGER: 'integer',
    BIGINT: 'bigint',
    UTINYINT: 'smallint',
    USMALLINT: 'integer',
    UINTEGER: 'bigint',
    UBIGINT: 'numeric(20,0)',
    FLOAT: 'real',
    DOUBLE: 'double precision',
    DATE: 'date',
    VARCHAR: 'text',
    STRING: 'text',
    BLOB: 'bytea',
    UUID: 'uuid',
    JSON: 'jsonb',
    STRUCT: 'jsonb',
    LIST: 'jsonb',
  };
  return map[t] ?? 'text';
}

/* ---------- MySQL ---------- */
export function duckToMySQL(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'decimal(38,9)';
  if (t.startsWith('TIMESTAMP')) return isTs64(t) ? 'timestamp(6)' : 'timestamp';
  const map: Record<string, string> = {
    BOOLEAN: 'tinyint(1)',
    TINYINT: 'tinyint',
    SMALLINT: 'smallint',
    INTEGER: 'int',
    BIGINT: 'bigint',
    UTINYINT: 'tinyint unsigned',
    USMALLINT: 'smallint unsigned',
    UINTEGER: 'int unsigned',
    UBIGINT: 'bigint unsigned',
    FLOAT: 'float',
    DOUBLE: 'double',
    DATE: 'date',
    VARCHAR: 'varchar(65535)',
    STRING: 'varchar(65535)',
    BLOB: 'blob',
    UUID: 'char(36)',
    JSON: 'json',
    STRUCT: 'json',
    LIST: 'json',
  };
  return map[t] ?? 'varchar(65535)';
}

/* ---------- Oracle ---------- */
export function duckToOracle(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'NUMBER(38,9)';
  if (t.startsWith('TIMESTAMP')) return isTs64(t) ? 'TIMESTAMP(6)' : 'TIMESTAMP';
  const map: Record<string, string> = {
    BOOLEAN: 'NUMBER(1)',
    TINYINT: 'NUMBER(3)',
    SMALLINT: 'NUMBER(5)',
    INTEGER: 'NUMBER(10)',
    BIGINT: 'NUMBER(19)',
    UTINYINT: 'NUMBER(3)',
    USMALLINT: 'NUMBER(5)',
    UINTEGER: 'NUMBER(10)',
    UBIGINT: 'NUMBER(20)',
    FLOAT: 'BINARY_FLOAT',
    DOUBLE: 'BINARY_DOUBLE',
    DATE: 'DATE',
    VARCHAR: 'VARCHAR2(4000)',
    STRING: 'VARCHAR2(4000)',
    BLOB: 'BLOB',
    UUID: 'VARCHAR2(36)',
    JSON: 'CLOB',
    STRUCT: 'CLOB',
    LIST: 'CLOB',
  };
  return map[t] ?? 'VARCHAR2(4000)';
}

/* ---------- MongoDB ---------- */
export function duckToMongo(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'decimal128';
  if (t.startsWith('TIMESTAMP')) return 'date';
  const map: Record<string, string> = {
    BOOLEAN: 'bool',
    TINYINT: 'int32',
    SMALLINT: 'int32',
    INTEGER: 'int32',
    BIGINT: 'int64',
    UTINYINT: 'int32',
    USMALLINT: 'int32',
    UINTEGER: 'int64',
    UBIGINT: 'decimal128',
    FLOAT: 'double',
    DOUBLE: 'double',
    DATE: 'date',
    VARCHAR: 'string',
    STRING: 'string',
    BLOB: 'binData',
    UUID: 'uuid',
    JSON: 'object',
    STRUCT: 'object',
    LIST: 'array',
  };
  return map[t] ?? 'string';
}

/* ---------- Redis ---------- */
export function duckToRedis(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'number';
  if (t.startsWith('TIMESTAMP') || t === 'DATE') return 'string(ISO8601)';
  const map: Record<string, string> = {
    BOOLEAN: 'boolean',
    TINYINT: 'number',
    SMALLINT: 'number',
    INTEGER: 'number',
    BIGINT: 'number',
    UTINYINT: 'number',
    USMALLINT: 'number',
    UINTEGER: 'number',
    UBIGINT: 'number',
    FLOAT: 'number',
    DOUBLE: 'number',
    VARCHAR: 'string',
    STRING: 'string',
    BLOB: 'string(base64)',
    UUID: 'string',
    JSON: 'object',
    STRUCT: 'object',
    LIST: 'array',
  };
  return map[t] ?? 'string';
}

/* ---------- Neo4j ---------- */
export function duckToNeo4j(duck: string): string {
  const t = U(duck);
  if (isDec(t)) return 'Float';
  if (t.startsWith('TIMESTAMP')) return 'DateTime';
  const map: Record<string, string> = {
    BOOLEAN: 'Boolean',
    TINYINT: 'Integer',
    SMALLINT: 'Integer',
    INTEGER: 'Integer',
    BIGINT: 'Integer',
    UTINYINT: 'Integer',
    USMALLINT: 'Integer',
    UINTEGER: 'Integer',
    UBIGINT: 'Float',
    FLOAT: 'Float',
    DOUBLE: 'Float',
    DATE: 'Date',
    VARCHAR: 'String',
    STRING: 'String',
    BLOB: 'String',
    UUID: 'String',
    JSON: 'Map',
    STRUCT: 'Map',
    LIST: 'List<String>',
  };
  return map[t] ?? 'String';
}

/* ---------- универсальная точка входа ---------- */
export function mapDuckToTarget(duck: string, target: TargetDB): string {
  switch (target) {
    case 'ClickHouse': return duckToCH(duck);
    case 'PostgreSQL': return duckToPG(duck);
    case 'MySQL': return duckToMySQL(duck);
    case 'Oracle': return duckToOracle(duck);
    case 'MongoDB': return duckToMongo(duck);
    case 'Redis': return duckToRedis(duck);
    case 'Neo4j': return duckToNeo4j(duck);
    default: return duckToCH(duck);
  }
}
