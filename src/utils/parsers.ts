/**
 * Brazilian data parsers for financial transaction imports
 * Handles Brazilian-specific number, date, and CSV delimiter formats
 * commonly found in bank exports and financial systems.
 */

/**
 * Parse Brazilian amount formats into numbers
 * Supports formats like "1.250,50", "1250,50", "-R$ 150,00", etc.
 *
 * @param input - The amount string to parse
 * @returns Parsed number or null if invalid
 *
 * @example
 * ```typescript
 * parseAmount("1.250,50") // returns 1250.50
 * parseAmount("-R$ 150,00") // returns -150.00
 * parseAmount("invalid") // returns null
 * ```
 */
export const parseAmount = (input: string): number | null => {
  if (typeof input !== 'string' || input.trim() === '') {
    console.warn('parseAmount: Invalid input - empty or non-string value');
    return null;
  }

  try {
    // Remove whitespace and common currency symbols/abbreviations
    const cleanInput = input
      .trim()
      .replace(/\s+/g, '') // Remove all whitespace
      .toUpperCase();

    // Extract the numeric part, handling currency symbols
    let numericPart = cleanInput;

    // Handle parenthesis for negative numbers (common in banking)
    const isNegative = numericPart.startsWith('(') && numericPart.endsWith(')');
    if (isNegative) {
      numericPart = numericPart.slice(1, -1);
    }

    // Remove leading negative sign
    const hasNegativeSign = numericPart.startsWith('-');
    if (hasNegativeSign) {
      numericPart = numericPart.slice(1);
    }

    // Remove currency symbols and prefixes
    numericPart = numericPart.replace(/^R\$/g, ''); // Remove R$
    numericPart = numericPart.replace(/^R\s/g, ''); // Remove standalone R
    numericPart = numericPart.replace(/^US\$/g, ''); // Remove US$
    numericPart = numericPart.replace(/^EUR/g, ''); // Remove EUR
    numericPart = numericPart.replace(/^USD/g, ''); // Remove USD

    // Brazilian format: use dot as thousands separator, comma as decimal separator
    // Example: "1.250,50" -> 1250.50
    if (numericPart.includes(',') && (numericPart.includes('.') || numericPart.match(/\d{3}\./))) {
      // Multiple dots likely indicate thousands separators
      const withoutThousandsDots = numericPart.replace(/\./g, '');
      const withDecimalDot = withoutThousandsDots.replace(',', '.');
      numericPart = withDecimalDot;
    } else if (numericPart.includes(',') && !numericPart.includes('.')) {
      // Single comma is likely decimal separator
      numericPart = numericPart.replace(',', '.');
    }
    // If it contains only dots and no commas, treat as standard decimal format
    // (some systems might use dots as decimal separators)

    // Validate that we have a clean number
    if (!/^-?\d*\.?\d+$/.test(numericPart)) {
      console.warn('parseAmount: Invalid numeric format after cleaning', { original: input, cleaned: numericPart });
      return null;
    }

    const result = parseFloat(numericPart);

    // Apply negative sign
    const finalResult = (isNegative || hasNegativeSign) ? -result : result;

    // Validate the result is a finite number
    if (!isFinite(finalResult)) {
      console.warn('parseAmount: Result is not finite', { original: input, result: finalResult });
      return null;
    }

    return finalResult;
  } catch (error) {
    console.error('parseAmount: Unexpected error', { input, error });
    return null;
  }
};

/**
 * Parse Brazilian date formats into ISO date strings
 * Supports DD/MM/YYYY, DD/MM/YY, and YYYY-MM-DD formats
 *
 * @param input - The date string to parse
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 *
 * @example
 * ```typescript
 * parseDate("15/01/2024") // returns "2024-01-15"
 * parseDate("15/01/24") // returns "2024-01-15"
 * parseDate("2024-01-15") // returns "2024-01-15"
 * parseDate("invalid") // returns null
 * ```
 */
