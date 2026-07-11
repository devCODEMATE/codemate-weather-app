/* ==========================================================================
   CodeMate Weather
   Fuente de datos: Open-Meteo (pronóstico) + Open-Meteo Geocoding (buscador)
   ========================================================================== */

import { formatTemp, roundToHour, formatHour, getSeason, locationKey, getWeatherInfo } from "./tests/utils.test.js";

const DEFAULT_LOCATION = {
  name: "La Plata",
  place: "Buenos Aires, Argentina",
  latitude: -34.9214,
  longitude: -57.9544,
  timezone: "America/Argentina/Buenos_Aires",
};

const LOCATION_STORAGE_KEY = "codemate-weather-last-location";
const LANG_STORAGE_KEY = "codemate-weather-lang";
const FAVORITES_STORAGE_KEY = "codemate-weather-favorites";
const MAX_FAVORITES = 5;

// ---------- Idioma: detección + diccionario de UI ----------

function detectLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "en" || saved === "es") return saved;

  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || "en";
  return browserLang.toLowerCase().startsWith("es") ? "es" : "en";
}

const UI_TEXT = {
  en: {
    searchPlaceholder: "Search city or country…",
    loading: (city) => `Loading the sky over ${city}…`,
    timeoutError: "The connection took too long. Check your network and try again.",
    loadError: "We couldn't load the weather right now. Try again in a few seconds.",
    retry: "Retry",
    noCities: "No cities found with that name",
    searchError: "We couldn't search right now",
    hourlyTitle: "Next hours",
    dailyTitle: "Next days",
    now: "Now",
    today: "Today",
    humidity: "Humidity",
    wind: "Wind",
    precipitation: "Precipitation",
    feelsLike: "Feels like",
    footerData: "Data by",
    footerMade: "Made by",
    dateLocale: "en-US",
    geocodingLang: "en",
    useMyLocation: "Use my location",
    locating: "Locating…",
    geoNotSupported: "Your browser doesn't support geolocation.",
    geoDenied: "Location access was denied.",
    geoUnavailable: "We couldn't get your location. Try again.",
    addToFavorites: "Add to favorites",
    removeFromFavorites: "Remove from favorites",
    removeFavorite: "Remove",
    maxFavorites: (n) => `You can save up to ${n} favorites. Remove one to add another.`,
  },
  es: {
    searchPlaceholder: "Buscar ciudad o país…",
    loading: (city) => `Buscando el cielo de ${city}…`,
    timeoutError: "La conexión tardó demasiado. Revisá tu red e intentá de nuevo.",
    loadError: "No pudimos cargar el clima en este momento. Probá de nuevo en unos segundos.",
    retry: "Reintentar",
    noCities: "No encontramos ciudades con ese nombre",
    searchError: "No pudimos buscar en este momento",
    hourlyTitle: "Próximas horas",
    dailyTitle: "Próximos días",
    now: "Ahora",
    today: "Hoy",
    humidity: "Humedad",
    wind: "Viento",
    precipitation: "Precipitación",
    feelsLike: "Sensación térmica",
    footerData: "Datos de",
    footerMade: "Hecho por",
    dateLocale: "es-AR",
    geocodingLang: "es",
    useMyLocation: "Usar mi ubicación",
    locating: "Buscando tu ubicación…",
    geoNotSupported: "Tu navegador no soporta geolocalización.",
    geoDenied: "Se denegó el acceso a tu ubicación.",
    geoUnavailable: "No pudimos obtener tu ubicación. Probá de nuevo.",
    addToFavorites: "Agregar a favoritos",
    removeFromFavorites: "Quitar de favoritos",
    removeFavorite: "Quitar",
    maxFavorites: (n) => `Podés guardar hasta ${n} favoritos. Quitá uno para agregar otro.`,
  },
};

function t() {
  return UI_TEXT[state.lang];
}

