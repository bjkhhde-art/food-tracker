const SUPABASE_URL = "https://lrzgcqoqcwicpuuuhaoj.supabase.co";
const SUPABASE_KEY = "sb_publishable_uunR3UQ9rttiK8dG85IedQ__Tn1duVK";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FOOD_TABLE = "usda_foods";

const foodSearchInput = document.getElementById("foodSearchInput");
const searchFoodBtn = document.getElementById("searchFoodBtn");
const foodResults = document.getElementById("foodResults");

const favoriteSelect = document.getElementById("favoriteSelect");
const loadFavoriteBtn = document.getElementById("loadFavoriteBtn");
const deleteFavoriteBtn = document.getElementById("deleteFavoriteBtn");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");

const selectedFoodBox = document.getElementById("selectedFoodBox");
const selectedFoodName = document.getElementById("selectedFoodName");
const amountInput = document.getElementById("amountInput");
const mealCategoryInput = document.getElementById("mealCategoryInput");
const eatenAtInput = document.getElementById("eatenAtInput");
const saveMealBtn = document.getElementById("saveMealBtn");

const previewCalories = document.getElementById("previewCalories");
const previewProtein = document.getElementById("previewProtein");
const previewCarbs = document.getElementById("previewCarbs");
const previewFat = document.getElementById("previewFat");

const todayCalories = document.getElementById("todayCalories");
const todayProtein = document.getElementById("todayProtein");
const todayCarbs = document.getElementById("todayCarbs");
const todayFat = document.getElementById("todayFat");
const calorieProgress = document.getElementById("calorieProgress");
const calorieGoalText = document.getElementById("calorieGoalText");
const todayMeals = document.getElementById("todayMeals");

const weightInput = document.getElementById("weightInput");
const weightDateInput = document.getElementById("weightDateInput");
const saveWeightBtn = document.getElementById("saveWeightBtn");
const weightSummary = document.getElementById("weightSummary");
const weightList = document.getElementById("weightList");

const profileNameInput = document.getElementById("profileNameInput");
const profileAgeInput = document.getElementById("profileAgeInput");
const profileGenderInput = document.getElementById("profileGenderInput");
const profileHeightInput = document.getElementById("profileHeightInput");
const profileActivityInput = document.getElementById("profileActivityInput");
const targetWeightInput = document.getElementById("targetWeightInput");
const dailyCalorieGoalInput = document.getElementById("dailyCalorieGoalInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

let selectedFood = null;
let profile = null;
let favorites = [];

function initDefaults() {
  eatenAtInput.value = toLocalDateTimeInput(new Date());
  weightDateInput.value = toDateInput(new Date());
}

function toLocalDateTimeInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Number(String(value).replace(",", ".")) || 0;
}

function round(value, decimals = 1) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getValue(food, possibleNames) {
  for (const name of possibleNames) {
    if (food[name] !== undefined && food[name] !== null && food[name] !== "") {
      return food[name];
    }
  }
  return 0;
}

