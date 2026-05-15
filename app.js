const budgetTargets = {
  Makanan: 3000000,
  Transportasi: 1200000,
  Hiburan: 1000000,
  Tagihan: 2500000,
  Belanja: 1500000,
  Lainnya: 1000000,
};

const incomeCategories = ["Gaji", "Freelance", "Bonus", "Investasi", "Lainnya"];
const expenseCategories = Object.keys(budgetTargets);
const STORAGE_KEY = "financeDashboardTransactions";

const initialTransactions = [
  { type: "income", category: "Gaji", amount: 9000000, date: "2026-05-01", note: "Gaji bulanan" },
  { type: "income", category: "Freelance", amount: 1800000, date: "2026-05-06", note: "Proyek landing page" },
  { type: "expense", category: "Makanan", amount: 850000, date: "2026-05-03", note: "Belanja mingguan" },
  { type: "expense", category: "Tagihan", amount: 1200000, date: "2026-05-04", note: "Listrik & internet" },
  { type: "expense", category: "Transportasi", amount: 420000, date: "2026-05-05", note: "BBM & tol" },
  { type: "expense", category: "Hiburan", amount: 250000, date: "2026-05-10", note: "Nonton bioskop" },
];

const transactions = loadTransactions();

const formatIDR = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const formEl = document.getElementById("transactionForm");
const clearAllBtn = document.getElementById("clearAllBtn");

let incomeExpenseChart;

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [...initialTransactions];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function updateCategoryOptions() {
  const categories = typeEl.value === "income" ? incomeCategories : expenseCategories;
  categoryEl.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function calculateTotals() {
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const ratio = totalIncome === 0 ? 0 : (totalExpense / totalIncome) * 100;

  document.getElementById("totalIncome").textContent = formatIDR(totalIncome);
  document.getElementById("totalExpense").textContent = formatIDR(totalExpense);
  document.getElementById("balance").textContent = formatIDR(balance);
  document.getElementById("expenseRatio").textContent = `${ratio.toFixed(1)}%`;

  return { totalIncome, totalExpense };
}

function renderTable() {
  const tbody = document.getElementById("transactionTableBody");
  tbody.innerHTML = transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((t) => `
      <tr>
        <td>${t.date}</td>
        <td>${t.type === "income" ? "Pendapatan" : "Pengeluaran"}</td>
        <td>${t.category}</td>
        <td>${t.note || "-"}</td>
        <td class="${t.type === "income" ? "amount-income" : "amount-expense"}">${t.type === "income" ? "+" : "-"}${formatIDR(t.amount)}</td>
      </tr>`)
    .join("");
}

function renderBudgetProgress() {
  const expenseByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const container = document.getElementById("budgetList");
  container.innerHTML = expenseCategories
    .map((category) => {
      const spent = expenseByCategory[category] || 0;
      const budget = budgetTargets[category] || 0;
      const percent = budget ? Math.min(100, (spent / budget) * 100) : 0;
      return `
      <article class="budget-item">
        <strong>${category}</strong>
        <div>${formatIDR(spent)} / ${formatIDR(budget)}</div>
        <div class="progress"><span style="width:${percent}%"></span></div>
      </article>`;
    })
    .join("");
}

function renderMonthlySummary() {
  const monthly = transactions.reduce((acc, t) => {
    const month = t.date.slice(0, 7);
    if (!acc[month]) acc[month] = { income: 0, expense: 0 };
    acc[month][t.type] += t.amount;
    return acc;
  }, {});

  const rows = Object.entries(monthly)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => `<tr><td>${month}</td><td>${formatIDR(data.income)}</td><td>${formatIDR(data.expense)}</td><td>${formatIDR(data.income - data.expense)}</td></tr>`)
    .join("");

  document.getElementById("monthlySummary").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Bulan</th><th>Pendapatan</th><th>Pengeluaran</th><th>Saldo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderChart({ totalIncome, totalExpense }) {
  const ctx = document.getElementById("incomeExpenseChart");
  if (incomeExpenseChart) incomeExpenseChart.destroy();

  incomeExpenseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Pendapatan", "Pengeluaran"],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ["#16a34a", "#dc2626"],
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: {
            callback: (value) => `Rp${(value / 1000000).toFixed(1)}jt`,
          },
        },
      },
    },
  });
}

function refreshUI() {
  const totals = calculateTotals();
  renderTable();
  renderBudgetProgress();
  renderMonthlySummary();
  renderChart(totals);
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const newTransaction = {
    type: typeEl.value,
    category: categoryEl.value,
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    note: document.getElementById("note").value.trim(),
  };

  transactions.push(newTransaction);
  saveTransactions();
  formEl.reset();
  document.getElementById("date").valueAsDate = new Date();
  updateCategoryOptions();
  refreshUI();
});

typeEl.addEventListener("change", updateCategoryOptions);

clearAllBtn.addEventListener("click", () => {
  const isConfirmed = window.confirm("Apakah Anda yakin ingin menghapus semua data transaksi? Tindakan ini tidak bisa dibatalkan.");
  if (!isConfirmed) return;

  transactions.length = 0;
  localStorage.removeItem(STORAGE_KEY);
  refreshUI();
});

updateCategoryOptions();
document.getElementById("date").valueAsDate = new Date();
saveTransactions();
refreshUI();
