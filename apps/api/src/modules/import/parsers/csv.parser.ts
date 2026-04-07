import Papa from 'papaparse';

export interface CsvParseResult {
  headers: string[];
  data: string[][];
  detectedDelimiter: string;
}

/**
 * Parse CSV content with auto-delimiter detection.
 *
 * Features:
 * - Strips UTF-8 BOM (\uFEFF) from start of content
 * - Auto-detects comma, semicolon, tab delimiters (via PapaParse)
 * - Supports explicit delimiter override
 * - Handles quoted fields containing delimiters
 * - Returns headers as first row, data as remaining rows
 */
export function parseCsv(content: string, delimiter?: string): CsvParseResult {
  // Strip UTF-8 BOM
  const cleanContent = content.replace(/^\uFEFF/, '');

  const result = Papa.parse<string[]>(cleanContent, {
    delimiter: delimiter ?? '',
    skipEmptyLines: true,
  });

  const allRows = result.data;
  const headers = allRows.length > 0 ? allRows[0] : [];
  const data = allRows.length > 1 ? allRows.slice(1) : [];

  return {
    headers,
    data,
    detectedDelimiter: delimiter ?? result.meta.delimiter,
  };
}
