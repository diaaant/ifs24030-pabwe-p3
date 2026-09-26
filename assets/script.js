/*
 * ifs24030-pabwe-p3
 * Praktikum PABWE 3
 * Fitur: Expense Tracker, Bookmark Manager, Quiz App.
 * Semua logika JavaScript ditempatkan di file eksternal ini.
 */

"use strict";

/* =========================================================
   UTILITAS UMUM
   ========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEYS = {
  expenses: "ifs24030-pabwe-p3-expenses",
  bookmarks: "ifs24030-pabwe-p3-bookmarks",
  quizHighScore: "ifs24030-pabwe-p3-quiz-high-score",
};

const CATEGORIES = [
  "Makanan",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Gaji",
  "Lainnya",
];

const BOOKMARK_CATEGORIES = [
  "Pemrograman",
  "Belajar",
  "Produktivitas",
  "Referensi",
  "Hiburan",
  "Lainnya",
];

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function showMessage(element, message, type = "error") {
  if (!element) return;
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };
  element.className = `rounded-xl border px-3 py-2 text-sm ${styles[type] || styles.error}`;
  element.textContent = message;
}

function clearMessage(element) {
  if (!element) return;
  element.className = "hidden rounded-xl border px-3 py-2 text-sm";
  element.textContent = "";
}

function openModal(modal) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

/* =========================================================
   TAB NAVIGATION
   Tab aktif ditentukan oleh ?tab=expense|bookmark|quiz.
   Tidak disimpan di localStorage.
   ========================================================= */

const VALID_TABS = ["expense", "bookmark", "quiz"];

function getTabFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get("tab");
  return VALID_TABS.includes(requestedTab) ? requestedTab : "expense";
}

function setTabInUrl(tab, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);

  if (replace) {
    history.replaceState({ tab }, "", url);
  } else {
    history.pushState({ tab }, "", url);
  }
}

function switchTab(tab, updateUrl = true) {
  const activeTab = VALID_TABS.includes(tab) ? tab : "expense";

  $$(".tab-btn").forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.setAttribute("aria-selected", String(isActive));
    button.classList.toggle("bg-slate-900", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("shadow-sm", isActive);
    button.classList.toggle("text-slate-600", !isActive);
    button.classList.toggle("hover:bg-slate-100", !isActive);
  });

  $$(".tab-panel").forEach((panel) => {
    const isActive = panel.id === `panel-${activeTab}`;
    panel.classList.toggle("hidden", !isActive);
    panel.classList.toggle("panel-enter", isActive);
  });

  if (updateUrl) {
    setTabInUrl(activeTab);
  }
}

$$(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

window.addEventListener("popstate", () => switchTab(getTabFromUrl(), false));

// Pastikan URL selalu memiliki query ?tab=...
switchTab(getTabFromUrl(), false);
if (!new URLSearchParams(window.location.search).has("tab")) {
  setTabInUrl("expense", true);
}

/* =========================================================
   EXPENSE TRACKER
   ========================================================= */

let expenses = readStorage(STORAGE_KEYS.expenses, []);
let editingExpenseId = null;
let deletingExpenseId = null;

const expenseForm = $("#expense-form");
const expenseTitle = $("#expense-title");
const expenseCategory = $("#expense-category");
const expenseAmount = $("#expense-amount");
const expenseType = $("#expense-type");
const expenseDate = $("#expense-date");
const expenseFormMessage = $("#expense-form-message");

const expenseList = $("#expense-list");
const expenseEmpty = $("#expense-empty");
const expenseNoResult = $("#expense-no-result");
const expenseSearch = $("#expense-search");
const expenseSort = $("#expense-sort");
const expenseTypeFilter = $("#expense-type-filter");
const expenseCategoryFilter = $("#expense-category-filter");
const expenseCount = $("#expense-count");

const incomeTotal = $("#income-total");
const expenseTotal = $("#expense-total");
const balanceTotal = $("#balance-total");

const expenseEditModal = $("#expense-edit-modal");
const expenseEditForm = $("#expense-edit-form");
const editExpenseTitle = $("#edit-expense-title");
const editExpenseCategory = $("#edit-expense-category");
const editExpenseAmount = $("#edit-expense-amount");
const editExpenseType = $("#edit-expense-type");
const editExpenseDate = $("#edit-expense-date");
const expenseEditMessage = $("#expense-edit-message");

const expenseDeleteModal = $("#expense-delete-modal");
const expenseDeleteName = $("#expense-delete-name");
const expenseDeleteConfirm = $("#expense-delete-confirm");

function saveExpenses() {
  writeStorage(STORAGE_KEYS.expenses, expenses);
}

function isValidPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function updateExpenseSummary() {
  const income = expenses
    .filter((item) => item.type === "Pemasukan")
    .reduce((total, item) => total + Number(item.amount), 0);

  const outgoing = expenses
    .filter((item) => item.type === "Pengeluaran")
    .reduce((total, item) => total + Number(item.amount), 0);

  incomeTotal.textContent = formatRupiah(income);
  expenseTotal.textContent = formatRupiah(outgoing);
  balanceTotal.textContent = formatRupiah(income - outgoing);
}

function getFilteredExpenses() {
  const query = expenseSearch.value.trim().toLowerCase();
  const type = expenseTypeFilter.value;
  const category = expenseCategoryFilter.value;

  const filtered = expenses.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query);
    const matchesType = type === "all" || item.type === type;
    const matchesCategory = category === "all" || item.category === category;
    return matchesQuery && matchesType && matchesCategory;
  });

  return filtered.sort((a, b) => {
    switch (expenseSort.value) {
      case "oldest":
        return a.date.localeCompare(b.date);
      case "amount-desc":
        return Number(b.amount) - Number(a.amount);
      case "amount-asc":
        return Number(a.amount) - Number(b.amount);
      case "newest":
      default:
        return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
    }
  });
}

