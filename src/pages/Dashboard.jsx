import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import KpiCard from '../components/KpiCard';
import Badge from '../components/Badge';
import { StockInOutChart, StockValueTrendChart, SalesUnitsChart } from '../components/Charts';
import { useReveal, formatINR, formatDate } from '../utils/hooks';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { products, movements, salesOrders, loading, getProductTotalStock, stockValue, lowStockItems, pendingOrders } = useInventory();

  const [chartRef1, rev1] = useReveal();
  const [chartRef2, rev2] = useReveal();
  const [chartRef3, rev3] = useReveal();
  const [bottomRef, rev4] = useReveal();

  const ordersToShip = useMemo(
    () => salesOrders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed'),
    [salesOrders]
  );

  const recentMovements = useMemo(
    () => [...movements].slice(0, 6),
    [movements]
  );

  if (loading) {
    return (
      <div className="page-fade">
        <div className="kpi-grid">
          {[0,1,2,3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
        <div className="charts-grid">
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade">
      {/* Page header */}
      <div className="page-header page-header-row">
        <div>
          <h1>Hi {user?.name?.split(' ')[0]},</h1>
          <p>Here's what's happening across your warehouses today.</p>
        </div>
        <select className="form-select" style={{ width: 'auto' }} defaultValue="30">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <KpiCard label="Total Products" value={products.length} variant="primary" delay={0}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <KpiCard label="Stock Value" value={stockValue} type="currency" variant="teal" delay={80}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
        />
        <KpiCard label="Low Stock Items" value={lowStockItems.length} variant="amber" delay={160}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>}
        />
        <KpiCard label="Pending Orders" value={pendingOrders.length} variant="danger" delay={240}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div ref={chartRef1} className={`card reveal ${rev1 ? 'revealed' : ''}`}>
          <div className="card-title">Stock In vs Stock Out</div>
          <StockInOutChart movements={movements} />
        </div>
        <div ref={chartRef2} className={`card reveal ${rev2 ? 'revealed' : ''}`} style={{ transitionDelay: '100ms' }}>
          <div className="card-title">Stock Value Trend</div>
          <StockValueTrendChart />
        </div>
      </div>

      <div className="charts-grid">
        <div ref={chartRef3} className={`card reveal ${rev3 ? 'revealed' : ''}`}>
          <div className="card-title">Sales vs Units Sold</div>
          <SalesUnitsChart salesOrders={salesOrders} />
        </div>
      </div>

      {/* Bottom: orders to ship + recent movements */}
      <div ref={bottomRef} className={`dashboard-bottom reveal ${rev4 ? 'revealed' : ''}`}>
        {/* Orders to ship */}
        <div className="card">
          <div className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM18.5 18.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Orders to Ship
          </div>
          <div className="orders-ship-list">
            {ordersToShip.length === 0 ? (
              <div className="empty-state">No pending orders</div>
            ) : (
              ordersToShip.map((o) => {
                const isOverdue = new Date(o.date) < new Date(Date.now() - 2 * 86400000);
                return (
                  <div key={o.id} className="order-ship-item">
                    <div className="order-ship-info">
                      <span className="order-ship-num">{o.orderNumber}</span>
                      <span className="order-ship-customer">{o.customer}</span>
                      {isOverdue && <span className="order-overdue">Overdue</span>}
                    </div>
                    <div className="order-ship-right">
                      <Badge variant={o.status === 'Confirmed' ? 'primary' : 'warning'}>{o.status}</Badge>
                      <span className="order-ship-amount">{formatINR(o.total)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent stock movements */}
        <div className="card">
          <div className="card-title">Recent Stock Movements</div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m) => {
                  const product = products.find((p) => p.id === m.productId);
                  const typeVariant = {
                    'Stock In': 'success',
                    'Stock Out': 'danger',
                    'Transfer': 'teal',
                    'Damaged': 'warning',
                  }[m.type] || 'muted';
                  return (
                    <tr key={m.id}>
                      <td><Badge variant={typeVariant}>{m.type}</Badge></td>
                      <td>{product?.name || '—'}</td>
                      <td>{m.qty}</td>
                      <td className="text-muted">{formatDate(m.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
