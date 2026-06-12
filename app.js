/* ============================================================
   Coffee Tracker – GitHub Pages + Supabase
   Getränke, Koffein, Mahlgrad, Shot-Daten, Verlauf, Statistiken
   ============================================================ */


/* ============================================================
   1. SUPABASE
   ============================================================ */

const SUPABASE_URL = "https://lrzgcqoqcwicpuuuhaoj.supabase.co";

// Hier deinen kompletten Publishable Key eintragen.
const SUPABASE_ANON_KEY = "DEIN_SUPABASE_PUBLISHABLE_KEY";

const TABLE_ENTRIES = "coffee_entries";
const TABLE_DRINKS = "coffee_drinks";
const TABLE_SETTINGS = "coffee_user_settings";
const TABLE_GRINDER = "coffee_grinder_settings";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;


/* ============================================================
   2. STATE
   ============================================================ */

const DEFAULT_DRINKS = [
  { name: "Espresso", drink_type: "Espresso", emoji: "☕", default_amount_ml: 30, default_caffeine_mg: 80 },
  { name: "Doppelter Espresso", drink_type: "Espresso", emoji: "☕", default_amount_ml: 60, default_caffeine_mg: 120 },
  { name: "Kaffee", drink_type: "Kaffee", emoji: "☕", default_amount_ml: 200, default_caffeine_mg: 95 },
  { name: "Cappuccino", drink_type: "Milchkaffee", emoji: "🥛", default_amount_ml: 180, default_caffeine_mg: 80 },
  { name: "Latte Macchiato", drink_type: "Milchkaffee", emoji: "🥛", default_amount_ml: 250, default_caffeine_mg: 80 },
  { name: "Cold Brew", drink_type: "Cold Brew", emoji: "🧊", default_amount_ml: 250, default_caffeine_mg: 150 },
  { name: "Entkoffeiniert", drink_type: "Entkoffeiniert", emoji: "🌙", default_amount_ml: 200, default_caffeine_mg: 5 },
];

const state = {
  entries: [],
  drinks: [],
  grinderSettings: [],
  settings: {
    caffeine_limit_mg: 400,
    unit: "ml",
  },
  editingId: null,
  filters: {
    date: "",
    drink: "",
  },
  grinderSearch: "",
};


/* ============================================================
   3. DOM
   ============================================================ */

const $ = (id) => document.getElementById(id);

const el = {
  tabs: $("tabs"),
  navToggle: $("navToggle"),

  drinkSelect: $("drinkSelect"),
  quickFavorites: $("quickFavorites"),
  entryForm: $("entryForm"),
  entryDate: $("entryDate"),
  entryTime: $("entryTime"),
  customDrinkName: $("customDrinkName"),
  drinkEmoji: $("drinkEmoji"),
  drinkType: $("drinkType"),
  amountMl: $("amountMl"),
  caffeineMg: $("caffeineMg"),
  mahlgrad: $("mahlgrad"),
  extractionTime: $("extractionTime"),
  pressureBar: $("pressureBar"),
  rating: $("rating"),
  note: $("note"),

  drinkError: $("drinkError"),
  amountError: $("amountError"),
  caffeineError: $("caffeineError"),
  formError: $("formError"),
  formMessage: $("formMessage"),

  saveEntryBtn: $("saveEntryBtn"),
  saveDrinkBtn: $("saveDrinkBtn"),
  cancelEditBtn: $("cancelEditBtn"),
  resetFormBtn: $("resetFormBtn"),
  editBadge: $("editBadge"),

  todayCount: $("todayCount"),
  todayCaffeine: $("todayCaffeine"),
  caffeineRemaining: $("caffeineRemaining"),
  avgDaily: $("avgDaily"),
  limitText: $("limitText"),
  overLimitHint: $("overLimitHint"),
  weekChart: $("weekChart"),
  monthCalendar: $("monthCalendar"),
  weekCompare: $("weekCompare"),
  topDrink: $("topDrink"),
  peakHour: $("peakHour"),
  hourChart: $("hourChart"),

  filterDate: $("filterDate"),
  filterDrink: $("filterDrink"),
  clearFiltersBtn: $("clearFiltersBtn"),
  deleteAllBtn: $("deleteAllBtn"),
  entriesList: $("entriesList"),
  entriesCount: $("entriesCount"),

  grinderSearch: $("grinderSearch"),
  grinderTable: $("grinderTable"),
  grinderCount: $("grinderCount"),

  limitInput: $("limitInput"),
  unitSelect: $("unitSelect"),
  saveSettingsBtn: $("saveSettingsBtn"),
  settingsMessage: $("settingsMessage"),

  toast: $("toast"),
};


