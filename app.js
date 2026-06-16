const SUPABASE_URL = "https://xzummprezpelooztdnnp.supabase.co";
const SUPABASE_KEY = "sb_publishable_ecMxYd2Lao32W6PmZqtbvQ_0s6l1tGS";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FOOD_TABLE = "bls_foods";
const OPENFOOD_CACHE_TABLE = "openfood_cache";
const OPENFOOD_API_BASE = "https://world.openfoodfacts.org";

const BLS_COLUMNS = {
  id: "BLS Code",
  nameDe: "Lebensmittelbezeichnung",
  nameEn: "Food name",
  calories: "ENERCC Energie (Kilokalorien) [kcal/100g]",
  protein: "PROT625 Protein (Nx6,25) [g/100g]",
  carbs: "CHO Kohlenhydrate, verfügbar [g/100g]",
  fat: "FAT Fett [g/100g]"
};

const USER_COOKIE_NAME = "foodtracker_user_id";

function getCookie(name) {
  const cookies = document.cookie.split(";").map(cookie => cookie.trim());
  const found = cookies.find(cookie => cookie.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split("=")[1]) : null;
}

function setCookie(name, value, days = 3650) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getOrCreateUserId() {
  let userId = getCookie(USER_COOKIE_NAME);

  if (!userId) {
    userId = crypto.randomUUID();
    setCookie(USER_COOKIE_NAME, userId);
  }

  return userId;
}

const deviceUserId = getOrCreateUserId();
let currentUserId = deviceUserId;

const $ = id => document.getElementById(id);

const headerDate = $("headerDate");
const openProfileBtn = $("openProfileBtn");
const closeProfileBtn = $("closeProfileBtn");
const profileDrawer = $("profileDrawer");

const dashboardDateInput = $("dashboardDateInput");
const prevDayBtn = $("prevDayBtn");
const todayBtn = $("todayBtn");
const nextDayBtn = $("nextDayBtn");

const foodSearchInput = $("foodSearchInput");
const inlineFoodSearchInput = $("inlineFoodSearchInput");
const searchFoodBtn = $("searchFoodBtn");
const foodResults = $("foodResults");
const favoriteChips = $("favoriteChips");
const sheetFavoriteChips = $("sheetFavoriteChips");

const selectedFoodBox = $("selectedFoodBox");
const selectedFoodName = $("selectedFoodName");
const amountInput = $("amountInput");
const mealCategoryInput = $("mealCategoryInput");
const eatenAtInput = $("eatenAtInput");
const saveMealBtn = $("saveMealBtn");
const saveFavoriteBtn = $("saveFavoriteBtn");

const previewCalories = $("previewCalories");
const previewProtein = $("previewProtein");
const previewCarbs = $("previewCarbs");
const previewFat = $("previewFat");

const todayCalories = $("todayCalories");
const todayProtein = $("todayProtein");
const todayCarbs = $("todayCarbs");
const todayFat = $("todayFat");
const calorieGoalText = $("calorieGoalText");
const calorieLeftText = $("calorieLeftText");
const dailyStatusText = $("dailyStatusText");
const calorieDonut = $("calorieDonut");

const proteinProgress = $("proteinProgress");
const carbsProgress = $("carbsProgress");
const fatProgress = $("fatProgress");
const proteinPercent = $("proteinPercent");
const carbsPercent = $("carbsPercent");
const fatPercent = $("fatPercent");

const currentWeightText = $("currentWeightText");
const weightGoalText = $("weightGoalText");
const weightDiffText = $("weightDiffText");
const weightTrendText = $("weightTrendText");
const weightWidget = $("weightWidget");

const dailyCalorieChart = $("dailyCalorieChart");
const dailyChartTotal = $("dailyChartTotal");
const dailyChartInfo = $("dailyChartInfo");
const weeklyCalorieChart = $("weeklyCalorieChart");
const weeklyChartTotal = $("weeklyChartTotal");
const weeklyChartInfo = $("weeklyChartInfo");
const trendCalorieChart = $("trendCalorieChart");
const trendChartAverage = $("trendChartAverage");
const trendChartInfo = $("trendChartInfo");

const todayMeals = $("todayMeals");
const dayMealsTitle = $("dayMealsTitle");

const weightInput = $("weightInput");
const weightDateInput = $("weightDateInput");
const saveWeightBtn = $("saveWeightBtn");
const weightSummary = $("weightSummary");
const weightList = $("weightList");

const profileNameInput = $("profileNameInput");
const profileAgeInput = $("profileAgeInput");
const profileGenderInput = $("profileGenderInput");
const profileHeightInput = $("profileHeightInput");
const profileActivityInput = $("profileActivityInput");
const targetWeightInput = $("targetWeightInput");
const dailyCalorieGoalInput = $("dailyCalorieGoalInput");
const saveProfileBtn = $("saveProfileBtn");

const openAddSheetBtn = $("openAddSheetBtn");
const closeAddSheetBtn = $("closeAddSheetBtn");
const addSheet = $("addSheet");
const sheetOverlay = $("sheetOverlay");
const navAddBtn = $("navAddBtn");

const scanBarcodeBtn = $("scanBarcodeBtn");
const scannerOverlay = $("scannerOverlay");
const closeScannerBtn = $("closeScannerBtn");
const scannerStatus = $("scannerStatus");
const scanPhotoBtn = $("scanPhotoBtn");
const barcodeImageInput = $("barcodeImageInput");

const deviceUserIdText = $("deviceUserIdText");
const activeUserIdText = $("activeUserIdText");

let selectedFood = null;
let profile = null;
let favorites = [];
let latestWeights = [];

let html5QrCode = null;
let isScannerRunning = false;

function initDefaults() {
  const today = new Date();

  eatenAtInput.value = toLocalDateTimeInput(today);
  weightDateInput.value = toDateInput(today);
  dashboardDateInput.value = toDateInput(today);

  updateHeaderDate();
  updateUserIdDisplay();

  foodSearchInput.placeholder = "BLS, OpenFood-Cache oder Barcode suchen";
  inlineFoodSearchInput.placeholder = "Lebensmittel oder Barcode suchen";
}

function updateUserIdDisplay() {
  if (deviceUserIdText) deviceUserIdText.textContent = deviceUserId;
  if (activeUserIdText) activeUserIdText.textContent = currentUserId;

  window.foodTrackerIds = {
    deviceUserId,
    currentUserId
  };
}

async function resolveCurrentUserId() {
  currentUserId = deviceUserId;

  try {
    const { data, error } = await supabaseClient
      .from("user_aliases")
      .select("main_user_id")
      .eq("cookie_user_id", deviceUserId)
      .maybeSingle();

    if (error) {
      console.warn("User-Verknüpfung konnte nicht geladen werden. App nutzt Geräte-ID:", error);
      updateUserIdDisplay();
      return;
    }

    if (data?.main_user_id) {
      currentUserId = data.main_user_id;
    }

    console.log("Geräte-ID:", deviceUserId);
    console.log("Aktive User-ID:", currentUserId);

    updateUserIdDisplay();
  } catch (error) {
    console.warn("User-Verknüpfung Fehler. App nutzt Geräte-ID:", error);
    updateUserIdDisplay();
  }
}

function toLocalDateTimeInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function parseDateInput(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const text = String(value).trim();

  if (
    text === "-" ||
    text.toUpperCase() === "TR" ||
    text.toUpperCase() === "NA" ||
    text.startsWith("<")
  ) {
    return 0;
  }

  return Number(text.replace(",", ".")) || 0;
}

function round(value, decimals = 1) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function isBarcode(value) {
  return /^\d{8,14}$/.test(String(value).trim());
}

function getValue(food, names) {
  for (const name of names) {
    if (food[name] !== undefined && food[name] !== null && food[name] !== "") {
      return food[name];
    }
  }

  return 0;
}

function getFoodId(food) {
  if (food.source === "openfood" || food.source === "openfood_cache") {
    return `openfood:${food.code}`;
  }

  if (food.source === "favorite") {
    return String(food.food_id || "").trim();
  }

  return `bls:${String(getValue(food, [
    BLS_COLUMNS.id,
    "bls_code",
    "BLS_Code",
    "id"
  ])).trim()}`;
}

function getFoodName(food) {
  if (food.source === "openfood" || food.source === "openfood_cache") {
    const brand = food.brands ? ` · ${food.brands}` : "";
    return `${food.product_name || "OpenFood Produkt"}${brand}`;
  }

  if (food.source === "favorite") {
    return food.food_name || "Favorit";
  }

  return String(getValue(food, [
    BLS_COLUMNS.nameDe,
    "lebensmittelbezeichnung",
    "Lebensmittel",
    "food_name_de",
    BLS_COLUMNS.nameEn,
    "food_name",
    "Food_Name"
  ])).trim() || "Unbekanntes Lebensmittel";
}

function getFoodNutritionPer100g(food) {
  if (food.source === "openfood" || food.source === "openfood_cache") {
    return {
      calories: toNumber(food.calories),
      protein: toNumber(food.protein),
      carbs: toNumber(food.carbs),
      fat: toNumber(food.fat)
    };
  }

  if (food.source === "favorite") {
    return {
      calories: toNumber(food.calories),
      protein: toNumber(food.protein_g),
      carbs: toNumber(food.carbs_g),
      fat: toNumber(food.fat_g)
    };
  }

  return {
    calories: toNumber(getValue(food, [BLS_COLUMNS.calories, "ENERCC", "energy_kcal", "calories", "Calories"])),
    protein: toNumber(getValue(food, [BLS_COLUMNS.protein, "PROT625", "protein_g", "Protein"])),
    carbs: toNumber(getValue(food, [BLS_COLUMNS.carbs, "CHO", "carbs_g", "Carbs"])),
    fat: toNumber(getValue(food, [BLS_COLUMNS.fat, "FAT", "fat_g", "Fat"]))
  };
}

function calculateNutritionForAmount(food, amountG) {
  const per100g = getFoodNutritionPer100g(food);
  const factor = amountG / 100;

  return {
    calories: round(per100g.calories * factor, 0),
    protein: round(per100g.protein * factor, 1),
    carbs: round(per100g.carbs * factor, 1),
    fat: round(per100g.fat * factor, 1)
  };
}

function normalizeSearchQuery(query) {
  const replacements = {
    yoghurt: "joghurt",
    yogurt: "joghurt",
    bananen: "banane",
    banana: "banane",
    aepfel: "apfel",
    äpfel: "apfel",
    apple: "apfel",
    haehnchen: "hähnchen",
    huhn: "hähnchen",
    chicken: "hähnchen",
    kaese: "käse",
    cheese: "käse",
    beef: "rind",
    rindfleisch: "rind",
    pork: "schwein",
    schweinefleisch: "schwein",
    rice: "reis",
    pasta: "nudeln",
    noodles: "nudeln",
    kartoffeln: "kartoffel",
    potato: "kartoffel",
    eier: "ei",
    egg: "ei",
    bread: "brot",
    oats: "hafer",
    oat: "hafer",
    haferflocken: "hafer",
    curd: "quark",
    salmon: "lachs",
    tuna: "thunfisch",
    tomatoes: "tomate",
    tomaten: "tomate",
    tomato: "tomate",
    cucumber: "gurke",
    gurken: "gurke",
    lettuce: "salat"
  };

  return query
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .split(/\s+/)
    .map(word => replacements[word] || word)
    .join(" ");
}

function getSearchTerms(query) {
  return normalizeSearchQuery(query)
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2);
}

