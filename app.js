const SUPABASE_URL = "https://lrzgcqoqcwicpuuuhaoj.supabase.co";
const SUPABASE_KEY = "sb_publishable_uunR3UQ9rttiK8dG85IedQ__Tn1duVK";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FOOD_TABLE = "bls_foods";

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

const currentUserId = getOrCreateUserId();

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

const fabBtn = $("fabBtn");
const openAddSheetBtn = $("openAddSheetBtn");
const closeAddSheetBtn = $("closeAddSheetBtn");
const addSheet = $("addSheet");
const sheetOverlay = $("sheetOverlay");
const navAddBtn = $("navAddBtn");

let selectedFood = null;
let profile = null;
let favorites = [];
let latestWeights = [];

function initDefaults() {
  const today = new Date();
  eatenAtInput.value = toLocalDateTimeInput(today);
  weightDateInput.value = toDateInput(today);
  dashboardDateInput.value = toDateInput(today);
  updateHeaderDate();
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
  if (text === "-" || text.toUpperCase() === "TR" || text.toUpperCase() === "NA" || text.startsWith("<")) return 0;
  return Number(text.replace(",", ".")) || 0;
}

function round(value, decimals = 1) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getValue(food, names) {
  for (const name of names) {
    if (food[name] !== undefined && food[name] !== null && food[name] !== "") return food[name];
  }
  return 0;
}

function getFoodId(food) {
  return String(getValue(food, [BLS_COLUMNS.id, "bls_code", "BLS_Code", "id"])).trim();
}

function getFoodName(food) {
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
    yoghurt: "joghurt", yogurt: "joghurt",
    bananen: "banane", banana: "banane",
    aepfel: "apfel", äpfel: "apfel", apple: "apfel",
    haehnchen: "hähnchen", huhn: "hähnchen", chicken: "hähnchen",
    kaese: "käse", cheese: "käse",
    beef: "rind", rindfleisch: "rind",
    pork: "schwein", schweinefleisch: "schwein",
    rice: "reis", pasta: "nudeln", noodles: "nudeln",
    kartoffeln: "kartoffel", potato: "kartoffel",
    eier: "ei", egg: "ei",
    bread: "brot",
    oats: "hafer", oat: "hafer", haferflocken: "hafer",
    curd: "quark",
    salmon: "lachs",
    tuna: "thunfisch",
    tomatoes: "tomate", tomaten: "tomate", tomato: "tomate",
    cucumber: "gurke", gurken: "gurke",
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

async function searchFoodsFromInput(value) {
  const query = value.trim();
  if (!query) {
    alert("Bitte Lebensmittel eingeben.");
    return;
  }

  openAddSheet();
  foodSearchInput.value = query;
  foodResults.innerHTML = "<p>Suche läuft...</p>";

  const searchTerms = getSearchTerms(query);
  if (searchTerms.length === 0) {
    foodResults.innerHTML = "<p>Bitte mindestens 2 Zeichen eingeben.</p>";
    return;
  }

  let request = supabaseClient.from(FOOD_TABLE).select("*").limit(40);

  searchTerms.forEach(term => {
    request = request.ilike(BLS_COLUMNS.nameDe, `%${term}%`);
  });

  const { data, error } = await request;

  if (error) {
    console.error(error);
    foodResults.innerHTML = "<p>Suche hat nicht geklappt.</p>";
    return;
  }

  renderFoodResults(sortFoodResults(data, searchTerms));
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
    div.innerHTML = `
      <strong>${getFoodName(food)}</strong>
      <small>${nutrition.calories} kcal · Protein ${nutrition.protein} g · KH ${nutrition.carbs} g · Fett ${nutrition.fat} g pro 100 g</small>
    `;
    div.addEventListener("click", () => selectFood(food));
    foodResults.appendChild(div);
  });
}

function selectFood(food) {
  selectedFood = food;
  selectedFoodName.textContent = getFoodName(food);
  selectedFoodBox.classList.remove("hidden");
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
  const top = favorites.slice(0, 5);
  favoriteChips.innerHTML = "";
  sheetFavoriteChips.innerHTML = "";

  if (top.length === 0) {
    favoriteChips.innerHTML = `<span class="empty-chip">Noch keine Favoriten</span>`;
    sheetFavoriteChips.innerHTML = `<span class="empty-chip">Noch keine Favoriten</span>`;
    return;
  }

  top.forEach(fav => {
    favoriteChips.appendChild(createFavoriteChip(fav));
    sheetFavoriteChips.appendChild(createFavoriteChip(fav));
  });
}

function createFavoriteChip(fav) {
  const btn = document.createElement("button");
  btn.className = "food-chip";
  btn.textContent = fav.food_name;
  btn.addEventListener("click", () => {
    openAddSheet();
    selectFood({
      [BLS_COLUMNS.id]: fav.food_id,
      [BLS_COLUMNS.nameDe]: fav.food_name,
      [BLS_COLUMNS.calories]: fav.calories,
      [BLS_COLUMNS.protein]: fav.protein_g,
      [BLS_COLUMNS.carbs]: fav.carbs_g,
      [BLS_COLUMNS.fat]: fav.fat_g
    });
  });
  return btn;
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

  await loadFavorites();
  alert("Favorit gespeichert.");
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
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
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
  calorieLeftText.textContent = goal > 0 ? `${Math.abs(round(left, 0))} kcal ${left >= 0 ? "frei" : "drüber"}` : `${round(totals.calories, 0)} kcal`;
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
          <strong>${meal.food_name}</strong>
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

  if (error) return alert("Mahlzeit konnte nicht gelöscht werden.");
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
  const width = 760, height = 260, left = 54, right = 24, top = 24, bottom = 44;
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

  const width = 760, height = 260, left = 54, right = 24, top = 24, bottom = 44;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const maxY = Math.max(...points.map(p => p.value), profile?.daily_calorie_goal || 0, 100);

  const getX = i => left + (i / (points.length - 1)) * chartW;
  const getY = value => top + chartH - (value / maxY) * chartH;

  const linePoints = points.map((p, i) => ({ x: getX(i), y: getY(p.value) }));

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
  return [0, .25, .5, .75, 1].map(f => {
    const value = round(maxY * f, 0);
    const y = getY(value);
    return `<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
            <text class="chart-y-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${value}</text>`;
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
  return `<line class="chart-goal-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
          <text class="chart-goal-label" x="${width - right}" y="${y - 8}" text-anchor="end">Ziel ${goal}</text>`;
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
  return dateString ? new Date(dateString).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
}

function formatShortDate(date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
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
foodSearchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchFoodsFromInput(foodSearchInput.value);
});
inlineFoodSearchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchFoodsFromInput(inlineFoodSearchInput.value);
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

fabBtn.addEventListener("click", openAddSheet);
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

async function initApp() {
  initDefaults();
  await loadProfile();
  await loadFavorites();
  await loadDashboard();
  await loadWeights();
}

initApp();