/* ============================================================
   4. HELFER
   ============================================================ */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value, decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";

  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .trim();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  if (!el.toast) return;

  el.toast.textContent = message;
  el.toast.classList.add("show");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2600);
}

function setFormMessage(message, type = "info") {
  el.formMessage.textContent = message || "";
  el.formMessage.style.color = type === "error" ? "var(--danger)" : "var(--accent-light)";
}

function setSettingsMessage(message, type = "info") {
  el.settingsMessage.textContent = message || "";
  el.settingsMessage.style.color = type === "error" ? "var(--danger)" : "var(--accent-light)";
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

function dateKey(date) {
  return new Date(`${date}T00:00:00`).toISOString().slice(0, 10);
}

function formatDateHeader(date) {
  const d = new Date(`${date}T00:00:00`);
  const today = todayISO();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (date === today) return "Heute";
  if (date === yesterdayISO) return "Gestern";

  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatEntryTime(time) {
  if (!time) return "–";
  return String(time).slice(0, 5);
}

function getLastNDays(count) {
  const days = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return days;
}

function getPreviousNDays(count, offset) {
  const days = [];

  for (let i = count + offset - 1; i >= offset; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return days;
}


/* ============================================================
   5. INIT
   ============================================================ */

async function init() {
  initTabs();
  initFormDefaults();
  initEvents();

  if (!supabaseClient) {
    showToast("Supabase konnte nicht geladen werden.");
    return;
  }

  if (
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.includes("DEIN_") ||
    SUPABASE_ANON_KEY.includes("...")
  ) {
    setFormMessage("Bitte zuerst deinen kompletten Supabase Publishable Key in app.js eintragen.", "error");
    showToast("Supabase Key fehlt.");
    return;
  }

  await reloadAll();

  setTimeout(() => {
    el.drinkSelect?.focus();
  }, 350);
}

function initFormDefaults() {
  el.entryDate.value = todayISO();
  el.entryTime.value = nowTime();
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const viewName = tab.dataset.view;
      openView(viewName);
    });
  });

  el.navToggle?.addEventListener("click", () => {
    el.tabs.classList.toggle("open");
  });
}

function openView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });

  const target = $(`view-${viewName}`);
  if (target) target.classList.add("active");

  el.tabs.classList.remove("open");

  if (viewName === "dashboard") renderDashboard();
  if (viewName === "history") renderEntries();
  if (viewName === "grinder") renderGrinderSettings();
}


/* ============================================================
   6. SUPABASE LOAD
   ============================================================ */

async function reloadAll() {
  await Promise.all([
    loadSettings(),
    loadDrinks(),
    loadEntries(),
    loadGrinderSettings(),
  ]);

  renderAll();
}

async function loadSettings() {
  const { data, error } = await supabaseClient
    .from(TABLE_SETTINGS)
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Settings konnten nicht geladen werden:", error);
    return;
  }

  if (data) {
    state.settings = {
      caffeine_limit_mg: Number(data.caffeine_limit_mg) || 400,
      unit: data.unit || "ml",
    };
  }

  el.limitInput.value = state.settings.caffeine_limit_mg;
  el.unitSelect.value = state.settings.unit;
}

async function loadDrinks() {
  const { data, error } = await supabaseClient
    .from(TABLE_DRINKS)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Getränke konnten nicht geladen werden:", error);
    state.drinks = [...DEFAULT_DRINKS];
    return;
  }

  const byName = new Map();

  [...DEFAULT_DRINKS, ...(data || [])].forEach((drink) => {
    byName.set(normalize(drink.name), drink);
  });

  state.drinks = Array.from(byName.values());
}

