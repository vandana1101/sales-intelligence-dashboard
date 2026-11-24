const CRORE = 10000000;
const LAKH = 100000;

function hasValue(value) {
  return value !== null &&
    value !== undefined &&
    String(value).trim() !== "";
}

export function parseValue(value, defaultMultiplier = 1) {
  if (!hasValue(value)) return 0;

  const text = String(value)
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\$/g, "")
    .replace(/,/g, "")
    .trim();

  const numeric = Number(
    text.replace(/[^0-9.-]/g, "")
  );

  if (!Number.isFinite(numeric)) return 0;

  if (/crore|crores|\bcr\b/.test(text)) {
    return numeric * CRORE;
  }

  if (/lakh|lakhs|\bl\b/.test(text)) {
    return numeric * LAKH;
  }

  return numeric * defaultMultiplier;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_\-\u2013\u2014]+/g, " ")
    .replace(/\s+/g, " ");
}

function getFirstValue(row, names) {
  if (!row || typeof row !== "object") return null;

  const keys = Object.keys(row);

  const normalized = new Map(
    keys.map(key => [normalizeHeader(key), key])
  );

  for (const name of names) {
    const actualKey = normalized.get(
      normalizeHeader(name)
    );

    if (
      actualKey !== undefined &&
      hasValue(row[actualKey])
    ) {
      return row[actualKey];
    }
  }

  return null;
}

/**
 * Returns opportunity value in INR.
 *
 * Priority:
 * 1. Existing Crores value.
 * 2. Annual INR value.
 * 3. Monthly revenue × 12.
 */
export function getOpportunityValue(row) {

  // FIRST PRIORITY: CRORES VALUE
  const crores = getFirstValue(row, [
    "Values in Cr",
    "Values_in_Cr",
    "ValuesInCr",
    "Value in Cr",
    "Value in Crs",
    "Values in Crores",
    "Annual Value in Cr",
    "Annual Value in Crs",
    "Annual Value in Crores",
    "Contract Value in Cr",
    "Contract Value in Crs",
    "Contract Value in Crores",
    "Annual Contract Value in Cr",
    "Annual Contract Value in Crs",
    "Annual Contract Value in Crores"
  ]);

  if (hasValue(crores)) {
    const parsed = parseValue(crores, CRORE);

    if (parsed > 0) return parsed;
  }

  // SECOND PRIORITY: ANNUAL INR
  const annual = getFirstValue(row, [
    "Value of Contract Per Annum INR",
    "Annual Value in INR",
    "Annual Contract Value INR",
    "Annual Value",
    "Annual Contract Value",
    "Contract Value",
    "Total Contract Value"
  ]);

  if (hasValue(annual)) {
    const parsed = parseValue(annual);

    if (parsed > 0) return parsed;
  }

  // THIRD PRIORITY: MONTHLY REVENUE × 12
  const monthly = getFirstValue(row, [
    "Revenue potential per month (in INR)",
    "Revenue Potential Per Month",
    "Monthly Revenue",
    "Monthly Contract Value"
  ]);

  if (hasValue(monthly)) {
    const parsed = parseValue(monthly);

    if (parsed > 0) return parsed * 12;
  }

  return 0;
}

export { CRORE };
