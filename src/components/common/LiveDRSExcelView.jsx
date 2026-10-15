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

export default function LiveDRSExcelView({
    duties = [],
    selectedCompany,
    drivers = [],
    vehicles = [],
    onRefresh,
    onOpenDirectBooking,
    onOpenEditDuty,
    onOpenAssign,
    onShareWhatsApp
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
        return (duties || []).filter(duty => {
            if (!duty || !duty.date) return false;
            if (duty.status === 'Cancelled') return false;

            const d = new Date(duty.date);
            if (isNaN(d.getTime())) return false;

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

            // Search filter
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase();
                const guest = (duty.clientName || '').toLowerCase();
                const mob = (duty.mobileNumber || '').toString().toLowerCase();
                const hotel = (duty.hotel || '').toLowerCase();
                const dutyText = (duty.duty || duty.itinerary || '').toLowerCase();
                const car = (duty.carType || duty.customCarNumber || '').toLowerCase();
                const drv = (duty.driver?.name || duty.customDriverName || '').toLowerCase();

                return guest.includes(q) || mob.includes(q) || hotel.includes(q) ||
                    dutyText.includes(q) || car.includes(q) || drv.includes(q);
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

    // Inline edit handlers
    const startInlineEdit = (duty) => {
        setInlineEditingId(duty._id);
        setInlineFormData({
            hotel: duty.hotel || '',
            clientName: duty.clientName || '',
            mobileNumber: duty.mobileNumber || '',
            time: duty.time || '09:00 AM',
            duty: duty.duty || duty.itinerary || '',
            revenue: duty.revenue || 0,
            cOut: duty.cOut || '',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Toolbar: View Filter Mode + Navigation + Search + Stats */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
            }}>
                {/* Row 1: Filter Mode Selector (Month / Single Date / Range) + Dynamic Nav Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    {/* Left: Mode Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                            onClick={() => setFilterMode('month')}
                            style={{
                                padding: '6px 13px',
                                borderRadius: '9px',
                                border: 'none',
                                background: filterMode === 'month' ? '#10b981' : 'transparent',
                                color: filterMode === 'month' ? '#000' : 'rgba(255,255,255,0.7)',
                                fontWeight: filterMode === 'month' ? '900' : '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <Calendar size={13} />
                            <span>Full Month</span>
                        </button>

                        <button
                            onClick={() => setFilterMode('single')}
                            style={{
                                padding: '6px 13px',
                                borderRadius: '9px',
                                border: 'none',
                                background: filterMode === 'single' ? '#38bdf8' : 'transparent',
                                color: filterMode === 'single' ? '#000' : 'rgba(255,255,255,0.7)',
                                fontWeight: filterMode === 'single' ? '900' : '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <span>📌</span>
                            <span>Single Date</span>
                        </button>

                        <button
                            onClick={() => setFilterMode('range')}
                            style={{
                                padding: '6px 13px',
                                borderRadius: '9px',
                                border: 'none',
                                background: filterMode === 'range' ? '#c084fc' : 'transparent',
                                color: filterMode === 'range' ? '#000' : 'rgba(255,255,255,0.7)',
                                fontWeight: filterMode === 'range' ? '900' : '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <CalendarRange size={13} />
                            <span>Date Range</span>
                        </button>
                    </div>

                    {/* Middle: Controls depending on Mode */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {filterMode === 'month' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Prev Month Button */}
                                <button
                                    onClick={handlePrevMonth}
                                    title="Previous Month"
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Month / Year Badge */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    padding: '5px 14px',
                                    borderRadius: '10px',
                                    color: '#34d399',
                                    fontWeight: '900',
                                    fontSize: '13px'
                                }}>
                                    <span>{selectedMonth === 'all' ? 'All Duties' : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}</span>
                                </div>

                                {/* Next Month Button */}
                                <button
                                    onClick={handleNextMonth}
                                    title="Next Month"
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronRight size={16} />
                                </button>

                                {/* Month Tabs Pills */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                                    {MONTH_TABS.map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => handleSelectMonthTab(tab)}
                                            style={{
                                                padding: '5px 11px',
                                                borderRadius: '7px',
                                                border: 'none',
                                                background: selectedMonthTab === tab ? '#10b981' : 'transparent',
                                                color: selectedMonthTab === tab ? '#000' : 'rgba(255,255,255,0.7)',
                                                fontWeight: selectedMonthTab === tab ? '900' : '600',
                                                fontSize: '11.5px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
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

                                <div style={{ width: '150px' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(192, 132, 252, 0.08)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(192, 132, 252, 0.25)' }}>
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

                    {/* Right: Quick Jump to Date in Month Mode */}
                    {filterMode === 'month' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>🎯 Jump to Date:</span>
                            <div style={{ width: '140px' }}>
                                <PremiumDateInput
                                    value={jumpDate}
                                    onChange={handleJumpToDate}
                                    placeholder="Select Date"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Row 2: Search + Stats + Add Duty */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '10px'
                }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', width: 'clamp(260px, 35vw, 380px)' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input 
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search guest, hotel, route, car, driver..."
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 34px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '12.5px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Right: Stats & + Add Duty Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                {monthStats.totalRides} Duties • Total Fare
                            </div>
                            <div style={{ fontSize: '16px', color: '#10b981', fontWeight: '900' }}>
                                ₹{monthStats.totalRevenue.toLocaleString('en-IN')}
                            </div>
                        </div>

                        <button
                            onClick={() => onOpenDirectBooking && onOpenDirectBooking()}
                            style={{
                                padding: '9px 18px',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                fontWeight: '900',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                            }}
                            title="Add New Duty"
                        >
                            <Plus size={15} strokeWidth={3} />
                            <span>Add Duty</span>
                        </button>
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
                                return (
                                    <React.Fragment key={group.dateKey}>
                                        {/* Blank Separator Row if not first group */}
                                        {groupIdx > 0 && (
                                            <tr style={{ height: '14px', background: '#070b14' }}>
                                                <td colSpan="12" style={{ padding: 0, border: 'none' }}></td>
                                            </tr>
                                        )}

                                        {/* Day Header Row: Date | So. No. | Hotel | Guest | Guest Mob | Time | Duty | Day Total Rate | C/Out | Car | Driver | Actions */}
                                        <tr id={`date-block-${group.dateKey}`} style={{
                                            background: '#0f172a',
                                            borderTop: '2px solid rgba(255, 255, 255, 0.2)',
                                            borderBottom: '1.5px solid rgba(255, 255, 255, 0.15)',
                                            transition: 'all 0.4s'
                                        }}>
                                            <th style={{
                                                padding: '10px 12px',
                                                width: '80px',
                                                background: '#fef08a',
                                                color: '#000000',
                                                fontWeight: '900',
                                                fontSize: '13px',
                                                textAlign: 'center',
                                                borderRight: '1px solid rgba(0,0,0,0.15)'
                                            }}>
                                                {group.dateKey}
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
                                                ₹{group.totalFare.toLocaleString('en-IN')}
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

                                        {/* Duty Rows for this Date */}
                                        {group.duties.map((duty, idx) => {
                                            const isEditing = inlineEditingId === duty._id;
                                            const fare = Number(duty.revenue) || 0;
                                            const isHighFare = fare >= 3500;
                                            const carNo = duty.vehicle?.carNumber || duty.customCarNumber || '';
                                            const carLabel = duty.vehicle?.model || duty.vehicle?.type || duty.carType || 'Car';
                                            const driverName = duty.driver?.name || duty.customDriverName || '';
                                            const driverPhone = duty.driver?.mobile || duty.driver?.phone || '';

                                            if (isEditing) {
                                                return (
                                                    <tr key={duty._id || idx} style={{ background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {idx === 0 ? group.dateKey : ''}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: 'white', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {idx + 1}
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
                                                                type="number"
                                                                value={inlineFormData.revenue}
                                                                onChange={e => setInlineFormData({ ...inlineFormData, revenue: e.target.value })}
                                                                style={{ width: '100%', padding: '5px 8px', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '5px', color: '#10b981', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
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
                                                    {/* Date column (first row of group displays date tag) */}
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'center',
                                                        fontWeight: '800',
                                                        color: idx === 0 ? '#fef08a' : 'transparent',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {idx === 0 ? group.dateKey : ''}
                                                    </td>

                                                    {/* So. No. */}
                                                    <td style={{
                                                        padding: '10px 8px',
                                                        textAlign: 'center',
                                                        fontWeight: '700',
                                                        color: 'rgba(255,255,255,0.85)',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)'
                                                    }}>
                                                        {idx + 1}
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

                                                    {/* Time (styled badge like Google Sheet Column F) */}
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
                                                            {duty.time || '09:00 AM'}
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

                                                    {/* Rate (₹) */}
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'right',
                                                        fontWeight: '900',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        background: isHighFare ? 'rgba(254, 240, 138, 0.18)' : 'transparent',
                                                        color: isHighFare ? '#fef08a' : '#10b981',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        ₹{fare.toLocaleString('en-IN')}
                                                    </td>

                                                    {/* C/Out */}
                                                    <td style={{
                                                        padding: '10px 10px',
                                                        textAlign: 'center',
                                                        color: 'rgba(255,255,255,0.75)',
                                                        fontWeight: '700',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {duty.cOut || '—'}
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

                                        {/* Add Row under this Date */}
                                        <tr style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <td colSpan="12" style={{ padding: '6px 14px' }}>
                                                <button
                                                    onClick={() => {
                                                        if (onOpenDirectBooking) {
                                                            onOpenDirectBooking(group.fullDate);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        background: 'transparent',
                                                        border: '1px dashed rgba(251, 191, 36, 0.4)',
                                                        borderRadius: '6px',
                                                        color: '#fbbf24',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Plus size={12} /> Add Duty on {group.dateKey}
                                                </button>
                                            </td>
                                        </tr>
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