async function loadEntries() {
  const { data, error } = await supabaseClient
    .from(TABLE_ENTRIES)
    .select("*")
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false });

  if (error) {
    console.error("Einträge konnten nicht geladen werden:", error);
    showToast("Einträge konnten nicht geladen werden.");
    state.entries = [];
    return;
  }

  state.entries = data || [];
}

async function loadGrinderSettings() {
  const { data, error } = await supabaseClient
    .from(TABLE_GRINDER)
    .select("*")
    .order("marke", { ascending: true })
    .order("bohne", { ascending: true })
    .order("mahlgrad", { ascending: true });

  if (error) {
    console.error("Mahlgrad-Daten konnten nicht geladen werden:", error);
    state.grinderSettings = [];
    return;
  }

  state.grinderSettings = data || [];
}


/* ============================================================
   7. EVENTS
   ============================================================ */

function initEvents() {
  el.entryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveEntry();
  });

  el.drinkSelect.addEventListener("change", () => {
    const drink = getDrinkByName(el.drinkSelect.value);
    fillFormFromDrink(drink);
    validateEntryForm(false);
  });

  [
    el.customDrinkName,
    el.amountMl,
    el.caffeineMg,
  ].forEach((input) => {
    input.addEventListener("input", () => validateEntryForm(false));
  });

  el.saveDrinkBtn.addEventListener("click", saveDrinkTemplate);
  el.resetFormBtn.addEventListener("click", resetForm);
  el.cancelEditBtn.addEventListener("click", cancelEdit);

  el.filterDate.addEventListener("change", () => {
    state.filters.date = el.filterDate.value;
    renderEntries();
  });

  el.filterDrink.addEventListener("change", () => {
    state.filters.drink = el.filterDrink.value;
    renderEntries();
  });

  el.clearFiltersBtn.addEventListener("click", () => {
    state.filters.date = "";
    state.filters.drink = "";
    el.filterDate.value = "";
    el.filterDrink.value = "";
    renderEntries();
  });

  el.deleteAllBtn.addEventListener("click", deleteAllEntries);

  el.grinderSearch.addEventListener("input", () => {
    state.grinderSearch = el.grinderSearch.value;
    renderGrinderSettings();
  });

  el.saveSettingsBtn.addEventListener("click", saveSettings);
}


/* ============================================================
   8. RENDER ALL
   ============================================================ */

function renderAll() {
  renderDrinkSelect();
  renderQuickFavorites();
  renderFilterDrinkSelect();
  renderDashboard();
  renderEntries();
  renderGrinderSettings();
}


/* ============================================================
   9. GETRÄNKE
   ============================================================ */

function renderDrinkSelect() {
  el.drinkSelect.innerHTML = "";

  state.drinks.forEach((drink) => {
    const option = document.createElement("option");
    option.value = drink.name;
    option.textContent = `${drink.emoji || "☕"} ${drink.name}`;
    el.drinkSelect.appendChild(option);
  });

  if (state.drinks.length) {
    fillFormFromDrink(state.drinks[0]);
  }
}

function renderQuickFavorites() {
  el.quickFavorites.innerHTML = "";

  state.drinks.slice(0, 6).forEach((drink) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-btn";
    button.innerHTML = `
      <span>${escapeHTML(drink.emoji || "☕")}</span>
      <strong>${escapeHTML(drink.name)}</strong>
      <small>${formatNumber(drink.default_caffeine_mg)} mg</small>
    `;

    button.addEventListener("click", () => {
      el.drinkSelect.value = drink.name;
      fillFormFromDrink(drink);
      openView("add");
    });

    el.quickFavorites.appendChild(button);
  });
}

function getDrinkByName(name) {
  return state.drinks.find((drink) => drink.name === name) || null;
}

function fillFormFromDrink(drink) {
  if (!drink) return;

  el.customDrinkName.value = "";
  el.drinkEmoji.value = drink.emoji || "☕";
  el.drinkType.value = drink.drink_type || "";
  el.amountMl.value = drink.default_amount_ml ?? "";
  el.caffeineMg.value = drink.default_caffeine_mg ?? "";
}

