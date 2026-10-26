import { useSearchParams } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import Tabs from '../components/Tabs';
import SupplierManagement from './suppliers/SupplierManagement';
import PurchaseOrdersTab from './suppliers/PurchaseOrdersTab';
import PurchaseHistory from './suppliers/PurchaseHistory';

const TAB_IDS = ['management', 'orders', 'history'];

export default function Suppliers() {
  const { suppliers, purchaseOrders } = useInventory();
  const [params, setParams] = useSearchParams();
  const tab = TAB_IDS.includes(params.get('tab')) ? params.get('tab') : 'management';

  const tabs = [
    { id: 'management', label: 'Supplier Management', count: suppliers.length },
    { id: 'orders', label: 'Purchase Orders', count: purchaseOrders.filter((p) => p.status === 'Pending').length || undefined },
    { id: 'history', label: 'Purchase History' },
  ];

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Suppliers</h1>
        <p>Manage suppliers, track purchase orders and review purchase history</p>
      </div>
      <Tabs tabs={tabs} active={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
      {tab === 'management' && <SupplierManagement />}
      {tab === 'orders' && <PurchaseOrdersTab />}
      {tab === 'history' && <PurchaseHistory />}
    </div>
  );
}