// Estado en memoria
let state = {
  unit: "C", // "C" | "F"
  lang: detectLang(), // "en" | "es"
  data: null,
  location: loadSavedLocation(),
  favorites: loadSavedFavorites(),
  lastErrorTimedOut: false,
  lastParticleSeason: null,
};

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

function saveLocation(location) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {
    // localStorage unavailable (private mode, etc.) — we just skip saving
  }
}

function loadSavedFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage unavailable — skip saving
  }
}

// Identificamos una ubicación por lat/lon redondeadas a 2 decimales (~1km):
// suficiente para reconocer "la misma ciudad" aunque venga de geolocalización
// una vez y de búsqueda por texto otra, con coordenadas levemente distintas.
// (la función en sí vive en utils.js, para poder testearla sin DOM)

function isFavorite(location) {
  const key = locationKey(location);
  return state.favorites.some((fav) => locationKey(fav) === key);
}

function saveLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable — skip saving
  }
}

function buildForecastUrl(location) {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    // "auto" lets Open-Meteo resolve the IANA timezone from the coordinates —
    // handy for geolocated positions, where we don't already have a timezone name.
    `&timezone=auto&forecast_days=7`
  );
}

// ---------- Referencias al DOM ----------

const el = {
  status: document.getElementById("status"),
  statusText: document.getElementById("statusText"),
  retryBtn: document.getElementById("retryBtn"),
  skeleton: document.getElementById("skeleton"),
  srStatus: document.getElementById("srStatus"),
  hero: document.getElementById("hero"),
  hourlySection: document.getElementById("hourlySection"),
  dailySection: document.getElementById("dailySection"),

  sky: document.getElementById("sky"),
  skyBody: document.getElementById("skyBody"),
  particles: document.getElementById("particles"),

  cityName: document.getElementById("cityName"),
  favBtn: document.getElementById("favBtn"),
  favoritesBar: document.getElementById("favoritesBar"),
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
  langToggle: document.getElementById("langToggle"),

  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  geoBtn: document.getElementById("geoBtn"),
  geoError: document.getElementById("geoError"),

  hourlyTitle: document.getElementById("hourlyTitle"),
  dailyTitle: document.getElementById("dailyTitle"),
  feelsLabel: document.getElementById("feelsLabel"),
  humidityLabel: document.getElementById("humidityLabel"),
  windLabel: document.getElementById("windLabel"),
  rainLabel: document.getElementById("rainLabel"),
  footerDataText: document.getElementById("footerDataText"),
  footerMadeText: document.getElementById("footerMadeText"),
};

// ---------- Mapa de códigos WMO -> descripción (EN/ES) e ícono ----------
// (WEATHER_MAP y getWeatherInfo viven en utils.js, para poder testearlos sin DOM)

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

// ---------- Estación del año (según hemisferio) ----------

// ---------- Estación del año (según hemisferio) ----------
// (getSeason vive en utils.js, para poder testearla sin DOM)

// Paletas de cielo diurno despejado, una por estación
const SEASON_DAY_SKY = {
  summer: { top: "#6ec3d8", bottom: "#ffe8b0" },
  autumn: { top: "#c98f5e", bottom: "#f4d9a0" },
  winter: { top: "#8fb0c4", bottom: "#e3ecec" },
  spring: { top: "#7fc9b9", bottom: "#ffe6c2" },
};

// ---------- Cielo dinámico (elemento firma) ----------