async function saveDrinkTemplate() {
  const name = el.customDrinkName.value.trim();

  if (!name) {
    setFormMessage("Bitte zuerst einen Namen für dein eigenes Getränk eintragen.", "error");
    return;
  }

  const payload = {
    name,
    drink_type: el.drinkType.value.trim() || null,
    emoji: el.drinkEmoji.value.trim() || "☕",
    default_amount_ml: toNumber(el.amountMl.value) ?? 200,
    default_caffeine_mg: toNumber(el.caffeineMg.value) ?? 80,
  };

  setButtonLoading(el.saveDrinkBtn, true, "Speichere ...", "Getränk als Vorlage speichern");

  const { error } = await supabaseClient
    .from(TABLE_DRINKS)
    .upsert(payload, { onConflict: "name" });

  setButtonLoading(el.saveDrinkBtn, false, "Speichere ...", "Getränk als Vorlage speichern");

  if (error) {
    console.error("Getränk konnte nicht gespeichert werden:", error);
    setFormMessage(`Getränk konnte nicht gespeichert werden: ${error.message}`, "error");
    return;
  }

  showToast("Getränkevorlage gespeichert ☕");
  setFormMessage("Getränkevorlage gespeichert.");
  await loadDrinks();
  renderDrinkSelect();
  renderQuickFavorites();
  renderFilterDrinkSelect();

  el.drinkSelect.value = name;
}


/* ============================================================
   10. FORMULAR
   ============================================================ */

function readEntryForm() {
  const selectedDrink = getDrinkByName(el.drinkSelect.value);
  const customName = el.customDrinkName.value.trim();

  const drinkName = customName || selectedDrink?.name || el.drinkSelect.value || "";
  const rawTime = el.entryTime.value || nowTime();

  return {
    entry_date: el.entryDate.value || todayISO(),
    entry_time: rawTime.length === 5 ? `${rawTime}:00` : rawTime,

    drink_name: drinkName,
    drink_type: el.drinkType.value.trim() || selectedDrink?.drink_type || null,
    emoji: el.drinkEmoji.value.trim() || selectedDrink?.emoji || "☕",

    amount_ml: toNumber(el.amountMl.value),
    caffeine_mg: toNumber(el.caffeineMg.value),

    note: el.note.value.trim() || null,

    mahlgrad: toNumber(el.mahlgrad.value),
    extraction_time_s: toNumber(el.extractionTime.value),
    pressure_bar: toNumber(el.pressureBar.value),
    rating: toNumber(el.rating.value),
  };
}

function validateEntryForm(showErrors = true) {
  const entry = readEntryForm();
  const errors = {
    drink: "",
    amount: "",
    caffeine: "",
    form: "",
  };

  if (!entry.drink_name) {
    errors.drink = "Bitte Getränk auswählen oder Namen eintragen.";
  }

  if (entry.amount_ml === null || entry.amount_ml < 0) {
    errors.amount = "Bitte eine gültige Menge eintragen.";
  }

  if (entry.caffeine_mg === null || entry.caffeine_mg < 0) {
    errors.caffeine = "Bitte gültigen Koffeinwert eintragen.";
  }

  const hasErrors = Boolean(errors.drink || errors.amount || errors.caffeine);

  if (showErrors || hasErrors) {
    el.drinkError.textContent = errors.drink;
    el.amountError.textContent = errors.amount;
    el.caffeineError.textContent = errors.caffeine;
    el.formError.textContent = errors.form;
  }

  return !hasErrors;
}

async function saveEntry() {
  if (!validateEntryForm(true)) return;

  const payload = readEntryForm();

  const isEditing = Boolean(state.editingId);
  const defaultText = isEditing ? "Änderung speichern" : "Kaffee hinzufügen ☕";

  setButtonLoading(el.saveEntryBtn, true, "Speichere ...", defaultText);

  let response;

  if (isEditing) {
    response = await supabaseClient
      .from(TABLE_ENTRIES)
      .update(payload)
      .eq("id", state.editingId)
      .select()
      .single();
  } else {
    response = await supabaseClient
      .from(TABLE_ENTRIES)
      .insert(payload)
      .select()
      .single();
  }

  setButtonLoading(el.saveEntryBtn, false, "Speichere ...", defaultText);

  if (response.error) {
    console.error("Eintrag konnte nicht gespeichert werden:", response.error);
    setFormMessage(`Speichern fehlgeschlagen: ${response.error.message}`, "error");
    return;
  }

  showToast(isEditing ? "Eintrag aktualisiert ☕" : "Kaffee hinzugefügt ☕");

  resetForm();
  await loadEntries();
  renderAll();
  openView("history");
}

