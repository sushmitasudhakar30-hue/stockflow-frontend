# StockFlow Frontend

React + Vite single-page app for StockFlow inventory management. It talks to the
[StockFlow backend](../stockflow-backend) (Express + MongoDB) over a REST API with JWT login.

## Setup

1. Start the backend first (see its README) and run `npm run seed` there for demo data.
2. Copy `.env.example` to `.env` and set `VITE_API_URL` (default `http://localhost:5000/api`).
3. `npm install`
4. `npm run dev` → http://localhost:5173

In development the login page shows demo accounts (password `Stockflow@123` unless you changed `SEED_PASSWORD` in the backend):
`admin@stockflow.com`, `manager@stockflow.com`, `staff@stockflow.com`, `sales@stockflow.com`. They are hidden in production builds.

## How it works

- `src/api/http.js` – fetch wrapper: base URL from `VITE_API_URL`, adds `Authorization: Bearer <token>`, turns errors into readable messages, signs the user out on an expired token.
- `src/api/inventoryApi.js`, `orderApi.js`, `notificationApi.js` – one function per backend endpoint.
- `src/context/*` – state: `AuthContext` (login/session), `InventoryContext` (all data + actions), `NotificationContext`.
- Stock changes and order flows (confirm, cancel, return, delete, receive PO) run on the server, which returns the new stock quantities; the UI just displays them.
- Roles (Admin, Warehouse Manager, Inventory Staff, Sales Staff) control which pages show, and the server enforces them too.

## Scripts

- `npm run dev` – dev server
- `npm run build` – production build (`dist/`); set `VITE_API_URL` to your deployed API
- `npm run lint` – ESLint (note: many existing `react/prop-types` warnings still to clean up)

Never commit `.env`. The backend's `CLIENT_URL` must include this app's URL (CORS).
