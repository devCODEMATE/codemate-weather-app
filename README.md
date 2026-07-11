# CodeMate Weather

**[English](#english) | [Español](#español)**

---

<a id="english"></a>
## English

A weather app built with **vanilla HTML, CSS and JavaScript** — no frameworks, no build tools. Search any city in the world and get current conditions, an hourly forecast, and a 7-day outlook, wrapped in an animated sky that shifts with the time of day, the weather, and the season.

**Live demo:** https://devcodemate.github.io/codemate-weather-app/

![Weather in Genoa, Italy — summer](./screenshots/summer-genoa.png)
![Weather in La Plata, Argentina — winter](./screenshots/winter-la-plata.png)

> Same UI, two hemispheres, two seasons — the sky palette is calculated from the searched city's latitude and the current month, not hardcoded to one location.

## Features

- 🔍 **City search** — powered by the Open-Meteo Geocoding API, no API key required. Type a city or country and pick from live results.
- 🌤️ **Current conditions** — temperature, feels-like, humidity, wind speed and precipitation chance.
- ⏱️ **Hourly forecast** — next 12 hours, scrollable, 12-hour am/pm format.
- 📅 **7-day forecast** — daily highs, lows and condition.
- 🎨 **Dynamic sky background** — the signature visual element. The gradient shifts for:
  - Time of day (dawn / day / dusk / night)
  - Current weather (storms and rain darken the palette)
  - Season, calculated from the city's hemisphere (latitude) and the current month — so a search in July shows winter tones in Buenos Aires and summer tones in Madrid, correctly.
- 🌡️ **°C / °F toggle**
- 🌐 **EN / ES language toggle** — auto-detects the browser's language on first load, falls back to a manual toggle, and remembers the choice.
- 💾 **Remembers your last city and language** via `localStorage`.
- ⏳ **Resilient loading** — an 8-second timeout with a retry button, instead of hanging indefinitely if the network stalls.

## Tech stack

- HTML5, CSS3 (custom properties, no preprocessor), JavaScript (ES6+, no frameworks)
- [Open-Meteo API](https://open-meteo.com/) — forecast data and geocoding, both free and keyless
- Google Fonts: Space Grotesk (display) + Inter (body)
- Deployed on GitHub Pages

## Project structure

```
codemate-weather-app/
├── index.html   # Markup and content
├── style.css    # Styling, animated sky, seasonal palettes, responsive layout
└── app.js       # Weather fetch, geocoding search, i18n, rendering logic
```

No build step: it's static HTML/CSS/JS, so any static file server works.

## Running it locally

```bash
git clone https://github.com/devCODEMATE/codemate-weather-app.git
cd codemate-weather-app
```

Open `index.html` with a local server (for example, the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code). Opening the file directly (`file://`) will break the `fetch` calls to the API — a local server is required.

## How the seasonal sky works

```js
// Northern hemisphere seasons by month
const NORTHERN_SEASON_BY_MONTH = { 12: "winter", 1: "winter", 2: "winter", ... };

function getSeason(latitude, isoTimeString) {
  const month = Number(isoTimeString.slice(5, 7));
  const season = NORTHERN_SEASON_BY_MONTH[month];
  // Southern hemisphere seasons are the opposite of the north
  return latitude < 0 ? INVERT_SEASON[season] : season;
}
```

Each season maps to a distinct sky gradient (`SEASON_DAY_SKY`), applied only to clear daytime skies — dawn, dusk, night, storms and rain keep their own fixed palettes so the mood of those conditions stays consistent year-round.

## Credits

- Weather and geocoding data: [Open-Meteo](https://open-meteo.com/)
- Design and development: [CodeMate](https://github.com/devCODEMATE)

## License

This project is open source and available for learning purposes.

---

<a id="español"></a>
## Español

Una app del clima construida con **HTML, CSS y JavaScript vanilla** — sin frameworks ni herramientas de build. Buscá cualquier ciudad del mundo y obtené el estado actual, pronóstico por hora y a 7 días, envuelto en un cielo animado que cambia según la hora del día, el clima y la estación del año.

**Demo en vivo:** https://devcodemate.github.io/codemate-weather-app/

![Clima en Génova, Italia — verano](./screenshots/summer-genoa.png)
![Clima en La Plata, Argentina — invierno](./screenshots/winter-la-plata.png)

> Misma interfaz, dos hemisferios, dos estaciones — la paleta del cielo se calcula según la latitud de la ciudad buscada y el mes actual, no está fija a una sola ubicación.

### Funcionalidades

- 🔍 **Buscador de ciudades** — usa la API de Geocoding de Open-Meteo, sin necesidad de API key. Escribís una ciudad o país y elegís entre los resultados.
- 🌤️ **Clima actual** — temperatura, sensación térmica, humedad, velocidad del viento y probabilidad de precipitación.
- ⏱️ **Pronóstico por hora** — próximas 12 horas, con scroll horizontal, formato 12hs am/pm.
- 📅 **Pronóstico a 7 días** — máximas, mínimas y condición de cada día.
- 🎨 **Cielo dinámico de fondo** — el elemento visual distintivo del proyecto. El degradé cambia según:
  - La hora del día (amanecer / día / atardecer / noche)
  - El clima actual (tormentas y lluvia oscurecen la paleta)
  - La estación del año, calculada según el hemisferio de la ciudad (latitud) y el mes actual — así una búsqueda en julio muestra tonos de invierno en Buenos Aires y de verano en Madrid, correctamente.
- 🌡️ **Selector °C / °F**
- 🌐 **Selector de idioma EN / ES** — detecta automáticamente el idioma del navegador al cargar, con un botón manual como respaldo, y recuerda la elección.
- 💾 **Recuerda tu última ciudad e idioma** vía `localStorage`.
- ⏳ **Carga resiliente** — timeout de 8 segundos con botón de reintentar, en vez de quedarse colgada indefinidamente si la red falla.

### Stack técnico

- HTML5, CSS3 (custom properties, sin preprocesador), JavaScript (ES6+, sin frameworks)
- [Open-Meteo API](https://open-meteo.com/) — datos de pronóstico y geocoding, ambos gratuitos y sin key
- Google Fonts: Space Grotesk (display) + Inter (texto)
- Desplegado en GitHub Pages

### Estructura del proyecto

```
codemate-weather-app/
├── index.html   # Markup y contenido
├── style.css    # Estilos, cielo animado, paletas estacionales, diseño responsive
└── app.js       # Fetch del clima, buscador con geocoding, i18n, lógica de renderizado
```

Sin paso de build: es HTML/CSS/JS estático, así que funciona con cualquier servidor de archivos estático.

### Correrlo en local

```bash
git clone https://github.com/devCODEMATE/codemate-weather-app.git
cd codemate-weather-app
```

Abrí `index.html` con un servidor local (por ejemplo, la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) de VS Code). Abrir el archivo directamente (`file://`) rompe las llamadas `fetch` a la API — hace falta un servidor local.

### Cómo funciona el cielo estacional

```js
// Estaciones del hemisferio norte por mes
const NORTHERN_SEASON_BY_MONTH = { 12: "winter", 1: "winter", 2: "winter", ... };

function getSeason(latitude, isoTimeString) {
  const month = Number(isoTimeString.slice(5, 7));
  const season = NORTHERN_SEASON_BY_MONTH[month];
  // En el hemisferio sur las estaciones son opuestas a las del norte
  return latitude < 0 ? INVERT_SEASON[season] : season;
}
```

Cada estación mapea a un degradé de cielo distinto (`SEASON_DAY_SKY`), aplicado solo a cielos despejados de día — el amanecer, atardecer, noche, tormentas y lluvia mantienen sus propias paletas fijas para que el clima de esas condiciones se sienta consistente todo el año.

### Créditos

- Datos de clima y geocoding: [Open-Meteo](https://open-meteo.com/)
- Diseño y desarrollo: [CodeMate](https://github.com/devCODEMATE)

### Licencia

Este proyecto es de código abierto y está disponible con fines de aprendizaje.