async function getOpenFoodProductByBarcode(barcode) {
  const cached = await getOpenFoodProductFromCacheByCode(barcode);

  if (cached) {
    return cached;
  }

  const fields = [
    "code",
    "product_name",
    "brands",
    "quantity",
    "image_url",
    "nutriments"
  ].join(",");

  const url = `${OPENFOOD_API_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data || data.status !== 1 || !data.product) return null;

  const product = normalizeOpenFoodProduct(data.product);
  await upsertOpenFoodCache(product);

  return product;
}

async function searchOpenFoodProducts(query) {
  const params = new URLSearchParams({
    search_terms: query,
    page_size: "20",
    fields: "code,product_name,brands,quantity,image_url,nutriments"
  });

  const url = `${OPENFOOD_API_BASE}/cgi/search.pl?${params.toString()}&json=1`;
  const response = await fetch(url);
  const data = await response.json();

  const products = (data.products || [])
    .map(normalizeOpenFoodProduct)
    .filter(product => product.product_name && product.calories > 0);

  await Promise.all(products.map(upsertOpenFoodCache));

  return products;
}

function normalizeOpenFoodProduct(product) {
  const n = product.nutriments || {};

  return {
    source: "openfood",
    code: product.code || "",
    product_name: product.product_name || "Unbekanntes Produkt",
    brands: product.brands || "",
    quantity: product.quantity || "",
    image_url: product.image_url || "",
    calories: toNumber(n["energy-kcal_100g"]),
    protein: toNumber(n["proteins_100g"]),
    carbs: toNumber(n["carbohydrates_100g"]),
    fat: toNumber(n["fat_100g"])
  };
}

function normalizeOpenFoodCacheProduct(row) {
  return {
    source: "openfood_cache",
    code: row.code || "",
    product_name: row.product_name || "Unbekanntes Produkt",
    brands: row.brands || "",
    quantity: row.quantity || "",
    image_url: row.image_url || "",
    calories: toNumber(row.calories),
    protein: toNumber(row.protein_g),
    carbs: toNumber(row.carbs_g),
    fat: toNumber(row.fat_g)
  };
}

async function upsertOpenFoodCache(product) {
  if (!product || !product.code) return;

  const { error } = await supabaseClient
    .from(OPENFOOD_CACHE_TABLE)
    .upsert(
      {
        code: product.code,
        product_name: product.product_name || "",
        brands: product.brands || "",
        quantity: product.quantity || "",
        image_url: product.image_url || "",
        calories: toNumber(product.calories),
        protein_g: toNumber(product.protein),
        carbs_g: toNumber(product.carbs),
        fat_g: toNumber(product.fat),
        updated_at: new Date().toISOString()
      },
      { onConflict: "code" }
    );

  if (error) {
    console.warn("OpenFood Cache konnte nicht gespeichert werden:", error);
  }
}

async function getOpenFoodProductFromCacheByCode(code) {
  const { data, error } = await supabaseClient
    .from(OPENFOOD_CACHE_TABLE)
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.warn("OpenFood Cache Barcode-Suche Fehler:", error);
    return null;
  }

  return data ? normalizeOpenFoodCacheProduct(data) : null;
}

async function searchOpenFoodCache(query) {
  const searchTerms = getSearchTerms(query);

  if (searchTerms.length === 0) return [];

  let request = supabaseClient
    .from(OPENFOOD_CACHE_TABLE)
    .select("*")
    .limit(30);

  searchTerms.forEach(term => {
    request = request.or(`product_name.ilike.%${term}%,brands.ilike.%${term}%`);
  });

  const { data, error } = await request;

  if (error) {
    console.warn("OpenFood Cache Suche Fehler:", error);
    return [];
  }

  return (data || []).map(normalizeOpenFoodCacheProduct);
}

async function searchBlsFoods(query) {
  const searchTerms = getSearchTerms(query);

  if (searchTerms.length === 0) return [];

  let request = supabaseClient
    .from(FOOD_TABLE)
    .select("*")
    .limit(40);

  searchTerms.forEach(term => {
    request = request.ilike(BLS_COLUMNS.nameDe, `%${term}%`);
  });

  const { data, error } = await request;

  if (error) {
    console.error("BLS-Suche Fehler:", error);
    return [];
  }

  return sortFoodResults(data || [], searchTerms);
}

async function searchFoodsFromInput(value) {
  const query = value.trim();

  if (!query) {
    alert("Bitte Lebensmittel oder Barcode eingeben.");
    return;
  }

  openAddSheet();
  foodSearchInput.value = query;
  foodResults.innerHTML = "<p>Suche läuft...</p>";

  if (isBarcode(query)) {
    try {
      const product = await getOpenFoodProductByBarcode(query);

      if (!product) {
        foodResults.innerHTML = "<p>Kein Produkt mit diesem Barcode gefunden.</p>";
        return;
      }

      renderFoodResults([product]);
      return;
    } catch (error) {
      console.error("Barcode-Suche Fehler:", error);
      foodResults.innerHTML = "<p>Barcode-Suche hat nicht geklappt.</p>";
      return;
    }
  }

  const [blsResult, cacheResult, apiResult] = await Promise.allSettled([
    searchBlsFoods(query),
    searchOpenFoodCache(query),
    searchOpenFoodProducts(query)
  ]);

  const blsResults = blsResult.status === "fulfilled" ? blsResult.value : [];
  const cacheResults = cacheResult.status === "fulfilled" ? cacheResult.value : [];
  const apiResults = apiResult.status === "fulfilled" ? apiResult.value : [];

  if (apiResult.status === "rejected") {
    console.warn("OpenFoodFacts API-Suche blockiert/fehlgeschlagen:", apiResult.reason);
  }

  const combinedResults = deduplicateFoodResults([
    ...blsResults,
    ...cacheResults,
    ...apiResults
  ]);

  if (combinedResults.length === 0) {
    foodResults.innerHTML = "<p>Keine Lebensmittel gefunden.</p>";
    return;
  }

  renderFoodResults(combinedResults);
}

function deduplicateFoodResults(foods) {
  const seen = new Set();

  return foods.filter(food => {
    const id = getFoodId(food);

    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
}

function sortFoodResults(foods, terms) {
  return (foods || []).sort((a, b) => {
    const aName = getFoodName(a).toLowerCase();
    const bName = getFoodName(b).toLowerCase();
    return getSearchScore(bName, terms) - getSearchScore(aName, terms);
  });
}

function getSearchScore(name, terms) {
  let score = 0;

  terms.forEach(term => {
    if (name.startsWith(term)) score += 10;
    if (name.includes(term)) score += 5;
    if (name.includes(` ${term}`)) score += 3;
  });

  return score;
}

function renderFoodResults(foods) {
  foodResults.innerHTML = "";

  if (!foods || foods.length === 0) {
    foodResults.innerHTML = "<p>Keine Lebensmittel gefunden.</p>";
    return;
  }

  foods.forEach(food => {
    const nutrition = getFoodNutritionPer100g(food);
    const div = document.createElement("div");
    div.className = "food-result";

    let sourceBadge = "🇩🇪 BLS";

    if (food.source === "openfood") {
      sourceBadge = "🛒 OpenFoodFacts";
    }

    if (food.source === "openfood_cache") {
      sourceBadge = "💾 OpenFood Cache";
    }

    div.innerHTML = `
      <strong>${escapeHtml(getFoodName(food))}</strong>
      <small>
        ${sourceBadge} · ${nutrition.calories} kcal ·
        Protein ${nutrition.protein} g ·
        KH ${nutrition.carbs} g ·
        Fett ${nutrition.fat} g pro 100 g
      </small>
      ${(food.source === "openfood" || food.source === "openfood_cache") && food.image_url ? `<img class="food-thumb" src="${food.image_url}" alt="${escapeHtml(getFoodName(food))}">` : ""}
    `;

    div.addEventListener("click", () => selectFood(food));
    foodResults.appendChild(div);
  });
}

function selectFood(food) {
  selectedFood = food;

  selectedFoodName.textContent = getFoodName(food);
  selectedFoodBox.classList.remove("hidden");

  foodResults.insertAdjacentElement("beforebegin", selectedFoodBox);

  selectedFoodBox.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  updateNutritionPreview();
}

function updateNutritionPreview() {
  if (!selectedFood) return;

  const amountG = toNumber(amountInput.value) || 100;
  const n = calculateNutritionForAmount(selectedFood, amountG);

  previewCalories.textContent = `${n.calories} kcal`;
  previewProtein.textContent = `${n.protein} g`;
  previewCarbs.textContent = `${n.carbs} g`;
  previewFat.textContent = `${n.fat} g`;
}

async function saveMeal() {
  if (!selectedFood) return alert("Bitte erst ein Lebensmittel auswählen.");

  const amountG = toNumber(amountInput.value);
  if (!amountG || amountG <= 0) return alert("Bitte eine gültige Menge eingeben.");

  const n = calculateNutritionForAmount(selectedFood, amountG);
  const eatenAt = eatenAtInput.value ? new Date(eatenAtInput.value).toISOString() : new Date().toISOString();

  const { error } = await supabaseClient.from("meal_logs").insert({
    user_id: currentUserId,
    food_id: getFoodId(selectedFood),
    food_name: getFoodName(selectedFood),
    meal_category: mealCategoryInput.value,
    amount_g: amountG,
    calories: n.calories,
    protein_g: n.protein,
    carbs_g: n.carbs,
    fat_g: n.fat,
    eaten_at: eatenAt
  });

  if (error) {
    console.error(error);
    alert("Mahlzeit konnte nicht gespeichert werden.");
    return;
  }

  selectedFood = null;
  selectedFoodBox.classList.add("hidden");
  foodSearchInput.value = "";
  inlineFoodSearchInput.value = "";
  foodResults.innerHTML = "";
  amountInput.value = 100;
  eatenAtInput.value = toLocalDateTimeInput(new Date());

  closeAddSheet();
  await loadDashboard();
}

async function loadFavorites() {
  const { data, error } = await supabaseClient
    .from("food_favorites")
    .select("*")
    .eq("user_id", currentUserId)
    .order("food_name", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  favorites = data || [];
  renderFavoriteChips();
}

function renderFavoriteChips() {
  favoriteChips.innerHTML = "";
  sheetFavoriteChips.innerHTML = "";

  if (favorites.length === 0) {
    favoriteChips.innerHTML = `<span class="empty-chip">Noch keine Favoriten</span>`;
    sheetFavoriteChips.innerHTML = `<span class="empty-chip">Noch keine Favoriten</span>`;
    return;
  }

  favorites.forEach(fav => {
    favoriteChips.appendChild(createFavoriteChip(fav));
    sheetFavoriteChips.appendChild(createFavoriteChip(fav));
  });
}

function createFavoriteChip(fav) {
  const chip = document.createElement("div");
  chip.className = "food-chip favorite-chip";

  const nameBtn = document.createElement("button");
  nameBtn.className = "favorite-chip-name";
  nameBtn.textContent = fav.food_name;

  nameBtn.addEventListener("click", () => {
    openAddSheet();

    selectFood({
      source: "favorite",
      food_id: fav.food_id,
      food_name: fav.food_name,
      calories: fav.calories,
      protein_g: fav.protein_g,
      carbs_g: fav.carbs_g,
      fat_g: fav.fat_g
    });
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "favorite-chip-delete";
  deleteBtn.textContent = "×";
  deleteBtn.title = "Favorit löschen";

  deleteBtn.addEventListener("click", async event => {
    event.stopPropagation();
    await deleteFavorite(fav.food_id);
  });

  chip.appendChild(nameBtn);
  chip.appendChild(deleteBtn);

  return chip;
}

async function saveSelectedFoodAsFavorite() {
  if (!selectedFood) return alert("Bitte erst ein Lebensmittel auswählen.");

  const n = getFoodNutritionPer100g(selectedFood);
  const foodId = getFoodId(selectedFood);

  const { error } = await supabaseClient.from("food_favorites").upsert({
    user_id: currentUserId,
    food_id: foodId,
    food_name: getFoodName(selectedFood),
    calories: n.calories,
    protein_g: n.protein,
    carbs_g: n.carbs,
    fat_g: n.fat
  }, { onConflict: "user_id,food_id" });

  if (error) {
    console.error(error);
    alert("Favorit konnte nicht gespeichert werden.");
    return;
  }

  if (selectedFood.source === "openfood" || selectedFood.source === "openfood_cache") {
    await upsertOpenFoodCache(selectedFood);
  }

  await loadFavorites();
  alert("Favorit gespeichert.");
}

async function deleteFavorite(foodId) {
  if (!foodId) return;

  if (!confirm("Favorit wirklich löschen?")) return;

  const { error } = await supabaseClient
    .from("food_favorites")
    .delete()
    .eq("user_id", currentUserId)
    .eq("food_id", foodId);

  if (error) {
    console.error("Fehler beim Löschen des Favoriten:", error);
    alert("Favorit konnte nicht gelöscht werden.");
    return;
  }

  await loadFavorites();
}

/* -------------------------------------------------------
   Barcode Scanner — Native BarcodeDetector + html5-qrcode Fallback
------------------------------------------------------- */

let nativeDetector = null;
let nativeStream = null;
let nativeScanLoop = null;
let currentFacingMode = 'environment';
let useNativeScanner = false;
let currentZoom = 1;
let torchActive = false;

async function initScanner() {
  if ('BarcodeDetector' in window) {
    try {
      nativeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
      });
      useNativeScanner = true;
      console.log('✅ Native BarcodeDetector aktiv');
    } catch (e) { useNativeScanner = false; }
  } else {
    useNativeScanner = false;
    console.log('⚠️ Fallback: html5-qrcode');
  }
}

/* --- Blur-Detection: Frame nur auswerten wenn scharf genug --- */
function isFrameSharp(video, threshold = 80) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64; // kleiner Sample-Bereich
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let variance = 0;
    let mean = 0;
    for (let i = 0; i < data.length; i += 4) {
      mean += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    mean /= (data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i+1] + data[i+2]) / 3;
      variance += (lum - mean) ** 2;
    }
    variance /= (data.length / 4);
    return Math.sqrt(variance) > threshold;
  } catch (e) { return true; }
}

/* --- Native BarcodeDetector --- */

async function startNativeScanner() {
  const scannerReader = $('scannerReader');
  scannerReader.innerHTML = '';

  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('autoplay', 'true');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:22px;display:block;';
  scannerReader.appendChild(video);

  nativeStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: currentFacingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  });

  video.srcObject = nativeStream;
  await video.play();

  // Kamera-Capabilities auslesen und optimale Einstellungen setzen
  const track = nativeStream.getVideoTracks()[0];
  const capabilities = track.getCapabilities?.() || {};
  const advanced = [];

  // Kontinuierlicher Autofokus
  if (capabilities.focusMode?.includes('continuous')) {
    advanced.push({ focusMode: 'continuous' });
  }

  // Zoom: bei Hauptkamera 2× als Standard
  if (capabilities.zoom && currentFacingMode === 'environment') {
    const maxZoom = capabilities.zoom.max || 1;
    const targetZoom = Math.min(currentZoom === 1 ? 2 : currentZoom, maxZoom);
    currentZoom = targetZoom;
    advanced.push({ zoom: targetZoom });
    updateZoomButtons(targetZoom);
  }

  if (advanced.length > 0) {
    try { await track.applyConstraints({ advanced }); } catch (e) {}
  }

  isScannerRunning = true;
  torchActive = false;
  updateTorchButton();
  scannerStatus.textContent = '📦 Scanner läuft – Barcode einfach hinhalten';

  const detectLoop = async () => {
    if (!isScannerRunning || !nativeDetector) return;
    try {
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        // Blur-Check: nur scharfe Frames auswerten
        if (isFrameSharp(video)) {
          const barcodes = await nativeDetector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            await onScanSuccess(barcodes[0].rawValue);
            return;
          }
        }
      }
    } catch (e) {}
    nativeScanLoop = requestAnimationFrame(detectLoop);
  };

  nativeScanLoop = requestAnimationFrame(detectLoop);
}

async function stopNativeScanner() {
  isScannerRunning = false;
  if (nativeScanLoop) { cancelAnimationFrame(nativeScanLoop); nativeScanLoop = null; }
  if (nativeStream) {
    // Torch ausschalten vor Stop
    try {
      const track = nativeStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: false }] });
    } catch (e) {}
    nativeStream.getTracks().forEach(t => t.stop());
    nativeStream = null;
  }
  torchActive = false;
  updateTorchButton();
  const scannerReader = $('scannerReader');
  if (scannerReader) scannerReader.innerHTML = '';
}

/* --- Torch --- */

async function toggleTorch() {
  if (!nativeStream) return;
  try {
    const track = nativeStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.() || {};
    if (!capabilities.torch) {
      scannerStatus.textContent = 'Taschenlampe nicht verfügbar.';
      return;
    }
    torchActive = !torchActive;
    await track.applyConstraints({ advanced: [{ torch: torchActive }] });
    updateTorchButton();
    scannerStatus.textContent = torchActive ? '🔦 Licht an' : '🔦 Licht aus';
    setTimeout(() => {
      if (isScannerRunning) scannerStatus.textContent = '📦 Scanner läuft – Barcode einfach hinhalten';
    }, 1200);
  } catch (e) {
    scannerStatus.textContent = 'Taschenlampe nicht verfügbar.';
  }
}

function updateTorchButton() {
  const btn = $('torchBtn');
  if (!btn) return;
  btn.classList.toggle('active', torchActive);
  btn.textContent = torchActive ? '🔦 Licht an' : '🔦 Licht';
}

/* --- Zoom --- */

async function setZoom(zoom) {
  currentZoom = zoom;
  updateZoomButtons(zoom);
  if (!nativeStream) return;
  try {
    const track = nativeStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.() || {};
    if (!capabilities.zoom) return;
    const capped = Math.min(zoom, capabilities.zoom.max || zoom);
    await track.applyConstraints({ advanced: [{ zoom: capped }] });
  } catch (e) {}
}

function updateZoomButtons(zoom) {
  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.zoom) === Math.round(zoom));
  });
}

/* --- html5-qrcode Fallback --- */

function getScannerFormats() {
  if (!window.Html5QrcodeSupportedFormats) return undefined;
  return [
    Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.QR_CODE
  ];
}

function createScannerInstance() {
  const config = {};
  const formatsToSupport = getScannerFormats();
  if (formatsToSupport) config.formatsToSupport = formatsToSupport;
  return new Html5Qrcode('scannerReader', config);
}

async function startFallbackScanner() {
  if (!window.Html5Qrcode) {
    scannerStatus.textContent = 'Scanner-Bibliothek konnte nicht geladen werden.';
    return;
  }
  if (!html5QrCode) html5QrCode = createScannerInstance();
  await html5QrCode.start(
    { facingMode: currentFacingMode },
    { fps: 15, aspectRatio: 1.777 },
    onScanSuccess,
    () => {}
  );
  isScannerRunning = true;
  scannerStatus.textContent = 'Scanner läuft. Barcode bitte mittig ausrichten.';
}

async function stopFallbackScanner() {
  try {
    if (html5QrCode && isScannerRunning) await html5QrCode.stop();
    if (html5QrCode) await html5QrCode.clear();
  } catch (e) {
    console.warn('html5-qrcode stop Fehler:', e);
  } finally {
    html5QrCode = null;
    isScannerRunning = false;
  }
}

/* --- Unified API --- */

async function openScanner() {
  scannerOverlay.classList.remove('hidden');
  scannerStatus.textContent = 'Kamera wird gestartet...';
  currentZoom = currentFacingMode === 'environment' ? 2 : 1;
  const focusCamBtn = $('focusCamBtn');
  if (focusCamBtn) focusCamBtn.style.display = useNativeScanner ? 'none' : 'block';
  await startBarcodeScanner();
}

async function startBarcodeScanner() {
  try {
    if (useNativeScanner) await startNativeScanner();
    else await startFallbackScanner();
  } catch (error) {
    console.error('Scanner Fehler:', error);
    if (useNativeScanner) {
      useNativeScanner = false;
      try { await startFallbackScanner(); return; } catch (e) {}
    }
    scannerStatus.textContent = 'Kamera konnte nicht gestartet werden. Nutze den Foto-Button.';
  }
}

async function stopBarcodeScanner() {
  if (useNativeScanner || nativeStream) await stopNativeScanner();
  else await stopFallbackScanner();
}

async function closeScanner() {
  await stopBarcodeScanner();
  scannerOverlay.classList.add('hidden');
  scannerStatus.textContent = 'Scanner wird vorbereitet...';
}

async function switchCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  currentZoom = currentFacingMode === 'environment' ? 2 : 1;
  scannerStatus.textContent = 'Kamera wird gewechselt...';
  await stopBarcodeScanner();
  await startBarcodeScanner();
}

async function triggerFocus() {
  if (useNativeScanner) return;
  try {
    const video = document.querySelector('#scannerReader video');
    if (!video?.srcObject) return;
    const track = video.srcObject.getVideoTracks()[0];
    await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
    scannerStatus.textContent = 'Fokus gesetzt ✓';
    setTimeout(() => {
      if (isScannerRunning) scannerStatus.textContent = 'Scanner läuft.';
    }, 1500);
  } catch (e) {
    scannerStatus.textContent = 'Fokus nicht unterstützt.';
  }
}

async function onScanSuccess(decodedText) {
  const scannedValue = String(decodedText || '').trim();
  if (!scannedValue) return;
  scannerStatus.textContent = `Erkannt: ${scannedValue}`;
  await handleScannedCode(scannedValue);
}

async function resizeImageForScan(file, maxWidth = 1600) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    };
    img.src = url;
  });
}

async function scanBarcodeFromImage(file) {
  if (!file) { scannerStatus.textContent = 'Kein Bild ausgewählt.'; return; }
  try {
    scannerOverlay.classList.remove('hidden');
    scannerStatus.textContent = 'Bild wird analysiert...';
    await stopBarcodeScanner();
    if ('BarcodeDetector' in window && nativeDetector) {
      try {
        const bitmap = await createImageBitmap(file);
        const barcodes = await nativeDetector.detect(bitmap);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          scannerStatus.textContent = `Erkannt: ${barcodes[0].rawValue}`;
          await handleScannedCode(barcodes[0].rawValue);
          return;
        }
      } catch (e) {}
    }
    if (!window.Html5Qrcode) { scannerStatus.textContent = 'Scanner-Bibliothek nicht geladen.'; return; }
    const resizedBlob = await resizeImageForScan(file, 1600);
    html5QrCode = createScannerInstance();
    const decodedText = await html5QrCode.scanFile(resizedBlob, true);
    const scannedValue = String(decodedText || '').trim();
    if (!scannedValue) { scannerStatus.textContent = 'Kein Code erkannt. Versuche es mit mehr Licht.'; return; }
    await handleScannedCode(scannedValue);
  } catch (error) {
    scannerStatus.textContent = 'Kein Barcode erkannt. Versuche es gerader und heller.';
  } finally {
    barcodeImageInput.value = '';
    html5QrCode = null;
  }
}

async function handleScannedCode(scannedValue) {
  await closeScanner();
  foodSearchInput.value = scannedValue;
  if (isBarcode(scannedValue)) await searchFoodsFromInput(scannedValue);
  else {
    openAddSheet();
    foodResults.innerHTML = `<p>Code erkannt, aber kein gültiger Barcode: ${escapeHtml(scannedValue)}</p>`;
  }
}

function getSelectedDateString() {
  return dashboardDateInput.value || toDateInput(new Date());
}

function getDayRange(dateString) {
  const start = parseDateInput(dateString);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMonday(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameLocalDay(a, b) {
  return toDateInput(a) === toDateInput(b);
}

function formatDashboardDate(dateString) {
  const date = parseDateInput(dateString);
  if (isSameLocalDay(date, new Date())) return "Heute";

  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function updateHeaderDate() {
  headerDate.textContent = formatDashboardDate(getSelectedDateString());
}

async function loadDashboard() {
  updateHeaderDate();

  const selectedDateString = getSelectedDateString();
  const { start, end } = getDayRange(selectedDateString);

  dayMealsTitle.textContent = `Mahlzeiten · ${formatDashboardDate(selectedDateString)}`;

  const { data, error } = await supabaseClient
    .from("meal_logs")
    .select("*")
    .eq("user_id", currentUserId)
    .gte("eaten_at", start.toISOString())
    .lt("eaten_at", end.toISOString())
    .order("eaten_at", { ascending: true });

  if (error) {
    console.error(error);
    todayMeals.innerHTML = "<p>Mahlzeiten konnten nicht geladen werden.</p>";
    return;
  }

  renderMeals(data || []);
  updateSummary(data || []);
  renderDailyChart(data || [], selectedDateString);
  await loadWeeklyAndTrendCharts(selectedDateString);
}

function updateSummary(meals) {
  const totals = meals.reduce((sum, meal) => {
    sum.calories += toNumber(meal.calories);
    sum.protein += toNumber(meal.protein_g);
    sum.carbs += toNumber(meal.carbs_g);
    sum.fat += toNumber(meal.fat_g);
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const goal = profile?.daily_calorie_goal ? toNumber(profile.daily_calorie_goal) : 0;
  const caloriePercent = goal > 0 ? Math.min((totals.calories / goal) * 100, 100) : 0;
  const left = goal > 0 ? goal - totals.calories : 0;

  todayCalories.textContent = round(totals.calories, 0);
  todayProtein.textContent = `${round(totals.protein, 1)} g`;
  todayCarbs.textContent = `${round(totals.carbs, 1)} g`;
  todayFat.textContent = `${round(totals.fat, 1)} g`;

  calorieGoalText.textContent = goal > 0 ? `von ${goal} kcal` : "Ziel nicht gesetzt";
  calorieLeftText.textContent = goal > 0
    ? `${Math.abs(round(left, 0))} kcal ${left >= 0 ? "frei" : "drüber"}`
    : `${round(totals.calories, 0)} kcal`;

  dailyStatusText.textContent = goal > 0
    ? left >= 0 ? "Du bist noch im Zielbereich." : "Du bist über deinem Tagesziel."
    : "Setze ein Kalorienziel im Profil.";

  setDonut(caloriePercent);

  updateMacroBar(proteinProgress, proteinPercent, totals.protein, 150);
  updateMacroBar(carbsProgress, carbsPercent, totals.carbs, 300);
  updateMacroBar(fatProgress, fatPercent, totals.fat, 80);
}

function setDonut(percent) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  calorieDonut.style.strokeDasharray = circumference;
  calorieDonut.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}

function updateMacroBar(bar, label, value, target) {
  const percent = Math.min((value / target) * 100, 100);

  bar.style.width = `${percent}%`;
  label.textContent = `${round(percent, 0)}%`;
}

function renderMeals(meals) {
  todayMeals.innerHTML = "";

  if (meals.length === 0) {
    todayMeals.innerHTML = "<p>Für diesen Tag sind noch keine Mahlzeiten eingetragen.</p>";
    return;
  }

  const groups = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

  groups.forEach(group => {
    const groupMeals = meals.filter(meal => (meal.meal_category || "Snack") === group);

    if (groupMeals.length === 0) return;

    const title = document.createElement("h4");
    title.className = "meal-group-title";
    title.textContent = group;
    todayMeals.appendChild(title);

    groupMeals.forEach(meal => {
      const div = document.createElement("div");
      div.className = "meal-item";

      div.innerHTML = `
        <div>
          <strong>${escapeHtml(meal.food_name)}</strong>
          <div class="meal-meta">${meal.amount_g} g · ${meal.calories} kcal · ${formatTime(meal.eaten_at)}</div>
        </div>
        <button class="delete-btn">×</button>
      `;

      div.querySelector(".delete-btn").addEventListener("click", () => deleteMeal(meal.id));
      todayMeals.appendChild(div);
    });
  });
}

async function deleteMeal(id) {
  if (!confirm("Mahlzeit löschen?")) return;

  const { error } = await supabaseClient
    .from("meal_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUserId);

  if (error) {
    alert("Mahlzeit konnte nicht gelöscht werden.");
    return;
  }

  await loadDashboard();
}

async function loadWeeklyAndTrendCharts(selectedDateString) {
  const selectedDate = parseDateInput(selectedDateString);

  const weekStart = getMonday(selectedDate);
  const weekEnd = addDays(weekStart, 7);

  const trendStart = addDays(selectedDate, -29);
  trendStart.setHours(0, 0, 0, 0);

  const trendEnd = addDays(selectedDate, 1);
  trendEnd.setHours(0, 0, 0, 0);

  const [weekly, trend] = await Promise.all([
    supabaseClient.from("meal_logs").select("*").eq("user_id", currentUserId).gte("eaten_at", weekStart.toISOString()).lt("eaten_at", weekEnd.toISOString()),
    supabaseClient.from("meal_logs").select("*").eq("user_id", currentUserId).gte("eaten_at", trendStart.toISOString()).lt("eaten_at", trendEnd.toISOString())
  ]);

  if (!weekly.error) renderWeeklyChart(weekly.data || [], weekStart);
  if (!trend.error) renderTrendChart(trend.data || [], trendStart, 30);
}

function createDailyTotals(meals, startDate, days) {
  const totals = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    totals.push({ date, key: toDateInput(date), calories: 0 });
  }

  meals.forEach(meal => {
    const key = toDateInput(new Date(meal.eaten_at));
    const entry = totals.find(item => item.key === key);

    if (entry) entry.calories += toNumber(meal.calories);
  });

  return totals;
}

function renderDailyChart(meals, selectedDateString) {
  const sorted = meals.slice().sort((a, b) => new Date(a.eaten_at) - new Date(b.eaten_at));
  const total = sorted.reduce((s, m) => s + toNumber(m.calories), 0);

  dailyChartTotal.textContent = `${round(total, 0)} kcal`;

  if (sorted.length === 0) {
    dailyChartInfo.textContent = "Keine Daten";
    dailyCalorieChart.innerHTML = `<div class="chart-empty">Für diesen Tag gibt es noch keinen Verlauf.</div>`;
    return;
  }

  dailyChartInfo.textContent = `${sorted.length} Mahlzeit${sorted.length === 1 ? "" : "en"}`;

  const goal = profile?.daily_calorie_goal ? toNumber(profile.daily_calorie_goal) : 0;
  const maxY = Math.max(total, goal, 100);
  const width = 760;
  const height = 260;
  const left = 54;
  const right = 24;
  const top = 24;
  const bottom = 44;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const { start, end } = getDayRange(selectedDateString);

  const getX = dateValue => left + Math.min(Math.max((new Date(dateValue) - start) / (end - start), 0), 1) * chartW;
  const getY = kcal => top + chartH - (kcal / maxY) * chartH;

  let running = 0;
  const points = [{ x: left, y: getY(0) }];

  const dots = sorted.map(meal => {
    running += toNumber(meal.calories);

    const x = getX(meal.eaten_at);
    const y = getY(running);

    points.push({ x, y });

    return `<circle class="chart-dot" cx="${x}" cy="${y}" r="6"><title>${escapeHtml(meal.food_name)} · ${running} kcal</title></circle>`;
  }).join("");

  const selectedDate = parseDateInput(selectedDateString);
  const lineEnd = isSameLocalDay(selectedDate, new Date()) ? new Date() : end;

  points.push({ x: getX(lineEnd), y: getY(running) });

  dailyCalorieChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}">
      ${buildGrid(width, left, right, maxY, getY)}
      ${buildTimeLabels(width, height, left, right, start, getX)}
      ${buildGoal(goal, getY, width, left, right)}
      <path class="chart-calorie-line" d="${pointsToPath(points)}"></path>
      ${dots}
    </svg>
  `;
}

