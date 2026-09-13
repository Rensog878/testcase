// Product dosage text -> an amount for the farmer's own acreage.
//
// Dosage is free text typed by admins ("120g - 150g per Acre", "2 ml per
// litre of water"). Only a plain amount or range of grams/millilitres per acre
// or hectare is scaled; anything else returns null and is shown as written.

const UNITS = {
  g: ['g', 1], gm: ['g', 1], gms: ['g', 1], gram: ['g', 1], grams: ['g', 1],
  kg: ['g', 1000], kgs: ['g', 1000], kilogram: ['g', 1000], kilograms: ['g', 1000],
  ml: ['ml', 1],
  l: ['ml', 1000], lt: ['ml', 1000], ltr: ['ml', 1000], litre: ['ml', 1000], litres: ['ml', 1000], liter: ['ml', 1000], liters: ['ml', 1000],
};

const ACRES_PER_AREA = { acre: 1, acres: 1, ac: 1, hectare: 2.47105, hectares: 2.47105, ha: 2.47105 };

const DOSAGE_PATTERN =
  /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(?:(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*([a-z]+)?)?\s*(?:\/|per)\s*(acre|acres|ac|hectare|hectares|ha)\s*\.?\s*$/i;

/** { min, max, unit: 'g' | 'ml' } per acre, or null when the text is not a plain per-area rate. */
export function parseDosage(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(DOSAGE_PATTERN);
  if (!match) return null;

  const [, first, rawFirstUnit, second, rawSecondUnit, area] = match;
  const firstUnit = rawFirstUnit?.toLowerCase();
  const secondUnit = rawSecondUnit?.toLowerCase();
  const unitName = secondUnit || firstUnit;
  if (!unitName || !UNITS[unitName]) return null;
  if (firstUnit && !UNITS[firstUnit]) return null;
  if (second === undefined && secondUnit) return null;

  const [base, secondFactor] = UNITS[unitName];
  const firstFactor = firstUnit ? UNITS[firstUnit][1] : secondFactor;
  if (firstUnit && UNITS[firstUnit][0] !== base) return null;

  const perArea = ACRES_PER_AREA[area.toLowerCase()];
  const min = (Number(first) * firstFactor) / perArea;
  const max = second === undefined ? min : (Number(second) * secondFactor) / perArea;
  if (!(min > 0) || max < min) return null;

  return { min, max, unit: base };
}

/** An amount in a readable unit: grams become kilograms and millilitres litres from 1000. */
export function readableAmount(value, baseUnit) {
  if (value >= 1000) {
    return { value: Math.round((value / 1000) * 100) / 100, unit: baseUnit === 'g' ? 'kg' : 'L' };
  }
  return { value: Math.round(value), unit: baseUnit };
}

/**
 * Total dose for the farmer's acreage, or null when the text does not parse
 * or the acreage is unknown.
 * { perAcre: { min, max, unit }, total: { min: {value, unit}, max: {value, unit} }, acres }
 */
export function dosageForFarm(text, acres) {
  const perAcre = parseDosage(text);
  if (!perAcre || !(typeof acres === 'number' && acres > 0)) return null;
  return {
    perAcre,
    acres,
    total: {
      min: readableAmount(perAcre.min * acres, perAcre.unit),
      max: readableAmount(perAcre.max * acres, perAcre.unit),
    },
  };
}
