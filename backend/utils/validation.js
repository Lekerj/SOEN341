// Validation utilities for event search and filtering

const validateDateFormat = (dateString) => {
    if (!dateString) return true; // Allow empty dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    // Strict check: components must match a real calendar date
    const [y, m, d] = dateString.split('-').map((v) => parseInt(v, 10));
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
    );
};

const validateTimeFormat = (timeString) => {
    if (!timeString) return true; // Allow empty times
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
};

const validatePrice = (priceString) => {
    if (!priceString || priceString === '') return true; // Allow empty prices
    const price = parseFloat(priceString);
    return !isNaN(price) && price >= 0;
};

const validateInteger = (intString) => {
    if (!intString || intString === '') return true; // Allow empty integers
    const int = parseInt(intString);
    return !isNaN(int) && int >= 0 && int.toString() === intString;
};

const validateCategory = (category) => {
    const validCategories = ['sports', 'academic', 'social', 'club'];
    return !category || validCategories.includes(category);
};

const sanitizeString = (str) => {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

const validateSearchFilters = (query) => {
    const errors = [];
    
    // Validate dates
    if (query.date_start && !validateDateFormat(query.date_start)) {
        errors.push('Invalid date_start format. Use YYYY-MM-DD.');
    }
    
    if (query.date_end && !validateDateFormat(query.date_end)) {
        errors.push('Invalid date_end format. Use YYYY-MM-DD.');
    }
    
    // Validate date range logic
    if (query.date_start && query.date_end) {
        const startDate = new Date(query.date_start);
        const endDate = new Date(query.date_end);
        if (startDate > endDate) {
            errors.push('date_start cannot be after date_end.');
        }
    }
    
    // Validate times
    if (query.time_start && !validateTimeFormat(query.time_start)) {
        errors.push('Invalid time_start format. Use HH:MM (24-hour format).');
    }
    
    if (query.time_end && !validateTimeFormat(query.time_end)) {
        errors.push('Invalid time_end format. Use HH:MM (24-hour format).');
    }
    
    // Validate time range logic
    if (query.time_start && query.time_end && query.time_start >= query.time_end) {
        errors.push('time_start must be before time_end.');
    }
    
    // Validate prices
    if (query.price_min && !validatePrice(query.price_min)) {
        errors.push('Invalid price_min. Must be a non-negative number.');
    }
    
    if (query.price_max && !validatePrice(query.price_max)) {
        errors.push('Invalid price_max. Must be a non-negative number.');
    }
    
    // Validate price range logic
    if (query.price_min && query.price_max) {
        const minPrice = parseFloat(query.price_min);
        const maxPrice = parseFloat(query.price_max);
        if (minPrice > maxPrice) {
            errors.push('price_min cannot be greater than price_max.');
        }
    }
    
    // Validate integers
    if (query.min_tickets_needed && !validateInteger(query.min_tickets_needed)) {
        errors.push('Invalid min_tickets_needed. Must be a positive integer.');
    }
    
    if (query.min_capacity && !validateInteger(query.min_capacity)) {
        errors.push('Invalid min_capacity. Must be a positive integer.');
    }
    
    // Validate category
    if (query.category && !validateCategory(query.category)) {
        errors.push('Invalid category. Must be one of: sports, academic, social, club.');
    }
    
    return errors;
};

const sanitizeSearchFilters = (query) => {
    const sanitized = { ...query };
    
    // Sanitize string inputs
    if (sanitized.search) sanitized.search = sanitizeString(sanitized.search);
    if (sanitized.organization) sanitized.organization = sanitizeString(sanitized.organization);
    if (sanitized.location) sanitized.location = sanitizeString(sanitized.location);
    
    return sanitized;
};

module.exports = {
    validateDateFormat,
    validateTimeFormat,
    validatePrice,
    validateInteger,
    validateCategory,
    sanitizeString,
    validateSearchFilters,
    sanitizeSearchFilters
};