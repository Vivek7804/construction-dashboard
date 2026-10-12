import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";
import { api } from "./services/api";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
const displayDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
const mapSite = (site) => ({
  ...site,
  id: site._id || site.id,
  date: site.date || displayDate(site.startDate),
  spent: site.spent || 0,
});
const mapExpense = (expense) => ({
  ...expense,
  id: expense._id || expense.id,
  siteId: expense.site?._id || expense.site || expense.siteId,
  supplier: expense.supplier?.name || expense.supplier || "—",
  amount: expense.totalAmount ?? expense.amount ?? 0,
  paid: expense.paidAmount ?? expense.paid ?? 0,
  date: displayDate(expense.date),
});
const newDeductionReference = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const Status = ({ value }) => (
  <span className={`status ${value.toLowerCase().replace(" ", "-")}`}>
    {value}
  </span>
);
function ProtectedRoute({ children }) {
  const location = useLocation();
  return localStorage.getItem("adminToken") ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.login({ email, password });
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("adminName", response.data.admin.name);
      nav(location.state?.from?.pathname || "/", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span>G</span>
          <b>
            GEOCRETE<small>ARCH GROUP</small>
          </b>
        </div>
        <h1>Admin login</h1>
        <p>Sign in to manage construction projects and finances.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="admin@company.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary save" disabled={saving}>
            {saving ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar() {
  const nav = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Administrator";
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const items = [
    ["▦", "Dashboard", "/"],
    ["▣", "Sites", "/sites"],
    ["▤", "Bank Accounts", "/bank-accounts"],
  ];
  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    nav("/login", { replace: true });
  }
  return (
    <aside className="sidebar">
      <div className="brand">
        <span>G</span>
        <b>
          GEOCRETE<small>ARCH GROUP</small>
        </b>
      </div>
      <nav>
        {items.map(([i, n, p]) =>
          p ? (
            <NavLink key={n} end to={p}>
              <i>{i}</i>
              {n}
            </NavLink>
          ) : (
            <a key={n} href="#coming">
              <i>{i}</i>
              {n}
              {n === "Payments" && <em>3</em>}
            </a>
          ),
        )}
      </nav>
      <div className="help">
        ?
        <div>
          <b>Need help?</b>
          <small>Contact support</small>
        </div>
      </div>
      <div className="profile">
        <span>{initials}</span>
        <div>
          <b>{adminName}</b>
          <small>Administrator</small>
        </div>
      </div>
      <button className="logout" type="button" onClick={logout}>
        <span aria-hidden="true">↪</span> Log out
      </button>
    </aside>
  );
}
function Header() {
  return (
    <header>
      <div className="search">
        ⌕<input placeholder="Search sites, clients, suppliers..." />
      </div>
      <div className="actions">
        {/* <button className="text" onClick={() => nav("/")}>
          ＋ Add Expense
        </button> */}
        {/* <button className="primary" onClick={() => nav("/sites")}>
          ＋ Add Site
        </button>
        <button className="bell">♧</button> */}
      </div>
    </header>
  );
}
function Layout({ children }) {
  return (
    <div className="shell">
      <Sidebar />
      <main>
        <Header />
        {children}
      </main>
    </div>
  );
}
function Bank({ account, color }) {
  return (
    <div className="bank" style={{ "--accent": color }}>
      <div>
        <strong>{account.bankName[0]}</strong>
        <span>{account.accountType || "Bank account"}</span>
      </div>
      <b>{account.bankName}</b>
      <small>
        {account.accountLastFour
          ? `Account ending in ${account.accountLastFour}`
          : "Account identifier unavailable"}
      </small>
      <p>
        Available balance<strong>{money(account.balance)}</strong>
      </p>
      <footer>
        {account.accountLastFour ? `•••• ${account.accountLastFour}` : "••••"}
        <b>{account.accountType || "ACTIVE"}</b>
      </footer>
    </div>
  );
}
function OverviewRow({ site }) {
  const nav = useNavigate(),
    used = Math.round((site.spent / site.budget) * 100);
  return (
    <div className="overview-row">
      <div className="site-name">
        <span className="building">▥</span>
        <div>
          <b>{site.name}</b>
          <small>⌖ {site.location}</small>
        </div>
        <Status value={site.status} />
      </div>
      <div className="util">
        <span>
          Budget utilisation <b>{used}%</b>
        </span>
        <div className="progress">
          <i style={{ width: `${used}%` }} />
        </div>
      </div>
      <div className="site-amount">
        <span>
          Spent <b>{money(site.spent)}</b>
        </span>
        <span>
          Remaining <b>{money(site.budget - site.spent)}</b>
        </span>
        <button onClick={() => nav(`/sites/${site.id}`)}>View site →</button>
      </div>
    </div>
  );
}
function Dashboard() {
  const nav = useNavigate();
  const [form, setForm] = useState({
      siteId: "",
      category: "Equipment & Machinery",
      description: "cement",
      quantity: "1",
      unit: "unit",
      rate: "5000",
      expenseDate: "2026-10-12",
      supplierId: "",
      paymentMethod: "Bank Transfer",
      bankAccountId: "",
      paymentStatus: "Paid",
      receiptNumber: "",
      deductionReference: newDeductionReference(),
    }),
    [message, setMessage] = useState(""),
    [liveSites, setLiveSites] = useState([]),
    [liveExpenses, setLiveExpenses] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [bankAccounts, setBankAccounts] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const total = (+form.quantity || 0) * (+form.rate || 0);
  const loadDashboardData = useCallback(async (options = {}) => {
    setLoading(true);
    try {
      const [siteResponse, supplierResponse, accountResponse, expenseResponse] =
        await Promise.all([
          api.sites({ limit: 100 }),
          api.suppliers({ limit: 100 }),
          api.activeBankAccounts(),
          api.recentExpenses(),
        ]);
      const sites = siteResponse.data.map(mapSite);
      const accounts = accountResponse.data;
      setLiveSites(sites);
      setSuppliers(supplierResponse.data);
      setBankAccounts(accounts);
      setLiveExpenses(expenseResponse.data.map(mapExpense));
      setForm((current) => ({
        ...current,
        siteId:
          current.siteId ||
          sites.find((site) => site.name === "Residential Building")?.id ||
          "",
        supplierId:
          current.supplierId ||
          supplierResponse.data.find(
            (supplier) => supplier.name === "ABC Building Materials",
          )?._id ||
          "",
        bankAccountId:
          current.bankAccountId ||
          accounts.find((account) => account.bankName === "HDFC Bank")?._id ||
          "",
      }));
      if (options.announceUnavailable) {
        const unavailable = [
          !sites.some((site) => site.name === "Residential Building") &&
            "Residential Building site",
          !supplierResponse.data.some(
            (supplier) => supplier.name === "ABC Building Materials",
          ) && "ABC Building Materials supplier",
          !accounts.some((account) => account.bankName === "HDFC Bank") &&
            "HDFC Bank account",
        ].filter(Boolean);
        if (unavailable.length)
          setMessage(`Example selection unavailable: ${unavailable.join(", ")}. Please choose an existing record.`);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboardData({ announceUnavailable: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);
  async function save(e) {
    e.preventDefault();
    if (
      !form.siteId ||
      !form.description.trim() ||
      !form.quantity ||
      !form.unit.trim() ||
      !form.rate ||
      !form.expenseDate ||
      total <= 0
    )
      return setMessage("Please complete all required expense details.");
    if (
      form.paymentStatus === "Paid" &&
      form.paymentMethod !== "Cash" &&
      !form.bankAccountId
    )
      return setMessage("Select a bank account for a paid non-cash expense.");
    setSaving(true);
    setMessage("");
    try {
      const result = await api.createExpense({
        site: form.siteId,
        supplier: form.supplierId || undefined,
        date: form.expenseDate,
        description: form.description.trim(),
        material: form.description.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        ratePerUnit: Number(form.rate),
        paidAmount: form.paymentStatus === "Paid" ? total : 0,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        bankAccount:
          form.paymentMethod === "Cash" ? undefined : form.bankAccountId || undefined,
        receiptNumber: form.receiptNumber.trim(),
        deductionReference: form.deductionReference,
      });
      setLiveExpenses((items) => [mapExpense(result.data), ...items]);
      setForm((current) => ({
        ...current,
        description: "",
        quantity: "",
        rate: "",
        receiptNumber: "",
        deductionReference: newDeductionReference(),
      }));
      setMessage(`Expense of ${money(total)} saved successfully.`);
      await loadDashboardData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Layout>
      <section className="page">
        <div className="welcome">
          <div>
            <label>MONDAY, 22 APRIL 2024</label>
            <h1>
              Good morning, Rohan <span>👋</span>
            </h1>
            <p>Here’s what’s happening across your projects today.</p>
          </div>
          <b>● Live financial overview</b>
        </div>
        <div className="section-head">
          <div>
            <h2>Bank accounts</h2>
            <p>Overview of your available funds</p>
          </div>
          <button className="text" type="button" onClick={() => nav("/bank-accounts")}>
            Manage accounts →
          </button>
        </div>
        <div className="banks">
          {bankAccounts.map((account, index) => (
            <Bank
              key={account._id}
              account={account}
              color={["#2477e5", "#ff7645", "#9b57c8", "#0799df"][index % 4]}
            />
          ))}
          <div className="total">
            <span>◴</span>
            <p>Total available balance</p>
            <h2>{money(bankAccounts.reduce((sum, account) => sum + account.balance, 0))}</h2>
            <small>Across {bankAccounts.length} active account{bankAccounts.length === 1 ? "" : "s"}</small>
          </div>
        </div>
        <div className="two-cols">
          <section className="panel form-panel">
            <div className="section-head">
              <div>
                <h2>Add daily expense</h2>
                <p>Record a new site expense</p>
              </div>
              <span>⌁</span>
            </div>
            <form onSubmit={save}>
              <label>
                Construction site
                <select
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  required
                >
                  <option value="">Select a construction site</option>
                  {liveSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Expense category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  {["Materials", "Labour", "Equipment & Machinery", "Transportation", "Electricity & Utilities", "Other"].map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Cement, transportation"
                  required
                />
              </label>
              <div className="fields">
                <label>
                  Quantity
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    placeholder="0"
                  />
                </label>
                <label>
                  Unit
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. kg" required />
                </label>
                <label>
                  Rate per unit
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    placeholder="₹ 0"
                  />
                </label>
              </div>
              <label>
                Expense date
                <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
              </label>
              <label>
                Supplier / vendor <span className="optional">(optional)</span>
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">No supplier selected</option>
                  {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
                </select>
              </label>
              <div className="fields">
                <label>
                  Payment method
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} required>
                    {["Bank Transfer", "UPI", "Cheque", "Cash"].map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
                <label>
                  Payment status
                  <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} required>
                    {["Paid", "Pending", "Failed"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Bank account <span className="optional">(required for paid non-cash)</span>
                <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} required={form.paymentStatus === "Paid" && form.paymentMethod !== "Cash"}>
                  <option value="">Select a bank account</option>
                  {bankAccounts.map((account) => <option key={account._id} value={account._id}>{account.bankName}{account.accountLastFour ? ` •••• ${account.accountLastFour}` : ""}</option>)}
                </select>
              </label>
              <label>
                Receipt / invoice number <span className="optional">(optional)</span>
                <input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} maxLength="120" />
              </label>
              <div className="calculated">
                Calculated amount <b>{money(total)}</b>
              </div>
             {message && (
                <small
                  className={
                    message.toLowerCase().includes("successfully")
                      ? "success"
                      : "error"
                  }
                >
                  {message}
                </small>
              )}
              <button className="primary save" disabled={saving || loading}>
                {saving ? "Saving..." : loading ? "Loading..." : "Save expense"} <span>→</span>
              </button>
            </form>
          </section>
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Sites overview</h2>
                <p>Budget and spending at a glance</p>
              </div>
              <a href="/sites">View all →</a>
            </div>
            {liveSites.slice(0, 3).map((s) => (
              <OverviewRow key={s.id} site={s} />
            ))}
          </section>
        </div>
        <ExpenseTable items={liveExpenses} siteList={liveSites} />
      </section>
    </Layout>
  );
}
const emptyBankForm = {
  bankName: "",
  accountLastFour: "",
  accountType: "",
  balance: "",
  isActive: true,
};

function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyBankForm);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.manageBankAccounts();
      setAccounts(result.data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccounts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function beginEdit(account) {
    setEditingId(account._id);
    setForm({ bankName: account.bankName, accountLastFour: account.accountLastFour, accountType: account.accountType, balance: String(account.balance), isActive: account.isActive });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId("");
    setForm(emptyBankForm);
    setMessage("");
  }

  async function saveAccount(event) {
    event.preventDefault();
    if (!form.bankName.trim() || !/^\d{4}$/.test(form.accountLastFour) || !form.accountType.trim()) {
      setMessage("Enter a bank name, four-digit account identifier, and account type.");
      return;
    }
    if (!editingId && (form.balance === "" || Number(form.balance) < 0)) {
      setMessage("Opening balance must be a non-negative number.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      if (editingId) {
        await api.updateBankAccount(editingId, { bankName: form.bankName.trim(), accountLastFour: form.accountLastFour, accountType: form.accountType.trim() });
        setMessage("Bank account updated successfully.");
      } else {
        await api.createBankAccount({ bankName: form.bankName.trim(), accountLastFour: form.accountLastFour, accountType: form.accountType.trim(), balance: Number(form.balance), isActive: form.isActive });
        setMessage("Bank account created successfully.");
      }
      setEditingId("");
      setForm(emptyBankForm);
      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(account) {
    setSaving(true);
    setMessage("");
    try {
      await api.updateBankAccountStatus(account._id, !account.isActive);
      setMessage(`Bank account ${account.isActive ? "deactivated" : "activated"} successfully.`);
      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <section className="page">
        <p className="crumb">Dashboard <i>/</i> Bank accounts</p>
        <div className="title"><div><h1>Bank accounts</h1><p>Manage accounts used for recorded expense payments.</p></div></div>
        <div className="bank-management-grid">
          <section className="panel form-panel">
            <div className="section-head"><div><h2>{editingId ? "Edit bank account" : "Add bank account"}</h2><p>{editingId ? "Balance changes only through payments." : "Set the authorised opening balance."}</p></div></div>
            <form onSubmit={saveAccount}>
              <label>Bank name<input value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} maxLength="120" required /></label>
              <label>Account identifier (last four digits)<input value={form.accountLastFour} onChange={(event) => updateField("accountLastFour", event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" required /></label>
              <label>Account type<input value={form.accountType} onChange={(event) => updateField("accountType", event.target.value)} placeholder="Current Account" maxLength="80" required /></label>
              <label>{editingId ? "Current balance" : "Opening balance"}<input type="number" value={form.balance} onChange={(event) => updateField("balance", event.target.value)} min="0" step="0.01" disabled={Boolean(editingId)} required={!editingId} /></label>
              {!editingId && <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />Make this account active now</label>}
              {message && <small className={message.toLowerCase().includes("successfully") ? "success" : "error"}>{message}</small>}
              <button className="primary save" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create account"}</button>
              {editingId && <button className="outline cancel-edit" type="button" onClick={cancelEdit}>Cancel</button>}
            </form>
          </section>
          <section className="panel bank-account-list">
            <div className="section-head"><div><h2>All accounts</h2><p>Balances change only through the approved financial workflow.</p></div></div>
            {loading ? <p className="empty-state">Loading bank accounts...</p> : accounts.length === 0 ? <p className="empty-state">No bank accounts have been added yet.</p> : <div className="scroll"><table><thead><tr><th>Bank</th><th>Account</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{accounts.map((account) => <tr key={account._id}><td><b>{account.bankName}</b></td><td>•••• {account.accountLastFour}</td><td>{account.accountType}</td><td>{money(account.balance)}</td><td><span className={`account-status ${account.isActive ? "active" : "inactive"}`}>{account.isActive ? "Active" : "Inactive"}</span></td><td className="account-actions"><button className="text" type="button" onClick={() => beginEdit(account)} disabled={saving}>Edit</button><button className="outline" type="button" onClick={() => toggleStatus(account)} disabled={saving}>{account.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>}
          </section>
        </div>
      </section>
    </Layout>
  );
}

function ExpenseTable({ items, siteList }) {
  return (
    <section className="panel recent">
      <div className="section-head">
        <div>
          <h2>Recent expense entries</h2>
          <p>Your latest financial activity</p>
        </div>
        <a>View all expenses →</a>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Site</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>{x.date}</td>
                <td>
                  <b>{x.description}</b>
                  <small>{x.supplier}</small>
                </td>
                <td>{siteList.find((s) => s.id === x.siteId)?.name || "—"}</td>
                <td>
                  <span className="tag">{x.category}</span>
                </td>
                <td>{money(x.amount)}</td>
                <td className="paid">{money(x.paid)}</td>
                <td className="pending">{money(x.amount - x.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Stat({ name, value, icon, color }) {
  return (
    <div className="stat">
      <span style={{ background: color }}>{icon}</span>
      <div>
        <p>{name}</p>
        <h2>{value}</h2>
        <small>
          <b>+12.5%</b> vs. last month
        </small>
      </div>
    </div>
  );
}
function Sites() {
  const nav = useNavigate(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("All Status"),
    [modal, setModal] = useState(false),
    [liveSites, setLiveSites] = useState([]),
    [summary, setSummary] = useState(null),
    [error, setError] = useState("");

    const [showFilters, setShowFilters] = useState(false);
    const [minBudget, setMinBudget] = useState("");
    const [maxBudget, setMaxBudget] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const loadSites = useCallback(
    () =>
      api
        .sites({
          limit: 50,
          search,
          ...(status !== "All Status" && { status }),
        })
        .then((response) => setLiveSites(response.data.map(mapSite)))
        .catch((loadError) => setError(loadError.message)),
    [search, status],
  );
  useEffect(() => {
    const timeout = setTimeout(loadSites, 250);
    return () => clearTimeout(timeout);
  }, [loadSites]);
  
  useEffect(() => {
    api
      .dashboard()
      .then((response) => setSummary(response.data))
      .catch(() => {});
  }, []);
  const filtered = liveSites.filter((site) => {
  const budget = Number(site.budget) || 0;
  const siteDate = site.startDate
    ? new Date(site.startDate)
    : null;

  const matchesMinBudget =
    minBudget === "" || budget >= Number(minBudget);

  const matchesMaxBudget =
    maxBudget === "" || budget <= Number(maxBudget);

  const matchesStartDate =
    !startDate ||
    (siteDate && siteDate >= new Date(`${startDate}T00:00:00`));

  const matchesEndDate =
    !endDate ||
    (siteDate && siteDate <= new Date(`${endDate}T23:59:59`));

  return (
    matchesMinBudget &&
    matchesMaxBudget &&
    matchesStartDate &&
    matchesEndDate
  );
});
  return (
    <Layout>
      <section className="page">
        <p className="crumb">
          Dashboard <i>/</i> Sites
        </p>
        <div className="title">
          <div>
            <h1>Sites</h1>
            <p>Manage and monitor all your construction projects.</p>
          </div>
            {/* <button className="text" onClick={() => nav("/")}>
                ＋ Add Expense
            </button> */}
            <button
  type="button"
  className="primary"
  onClick={() => nav("/")}
>
  <span aria-hidden="true">+</span>
  Add Expense
</button>
          <button className="primary" onClick={() => setModal(true)}>
            ＋ Add new site
          </button>
        </div>
        <div className="stats">
          <Stat
            name="Total sites"
            value={summary?.totalSites ?? "—"}
            icon="▦"
            color="#e7f5fc"
          />
          <Stat
            name="In progress"
            value={summary?.inProgress ?? "—"}
            icon="◴"
            color="#eaf8f0"
          />
          <Stat
            name="Completed"
            value={summary?.completed ?? "—"}
            icon="✓"
            color="#f2edff"
          />
          <Stat
            name="On hold"
            value={summary?.onHold ?? "—"}
            icon="Ⅱ"
            color="#fff4e4"
          />
        </div>
        <section className="panel">
          <div className="filters">
            <div className="search">
              ⌕
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search site, client or owner..."
              />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All Status</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>
            <button
              type="button"
              className="filter-toggle"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
            >
              ☷ Filters {showFilters ? "−" : "+"}
</button>
          </div>
          {showFilters && (
  <div className="advanced-filters">
    <label>
      Minimum budget (₹)
      <input
        type="number"
        min="0"
        value={minBudget}
        onChange={(e) => setMinBudget(e.target.value)}
        placeholder="Minimum"
      />
    </label>

    <label>
      Maximum budget (₹)
      <input
        type="number"
        min="0"
        value={maxBudget}
        onChange={(e) => setMaxBudget(e.target.value)}
        placeholder="Maximum"
      />
    </label>

    <label>
      Start date
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </label>

    <label>
      End date
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </label>

    <button
      type="button"
      className="filter-reset"
      onClick={() => {
        setMinBudget("");
        setMaxBudget("");
        setStartDate("");
        setEndDate("");
        setSearch("");
        setStatus("All Status");
      }}
    >
      Reset Filters
    </button>
  </div>
)}
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date ↕</th>
                  <th>Site</th>
                  <th>Particular's / Client</th>
                  <th>Project budget</th>
                  <th>Total spent</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {error && (
                  <tr>
                    <td colSpan="8">{error}</td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr
                    className="click-row"
                    key={s.id}
                    onClick={() => nav(`/sites/${s.id}`)}
                  >
                    <td>{s.date}</td>
                    <td>
                      <div className="site-name">
                        <span className="building blue">▥</span>
                        <div>
                          <b>{s.name}</b>
                          <small>⌖ {s.location}</small>
                        </div>
                      </div>
                    </td>
                    <td>{s.owner}</td>
                    <td>{money(s.budget)}</td>
                    <td>{money(s.spent)}</td>
                    <td className="remaining">{money(s.budget - s.spent)}</td>
                    <td>
                      <Status value={s.status} />
                    </td>
                    <td>⋮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            Showing <b>1–{filtered.length}</b> of <b>{filtered.length}</b> sites{" "}
            <span>
              <button>‹</button>
              <button className="chosen">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </span>
          </div>
        </section>
      </section>
      {modal && <Modal close={() => setModal(false)} onCreated={loadSites} />}
    </Layout>
  );
}
function Modal({ close, onCreated }) {
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await api.createSite({
        name: values.get("name"),
        location: values.get("location"),
        owner: values.get("owner"),
        startDate: values.get("startDate"),
        budget: Number(values.get("budget")),
        status: values.get("status"),
      });
      onCreated();
      close();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="backdrop">
      <div className="modal">
        <button className="close" onClick={close}>
          ×
        </button>
        <h2>Add new site</h2>
        <p>Create a new construction project.</p>
        <form onSubmit={submit}>
          <label>
            Site name
            <input
              name="name"
              required
              placeholder="e.g. Riverview Residences"
            />
          </label>
          <label>
            Location
            <input name="location" required placeholder="City, locality" />
          </label>
          <label>
            Client / owner
            <input name="owner" required placeholder="Full name" />
          </label>
          <div className="fields">
            <label>
              Start date
              <input name="startDate" required type="date" />
            </label>
            <label>
              Project budget
              <input name="budget" required type="number" placeholder="₹ 0" />
            </label>
          </div>
          <label>
            Status
            <select name="status">
              <option>In Progress</option>
              <option>On Hold</option>
              <option>Completed</option>
            </select>
          </label>
          <button className="primary save" disabled={saving}>
            {saving ? "Creating..." : "Create site"}
          </button>
        </form>
      </div>
    </div>
  );
}
function Details() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [site, setSite] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const tabs = [
    "Overview",
    "Expenses",
    "Materials"
  ];
  useEffect(() => {
    Promise.all([api.site(id), api.siteSummary(id)])
      .then(([siteResponse, summaryResponse]) => {
        setSite(mapSite(siteResponse.data));
        setSummary(summaryResponse.data);
      })
      .catch((loadError) => setError(loadError.message));
  }, [id]);
  if (error)
    return (
      <Layout>
        <section className="page">
          <p>{error}</p>
        </section>
      </Layout>
    );
  if (!site || !summary)
    return (
      <Layout>
        <section className="page">
          <p>Loading site details...</p>
        </section>
      </Layout>
    );
  const xs = (summary.recentTransactions || []).map(mapExpense);
  return (
    <Layout>
      <section className="page details">
        <button className="back" onClick={() => nav("/sites")}>
          ← Back to all sites
        </button>
        <div className="detail-title">
          <div className="site-name">
            <span className="building blue large">▥</span>
            <div>
              <h1>{site.name}</h1>
              <p>
                ⌖ {site.location} • {site.owner}
              </p>
            </div>
          </div>
          <div>
            <button className="text" onClick={() => nav("/")}>＋ Add expense</button>
          </div>
        </div>
        <div className="finance">
          <Card name="Project budget" value={site.budget} icon="▱" />
          <Card name="Total spent" value={summary.totalExpenses} icon="↗" />
          <Card
            name="Remaining budget"
            value={summary.remainingBudget}
            icon="◌"
          />
          <Card
            name="Client received"
            value={summary.clientPaymentsReceived}
            icon="₹"
          />
          <Card
            name="Balance receivable"
            value={summary.balanceReceivable}
            icon="◴"
          />
        </div>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Overview" ? (
          <DetailOverview site={site} xs={xs} />
        ) : (
          <DetailTable tab={tab} xs={xs} />
        )}
      </section>
    </Layout>
  );
}
function Card({ name, value, icon }) {
  return (
    <div className="finance-card">
      <span>{icon}</span>
      <p>{name}</p>
      <h2>{money(value)}</h2>
      <small>Updated today</small>
    </div>
  );
}

function DetailOverview({ site, xs }) {
  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Expense breakdown</h2>
            <p>Spending by category</p>
          </div>
          <a>•••</a>
        </div>
        {["Materials", "Labour", "Equipment"].map((n, i) => {
          let v =
              i < 2
                ? xs
                    .filter((x) => x.category === n)
                    .reduce((a, x) => a + x.amount, 0)
                : 135000,
            p = Math.max(8, Math.round((v / site.budget) * 100));
          return (
            <div className="break" key={n}>
              <p>
                <span className={`dot d${i}`} />
                <b>{n}</b>
                <strong>{money(v)}</strong>
              </p>
              <div className="progress">
                <i style={{ width: `${p}%` }} />
              </div>
              <small>{p}% of budget</small>
            </div>
          );
        })}
      </section>
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Recent transactions</h2>
            <p>Latest project activity</p>
          </div>
          <a>View all →</a>
        </div>
        {xs.map((x) => (
          <div className="transaction" key={x.id}>
            <span>▤</span>
            <div>
              <b>{x.description}</b>
              <small>
                {x.date} · {x.category}
              </small>
            </div>
            <strong>{money(x.amount)}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
function DetailTable({ tab, xs }) {
  let data =
    tab === "Suppliers"
      ? [...new Map(xs.map((x) => [x.supplier, x])).values()]
      : xs;
  return (
    <section className="panel detail-table">
      <div className="section-head">
        <div>
          <h2>{tab} records</h2>
          <p>Data associated with this site</p>
        </div>
        <button className="primary">＋ Add record</button>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((x, i) => (
              <tr key={i}>
                <td>
                  <b>{tab === "Suppliers" ? x.supplier : x.description}</b>
                </td>
                <td>{x.date}</td>
                <td>{x.category}</td>
                <td>{x.quantity}</td>
                <td>{money(x.amount)}</td>
                <td>
                  <Status value="Paid" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sites"
          element={
            <ProtectedRoute>
              <Sites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sites/:id"
          element={
            <ProtectedRoute>
              <Details />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank-accounts"
          element={
            <ProtectedRoute>
              <BankAccounts />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
