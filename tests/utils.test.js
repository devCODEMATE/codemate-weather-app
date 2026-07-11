import { describe, it, expect } from "vitest";
import {
  formatTemp,
  roundToHour,
  formatHour,
  getSeason,
  locationKey,
  getWeatherInfo,
} from "../utils.js";

describe("formatTemp", () => {
  it("rounds Celsius to the nearest whole number by default", () => {
    expect(formatTemp(20.4, "C")).toBe(20);
    expect(formatTemp(20.6, "C")).toBe(21);
  });

  it("converts Celsius to Fahrenheit when unit is F", () => {
    expect(formatTemp(0, "F")).toBe(32);
    expect(formatTemp(100, "F")).toBe(212);
    expect(formatTemp(20, "F")).toBe(68);
  });

  it("handles negative temperatures", () => {
    expect(formatTemp(-10, "C")).toBe(-10);
    expect(formatTemp(-10, "F")).toBe(14);
  });
});

describe("roundToHour", () => {
  it("truncates minutes down to :00", () => {
    expect(roundToHour("2026-07-11T14:32")).toBe("2026-07-11T14:00");
  });

  it("keeps a time that's already on the hour unchanged", () => {
    expect(roundToHour("2026-07-11T09:00")).toBe("2026-07-11T09:00");
  });
});

describe("formatHour", () => {
  it("converts 24h strings to 12h am/pm labels", () => {
    expect(formatHour("2026-07-11T09:00")).toBe("9am");
    expect(formatHour("2026-07-11T13:00")).toBe("1pm");
    expect(formatHour("2026-07-11T23:00")).toBe("11pm");
  });

  it("handles the midnight and noon edge cases", () => {
    expect(formatHour("2026-07-11T00:00")).toBe("12am");
    expect(formatHour("2026-07-11T12:00")).toBe("12pm");
  });
});

describe("getSeason", () => {
  it("returns winter for the northern hemisphere in January", () => {
    expect(getSeason(40.4, "2026-01-15T12:00")).toBe("winter");
  });

  it("returns summer for the southern hemisphere in January", () => {
    expect(getSeason(-34.9, "2026-01-15T12:00")).toBe("summer");
  });

  it("returns winter for the southern hemisphere in July (La Plata)", () => {
    expect(getSeason(-34.9214, "2026-07-11T12:00")).toBe("winter");
  });

  it("returns summer for the northern hemisphere in July (Madrid)", () => {
    expect(getSeason(40.4168, "2026-07-11T12:00")).toBe("summer");
  });
});

describe("locationKey", () => {
  it("builds a key from latitude and longitude rounded to 2 decimals", () => {
    expect(locationKey({ latitude: -34.9214, longitude: -57.9544 })).toBe("-34.92_-57.95");
  });

  it("treats near-identical coordinates as the same location", () => {
    const fromSearch = locationKey({ latitude: -34.9214, longitude: -57.9544 });
    const fromGeolocation = locationKey({ latitude: -34.9209, longitude: -57.9541 });
    expect(fromSearch).toBe(fromGeolocation);
  });
});

describe("getWeatherInfo", () => {
  it("returns the Spanish description and matching icon for a known code", () => {
    expect(getWeatherInfo(0, "es")).toEqual({ desc: "Cielo despejado", icon: "sun" });
  });

  it("returns the English description for the same code", () => {
    expect(getWeatherInfo(0, "en")).toEqual({ desc: "Clear sky", icon: "sun" });
  });

  it("maps thunderstorm codes to the storm icon", () => {
    expect(getWeatherInfo(95, "en").icon).toBe("storm");
    expect(getWeatherInfo(99, "en").icon).toBe("storm");
  });

  it("falls back to a generic condition for an unknown code", () => {
    expect(getWeatherInfo(9999, "en")).toEqual({ desc: "Unknown condition", icon: "cloud" });
  });
});