function renderWeeklyChart(meals, weekStart) {
  const days = createDailyTotals(meals, weekStart, 7);
  const total = days.reduce((s, d) => s + d.calories, 0);

  weeklyChartTotal.textContent = `${round(total, 0)} kcal`;
  weeklyChartInfo.textContent = `${formatShortDate(days[0].date)} bis ${formatShortDate(days[6].date)}`;

  renderLineChart(weeklyCalorieChart, days.map(day => ({
    label: day.date.toLocaleDateString("de-DE", { weekday: "short" }),
    value: day.calories,
    title: `${day.date.toLocaleDateString("de-DE")} · ${round(day.calories, 0)} kcal`
  })), true);
}

function renderTrendChart(meals, startDate, count) {
  const days = createDailyTotals(meals, startDate, count);
  const total = days.reduce((s, d) => s + d.calories, 0);
  const average = total / count;

  trendChartAverage.textContent = `${round(average, 0)} kcal Ø`;
  trendChartInfo.textContent = `${formatShortDate(days[0].date)} bis ${formatShortDate(days[count - 1].date)}`;

  renderLineChart(trendCalorieChart, days.map((day, i) => ({
    label: i % 7 === 0 || i === count - 1 ? formatShortDate(day.date) : "",
    value: day.calories,
    title: `${day.date.toLocaleDateString("de-DE")} · ${round(day.calories, 0)} kcal`
  })), false);
}

