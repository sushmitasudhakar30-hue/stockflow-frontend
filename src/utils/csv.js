/* Download rows as a CSV file. headers: string[], rows: any[][] */
export function downloadCSV(filename, headers, rows) {
  const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
