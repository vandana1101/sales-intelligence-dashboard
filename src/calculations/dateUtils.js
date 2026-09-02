export function parseDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  /*
   * Already a JavaScript Date.
   */
  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return value;
  }


  /*
   * Excel serial date.
   *
   * This is useful for XLS/XLSX files and also
   * protects against CSV files containing
   * numeric Excel serial dates.
   */
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {

    const excelEpoch =
      new Date(
        Date.UTC(
          1899,
          11,
          30
        )
      );


    const date =
      new Date(
        excelEpoch.getTime() +
          value *
            24 *
            60 *
            60 *
            1000
      );


    return isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  /*
   * Convert other values to strings.
   *
   * CSV values normally arrive here as strings.
   */
  const text =
    String(value)
      .trim()
      .replace(/^\uFEFF/, "");


  if (!text) {
    return null;
  }


  /*
   * Handle common DD-MMM-YY / DD-MMM-YYYY
   * formats explicitly before native parsing.
   *
   * Examples:
   * 01-Jan-25
   * 01-Jan-2025
   * 01/Jan/25
   */
  const monthNameMatch =
    text.match(
      /^(\d{1,2})[-\/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\/](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/i
    );


  if (monthNameMatch) {

    const day =
      Number(
        monthNameMatch[1]
      );


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
      monthMap[
        monthNameMatch[2]
          .toLowerCase()
      ];


    let year =
      Number(
        monthNameMatch[3]
      );


    if (year < 100) {

      year +=
        year >= 50
          ? 1900
          : 2000;

    }


    const time =
      monthNameMatch[4];


    let date;


    if (time) {

      const [
        hours,
        minutes,
        seconds = "0",
      ] =
        time.split(":");


      date =
        new Date(
          year,
          month,
          day,
          Number(hours),
          Number(minutes),
          Number(seconds)
        );

    } else {

      date =
        new Date(
          year,
          month,
          day
        );

    }


    /*
     * Make sure JavaScript did not silently
     * roll an invalid date into another month.
     */
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {

      return date;

    }


    return null;

  }


  /*
   * Handle DD/MM/YYYY and DD-MM-YYYY explicitly.
   *
   * This is particularly important for CSV files
   * because native JavaScript parsing can interpret
   * ambiguous dates differently across environments.
   */
  const numericDateMatch =
    text.match(
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );


  if (numericDateMatch) {

    const day =
      Number(
        numericDateMatch[1]
      );


    const month =
      Number(
        numericDateMatch[2]
      ) - 1;


    let year =
      Number(
        numericDateMatch[3]
      );


    if (year < 100) {

      year +=
        year >= 50
          ? 1900
          : 2000;

    }


    const hours =
      Number(
        numericDateMatch[4] || 0
      );


    const minutes =
      Number(
        numericDateMatch[5] || 0
      );


    const seconds =
      Number(
        numericDateMatch[6] || 0
      );


    const date =
      new Date(
        year,
        month,
        day,
        hours,
        minutes,
        seconds
      );


    /*
     * Prevent invalid dates such as 31/02/2025
     * from being automatically rolled forward.
     */
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {

      return date;

    }


    return null;

  }


  /*
   * Handle ISO-style dates and timestamps.
   *
   * Examples:
   * 2025-01-15
   * 2025-01-15 10:30:00
   * 2025-01-15T10:30:00
   */
  const isoDateMatch =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/
    );


  if (isoDateMatch) {

    const year =
      Number(
        isoDateMatch[1]
      );


    const month =
      Number(
        isoDateMatch[2]
      ) - 1;


    const day =
      Number(
        isoDateMatch[3]
      );


    const hours =
      Number(
        isoDateMatch[4] || 0
      );


    const minutes =
      Number(
        isoDateMatch[5] || 0
      );


    const seconds =
      Number(
        isoDateMatch[6] || 0
      );


    const date =
      new Date(
        year,
        month,
        day,
        hours,
        minutes,
        seconds
      );


    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {

      return date;

    }


    return null;

  }


  /*
   * Finally try native JavaScript parsing for
   * unambiguous formats such as:
   *
   * 15 Jan 2025
   * January 15, 2025
   * 2025/01/15
   * timestamps with timezone information
   */
  const date =
    new Date(text);


  if (
    !isNaN(
      date.getTime()
    )
  ) {

    return date;

  }


  return null;
}


/* =========================================================
   DATE DIFFERENCE
========================================================= */

export function daysBetween(
  startValue,
  endValue
) {

  const start =
    parseDate(
      startValue
    );


  const end =
    parseDate(
      endValue
    );


  if (
    !start ||
    !end
  ) {

    return null;

  }


  const milliseconds =
    end.getTime() -
    start.getTime();


  return Math.round(
    milliseconds /
      (1000 * 60 * 60 * 24)
  );

}


/* =========================================================
   MONTH FORMAT
========================================================= */

export function formatMonth(
  dateValue
) {

  const date =
    parseDate(
      dateValue
    );


  if (!date) {
    return null;
  }


  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );

}


/* =========================================================
   OPPORTUNITY WEEK
========================================================= */

export function formatOpportunityWeek(
  dateValue
) {

  const date =
    parseDate(
      dateValue
    );


  if (!date) {
    return null;
  }


  const month =
    date.toLocaleDateString(
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


/* =========================================================
   MAX DATE
========================================================= */

export function maxDate(
  values = []
) {

  const dates =
    values
      .map(parseDate)
      .filter(Boolean);


  if (
    !dates.length
  ) {

    return null;

  }


  return new Date(
    Math.max(
      ...dates.map(
        (date) =>
          date.getTime()
      )
    )
  );

}