function resetForm() {
  state.editingId = null;

  el.entryDate.value = todayISO();
  el.entryTime.value = nowTime();

  el.customDrinkName.value = "";
  el.note.value = "";
  el.mahlgrad.value = "";
  el.extractionTime.value = "";
  el.pressureBar.value = "";
  el.rating.value = "";

  if (state.drinks.length) {
    el.drinkSelect.value = state.drinks[0].name;
    fillFormFromDrink(state.drinks[0]);
  }

  el.formError.textContent = "";
  el.drinkError.textContent = "";
  el.amountError.textContent = "";
  el.caffeineError.textContent = "";
  setFormMessage("");

  el.saveEntryBtn.textContent = "Kaffee hinzufügen ☕";
  el.cancelEditBtn.classList.add("hidden");
  el.editBadge.classList.add("hidden");
}

function startEdit(entry) {
  state.editingId = entry.id;

  el.entryDate.value = entry.entry_date || todayISO();
  el.entryTime.value = formatEntryTime(entry.entry_time);

  const knownDrink = getDrinkByName(entry.drink_name);

  if (knownDrink) {
    el.drinkSelect.value = knownDrink.name;
    el.customDrinkName.value = "";
  } else {
    el.customDrinkName.value = entry.drink_name || "";
  }

  el.drinkEmoji.value = entry.emoji || "☕";
  el.drinkType.value = entry.drink_type || "";
  el.amountMl.value = entry.amount_ml ?? "";
  el.caffeineMg.value = entry.caffeine_mg ?? "";
  el.note.value = entry.note || "";

  el.mahlgrad.value = entry.mahlgrad ?? "";
  el.extractionTime.value = entry.extraction_time_s ?? "";
  el.pressureBar.value = entry.pressure_bar ?? "";
  el.rating.value = entry.rating ?? "";

  el.saveEntryBtn.textContent = "Änderung speichern";
  el.cancelEditBtn.classList.remove("hidden");
  el.editBadge.classList.remove("hidden");

  setFormMessage("Du bearbeitest gerade einen bestehenden Eintrag.");
  openView("add");
}

function cancelEdit() {
  resetForm();
  showToast("Bearbeiten abgebrochen.");
}


/* ============================================================
   11. EINTRÄGE / VERLAUF
   ============================================================ */

function getFilteredEntries() {
  return state.entries.filter((entry) => {
    const dateMatches = !state.filters.date || entry.entry_date === state.filters.date;
    const drinkMatches = !state.filters.drink || entry.drink_name === state.filters.drink;
    return dateMatches && drinkMatches;
  });
}

function renderFilterDrinkSelect() {
  const currentValue = el.filterDrink.value;

  const drinkNames = Array.from(
    new Set([
      ...state.drinks.map((drink) => drink.name),
      ...state.entries.map((entry) => entry.drink_name),
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "de"));

  el.filterDrink.innerHTML = `<option value="">Alle Getränke</option>`;

  drinkNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    el.filterDrink.appendChild(option);
  });

  el.filterDrink.value = currentValue;
}

