import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useReveal, formatINR, formatDate } from '../utils/hooks';
import './Orders.css';

const STEPS = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
const ALL_STATUSES = [...STEPS, 'Cancelled', 'Returned'];
const PAGE_SIZES = [10, 25, 50];
const DELAY_DAYS = 3;                                   // Pending this long = "Delayed"
const CAN_CANCEL_ROLES = ['Admin', 'Warehouse Manager']; // Sales Staff can't cancel/return
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function downloadCsv(rows, filename) {
  const head = ['Order #', 'Customer', 'Date', 'Items', 'Total (INR)', 'Status'];
  const body = rows.map((o) => [o.orderNumber, o.customer, o.date, o.items.length, o.total, o.status]);
  const csv = [head, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({ customer: '', date: today(), items: [{ productId: '', qty: 1 }] });

export default function Orders() {
  const { products, warehouses, salesOrders, loading, confirmSalesOrder, updateSalesOrderStatus, addSalesOrder, updateSalesOrder, deleteSalesOrder, cancelSalesOrder, returnSalesOrder, getProductStockAt } = useInventory();
  const { user } = useAuth();

  const [filter, setFilter] = useState('all');
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmAction, setConfirmAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [ref, revealed] = useReveal();

  const canCancel = CAN_CANCEL_ROLES.includes(user?.role);
  const defaultWhId = warehouses[0]?.id;

  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;
  const getProductSku = (id) => products.find((p) => p.id === id)?.sku || '—';

  const filtered = useMemo(() => {
    const rows = salesOrders.filter((o) =>
      (filter === 'all' || o.status === filter) &&
      (!dateFrom || o.date >= dateFrom) &&
      (!dateTo || o.date <= dateTo)
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (o) => {
      switch (sort.key) {
        case 'orderNumber': return parseInt(String(o.orderNumber).replace(/\D/g, ''), 10) || 0;
        case 'customer': return o.customer.toLowerCase();
        case 'items': return o.items.length;
        case 'total': return o.total;
        case 'status': return ALL_STATUSES.indexOf(o.status);
        default: return o.date;
      }
    };
    return [...rows].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
  }, [salesOrders, filter, dateFrom, dateTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Back to page 1 whenever the filters change
  useEffect(() => { setPage(1); }, [filter, dateFrom, dateTo, pageSize]);

  const counts = ALL_STATUSES.reduce((acc, st) => ({ ...acc, [st]: salesOrders.filter((o) => o.status === st).length }), {});
  const liveOrders = salesOrders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned');
  const revenue = liveOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = liveOrders.length ? Math.round(revenue / liveOrders.length) : 0;
  const customers = [...new Set(salesOrders.map((o) => o.customer))].sort();
  const hasFilters = filter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setFilter('all'); setDateFrom(''); setDateTo(''); };

  const toggleSort = (key) => setSort((s0) => (s0.key === key ? { key, dir: s0.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'customer' ? 'asc' : 'desc' }));
  const sortMark = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');

  // The order shown in the details modal always reflects the latest saved status
  const liveDetail = detailOrder ? salesOrders.find((o) => o.id === detailOrder.id) || detailOrder : null;

  const getProduct = (id) => products.find((p) => p.id === id);
  // Same warehouse that Confirm deducts from, so the warning matches what will actually happen
  const availableFor = (id) => (defaultWhId ? getProductStockAt(id, defaultWhId) : 0);
  const formTotal = form.items.reduce((sum, it) => sum + (getProduct(it.productId)?.price || 0) * (Number(it.qty) || 0), 0);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setErrors({}); setCreateOpen(true); };
  const openEdit = (o) => {
    setEditingId(o.id);
    setForm({ customer: o.customer, date: o.date, items: o.items.map((it) => ({ productId: it.productId, qty: it.qty })) });
    setErrors({});
    setDetailOrder(null);
    setCreateOpen(true);
  };
  const closeForm = () => { setCreateOpen(false); setEditingId(null); };
  const setItem = (i, patch) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const addItemRow = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', qty: 1 }] }));
  const removeItemRow = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const validate = () => {
    const e = {};
    if (!form.customer.trim()) e.customer = 'Customer name is required';
    if (!form.date) e.date = 'Date is required';
    const ids = form.items.map((it) => it.productId);
    if (form.items.some((it) => !it.productId)) e.items = 'Select a product for every line';
    else if (new Set(ids).size !== ids.length) e.items = 'Each product can only be added once';
    else if (form.items.some((it) => !(Number(it.qty) > 0))) e.items = 'Quantity must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (ev) => {
    ev.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    const items = form.items.map((it) => ({ productId: it.productId, qty: Number(it.qty), price: getProduct(it.productId).price }));
    const payload = { customer: form.customer.trim(), date: form.date, items };
    const res = editingId ? await updateSalesOrder(editingId, payload) : await addSalesOrder(payload);
    setSaving(false);
    if (res.success) closeForm();
  };

  const ask = (cfg) => setConfirmAction(cfg);
  const runConfirmed = async () => {
    if (!confirmAction || acting) return;
    setActing(true);
    try { await confirmAction.run(); } finally { setActing(false); setConfirmAction(null); }
  };

  const nextAction = (o) => {
    if (o.status === 'Pending') return { label: 'Confirm', run: () => confirmSalesOrder(o.id, user?.name), cls: 'btn-primary' };
    if (o.status === 'Confirmed') return {
      label: 'Ship', cls: 'btn-ghost',
      run: () => updateSalesOrderStatus(o.id, 'Shipped'),
      confirm: { title: `Ship ${o.orderNumber}?`, message: `Mark this order for ${o.customer} as shipped.`, confirmLabel: 'Ship order' },
    };
    if (o.status === 'Shipped') return {
      label: 'Deliver', cls: 'btn-ghost',
      run: () => updateSalesOrderStatus(o.id, 'Delivered'),
      confirm: { title: `Mark ${o.orderNumber} delivered?`, message: `Confirm that ${o.customer} has received this order.`, confirmLabel: 'Mark delivered' },
    };
    return null;
  };
  const doNext = (o) => {
    const a = nextAction(o);
    if (!a) return;
    if (a.confirm) ask({ ...a.confirm, run: a.run });
    else a.run();
  };

  // Cancel (before shipping) and Return (after delivery) both put stock back
  const reverseAction = (o) => {
    if (!canCancel) return null;
    if (o.status === 'Pending' || o.status === 'Confirmed') return {
      label: 'Cancel order',
      title: `Cancel ${o.orderNumber}?`,
      message: o.status === 'Confirmed'
        ? 'This order is already confirmed, so its stock will be added back to the warehouse. This cannot be undone.'
        : 'This order has not been confirmed yet, so no stock is affected. This cannot be undone.',
      confirmLabel: 'Cancel order',
      run: () => cancelSalesOrder(o.id, user?.name),
    };
    if (o.status === 'Delivered') return {
      label: 'Mark returned',
      title: `Mark ${o.orderNumber} as returned?`,
      message: 'The items will be added back to stock in the warehouse. This cannot be undone.',
      confirmLabel: 'Mark returned',
      run: () => returnSalesOrder(o.id, user?.name),
    };
    return null;
  };

  const canEdit = (o) => o.status === 'Pending';
  const canDelete = () => canCancel; // the server only lets Admin / Warehouse Manager delete orders
  const holdsStock = (o) => ['Confirmed', 'Shipped', 'Delivered'].includes(o.status);
  const deleteAction = (o) => ({
    title: `Delete ${o.orderNumber}?`,
    message: holdsStock(o)
      ? `This permanently removes the order for ${o.customer}. Its items will be added back to stock in the warehouse. This cannot be undone.`
      : `This permanently removes the order for ${o.customer}. No stock is changed. This cannot be undone.`,
    confirmLabel: 'Delete order',
    run: async () => { const r = await deleteSalesOrder(o.id, user?.name); if (r.success) setDetailOrder(null); },
  });

  const statusVariant = { Pending: 'warning', Confirmed: 'primary', Shipped: 'teal', Delivered: 'success', Cancelled: 'danger', Returned: 'muted' };

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Sales Orders</h1>
          <p>Track and manage customer orders through fulfilment</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Order</button>
      </div>

      <div className="order-summary">
        {ALL_STATUSES.filter((st) => STEPS.includes(st) || counts[st] > 0).map((st) => (
          <button key={st} className={`order-summary-item ${filter === st ? 'active' : ''}`} onClick={() => setFilter(filter === st ? 'all' : st)}>
            <span className="order-summary-count">{counts[st]}</span>
            <span className="order-summary-label">{st}</span>
          </button>
        ))}
      </div>
      <div className="order-kpis">
        <span>Revenue <strong>{formatINR(revenue)}</strong></span>
        <span>Avg. order <strong>{formatINR(avgOrder)}</strong></span>
        <span className="text-muted">Excludes cancelled and returned orders</span>
      </div>

      <div ref={ref} className={`card reveal ${revealed ? 'revealed' : ''}`}>
        <div className="card-title">
          <span>Orders</span>
          <select className="form-select" style={{ width: 'auto', marginLeft: 'auto' }} aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            {ALL_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(filtered, `sales-orders-${today()}.csv`)} disabled={filtered.length === 0}>
            Export CSV
          </button>
        </div>

        <div className="order-filters">
          <label>From <input type="date" className="form-input" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label>To <input type="date" className="form-input" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
          {hasFilters && <button className="link-btn" onClick={clearFilters}>Clear filters</button>}
          <span className="text-muted order-filters-count">{filtered.length} order{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {[['orderNumber', 'Order #'], ['customer', 'Customer'], ['date', 'Date'], ['items', 'Items'], ['total', 'Total'], ['status', 'Status']].map(([key, label]) => (
                  <th key={key} aria-sort={ariaSort(key)}>
                    <button className="sort-btn" onClick={() => toggleSort(key)}>{label}{sortMark(key)}</button>
                  </th>
                ))}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((o) => {
                const next = nextAction(o);
                const delayed = o.status === 'Pending' && daysSince(o.date) >= DELAY_DAYS;
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>
                      <button className="link-btn" onClick={() => setDetailOrder(o)}>{o.orderNumber}</button>
                    </td>
                    <td>{o.customer}</td>
                    <td className="text-muted">{formatDate(o.date)}</td>
                    <td className="text-muted">{o.items.length} item{o.items.length > 1 ? 's' : ''}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(o.total)}</td>
                    <td>
                      <Badge variant={statusVariant[o.status] || 'muted'}>{o.status}</Badge>
                      {delayed && <span className="delayed-tag" title={`Pending for ${daysSince(o.date)} days`}>Delayed</span>}
                    </td>
                    <td className="text-right">
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        {next && (
                          <button className={`btn ${next.cls} btn-sm`} onClick={() => doNext(o)}>
                            {next.label}
                          </button>
                        )}
                        {canEdit(o) && (
                          <button className="btn-icon" onClick={() => openEdit(o)} aria-label="Edit order" title="Edit order">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        )}
                        {canDelete(o) && (
                          <button className="btn-icon" onClick={() => ask(deleteAction(o))} aria-label="Delete order" title="Delete order" style={{ color: 'var(--danger, #dc2626)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" /></svg>
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => setInvoiceOrder(o)} aria-label="View invoice">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">{hasFilters ? 'No orders match these filters' : 'No orders found'}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="order-pager">
            <label className="text-muted">Rows
              <select className="form-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <span className="text-muted">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button>
              <span className="order-pager-page">Page {currentPage} / {totalPages}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create order modal */}
      <Modal
        open={createOpen}
        onClose={closeForm}
        title={editingId ? 'Edit Sales Order' : 'New Sales Order'}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Order'}</button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="order-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="so-customer">Customer</label>
              <input id="so-customer" list="so-customers" autoComplete="off" className="form-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Acme Traders" />
              <datalist id="so-customers">{customers.map((c) => <option key={c} value={c} />)}</datalist>
              {errors.customer && <div className="form-error">{errors.customer}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="so-date">Order Date</label>
              <input id="so-date" type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>
          </div>

          <div className="form-label">Items</div>
          {form.items.map((it, i) => {
            const avail = it.productId ? availableFor(it.productId) : null;
            const short = avail !== null && Number(it.qty) > avail;
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div className="order-item-row" style={{ marginBottom: 2 }}>
                  <select className="form-select" aria-label="Product" value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value })}>
                    <option value="">Select product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                  <input type="number" min="1" className="form-input" aria-label="Quantity" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
                  <div className="order-item-price">{formatINR((getProduct(it.productId)?.price || 0) * (Number(it.qty) || 0))}</div>
                  <button type="button" className="btn-icon" onClick={() => removeItemRow(i)} disabled={form.items.length === 1} aria-label="Remove item">✕</button>
                </div>
                {avail !== null && (
                  <div className={`stock-hint ${short ? 'short' : ''}`}>
                    {short
                      ? `Only ${avail} in stock — this order can't be confirmed until stock is added`
                      : `${avail} in stock`}
                  </div>
                )}
              </div>
            );
          })}
          {errors.items && <div className="form-error">{errors.items}</div>}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addItemRow}>+ Add item</button>
          <div className="invoice-total" style={{ marginTop: 16 }}>
            <span>Total</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatINR(formTotal)}</span>
          </div>
        </form>
      </Modal>

      {/* Order details + tracking modal */}
      <Modal
        open={!!liveDetail}
        onClose={() => setDetailOrder(null)}
        title={`Order — ${liveDetail?.orderNumber || ''}`}
        size="lg"
        footer={liveDetail && (
          <>
            <button className="btn btn-ghost" onClick={() => { setInvoiceOrder(liveDetail); setDetailOrder(null); }}>View Invoice</button>
            {canEdit(liveDetail) && (
              <button className="btn btn-ghost" onClick={() => openEdit(liveDetail)}>Edit</button>
            )}
            {canDelete(liveDetail) && (
              <button className="btn btn-danger" onClick={() => ask(deleteAction(liveDetail))}>Delete</button>
            )}
            {reverseAction(liveDetail) && (
              <button className="btn btn-danger" onClick={() => ask(reverseAction(liveDetail))}>{reverseAction(liveDetail).label}</button>
            )}
            {nextAction(liveDetail) && (
              <button className="btn btn-primary" onClick={() => doNext(liveDetail)}>{nextAction(liveDetail).label} Order</button>
            )}
          </>
        )}
      >
        {liveDetail && (
          <div>
            <div className="order-detail-meta">
              <div><span className="text-muted">Customer</span><strong>{liveDetail.customer}</strong></div>
              <div><span className="text-muted">Date</span><strong>{formatDate(liveDetail.date)}</strong></div>
              <div><span className="text-muted">Status</span><Badge variant={statusVariant[liveDetail.status] || 'muted'}>{liveDetail.status}</Badge></div>
            </div>

            {(liveDetail.status === 'Cancelled' || liveDetail.status === 'Returned') ? (
              <div className="order-banner">This order was {liveDetail.status.toLowerCase()}{liveDetail.status === 'Returned' ? ' and its items were added back to stock.' : '.'}</div>
            ) : (
            <div className="order-tracker" aria-label="Order tracking">
              {STEPS.map((st, i) => {
                const reached = i <= STEPS.indexOf(liveDetail.status);
                return (
                  <div key={st} className={`order-step ${reached ? 'reached' : ''}`}>
                    <div className="order-step-dot">{reached ? '✓' : i + 1}</div>
                    <div className="order-step-label">{st}</div>
                  </div>
                );
              })}
            </div>
            )}

            <table className="data-table" style={{ marginTop: 16 }}>
              <thead>
                <tr><th>SKU</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Subtotal</th></tr>
              </thead>
              <tbody>
                {liveDetail.items.map((it, i) => (
                  <tr key={i}>
                    <td>{getProductSku(it.productId)}</td>
                    <td>{getProductName(it.productId)}</td>
                    <td className="text-right">{it.qty}</td>
                    <td className="text-right">{formatINR(it.price)}</td>
                    <td className="text-right">{formatINR(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invoice-total">
              <span>Total</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatINR(liveDetail.total)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice preview modal */}
      <Modal
        open={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        title={`Invoice — ${invoiceOrder?.orderNumber || ''}`}
        size="lg"
        footer={<button className="btn btn-ghost" onClick={() => window.print()}>Print / PDF</button>}
      >
        {invoiceOrder && (
          <div className="invoice">
            <div className="invoice-header">
              <div>
                <div className="invoice-brand">StockFlow</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Smart Inventory Management</div>
              </div>
              <div className="text-right">
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{invoiceOrder.orderNumber}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>{formatDate(invoiceOrder.date)}</div>
              </div>
            </div>
            <div className="invoice-customer">
              <span className="text-muted">Bill To:</span>
              <span style={{ fontWeight: 600 }}>{invoiceOrder.customer}</span>
            </div>
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoiceOrder.items.map((it, i) => (
                  <tr key={i}>
                    <td>{getProductSku(it.productId)}</td>
                    <td>{getProductName(it.productId)}</td>
                    <td className="text-right">{it.qty}</td>
                    <td className="text-right">{formatINR(it.price)}</td>
                    <td className="text-right">{formatINR(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invoice-total">
              <span>Total</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatINR(invoiceOrder.total)}</span>
            </div>
            <div className="invoice-status">
              Status: <Badge variant={statusVariant[invoiceOrder.status] || 'muted'}>{invoiceOrder.status}</Badge>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        danger={confirmAction?.confirmLabel?.toLowerCase().includes('cancel') || confirmAction?.confirmLabel?.toLowerCase().includes('return') || confirmAction?.confirmLabel?.toLowerCase().includes('delete')}
        busy={acting}
        onConfirm={runConfirmed}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
