export function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  if (typeof value === "number") {
    // Excel serial date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const date = new Date(
      excelEpoch.getTime() +
        value * 24 * 60 * 60 * 1000
    );

    return isNaN(date) ? null : date;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) return null;

  // Try native parsing first
  let date = new Date(text);

  if (!isNaN(date)) {
    return date;
  }

  // Handle DD-MMM-YY / DD-MMM-YYYY
  const match = text.match(
    /^(\d{1,2})[-\/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\/](\d{2,4})$/i
  );

  if (match) {
    const day = Number(match[1]);

    const monthMap = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month =
      monthMap[match[2].toLowerCase()];

    let year = Number(match[3]);

    if (year < 100) {
      year += year >= 50 ? 1900 : 2000;
    }

    date = new Date(
      year,
      month,
      day
    );

    return isNaN(date) ? null : date;
  }

  return null;
}


export function daysBetween(
  startValue,
  endValue
) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);

  if (!start || !end) {
    return null;
  }

  const milliseconds =
    end.getTime() - start.getTime();

  return Math.round(
    milliseconds / (1000 * 60 * 60 * 24)
  );
}


export function formatMonth(dateValue) {
  const date = parseDate(dateValue);

  if (!date) return null;

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );
}


export function formatOpportunityWeek(
  dateValue
) {
  const date = parseDate(dateValue);

  if (!date) return null;

  const month = date.toLocaleDateString(
    "en-US",
    {
      month: "long",
    }
  );

  const week =
    Math.floor(
      (date.getDate() - 1) / 7
    ) + 1;

  return `${month} Week ${week}`;
}


export function maxDate(values) {
  const dates = values
    .map(parseDate)
    .filter(Boolean);

  if (!dates.length) {
    return null;
  }

  return new Date(
    Math.max(
      ...dates.map((date) =>
        date.getTime()
      )
    )
  );
}