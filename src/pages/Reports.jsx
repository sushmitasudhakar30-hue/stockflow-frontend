import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import Tabs from '../components/Tabs';
import StockReport from './reports/StockReport';
import SalesReport from './reports/SalesReport';
import PurchaseReport from './reports/PurchaseReport';
import WarehouseReport from './reports/WarehouseReport';
import './Reports.css';

const ALL_TABS = [
  { id: 'stock', label: 'Stock Reports', roles: null },
  { id: 'sales', label: 'Sales Reports', roles: null },
  { id: 'purchase', label: 'Purchase Reports', roles: ['Admin', 'Warehouse Manager'] },
  { id: 'warehouse', label: 'Warehouse Reports', roles: ['Admin', 'Warehouse Manager'] },
];

export default function Reports() {
  const { user } = useAuth();
  const { loading } = useInventory();
  const [params, setParams] = useSearchParams();

  const tabs = ALL_TABS.filter((t) => !t.roles || t.roles.includes(user?.role));
  const requested = params.get('tab');
  const tab = tabs.some((t) => t.id === requested) ? requested : tabs[0].id;

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Reporting</h1>
          <p>Stock, sales, purchase and warehouse analytics</p>
        </div>
        <div className="flex gap-8 no-print">
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
            Print / PDF
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />

      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />
      ) : (
        <>
          {tab === 'stock' && <StockReport />}
          {tab === 'sales' && <SalesReport />}
          {tab === 'purchase' && <PurchaseReport />}
          {tab === 'warehouse' && <WarehouseReport />}
        </>
      )}
    </div>
  );
}