function updateSky(hourNow, isDay, weatherIcon, season) {
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
    // Día despejado: la paleta depende de la estación del año en esa ubicación
    const seasonSky = SEASON_DAY_SKY[season] || SEASON_DAY_SKY.summer;
    top = seasonSky.top;
    bottom = seasonSky.bottom;
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

// Configuración de partículas por estación: clase CSS, cantidad y rango de
// duración de caída (segundos). El verano se queda sin partículas a propósito
// — ya tiene bastante vida con el sol y el cielo despejado.
const SEASON_PARTICLES = {
  winter: { className: "particle--snow", count: 12, minDuration: 9, maxDuration: 16 },
  autumn: { className: "particle--leaf", count: 8, minDuration: 7, maxDuration: 12 },
  spring: { className: "particle--petal", count: 7, minDuration: 10, maxDuration: 17 },
  summer: null,
};

function renderParticles(season, weatherIcon) {
  // Durante tormenta ocultamos las partículas: el cielo ya está lo
  // suficientemente cargado con el rayo, no hace falta sumar más ruido visual.
  const config = weatherIcon === "storm" ? null : SEASON_PARTICLES[season];
  const particleKey = config ? season : "none";

  // Si ya están las partículas correctas dibujadas, no las regeneramos —
  // evita cortar la animación de caída en cada refresco de datos.
  if (state.lastParticleSeason === particleKey) return;
  state.lastParticleSeason = particleKey;

  el.particles.innerHTML = "";
  if (!config) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement("div");
    particle.className = `particle ${config.className}`;

    const duration = config.minDuration + Math.random() * (config.maxDuration - config.minDuration);
    const delay = Math.random() * duration; // arranque escalonado, no todas juntas
    const drift = `${Math.round(Math.random() * 70 - 35)}px`;

    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${duration.toFixed(1)}s`;
    particle.style.animationDelay = `-${delay.toFixed(1)}s`;
    particle.style.setProperty("--drift", drift);

    fragment.appendChild(particle);
  }
  el.particles.appendChild(fragment);
}

// ---------- Formato de temperatura ----------
// (formatTemp vive en utils.js, para poder testearla sin DOM)

// ---------- Formato de fecha/hora según idioma ----------

function formatDateLong(isoString) {
  const date = new Date(isoString);
  const formatted = new Intl.DateTimeFormat(t().dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: state.location.timezone,
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// formatHour vive en utils.js, para poder testearla sin DOM

function formatDayShort(isoString) {
  const date = new Date(isoString);
  const formatted = new Intl.DateTimeFormat(t().dateLocale, {
    weekday: "short",
    timeZone: state.location.timezone,
  }).format(date);
  return formatted.replace(".", "");
}

// ---------- Render ----------

function renderCurrent(data) {
  const { current } = data;
  const info = getWeatherInfo(current.weather_code, state.lang);
  const isDay = current.is_day === 1;

  el.cityName.textContent = `${state.location.name}, ${state.location.place}`;
  updateFavButton();
  el.dateNow.textContent = formatDateLong(current.time);
  el.currentIcon.innerHTML = iconSvg(info.icon);
  el.currentTemp.textContent = formatTemp(current.temperature_2m, state.unit);
  el.currentDesc.textContent = info.desc;
  el.feelsLike.textContent = `${formatTemp(current.apparent_temperature, state.unit)}°`;
  el.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  el.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  // % de precipitación: tomamos la probabilidad de la hora actual del bloque hourly
  const nowHourIndex = data.hourly.time.findIndex((time) => time === roundToHour(current.time));
  const rainProb = nowHourIndex >= 0 ? data.hourly.precipitation_probability[nowHourIndex] : 0;
  el.rainChance.textContent = `${rainProb ?? 0}%`;

  // Extraemos la hora directamente del string (ya viene en hora local del lugar)
  const currentHour = Number(current.time.slice(11, 13));
  const season = getSeason(state.location.latitude, current.time);
  updateSky(currentHour, isDay, info.icon, season);
  renderParticles(season, info.icon);
}

// roundToHour vive en utils.js, para poder testearla sin DOM

function renderHourly(data) {
  const nowIndex = data.hourly.time.findIndex((time) => time === roundToHour(data.current.time));
  const startIndex = nowIndex >= 0 ? nowIndex : 0;
  const nextHours = data.hourly.time.slice(startIndex, startIndex + 12);

  el.hourlyScroll.innerHTML = nextHours
    .map((time, i) => {
      const idx = startIndex + i;
      const info = getWeatherInfo(data.hourly.weather_code[idx], state.lang);
      const temp = formatTemp(data.hourly.temperature_2m[idx], state.unit);
      const label = i === 0 ? t().now : formatHour(time);
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
      const info = getWeatherInfo(data.daily.weather_code[i], state.lang);
      const max = formatTemp(data.daily.temperature_2m_max[i], state.unit);
      const min = formatTemp(data.daily.temperature_2m_min[i], state.unit);
      const label = i === 0 ? t().today : formatDayShort(date);
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

function applyStaticText() {
  const strings = t();
  document.documentElement.lang = state.lang;
  el.searchInput.placeholder = strings.searchPlaceholder;
  el.hourlyTitle.textContent = strings.hourlyTitle;
  el.dailyTitle.textContent = strings.dailyTitle;
  el.feelsLabel.textContent = strings.feelsLike;
  el.humidityLabel.textContent = strings.humidity;
  el.windLabel.textContent = strings.wind;
  el.rainLabel.textContent = strings.precipitation;
  el.footerDataText.textContent = strings.footerData;
  el.footerMadeText.textContent = strings.footerMade;
  el.retryBtn.textContent = strings.retry;
  el.langToggle.textContent = state.lang.toUpperCase();
  el.geoBtn.setAttribute("aria-label", strings.useMyLocation);
  updateFavButton();
  renderFavorites();
}

function renderAll() {
  applyStaticText();
  if (!state.data) return;
  renderCurrent(state.data);
  renderHourly(state.data);
  renderDaily(state.data);
  el.unitToggle.textContent = state.unit === "C" ? "°C" : "°F";
  el.unitToggle.setAttribute("aria-pressed", state.unit === "F" ? "true" : "false");
}

// ---------- Fetch principal ----------

async function loadWeather() {
  // Mostramos el skeleton (visual) y anunciamos el estado a lectores de pantalla
  el.status.hidden = true;
  el.skeleton.hidden = false;
  el.srStatus.textContent = t().loading(state.location.name);
  el.retryBtn.hidden = true;
  el.retryBtn.textContent = t().retry;
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
    // "timezone=auto" en la URL hace que Open-Meteo nos devuelva el IANA
    // timezone real de esas coordenadas — lo guardamos para el formato de fechas.
    if (data.timezone) {
      state.location.timezone = data.timezone;
      saveLocation(state.location);
    }

    el.skeleton.hidden = true;
    el.hero.hidden = false;
    el.hourlySection.hidden = false;
    el.dailySection.hidden = false;

    renderAll();
    el.srStatus.textContent = "";
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("No se pudo obtener el clima:", error);

    const timedOut = error.name === "AbortError";
    state.lastErrorTimedOut = timedOut;
    const message = timedOut ? t().timeoutError : t().loadError;

    el.skeleton.hidden = true;
    el.status.hidden = false;
    el.statusText.textContent = message;
    el.srStatus.textContent = message;
    el.retryBtn.hidden = false;
  }
}

// ---------- Favoritos ----------

function updateFavButton() {
  const active = isFavorite(state.location);
  el.favBtn.setAttribute("aria-pressed", active ? "true" : "false");
  el.favBtn.setAttribute("aria-label", active ? t().removeFromFavorites : t().addToFavorites);
  el.favBtn.title = "";

  // Si no es favorita y ya llegamos al máximo, deshabilitamos el botón de agregar
  const atMax = !active && state.favorites.length >= MAX_FAVORITES;
  el.favBtn.disabled = atMax;
  if (atMax) el.favBtn.title = t().maxFavorites(MAX_FAVORITES);
}

function renderFavorites() {
  if (state.favorites.length === 0) {
    el.favoritesBar.hidden = true;
    el.favoritesBar.innerHTML = "";
    return;
  }

  el.favoritesBar.hidden = false;
  el.favoritesBar.innerHTML = state.favorites
    .map(
      (fav, i) => `
        <button class="favorite-pill" type="button" data-index="${i}">
          ${fav.name}
          <span class="favorite-pill__remove" data-remove-index="${i}" title="${t().removeFavorite}" role="button" tabindex="0">✕</span>
        </button>
      `
    )
    .join("");
}

el.favBtn.addEventListener("click", () => {
  if (isFavorite(state.location)) {
    state.favorites = state.favorites.filter((fav) => locationKey(fav) !== locationKey(state.location));
  } else {
    if (state.favorites.length >= MAX_FAVORITES) return;
    state.favorites = [
      ...state.favorites,
      {
        name: state.location.name,
        place: state.location.place,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
      },
    ];
  }
  saveFavorites(state.favorites);
  updateFavButton();
  renderFavorites();
});

el.favoritesBar.addEventListener("click", (event) => {
  const removeTarget = event.target.closest("[data-remove-index]");
  if (removeTarget) {
    const index = Number(removeTarget.dataset.removeIndex);
    state.favorites = state.favorites.filter((_, i) => i !== index);
    saveFavorites(state.favorites);
    updateFavButton();
    renderFavorites();
    return;
  }

  const pill = event.target.closest(".favorite-pill");
  if (!pill) return;

  const fav = state.favorites[Number(pill.dataset.index)];
  if (!fav) return;

  state.location = { ...fav };
  saveLocation(state.location);
  el.searchInput.value = "";
  el.searchResults.hidden = true;
  loadWeather();
});

// ---------- Geolocalización ----------

async function reverseGeocode(latitude, longitude) {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}` +
    `&longitude=${longitude}&localityLanguage=${t().geocodingLang}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  const data = await response.json();

  return {
    name: data.city || data.locality || data.principalSubdivision || "—",
    place: [data.principalSubdivision, data.countryName].filter(Boolean).join(", "),
  };
}

function setGeoLoading(isLoading) {
  el.geoBtn.disabled = isLoading;
  el.geoBtn.classList.toggle("is-loading", isLoading);
}

el.geoBtn.addEventListener("click", () => {
  el.geoError.hidden = true;

  if (!navigator.geolocation) {
    el.geoError.textContent = t().geoNotSupported;
    el.geoError.hidden = false;
    return;
  }

  setGeoLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const place = await reverseGeocode(latitude, longitude);
        state.location = { name: place.name, place: place.place, latitude, longitude };
        saveLocation(state.location);

        el.searchInput.value = "";
        el.searchResults.hidden = true;
        loadWeather();
      } catch (error) {
        console.error("No se pudo resolver la ubicación:", error);
        el.geoError.textContent = t().geoUnavailable;
        el.geoError.hidden = false;
      } finally {
        setGeoLoading(false);
      }
    },
    (error) => {
      setGeoLoading(false);
      el.geoError.textContent = error.code === 1 ? t().geoDenied : t().geoUnavailable;
      el.geoError.hidden = false;
    },
    { timeout: 8000, maximumAge: 5 * 60 * 1000 }
  );
});

// ---------- Buscador de ciudad (Open-Meteo Geocoding) ----------

let searchDebounceId = null;

async function searchCities(query) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=8&language=${t().geocodingLang}&format=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

function renderSearchResults(results) {
  if (results.length === 0) {
    el.searchResults.innerHTML = `<li class="search__empty">${t().noCities}</li>`;
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

  el.geoError.hidden = true;
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
      el.searchResults.innerHTML = `<li class="search__empty">${t().searchError}</li>`;
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

el.langToggle.addEventListener("click", () => {
  state.lang = state.lang === "en" ? "es" : "en";
  saveLang(state.lang);
  applyStaticText();
  if (state.data) {
    renderAll();
  } else if (!el.retryBtn.hidden) {
    // Se está mostrando un error: actualizamos ese texto al nuevo idioma
    const message = state.lastErrorTimedOut ? t().timeoutError : t().loadError;
    el.statusText.textContent = message;
    el.srStatus.textContent = message;
  } else {
    // Todavía está cargando (skeleton visible)
    el.srStatus.textContent = t().loading(state.location.name);
  }
});

el.retryBtn.addEventListener("click", loadWeather);

// ---------- Inicio ----------

applyStaticText();
loadWeather();