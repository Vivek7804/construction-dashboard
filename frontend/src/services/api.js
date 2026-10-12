const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";


async function request(path, options = {}) {
  const token = localStorage.getItem("adminToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Request failed");
  }

  return body;
}


// async function request(path, options = {}) {
//   const response = await fetch(`${API_BASE_URL}${path}`, {
//     headers: {
//       "Content-Type": "application/json",
//       ...(localStorage.getItem("adminToken") && {
//         Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
//       }),
//       ...options.headers,
//     },
//     ...options,
//   });
//   const body = await response.json().catch(() => ({}));
//   if (!response.ok || body.success === false)
//     throw new Error(body.message || "Request failed");
//   return body;
// }

export const api = {
  dashboard: () => request("/dashboard/summary"),
  bankAccounts: () => request("/dashboard/bank-accounts"),
  manageBankAccounts: () => request("/bank-accounts"),
  activeBankAccounts: () => request("/bank-accounts?active=true"),
  createBankAccount: (data) =>
    request("/bank-accounts", { method: "POST", body: JSON.stringify(data) }),
  updateBankAccount: (id, data) =>
    request(`/bank-accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateBankAccountStatus: (id, isActive) =>
    request(`/bank-accounts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  recentExpenses: () => request("/dashboard/recent-expenses"),
  sites: (params = {}) => request(`/sites?${new URLSearchParams(params)}`),
  site: (id) => request(`/sites/${id}`),
  siteSummary: (id) => request(`/sites/${id}/summary`),
  siteTab: (id, tab) => request(`/sites/${id}/${tab}`),
  suppliers: (params = {}) => request(`/suppliers?${new URLSearchParams(params)}`),
  createSite: (data) =>
    request("/sites", { method: "POST", body: JSON.stringify(data) }),
  expenses: (params = {}) =>
    request(`/expenses${new URLSearchParams(params)}`),
  createExpense: (data) =>
    request("/expenses", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
};
