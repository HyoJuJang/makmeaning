export const CATALOG_COLUMNS = ['prd_id', 'view_name', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm', 'brand_name', 'discprice', 'domain'];

/** RFC 4180-style parser: preserves string IDs, embedded commas, quotes and newlines. */
export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const endField = () => { row.push(field); field = ''; closed = false; };
  const endRow = () => { endField(); if (row.some(value => value !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',') endField();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else if (closed) throw new Error('Unexpected text after closing CSV quote');
    else if (c === '"') { if (field.length) throw new Error('Unexpected CSV quote'); quoted = true; }
    else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field.length || row.length || closed) endRow();
  const headers = rows.shift();
  if (!headers || new Set(headers).size !== headers.length) throw new Error('Missing or duplicate CSV headers');
  return { headers, rows: rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${i + 2}: expected ${headers.length} columns, got ${values.length}`);
    return Object.fromEntries(headers.map((key, index) => [key, values[index]]));
  }) };
}

export function writeCsv(headers, rows) {
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return '\uFEFF' + [headers, ...rows.map(row => headers.map(key => row[key]))].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function validateCatalog({ headers, rows }) {
  if (JSON.stringify(headers) !== JSON.stringify(CATALOG_COLUMNS)) throw new Error('Catalog must preserve the original nine-column schema');
  const seen = new Set();
  for (const row of rows) {
    if (!/^\d+$/.test(row.prd_id)) throw new Error(`Invalid product ID: ${row.prd_id}`);
    if (seen.has(row.prd_id)) throw new Error(`Duplicate product ID: ${row.prd_id}`);
    seen.add(row.prd_id);
    if (!['fashion', 'living', 'food', 'beauty'].includes(row.domain)) throw new Error(`Invalid domain for ${row.prd_id}`);
    if (!/^\d+$/.test(row.discprice) || Number(row.discprice) <= 0) throw new Error(`Invalid price for ${row.prd_id}`);
    if (!row.view_name.trim()) throw new Error(`Missing product name for ${row.prd_id}`);
  }
  return seen;
}
