const prompts = window.PROMPT_DATA;
const pageSize = 12;

const categoryOptions = [
  { label: "ASMR & Satisfying", count: 3 },
  { label: "Animal & Pets", count: 15 },
  { label: "Art & Animation", count: 4 },
  { label: "Comedy & Entertainment", count: 8 },
  { label: "DIY & Crafts", count: 1 },
  { label: "Emotional & Inspirational", count: 3 },
  { label: "Fantasy & SCI-FI", count: 4 },
  { label: "Food & Cooking", count: 0 },
  { label: "Historical & Nostalgia", count: 2 },
  { label: "Kids & Family", count: 1 },
  { label: "Nature & Wildlife", count: 6 },
  { label: "Sports & Action", count: 6 },
  { label: "GENRAL", count: 71 }
];

const state = {
  query: "",
  tier: "all",
  category: "all",
  sort: "newest",
  visibleCount: pageSize,
  savedOnly: false
};

const elements = {
  catalog: document.querySelector("#catalog-view"),
  detail: document.querySelector("#detail-view"),
  grid: document.querySelector("#prompt-grid"),
  categoryFilters: document.querySelector("#category-filters"),
  search: document.querySelector("#search-input"),
  sort: document.querySelector("#sort-select"),
  count: document.querySelector("#prompt-count"),
  empty: document.querySelector("#empty-state"),
  loadMore: document.querySelector("#load-more"),
  toast: document.querySelector("#toast")
};

