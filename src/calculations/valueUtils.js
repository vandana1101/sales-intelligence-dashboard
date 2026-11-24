
const CRORE = 10000000;
const LAKH = 100000;

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}

export function parseValue(value, defaultMultiplier = 1) {
  if (!hasValue(value)) {
    return 0;
  }

  const text = String(value)
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\$/g, "")
    .replace(/,/g, "")
    .trim();

  const numeric = Number(
    text.replace(/[^0-9.-]/g, "")
  );

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  if (/crore|crores|\bcr\b/.test(text)) {
    return numeric * CRORE;
  }

  if (/lakh|lakhs|\bl\b/.test(text)) {
    return numeric * LAKH;
  }

  return numeric * defaultMultiplier;
}

function getFirstValue(row, names) {
  for (const name of names) {
    if (hasValue(row?.[name])) {
      return row[name];
    }
  }

  return null;
}

export function getOpportunityValue(row) {
  // Priority 1: Use an available value column expressed in Crores.
  const croreColumn = Object.keys(row || {}).find((key) =>
    /(?:value|values).*?(?:cr|crore)/i.test(key)
  );

  if (croreColumn && hasValue(row[croreColumn])) {
    const parsedCrores = parseValue(
      row[croreColumn],
      CRORE
    );

    if (parsedCrores > 0) {
      return parsedCrores;
    }
  }

  // Priority 2: Annual contract value in INR.
  const annual = getFirstValue(row, [
    "Value of Contract Per Annum INR",
    "Annual Value in INR",
    "Annual Value",
    "Annual Contract Value",
    "Contract Value",
    "Total Contract Value",
  ]);

  if (hasValue(annual)) {
    const parsedAnnual = parseValue(annual);

    if (parsedAnnual > 0) {
      return parsedAnnual;
    }
  }

  // Priority 3: Other recognised annual Crores fields.
  const annualCrores = getFirstValue(row, [
    "Annual Value in Crs",
    "Annual Value in Cr",
    "Value in Cr",
    "Value in Crs",
    "Contract Value in Cr",
    "Contract Value in Crs",
  ]);

  if (hasValue(annualCrores)) {
    const parsedCrores = parseValue(
      annualCrores,
      CRORE
    );

    if (parsedCrores > 0) {
      return parsedCrores;
    }
  }

  // Priority 4: Annualise monthly revenue.
  const monthly = getFirstValue(row, [
    "Revenue potential per month (in INR)",
    "Revenue Potential Per Month",
    "Monthly Revenue",
    "Monthly Contract Value",
  ]);

  if (hasValue(monthly)) {
    const parsedMonthly = parseValue(monthly);

    if (parsedMonthly > 0) {
      return parsedMonthly * 12;
    }
  }

  // Fallback: Quantity × Unit Price.
  const quantity = getFirstValue(row, [
    "Quantity",
    "Qty",
    "No. of Units",
    "Number of Units",
    "Units",
  ]);

  const unitPrice = getFirstValue(row, [
    "Unit Price",
    "Price per Unit",
    "Per Unit Price",
    "Rate",
    "Unit Rate",
  ]);

  if (hasValue(quantity) && hasValue(unitPrice)) {
    return (
      parseValue(quantity) *
      parseValue(unitPrice)
    );
  }

  return 0;
}

/**
 * Returns opportunity value in Crores.
 * getOpportunityValue() returns the value in INR.
 */
export function getOpportunityValueCrores(row) {
  return getOpportunityValue(row) / CRORE;
}