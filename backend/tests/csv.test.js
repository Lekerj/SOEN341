const { attendeesToCsv } = require('../utils/csv');

describe('attendeesToCsv', () => {
    it('returns header row when no attendees provided', () => {
        const csv = attendeesToCsv([]);
        expect(csv).toBe('Name,Email,Ticket Type,QR Code,Checked In,Claim Date');
    });

    it('formats attendee rows with proper escaping and formatting', () => {
        const csv = attendeesToCsv([
            {
                name: 'John Doe',
                email: 'john@example.com',
                ticket_type: 'free',
                qr_code: 'QR123ABC',
                checked_in: true,
                claimed_at: new Date('2025-10-15T14:30:00Z')
            },
            {
                name: '"Jane, Smith"',
                email: 'jane@example.com',
                ticket_type: 'vip',
                qr_code: 'QR"456",ABC',
                checked_in: 0,
                claimed_at: null
            }
        ]);

        const rows = csv.split('\n');
        expect(rows[0]).toBe('Name,Email,Ticket Type,QR Code,Checked In,Claim Date');
        expect(rows[1]).toBe('John Doe,john@example.com,free,QR123ABC,true,2025-10-15 14:30:00');
        expect(rows[2]).toBe('"""Jane, Smith""",jane@example.com,vip,"QR""456"",ABC",false,');
    });
});