let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function categorySlug(label) {
  if (label === "GENRAL") return "genral";
  return label.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loadSaved() {
  try {
    const stored = JSON.parse(localStorage.getItem("viral-promptly-saved") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error("Could not read saved prompts.", error);
    return [];
  }
}

function persistSaved(saved) {
  try {
    localStorage.setItem("viral-promptly-saved", JSON.stringify(saved));
  } catch (error) {
    console.error("Could not save this prompt.", error);
    showToast("Unable to save in this browser.");
  }
}

function readUrlState() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") || "";
  state.tier = ["all", "free", "premium"].includes(params.get("tier")) ? params.get("tier") : "all";
  state.category = params.get("category") || "all";
  state.sort = ["newest", "oldest", "az"].includes(params.get("sort")) ? params.get("sort") : "newest";
  state.savedOnly = location.hash === "#saved" || (/^#\/prompts\//.test(location.hash) && state.savedOnly);
  elements.search.value = state.query;
  elements.sort.value = state.sort;
}

function writeUrlState() {
  const url = new URL(location.href);
  url.searchParams.set("q", state.query);
  url.searchParams.set("tier", state.tier);
  url.searchParams.set("category", state.category);
  url.searchParams.set("sort", state.sort);
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function filteredPrompts() {
  const query = state.query.trim().toLocaleLowerCase();
  const saved = loadSaved();
  const results = prompts.filter((prompt) => {
    const matchesText = !query || `${prompt.title} ${prompt.category}`.toLocaleLowerCase().includes(query);
    const matchesTier = state.tier === "all" || prompt.tier === state.tier;
    const matchesCategory = state.category === "all" || prompt.categoryFilter === categoryOptions.find(option => categorySlug(option.label) === state.category)?.label;
    const matchesSaved = !state.savedOnly || saved.includes(prompt.slug);
    return matchesText && matchesTier && matchesCategory && matchesSaved;
  });

  if (state.sort === "oldest") results.reverse();
  if (state.sort === "az") results.sort((first, second) => first.title.localeCompare(second.title));
  return results;
}

function renderCategoryFilters() {
  const allActive = state.category === "all";
  elements.categoryFilters.innerHTML = [
    `<button class="category-button ${allActive ? "active" : ""}" type="button" data-category="all" aria-pressed="${allActive}">All categories</button>`,
    ...categoryOptions.map((option) => {
      const value = categorySlug(option.label);
      const active = state.category === value;
      return `<button class="category-button ${active ? "active" : ""}" type="button" data-category="${value}" aria-pressed="${active}">${escapeHtml(option.label)} <span>${option.count}</span></button>`;
    })
  ].join("");
}

function promptIcon() {
  return `<span class="prompt-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M6 2.8h5.3l3.8 3.8v10.6H6z"/><path d="M11 2.8v4h4M8.5 10h4M8.5 13h4"/></svg></span>`;
}

function cardMarkup(prompt) {
  const image = prompt.coverFile
    ? `<img class="card-image" src="assets/covers/${encodeURIComponent(prompt.coverFile)}" alt="${escapeHtml(prompt.title)}" loading="lazy">`
    : `<div class="card-image placeholder" role="img" aria-label="${escapeHtml(prompt.title)}"></div>`;
  const action = prompt.tier === "free" ? "Get access" : "Open prompt";
  const href = `#/prompts/${encodeURIComponent(prompt.slug)}`;

  return `<article class="prompt-card">
    <a class="card-image-link" href="${href}" aria-label="Open ${escapeHtml(prompt.title)}">${image}${promptIcon()}</a>
    <div class="card-body">
      <span class="card-category">${escapeHtml(prompt.category)}</span>
      <a href="${href}"><h2 class="card-title">${escapeHtml(prompt.title)}</h2></a>
      <p class="card-tier ${prompt.tier}">${prompt.tier === "free" ? "Free" : "Premium"}</p>
      <a class="card-open" href="${href}">${action}</a>
    </div>
  </article>`;
}

function renderCatalog() {
  renderCategoryFilters();
  document.querySelectorAll("[data-tier]").forEach((button) => {
    const active = button.dataset.tier === state.tier;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const filtered = filteredPrompts();
  const visible = filtered.slice(0, state.visibleCount);
  elements.grid.innerHTML = visible.map(cardMarkup).join("");
  elements.count.textContent = `${filtered.length} prompts available`;
  elements.grid.hidden = filtered.length === 0;
  elements.empty.hidden = filtered.length !== 0;
  elements.loadMore.hidden = filtered.length === 0 || visible.length >= filtered.length;
  elements.catalog.hidden = false;
  elements.detail.hidden = true;
  document.title = "All Prompts — LocalPromptly";
}

function promptFromRoute() {
  const match = location.hash.match(/^#\/prompts\/([^/]+)$/);
  if (!match) return null;
  let slug;
  try {
    slug = decodeURIComponent(match[1]);
  } catch (error) {
    return null;
  }
  return prompts.find((prompt) => prompt.slug === slug) || null;
}

function folderIcon() {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.8 6.5h5l1.5 1.7h7.9v7.1H2.8z"/><path d="M2.8 6.5V4.7h5l1.5 1.8"/></svg>`;
}

function clockIcon() {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.7 1.7"/></svg>`;
}

function heartIcon() {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M17 7.2c0 4.1-7 8.5-7 8.5S3 11.3 3 7.2a3.6 3.6 0 0 1 7-1.3 3.6 3.6 0 0 1 7 1.3Z"/></svg>`;
}

function copyIcon() {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="6" width="9" height="11" rx="1.5"/><path d="M12.5 3H5.7A1.7 1.7 0 0 0 4 4.7v8.6"/></svg>`;
}

function renderDetail(prompt) {
  if (!prompt) {
    elements.detail.innerHTML = `<div class="detail-not-found"><a class="back-link" href="#catalog">← Back to all prompts</a><h1>Prompt not found</h1></div>`;
  } else {
    const saved = loadSaved().includes(prompt.slug);
    const cover = prompt.coverFile
      ? `<img class="detail-cover" src="assets/covers/${encodeURIComponent(prompt.coverFile)}" alt="${escapeHtml(prompt.title)}">`
      : `<div class="detail-cover placeholder" role="img" aria-label="${escapeHtml(prompt.title)}"></div>`;
    elements.detail.innerHTML = `
      <a class="back-link" href="${state.savedOnly ? "#saved" : "#catalog"}">← Back to all prompts</a>
      <h1>${escapeHtml(prompt.title)}</h1>
      <div class="detail-meta">
        <span class="detail-chip">${folderIcon()}${escapeHtml(prompt.category)}</span>
        <span class="detail-chip">${clockIcon()}Updated ${escapeHtml(prompt.updated)}</span>
        <span class="detail-chip tier">${prompt.tier === "free" ? "Free" : "Premium"}</span>
        <button class="save-button ${saved ? "saved" : ""}" type="button" data-save="${escapeHtml(prompt.slug)}" aria-pressed="${saved}">${heartIcon()}${saved ? "Saved" : "Save"}</button>
      </div>
      <div class="copy-row">
        <button class="copy-button" type="button" data-copy="${escapeHtml(prompt.slug)}">${copyIcon()}Copy Prompt</button>
      </div>
      <section class="prompt-content" aria-label="Prompt text"><p>${escapeHtml(prompt.promptText)}</p></section>
      ${cover}`;
  }

  elements.catalog.hidden = true;
  elements.detail.hidden = false;
  document.title = prompt ? `${prompt.title} — LocalPromptly` : "Prompt not found — LocalPromptly";
  window.scrollTo(0, 0);
}

function render() {
  readUrlState();
  const route = location.hash;
  const prompt = promptFromRoute();
  if (route.startsWith("#/prompts/")) renderDetail(prompt);
  else renderCatalog();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

async function copyPrompt(slug) {
  const prompt = prompts.find((item) => item.slug === slug);
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt.promptText);
    showToast("Prompt copied to clipboard.");
  } catch (error) {
    console.error("Clipboard access failed.", error);
    showToast("Clipboard access was blocked by the browser.");
  }
}

function toggleSaved(slug) {
  const saved = loadSaved();
  const wasSaved = saved.includes(slug);
  persistSaved(wasSaved ? saved.filter((item) => item !== slug) : [...saved, slug]);
  if (!wasSaved) showToast("Prompt saved.");
  else showToast("Prompt removed from saved.");
  render();
}

function updateFilters() {
  state.visibleCount = pageSize;
  writeUrlState();
  renderCatalog();
}

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value;
  updateFilters();
});

document.querySelector("#sort-select").addEventListener("change", (event) => {
  state.sort = event.target.value;
  updateFilters();
});

document.querySelector(".tier-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tier]");
  if (!button) return;
  state.tier = button.dataset.tier;
  updateFilters();
});

elements.categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  updateFilters();
});

elements.loadMore.addEventListener("click", () => {
  state.visibleCount += pageSize;
  renderCatalog();
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  state.query = "";
  state.tier = "all";
  state.category = "all";
  state.sort = "newest";
  state.savedOnly = false;
  elements.search.value = "";
  elements.sort.value = "newest";
  writeUrlState();
  renderCatalog();
});

document.body.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    toggleSaved(saveButton.dataset.save);
    return;
  }
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    await copyPrompt(copyButton.dataset.copy);
    return;
  }
});

window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);
readUrlState();
render();
