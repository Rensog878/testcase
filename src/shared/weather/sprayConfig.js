// Every threshold behind the "safe to spray" advice.
//
// Values follow common label guidance for foliar pesticide sprays: the spray
// needs a few dry hours to stick, drift rises with wind and in dead-still air,
// and heat or very dry air evaporates droplets. Agronomists should confirm
// them; changing a number here changes the advice everywhere.

export const SPRAY_CONFIG = {
  // A typical spraying round on a small farm.
  sprayHours: 2,
  // Hours without rain the spray needs after it starts (rainfast period).
  rainFreeHours: 6,

  rain: {
    avoidProbabilityPct: 60,
    cautionProbabilityPct: 30,
    // Total expected over the rain-free hours, used when the forecast has no probability.
    avoidTotalMm: 1,
    cautionTotalMm: 0.2,
  },

  wind: {
    avoidKph: 15,
    cautionKph: 10,
    // Below this the air is so still that fine droplets hang and drift.
    calmKph: 2,
    avoidGustKph: 25,
  },

  heat: {
    avoidC: 35,
    cautionC: 32,
  },

  humidity: {
    cautionBelowPct: 30,
  },

  // Local hours (India Standard Time) when spraying is practical.
  daylight: { startHour: 6, endHour: 18 },
  timeZoneOffsetMinutes: 330,

  // How far ahead to look for the next good spraying window.
  searchHours: 48,
};
