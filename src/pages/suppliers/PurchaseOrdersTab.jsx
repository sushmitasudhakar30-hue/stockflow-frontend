import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import { formatINR, formatDate } from '../../utils/hooks';

export default function PurchaseOrdersTab() {
  const { products, suppliers, purchaseOrders, loading, markPOReceived } = useInventory();
  const { user } = useAuth();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';

  const [poFilter, setPoFilter] = useState('all');

  const getSupplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';
  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;

  const filteredPOs = poFilter === 'all' ? purchaseOrders : purchaseOrders.filter((p) => p.status === poFilter);

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      {/* Purchase Orders */}
      <div className="card">
        <div className="card-title">
          <span>Purchase Orders</span>
          <select className="form-select" style={{ width: 'auto', marginLeft: 'auto' }} value={poFilter} onChange={(e) => setPoFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
          </select>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                  <td>{getSupplierName(po.supplierId)}</td>
                  <td className="text-muted">{formatDate(po.date)}</td>
                  <td>{po.items.map((it) => `${getProductName(it.productId)} ×${it.qty}`).join(', ')}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(po.total)}</td>
                  <td><Badge variant={po.status === 'Received' ? 'success' : 'warning'}>{po.status}</Badge></td>
                  <td className="text-right">
                    {canEdit && po.status === 'Pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => markPOReceived(po.id, user?.name)}>
                        Mark Received
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPOs.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No purchase orders found</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