function renderLineChart(container, points, showAllLabels) {
  const hasData = points.some(p => p.value > 0);

  if (!hasData) {
    container.innerHTML = `<div class="chart-empty">Noch keine Daten vorhanden.</div>`;
    return;
  }

  const width = 760;
  const height = 260;
  const left = 54;
  const right = 24;
  const top = 24;
  const bottom = 44;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const maxY = Math.max(...points.map(p => p.value), profile?.daily_calorie_goal || 0, 100);

  const getX = i => left + (i / (points.length - 1)) * chartW;
  const getY = value => top + chartH - (value / maxY) * chartH;

  const linePoints = points.map((p, i) => ({
    x: getX(i),
    y: getY(p.value)
  }));

  const labels = points.map((p, i) => {
    if (!showAllLabels && !p.label) return "";
    return `<text class="chart-x-label" x="${getX(i)}" y="${height - 16}" text-anchor="middle">${p.label}</text>`;
  }).join("");

  const dots = points.map((p, i) => `
    <circle class="chart-dot" cx="${getX(i)}" cy="${getY(p.value)}" r="5">
      <title>${escapeHtml(p.title)}</title>
    </circle>
  `).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}">
      ${buildGrid(width, left, right, maxY, getY)}
      ${labels}
      ${buildGoal(profile?.daily_calorie_goal || 0, getY, width, left, right)}
      <path class="chart-calorie-line" d="${pointsToPath(linePoints)}"></path>
      ${dots}
    </svg>
  `;
}

function buildGrid(width, left, right, maxY, getY) {
  return [0, 0.25, 0.5, 0.75, 1].map(f => {
    const value = round(maxY * f, 0);
    const y = getY(value);

    return `
      <line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
      <text class="chart-y-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${value}</text>
    `;
  }).join("");
}

function buildTimeLabels(width, height, left, right, start, getX) {
  return [0, 6, 12, 18, 24].map(hour => {
    const date = new Date(start);
    date.setHours(hour, 0, 0, 0);

    const x = hour === 24 ? width - right : getX(date);

    return `<text class="chart-x-label" x="${x}" y="${height - 16}" text-anchor="middle">${String(hour).padStart(2, "0")}:00</text>`;
  }).join("");
}

function buildGoal(goal, getY, width, left, right) {
  if (!goal || goal <= 0) return "";

  const y = getY(goal);

  return `
    <line class="chart-goal-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
    <text class="chart-goal-label" x="${width - right}" y="${y - 8}" text-anchor="end">Ziel ${goal}</text>
  `;
}

function pointsToPath(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

async function loadWeights() {
  const { data, error } = await supabaseClient
    .from("weight_logs")
    .select("*")
    .eq("user_id", currentUserId)
    .order("logged_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  latestWeights = data || [];

  renderWeightWidget();
  renderWeights(latestWeights);
  renderWeightSummary(latestWeights);
}

function renderWeightWidget() {
  if (latestWeights.length === 0) {
    currentWeightText.textContent = "Noch kein Eintrag";
    weightGoalText.textContent = "Ziel nicht gesetzt";
    weightDiffText.textContent = "–";
    weightTrendText.textContent = "Kein Trend";
    return;
  }

  const latest = latestWeights[0];
  const previous = latestWeights[1];
  const target = profile?.target_weight_kg ? toNumber(profile.target_weight_kg) : 0;

  currentWeightText.textContent = `${latest.weight_kg} kg`;
  weightGoalText.textContent = target > 0 ? `Ziel: ${target} kg` : "Ziel nicht gesetzt";

  if (target > 0) {
    const diff = round(toNumber(latest.weight_kg) - target, 1);
    weightDiffText.textContent = `${diff > 0 ? "+" : ""}${diff} kg`;
  } else {
    weightDiffText.textContent = "–";
  }

  if (previous) {
    const trend = round(toNumber(latest.weight_kg) - toNumber(previous.weight_kg), 1);
    weightTrendText.textContent = `${trend > 0 ? "↗ +" : trend < 0 ? "↘ " : "→ "}${trend} kg`;
  } else {
    weightTrendText.textContent = "Kein Trend";
  }
}

function renderWeights(weights) {
  weightList.innerHTML = "";

  if (weights.length === 0) {
    weightList.innerHTML = "<p>Noch keine Gewichtseinträge.</p>";
    return;
  }

  weights.forEach(entry => {
    const div = document.createElement("div");
    div.className = "weight-item";

    div.innerHTML = `
      <div>
        <strong>${entry.weight_kg} kg</strong>
        <div class="weight-meta">${formatDate(entry.logged_at)}</div>
      </div>
      <button class="delete-btn">×</button>
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => deleteWeight(entry.id));
    weightList.appendChild(div);
  });
}

