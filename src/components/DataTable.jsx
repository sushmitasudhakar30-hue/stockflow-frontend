import { useState, useMemo, Fragment } from 'react';
import './DataTable.css';

export default function DataTable({
  columns,
  data,
  searchable = false,
  searchKeys = [],
  sortable = false,
  filterable = false,
  filterKey = '',
  filterOptions = [],
  emptyMessage = 'No data available',
  renderExpandedRow,
  actions,
}) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterValue, setFilterValue] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);

  const processed = useMemo(() => {
    let result = [...data];

    // Filter
    if (filterable && filterValue !== 'all') {
      result = result.filter((row) => row[filterKey] === filterValue);
    }

    // Search
    if (searchable && search) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const val = row[key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortable && sortField) {
      result.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, sortField, sortDir, filterValue, searchable, sortable, filterable, filterKey, searchKeys]);

  const handleSort = (field) => {
    if (!sortable) return;
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="data-table-container">
      {(searchable || filterable) && (
        <div className="data-table-toolbar">
          {searchable && (
            <input
              type="text"
              className="form-input data-table-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search table"
            />
          )}
          {filterable && (
            <select
              className="form-select data-table-filter"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              aria-label="Filter"
            >
              <option value="all">All</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              {actions && <th className="text-right">Actions</th>}
              {renderExpandedRow && <th style={{ width: 36 }} />}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0) + (renderExpandedRow ? 1 : 0)}>
                  <div className="empty-state">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              processed.map((row, idx) => {
                const rowKey = row.id || idx;
                return (
                <Fragment key={rowKey}>
                  <tr
                    onClick={() => renderExpandedRow && setExpandedRow(expandedRow === rowKey ? null : rowKey)}
                    className={renderExpandedRow ? 'expandable-row' : ''}
                  >
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                    {actions && <td className="text-right">{actions(row)}</td>}
                    {renderExpandedRow && (
                      <td className="expand-toggle">
                        {expandedRow === rowKey ? '▾' : '▸'}
                      </td>
                    )}
                  </tr>
                  {renderExpandedRow && expandedRow === rowKey && (
                    <tr className="expanded-row">
                      <td colSpan={columns.length + (actions ? 1 : 0) + 1}>
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
