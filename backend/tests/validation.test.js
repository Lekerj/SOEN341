const {
  validateDateFormat,
  validateTimeFormat,
  validatePrice,
  validateInteger,
  validateCategory,
  sanitizeString,
  validateSearchFilters,
  sanitizeSearchFilters,
} = require('../utils/validation');

describe('validation utils - basic format validators', () => {
  test('validateDateFormat accepts YYYY-MM-DD and rejects invalid', () => {
    expect(validateDateFormat('2025-10-13')).toBe(true);
    expect(validateDateFormat('2025-02-29')).toBe(false); // 2025 not leap year
    expect(validateDateFormat('13-10-2025')).toBe(false);
    expect(validateDateFormat('2025/10/13')).toBe(false);
    expect(validateDateFormat('')).toBe(true); // empty allowed
  });

  test('validateTimeFormat accepts 24h HH:MM and rejects invalid', () => {
    expect(validateTimeFormat('00:00')).toBe(true);
    expect(validateTimeFormat('23:59')).toBe(true);
    expect(validateTimeFormat('24:00')).toBe(false);
    expect(validateTimeFormat('12:60')).toBe(false);
    expect(validateTimeFormat('')).toBe(true); // empty allowed
  });

  test('validatePrice non-negative numbers', () => {
    expect(validatePrice('0')).toBe(true);
    expect(validatePrice('12.50')).toBe(true);
    expect(validatePrice('-1')).toBe(false);
    expect(validatePrice('abc')).toBe(false);
    expect(validatePrice('')).toBe(true);
  });

  test('validateInteger positive integers', () => {
    expect(validateInteger('0')).toBe(true);
    expect(validateInteger('10')).toBe(true);
    expect(validateInteger('-1')).toBe(false);
    expect(validateInteger('5.5')).toBe(false);
    expect(validateInteger('abc')).toBe(false);
    expect(validateInteger('')).toBe(true);
  });

  test('validateCategory accepts whitelisted or empty', () => {
    expect(validateCategory('sports')).toBe(true);
    expect(validateCategory('academic')).toBe(true);
    expect(validateCategory('social')).toBe(true);
    expect(validateCategory('club')).toBe(true);
    expect(validateCategory('music')).toBe(false);
    expect(validateCategory('')).toBe(true);
    expect(validateCategory(undefined)).toBe(true);
  });

  test('sanitizeString removes angle brackets', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
});

describe('validateSearchFilters edge cases', () => {
  test('empty query passes', () => {
    expect(validateSearchFilters({})).toEqual([]);
  });

  test('invalid date format flagged', () => {
    const errors = validateSearchFilters({ date_start: '2025/10/13' });
    expect(errors).toContain('Invalid date_start format. Use YYYY-MM-DD.');
  });

  test('date_start after date_end flagged', () => {
    const errors = validateSearchFilters({ date_start: '2025-10-14', date_end: '2025-10-13' });
    expect(errors).toContain('date_start cannot be after date_end.');
  });

  test('invalid time format flagged', () => {
    const errors = validateSearchFilters({ time_start: '25:61' });
    expect(errors).toContain('Invalid time_start format. Use HH:MM (24-hour format).');
  });

  test('time range logic flagged', () => {
    const errors = validateSearchFilters({ time_start: '12:00', time_end: '11:00' });
    expect(errors).toContain('time_start must be before time_end.');
  });

  test('price negative and inverted range flagged', () => {
    const e1 = validateSearchFilters({ price_min: '-1' });
    expect(e1).toContain('Invalid price_min. Must be a non-negative number.');
    const e2 = validateSearchFilters({ price_min: '20', price_max: '10' });
    expect(e2).toContain('price_min cannot be greater than price_max.');
  });

  test('invalid integers flagged', () => {
    const e1 = validateSearchFilters({ min_tickets_needed: '5.5' });
    expect(e1).toContain('Invalid min_tickets_needed. Must be a positive integer.');
    const e2 = validateSearchFilters({ min_capacity: 'abc' });
    expect(e2).toContain('Invalid min_capacity. Must be a positive integer.');
  });

  test('invalid category flagged', () => {
    const errors = validateSearchFilters({ category: 'music' });
    expect(errors).toContain('Invalid category. Must be one of: sports, academic, social, club.');
  });

  test('sanitizeSearchFilters trims and strips unsafe chars', () => {
    const sanitized = sanitizeSearchFilters({ search: '  <hack>  ', organization: '  Org  ', location: '<loc>' });
    expect(sanitized.search).toBe('hack');
    expect(sanitized.organization).toBe('Org');
    expect(sanitized.location).toBe('loc');
  });
});
