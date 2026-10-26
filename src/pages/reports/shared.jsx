/* Small building blocks shared by the report tabs */
export function FilterBar({ children, onExport, canExport = true }) {
  return (
    <div className="card no-print" style={{ marginBottom: 20 }}>
      <div className="reports-filters" style={{ alignItems: 'flex-end' }}>
        {children}
        <button className="btn btn-ghost" onClick={onExport} disabled={!canExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Download CSV
        </button>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export function DateRange({ from, to, setFrom, setTo }) {
  return (
    <>
      <Field label="From Date"><input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
      <Field label="To Date"><input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
    </>
  );
}

export const inRange = (date, from, to) => {
  const d = String(date || '').slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
};

export function ReportTable({ title, columns, rows, empty = 'No records found for the selected filters' }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title">{title}</div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>{columns.map((c) => <th key={c.label} className={c.right ? 'text-right' : ''}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.label} className={c.right ? 'text-right' : ''}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={columns.length}><div className="empty-state">{empty}</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
