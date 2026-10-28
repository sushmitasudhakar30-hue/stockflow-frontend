import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './Charts.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  BarController, LineController, DoughnutController, Filler, Tooltip, Legend
);

const gridColor = () => {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
};

const tickColor = () => {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? '#8893a8' : '#7b8496';
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { font: { size: 11 }, color: tickColor(), usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(28,34,48,0.9)',
      padding: 12,
      cornerRadius: 6,
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
    },
  },
  animation: { duration: 800, easing: 'easeOutQuart' },
};

/* ---- Stock In vs Stock Out (area + line combo) ---- */
export function StockInOutChart({ movements }) {
  const last7Days = getLast7Days(movements);

  const data = {
    labels: last7Days.labels,
    datasets: [
      {
        label: 'Stock In',
        data: last7Days.stockIn,
        borderColor: '#1f9d6b',
        backgroundColor: 'rgba(31,157,107,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#1f9d6b',
      },
      {
        label: 'Stock Out',
        data: last7Days.stockOut,
        borderColor: '#d64545',
        backgroundColor: 'rgba(214,69,69,0.10)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#d64545',
      },
    ],
  };

  const options = {
    ...baseOptions,
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: tickColor() } },
      x: { grid: { display: false }, ticks: { color: tickColor() } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Line data={data} options={options} />
    </div>
  );
}

/* ---- Stock Value Trend (area) ---- */
export function StockValueTrendChart({ products = [], movements = [] }) {
  const trend = getStockValueTrend(products, movements);
  const data = {
    labels: trend.labels,
    datasets: [
      {
        label: 'Stock Value (₹)',
        data: trend.values,
        borderColor: '#6b4fbb',
        backgroundColor: 'rgba(107,79,187,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#6b4fbb',
      },
    ],
  };

  const options = {
    ...baseOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor() },
        ticks: {
          color: tickColor(),
          callback: (val) => `₹${(val / 1000).toFixed(0)}k`,
        },
      },
      x: { grid: { display: false }, ticks: { color: tickColor() } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Line data={data} options={options} />
    </div>
  );
}

/* ---- Sales vs Units Sold (bar + line combo) ---- */
export function SalesUnitsChart({ salesOrders }) {
  const monthly = getMonthlySales(salesOrders);

  const data = {
    labels: monthly.labels,
    datasets: [
      {
        type: 'bar',
        label: 'Sales (₹)',
        data: monthly.revenue,
        backgroundColor: 'rgba(107,79,187,0.7)',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Units Sold',
        data: monthly.units,
        borderColor: '#f2b705',
        backgroundColor: '#f2b705',
        tension: 0.35,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    ...baseOptions,
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        grid: { color: gridColor() },
        ticks: {
          color: tickColor(),
          callback: (val) => `₹${(val / 1000).toFixed(0)}k`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: tickColor() },
      },
      x: { grid: { display: false }, ticks: { color: tickColor() } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Bar data={data} options={options} />
    </div>
  );
}

/* ---- Category Distribution (doughnut) ---- */
export function CategoryChart({ products }) {
  const categoryTotals = {};
  products.forEach((p) => {
    const total = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
    categoryTotals[p.category] = (categoryTotals[p.category] || 0) + total;
  });

  const data = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: ['#6b4fbb', '#7fd1d9', '#f2b705', '#1f9d6b'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    ...baseOptions,
    cutout: '60%',
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, position: 'right' },
    },
  };

  return (
    <div className="chart-wrapper chart-doughnut">
      <Doughnut data={data} options={options} />
    </div>
  );
}

/* ---- Helpers ---- */
function getLast7Days(movements) {
  const days = [];
  const labels = [];
  const stockIn = [];
  const stockOut = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    const inQty = movements
      .filter((m) => m.type === 'Stock In' && m.date?.startsWith(dateStr))
      .reduce((s, m) => s + m.qty, 0);
    const outQty = movements
      .filter((m) => (m.type === 'Stock Out' || m.type === 'Damaged') && m.date?.startsWith(dateStr))
      .reduce((s, m) => s + m.qty, 0);
    stockIn.push(inQty);
    stockOut.push(outQty);
  }

  return { labels, stockIn, stockOut };
}

// Last `count` calendar months ending with the current one, oldest first: [{ key: 'YYYY-MM', label: 'Oct', end: Date }]
function lastMonths(count) {
  const now = new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = i === 0 ? now : new Date(first.getFullYear(), first.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: first.toLocaleDateString('en-IN', { month: 'short' }), end });
  }
  return out;
}

// Stock value at the end of each of the last 6 months, rebuilt from the server data: start from today's stock and
// undo every movement that happened after that month-end (valued at current prices; transfers don't change the total).
function getStockValueTrend(products, movements) {
  const months = lastMonths(6);
  const priceById = Object.fromEntries(products.map((p) => [p.id, p.price]));
  const currentValue = products.reduce(
    (sum, p) => sum + Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0) * p.price,
    0
  );
  const values = months.map(({ end }) => {
    let value = currentValue;
    for (const m of movements) {
      const price = priceById[m.productId];
      if (price === undefined || new Date(m.date) <= end) continue;
      if (m.type === 'Stock In') value -= m.qty * price;
      else if (m.type === 'Stock Out' || m.type === 'Damaged') value += m.qty * price;
    }
    return Math.max(0, value);
  });
  return { labels: months.map((m) => m.label), values };
}

// Revenue and units per month for the last 3 months; cancelled / returned orders don't count.
function getMonthlySales(salesOrders) {
  const months = lastMonths(3);
  const revenue = months.map(() => 0);
  const units = months.map(() => 0);

  salesOrders.forEach((o) => {
    if (o.status === 'Cancelled' || o.status === 'Returned') return;
    const idx = months.findIndex((m) => m.key === String(o.date).slice(0, 7));
    if (idx >= 0) {
      revenue[idx] += o.total;
      units[idx] += o.items.reduce((s, i) => s + i.qty, 0);
    }
  });

  return { labels: months.map((m) => m.label), revenue, units };
}
