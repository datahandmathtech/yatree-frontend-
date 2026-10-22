import React, { useState, useMemo } from 'react';
import axios from '../../api/axios';
import { 
    Calendar, Plus, Phone, MessageSquare, Edit3, Trash2, 
    CheckCircle2, Clock, Car, User, Search, Download, 
    ExternalLink, RefreshCw, Sparkles, Filter, ChevronRight, ChevronLeft, Check, CalendarRange
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumDateInput from './PremiumDateInput';
import { todayIST } from '../../utils/istUtils';

// Formats date into short key like "1-10", "2-10" using IST
const getShortDateKey = (dateVal) => {
    if (!dateVal) return 'TBA';
    if (typeof dateVal === 'string' && /^\d{1,2}-\d{1,2}$/.test(dateVal.trim())) {
        return dateVal.trim();
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    
    // Convert to Indian Standard Time (IST)
    const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const day = istDate.getDate();
    const month = istDate.getMonth() + 1;
    return `${day}-${month}`;
};

// Formats time consistently with AM / PM (e.g., "09:00" -> "09:00 AM", "14:30" -> "02:30 PM", "APG" -> "APG")
const formatConsistentTime = (timeVal) => {
    if (!timeVal || !String(timeVal).trim()) return '09:00 AM';
    const raw = String(timeVal).trim();
    if (/^[a-zA-Z]+$/.test(raw)) return raw.toUpperCase();

    const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/);
    if (!match) return raw;

    let hours = parseInt(match[1], 10);
    const mins = match[2];
    const periodArg = match[3] ? match[3].toUpperCase() : null;

    if (periodArg) {
        if (hours === 0) hours = 12;
        if (hours > 12) hours = hours - 12;
        return `${String(hours).padStart(2, '0')}:${mins} ${periodArg}`;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(h12).padStart(2, '0')}:${mins} ${period}`;
};

export default function LiveDRSExcelView({
    duties = [],
    selectedCompany,
    drivers = [],
    vehicles = [],
    onRefresh,
    onOpenDirectBooking,
    onOpenEditDuty,
    onOpenAssign,
    onShareWhatsApp,
    onOpenDailyBreakdown
}) {
    // Mode: 'month' (Full Month Sheet), 'single' (Single Date Sheet), 'range' (Date Range Sheet)
    const [filterMode, setFilterMode] = useState('month');
    
    // Dynamic Month Selection
    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedMonth, setSelectedMonth] = useState(10); // 1 = Jan, 10 = Oct
    const [selectedMonthTab, setSelectedMonthTab] = useState('Oct. 26');

    // Single Date & Range Selection
    const [singleDate, setSingleDate] = useState(todayIST());
    const [rangeFrom, setRangeFrom] = useState('2026-10-01');
    const [rangeTo, setRangeTo] = useState('2026-10-31');
    const [jumpDate, setJumpDate] = useState('');

    const [searchFilter, setSearchFilter] = useState('');
    const [inlineEditingId, setInlineEditingId] = useState(null);
    const [inlineFormData, setInlineFormData] = useState({});
    const [savingInline, setSavingInline] = useState(false);

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const SHORT_MONTH_NAMES = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];

    const MONTH_TABS = [
        'Oct. 26', 'Nov. 26', 'Dec. 26', 'Jan. 27', 'Feb. 27', 'Sept. 26', 'August 26', 'All Duties'
    ];

    const handleSelectMonthTab = (tab) => {
        setSelectedMonthTab(tab);
        if (tab === 'Oct. 26') { setSelectedMonth(10); setSelectedYear(2026); }
        else if (tab === 'Nov. 26') { setSelectedMonth(11); setSelectedYear(2026); }
        else if (tab === 'Dec. 26') { setSelectedMonth(12); setSelectedYear(2026); }
        else if (tab === 'Jan. 27') { setSelectedMonth(1); setSelectedYear(2027); }
        else if (tab === 'Feb. 27') { setSelectedMonth(2); setSelectedYear(2027); }
        else if (tab === 'Sept. 26') { setSelectedMonth(9); setSelectedYear(2026); }
        else if (tab === 'August 26') { setSelectedMonth(8); setSelectedYear(2026); }
        else if (tab === 'All Duties') { setSelectedMonth('all'); }
    };

    const handlePrevMonth = () => {
        setFilterMode('month');
        let newM = selectedMonth === 'all' ? 10 : selectedMonth;
        let newY = selectedYear;
        if (newM === 1) {
            newM = 12;
            newY = Number(selectedYear) - 1;
        } else {
            newM = newM - 1;
        }
        setSelectedMonth(newM);
        setSelectedYear(newY);
        setSelectedMonthTab(`${SHORT_MONTH_NAMES[newM - 1]}. ${String(newY).slice(-2)}`);
    };

    const handleNextMonth = () => {
        setFilterMode('month');
        let newM = selectedMonth === 'all' ? 10 : selectedMonth;
        let newY = selectedYear;
        if (newM === 12) {
            newM = 1;
            newY = Number(selectedYear) + 1;
        } else {
            newM = newM + 1;
        }
        setSelectedMonth(newM);
        setSelectedYear(newY);
        setSelectedMonthTab(`${SHORT_MONTH_NAMES[newM - 1]}. ${String(newY).slice(-2)}`);
    };

    const handleJumpToDate = (targetDateStr) => {
        if (!targetDateStr) return;
        setJumpDate(targetDateStr);
        const d = new Date(targetDateStr);
        if (isNaN(d.getTime())) return;

        const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const istDate = new Date(istString);
        const m = istDate.getMonth() + 1;
        const y = istDate.getFullYear();
        const day = istDate.getDate();
        const dateKey = `${day}-${m}`;

        if (filterMode === 'month') {
            if (m !== selectedMonth || y !== selectedYear) {
                setSelectedMonth(m);
                setSelectedYear(y);
                setSelectedMonthTab(`${SHORT_MONTH_NAMES[m - 1]}. ${String(y).slice(-2)}`);
            }
        }

        setTimeout(() => {
            const el = document.getElementById(`date-block-${dateKey}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.transition = 'all 0.4s';
                el.style.backgroundColor = 'rgba(245, 158, 11, 0.45)';
                setTimeout(() => {
                    el.style.backgroundColor = '#0f172a';
                }, 2000);
            }
        }, 200);
    };

    const handlePrevDay = () => {
        const d = new Date(singleDate);
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSingleDate(`${y}-${m}-${day}`);
    };

    const handleNextDay = () => {
        const d = new Date(singleDate);
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSingleDate(`${y}-${m}-${day}`);
    };

    // Filter duties by Mode (Month, Single Date, Range) and Search
    const filteredDuties = useMemo(() => {
        const allValid = (duties || []).filter(duty => {
            if (!duty || !duty.date) return false;
            if (duty.status === 'Cancelled') return false;
            const d = new Date(duty.date);
            return !isNaN(d.getTime());
        });

        const hasSearch = Boolean(searchFilter.trim());
        if (hasSearch) {
            const q = searchFilter.toLowerCase().trim();
            const directMatches = allValid.filter(duty => {
                const guest = (duty.clientName || '').toLowerCase();
                const mob = (duty.mobileNumber || '').toString().toLowerCase();
                const hotel = (duty.hotel || '').toLowerCase();
                const dutyText = (duty.duty || duty.itinerary || '').toLowerCase();
                const car = (duty.carType || duty.customCarNumber || duty.vehicle?.carNumber || '').toLowerCase();
                const drv = (duty.driver?.name || duty.customDriverName || '').toLowerCase();
                const bkgId = (duty.bookingId || '').toLowerCase();

                return guest.includes(q) || mob.includes(q) || hotel.includes(q) ||
                    dutyText.includes(q) || car.includes(q) || drv.includes(q) || bkgId.includes(q);
            });

            // Include all cross-month / multi-day sibling duties of any matched booking or guest package
            const matchedRefIds = new Set();
            const matchedCodes = new Set();
            const matchedGuestKeys = new Set();

            directMatches.forEach(d => {
                const refId = d.bookingRef?._id ? String(d.bookingRef._id) : (typeof d.bookingRef === 'string' ? d.bookingRef : '');
                if (refId) matchedRefIds.add(refId);
                const code = (d.bookingId && d.bookingId !== 'DIRECT' && d.bookingId !== 'N/A') ? String(d.bookingId).trim() : '';
                if (code) matchedCodes.add(code);
                const guestName = (d.clientName || '').trim().toLowerCase();
                const guestMob = String(d.mobileNumber || '').trim();
                if (guestName) matchedGuestKeys.add(`${guestName}|${guestMob}`);
            });

            const directIds = new Set(directMatches.map(d => String(d._id)));
            return allValid.filter(d => {
                if (directIds.has(String(d._id))) return true;
                const refId = d.bookingRef?._id ? String(d.bookingRef._id) : (typeof d.bookingRef === 'string' ? d.bookingRef : '');
                if (refId && matchedRefIds.has(refId)) return true;
                const code = (d.bookingId && d.bookingId !== 'DIRECT' && d.bookingId !== 'N/A') ? String(d.bookingId).trim() : '';
                if (code && matchedCodes.has(code)) return true;
                const guestName = (d.clientName || '').trim().toLowerCase();
                const guestMob = String(d.mobileNumber || '').trim();
                if (guestName && matchedGuestKeys.has(`${guestName}|${guestMob}`)) return true;
                return false;
            });
        }

        return allValid.filter(duty => {
            const d = new Date(duty.date);
            const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const istDate = new Date(istString);
            const m = istDate.getMonth() + 1; // 1 to 12
            const y = istDate.getFullYear();

            const yyyy = istDate.getFullYear();
            const mm = String(istDate.getMonth() + 1).padStart(2, '0');
            const dd = String(istDate.getDate()).padStart(2, '0');
            const dutyDateStr = `${yyyy}-${mm}-${dd}`;

            if (filterMode === 'month') {
                if (selectedMonth !== 'all') {
                    if (m !== Number(selectedMonth) || y !== Number(selectedYear)) {
                        return false;
                    }
                }
            } else if (filterMode === 'single') {
                if (dutyDateStr !== singleDate) {
                    return false;
                }
            } else if (filterMode === 'range') {
                if (rangeFrom && dutyDateStr < rangeFrom) return false;
                if (rangeTo && dutyDateStr > rangeTo) return false;
            }

            return true;
        });
    }, [duties, filterMode, selectedMonth, selectedYear, singleDate, rangeFrom, rangeTo, searchFilter]);

    // Group duties by Date
    const groupedByDate = useMemo(() => {
        const groups = {};

        filteredDuties.forEach(duty => {
            const dateKey = getShortDateKey(duty.date);
            const fullDateStr = duty.date ? new Date(duty.date).toISOString().split('T')[0] : '';

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    dateKey,
                    fullDate: fullDateStr,
                    rawDate: duty.date,
                    totalFare: 0,
                    duties: []
                };
            }

            const fare = Number(duty.revenue) || 0;
            groups[dateKey].totalFare += fare;
            groups[dateKey].duties.push(duty);
        });

        // Sort duties chronologically within each day
        Object.values(groups).forEach(g => {
            g.duties.sort((a, b) => {
                const tA = (a.time || '').toLowerCase();
                const tB = (b.time || '').toLowerCase();
                return tA.localeCompare(tB);
            });
        });

        // Sort date groups chronologically
        return Object.values(groups).sort((a, b) => {
            const dA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
            const dB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
            return dA - dB;
        });
    }, [filteredDuties]);

    // Overall month statistics
    const monthStats = useMemo(() => {
        let totalRevenue = 0;
        let totalRides = filteredDuties.length;
        filteredDuties.forEach(d => {
            totalRevenue += Number(d.revenue || 0);
        });
        return { totalRevenue, totalRides };
    }, [filteredDuties]);

    // Map each booking / guest package to its first and last date (for C/Out column & cross-month visibility)
    const packageEndDateLookup = useMemo(() => {
        const byRef = {};
        const byCode = {};
        const byGuest = {};
        const minByRef = {};
        const minByCode = {};
        const minByGuest = {};

        const updateMax = (map, key, dateVal) => {
            if (!key || !dateVal) return;
            const ts = new Date(dateVal).getTime();
            if (isNaN(ts)) return;
            if (!map[key] || ts > map[key].ts) {
                map[key] = { ts, dateVal };
            }
        };

        const updateMin = (map, key, dateVal) => {
            if (!key || !dateVal) return;
            const ts = new Date(dateVal).getTime();
            if (isNaN(ts)) return;
            if (!map[key] || ts < map[key].ts) {
                map[key] = { ts, dateVal };
            }
        };

        (duties || []).forEach(d => {
            if (!d || d.status === 'Cancelled') return;
            const refId = d.bookingRef?._id ? String(d.bookingRef._id) : (typeof d.bookingRef === 'string' ? d.bookingRef : '');
            const code = (d.bookingId && d.bookingId !== 'DIRECT' && d.bookingId !== 'N/A') ? String(d.bookingId).trim() : '';
            const guestName = (d.clientName || '').trim().toLowerCase();
            const guestMob = String(d.mobileNumber || '').trim();
            const guestKey = guestName ? `${guestName}|${guestMob}` : '';

            const endCandidates = [d.date, d.endDate, d.bookingRef?.travelEndDate].filter(Boolean);
            endCandidates.forEach(dt => {
                if (refId) updateMax(byRef, refId, dt);
                if (code) updateMax(byCode, code, dt);
                if (guestKey) updateMax(byGuest, guestKey, dt);
            });

            const startCandidates = [d.date, d.bookingRef?.travelStartDate].filter(Boolean);
            startCandidates.forEach(dt => {
                if (refId) updateMin(minByRef, refId, dt);
                if (code) updateMin(minByCode, code, dt);
                if (guestKey) updateMin(minByGuest, guestKey, dt);
            });
        });

        return { byRef, byCode, byGuest, minByRef, minByCode, minByGuest };
    }, [duties]);

    const getDutyPackageEndDate = (duty) => {
        if (!duty) return '—';
        if (duty.cOut && String(duty.cOut).trim() && String(duty.cOut).trim() !== '—') {
            return getShortDateKey(duty.cOut);
        }
        const refId = duty.bookingRef?._id ? String(duty.bookingRef._id) : (typeof duty.bookingRef === 'string' ? duty.bookingRef : '');
        const code = (duty.bookingId && duty.bookingId !== 'DIRECT' && duty.bookingId !== 'N/A') ? String(duty.bookingId).trim() : '';
        const guestName = (duty.clientName || '').trim().toLowerCase();
        const guestMob = String(duty.mobileNumber || '').trim();
        const guestKey = guestName ? `${guestName}|${guestMob}` : '';

        const match =
            (refId && packageEndDateLookup.byRef[refId]?.dateVal) ||
            (code && packageEndDateLookup.byCode[code]?.dateVal) ||
            duty.bookingRef?.travelEndDate ||
            duty.endDate ||
            (guestKey && packageEndDateLookup.byGuest[guestKey]?.dateVal) ||
            duty.date;

        return match ? getShortDateKey(match) : '—';
    };

    const getDutyCrossMonthInfo = (duty) => {
        if (!duty) return null;
        const refId = duty.bookingRef?._id ? String(duty.bookingRef._id) : (typeof duty.bookingRef === 'string' ? duty.bookingRef : '');
        const code = (duty.bookingId && duty.bookingId !== 'DIRECT' && duty.bookingId !== 'N/A') ? String(duty.bookingId).trim() : '';
        const guestName = (duty.clientName || '').trim().toLowerCase();
        const guestMob = String(duty.mobileNumber || '').trim();
        const guestKey = guestName ? `${guestName}|${guestMob}` : '';

        const startRaw =
            (refId && packageEndDateLookup.minByRef[refId]?.dateVal) ||
            (code && packageEndDateLookup.minByCode[code]?.dateVal) ||
            duty.bookingRef?.travelStartDate ||
            (guestKey && packageEndDateLookup.minByGuest[guestKey]?.dateVal) ||
            duty.date;

        const endRaw =
            (refId && packageEndDateLookup.byRef[refId]?.dateVal) ||
            (code && packageEndDateLookup.byCode[code]?.dateVal) ||
            duty.bookingRef?.travelEndDate ||
            duty.endDate ||
            (guestKey && packageEndDateLookup.byGuest[guestKey]?.dateVal) ||
            duty.date;

        const startKey = getShortDateKey(startRaw);
        const endKey = getShortDateKey(endRaw);
        const startM = startKey.split('-')[1];
        const endM = endKey.split('-')[1];
        if (startM && endM && startM !== endM) {
            return { startKey, endKey };
        }
        return null;
    };

    // Inline edit handlers
    const startInlineEdit = (duty) => {
        setInlineEditingId(duty._id);
        setInlineFormData({
            hotel: duty.hotel || '',
            clientName: duty.clientName || '',
            mobileNumber: duty.mobileNumber || '',
            time: formatConsistentTime(duty.time || '09:00 AM'),
            duty: duty.duty || duty.itinerary || '',
            revenue: duty.revenue || 0,
            cOut: duty.cOut || getDutyPackageEndDate(duty) || '',
            carType: duty.carType || 'Sedan',
            customCarNumber: duty.vehicle?.carNumber || duty.customCarNumber || '',
            customDriverName: duty.driver?.name || duty.customDriverName || ''
        });
    };

    const cancelInlineEdit = () => {
        setInlineEditingId(null);
        setInlineFormData({});
    };

    const saveInlineEdit = async (dutyId) => {
        setSavingInline(true);
        try {
            await axios.put(`/api/drs/${dutyId}`, {
                hotel: inlineFormData.hotel,
                clientName: inlineFormData.clientName,
                mobileNumber: inlineFormData.mobileNumber,
                time: inlineFormData.time,
                duty: inlineFormData.duty,
                itinerary: inlineFormData.duty,
                revenue: Number(inlineFormData.revenue) || 0,
                cOut: inlineFormData.cOut,
                carType: inlineFormData.carType,
                customCarNumber: inlineFormData.customCarNumber,
                customDriverName: inlineFormData.customDriverName
            });
            setInlineEditingId(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error saving inline DRS duty:', err);
            alert('Failed to save duty');
        } finally {
            setSavingInline(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Toolbar: Sleek 2-Row Filter + Navigation + Search + KPI Bar */}
            <div style={{
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(11, 17, 32, 0.98))',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '18px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.45)'
            }}>
                {/* Row 1: Filter Mode Selector + Month Navigation + Month Tabs */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    {/* Left Group: Mode Switcher + Month/Single/Range Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '11px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                onClick={() => setFilterMode('month')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: filterMode === 'month' ? '#10b981' : 'transparent',
                                    color: filterMode === 'month' ? '#000' : 'rgba(255,255,255,0.75)',
                                    fontWeight: filterMode === 'month' ? '900' : '700',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Calendar size={13} />
                                <span>Full Month</span>
                            </button>

                            <button
                                onClick={() => setFilterMode('single')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: filterMode === 'single' ? '#38bdf8' : 'transparent',
                                    color: filterMode === 'single' ? '#000' : 'rgba(255,255,255,0.75)',
                                    fontWeight: filterMode === 'single' ? '900' : '700',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span>📌</span>
                                <span>Single Date</span>
                            </button>

                            <button
                                onClick={() => setFilterMode('range')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: filterMode === 'range' ? '#c084fc' : 'transparent',
                                    color: filterMode === 'range' ? '#000' : 'rgba(255,255,255,0.75)',
                                    fontWeight: filterMode === 'range' ? '900' : '700',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <CalendarRange size={13} />
                                <span>Date Range</span>
                            </button>
                        </div>

                        {filterMode === 'month' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={handlePrevMonth}
                                    title="Previous Month"
                                    style={{
                                        padding: '6px 9px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronLeft size={15} />
                                </button>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(16, 185, 129, 0.14)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    padding: '5px 14px',
                                    borderRadius: '9px',
                                    color: '#34d399',
                                    fontWeight: '900',
                                    fontSize: '12.5px',
                                    minWidth: '125px',
                                    justifyContent: 'center'
                                }}>
                                    <span>{selectedMonth === 'all' ? 'All Duties' : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}</span>
                                </div>

                                <button
                                    onClick={handleNextMonth}
                                    title="Next Month"
                                    style={{
                                        padding: '6px 9px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        )}

                        {filterMode === 'single' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={handlePrevDay}
                                    title="Previous Day"
                                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div style={{ width: '145px' }}>
                                    <PremiumDateInput
                                        value={singleDate}
                                        onChange={(val) => setSingleDate(val)}
                                        placeholder="Pick Date"
                                    />
                                </div>

                                <button
                                    onClick={handleNextDay}
                                    title="Next Day"
                                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
                                >
                                    <ChevronRight size={16} />
                                </button>

                                <button
                                    onClick={() => setSingleDate(todayIST())}
                                    style={{ padding: '6px 12px', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '11.5px', cursor: 'pointer' }}
                                >
                                    ⚡ Today
                                </button>
                            </div>
                        )}

                        {filterMode === 'range' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(192, 132, 252, 0.08)', padding: '4px 10px', borderRadius: '11px', border: '1px solid rgba(192, 132, 252, 0.25)' }}>
                                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>From:</span>
                                <div style={{ width: '135px' }}>
                                    <PremiumDateInput
                                        value={rangeFrom}
                                        onChange={(val) => setRangeFrom(val)}
                                        placeholder="Start Date"
                                    />
                                </div>
                                <span style={{ color: '#c084fc', fontWeight: '900', fontSize: '13px' }}>➔</span>
                                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>To:</span>
                                <div style={{ width: '135px' }}>
                                    <PremiumDateInput
                                        value={rangeTo}
                                        onChange={(val) => setRangeTo(val)}
                                        placeholder="End Date"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Group: Month Quick Pills */}
                    {filterMode === 'month' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}>
                            {MONTH_TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleSelectMonthTab(tab)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '7px',
                                        border: 'none',
                                        background: selectedMonthTab === tab ? '#10b981' : 'transparent',
                                        color: selectedMonthTab === tab ? '#000' : 'rgba(255,255,255,0.7)',
                                        fontWeight: selectedMonthTab === tab ? '900' : '600',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Row 2: Search + Jump to Date + Stats Pill + Add Duty */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '10px'
                }}>
                    {/* Left: Search Input + Jump to Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                        <div style={{ position: 'relative', width: 'clamp(240px, 30vw, 350px)' }}>
                            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                            <input 
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Search guest, hotel, route, car, driver..."
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 34px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '12.5px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {filterMode === 'month' && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                padding: '3px 8px 3px 10px',
                                borderRadius: '10px'
                            }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', whiteSpace: 'nowrap' }}>🎯 Jump to Date:</span>
                                <div style={{ width: '132px' }}>
                                    <PremiumDateInput
                                        value={jumpDate}
                                        onChange={handleJumpToDate}
                                        placeholder="Select Date"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Clean Month Stats Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '7px 16px',
                            borderRadius: '10px'
                        }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>
                                {monthStats.totalRides} Duties • Total Fare:
                            </span>
                            <span style={{ fontSize: '15px', color: '#34d399', fontWeight: '900' }}>
                                ₹{monthStats.totalRevenue.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Excel Grid Container */}
            <div style={{
                background: '#0b1120',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                overflowX: 'auto',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
            }}>
                <table style={{
                    width: '100%',
                    minWidth: '1350px',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    textAlign: 'left',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                }}>
                    <tbody>
                        {groupedByDate.length === 0 ? (
                            <tr>
                                <td colSpan="12" style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No DRS Duties Found</div>
                                    <p style={{ fontSize: '12px', margin: '4px 0 16px' }}>Try switching month, changing date filter, or click below to add a duty.</p>
                                    <button
                                        onClick={() => onOpenDirectBooking && onOpenDirectBooking()}
                                        style={{ padding: '8px 18px', background: '#fbbf24', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        + Add Booking
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            groupedByDate.map((group, groupIdx) => {
                                const isSearchActive = Boolean(searchFilter.trim());
                                return (
                                    <React.Fragment key={group.dateKey}>
                                        {/* Blank Separator Row if not first group (hidden when searching guest so dates appear continuously) */}
                                        {groupIdx > 0 && !isSearchActive && (
                                            <tr style={{ height: '14px', background: '#070b14' }}>
                                                <td colSpan="12" style={{ padding: 0, border: 'none' }}></td>
                                            </tr>
                                        )}

                                        {/* Day Header Row: rendered per day normally, or only ONCE at the top when searching a guest */}
                                        {(!isSearchActive || groupIdx === 0) && (
                                            <tr id={`date-block-${group.dateKey}`} style={{
                                                background: '#0f172a',
                                                borderTop: '2px solid rgba(255, 255, 255, 0.2)',
                                                borderBottom: '1.5px solid rgba(255, 255, 255, 0.15)',
                                                transition: 'all 0.4s'
                                            }}>
                                                <th
                                                    style={{
                                                        padding: '10px 12px',
                                                        width: '80px',
                                                        background: '#fef08a',
                                                        color: '#000000',
                                                        fontWeight: '900',
                                                        fontSize: '13px',
                                                        textAlign: 'center',
                                                        borderRight: '1px solid rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    {isSearchActive ? 'Date' : group.dateKey}
                                                </th>
                                                <th style={{ padding: '10px 8px', width: '55px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    So. No.
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '130px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Hotel
                                                </th>
                                                <th style={{ padding: '10px 12px', width: '160px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Guest
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '120px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Guest Mob
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '85px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Time
                                                </th>
                                                <th style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Duty
                                                </th>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    width: '100px',
                                                    textAlign: 'right',
                                                    background: '#fef08a',
                                                    color: '#000000',
                                                    fontWeight: '900',
                                                    fontSize: '13px',
                                                    borderRight: '1px solid rgba(0,0,0,0.15)'
                                                }}>
                                                    ₹{(isSearchActive ? monthStats.totalRevenue : group.totalFare).toLocaleString('en-IN')}
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    C/Out
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '125px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Car
                                                </th>
                                                <th style={{ padding: '10px 10px', width: '140px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Driver
                                                </th>
                                                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: '11px' }}>
                                                    Actions
                                                </th>
                                            </tr>
                                        )}

                                        {/* Duty Rows for this Date */}
                                        {group.duties.map((duty, idx) => {
                                            const isEditing = inlineEditingId === duty._id;
                                            const fare = Number(duty.revenue) || 0;
                                            const isHighFare = fare >= 3500;
                                            const carNo = duty.vehicle?.carNumber || duty.customCarNumber || '';
                                            const carLabel = duty.vehicle?.model || duty.vehicle?.type || duty.carType || 'Car';
                                            const driverName = duty.driver?.name || duty.customDriverName || '';
                                            const driverPhone = duty.driver?.mobile || duty.driver?.phone || '';
                                            const crossMonthInfo = getDutyCrossMonthInfo(duty);
                                            const rowSerial = isSearchActive
                                                ? groupedByDate.slice(0, groupIdx).reduce((acc, g) => acc + g.duties.length, 0) + idx + 1
                                                : idx + 1;

                                            if (isEditing) {
                                                return (
                                                    <tr key={duty._id || idx} style={{ background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {isSearchActive || idx === 0 ? group.dateKey : ''}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: 'white', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {rowSerial}
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.hotel}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, hotel: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.clientName}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, clientName: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px', fontWeight: '700' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.mobileNumber}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, mobileNumber: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.time}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, time: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 4px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.duty}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, duty: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="no-spinner"
                                                                value={inlineFormData.revenue}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, revenue: e.target.value.replace(/[^0-9.]/g, '') })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: '#fef08a', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.cOut}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, cOut: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 4px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: 'white', fontSize: '12px', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.customCarNumber}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, customCarNumber: e.target.value.toUpperCase() })}
                                                                placeholder="Car No (e.g. RJ27TA9053)"
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <input 
                                                                value={inlineFormData.customDriverName}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, customDriverName: e.target.value })}
                                                                placeholder="Driver Name"
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #4ade80', borderRadius: '5px', color: '#4ade80', fontSize: '12px', fontWeight: '700' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => saveInlineEdit(duty._id)}
                                                                    disabled={savingInline}
                                                                    style={{ padding: '4px 10px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#000', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={cancelInlineEdit}
                                                                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '11px' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr
                                                    key={duty._id || idx}
                                                    onDoubleClick={() => startInlineEdit(duty)}
                                                    style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        background: isHighFare ? 'rgba(254, 240, 138, 0.04)' : 'transparent',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    className="drs-excel-row"
                                                >
                                                    {/* Date column (first row of group displays date tag, or every row when searching) */}
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'center',
                                                        fontWeight: '800',
                                                        color: (isSearchActive || idx === 0) ? '#fef08a' : 'transparent',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {(isSearchActive || idx === 0) ? group.dateKey : ''}
                                                    </td>

                                                    {/* So. No. */}
                                                    <td style={{
                                                        padding: '10px 8px',
                                                        textAlign: 'center',
                                                        fontWeight: '700',
                                                        color: 'rgba(255,255,255,0.85)',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {rowSerial}
                                                    </td>

                                                    {/* Hotel / Source */}
                                                    <td style={{
                                                        padding: '10px 10px',
                                                        color: 'rgba(255,255,255,0.9)',
                                                        fontWeight: '600',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {duty.hotel || '—'}
                                                    </td>

                                                    {/* Guest Name */}
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        color: 'white',
                                                        fontWeight: '800',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {duty.clientName}
                                                    </td>

                                                    {/* Guest Mobile */}
                                                    <td style={{
                                                        padding: '10px 10px',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {duty.mobileNumber ? (
                                                            <a 
                                                                href={`tel:${duty.mobileNumber}`} 
                                                                style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '700' }}
                                                            >
                                                                {duty.mobileNumber}
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>NA</span>
                                                        )}
                                                    </td>

                                                    {/* Time (styled badge like Google Sheet Column F, always with AM / PM) */}
                                                    <td style={{
                                                        padding: '10px 10px',
                                                        textAlign: 'center',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#34d399',
                                                            fontWeight: '800',
                                                            fontSize: '11.5px'
                                                        }}>
                                                            {formatConsistentTime(duty.time || '09:00 AM')}
                                                        </span>
                                                    </td>

                                                    {/* Duty / Route */}
                                                    <td style={{
                                                        padding: '10px 14px',
                                                        color: 'white',
                                                        fontWeight: '600',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {duty.duty || duty.itinerary || 'Local Sightseeing / Transfer'}
                                                    </td>

                                                    {/* Rate (₹) - Always consistent yellow styling */}
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'right',
                                                        fontWeight: '900',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        background: 'rgba(254, 240, 138, 0.18)',
                                                        color: '#fef08a',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        ₹{fare.toLocaleString('en-IN')}
                                                    </td>

                                                    {/* C/Out - Last date of the package */}
                                                    <td style={{
                                                        padding: '10px 10px',
                                                        textAlign: 'center',
                                                        color: 'rgba(255,255,255,0.75)',
                                                        fontWeight: '700',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                            <span>{getDutyPackageEndDate(duty)}</span>
                                                            {crossMonthInfo && !isSearchActive && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (duty.clientName) setSearchFilter(duty.clientName);
                                                                    }}
                                                                    title="Cross-month package — click to view all days together"
                                                                    style={{
                                                                        fontSize: '9.5px',
                                                                        color: '#fbbf24',
                                                                        background: 'rgba(251, 191, 36, 0.14)',
                                                                        border: '1px solid rgba(251, 191, 36, 0.35)',
                                                                        borderRadius: '4px',
                                                                        padding: '1px 5px',
                                                                        fontWeight: '800',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {crossMonthInfo.startKey}➔{crossMonthInfo.endKey}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Car / Vehicle (Clickable to Assign Car & Driver) */}
                                                    <td style={{
                                                        padding: '8px 10px',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onOpenAssign) onOpenAssign(duty);
                                                            }}
                                                            title="Click to Assign / Change Car & Driver"
                                                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                                                        >
                                                            {carNo ? (
                                                                <>
                                                                    <span style={{
                                                                        padding: '2px 7px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(56, 189, 248, 0.14)',
                                                                        border: '1px solid rgba(56, 189, 248, 0.35)',
                                                                        color: '#38bdf8',
                                                                        fontWeight: '800',
                                                                        fontSize: '11.5px',
                                                                        width: 'fit-content'
                                                                    }}>
                                                                        🚗 {carNo}
                                                                    </span>
                                                                    {carLabel && carLabel !== carNo && (
                                                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                                                                            {carLabel}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span style={{
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                                                                    color: '#38bdf8',
                                                                    fontWeight: '700',
                                                                    fontSize: '11px',
                                                                    width: 'fit-content'
                                                                }}>
                                                                    🚗 {carLabel} (+ Assign)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Driver (Clickable to Assign Car & Driver) */}
                                                    <td style={{
                                                        padding: '8px 10px',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {driverName ? (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onOpenAssign) onOpenAssign(duty);
                                                                }}
                                                                title="Click to Change Driver & Car"
                                                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                                                            >
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(34, 197, 94, 0.15)',
                                                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                                                    color: '#4ade80',
                                                                    fontWeight: '800',
                                                                    fontSize: '11.5px',
                                                                    width: 'fit-content'
                                                                }}>
                                                                    👤 {driverName}
                                                                </span>
                                                                {driverPhone && (
                                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                                                                        {driverPhone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onOpenAssign) onOpenAssign(duty);
                                                                }}
                                                                title="Assign Driver & Car"
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    background: 'rgba(74, 222, 128, 0.1)',
                                                                    border: '1px dashed rgba(74, 222, 128, 0.45)',
                                                                    borderRadius: '6px',
                                                                    color: '#4ade80',
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                + Assign Driver
                                                            </button>
                                                        )}
                                                    </td>

                                                    {/* Actions: ONLY Edit and Delete */}
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                            <button
                                                                onClick={() => startInlineEdit(duty)}
                                                                title="Edit Row"
                                                                style={{ padding: '5px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fbbf24', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Edit3 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const guestName = duty.clientName || 'Guest';
                                                                    if (window.confirm(`Delete DRS duty for ${guestName} (${duty.duty || 'Duty'})?`)) {
                                                                        try {
                                                                            await axios.delete(`/api/drs/${duty._id}`);
                                                                            if (onRefresh) onRefresh();
                                                                        } catch (delErr) {
                                                                            console.error('Error deleting DRS duty:', delErr);
                                                                            alert('Failed to delete duty');
                                                                        }
                                                                    }
                                                                }}
                                                                title="Delete Duty"
                                                                style={{ padding: '5px 7px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
