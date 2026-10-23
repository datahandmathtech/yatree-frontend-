import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, RefreshCw,
    Car, CheckCircle2, AlertCircle, Info, ExternalLink, X, Plus, Filter, Search, User, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { todayIST } from '../../utils/istUtils';

const MASTER_FLEET_ORDER = [
    { model: 'Ciaz', number: '0160', displayName: 'Ciaz 0160', fullReg: 'RJ-27-TB-0160' },
    { model: 'Ciaz', number: '9795', displayName: 'Ciaz 9795', fullReg: 'RJ-27-TA-9795' },
    { model: 'Ciaz', number: '9836', displayName: 'Ciaz 9836', fullReg: 'RJ-27-TA-9836' },
    { model: 'Swift', number: '8946', displayName: 'Swift 8946', fullReg: 'RJ-27-TA-8946' },
    { model: 'Vento', number: '1387', displayName: 'Vento 1387', fullReg: 'RJ-27-TB-1387' },
    { model: 'Crysta', number: '9821', displayName: 'Crysta 9821', fullReg: 'RJ-27-TA-9821' },
    { model: 'Crysta', number: '9822', displayName: 'Crysta 9822', fullReg: 'RJ-27-TA-9822' },
    { model: 'Crysta', number: '9053', displayName: 'Crysta 9053', fullReg: 'RJ-27-TA-9053' },
    { model: 'Crysta', number: '1370', displayName: 'Crysta 1370', fullReg: 'RJ-27-TB-1370' },
    { model: 'Traveller', number: '5054', displayName: 'Traveller 5054', fullReg: 'RJ-27-PB-5054' },
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Distinct, high-contrast color themes for packages and rides (excluding Red & Yellow)
const PACKAGE_PALETTE = [
    { name: 'Royal Blue', bg: '#2563eb', border: '#1d4ed8', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bfdbfe' },
    { name: 'Emerald', bg: '#059669', border: '#047857', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#a7f3d0' },
    { name: 'Deep Purple', bg: '#7c3aed', border: '#6d28d9', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#ddd6fe' },
    { name: 'Teal', bg: '#0d9488', border: '#0f766e', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#99f6e4' },
    { name: 'Magenta Fuchsia', bg: '#c026d3', border: '#a21caf', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#f5d0fe' },
    { name: 'Cerulean Cyan', bg: '#0284c7', border: '#0369a1', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bae6fd' },
    { name: 'Indigo', bg: '#4f46e5', border: '#4338ca', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#c7d2fe' },
    { name: 'Plum Wine', bg: '#9d174d', border: '#831843', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#fbcfe8' },
    { name: 'Forest Green', bg: '#15803d', border: '#166534', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bbf7d0' },
    { name: 'Dark Slate', bg: '#334155', border: '#1e293b', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#cbd5e1' },
    { name: 'Electric Violet', bg: '#6366f1', border: '#4f46e5', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0e7ff' },
    { name: 'Deep Ocean', bg: '#0369a1', border: '#075985', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0f2fe' }
];

// Helper to classify if a duty is Outside (Outstation) or City Local
const isOutsideDuty = (duty) => {
    if (!duty) return false;
    const tripType = String(duty.tripType || duty.bookingRef?.tripType || '').toLowerCase();
    if (tripType.includes('outstation')) return true;
    if (tripType.includes('local') || tripType.includes('airport') || tripType.includes('city')) return false;

    const text = `${duty.duty || ''} ${duty.itinerary || ''} ${duty.pickupPoint || ''} ${duty.hotel || ''}`.toLowerCase();

    const outsidePatterns = [
        /\bto\b/, /jaisalmer/, /jodhpur/, /jaipur/, /kumbhalgarh/, /ranakpur/,
        /mount\s*abu/, /\babu\b/, /nathdwara/, /chittorgarh/, /chittor/, /ahmedabad/,
        /delhi/, /agra/, /pushkar/, /ajmer/, /bikaner/, /outstation/, /outside/,
        /jawai/, /ranthambore/, /barmer/, /falna/, /abu\s*road/, /station\s+drop\s+at/
    ];

    for (const pattern of outsidePatterns) {
        if (pattern.test(text)) return true;
    }

    return false;
};

export default function MasterFleetCalendar({ selectedCompany, theme = { primary: '#0ea5e9' }, onNavigateToDRS }) {
    // Current date in IST
    const todayStr = todayIST(); // 'YYYY-MM-DD'
    const todayParts = todayStr.split('-').map(Number);
    const initialYear = todayParts[0] || new Date().getFullYear();
    const initialMonth = (todayParts[1] ? todayParts[1] - 1 : new Date().getMonth());

    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth); // 0-indexed
    const [loading, setLoading] = useState(false);
    const [duties, setDuties] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedCellData, setSelectedCellData] = useState(null);
    const [hoverTooltip, setHoverTooltip] = useState(null);

    // Fetch vehicles, DRS duties and bookings for selected month
    const fetchMonthData = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const startDayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const endDayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const [vRes, dRes, bRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] })),
                axios.get(`/api/drs/${selectedCompany._id}?from=${startDayStr}&to=${endDayStr}`).catch(() => ({ data: [] })),
                axios.get(`/api/bookings/${selectedCompany._id}`).catch(() => ({ data: [] }))
            ]);

            const vList = vRes.data?.vehicles || vRes.data || [];
            const dList = Array.isArray(dRes.data) ? dRes.data : [];
            const bList = Array.isArray(bRes.data) ? bRes.data : [];

            setVehicles(Array.isArray(vList) ? vList : []);
            setDuties(dList);
            setBookings(bList);
        } catch (err) {
            console.error('Error fetching Master Calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonthData();
    }, [selectedCompany?._id, selectedYear, selectedMonth]);

    // Build fleet columns: Default to the master 10 order, attach default driver from vehicles, then append any additional own active vehicles
    const fleetColumns = useMemo(() => {
        const columns = MASTER_FLEET_ORDER.map(col => ({ ...col }));
        const masterNumbers = new Set(columns.map(m => m.number));

        // Match currentDriver & details from DB vehicles
        vehicles.forEach(v => {
            const clean = (v.carNumber || '').replace(/[^0-9]/g, '');
            const last4 = clean.slice(-4);
            const found = columns.find(c => c.number === last4);
            if (found) {
                found.vehicleId = v._id;
                found.fullReg = v.carNumber || found.fullReg;
                found.currentDriver = v.currentDriver; // { name, mobile }
            }
        });

        // Check if there are other own active vehicles in company fleet
        vehicles.forEach(v => {
            if (v.isOutsideCar) return;
            const clean = (v.carNumber || '').replace(/[^0-9]/g, '');
            const last4 = clean.slice(-4);
            if (last4 && !masterNumbers.has(last4) && !(v.carNumber || '').includes('#')) {
                masterNumbers.add(last4);
                columns.push({
                    model: v.model || 'Car',
                    number: last4,
                    displayName: `${v.model || 'Car'} ${last4}`,
                    fullReg: v.carNumber,
                    vehicleId: v._id,
                    currentDriver: v.currentDriver
                });
            }
        });

        return columns;
    }, [vehicles]);

    // Days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // Build days and cell matrix with distinct color assignment per ride / package
    const calendarGrid = useMemo(() => {
        const rows = [];
        const monthShort = MONTH_NAMES[selectedMonth].substring(0, 3);

        const colMap = {};
        fleetColumns.forEach((col, idx) => {
            colMap[col.number] = idx;
        });

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dayStr = String(dayNum).padStart(2, '0');
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${dayStr}`;
            const dateObj = new Date(selectedYear, selectedMonth, dayNum);
            const dayOfWeek = DAY_NAMES[dateObj.getDay()];
            const formattedDate = `${dayStr}-${monthShort}`;

            const carSlots = fleetColumns.map(col => ({
                col,
                revenue: 0,
                dutyCount: 0,
                duties: [],
                isBooked: false,
                isPackage: false,
                packageTotalDays: 1,
                packageDayNumber: 1,
                isPackageStart: false,
                isPackageEnd: false,
                colorTheme: PACKAGE_PALETTE[0],
                isOutside: false,
                tripTypeDisplay: 'City Local',
                driverDisplay: '',
                guestDisplay: ''
            }));

            rows.push({
                dayNum,
                dateStr,
                dayOfWeek,
                formattedDate,
                carSlots,
                osAmount: 0,
                osDuties: [],
                ownBookedCount: 0,
                ownFreeCount: fleetColumns.length,
                dayTotalRevenue: 0,
                isPast: dateStr < todayStr,
                isToday: dateStr === todayStr
            });
        }

        // Aggregate duties into rows
        duties.forEach(duty => {
            if (!duty.date) return;
            const dutyDateStr = new Date(duty.date).toISOString().split('T')[0];
            const [y, m, d] = dutyDateStr.split('-').map(Number);

            if (y !== selectedYear || (m - 1) !== selectedMonth) return;
            const rowIdx = d - 1;
            if (rowIdx < 0 || rowIdx >= rows.length) return;

            const row = rows[rowIdx];
            const rev = Number(duty.revenue || duty.totalAmount || 0);

            // Determine if assigned to one of our fleet columns
            const carNumStr = (duty.vehicle?.carNumber || duty.customCarNumber || '').replace(/[^0-9]/g, '');
            const last4 = carNumStr.slice(-4);
            const colIndex = colMap[last4];

            const isCompanyCar = colIndex !== undefined && !duty.isOutsideCar;

            if (isCompanyCar) {
                const slot = row.carSlots[colIndex];
                slot.revenue += rev;
                slot.dutyCount += 1;
                slot.duties.push(duty);
                slot.isBooked = true;
            } else {
                // Outside / OS vehicle
                row.osAmount += rev;
                row.osDuties.push(duty);
            }
        });

        // Column-by-column pass: detect continuous booking segments and assign DIFFERENT color themes
        fleetColumns.forEach((col, cIdx) => {
            let currentSegmentKey = null;
            let currentPaletteIdx = -1;
            let segmentDays = [];

            const flushSegment = () => {
                if (segmentDays.length === 0) return;
                const isMultiDay = segmentDays.length >= 2;
                const totalDays = segmentDays.length;
                const chosenTheme = PACKAGE_PALETTE[currentPaletteIdx % PACKAGE_PALETTE.length];

                segmentDays.forEach((item, dayIndex) => {
                    const { slot } = item;
                    slot.isPackage = isMultiDay;
                    slot.packageTotalDays = totalDays;
                    slot.packageDayNumber = dayIndex + 1;
                    slot.isPackageStart = (dayIndex === 0);
                    slot.isPackageEnd = (dayIndex === totalDays - 1);
                    slot.colorTheme = chosenTheme;
                });

                segmentDays = [];
            };

            for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                const row = rows[rowIdx];
                const slot = row.carSlots[cIdx];

                if (slot.isBooked && slot.duties.length > 0) {
                    // Extract primary booking / client key
                    const primary = slot.duties[0];
                    const bkgKey = primary.bookingId || primary.bookingRef?.clientCode || primary.bookingRef?._id || primary.clientName || 'duty';

                    if (bkgKey !== currentSegmentKey) {
                        flushSegment();
                        currentSegmentKey = bkgKey;
                        // Cycle to next distinct color from palette (no red, no yellow)
                        currentPaletteIdx = (currentPaletteIdx + 1) % PACKAGE_PALETTE.length;
                    }

                    // Extract drivers & trip scope
                    const drivers = slot.duties
                        .map(d => d.driver?.name || d.customDriverName || '')
                        .filter(Boolean);
                    const uniqueDrivers = [...new Set(drivers)];
                    slot.driverDisplay = uniqueDrivers.join(', ') || 'Assigned';

                    // Extract guests
                    const guests = slot.duties
                        .map(d => d.clientName || d.bookingRef?.clientName || d.customerName || d.guestName || '')
                        .filter(Boolean);
                    const uniqueGuests = [...new Set(guests)];
                    slot.guestDisplay = uniqueGuests.join(', ') || 'Guest';

                    const hasOutside = slot.duties.some(d => isOutsideDuty(d));
                    slot.isOutside = hasOutside;
                    slot.tripTypeDisplay = hasOutside ? 'Outside' : 'City Local';

                    segmentDays.push({ rowIdx, slot });
                } else {
                    // Gap (car was free or idle)
                    flushSegment();
                    currentSegmentKey = null;
                    slot.driverDisplay = slot.col.currentDriver?.name || '';
                }
            }

            // Flush remaining segment at month end
            flushSegment();
        });

        // Compute counts and day totals for each row
        rows.forEach(row => {
            let bookedCount = 0;
            let ownRevenue = 0;

            row.carSlots.forEach(slot => {
                if (slot.isBooked) {
                    bookedCount += 1;
                    ownRevenue += slot.revenue;
                }
            });

            row.ownBookedCount = bookedCount;
            row.ownFreeCount = fleetColumns.length - bookedCount;
            row.dayTotalRevenue = ownRevenue + row.osAmount;
        });

        return rows;
    }, [selectedYear, selectedMonth, daysInMonth, fleetColumns, duties, todayStr]);

    // Bottom summary row (Booked days per vehicle & grand totals)
    const summary = useMemo(() => {
        const carBookedDays = fleetColumns.map((col, idx) => {
            let daysBooked = 0;
            let totalRevenue = 0;
            calendarGrid.forEach(row => {
                const slot = row.carSlots[idx];
                if (slot.isBooked) {
                    daysBooked += 1;
                    totalRevenue += slot.revenue;
                }
            });
            return {
                number: col.number,
                daysBooked,
                totalRevenue
            };
        });

        let totalOsRevenue = 0;
        let grandTotalRevenue = 0;
        let totalBookedSlots = 0;

        calendarGrid.forEach(row => {
            totalOsRevenue += row.osAmount;
            grandTotalRevenue += row.dayTotalRevenue;
            totalBookedSlots += row.ownBookedCount;
        });

        return {
            carBookedDays,
            totalOsRevenue,
            grandTotalRevenue,
            totalBookedSlots
        };
    }, [fleetColumns, calendarGrid]);

    // Navigation functions
    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    const handleJumpToCurrent = () => {
        setSelectedYear(initialYear);
        setSelectedMonth(initialMonth);
    };

    // Tooltip Hover Handlers
    const handleCellMouseEnter = (e, data) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverTooltip({
            ...data,
            rect
        });
    };

    const handleCellMouseLeave = () => {
        setHoverTooltip(null);
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Day', 'Date', ...fleetColumns.map(c => `${c.model} ${c.number}`), 'OS Vehicles', 'Own Booked', 'Own Free', 'Day Total'];
        const csvRows = [headers.join(',')];

        calendarGrid.forEach(row => {
            const carValues = row.carSlots.map(s => (s.isBooked ? (s.isPackage ? `Package Day ${s.packageDayNumber}/${s.packageTotalDays} (${s.tripTypeDisplay})` : s.tripTypeDisplay) : '-'));
            csvRows.push([
                row.dayOfWeek,
                row.formattedDate,
                ...carValues,
                row.osAmount,
                row.ownBookedCount,
                row.ownFreeCount,
                row.dayTotalRevenue
            ].join(','));
        });

        const summaryRow = [
            'Booked Days',
            '',
            ...summary.carBookedDays.map(s => s.daysBooked),
            summary.totalOsRevenue,
            summary.totalBookedSlots,
            '',
            summary.grandTotalRevenue
        ];
        csvRows.push(summaryRow.join(','));

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Master_Calendar_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{
            background: '#0d131f',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            color: '#e2e8f0',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative'
        }}>
            {/* TOP HEADER CONTROLS */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                {/* Title & Month Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3)'
                    }}>
                        <CalendarIcon size={24} color="#ffffff" />
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: '900',
                                margin: 0,
                                letterSpacing: '0.5px',
                                color: '#ffffff'
                            }}>
                                MASTER CALENDAR
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                LIVE DRS SYNC
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                            Fleet Availability & Package Tours (Distinct Color Themes for Consecutive Rides)
                        </div>
                    </div>
                </div>

                {/* Month Navigator & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Month Controls */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={handlePrevMonth}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Previous Month"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div style={{
                            padding: '4px 16px',
                            fontWeight: '900',
                            fontSize: '15px',
                            color: '#fbbf24',
                            letterSpacing: '0.5px',
                            minWidth: '150px',
                            textAlign: 'center'
                        }}>
                            {MONTH_NAMES[selectedMonth].toUpperCase()} {selectedYear}
                        </div>

                        <button
                            onClick={handleNextMonth}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Next Month"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Today / Current Month Quick Jump */}
                    <button
                        onClick={handleJumpToCurrent}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '12px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        Current Month
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={fetchMonthData}
                        disabled={loading}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '700'
                        }}
                        title="Reload Live DRS Data"
                    >
                        <RefreshCw size={14} className={loading ? 'pulse-animation' : ''} />
                        <span>Refresh</span>
                    </button>

                    {/* Export */}
                    <button
                        onClick={exportToCSV}
                        style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '800',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                        }}
                    >
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* QUICK STATS CARDS BAR */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Own Fleet Size</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>
                        {fleetColumns.length} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Vehicles</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Days Booked</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#4ade80', marginTop: '4px' }}>
                        {summary.totalBookedSlots} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Car-Days</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Outside (OS) Revenue</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#c084fc', marginTop: '4px' }}>
                        ₹{summary.totalOsRevenue.toLocaleString('en-IN')}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px'
                }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase' }}>Month Total Revenue</div>
                    <div style={{ fontSize: '22px', fontWeight: '950', color: '#fef08a', marginTop: '4px' }}>
                        ₹{summary.grandTotalRevenue.toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            {/* COLOR LEGEND BAR */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#94a3b8',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>LEGEND:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '18px', height: '14px', background: '#2563eb', borderRadius: '3px' }} />
                    <div style={{ width: '18px', height: '14px', background: '#7c3aed', borderRadius: '3px' }} />
                    <div style={{ width: '18px', height: '14px', background: '#059669', borderRadius: '3px' }} />
                    <div style={{ width: '18px', height: '14px', background: '#0d9488', borderRadius: '3px' }} />
                    <span style={{ color: '#e2e8f0', fontWeight: '700' }}>Different Colors per Ride/Package (Blue, Purple, Emerald, Teal, etc.)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '18px', height: '14px', background: '#dc2626', borderRadius: '3px' }} />
                    <span style={{ color: '#f87171', fontWeight: '700' }}>Past Idle / Unbooked (Red)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '18px', height: '14px', background: '#eab308', borderRadius: '3px' }} />
                    <span style={{ color: '#fef08a', fontWeight: '700' }}>Today / Future Available (Yellow)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    <Info size={14} color="#38bdf8" />
                    <span>Hover over any cell for full Driver, Guest, Route & Amount details</span>
                </div>
            </div>

            {/* THE EXCEL-STYLE MASTER GRID */}
            <div style={{
                overflowX: 'auto',
                border: '1px solid #2d3748',
                borderRadius: '12px',
                background: '#1a202c',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontSize: '12px',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                }}>
                    <thead>
                        {/* Header Row 1: Models & Group Titles */}
                        <tr style={{ background: '#1e3a5f', color: '#ffffff', textAlign: 'center', borderBottom: '1px solid #4a5568' }}>
                            <th rowSpan={2} style={{ padding: '8px 10px', borderRight: '1px solid #4a5568', width: '55px', fontWeight: '800' }}>
                                Day
                            </th>
                            <th rowSpan={2} style={{ padding: '8px 12px', borderRight: '2px solid #2b6cb0', width: '75px', fontWeight: '800' }}>
                                Date
                            </th>

                            {/* Fleet Car Models */}
                            {fleetColumns.map((col) => (
                                <th
                                    key={col.number}
                                    style={{
                                        padding: '6px 8px',
                                        borderRight: '1px solid #4a5568',
                                        minWidth: '84px',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        letterSpacing: '0.3px',
                                        color: '#cbd5e1'
                                    }}
                                >
                                    {col.model}
                                </th>
                            ))}

                            {/* OS Vehicles Header */}
                            <th style={{
                                padding: '6px 10px',
                                borderRight: '2px solid #2b6cb0',
                                minWidth: '80px',
                                fontWeight: '900',
                                color: '#e2e8f0',
                                background: '#234e70'
                            }}>
                                OS
                            </th>

                            {/* Summary Columns */}
                            <th rowSpan={2} style={{ padding: '8px 8px', borderRight: '1px solid #4a5568', width: '65px', fontWeight: '800', fontSize: '11px', background: '#1a365d' }}>
                                Own booked
                            </th>
                            <th rowSpan={2} style={{ padding: '8px 8px', borderRight: '1px solid #4a5568', width: '65px', fontWeight: '800', fontSize: '11px', background: '#1a365d' }}>
                                Own free
                            </th>
                            <th rowSpan={2} style={{ padding: '8px 10px', width: '85px', fontWeight: '900', fontSize: '12px', background: '#1a365d', color: '#fef08a' }}>
                                Day total
                            </th>
                        </tr>

                        {/* Header Row 2: Car Numbers & Driver hint */}
                        <tr style={{ background: '#172e4c', color: '#ffffff', textAlign: 'center', borderBottom: '2px solid #63b3ed' }}>
                            {fleetColumns.map((col) => (
                                <th
                                    key={col.number}
                                    style={{
                                        padding: '5px 8px',
                                        borderRight: '1px solid #4a5568',
                                        fontWeight: '900',
                                        fontSize: '12px',
                                        color: '#63b3ed'
                                    }}
                                    title={`${col.displayName} ${col.currentDriver ? `• Default Driver: ${col.currentDriver.name}` : ''}`}
                                >
                                    <div>{col.number}</div>
                                    {col.currentDriver?.name && (
                                        <div style={{ fontSize: '9px', fontWeight: '600', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '72px', margin: '0 auto' }}>
                                            {col.currentDriver.name.split(' ')[0]}
                                        </div>
                                    )}
                                </th>
                            ))}
                            <th style={{
                                padding: '5px 8px',
                                borderRight: '2px solid #2b6cb0',
                                fontWeight: '800',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                background: '#234e70'
                            }}>
                                OS Vehicles
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {calendarGrid.map((row) => {
                            const isTodayRow = row.isToday;

                            return (
                                <tr
                                    key={row.dateStr}
                                    style={{
                                        background: isTodayRow ? 'rgba(56, 189, 248, 0.12)' : (row.dayNum % 2 === 0 ? '#1e2430' : '#171d28'),
                                        borderBottom: isTodayRow ? '2px solid #38bdf8' : '1px solid #2d3748',
                                        position: isTodayRow ? 'relative' : 'static',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    {/* Day Name */}
                                    <td style={{
                                        padding: '6px 8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: isTodayRow ? '#38bdf8' : (row.dayOfWeek === 'Sun' ? '#f87171' : '#94a3b8'),
                                        borderRight: '1px solid #2d3748',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px',
                                        background: isTodayRow ? 'rgba(56, 189, 248, 0.15)' : 'inherit'
                                    }}>
                                        {row.dayOfWeek}
                                    </td>

                                    {/* Date */}
                                    <td style={{
                                        padding: '6px 10px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        color: isTodayRow ? '#ffffff' : '#e2e8f0',
                                        borderRight: '2px solid #4a5568',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px',
                                        whiteSpace: 'nowrap',
                                        background: isTodayRow ? 'rgba(56, 189, 248, 0.2)' : 'inherit'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {isTodayRow && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    background: '#38bdf8',
                                                    color: '#000000',
                                                    padding: '1px 4px',
                                                    borderRadius: '4px',
                                                    fontWeight: '900'
                                                }}>
                                                    TODAY
                                                </span>
                                            )}
                                            <span>{row.formattedDate}</span>
                                        </div>
                                    </td>

                                    {/* Vehicle Cells */}
                                    {row.carSlots.map((slot) => {
                                        const booked = slot.isBooked;
                                        const isPast = row.isPast;
                                        const isPkg = slot.isPackage;
                                        const themeColor = slot.colorTheme || PACKAGE_PALETTE[0];

                                        let bgColor = '#eab308'; // Yellow (Today or Future available)
                                        let textColor = '#1a202c';
                                        let cellBorder = '1px solid #2d3748';

                                        if (booked) {
                                            bgColor = themeColor.bg;
                                            textColor = '#ffffff';
                                            cellBorder = `1px solid ${themeColor.border}`;
                                        } else if (isPast) {
                                            bgColor = '#dc2626'; // Red (Past unbooked)
                                            textColor = '#ffffff';
                                            cellBorder = '1px solid #b91c1c';
                                        }

                                        return (
                                            <td
                                                key={slot.col.number}
                                                onClick={() => {
                                                    if (booked || slot.duties.length > 0) {
                                                        setSelectedCellData({
                                                            dateStr: row.dateStr,
                                                            formattedDate: row.formattedDate,
                                                            dayOfWeek: row.dayOfWeek,
                                                            vehicle: slot.col,
                                                            slot
                                                        });
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (booked) e.currentTarget.style.filter = 'brightness(1.15)';
                                                    handleCellMouseEnter(e, {
                                                        dateStr: row.dateStr,
                                                        formattedDate: row.formattedDate,
                                                        dayOfWeek: row.dayOfWeek,
                                                        vehicle: slot.col,
                                                        slot,
                                                        isBooked: booked,
                                                        isPackage: isPkg,
                                                        colorTheme: themeColor,
                                                        isPast,
                                                        isToday: row.isToday
                                                    });
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (booked) e.currentTarget.style.filter = 'none';
                                                    handleCellMouseLeave();
                                                }}
                                                style={{
                                                    background: bgColor,
                                                    color: textColor,
                                                    textAlign: 'center',
                                                    padding: '3px 2px',
                                                    fontSize: '11px',
                                                    borderRight: '1px solid #2d3748',
                                                    borderBottom: '1px solid #2d3748',
                                                    borderTop: isPkg && slot.isPackageStart ? '2px solid rgba(255,255,255,0.6)' : undefined,
                                                    cursor: booked ? 'pointer' : 'default',
                                                    userSelect: 'none',
                                                    transition: 'transform 0.1s ease, filter 0.1s ease',
                                                    verticalAlign: 'middle',
                                                    height: '44px',
                                                    borderTopLeftRadius: isPkg && slot.isPackageStart ? '6px' : 0,
                                                    borderTopRightRadius: isPkg && slot.isPackageStart ? '6px' : 0,
                                                    borderBottomLeftRadius: isPkg && slot.isPackageEnd ? '6px' : 0,
                                                    borderBottomRightRadius: isPkg && slot.isPackageEnd ? '6px' : 0
                                                }}
                                            >
                                                {booked ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '1px',
                                                        padding: '1px 2px',
                                                        height: '100%',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {/* Guest Name */}
                                                        <span
                                                            style={{
                                                                fontSize: '10px',
                                                                fontWeight: '950',
                                                                color: '#ffffff',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: '82px',
                                                                lineHeight: 1.15,
                                                                letterSpacing: '0.1px',
                                                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                                            }}
                                                            title={slot.guestDisplay || 'Guest'}
                                                        >
                                                            {slot.guestDisplay || 'Guest'}
                                                        </span>

                                                        {/* Duty Scope: City Local vs Outside */}
                                                        <span style={{
                                                            fontSize: '8.5px',
                                                            fontWeight: '800',
                                                            letterSpacing: '0.2px',
                                                            textTransform: 'uppercase',
                                                            color: isPkg ? (themeColor.badgeText || '#bfdbfe') : '#dcfce7',
                                                            lineHeight: 1.1
                                                        }}>
                                                            {slot.tripTypeDisplay}
                                                        </span>

                                                        {/* Multi-day Package Indicator with Day progress */}
                                                        {isPkg && (
                                                            <span style={{
                                                                fontSize: '7.5px',
                                                                fontWeight: '900',
                                                                background: themeColor.badgeBg || 'rgba(0, 0, 0, 0.35)',
                                                                color: themeColor.badgeText || '#ffffff',
                                                                padding: '1px 3px',
                                                                borderRadius: '3px',
                                                                lineHeight: 1,
                                                                letterSpacing: '0.2px',
                                                                display: 'inline-block'
                                                            }}>
                                                                DAY {slot.packageDayNumber}/{slot.packageTotalDays}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : ''}
                                            </td>
                                        );
                                    })}

                                    {/* OS Vehicles */}
                                    <td
                                        onClick={() => {
                                            if (row.osDuties.length > 0) {
                                                setSelectedCellData({
                                                    dateStr: row.dateStr,
                                                    formattedDate: row.formattedDate,
                                                    dayOfWeek: row.dayOfWeek,
                                                    isOS: true,
                                                    osAmount: row.osAmount,
                                                    osDuties: row.osDuties
                                                });
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            if (row.osAmount > 0) {
                                                handleCellMouseEnter(e, {
                                                    dateStr: row.dateStr,
                                                    formattedDate: row.formattedDate,
                                                    dayOfWeek: row.dayOfWeek,
                                                    isOS: true,
                                                    osAmount: row.osAmount,
                                                    osDuties: row.osDuties
                                                });
                                            }
                                        }}
                                        onMouseLeave={handleCellMouseLeave}
                                        style={{
                                            padding: '6px 8px',
                                            textAlign: 'center',
                                            fontWeight: row.osAmount > 0 ? '800' : 'normal',
                                            color: row.osAmount > 0 ? '#c084fc' : '#64748b',
                                            borderRight: '2px solid #4a5568',
                                            borderBottom: '1px solid #2d3748',
                                            fontSize: '11.5px',
                                            cursor: row.osAmount > 0 ? 'pointer' : 'default',
                                            background: row.osAmount > 0 ? 'rgba(192, 132, 252, 0.08)' : 'inherit'
                                        }}
                                    >
                                        {row.osAmount > 0 ? row.osAmount.toLocaleString('en-IN') : ''}
                                    </td>

                                    {/* Own booked */}
                                    <td style={{
                                        padding: '6px 8px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        color: '#38bdf8',
                                        borderRight: '1px solid #2d3748',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px'
                                    }}>
                                        {row.ownBookedCount}
                                    </td>

                                    {/* Own free */}
                                    <td style={{
                                        padding: '6px 8px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        color: '#facc15',
                                        borderRight: '1px solid #2d3748',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px'
                                    }}>
                                        {row.ownFreeCount}
                                    </td>

                                    {/* Day total */}
                                    <td style={{
                                        padding: '6px 10px',
                                        textAlign: 'right',
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        borderBottom: '1px solid #2d3748',
                                        background: isTodayRow ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.2)'
                                    }}>
                                        {row.dayTotalRevenue > 0 ? row.dayTotalRevenue.toLocaleString('en-IN') : '-'}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* BOTTOM SUMMARY ROW: Booked days per car */}
                        <tr style={{
                            background: '#0f172a',
                            borderTop: '3px solid #38bdf8',
                            color: '#ffffff',
                            fontWeight: '900',
                            fontSize: '12px'
                        }}>
                            <td colSpan={2} style={{
                                padding: '10px 12px',
                                borderRight: '2px solid #4a5568',
                                fontWeight: '950',
                                color: '#38bdf8',
                                letterSpacing: '0.5px'
                            }}>
                                Booked days
                            </td>

                            {/* Booked Days per Fleet Car */}
                            {summary.carBookedDays.map((cSummary) => (
                                <td
                                    key={cSummary.number}
                                    style={{
                                        padding: '10px 4px',
                                        textAlign: 'center',
                                        fontWeight: '950',
                                        color: '#ffffff',
                                        borderRight: '1px solid #2d3748',
                                        fontSize: '12px'
                                    }}
                                    title={`${cSummary.number}: ${cSummary.daysBooked} days booked in month (₹${cSummary.totalRevenue.toLocaleString('en-IN')})`}
                                >
                                    {cSummary.daysBooked}
                                </td>
                            ))}

                            {/* OS Month Total */}
                            <td style={{
                                padding: '10px 6px',
                                textAlign: 'center',
                                fontWeight: '950',
                                color: '#c084fc',
                                borderRight: '2px solid #4a5568',
                                fontSize: '11.5px'
                            }} title="Total Outside Vehicle Revenue">
                                ₹{summary.totalOsRevenue.toLocaleString('en-IN')}
                            </td>

                            {/* Total Booked Days across fleet */}
                            <td style={{
                                padding: '10px 4px',
                                textAlign: 'center',
                                fontWeight: '950',
                                color: '#38bdf8',
                                borderRight: '1px solid #2d3748'
                            }}>
                                {summary.totalBookedSlots}
                            </td>

                            {/* Empty under Own Free */}
                            <td style={{
                                padding: '10px 4px',
                                textAlign: 'center',
                                borderRight: '1px solid #2d3748',
                                color: '#64748b'
                            }}>
                                -
                            </td>

                            {/* Grand Total Revenue */}
                            <td style={{
                                padding: '10px 10px',
                                textAlign: 'right',
                                fontWeight: '950',
                                color: '#fef08a',
                                fontSize: '13px',
                                background: 'rgba(234, 179, 8, 0.15)'
                            }} title="Grand Total Month Revenue">
                                ₹{summary.grandTotalRevenue.toLocaleString('en-IN')}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* INSTANT FLOATING HOVER TOOLTIP CARD */}
            {hoverTooltip && (
                <div
                    style={{
                        position: 'fixed',
                        left: Math.max(12, Math.min(window.innerWidth - 360, (hoverTooltip.rect?.left || 100) + ((hoverTooltip.rect?.width || 0) / 2) - 170)),
                        top: ((hoverTooltip.rect?.bottom || 100) + 10 + 350 > window.innerHeight)
                            ? Math.max(10, (hoverTooltip.rect?.top || 100) - 360)
                            : (hoverTooltip.rect?.bottom || 100) + 8,
                        width: '340px',
                        maxHeight: '430px',
                        background: 'linear-gradient(145deg, #090f1d 0%, #151f32 100%)',
                        border: `2px solid ${
                            hoverTooltip.isBooked
                                ? (hoverTooltip.colorTheme?.bg || '#2563eb')
                                : hoverTooltip.isOS
                                ? '#c084fc'
                                : hoverTooltip.isPast
                                ? '#ef4444'
                                : '#eab308'
                        }`,
                        borderRadius: '16px',
                        padding: '16px',
                        color: '#ffffff',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 0, 0, 0.5)',
                        zIndex: 100000,
                        pointerEvents: 'none',
                        backdropFilter: 'blur(20px)',
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                >
                    {/* Tooltip Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                {hoverTooltip.dayOfWeek}, {hoverTooltip.formattedDate}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '950', color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {hoverTooltip.isOS ? (
                                    <span>🟣 Outside Vehicles (OS)</span>
                                ) : (
                                    <>
                                        <span>🚗 {hoverTooltip.vehicle?.model} {hoverTooltip.vehicle?.number}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>({hoverTooltip.vehicle?.fullReg})</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <span style={{
                            fontSize: '10px',
                            fontWeight: '900',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: hoverTooltip.isPackage
                                ? 'rgba(59, 130, 246, 0.25)'
                                : hoverTooltip.isBooked
                                ? 'rgba(16, 185, 129, 0.2)'
                                : hoverTooltip.isOS
                                ? 'rgba(192, 132, 252, 0.2)'
                                : hoverTooltip.isPast
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(234, 179, 8, 0.2)',
                            color: hoverTooltip.isPackage
                                ? '#93c5fd'
                                : hoverTooltip.isBooked
                                ? '#4ade80'
                                : hoverTooltip.isOS
                                ? '#c084fc'
                                : hoverTooltip.isPast
                                ? '#f87171'
                                : '#fef08a',
                            border: `1px solid ${
                                hoverTooltip.isPackage
                                    ? 'rgba(59, 130, 246, 0.5)'
                                    : hoverTooltip.isBooked
                                    ? 'rgba(16, 185, 129, 0.4)'
                                    : hoverTooltip.isOS
                                    ? 'rgba(192, 132, 252, 0.4)'
                                    : hoverTooltip.isPast
                                    ? 'rgba(239, 68, 68, 0.4)'
                                    : 'rgba(234, 179, 8, 0.4)'
                            }`
                        }}>
                            {hoverTooltip.isPackage
                                ? `📦 PACKAGE (DAY ${hoverTooltip.slot?.packageDayNumber}/${hoverTooltip.slot?.packageTotalDays})`
                                : hoverTooltip.isBooked
                                ? hoverTooltip.slot?.tripTypeDisplay?.toUpperCase()
                                : hoverTooltip.isOS
                                ? 'OUTSIDE'
                                : hoverTooltip.isPast
                                ? 'IDLE'
                                : 'AVAILABLE'}
                        </span>
                    </div>

                    {/* Tooltip Content */}
                    {hoverTooltip.isBooked ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {hoverTooltip.slot?.duties?.map((duty, idx) => {
                                const dName = duty.driver?.name || duty.customDriverName || 'No Driver Assigned';
                                const dMobile = duty.driver?.mobile || '';
                                const cName = duty.clientName || 'Guest';
                                const cMobile = duty.mobileNumber || '';
                                const fare = Number(duty.revenue || duty.totalAmount || 0);

                                return (
                                    <div key={duty._id || idx} style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        padding: '10px 12px'
                                    }}>
                                        {/* Assigned Driver Highlight Card */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(251, 191, 36, 0.16)',
                                            border: '1px solid rgba(251, 191, 36, 0.35)',
                                            padding: '7px 10px',
                                            borderRadius: '8px',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ fontSize: '16px' }}>👨‍✈️</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '9.5px', color: '#fde047', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Assigned Driver
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '950', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {dName} {dMobile && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>({dMobile})</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Client & Fare Row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>GUEST</div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8' }}>
                                                    {cName} {cMobile && <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>• {cMobile}</span>}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>FARE AMOUNT</div>
                                                <div style={{ fontSize: '15px', fontWeight: '950', color: '#4ade80' }}>
                                                    ₹{fare.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Route Details */}
                                        <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <div><strong>Route:</strong> {duty.duty || duty.itinerary || 'Regular Duty'}</div>
                                            {duty.hotel && <div><strong>Hotel:</strong> {duty.hotel}</div>}
                                            {duty.bookingId && <div><strong>Booking ID:</strong> <span style={{ color: '#fbbf24' }}>{duty.bookingId}</span></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : hoverTooltip.isOS ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '6px 10px', background: 'rgba(192, 132, 252, 0.15)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#e2e8f0' }}>Total OS Duties:</span>
                                <span style={{ fontSize: '14px', fontWeight: '950', color: '#c084fc' }}>₹{hoverTooltip.osAmount?.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                {hoverTooltip.osDuties?.map((d, i) => (
                                    <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '11.5px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                                            <span style={{ color: '#ffffff' }}>{d.clientName || 'Guest'}</span>
                                            <span style={{ color: '#4ade80' }}>₹{(d.revenue || d.totalAmount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div style={{ color: '#fbbf24', marginTop: '3px' }}>
                                            👨‍✈️ Driver: <strong>{d.customDriverName || d.driver?.name || 'Outside Driver'}</strong>
                                        </div>
                                        <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                            🚗 Car: {d.customCarNumber || d.vehicle?.carNumber || d.carType || 'Market Car'}
                                        </div>
                                        <div style={{ color: '#cbd5e1', marginTop: '2px' }}>
                                            📍 {d.duty || d.itinerary || 'Duty'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : hoverTooltip.isPast ? (
                        <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '12.5px' }}>
                            <div style={{ fontWeight: '800', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🔴</span>
                                <span>Car Was Unbooked / Idle</span>
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '11.5px', marginTop: '6px' }}>
                                No duty was assigned to {hoverTooltip.vehicle?.displayName} on this date.
                            </div>
                            {hoverTooltip.vehicle?.currentDriver && (
                                <div style={{ color: '#fbbf24', fontSize: '11.5px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    Default Fleet Driver: <strong>{hoverTooltip.vehicle.currentDriver.name}</strong>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '10px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.25)', fontSize: '12.5px' }}>
                            <div style={{ fontWeight: '800', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🟡</span>
                                <span>Free & Available to Book</span>
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '11.5px', marginTop: '6px' }}>
                                This vehicle is currently free on {hoverTooltip.formattedDate}.
                            </div>
                            {hoverTooltip.vehicle?.currentDriver && (
                                <div style={{ color: '#fbbf24', fontSize: '11.5px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    Default Fleet Driver: <strong>{hoverTooltip.vehicle.currentDriver.name}</strong>
                                </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                                💡 Click cell to dispatch duty in Live DRS
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL MODAL WHEN A CELL IS CLICKED */}
            <AnimatePresence>
                {selectedCellData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedCellData(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 99999,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '18px',
                                width: '100%',
                                maxWidth: '600px',
                                maxHeight: '85vh',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '18px 22px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px' }}>
                                        {selectedCellData.dayOfWeek.toUpperCase()}, {selectedCellData.formattedDate}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {selectedCellData.isOS ? (
                                            <span>Outside Vehicles (OS) Duties</span>
                                        ) : (
                                            <>
                                                <span>{selectedCellData.vehicle?.model} {selectedCellData.vehicle?.number}</span>
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                                    ({selectedCellData.vehicle?.fullReg})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedCellData(null)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: 'none',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body: List of Duties */}
                            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                                {selectedCellData.isOS ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 14px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '10px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Total OS Duties:</span>
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#c084fc' }}>₹{selectedCellData.osAmount.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {selectedCellData.osDuties.map((duty, idx) => (
                                                <div key={duty._id || idx} style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '12px',
                                                    padding: '14px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                                                                {duty.clientName || 'Guest'}
                                                            </div>
                                                            {duty.mobileNumber && (
                                                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                    📞 {duty.mobileNumber}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>
                                                            ₹{(duty.revenue || duty.totalAmount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1', marginTop: '10px', padding: '8px 12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px' }}>
                                                        <div><strong>Car:</strong> {duty.customCarNumber || duty.vehicle?.carNumber || duty.carType || 'Market Car'}</div>
                                                        <div><strong>Driver:</strong> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{duty.customDriverName || duty.driver?.name || 'Outside Driver'}</span></div>
                                                        <div style={{ gridColumn: '1 / -1' }}><strong>Duty / Route:</strong> {duty.duty || duty.itinerary || 'Local / Outstation'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 14px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Total Day Revenue:</span>
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>₹{selectedCellData.slot.revenue.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {selectedCellData.slot.duties.map((duty, idx) => (
                                                <div key={duty._id || idx} style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '12px',
                                                    padding: '14px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                                                                {duty.clientName || 'Guest'}
                                                            </div>
                                                            {duty.mobileNumber && (
                                                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                    📞 {duty.mobileNumber}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>
                                                            ₹{(duty.revenue || duty.totalAmount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1', marginTop: '10px', padding: '8px 12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px' }}>
                                                        <div><strong>Assigned Driver:</strong> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{duty.driver?.name || duty.customDriverName || 'Not Assigned'}</span></div>
                                                        <div><strong>Trip Scope:</strong> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{isOutsideDuty(duty) ? 'Outside' : 'City Local'}</span></div>
                                                        <div><strong>Status:</strong> {duty.status || 'Active'}</div>
                                                        <div style={{ gridColumn: '1 / -1' }}><strong>Duty / Route:</strong> {duty.duty || duty.itinerary || 'Regular Duty'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '14px 22px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px'
                            }}>
                                <button
                                    onClick={() => setSelectedCellData(null)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: 'none',
                                        color: '#ffffff',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                                {onNavigateToDRS && (
                                    <button
                                        onClick={() => {
                                            const dStr = selectedCellData.dateStr;
                                            setSelectedCellData(null);
                                            onNavigateToDRS(dStr);
                                        }}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '10px',
                                            background: '#38bdf8',
                                            border: 'none',
                                            color: '#000000',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                        <span>View in Live DRS</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