function renderWeightSummary(weights) {
  if (weights.length === 0) {
    weightSummary.innerHTML = "Noch kein Gewicht eingetragen.";
    return;
  }

  weightSummary.innerHTML = `<strong>Aktuelles Gewicht:</strong> ${weights[0].weight_kg} kg`;
}

async function saveWeight() {
  const weightKg = toNumber(weightInput.value);
  const loggedAt = weightDateInput.value;

  if (!weightKg || !loggedAt) return alert("Bitte Gewicht und Datum eingeben.");

  const { error } = await supabaseClient.from("weight_logs").insert({
    user_id: currentUserId,
    weight_kg: weightKg,
    logged_at: loggedAt
  });

  if (error) return alert("Gewicht konnte nicht gespeichert werden.");

  weightInput.value = "";
  weightDateInput.value = toDateInput(new Date());

  await loadWeights();
}

async function deleteWeight(id) {
  if (!confirm("Gewichtseintrag löschen?")) return;

  const { error } = await supabaseClient
    .from("weight_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUserId);

  if (error) return alert("Gewicht konnte nicht gelöscht werden.");

  await loadWeights();
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("user_profile")
    .select("*")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  profile = data;

  if (!profile) return;

  profileNameInput.value = profile.name || "";
  profileAgeInput.value = profile.age || "";
  profileGenderInput.value = profile.gender || "";
  profileHeightInput.value = profile.height_cm || "";
  profileActivityInput.value = profile.activity_level || "";
  targetWeightInput.value = profile.target_weight_kg || "";
  dailyCalorieGoalInput.value = profile.daily_calorie_goal || "";
}

async function saveProfile() {
  const profileData = {
    user_id: currentUserId,
    name: profileNameInput.value.trim(),
    age: profileAgeInput.value ? Number(profileAgeInput.value) : null,
    gender: profileGenderInput.value || null,
    height_cm: profileHeightInput.value ? Number(profileHeightInput.value) : null,
    activity_level: profileActivityInput.value || null,
    target_weight_kg: targetWeightInput.value ? Number(targetWeightInput.value) : null,
    daily_calorie_goal: dailyCalorieGoalInput.value ? Number(dailyCalorieGoalInput.value) : null
  };

  const { data, error } = await supabaseClient
    .from("user_profile")
    .upsert(profileData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error(error);
    return alert("Profil konnte nicht gespeichert werden.");
  }

  profile = data;

  alert("Profil gespeichert.");

  await loadDashboard();
  await loadWeights();
}

function openAddSheet() {
  addSheet.classList.remove("hidden");
  sheetOverlay.classList.remove("hidden");
}

function closeAddSheet() {
  addSheet.classList.add("hidden");
  sheetOverlay.classList.add("hidden");
}

function openProfileDrawer() {
  profileDrawer.classList.remove("hidden");
  sheetOverlay.classList.remove("hidden");
  updateUserIdDisplay();
}

function closeProfileDrawer() {
  profileDrawer.classList.add("hidden");
  sheetOverlay.classList.add("hidden");
}

function changeDashboardDate(days) {
  const date = parseDateInput(getSelectedDateString());
  dashboardDateInput.value = toDateInput(addDays(date, days));
  loadDashboard();
}

function formatDate(dateString) {
  return dateString ? new Date(dateString).toLocaleDateString("de-DE") : "";
}

function formatTime(dateString) {
  return dateString ? new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }) : "";
}