function makeExpenseItem(expense) {
  const li = document.createElement("li");
  li.className = "rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm";

  const top = document.createElement("div");
  top.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const info = document.createElement("div");
  info.className = "min-w-0";

  const title = document.createElement("h4");
  title.className = "truncate font-bold text-slate-900";
  title.textContent = expense.title;

  const meta = document.createElement("p");
  meta.className = "mt-1 text-xs text-slate-500";
  meta.textContent = `${expense.category} · ${formatDate(expense.date)}`;

  const badges = document.createElement("div");
  badges.className = "mt-2 flex flex-wrap gap-2";

  const typeBadge = document.createElement("span");
  const isIncome = expense.type === "Pemasukan";
  typeBadge.className = `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
    isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
  }`;
  typeBadge.textContent = expense.type;

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600";
  categoryBadge.textContent = expense.category;

  badges.append(typeBadge, categoryBadge);
  info.append(title, meta, badges);

  const amount = document.createElement("p");
  amount.className = `text-lg font-bold whitespace-nowrap ${isIncome ? "text-emerald-700" : "text-rose-700"}`;
  amount.textContent = `${isIncome ? "+" : "-"}${formatRupiah(expense.amount)}`;

  top.append(info, amount);

  const actions = document.createElement("div");
  actions.className = "mt-4 flex gap-2 border-t border-slate-100 pt-3";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50";
  editButton.innerHTML = '<i class="ti ti-pencil mr-1"></i> Ubah';
  editButton.addEventListener("click", () => openExpenseEditModal(expense.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50";
  deleteButton.innerHTML = '<i class="ti ti-trash mr-1"></i> Hapus';
  deleteButton.addEventListener("click", () => openExpenseDeleteModal(expense.id));

  actions.append(editButton, deleteButton);
  li.append(top, actions);
  return li;
}

function renderExpenses() {
  updateExpenseSummary();

  const items = getFilteredExpenses();
  expenseList.replaceChildren();

  expenseCount.textContent = `${items.length} dari ${expenses.length} transaksi`;

  expenseEmpty.classList.toggle("hidden", expenses.length !== 0);
  expenseNoResult.classList.toggle("hidden", expenses.length === 0 || items.length !== 0);
  expenseList.classList.toggle("hidden", expenses.length === 0 || items.length === 0);

  items.forEach((expense) => expenseList.appendChild(makeExpenseItem(expense)));
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage(expenseFormMessage);

  const title = expenseTitle.value.trim();
  const category = expenseCategory.value;
  const amount = Number(expenseAmount.value);
  const type = expenseType.value;
  const date = expenseDate.value;

  if (!title || !category || !date || !type) {
    showMessage(expenseFormMessage, "Semua field wajib diisi.");
    return;
  }

  if (!isValidPositiveNumber(amount)) {
    showMessage(expenseFormMessage, "Jumlah harus berupa angka yang valid dan lebih dari 0.");
    expenseAmount.focus();
    return;
  }

  expenses.push({
    id: createId(),
    title,
    category,
    amount,
    type,
    date,
    createdAt: Date.now(),
  });

  saveExpenses();
  expenseForm.reset();
  expenseType.value = "Pengeluaran";
  expenseDate.value = todayString();
  showMessage(expenseFormMessage, "Transaksi berhasil ditambahkan.", "success");
  renderExpenses();
});

[expenseSearch, expenseSort, expenseTypeFilter, expenseCategoryFilter]
  .forEach((element) => element.addEventListener("input", renderExpenses));

function populateExpenseEditCategories() {
  editExpenseCategory.replaceChildren();
  CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    editExpenseCategory.appendChild(option);
  });
}