function getFoodNutritionPer100g(food) {
  return {
    calories: toNumber(getValue(food, ["Energ_Kcal", "Energy_Kcal", "Calories", "calories"])),
    protein: toNumber(getValue(food, ["Protein_(g)", "Protein_g", "Protein", "protein_g"])),
    carbs: toNumber(getValue(food, ["Carbohydrt_(g)", "Carbohydrate_(g)", "Carbs_(g)", "Carbs", "carbs_g"])),
    fat: toNumber(getValue(food, ["Lipid_Tot_(g)", "Fat_(g)", "Fat_g", "Fat", "fat_g"]))
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

async function loadFavorites() {
  const { data, error } = await supabaseClient
    .from("food_favorites")
    .select("*")
    .order("food_name", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Favoriten:", error);
    return;
  }

  favorites = data || [];
  renderFavoritesDropdown();
}

function renderFavoritesDropdown() {
  favoriteSelect.innerHTML = `<option value="">Favorit auswählen</option>`;

  favorites.forEach(favorite => {
    const option = document.createElement("option");
    option.value = favorite.food_id;
    option.textContent = favorite.food_name;
    favoriteSelect.appendChild(option);
  });
}

function favoriteToFoodObject(favorite) {
  return {
    NDB_No: favorite.food_id,
    Shrt_Desc: favorite.food_name,
    Energ_Kcal: favorite.calories,
    "Protein_(g)": favorite.protein_g,
    "Carbohydrt_(g)": favorite.carbs_g,
    "Lipid_Tot_(g)": favorite.fat_g
  };
}

function loadSelectedFavorite() {
  const foodId = Number(favoriteSelect.value);

  if (!foodId) {
    alert("Bitte Favorit auswählen.");
    return;
  }

  const favorite = favorites.find(item => Number(item.food_id) === foodId);

  if (!favorite) {
    alert("Favorit wurde nicht gefunden.");
    return;
  }

  const food = favoriteToFoodObject(favorite);
  selectFood(food);
}

async function saveSelectedFoodAsFavorite() {
  if (!selectedFood) {
    alert("Bitte erst ein Lebensmittel auswählen.");
    return;
  }

  const nutrition = getFoodNutritionPer100g(selectedFood);
  const foodId = toNumber(selectedFood.NDB_No);

  if (!foodId) {
    alert("Dieses Lebensmittel hat keine gültige ID.");
    return;
  }

  const { error } = await supabaseClient
    .from("food_favorites")
    .upsert(
      {
        food_id: foodId,
        food_name: selectedFood.Shrt_Desc || "Unbekanntes Lebensmittel",
        calories: nutrition.calories,
        protein_g: nutrition.protein,
        carbs_g: nutrition.carbs,
        fat_g: nutrition.fat
      },
      { onConflict: "food_id" }
    );

  if (error) {
    console.error("Fehler beim Speichern des Favoriten:", error);
    alert("Favorit konnte nicht gespeichert werden.");
    return;
  }

  await loadFavorites();
  favoriteSelect.value = String(foodId);
  alert("Favorit gespeichert.");
}

async function deleteSelectedFavorite() {
  const foodId = Number(favoriteSelect.value);

  if (!foodId) {
    alert("Bitte Favorit auswählen.");
    return;
  }

  if (!confirm("Favorit wirklich löschen?")) return;

  const { error } = await supabaseClient
    .from("food_favorites")
    .delete()
    .eq("food_id", foodId);

  if (error) {
    console.error("Fehler beim Löschen des Favoriten:", error);
    alert("Favorit konnte nicht gelöscht werden.");
    return;
  }

  favoriteSelect.value = "";
  await loadFavorites();
}
function normalizeSearchQuery(query) {
  const replacements = {
    joghurt: "yogurt",
    yoghurt: "yogurt",
    banane: "banana",
    apfel: "apple",
    milch: "milk",
    käse: "cheese",
    kaese: "cheese",
    huhn: "chicken",
    hähnchen: "chicken",
    haehnchen: "chicken",
    reis: "rice",
    nudeln: "pasta",
    kartoffel: "potato",
    ei: "egg",
    eier: "egg",
    brot: "bread",
    haferflocken: "oat"
  };

  return query
    .toLowerCase()
    .trim()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
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
async function searchFoods() {
  const query = foodSearchInput.value.trim();

  if (!query) {
    alert("Bitte Lebensmittel eingeben.");
    return;
  }

  foodResults.innerHTML = "<p>Suche läuft...</p>";

  const { data, error } = await supabaseClient
    .from(FOOD_TABLE)
    .select("*")
    .ilike("Shrt_Desc", `%${query}%`)
    .limit(20);

  if (error) {
    console.error("Fehler bei der Suche:", error);
    foodResults.innerHTML = "<p>Suche hat nicht geklappt. Prüfe Tabellenname und Spaltennamen.</p>";
    return;
  }

  renderFoodResults(data);
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
      <strong>${food.Shrt_Desc || "Unbekanntes Lebensmittel"}</strong>
      <small>
        ${nutrition.calories} kcal · 
        Protein ${nutrition.protein} g · 
        KH ${nutrition.carbs} g · 
        Fett ${nutrition.fat} g pro 100 g
      </small>
    `;

    div.addEventListener("click", () => selectFood(food));

    foodResults.appendChild(div);
  });
}

function selectFood(food) {
  selectedFood = food;

  selectedFoodName.textContent = food.Shrt_Desc || "Unbekanntes Lebensmittel";
  selectedFoodBox.classList.remove("hidden");

  updateNutritionPreview();
}

function updateNutritionPreview() {
  if (!selectedFood) return;

  const amountG = toNumber(amountInput.value) || 100;
  const nutrition = calculateNutritionForAmount(selectedFood, amountG);

  previewCalories.textContent = `${nutrition.calories} kcal`;
  previewProtein.textContent = `${nutrition.protein} g`;
  previewCarbs.textContent = `${nutrition.carbs} g`;
  previewFat.textContent = `${nutrition.fat} g`;
}

async function saveMeal() {
  if (!selectedFood) {
    alert("Bitte erst ein Lebensmittel auswählen.");
    return;
  }

  const amountG = toNumber(amountInput.value);

  if (!amountG || amountG <= 0) {
    alert("Bitte eine gültige Menge eingeben.");
    return;
  }

  const nutrition = calculateNutritionForAmount(selectedFood, amountG);
  const eatenAt = eatenAtInput.value
    ? new Date(eatenAtInput.value).toISOString()
    : new Date().toISOString();

  const { error } = await supabaseClient
    .from("meal_logs")
    .insert({
      food_id: toNumber(selectedFood.NDB_No),
      food_name: selectedFood.Shrt_Desc || "Unbekanntes Lebensmittel",
      meal_category: mealCategoryInput.value,
      amount_g: amountG,
      calories: nutrition.calories,
      protein_g: nutrition.protein,
      carbs_g: nutrition.carbs,
      fat_g: nutrition.fat,
      eaten_at: eatenAt
    });

  if (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Mahlzeit konnte nicht gespeichert werden.");
    return;
  }

  selectedFood = null;
  selectedFoodBox.classList.add("hidden");
  foodSearchInput.value = "";
  foodResults.innerHTML = "";
  amountInput.value = 100;
  eatenAtInput.value = toLocalDateTimeInput(new Date());

  await loadTodayMeals();
}

async function loadTodayMeals() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabaseClient
    .from("meal_logs")
    .select("*")
    .gte("eaten_at", start.toISOString())
    .lt("eaten_at", end.toISOString())
    .order("eaten_at", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Mahlzeiten:", error);
    todayMeals.innerHTML = "<p>Mahlzeiten konnten nicht geladen werden.</p>";
    return;
  }

  renderTodayMeals(data);
  updateTodaySummary(data);
}

function renderTodayMeals(meals) {
  todayMeals.innerHTML = "";

  if (!meals || meals.length === 0) {
    todayMeals.innerHTML = "<p>Noch keine Mahlzeiten heute.</p>";
    return;
  }

  meals.forEach(meal => {
    const div = document.createElement("div");
    div.className = "meal-item";

    div.innerHTML = `
      <div>
        <strong>${meal.food_name}</strong>
        <div class="meal-meta">
          ${meal.meal_category || "Mahlzeit"} · 
          ${meal.amount_g} g · 
          ${meal.calories} kcal · 
          ${formatTime(meal.eaten_at)}
        </div>
      </div>
      <button class="delete-btn">×</button>
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => {
      deleteMeal(meal.id);
    });

    todayMeals.appendChild(div);
  });
}

