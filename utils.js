/* ==========================================================================
   CodeMate Weather — funciones puras
   Sin DOM, sin fetch, sin estado global: reciben datos, devuelven datos.
   Por eso viven separadas de app.js — así se pueden importar y testear
   directamente con Vitest, sin necesidad de un navegador.
   ========================================================================== */

// ---------- Temperatura ----------

export function formatTemp(celsius, unit) {
  if (unit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

// ---------- Fecha / hora ----------

export function roundToHour(isoString) {
  // Tanto "current.time" como "hourly.time" vienen como hora local del lugar
  // en texto plano (ej: "2026-07-11T14:30"), sin offset de UTC. Por eso
  // truncamos el string directamente en vez de usar toISOString(), que
  // convertiría a UTC y desalinearía la comparación.
  return isoString.slice(0, 13) + ":00";
}

export function formatHour(isoString) {
  // Tomamos la hora directo del string (formato 24hs de la API) y la
  // convertimos a 12hs con am/pm, sin pasar por Intl (evitaba el bug
  // "11 a.m.h" al concatenar la unidad después del período del día).
  const hour24 = Number(isoString.slice(11, 13));
  const period = hour24 < 12 ? "am" : "pm";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}${period}`;
}

// ---------- Estación del año (según hemisferio) ----------

// Estaciones del hemisferio norte por mes (1-12)
export const NORTHERN_SEASON_BY_MONTH = {
  12: "winter", 1: "winter", 2: "winter",
  3: "spring", 4: "spring", 5: "spring",
  6: "summer", 7: "summer", 8: "summer",
  9: "autumn", 10: "autumn", 11: "autumn",
};

const INVERT_SEASON = { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" };

export function getSeason(latitude, isoTimeString) {
  const month = Number(isoTimeString.slice(5, 7));
  const season = NORTHERN_SEASON_BY_MONTH[month];
  // En el hemisferio sur las estaciones están invertidas respecto al norte
  return latitude < 0 ? INVERT_SEASON[season] : season;
}

// ---------- Ubicación ----------

// Identificamos una ubicación por lat/lon redondeadas a 2 decimales (~1km):
// suficiente para reconocer "la misma ciudad" aunque venga de geolocalización
// una vez y de búsqueda por texto otra, con coordenadas levemente distintas.
export function locationKey(location) {
  return `${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
}

// ---------- Mapa de códigos WMO -> descripción (EN/ES) e ícono ----------

export const WEATHER_MAP = {
  0: { desc: { en: "Clear sky", es: "Cielo despejado" }, icon: "sun" },
  1: { desc: { en: "Mostly clear", es: "Mayormente despejado" }, icon: "sun-cloud" },
  2: { desc: { en: "Partly cloudy", es: "Parcialmente nublado" }, icon: "sun-cloud" },
  3: { desc: { en: "Cloudy", es: "Nublado" }, icon: "cloud" },
  45: { desc: { en: "Fog", es: "Niebla" }, icon: "fog" },
  48: { desc: { en: "Rime fog", es: "Niebla con escarcha" }, icon: "fog" },
  51: { desc: { en: "Light drizzle", es: "Llovizna débil" }, icon: "rain" },
  53: { desc: { en: "Drizzle", es: "Llovizna" }, icon: "rain" },
  55: { desc: { en: "Heavy drizzle", es: "Llovizna intensa" }, icon: "rain" },
  56: { desc: { en: "Freezing drizzle", es: "Llovizna helada" }, icon: "rain" },
  57: { desc: { en: "Heavy freezing drizzle", es: "Llovizna helada intensa" }, icon: "rain" },
  61: { desc: { en: "Light rain", es: "Lluvia débil" }, icon: "rain" },
  63: { desc: { en: "Rain", es: "Lluvia" }, icon: "rain" },
  65: { desc: { en: "Heavy rain", es: "Lluvia intensa" }, icon: "rain" },
  66: { desc: { en: "Freezing rain", es: "Lluvia helada" }, icon: "rain" },
  67: { desc: { en: "Heavy freezing rain", es: "Lluvia helada intensa" }, icon: "rain" },
  71: { desc: { en: "Light snow", es: "Nevada débil" }, icon: "snow" },
  73: { desc: { en: "Snow", es: "Nevada" }, icon: "snow" },
  75: { desc: { en: "Heavy snow", es: "Nevada intensa" }, icon: "snow" },
  77: { desc: { en: "Snow grains", es: "Granos de nieve" }, icon: "snow" },
  80: { desc: { en: "Light showers", es: "Chubascos débiles" }, icon: "rain" },
  81: { desc: { en: "Showers", es: "Chubascos" }, icon: "rain" },
  82: { desc: { en: "Violent showers", es: "Chubascos violentos" }, icon: "rain" },
  85: { desc: { en: "Snow showers", es: "Chubascos de nieve" }, icon: "snow" },
  86: { desc: { en: "Heavy snow showers", es: "Chubascos de nieve intensos" }, icon: "snow" },
  95: { desc: { en: "Thunderstorm", es: "Tormenta eléctrica" }, icon: "storm" },
  96: { desc: { en: "Thunderstorm with hail", es: "Tormenta con granizo" }, icon: "storm" },
  99: { desc: { en: "Severe thunderstorm with hail", es: "Tormenta severa con granizo" }, icon: "storm" },
};

export function getWeatherInfo(code, lang) {
  const entry = WEATHER_MAP[code] || { desc: { en: "Unknown condition", es: "Condición desconocida" }, icon: "cloud" };
  return { desc: entry.desc[lang], icon: entry.icon };
}