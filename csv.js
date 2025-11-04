const HEADER_ROW = ['Name', 'Email', 'Ticket Type', 'QR Code', 'Checked In', 'Claim Date'];

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

const formatDateTime = (value) => {
    if (!value) {
        return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return `${date.toISOString().slice(0, 19).replace('T', ' ')}`;
};

const attendeeToRow = (attendee) => ([
    attendee?.name || '',
    attendee?.email || '',
    attendee?.ticket_type || '',
    attendee?.qr_code || '',
    attendee?.checked_in ? 'true' : 'false',
    formatDateTime(attendee?.claimed_at)
]);

const attendeesToCsv = (attendees) => {
    const rows = [HEADER_ROW, ...(attendees || []).map(attendeeToRow)];
    return rows
        .map((row) => row.map(escapeCsvValue).join(','))
        .join('\n');
};

module.exports = {
    attendeesToCsv,
    escapeCsvValue
};