function formatShortDate(date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchFoodBtn.addEventListener("click", () => searchFoodsFromInput(foodSearchInput.value));

foodSearchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") searchFoodsFromInput(foodSearchInput.value);
});

inlineFoodSearchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") searchFoodsFromInput(inlineFoodSearchInput.value);
});

amountInput.addEventListener("input", updateNutritionPreview);
saveMealBtn.addEventListener("click", saveMeal);
saveFavoriteBtn.addEventListener("click", saveSelectedFoodAsFavorite);

saveWeightBtn.addEventListener("click", saveWeight);
saveProfileBtn.addEventListener("click", saveProfile);

dashboardDateInput.addEventListener("change", loadDashboard);

prevDayBtn.addEventListener("click", () => changeDashboardDate(-1));
nextDayBtn.addEventListener("click", () => changeDashboardDate(1));

todayBtn.addEventListener("click", () => {
  dashboardDateInput.value = toDateInput(new Date());
  loadDashboard();
});

openAddSheetBtn.addEventListener("click", openAddSheet);
navAddBtn.addEventListener("click", openAddSheet);
closeAddSheetBtn.addEventListener("click", closeAddSheet);

openProfileBtn.addEventListener("click", openProfileDrawer);
closeProfileBtn.addEventListener("click", closeProfileDrawer);
weightWidget.addEventListener("click", openProfileDrawer);

sheetOverlay.addEventListener("click", () => {
  closeAddSheet();
  closeProfileDrawer();
});

scanBarcodeBtn.addEventListener("click", openScanner);
closeScannerBtn.addEventListener("click", closeScanner);

scannerOverlay.addEventListener("click", event => {
  if (event.target === scannerOverlay) {
    closeScanner();
  }
});

$('torchBtn')?.addEventListener('click', toggleTorch);
$('switchCameraBtn')?.addEventListener('click', switchCamera);
$('focusCamBtn')?.addEventListener('click', triggerFocus);
document.querySelectorAll('.zoom-btn').forEach(btn => {
  btn.addEventListener('click', () => setZoom(Number(btn.dataset.zoom)));
});

scanPhotoBtn.addEventListener("click", async () => {
  scannerStatus.textContent = "Foto auswählen...";
  await stopBarcodeScanner();
  barcodeImageInput.click();
});

barcodeImageInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  await scanBarcodeFromImage(file);
});

async function initApp() {
  initDefaults();
  await initScanner();
  await resolveCurrentUserId();
  await loadProfile();
  await loadFavorites();
  await loadDashboard();
  await loadWeights();
}

initApp();
