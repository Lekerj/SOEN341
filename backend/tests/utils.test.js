// Unit tests for utility functions
const {
  sanitizeString,
  validatePrice,
  validateInteger,
  validateCategory,
  validateDateFormat,
  validateTimeFormat
} = require('../utils/validation');

describe('String Sanitization Tests', () => {
  test('sanitizeString removes HTML tags', () => {
    expect(sanitizeString('<b>hello</b>')).toBe('bhello/b');
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  test('sanitizeString trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\t\n  world  \n\t')).toBe('world');
  });

  test('sanitizeString handles empty and null values', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  test('sanitizeString preserves alphanumeric and basic punctuation', () => {
    expect(sanitizeString('Hello World 123!')).toBe('Hello World 123!');
    expect(sanitizeString('test@example.com')).toBe('test@example.com');
  });
});

describe('Price Validation Tests', () => {
  test('validatePrice accepts valid decimal numbers', () => {
    expect(validatePrice('0')).toBe(true);
    expect(validatePrice('25.99')).toBe(true);
    expect(validatePrice('1000.50')).toBe(true);
  });

  test('validatePrice rejects negative numbers', () => {
    expect(validatePrice('-0.01')).toBe(false);
    expect(validatePrice('-100')).toBe(false);
  });

  test('validatePrice rejects non-numeric strings', () => {
    expect(validatePrice('abc')).toBe(false);
    expect(validatePrice('$100')).toBe(false);
  });

  test('validatePrice allows empty or null values', () => {
    expect(validatePrice('')).toBe(true);
    expect(validatePrice(null)).toBe(true);
    expect(validatePrice(undefined)).toBe(true);
  });
});

describe('Integer Validation Tests', () => {
  test('validateInteger accepts non-negative integers', () => {
    expect(validateInteger('0')).toBe(true);
    expect(validateInteger('1')).toBe(true);
    expect(validateInteger('999')).toBe(true);
  });

  test('validateInteger rejects negative numbers', () => {
    expect(validateInteger('-1')).toBe(false);
    expect(validateInteger('-999')).toBe(false);
  });

  test('validateInteger rejects decimal numbers', () => {
    expect(validateInteger('5.5')).toBe(false);
    expect(validateInteger('1.0')).toBe(false);
  });

  test('validateInteger rejects non-numeric strings', () => {
    expect(validateInteger('abc')).toBe(false);
    expect(validateInteger('12x')).toBe(false);
  });

  test('validateInteger allows empty or null values', () => {
    expect(validateInteger('')).toBe(true);
    expect(validateInteger(null)).toBe(true);
    expect(validateInteger(undefined)).toBe(true);
  });
});

describe('Category Validation Tests', () => {
  test('validateCategory accepts valid categories', () => {
    expect(validateCategory('sports')).toBe(true);
    expect(validateCategory('academic')).toBe(true);
    expect(validateCategory('social')).toBe(true);
    expect(validateCategory('club')).toBe(true);
  });

  test('validateCategory rejects invalid categories', () => {
    expect(validateCategory('music')).toBe(false);
    expect(validateCategory('Sports')).toBe(false); // case sensitive
    expect(validateCategory('festival')).toBe(false);
    expect(validateCategory('other')).toBe(false);
  });

  test('validateCategory allows empty or null values', () => {
    expect(validateCategory('')).toBe(true);
    expect(validateCategory(null)).toBe(true);
    expect(validateCategory(undefined)).toBe(true);
  });
});

describe('Date Format Validation Tests', () => {
  test('validateDateFormat accepts valid YYYY-MM-DD dates', () => {
    expect(validateDateFormat('2025-10-30')).toBe(true);
    expect(validateDateFormat('2025-01-01')).toBe(true);
    expect(validateDateFormat('2025-12-31')).toBe(true);
  });

  test('validateDateFormat rejects invalid date formats', () => {
    expect(validateDateFormat('10-30-2025')).toBe(false);
    expect(validateDateFormat('2025/10/30')).toBe(false);
    expect(validateDateFormat('30-Oct-2025')).toBe(false);
    expect(validateDateFormat('20251030')).toBe(false);
  });

  test('validateDateFormat rejects invalid calendar dates', () => {
    expect(validateDateFormat('2025-02-29')).toBe(false); // 2025 is not a leap year
    expect(validateDateFormat('2025-13-01')).toBe(false); // month > 12
    expect(validateDateFormat('2025-04-31')).toBe(false); // day > 30 for April
  });

  test('validateDateFormat allows empty values', () => {
    expect(validateDateFormat('')).toBe(true);
    expect(validateDateFormat(null)).toBe(true);
    expect(validateDateFormat(undefined)).toBe(true);
  });

  test('validateDateFormat accepts leap year dates correctly', () => {
    expect(validateDateFormat('2024-02-29')).toBe(true); // 2024 is a leap year
    expect(validateDateFormat('2020-02-29')).toBe(true); // 2020 is a leap year
  });
});

describe('Time Format Validation Tests', () => {
  test('validateTimeFormat accepts valid 24-hour times', () => {
    expect(validateTimeFormat('00:00')).toBe(true);
    expect(validateTimeFormat('12:30')).toBe(true);
    expect(validateTimeFormat('23:59')).toBe(true);
  });

  test('validateTimeFormat rejects invalid hours', () => {
    expect(validateTimeFormat('24:00')).toBe(false);
    expect(validateTimeFormat('25:30')).toBe(false);
    expect(validateTimeFormat('-01:00')).toBe(false);
  });

  test('validateTimeFormat rejects invalid minutes', () => {
    expect(validateTimeFormat('12:60')).toBe(false);
    expect(validateTimeFormat('12:75')).toBe(false);
    expect(validateTimeFormat('12:-5')).toBe(false);
  });

  test('validateTimeFormat rejects invalid formats', () => {
    expect(validateTimeFormat('12-30')).toBe(false);
    expect(validateTimeFormat('1230')).toBe(false);
    expect(validateTimeFormat('12:30:00')).toBe(false);
  });

  test('validateTimeFormat allows empty values', () => {
    expect(validateTimeFormat('')).toBe(true);
    expect(validateTimeFormat(null)).toBe(true);
    expect(validateTimeFormat(undefined)).toBe(true);
  });
});