export const parseDate = (input: string): string | null => {
  if (typeof input !== 'string' || input.trim() === '') {
    console.warn('parseDate: Invalid input - empty or non-string value');
    return null;
  }

  try {
    const cleanInput = input.trim();

    // DD/MM/YYYY format (most common in Brazil)
    const ddmmyyyy = cleanInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isValidDate(date) && date.getDate() === parseInt(day) && date.getMonth() === parseInt(month) - 1 && date.getFullYear() === parseInt(year)) {
        return formatDateISO(date);
      }
    }

    // DD/MM/YY format
    const ddmmyy = cleanInput.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (ddmmyy) {
      const [, day, month, shortYear] = ddmmyy;
      const year = parseInt(shortYear);
      // Convert 2-digit year to 4-digit year (assuming 2000-2099 for 00-99)
      const fullYear = year < 100 ? 2000 + year : year;
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

      if (isValidDate(date) && date.getDate() === parseInt(day) && date.getMonth() === parseInt(month) - 1) {
        return formatDateISO(date);
      }
    }

    // D-M-YYYY format (sometimes found in exports)
    const dmyyyy = cleanInput.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyyyy) {
      const [, day, month, year] = dmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isValidDate(date) && date.getDate() === parseInt(day) && date.getMonth() === parseInt(month) - 1 && date.getFullYear() === parseInt(year)) {
        return formatDateISO(date);
      }
    }

    // D/M/YYYY format (single-digit days and months)
    const dmyyyySlash = cleanInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyyyySlash) {
      const [, day, month, year] = dmyyyySlash;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isValidDate(date) && date.getDate() === parseInt(day) && date.getMonth() === parseInt(month) - 1 && date.getFullYear() === parseInt(year)) {
        return formatDateISO(date);
      }
    }

    // YYYY-MM-DD format (ISO standard)
    const yyyymmdd = cleanInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isValidDate(date) && date.getDate() === parseInt(day) && date.getMonth() === parseInt(month) - 1 && date.getFullYear() === parseInt(year)) {
        return formatDateISO(date);
      }
    }

    // Try direct parsing as fallback
    const fallbackDate = new Date(cleanInput);
    if (isValidDate(fallbackDate) && fallbackDate.getFullYear() >= 1900 && fallbackDate.getFullYear() <= 2100) {
      return formatDateISO(fallbackDate);
    }

    console.warn('parseDate: Unrecognized date format', { input: cleanInput });
    return null;
  } catch (error) {
    console.error('parseDate: Unexpected error', { input, error });
    return null;
  }
};

/**
 * Detect CSV delimiter by analyzing the first few lines
 * Supports comma, semicolon, and tab delimiters commonly found in Brazilian exports
 *
 * @param csvContent - The CSV content as string
 * @param linesToCheck - Number of lines to analyze (default: 5)
 * @returns Detected delimiter character or ',' as default
 *
 * @example
 * ```typescript
 * detectDelimiter("Data;Valor;Descrição\n15/01/2024;100,50;Teste") // returns ';'
 * detectDelimiter("Data,Valor,Descrição\n15/01/2024,100.50,Test") // returns ','
 * ```
 */
