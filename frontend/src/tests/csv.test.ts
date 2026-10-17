import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseCsvLeads(csvContent: string): { valid: string[]; duplicates: number } {
  const parsed = Papa.parse<string[]>(csvContent);
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of parsed.data) {
    if (Array.isArray(row)) {
      for (const cell of row) {
        if (typeof cell === 'string') {
          const cleaned = cell.trim().toLowerCase();
          if (EMAIL_REGEX.test(cleaned)) {
            if (seen.has(cleaned)) {
              duplicates++;
            } else {
              seen.add(cleaned);
            }
          }
        }
      }
    }
  }

  return { valid: Array.from(seen), duplicates };
}

describe('CSV Lead Parsing & Deduplication (Phase F18)', () => {
  it('parses valid emails from standard CSV row data', () => {
    const csv = `email,name\nalice@example.com,Alice\nbob@domain.io,Bob`;
    const result = parseCsvLeads(csv);
    expect(result.valid).toEqual(['alice@example.com', 'bob@domain.io']);
    expect(result.duplicates).toBe(0);
  });

  it('filters out invalid emails and non-email header fields', () => {
    const csv = `not-an-email,valid.person@reachinbox.ai,12345,admin@test.co.uk`;
    const result = parseCsvLeads(csv);
    expect(result.valid).toEqual(['valid.person@reachinbox.ai', 'admin@test.co.uk']);
  });

  it('deduplicates emails case-insensitively and counts duplicates removed', () => {
    const csv = `lead@example.com\nLEAD@EXAMPLE.COM\nLead@Example.Com\nother@example.com`;
    const result = parseCsvLeads(csv);
    expect(result.valid).toEqual(['lead@example.com', 'other@example.com']);
    expect(result.duplicates).toBe(2);
  });

  it('handles multi-column CSVs with whitespace and quotes', () => {
    const csv = `"First","Last","Email"\n"John","Doe","  john.doe@company.org  "`;
    const result = parseCsvLeads(csv);
    expect(result.valid).toEqual(['john.doe@company.org']);
  });
});