function openExpenseEditModal(id) {
  const item = expenses.find((expense) => expense.id === id);
  if (!item) return;

  editingExpenseId = id;
  editExpenseTitle.value = item.title;
  editExpenseCategory.value = item.category;
  editExpenseAmount.value = item.amount;
  editExpenseType.value = item.type;
  editExpenseDate.value = item.date;
  clearMessage(expenseEditMessage);
  openModal(expenseEditModal);
  editExpenseTitle.focus();
}

expenseEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage(expenseEditMessage);

  const item = expenses.find((expense) => expense.id === editingExpenseId);
  if (!item) return;

  const title = editExpenseTitle.value.trim();
  const category = editExpenseCategory.value;
  const amount = Number(editExpenseAmount.value);
  const type = editExpenseType.value;
  const date = editExpenseDate.value;

  if (!title || !category || !date || !type) {
    showMessage(expenseEditMessage, "Semua field wajib diisi.");
    return;
  }

  if (!isValidPositiveNumber(amount)) {
    showMessage(expenseEditMessage, "Jumlah harus berupa angka yang valid dan lebih dari 0.");
    return;
  }

  Object.assign(item, { title, category, amount, type, date });
  saveExpenses();
  renderExpenses();
  closeModal(expenseEditModal);
});

function openExpenseDeleteModal(id) {
  const item = expenses.find((expense) => expense.id === id);
  if (!item) return;

  deletingExpenseId = id;
  expenseDeleteName.textContent = `"${item.title}"`;
  openModal(expenseDeleteModal);
}

expenseDeleteConfirm.addEventListener("click", () => {
  if (!deletingExpenseId) return;

  expenses = expenses.filter((expense) => expense.id !== deletingExpenseId);
  saveExpenses();
  renderExpenses();
  closeModal(expenseDeleteModal);
  deletingExpenseId = null;
});

/* =========================================================
   BOOKMARK MANAGER
   ========================================================= */

let bookmarks = readStorage(STORAGE_KEYS.bookmarks, []);
let editingBookmarkId = null;
let deletingBookmarkId = null;

const bookmarkForm = $("#bookmark-form");
const bookmarkTitle = $("#bookmark-title");
const bookmarkUrl = $("#bookmark-url");
const bookmarkCategory = $("#bookmark-category");
const bookmarkNote = $("#bookmark-note");
const bookmarkFormMessage = $("#bookmark-form-message");

const bookmarkSearch = $("#bookmark-search");
const bookmarkSort = $("#bookmark-sort");
const bookmarkList = $("#bookmark-list");
const bookmarkEmpty = $("#bookmark-empty");
const bookmarkNoResult = $("#bookmark-no-result");
const bookmarkCount = $("#bookmark-count");

const bookmarkEditModal = $("#bookmark-edit-modal");
const bookmarkEditForm = $("#bookmark-edit-form");
const editBookmarkTitle = $("#edit-bookmark-title");
const editBookmarkUrl = $("#edit-bookmark-url");
const editBookmarkCategory = $("#edit-bookmark-category");
const editBookmarkNote = $("#edit-bookmark-note");
const bookmarkEditMessage = $("#bookmark-edit-message");

const bookmarkDeleteModal = $("#bookmark-delete-modal");
const bookmarkDeleteName = $("#bookmark-delete-name");
const bookmarkDeleteConfirm = $("#bookmark-delete-confirm");

function saveBookmarks() {
  writeStorage(STORAGE_KEYS.bookmarks, bookmarks);
}