export const detectDelimiter = (csvContent: string, linesToCheck: number = 5): string => {
  if (typeof csvContent !== 'string' || csvContent.trim() === '') {
    console.warn('detectDelimiter: Invalid input - empty or non-string content');
    return ','; // Default to comma
  }

  try {
    const lines = csvContent.split('\n').slice(0, linesToCheck).filter(line => line.trim() !== '');

    if (lines.length === 0) {
      console.warn('detectDelimiter: No valid lines found in content');
      return ',';
    }

    const delimiters = [',', ';', '\t'];
    const delimiterScores: Record<string, number> = {
      ',': 0,
      ';': 0,
      '\t': 0
    };

    lines.forEach(line => {
      delimiters.forEach(delimiter => {
        const count = (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
        delimiterScores[delimiter] += count;
      });
    });

    // Find the delimiter with the highest average score
    let bestDelimiter = ',';
    let bestScore = 0;

    for (const [delimiter, score] of Object.entries(delimiterScores)) {
      const averageScore = score / lines.length;
      if (averageScore > bestScore) {
        bestScore = averageScore;
        bestDelimiter = delimiter;
      }
    }

    // If the best delimiter appears less than once per line on average,
    // fall back to comma (might be a single-column CSV)
    if (bestScore < 1) {
      console.info('detectDelimiter: Low delimiter confidence, defaulting to comma', {
        scores: delimiterScores,
        bestScore,
        bestDelimiter
      });
      return ',';
    }

    console.info('detectDelimiter: Detected delimiter', {
      delimiter: bestDelimiter,
      scores: delimiterScores,
      confidence: bestScore
    });

    return bestDelimiter;
  } catch (error) {
    console.error('detectDelimiter: Unexpected error', { error });
    return ','; // Default to comma on error
  }
};

/**
 * Parse a CSV line using a specific delimiter
 * Handles quoted fields and escaped quotes
 *
 * @param line - The CSV line to parse
 * @param delimiter - The delimiter character
 * @returns Array of field values or null if parsing fails
 */
export const parseCSVLine = (line: string, delimiter: string): string[] | null => {
  if (typeof line !== 'string') {
    console.warn('parseCSVLine: Invalid input - non-string line');
    return null;
  }

  // Allow empty lines but return an array with one empty field
  if (line.trim() === '') {
    return [''];
  }

  try {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quotes
          current += '"';
          i += 2;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator outside quotes
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    fields.push(current.trim());

    return fields;
  } catch (error) {
    console.error('parseCSVLine: Unexpected error', { line, delimiter, error });
    return null;
  }
};

// Helper functions

/**
 * Check if a Date object is valid
 */
const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Format a Date object as ISO string (YYYY-MM-DD)
 */
const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Test suite for Brazilian parsers
 * Run this function to verify all parsing functions work correctly
 */
export const runParserTests = (): void => {
  console.group('🧪 Brazilian Parser Tests');

  // Test parseAmount
  console.group('💰 parseAmount Tests');
  const amountTests = [
    ['1.250,50', 1250.50],
    ['1250,50', 1250.50],
    ['-R$ 150,00', -150.00],
    ['R$ 1.000,00', 1000.00],
    ['(R$ 200,50)', -200.50],
    ['100.50', 100.50], // Standard format
    ['-50,25', -50.25],
    ['R$ 0,00', 0.00],
    ['invalid', null],
    ['', null],
    ['R$', null],
    ['ABC', null]
  ];

  let amountTestsPassed = 0;
  amountTests.forEach(([input, expected]) => {
    const result = parseAmount(input as string);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} parseAmount("${input}") = ${result} (expected: ${expected})`);
    if (passed) amountTestsPassed++;
  });
  console.log(`Amount tests: ${amountTestsPassed}/${amountTests.length} passed`);
  console.groupEnd();

  // Test parseDate
  console.group('📅 parseDate Tests');
  const dateTests = [
    ['15/01/2024', '2024-01-15'],
    ['31/12/2023', '2023-12-31'],
    ['01/01/24', '2024-01-01'],
    ['31/12/99', '2099-12-31'],
    ['2024-01-15', '2024-01-15'],
    ['15-01-2024', '2024-01-15'],
    ['5/1/2024', '2024-01-05'],
    ['invalid', null],
    ['', null],
    ['32/01/2024', null], // Invalid date
    ['15/13/2024', null]  // Invalid month
  ];

  let dateTestsPassed = 0;
  dateTests.forEach(([input, expected]) => {
    const result = parseDate(input as string);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} parseDate("${input}") = ${result} (expected: ${expected})`);
    if (passed) dateTestsPassed++;
  });
  console.log(`Date tests: ${dateTestsPassed}/${dateTests.length} passed`);
  console.groupEnd();

  // Test detectDelimiter
  console.group('🔍 detectDelimiter Tests');
  const delimiterTests = [
    ['Data;Valor;Descrição\n15/01/2024;100,50;Teste', ';'],
    ['Data,Valor,Descrição\n15/01/2024,100.50,Test', ','],
    ['Data\tValor\tDescrição\n15/01/2024\t100,50\tTeste', '\t'],
    ['Data,Valor,Descrição\n15/01/2024,100.50,Test\n02/02/2024,200.75,Another', ','],
    ['SingleColumn\nValue1\nValue2', ','], // Should default to comma
    ['', ','], // Should default to comma
    ['invalid', ','] // Should default to comma
  ];

  let delimiterTestsPassed = 0;
  delimiterTests.forEach(([input, expected]) => {
    const result = detectDelimiter(input as string);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} detectDelimiter(...${(input as string).substring(0, 20)}...) = "${result}" (expected: "${expected}")`);
    if (passed) delimiterTestsPassed++;
  });
  console.log(`Delimiter tests: ${delimiterTestsPassed}/${delimiterTests.length} passed`);
  console.groupEnd();

  // Test parseCSVLine
  console.group('📄 parseCSVLine Tests');
  const csvLineTests = [
    ['field1,field2,field3', ',', ['field1', 'field2', 'field3']],
    ['"field with quotes","field, with comma","normal"', ',', ['field with quotes', 'field, with comma', 'normal']],
    ['"escaped ""quotes""","normal field"', ',', ['escaped "quotes"', 'normal field']],
    ['', ',', ['']],
    ['singlefield', ',', ['singlefield']]
  ];

  let csvLineTestsPassed = 0;
  csvLineTests.forEach(([input, delimiter, expected]) => {
    const result = parseCSVLine(input as string, delimiter as string);
    const passed = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`${passed ? '✅' : '❌'} parseCSVLine("${input}", "${delimiter}") = ${JSON.stringify(result)} (expected: ${JSON.stringify(expected)})`);
    if (passed) csvLineTestsPassed++;
  });
  console.log(`CSV line tests: ${csvLineTestsPassed}/${csvLineTests.length} passed`);
  console.groupEnd();

  const totalTests = amountTests.length + dateTests.length + delimiterTests.length + csvLineTests.length;
  const totalPassed = amountTestsPassed + dateTestsPassed + delimiterTestsPassed + csvLineTestsPassed;

  console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed/totalTests) * 100)}%)`);
  console.groupEnd();
};

// Export types for better TypeScript support
export type ParsedAmount = number | null;
export type ParsedDate = string | null;
export type Delimiter = ',' | ';' | '\t';
export type CSVField = string | null;