function updateTodaySummary(meals) {
  const totals = meals.reduce(
    (sum, meal) => {
      sum.calories += toNumber(meal.calories);
      sum.protein += toNumber(meal.protein_g);
      sum.carbs += toNumber(meal.carbs_g);
      sum.fat += toNumber(meal.fat_g);
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  todayCalories.textContent = `${round(totals.calories, 0)} kcal`;
  todayProtein.textContent = `${round(totals.protein, 1)} g`;
  todayCarbs.textContent = `${round(totals.carbs, 1)} g`;
  todayFat.textContent = `${round(totals.fat, 1)} g`;

  const goal = profile?.daily_calorie_goal ? toNumber(profile.daily_calorie_goal) : 0;

  if (goal > 0) {
    const percent = Math.min((totals.calories / goal) * 100, 100);
    calorieProgress.style.width = `${percent}%`;
    calorieGoalText.textContent = `Ziel: ${goal} kcal`;
  } else {
    calorieProgress.style.width = "0%";
    calorieGoalText.textContent = "Ziel: nicht gesetzt";
  }
}

async function deleteMeal(id) {
  if (!confirm("Mahlzeit löschen?")) return;

  const { error } = await supabaseClient
    .from("meal_logs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Fehler beim Löschen:", error);
    alert("Mahlzeit konnte nicht gelöscht werden.");
    return;
  }

  await loadTodayMeals();
}

async function saveWeight() {
  const weightKg = toNumber(weightInput.value);
  const loggedAt = weightDateInput.value;

  if (!weightKg || !loggedAt) {
    alert("Bitte Gewicht und Datum eingeben.");
    return;
  }

  const { error } = await supabaseClient
    .from("weight_logs")
    .insert({
      weight_kg: weightKg,
      logged_at: loggedAt
    });

  if (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Gewicht konnte nicht gespeichert werden.");
    return;
  }

  weightInput.value = "";
  weightDateInput.value = toDateInput(new Date());

  await loadWeights();
}

async function loadWeights() {
  const { data, error } = await supabaseClient
    .from("weight_logs")
    .select("*")
    .order("logged_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Fehler beim Laden der Gewichte:", error);
    weightList.innerHTML = "<p>Gewichte konnten nicht geladen werden.</p>";
    return;
  }

  renderWeights(data);
  renderWeightSummary(data);
}

