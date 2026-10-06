/**
 * IST (Indian Standard Time) Utility Functions
 * =============================================
 * IST = UTC + 5:30 (offset = 330 minutes)
 *
 * Problem: JavaScript's `new Date().toISOString()` always returns UTC time.
 * In India when it's 11:30 PM IST, UTC is 6:00 PM — the DATE is different!
 * This causes wrong date defaults in forms and filters.
 *
 * Solution: Always correct for the IST offset before calling .toISOString().
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Returns today's date string in IST as "YYYY-MM-DD".
 * Use this everywhere instead of: new Date().toISOString().split('T')[0]
 */
export const todayIST = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
};

/**
 * Returns the first day of the current month in IST as "YYYY-MM-DD".
 * Use this instead of: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
 */
export const firstDayOfMonthIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date(d.getTime() + IST_OFFSET_MS);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
};

/**
 * Converts a Date object to IST date string "YYYY-MM-DD".
 * Use this instead of: someDate.toISOString().split('T')[0]
 */
export const toISTDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
};

/**
 * Converts a timestamp/Date to IST datetime string "YYYY-MM-DDTHH:MM".
 * Use this for datetime-local inputs.
 */
export const toISTDateTimeString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
};

/**
 * Formats a date/timestamp to IST time string like "10:30 AM".
 * Use this instead of: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
 */
export const formatTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--:--';
    const d = new Date(dateOrStr);
    return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Formats a date/timestamp to IST date string like "11/03/26".
 */
export const formatDateIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Formats a date/timestamp to IST date + time string like "11/03/26, 10:30 AM".
 */
export const formatDateTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Returns the current IST time as "HH:MM" string (24-hour format).
 * Useful for default time values in forms.
 */
export const currentTimeIST = () => {
    return new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Returns full current IST datetime as "YYYY-MM-DDTHH:MM" string.
 * Use for datetime-local input defaults.
 */
export const nowISTDateTimeString = () => {
    return toISTDateTimeString(new Date());
};

/**
 * Returns a New Date object that is normalized to IST.
 * When you use .getUTC* methods on this date, you get IST values.
 */
export const nowIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS);
};

/**
 * Calculates Indian Financial Year string (e.g. 'FY 26-27', 'FY 27-28') for any date.
 * Financial Year in India runs from 1 April of year Y to 31 March of year Y+1.
 */
export const getFinancialYear = (dateOrStr) => {
    if (!dateOrStr) return null;
    const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
    if (isNaN(d.getTime())) return null;

    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    const month = ist.getUTCMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
    const year = ist.getUTCFullYear();

    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    return `FY ${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

/**
 * Returns a dynamically computed list of Financial Years.
 * Automatically includes past 2 years, current FY, and next 2 future FYs (e.g., FY 27-28, FY 28-29),
 * PLUS any extra years found in booking/lead dates!
 * Example return: ['FY 28-29', 'FY 27-28', 'FY 26-27', 'FY 25-26', 'FY 24-25']
 */
export const getAvailableFinancialYears = (items = []) => {
    const today = new Date();
    const todayIst = new Date(today.getTime() + IST_OFFSET_MS);
    const curYear = todayIst.getUTCFullYear();

    const fySet = new Set();

    // Base list: 2 past FYs, current FY, and 2 future FYs
    for (let offset = -2; offset <= 2; offset++) {
        const y = curYear + offset;
        const fy = getFinancialYear(new Date(Date.UTC(y, 6, 1)));
        if (fy) fySet.add(fy);
    }

    // Dynamic scan: any booking / lead date beyond the base list
    if (Array.isArray(items)) {
        items.forEach(item => {
            const d = item?.travelStartDate || item?.travelEndDate || item?.createdAt || item?.date || item?.leadDate;
            if (d) {
                const fy = getFinancialYear(d);
                if (fy) fySet.add(fy);
            }
        });
    }

    // Sort descending by starting year: highest future FY first down to oldest
    return Array.from(fySet).sort((a, b) => {
        const yearA = parseInt(a.replace('FY ', '').split('-')[0], 10) || 0;
        const yearB = parseInt(b.replace('FY ', '').split('-')[0], 10) || 0;
        return yearB - yearA;
    });
};

/**
 * Returns month options (April to March) for a given Financial Year string (e.g. 'FY 26-27' -> 2026-2027).
 */
export const getSidebarMonthOptions = (fyString) => {
    let startYear = 2026;
    if (fyString && fyString.startsWith('FY ')) {
        const parts = fyString.replace('FY ', '').split('-');
        if (parts.length === 2) {
            const yy = parseInt(parts[0], 10);
            if (!isNaN(yy)) {
                startYear = 2000 + yy;
            }
        }
    }
    const endYear = startYear + 1;
    return [
        { label: `April ${startYear}`, tab: 'Apr', monthIdx: 3, year: startYear, days: 30 },
        { label: `May ${startYear}`, tab: 'May', monthIdx: 4, year: startYear, days: 31 },
        { label: `June ${startYear}`, tab: 'Jun', monthIdx: 5, year: startYear, days: 30 },
        { label: `July ${startYear}`, tab: 'Jul', monthIdx: 6, year: startYear, days: 31 },
        { label: `August ${startYear}`, tab: 'Aug', monthIdx: 7, year: startYear, days: 31 },
        { label: `September ${startYear}`, tab: 'Sep', monthIdx: 8, year: startYear, days: 30 },
        { label: `October ${startYear}`, tab: 'Oct', monthIdx: 9, year: startYear, days: 31 },
        { label: `November ${startYear}`, tab: 'Nov', monthIdx: 10, year: startYear, days: 30 },
        { label: `December ${startYear}`, tab: 'Dec', monthIdx: 11, year: startYear, days: 31 },
        { label: `January ${endYear}`, tab: 'Jan', monthIdx: 0, year: endYear, days: 31 },
        { label: `February ${endYear}`, tab: 'Feb', monthIdx: 1, year: endYear, days: (endYear % 4 === 0 ? 29 : 28) },
        { label: `March ${endYear}`, tab: 'Mar', monthIdx: 2, year: endYear, days: 31 }
    ];
};

export default {
    todayIST,
    firstDayOfMonthIST,
    toISTDateString,
    toISTDateTimeString,
    formatTimeIST,
    formatDateIST,
    formatDateTimeIST,
    currentTimeIST,
    nowISTDateTimeString,
    nowIST,
    getFinancialYear,
    getAvailableFinancialYears,
    getSidebarMonthOptions,
};