function isValidBookmarkUrl(value) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getFilteredBookmarks() {
  const query = bookmarkSearch.value.trim().toLowerCase();

  const filtered = bookmarks.filter((item) =>
    [item.title, item.url, item.category, item.note || ""]
      .some((value) => value.toLowerCase().includes(query))
  );

  return filtered.sort((a, b) => {
    switch (bookmarkSort.value) {
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });
}

function makeBookmarkItem(bookmark) {
  const li = document.createElement("li");
  li.className = "rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm";

  const top = document.createElement("div");
  top.className = "flex items-start justify-between gap-3";

  const info = document.createElement("div");
  info.className = "min-w-0";

  const link = document.createElement("a");
  link.href = bookmark.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "break-words font-bold text-violet-700 hover:underline";
  link.textContent = bookmark.title;

  const urlText = document.createElement("p");
  urlText.className = "mt-1 break-all text-xs text-slate-500";
  urlText.textContent = bookmark.url;

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700";
  categoryBadge.textContent = bookmark.category;

  info.append(link, urlText, categoryBadge);

  const externalIcon = document.createElement("i");
  externalIcon.className = "ti ti-external-link shrink-0 text-slate-400";

  top.append(info, externalIcon);

  const note = document.createElement("p");
  note.className = "mt-3 text-sm leading-6 text-slate-600";
  note.textContent = bookmark.note || "Tidak ada catatan.";

  const actions = document.createElement("div");
  actions.className = "mt-4 flex gap-2 border-t border-slate-100 pt-3";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50";
  editButton.innerHTML = '<i class="ti ti-pencil mr-1"></i> Ubah';
  editButton.addEventListener("click", () => openBookmarkEditModal(bookmark.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50";
  deleteButton.innerHTML = '<i class="ti ti-trash mr-1"></i> Hapus';
  deleteButton.addEventListener("click", () => openBookmarkDeleteModal(bookmark.id));

  actions.append(editButton, deleteButton);
  li.append(top, note, actions);
  return li;
}

function renderBookmarks() {
  const items = getFilteredBookmarks();
  bookmarkList.replaceChildren();

  bookmarkCount.textContent = `${items.length} dari ${bookmarks.length} bookmark`;
  bookmarkEmpty.classList.toggle("hidden", bookmarks.length !== 0);
  bookmarkNoResult.classList.toggle("hidden", bookmarks.length === 0 || items.length !== 0);
  bookmarkList.classList.toggle("hidden", bookmarks.length === 0 || items.length === 0);

  items.forEach((bookmark) => bookmarkList.appendChild(makeBookmarkItem(bookmark)));
}

bookmarkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage(bookmarkFormMessage);

  const title = bookmarkTitle.value.trim();
  const url = bookmarkUrl.value.trim();
  const category = bookmarkCategory.value;
  const note = bookmarkNote.value.trim();

  if (!title || !url || !category) {
    showMessage(bookmarkFormMessage, "Judul, URL, dan kategori wajib diisi.");
    return;
  }

  if (!isValidBookmarkUrl(url)) {
    showMessage(bookmarkFormMessage, "URL harus valid dan diawali http:// atau https://.");
    bookmarkUrl.focus();
    return;
  }

  bookmarks.push({
    id: createId(),
    title,
    url,
    category,
    note,
    createdAt: Date.now(),
  });

  saveBookmarks();
  bookmarkForm.reset();
  showMessage(bookmarkFormMessage, "Bookmark berhasil disimpan.", "success");
  renderBookmarks();
});

[bookmarkSearch, bookmarkSort].forEach((element) => {
  element.addEventListener("input", renderBookmarks);
});

function populateBookmarkEditCategories() {
  editBookmarkCategory.replaceChildren();
  BOOKMARK_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    editBookmarkCategory.appendChild(option);
  });
}

function openBookmarkEditModal(id) {
  const item = bookmarks.find((bookmark) => bookmark.id === id);
  if (!item) return;

  editingBookmarkId = id;
  editBookmarkTitle.value = item.title;
  editBookmarkUrl.value = item.url;
  editBookmarkCategory.value = item.category;
  editBookmarkNote.value = item.note || "";
  clearMessage(bookmarkEditMessage);
  openModal(bookmarkEditModal);
  editBookmarkTitle.focus();
}

bookmarkEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage(bookmarkEditMessage);

  const item = bookmarks.find((bookmark) => bookmark.id === editingBookmarkId);
  if (!item) return;

  const title = editBookmarkTitle.value.trim();
  const url = editBookmarkUrl.value.trim();
  const category = editBookmarkCategory.value;
  const note = editBookmarkNote.value.trim();

  if (!title || !url || !category) {
    showMessage(bookmarkEditMessage, "Judul, URL, dan kategori wajib diisi.");
    return;
  }

  if (!isValidBookmarkUrl(url)) {
    showMessage(bookmarkEditMessage, "URL harus valid dan diawali http:// atau https://.");
    return;
  }

  Object.assign(item, { title, url, category, note });
  saveBookmarks();
  renderBookmarks();
  closeModal(bookmarkEditModal);
});

function openBookmarkDeleteModal(id) {
  const item = bookmarks.find((bookmark) => bookmark.id === id);
  if (!item) return;

  deletingBookmarkId = id;
  bookmarkDeleteName.textContent = `"${item.title}"`;
  openModal(bookmarkDeleteModal);
}

bookmarkDeleteConfirm.addEventListener("click", () => {
  if (!deletingBookmarkId) return;

  bookmarks = bookmarks.filter((bookmark) => bookmark.id !== deletingBookmarkId);
  saveBookmarks();
  renderBookmarks();
  closeModal(bookmarkDeleteModal);
  deletingBookmarkId = null;
});

/* =========================================================
   QUIZ APP
   Soal disimpan sebagai array of object, bukan hardcode di HTML.
   ========================================================= */

const quizQuestions = [
  {
    question: "Method DOM yang digunakan untuk mengambil satu elemen berdasarkan selector adalah ...",
    options: ["querySelector()", "queryAll()", "getElementList()", "selectOne()"],
    answer: 0,
  },
  {
    question: "Method yang digunakan untuk mengubah array dengan menyimpan hasil transformasi setiap elemen adalah ...",
    options: ["filter()", "map()", "find()", "sort()"],
    answer: 1,
  },
  {
    question: "Format yang umum digunakan untuk menyimpan object/array ke localStorage adalah ...",
    options: ["JSON.stringify()", "JSON.parse()", "String.object()", "Object.local()"],
    answer: 0,
  },
  {
    question: "Event yang cocok untuk menangani pengiriman sebuah form adalah ...",
    options: ["hover", "change", "submit", "loadData"],
    answer: 2,
  },
  {
    question: "Atribut HTML yang membuat link dibuka pada tab/jendela baru adalah ...",
    options: ['target="_blank"', 'open="new"', 'tab="new"', 'window="blank"'],
    answer: 0,
  },
  {
    question: "Manakah yang termasuk tipe data object dalam JavaScript?",
    options: ["const user = { name: 'Ana' }", "const user = 'Ana'", "const user = 20", "const user = true"],
    answer: 0,
  },
  {
    question: "Fungsi Array.filter() digunakan untuk ...",
    options: [
      "Mengurutkan array",
      "Mencari satu elemen pertama",
      "Membuat array berisi elemen yang memenuhi kondisi",
      "Menghapus localStorage",
    ],
    answer: 2,
  },
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

const quizStart = $("#quiz-start");
const quizPlay = $("#quiz-play");
const quizResult = $("#quiz-result");
const quizStartButton = $("#quiz-start-btn");
const quizRetryButton = $("#quiz-retry-btn");
const quizProgress = $("#quiz-progress");
const quizProgressBar = $("#quiz-progress-bar");
const quizQuestion = $("#quiz-question");
const quizOptions = $("#quiz-options");
const quizFeedback = $("#quiz-feedback");
const quizNextButton = $("#quiz-next-btn");
const quizScoreElement = $("#quiz-score");
const quizFinalScore = $("#quiz-final-score");
const quizResultMessage = $("#quiz-result-message");
const quizStartHighScore = $("#quiz-start-high-score");
const quizResultHighScore = $("#quiz-result-high-score");
const quizTotalQuestion = $("#quiz-total-question");

quizTotalQuestion.textContent = quizQuestions.length;

function getQuizHighScore() {
  return Number(localStorage.getItem(STORAGE_KEYS.quizHighScore) || 0);
}

function updateQuizHighScoreDisplays() {
  const highScore = getQuizHighScore();
  const text = `${highScore} / ${quizQuestions.length}`;
  quizStartHighScore.textContent = text;
  quizResultHighScore.textContent = text;
}

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;

  quizStart.classList.add("hidden");
  quizResult.classList.add("hidden");
  quizPlay.classList.remove("hidden");
  quizScoreElement.textContent = "0";
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const current = quizQuestions[quizIndex];
  quizAnswered = false;

  quizProgress.textContent = `${quizIndex + 1} / ${quizQuestions.length}`;
  quizProgressBar.style.width = `${((quizIndex + 1) / quizQuestions.length) * 100}%`;
  quizQuestion.textContent = current.question;
  quizOptions.replaceChildren();
  quizFeedback.className = "mt-4 hidden rounded-xl border px-4 py-3 text-sm";
  quizFeedback.textContent = "";
  quizNextButton.classList.add("hidden");

  current.options.forEach((optionText, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50";
    button.textContent = `${String.fromCharCode(65 + optionIndex)}. ${optionText}`;
    button.addEventListener("click", () => answerQuiz(optionIndex));
    quizOptions.appendChild(button);
  });
}

