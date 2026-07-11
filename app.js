/* ==========================================================================
   CodeMate Weather
   Fuente de datos: Open-Meteo (pronóstico) + Open-Meteo Geocoding (buscador)
   ========================================================================== */

const DEFAULT_LOCATION = {
  name: "La Plata",
  place: "Buenos Aires, Argentina",
  latitude: -34.9214,
  longitude: -57.9544,
  timezone: "America/Argentina/Buenos_Aires",
};

const STORAGE_KEY = "codemate-weather-last-location";

// Estado en memoria
let state = {
  unit: "C", // "C" | "F"
  data: null,
  location: loadSavedLocation(),
};

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

function saveLocation(location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Si localStorage no está disponible (modo privado, etc.), seguimos sin guardar
  }
}

function buildForecastUrl(location) {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=${encodeURIComponent(location.timezone)}&forecast_days=7`
  );
}

// ---------- Referencias al DOM ----------

const el = {
  status: document.getElementById("status"),
  statusText: document.getElementById("statusText"),
  retryBtn: document.getElementById("retryBtn"),
  hero: document.getElementById("hero"),
  hourlySection: document.getElementById("hourlySection"),
  dailySection: document.getElementById("dailySection"),

  sky: document.getElementById("sky"),
  skyBody: document.getElementById("skyBody"),

  cityName: document.getElementById("cityName"),
  dateNow: document.getElementById("dateNow"),
  currentIcon: document.getElementById("currentIcon"),
  currentTemp: document.getElementById("currentTemp"),
  currentDesc: document.getElementById("currentDesc"),
  feelsLike: document.getElementById("feelsLike"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  rainChance: document.getElementById("rainChance"),

  hourlyScroll: document.getElementById("hourlyScroll"),
  dailyList: document.getElementById("dailyList"),

  unitToggle: document.getElementById("unitToggle"),

  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
};

// ---------- Mapa de códigos WMO -> descripción e ícono ----------

const WEATHER_MAP = {
  0: { desc: "Cielo despejado", icon: "sun" },
  1: { desc: "Mayormente despejado", icon: "sun-cloud" },
  2: { desc: "Parcialmente nublado", icon: "sun-cloud" },
  3: { desc: "Nublado", icon: "cloud" },
  45: { desc: "Niebla", icon: "fog" },
  48: { desc: "Niebla con escarcha", icon: "fog" },
  51: { desc: "Llovizna débil", icon: "rain" },
  53: { desc: "Llovizna", icon: "rain" },
  55: { desc: "Llovizna intensa", icon: "rain" },
  56: { desc: "Llovizna helada", icon: "rain" },
  57: { desc: "Llovizna helada intensa", icon: "rain" },
  61: { desc: "Lluvia débil", icon: "rain" },
  63: { desc: "Lluvia", icon: "rain" },
  65: { desc: "Lluvia intensa", icon: "rain" },
  66: { desc: "Lluvia helada", icon: "rain" },
  67: { desc: "Lluvia helada intensa", icon: "rain" },
  71: { desc: "Nevada débil", icon: "snow" },
  73: { desc: "Nevada", icon: "snow" },
  75: { desc: "Nevada intensa", icon: "snow" },
  77: { desc: "Granos de nieve", icon: "snow" },
  80: { desc: "Chubascos débiles", icon: "rain" },
  81: { desc: "Chubascos", icon: "rain" },
  82: { desc: "Chubascos violentos", icon: "rain" },
  85: { desc: "Chubascos de nieve", icon: "snow" },
  86: { desc: "Chubascos de nieve intensos", icon: "snow" },
  95: { desc: "Tormenta eléctrica", icon: "storm" },
  96: { desc: "Tormenta con granizo", icon: "storm" },
  99: { desc: "Tormenta severa con granizo", icon: "storm" },
};

function getWeatherInfo(code) {
  return WEATHER_MAP[code] || { desc: "Condición desconocida", icon: "cloud" };
}

// ---------- Íconos SVG (paleta CodeMate) ----------

function iconSvg(type) {
  const icons = {
    sun: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="14" fill="#FFD166"/>
      <g stroke="#FFD166" stroke-width="4" stroke-linecap="round">
        <line x1="32" y1="4" x2="32" y2="12"/>
        <line x1="32" y1="52" x2="32" y2="60"/>
        <line x1="4" y1="32" x2="12" y2="32"/>
        <line x1="52" y1="32" x2="60" y2="32"/>
        <line x1="12" y1="12" x2="17.5" y2="17.5"/>
        <line x1="46.5" y1="46.5" x2="52" y2="52"/>
        <line x1="12" y1="52" x2="17.5" y2="46.5"/>
        <line x1="46.5" y1="17.5" x2="52" y2="12"/>
      </g>
    </svg>`,
    "sun-cloud": `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="11" fill="#FFD166"/>
      <path d="M14 46c-6 0-10-4.5-10-9.5S8 27 14 27c1.6-5.6 6.8-9 12.6-9 7 0 12.8 5 13.8 11.6C46.6 30.5 51 35 51 40.5S46.6 50 41 50H14z" fill="#6B9E93"/>
    </svg>`,
    cloud: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 46c-7 0-12-5.4-12-11.5S9 23 16 23c2-6.7 8.1-11 15-11 8.4 0 15.3 6 16.6 13.9C54.4 27 60 32.4 60 39s-6.4 11-14 11H16z" fill="#5A527A"/>
    </svg>`,
    rain: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 38c-7 0-12-5.4-12-11.5S7 15 14 15c2-6.7 8.1-11 15-11 8.4 0 15.3 6 16.6 13.9C52.4 19 58 24.4 58 31s-6.4 11-14 11H14z" fill="#6B9E93"/>
      <g stroke="#073B4C" stroke-width="4" stroke-linecap="round">
        <line x1="20" y1="46" x2="17" y2="56"/>
        <line x1="32" y1="46" x2="29" y2="56"/>
        <line x1="44" y1="46" x2="41" y2="56"/>
      </g>
    </svg>`,
    storm: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 36c-7 0-12-5.4-12-11.5S7 13 14 13c2-6.7 8.1-11 15-11 8.4 0 15.3 6 16.6 13.9C52.4 17 58 22.4 58 29s-6.4 11-14 11H14z" fill="#5A527A"/>
      <path d="M33 40l-9 14h7l-4 10 13-16h-7l4-8z" fill="#FFD166"/>
    </svg>`,
    snow: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 36c-7 0-12-5.4-12-11.5S7 13 14 13c2-6.7 8.1-11 15-11 8.4 0 15.3 6 16.6 13.9C52.4 17 58 22.4 58 29s-6.4 11-14 11H14z" fill="#6B9E93"/>
      <g stroke="#073B4C" stroke-width="3" stroke-linecap="round">
        <line x1="20" y1="46" x2="20" y2="56"/>
        <line x1="16" y1="51" x2="24" y2="51"/>
        <line x1="44" y1="46" x2="44" y2="56"/>
        <line x1="40" y1="51" x2="48" y2="51"/>
      </g>
    </svg>`,
    fog: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#5A527A" stroke-width="5" stroke-linecap="round">
        <line x1="8" y1="22" x2="56" y2="22"/>
        <line x1="14" y1="32" x2="50" y2="32"/>
        <line x1="8" y1="42" x2="56" y2="42"/>
      </g>
    </svg>`,
  };
  return icons[type] || icons.cloud;
}

// ---------- Cielo dinámico (elemento firma) ----------

function updateSky(hourNow, isDay, weatherIcon) {
  const stormy = weatherIcon === "storm";
  const rainy = weatherIcon === "rain" || weatherIcon === "snow";

  let top, bottom, bodyColor, glow;

  if (!isDay) {
    // Noche
    top = "#061a2b";
    bottom = "#0d2f45";
    bodyColor = "#e6e8f0";
    glow = "rgba(230, 232, 240, 0.35)";
  } else if (hourNow < 8) {
    // Amanecer
    top = "#7d8fc4";
    bottom = "#ffb98a";
    bodyColor = "#ffd166";
    glow = "rgba(255, 209, 102, 0.5)";
  } else if (hourNow >= 18) {
    // Atardecer
    top = "#3b3f6b";
    bottom = "#e8896b";
    bodyColor = "#ffd166";
    glow = "rgba(255, 209, 102, 0.45)";
  } else {
    // Día
    top = "#6ec3d8";
    bottom = "#ffe8b0";
    bodyColor = "#ffd166";
    glow = "rgba(255, 209, 102, 0.55)";
  }

  if (stormy) {
    top = "#2b2d3d";
    bottom = "#5a527a";
    glow = "rgba(90, 82, 122, 0.4)";
  } else if (rainy && isDay) {
    top = "#4d6d78";
    bottom = "#8fa8a3";
  }

  el.sky.style.setProperty("--sky-top", top);
  el.sky.style.setProperty("--sky-bottom", bottom);
  el.skyBody.style.background = bodyColor;
  el.skyBody.style.boxShadow = `0 0 90px 30px ${glow}`;
  document.documentElement.style.setProperty("--sky-top", top);
  document.documentElement.style.setProperty("--sky-bottom", bottom);
}

// ---------- Formato de temperatura ----------

function formatTemp(celsius) {
  if (state.unit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

// ---------- Formato de fecha/hora en español ----------

function formatDateLong(isoString) {
  const date = new Date(isoString);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: state.location.timezone,
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatHour(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("es-AR", {
    hour: "numeric",
    timeZone: state.location.timezone,
  }).format(date) + "h";
}

function formatDayShort(isoString) {
  const date = new Date(isoString);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: state.location.timezone,
  }).format(date);
  return formatted.replace(".", "");
}

// ---------- Render ----------

function renderCurrent(data) {
  const { current } = data;
  const info = getWeatherInfo(current.weather_code);
  const isDay = current.is_day === 1;

  el.cityName.textContent = `${state.location.name}, ${state.location.place}`;
  el.dateNow.textContent = formatDateLong(current.time);
  el.currentIcon.innerHTML = iconSvg(info.icon);
  el.currentTemp.textContent = formatTemp(current.temperature_2m);
  el.currentDesc.textContent = info.desc;
  el.feelsLike.textContent = `${formatTemp(current.apparent_temperature)}°`;
  el.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  el.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  // % de precipitación: tomamos la probabilidad de la hora actual del bloque hourly
  const nowHourIndex = data.hourly.time.findIndex((t) => t === roundToHour(current.time));
  const rainProb = nowHourIndex >= 0 ? data.hourly.precipitation_probability[nowHourIndex] : 0;
  el.rainChance.textContent = `${rainProb ?? 0}%`;

  // Extraemos la hora directamente del string (ya viene en hora de Buenos Aires)
  const currentHour = Number(current.time.slice(11, 13));
  updateSky(currentHour, isDay, info.icon);
}

function roundToHour(isoString) {
  // Tanto "current.time" como "hourly.time" vienen como hora local de
  // Buenos Aires en texto plano (ej: "2026-07-11T14:30"), sin offset de UTC.
  // Por eso truncamos el string directamente en vez de usar toISOString(),
  // que convertiría a UTC y desalinearía la comparación.
  return isoString.slice(0, 13) + ":00";
}

function renderHourly(data) {
  const nowIndex = data.hourly.time.findIndex((t) => t === roundToHour(data.current.time));
  const startIndex = nowIndex >= 0 ? nowIndex : 0;
  const nextHours = data.hourly.time.slice(startIndex, startIndex + 12);

  el.hourlyScroll.innerHTML = nextHours
    .map((time, i) => {
      const idx = startIndex + i;
      const info = getWeatherInfo(data.hourly.weather_code[idx]);
      const temp = formatTemp(data.hourly.temperature_2m[idx]);
      const label = i === 0 ? "Ahora" : formatHour(time);
      return `
        <div class="hour-card">
          <p class="hour-card__time">${label}</p>
          <div class="hour-card__icon">${iconSvg(info.icon)}</div>
          <p class="hour-card__temp">${temp}°</p>
        </div>
      `;
    })
    .join("");
}

function renderDaily(data) {
  const days = data.daily.time;

  el.dailyList.innerHTML = days
    .map((date, i) => {
      const info = getWeatherInfo(data.daily.weather_code[i]);
      const max = formatTemp(data.daily.temperature_2m_max[i]);
      const min = formatTemp(data.daily.temperature_2m_min[i]);
      const label = i === 0 ? "Hoy" : formatDayShort(date);
      return `
        <div class="day-row">
          <span class="day-row__name">${label}</span>
          <div class="day-row__icon">${iconSvg(info.icon)}</div>
          <span class="day-row__desc">${info.desc}</span>
          <span class="day-row__range">${max}° <span>/ ${min}°</span></span>
        </div>
      `;
    })
    .join("");
}

function renderAll() {
  if (!state.data) return;
  renderCurrent(state.data);
  renderHourly(state.data);
  renderDaily(state.data);
  el.unitToggle.textContent = state.unit === "C" ? "°C" : "°F";
  el.unitToggle.setAttribute("aria-pressed", state.unit === "F" ? "true" : "false");
}

// ---------- Fetch principal ----------

async function loadWeather() {
  // Mostramos el estado de carga y ocultamos resultados previos
  el.status.hidden = false;
  el.statusText.textContent = `Buscando el cielo de ${state.location.name}…`;
  el.retryBtn.hidden = true;
  el.hero.hidden = true;
  el.hourlySection.hidden = true;
  el.dailySection.hidden = true;

  // Si Open-Meteo no responde en 8 segundos, abortamos y mostramos "reintentar"
  // en vez de dejar la pantalla colgada para siempre.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(buildForecastUrl(state.location), {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    const data = await response.json();
    state.data = data;

    el.status.hidden = true;
    el.hero.hidden = false;
    el.hourlySection.hidden = false;
    el.dailySection.hidden = false;

    renderAll();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("No se pudo obtener el clima:", error);

    const timedOut = error.name === "AbortError";
    el.statusText.textContent = timedOut
      ? "La conexión tardó demasiado. Revisá tu red e intentá de nuevo."
      : "No pudimos cargar el clima en este momento. Probá de nuevo en unos segundos.";
    el.retryBtn.hidden = false;
  }
}

// ---------- Buscador de ciudad (Open-Meteo Geocoding) ----------

let searchDebounceId = null;

async function searchCities(query) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=8&language=es&format=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

function renderSearchResults(results) {
  if (results.length === 0) {
    el.searchResults.innerHTML = `<li class="search__empty">No encontramos ciudades con ese nombre</li>`;
    el.searchResults.hidden = false;
    return;
  }

  el.searchResults.innerHTML = results
    .map((r, i) => {
      const place = [r.admin1, r.country].filter(Boolean).join(", ");
      return `
        <li class="search__result" tabindex="0" data-index="${i}">
          <span class="search__result-name">${r.name}</span>
          <span class="search__result-place">${place}</span>
        </li>
      `;
    })
    .join("");

  el.searchResults.hidden = false;

  // Guardamos los resultados crudos para usarlos al hacer click/Enter
  el.searchResults.dataset.results = JSON.stringify(results);
}

function selectCity(result) {
  state.location = {
    name: result.name,
    place: [result.admin1, result.country].filter(Boolean).join(", "),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  };

  saveLocation(state.location);

  el.searchResults.hidden = true;
  el.searchInput.value = "";

  loadWeather();
}

el.searchInput.addEventListener("input", () => {
  const query = el.searchInput.value.trim();

  clearTimeout(searchDebounceId);

  if (query.length < 2) {
    el.searchResults.hidden = true;
    return;
  }

  // Debounce de 400ms para no spamear la API en cada tecla
  searchDebounceId = setTimeout(async () => {
    try {
      const results = await searchCities(query);
      renderSearchResults(results);
    } catch (error) {
      console.error("No se pudo buscar la ciudad:", error);
      el.searchResults.innerHTML = `<li class="search__empty">No pudimos buscar en este momento</li>`;
      el.searchResults.hidden = false;
    }
  }, 400);
});

el.searchResults.addEventListener("click", (event) => {
  const item = event.target.closest(".search__result");
  if (!item) return;

  const results = JSON.parse(el.searchResults.dataset.results || "[]");
  const result = results[Number(item.dataset.index)];
  if (result) selectCity(result);
});

el.searchResults.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const item = event.target.closest(".search__result");
  if (!item) return;

  const results = JSON.parse(el.searchResults.dataset.results || "[]");
  const result = results[Number(item.dataset.index)];
  if (result) selectCity(result);
});

// Cerramos el listado de resultados si se hace click afuera
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) {
    el.searchResults.hidden = true;
  }
});

// ---------- Eventos ----------

el.unitToggle.addEventListener("click", () => {
  state.unit = state.unit === "C" ? "F" : "C";
  renderAll();
});

el.retryBtn.addEventListener("click", loadWeather);

// ---------- Inicio ----------

loadWeather();