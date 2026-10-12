# Geocrete Construction Dashboard

An authenticated construction-site administration dashboard for managing sites, suppliers, expenses, and application-recorded bank balances. The frontend uses React and Vite; the API uses Express, Mongoose, and MongoDB Atlas.

> Recording an expense updates the application's bank-balance record only. It does not initiate or confirm a real bank transfer.

## Features

- JWT-protected administrator login
- Construction-site, supplier, material, labour, and client-payment management
- Expense records with server-calculated totals: `quantity × ratePerUnit`
- Paid, pending, and failed expense statuses
- Dynamic bank-account cards and a bank-account management page
- Transactional deduction from the selected active bank account for paid non-cash expenses
- Recent expenses, site summaries, dashboard totals, and responsive React UI

## Tech stack

- Frontend: React 19, Vite, React Router
- Backend: Node.js, Express 5, Mongoose 9
- Database: MongoDB Atlas
- Authentication: JSON Web Tokens and bcrypt

## Project structure

```text
frontend/             React + Vite application
  src/App.jsx         Dashboard pages and UI
  src/services/api.js Authenticated API helper
backend/              Express API
  models/             Mongoose models
  controllers/        Request handling and validation
  routes/             Protected API routes
  middleware/         JWT authentication and error handling
  scripts/            Optional seed and administrator setup scripts
```

## Local setup

### Prerequisites

- Node.js 20 or later
- A MongoDB Atlas cluster configured as a replica set
- An Atlas database user and a Network Access rule for your development IP

### Backend

```sh
cd backend
cp .env.example .env
npm install
npm run create-admin
npm run dev
```

Set these values in `backend/.env` before starting the API:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
FRONTEND_URL=http://localhost:5173
JWT_SECRET=a_long_random_secret
ADMIN_NAME=Dashboard Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a_strong_password
```

Never commit `.env`, database credentials, JWT secrets, or bank account numbers. If an Atlas password has special characters, percent-encode it in the connection string.

### Frontend

```sh
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:5000/api` in `frontend/.env` when using the default backend port.

Open the Vite URL shown in the terminal, then log in using the administrator credentials configured above.

## Bank account management

Open **Bank Accounts** from the sidebar to create and manage accounts used by the application.

- Only a bank name, account type, balance, active status, and the final four account digits are stored.
- Full account numbers and credentials are never stored or returned by the API.
- A new account's balance is its authorised opening balance.
- Ordinary edits can change only the bank name, account identifier, and account type.
- Activate or deactivate accounts separately. Inactive accounts cannot be selected for paid non-cash expenses.
- Later balance changes occur only through the validated expense workflow.

Do not add demonstration accounts or balances to a production database. Enter genuine account information through the protected Bank Accounts page.

## Expense and balance rules

The backend calculates `totalAmount` and never trusts a client-supplied total.

- **Paid + non-cash:** requires an active bank account and unique `deductionReference`; the expense and selected-account deduction are committed in one MongoDB transaction.
- **Pending / Failed:** the expense is saved without a balance deduction.
- **Cash:** the expense is saved without a bank-account reference or deduction.
- **Insufficient funds, invalid references, inactive accounts, invalid values, and duplicate payment references:** rejected by the API.

MongoDB transactions require a replica set. Atlas deployments support this. If transactions are unavailable, paid bank expenses are rejected instead of risking an inconsistent balance.

## API overview

All routes except health check and login require `Authorization: Bearer <token>`.

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Authentication | `POST /api/auth/login`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard/summary`, `/bank-accounts`, `/recent-expenses` |
| Bank accounts | `GET/POST /api/bank-accounts`, `PATCH /api/bank-accounts/:id`, `PATCH /api/bank-accounts/:id/status` |
| Sites | `GET/POST /api/sites`, `GET/PATCH/DELETE /api/sites/:id` |
| Site details | `GET /api/sites/:id/summary`, `/expenses`, `/materials`, `/labour`, `/payments`, `/suppliers` |
| Expenses | `GET/POST /api/expenses`, `GET/PATCH/DELETE /api/expenses/:id` |
| Resources | CRUD under `/api/suppliers`, `/api/materials`, `/api/labour`, and `/api/payments` |

Successful responses follow `{ success, message, data, pagination? }`.

## Optional demo seed

```sh
cd backend
npm run seed
```

The seed script upserts its named fictional site and supplier records; it does not remove unrelated records. It does not create bank accounts. Do not use it against production data.

## Checks

```sh
cd backend && npm test
cd frontend && npm run lint
cd frontend && npm run build
```

`backend/npm test` performs a server syntax check. A live end-to-end check also requires valid Atlas connectivity, an administrator account, and genuine bank-account records.