function renderEntries() {
  const entries = getFilteredEntries();
  el.entriesCount.textContent = `${entries.length} Einträge`;
  el.entriesList.innerHTML = "";

  if (!entries.length) {
    el.entriesList.innerHTML = `
      <div class="empty">Noch keine passenden Einträge vorhanden.</div>
    `;
    return;
  }

  const groups = new Map();

  entries.forEach((entry) => {
    const key = entry.entry_date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  groups.forEach((dayEntries, day) => {
    const dayTotal = dayEntries.reduce((sum, entry) => sum + (Number(entry.caffeine_mg) || 0), 0);

    const group = document.createElement("section");
    group.className = "day-group";

    group.innerHTML = `
      <div class="day-head">
        <h3>${escapeHTML(formatDateHeader(day))}</h3>
        <span>${formatNumber(dayTotal)} mg Koffein</span>
      </div>
    `;

    dayEntries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "entry-card";
      card.tabIndex = 0;

      const ratingText = entry.rating ? `⭐ ${entry.rating}/5` : "⭐ –";

      card.innerHTML = `
        <div class="entry-main">
          <div class="entry-icon">${escapeHTML(entry.emoji || "☕")}</div>

          <div class="entry-content">
            <div class="entry-title-row">
              <strong>${escapeHTML(entry.drink_name)}</strong>
              <span>${escapeHTML(formatEntryTime(entry.entry_time))}</span>
            </div>

            <div class="entry-meta">
              <span>${formatNumber(entry.amount_ml)} ml</span>
              <span>${formatNumber(entry.caffeine_mg)} mg</span>
              <span>${escapeHTML(entry.drink_type || "Typ offen")}</span>
              <span>${ratingText}</span>
            </div>

            ${
              entry.mahlgrad || entry.extraction_time_s || entry.pressure_bar
                ? `
                  <div class="entry-meta secondary-meta">
                    <span>Mahlgrad ${formatNumber(entry.mahlgrad, 1)}</span>
                    <span>${formatNumber(entry.extraction_time_s, 1)} s</span>
                    <span>${formatNumber(entry.pressure_bar, 1)} Bar</span>
                  </div>
                `
                : ""
            }

            ${entry.note ? `<p>${escapeHTML(entry.note)}</p>` : ""}
          </div>
        </div>

        <button class="delete-entry" type="button" aria-label="Eintrag löschen">×</button>
      `;

      card.addEventListener("click", () => startEdit(entry));

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") startEdit(entry);
      });

      card.querySelector(".delete-entry").addEventListener("click", async (event) => {
        event.stopPropagation();
        await deleteEntry(entry.id);
      });

      group.appendChild(card);
    });

    el.entriesList.appendChild(group);
  });
}

async function deleteEntry(id) {
  const confirmed = window.confirm("Diesen Eintrag wirklich löschen?");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from(TABLE_ENTRIES)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Eintrag konnte nicht gelöscht werden:", error);
    showToast("Löschen fehlgeschlagen.");
    return;
  }

  showToast("Eintrag gelöscht.");
  await loadEntries();
  renderAll();
}

async function deleteAllEntries() {
  const firstConfirm = window.confirm("Wirklich ALLE Kaffee-Einträge löschen?");
  if (!firstConfirm) return;

  const secondConfirm = window.prompt('Zur Sicherheit bitte "ALLE LÖSCHEN" eingeben:');

  if (secondConfirm !== "ALLE LÖSCHEN") {
    showToast("Löschen abgebrochen.");
    return;
  }

  const { error } = await supabaseClient
    .from(TABLE_ENTRIES)
    .delete()
    .neq("id", 0);

  if (error) {
    console.error("Alle Einträge konnten nicht gelöscht werden:", error);
    showToast("Löschen fehlgeschlagen.");
    return;
  }

  showToast("Alle Einträge gelöscht.");
  await loadEntries();
  renderAll();
}


/* ============================================================
   12. DASHBOARD / STATS
   ============================================================ */

function renderDashboard() {
  const today = todayISO();
  const todayEntries = state.entries.filter((entry) => entry.entry_date === today);
  const todayCaffeine = sumCaffeine(todayEntries);
  const limit = Number(state.settings.caffeine_limit_mg) || 400;

  el.todayCount.textContent = String(todayEntries.length);
  el.todayCaffeine.textContent = `${formatNumber(todayCaffeine)} mg`;
  el.limitText.textContent = `Limit: ${formatNumber(limit)} mg`;

  const remaining = estimateRemainingCaffeine();
  el.caffeineRemaining.textContent = `${formatNumber(remaining)} mg`;

  const last7Days = getLastNDays(7);
  const last7Total = sumCaffeineForDays(last7Days);
  el.avgDaily.textContent = `${formatNumber(last7Total / 7)} mg`;

  if (todayCaffeine > limit) {
    el.overLimitHint.textContent = `Tageslimit überschritten: ${formatNumber(todayCaffeine)} mg von ${formatNumber(limit)} mg.`;
    el.overLimitHint.classList.remove("hidden");
  } else {
    el.overLimitHint.classList.add("hidden");
  }

  renderWeekChart();
  renderMonthCalendar();
  renderTopDrink();
  renderHourPattern();
}