function renderWeights(weights) {
  weightList.innerHTML = "";

  if (!weights || weights.length === 0) {
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

    div.querySelector(".delete-btn").addEventListener("click", () => {
      deleteWeight(entry.id);
    });

    weightList.appendChild(div);
  });
}

function renderWeightSummary(weights) {
  if (!weights || weights.length === 0) {
    weightSummary.innerHTML = "Noch kein Gewicht eingetragen.";
    return;
  }

  const latest = weights[0];
  const target = profile?.target_weight_kg ? toNumber(profile.target_weight_kg) : 0;

  if (target > 0) {
    const diff = round(toNumber(latest.weight_kg) - target, 1);
    weightSummary.innerHTML = `
      <strong>Aktuelles Gewicht:</strong> ${latest.weight_kg} kg<br>
      <strong>Zielgewicht:</strong> ${target} kg<br>
      <strong>Differenz:</strong> ${diff > 0 ? "+" : ""}${diff} kg
    `;
  } else {
    weightSummary.innerHTML = `
      <strong>Aktuelles Gewicht:</strong> ${latest.weight_kg} kg<br>
      <span>Zielgewicht noch nicht gesetzt.</span>
    `;
  }
}

async function deleteWeight(id) {
  if (!confirm("Gewichtseintrag löschen?")) return;

  const { error } = await supabaseClient
    .from("weight_logs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Fehler beim Löschen:", error);
    alert("Gewicht konnte nicht gelöscht werden.");
    return;
  }

  await loadWeights();
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("user_profile")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden des Profils:", error);
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
    id: 1,
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
    .upsert(profileData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Profil konnte nicht gespeichert werden.");
    return;
  }

  profile = data;
  alert("Profil gespeichert.");

  await loadTodayMeals();
  await loadWeights();
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("de-DE");
}

function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

searchFoodBtn.addEventListener("click", searchFoods);

foodSearchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchFoods();
  }
});

favoriteSelect.addEventListener("change", () => {
  if (favoriteSelect.value) {
    loadSelectedFavorite();
  }
});

loadFavoriteBtn.addEventListener("click", loadSelectedFavorite);
deleteFavoriteBtn.addEventListener("click", deleteSelectedFavorite);
saveFavoriteBtn.addEventListener("click", saveSelectedFoodAsFavorite);

amountInput.addEventListener("input", updateNutritionPreview);
saveMealBtn.addEventListener("click", saveMeal);
saveWeightBtn.addEventListener("click", saveWeight);
saveProfileBtn.addEventListener("click", saveProfile);

async function initApp() {
  initDefaults();
  await loadProfile();
  await loadFavorites();
  await loadTodayMeals();
  await loadWeights();
}

initApp();