function answerQuiz(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;

  const current = quizQuestions[quizIndex];
  const optionButtons = $$("#quiz-options .quiz-option");

  optionButtons.forEach((button, index) => {
    button.disabled = true;
    button.classList.remove("hover:border-emerald-400", "hover:bg-emerald-50");

    if (index === current.answer) {
      button.classList.add("border-emerald-400", "bg-emerald-50", "text-emerald-800");
    }

    if (index === selectedIndex && selectedIndex !== current.answer) {
      button.classList.add("border-rose-400", "bg-rose-50", "text-rose-800");
    }
  });

  const correct = selectedIndex === current.answer;
  if (correct) {
    quizScore += 1;
    quizScoreElement.textContent = String(quizScore);
    showMessage(quizFeedback, "Jawaban benar! +1 poin.", "success");
  } else {
    showMessage(
      quizFeedback,
      `Jawaban kurang tepat. Jawaban benar: ${current.options[current.answer]}.`,
      "error"
    );
  }

  quizNextButton.classList.remove("hidden");
  quizNextButton.innerHTML = quizIndex === quizQuestions.length - 1
    ? 'Lihat hasil <i class="ti ti-trophy ml-1"></i>'
    : 'Soal berikutnya <i class="ti ti-arrow-right ml-1"></i>';
}

function finishQuiz() {
  const previousHighScore = getQuizHighScore();
  const newHighScore = Math.max(previousHighScore, quizScore);

  if (quizScore > previousHighScore) {
    localStorage.setItem(STORAGE_KEYS.quizHighScore, String(quizScore));
  }

  quizPlay.classList.add("hidden");
  quizResult.classList.remove("hidden");
  quizFinalScore.textContent = `${quizScore} / ${quizQuestions.length}`;

  if (quizScore === quizQuestions.length) {
    quizResultMessage.textContent = "Sempurna! Semua jawaban benar.";
  } else if (quizScore >= Math.ceil(quizQuestions.length * 0.7)) {
    quizResultMessage.textContent = "Bagus! Pemahaman kamu sudah cukup kuat.";
  } else {
    quizResultMessage.textContent = "Tetap semangat. Coba ulangi kuis untuk meningkatkan skor.";
  }

  updateQuizHighScoreDisplays();

  // newHighScore sengaja dihitung sebelum update display untuk menjaga alur high score.
  void newHighScore;
}

quizNextButton.addEventListener("click", () => {
  if (quizIndex === quizQuestions.length - 1) {
    finishQuiz();
    return;
  }

  quizIndex += 1;
  renderQuizQuestion();
});

quizStartButton.addEventListener("click", startQuiz);
quizRetryButton.addEventListener("click", startQuiz);

updateQuizHighScoreDisplays();

/* =========================================================
   MODAL & INISIALISASI
   ========================================================= */

function bindModalCloseEvents() {
  $$("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.modalClose;
      const modalMap = {
        "expense-edit": expenseEditModal,
        "expense-delete": expenseDeleteModal,
        "bookmark-edit": bookmarkEditModal,
        "bookmark-delete": bookmarkDeleteModal,
      };
      if (modalMap[name]) closeModal(modalMap[name]);
    });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  $$(".fixed[role='dialog']").forEach((modal) => {
    if (!modal.classList.contains("hidden")) closeModal(modal);
  });
});

bindModalCloseEvents();
populateExpenseEditCategories();
populateBookmarkEditCategories();

expenseDate.value = todayString();
renderExpenses();
renderBookmarks();