function sumCaffeine(entries) {
  return entries.reduce((sum, entry) => sum + (Number(entry.caffeine_mg) || 0), 0);
}

function sumCaffeineForDays(days) {
  return days.reduce((sum, day) => {
    const entries = state.entries.filter((entry) => entry.entry_date === day);
    return sum + sumCaffeine(entries);
  }, 0);
}

function renderWeekChart() {
  const days = getLastNDays(7);
  const previousDays = getPreviousNDays(7, 7);
  const limit = Number(state.settings.caffeine_limit_mg) || 400;

  const currentTotal = sumCaffeineForDays(days);
  const previousTotal = sumCaffeineForDays(previousDays);

  if (previousTotal > 0) {
    const diff = ((currentTotal - previousTotal) / previousTotal) * 100;
    const prefix = diff >= 0 ? "+" : "";
    el.weekCompare.textContent = `${prefix}${formatNumber(diff)}% zur Vorwoche`;
  } else {
    el.weekCompare.textContent = "Keine Vorwoche";
  }

  el.weekChart.innerHTML = "";

  days.forEach((day) => {
    const caffeine = sumCaffeine(state.entries.filter((entry) => entry.entry_date === day));
    const percent = Math.min((caffeine / limit) * 100, 140);
    const d = new Date(`${day}T00:00:00`);

    const bar = document.createElement("div");
    bar.className = "bar-row";
    bar.innerHTML = `
      <span>${d.toLocaleDateString("de-DE", { weekday: "short" })}</span>
      <div class="bar-track">
        <div class="bar-fill ${caffeine > limit ? "over" : ""}" style="width:${percent}%"></div>
      </div>
      <strong>${formatNumber(caffeine)} mg</strong>
    `;

    el.weekChart.appendChild(bar);
  });
}

function renderMonthCalendar() {
  el.monthCalendar.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weekdayOffset = (firstDay.getDay() + 6) % 7;
  const limit = Number(state.settings.caffeine_limit_mg) || 400;

  ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((label) => {
    const head = document.createElement("div");
    head.className = "calendar-head";
    head.textContent = label;
    el.monthCalendar.appendChild(head);
  });

  for (let i = 0; i < weekdayOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-cell empty-cell";
    el.monthCalendar.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const key = date.toISOString().slice(0, 10);
    const caffeine = sumCaffeine(state.entries.filter((entry) => entry.entry_date === key));

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (caffeine > limit) cell.classList.add("over");

    cell.innerHTML = `
      <strong>${day}</strong>
      <span>${caffeine ? `${formatNumber(caffeine)} mg` : "–"}</span>
    `;

    el.monthCalendar.appendChild(cell);
  }
}

function renderTopDrink() {
  if (!state.entries.length) {
    el.topDrink.textContent = "Noch keine Daten";
    return;
  }

  const countMap = new Map();

  state.entries.forEach((entry) => {
    countMap.set(entry.drink_name, (countMap.get(entry.drink_name) || 0) + 1);
  });

  const top = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1])[0];

  el.topDrink.textContent = `${top[0]} (${top[1]}x)`;
}

function renderHourPattern() {
  const hourMap = new Map();

  state.entries.forEach((entry) => {
    const hour = Number(String(entry.entry_time || "00:00").slice(0, 2));
    if (Number.isFinite(hour)) {
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
  });

  el.hourChart.innerHTML = "";

  if (!hourMap.size) {
    el.peakHour.textContent = "–";
    el.hourChart.innerHTML = `<div class="empty compact">Noch keine Uhrzeit-Daten.</div>`;
    return;
  }

  const maxCount = Math.max(...hourMap.values());
  const topHour = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0];

  el.peakHour.textContent = `${String(topHour[0]).padStart(2, "0")}:00 Uhr`;

  for (let hour = 5; hour <= 23; hour++) {
    const count = hourMap.get(hour) || 0;
    const height = maxCount ? Math.max((count / maxCount) * 100, count ? 12 : 4) : 4;

    const item = document.createElement("div");
    item.className = "hour-item";
    item.innerHTML = `
      <div class="hour-bar" style="height:${height}%"></div>
      <span>${hour}</span>
    `;

    el.hourChart.appendChild(item);
  }
}

function estimateRemainingCaffeine() {
  const now = new Date();
  const halfLifeHours = 5;

  return state.entries.reduce((sum, entry) => {
    if (!entry.entry_date || !entry.entry_time) return sum;

    const entryDateTime = new Date(`${entry.entry_date}T${entry.entry_time}`);
    const diffHours = (now - entryDateTime) / 1000 / 60 / 60;

    if (diffHours < 0) return sum;

    const caffeine = Number(entry.caffeine_mg) || 0;
    const remaining = caffeine * Math.pow(0.5, diffHours / halfLifeHours);

    return sum + remaining;
  }, 0);
}


/* ============================================================
   13. MAHLGRADE
   ============================================================ */

function grinderMatches(item) {
  const q = normalize(state.grinderSearch);
  if (!q) return true;

  const haystack = normalize([
    item.marke,
    item.bohne,
    item.roestgrad,
    item.zusammensetzung,
    item.mahlgrad,
    item.extraktionszeit_36g_s,
    item.druck_bar,
    item.geschmack,
  ].join(" "));

  return q.split(/\s+/).every((term) => haystack.includes(term));
}

function renderGrinderSettings() {
  const items = state.grinderSettings.filter(grinderMatches);

  el.grinderCount.textContent = `${items.length} Einträge`;
  el.grinderTable.innerHTML = "";

  if (!items.length) {
    el.grinderTable.innerHTML = `
      <tr>
        <td colspan="8">Keine Mahlgrad-Daten gefunden.</td>
      </tr>
    `;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${escapeHTML(item.marke || "–")}</strong></td>
      <td>${escapeHTML(item.bohne || "–")}</td>
      <td>${escapeHTML(item.roestgrad || "–")}</td>
      <td>${formatNumber(item.mahlgrad, 1)}</td>
      <td>${formatNumber(item.extraktionszeit_36g_s, 1)} s</td>
      <td>${formatNumber(item.druck_bar, 1)} Bar</td>
      <td>${escapeHTML(item.geschmack || "–")}</td>
      <td><button class="row-btn" type="button">Nutzen</button></td>
    `;

    row.querySelector(".row-btn").addEventListener("click", () => {
      applyGrinderSetting(item);
    });

    el.grinderTable.appendChild(row);
  });
}

function applyGrinderSetting(item) {
  el.customDrinkName.value = item.bohne || "";
  el.drinkType.value = item.roestgrad || "Espresso";
  el.drinkEmoji.value = "☕";
  el.amountMl.value = 36;
  el.caffeineMg.value = 80;
  el.mahlgrad.value = item.mahlgrad ?? "";
  el.extractionTime.value = item.extraktionszeit_36g_s ?? "";
  el.pressureBar.value = item.druck_bar ?? "";
  el.note.value = item.geschmack || "";

  openView("add");
  setFormMessage("Mahlgrad-Vorlage übernommen.");
}


/* ============================================================
   14. SETTINGS
   ============================================================ */

async function saveSettings() {
  const limit = toNumber(el.limitInput.value);
  const unit = el.unitSelect.value || "ml";

  if (limit === null || limit < 0) {
    setSettingsMessage("Bitte ein gültiges Koffeinlimit eintragen.", "error");
    return;
  }

  setButtonLoading(el.saveSettingsBtn, true, "Speichere ...", "Einstellungen speichern");

  const { error } = await supabaseClient
    .from(TABLE_SETTINGS)
    .upsert({
      id: 1,
      caffeine_limit_mg: limit,
      unit,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  setButtonLoading(el.saveSettingsBtn, false, "Speichere ...", "Einstellungen speichern");

  if (error) {
    console.error("Einstellungen konnten nicht gespeichert werden:", error);
    setSettingsMessage(`Speichern fehlgeschlagen: ${error.message}`, "error");
    return;
  }

  state.settings.caffeine_limit_mg = limit;
  state.settings.unit = unit;

  setSettingsMessage("Einstellungen gespeichert.");
  showToast("Einstellungen gespeichert.");
  renderDashboard();
}


/* ============================================================
   START
   ============================================================ */

init();
