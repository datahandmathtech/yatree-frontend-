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
    if (tripType.includes('local') || tripType.includes('airport') || tripType.includes('city') || tripType.includes('transfer') || tripType.includes('station')) return false;

    const text = `${duty.duty || ''} ${duty.itinerary || ''} ${duty.pickupPoint || ''} ${duty.hotel || ''}`.toLowerCase();

    // 1. Explicit outstation destinations always take precedence
    const outsideDestinationPatterns = [
        /jaisalmer/, /jodhpur/, /jaipur/, /kumbhalgarh/, /ranakpur/,
        /mount\s*abu/, /\babu\b/, /nathdwara/, /chittorgarh/, /chittor/, /ahmedabad/,
        /delhi/, /agra/, /pushkar/, /ajmer/, /bikaner/, /outstation/, /outside/,
        /jawai/, /ranthambore/, /barmer/, /falna/, /abu\s*road/, /station\s+drop\s+at/
    ];

    for (const pattern of outsideDestinationPatterns) {
        if (pattern.test(text)) return true;
    }

    // 2. Local transfer, railway station, airport pickup/drop, sightseeing are City Local
    const localPatterns = [
        /railway/, /station/, /\brs\b/, /airport/, /transfer/, /local/, /sightseeing/,
        /city/, /pickup/, /drop/, /hotel/
    ];
    for (const pattern of localPatterns) {
        if (pattern.test(text)) return false;
    }

    return false;
};

// Format date into DD-MM (e.g. 15-10, 20-10) for Excel-style package view
const formatDayMonth = (dateVal) => {
    if (!dateVal) return '--';
    if (typeof dateVal === 'string' && /^\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}`;
    } catch {
        return String(dateVal);
    }
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

    // Fetch vehicles, DRS duties and bookings for selected month
    const fetchMonthData = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            // Include +-30 day buffer around selected month to seamlessly merge cross-month packages (e.g. 31/10 to 02/11)
            const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
            const py = prevMonthDate.getFullYear();
            const pm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
            const prevStartStr = `${py}-${pm}-01`;

            const nextMonthDate = new Date(selectedYear, selectedMonth + 2, 0);
            const ny = nextMonthDate.getFullYear();
            const nm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
            const nd = String(nextMonthDate.getDate()).padStart(2, '0');
            const nextEndStr = `${ny}-${nm}-${nd}`;

            const [vRes, dRes, bRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] })),
                axios.get(`/api/drs/${selectedCompany._id}?from=${prevStartStr}&to=${nextEndStr}`).catch(() => ({ data: [] })),
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

        // Global color map to ensure the EXACT same color across all vehicles for any multi-day package / booking / guest
        const globalPackageColors = new Map();
        let globalPaletteIndex = 0;

        const getPackageTheme = (key) => {
            if (!key) return PACKAGE_PALETTE[0];
            const cleanKey = String(key).trim().toLowerCase();
            if (globalPackageColors.has(cleanKey)) {
                return globalPackageColors.get(cleanKey);
            }
            const theme = PACKAGE_PALETTE[globalPaletteIndex % PACKAGE_PALETTE.length];
            globalPaletteIndex++;
            globalPackageColors.set(cleanKey, theme);
            return theme;
        };

        // Pre-scan all duties across all rows to assign a stable, sequential color per package / booking / guest
        rows.forEach(row => {
            row.carSlots.forEach(slot => {
                if (slot.isBooked && slot.duties.length > 0) {
                    const primary = slot.duties[0];
                    const bkgKey = primary.bookingId || primary.bookingRef?.clientCode || (typeof primary.bookingRef === 'string' ? primary.bookingRef : primary.bookingRef?._id) || primary.clientName || 'duty';
                    getPackageTheme(bkgKey);
                }
            });
        });

        // Column-by-column pass: detect continuous booking segments and assign package colors
        fleetColumns.forEach((col, cIdx) => {
            let currentSegmentKey = null;
            let segmentDays = [];

            const flushSegment = () => {
                if (segmentDays.length === 0) return;

                // Detect if booking spans across month boundaries or vehicles
                const primaryDuty = segmentDays[0]?.slot?.duties?.[0];
                const primaryBkgId = primaryDuty?.bookingId;
                const guestName = primaryDuty?.clientName;
                const packageKey = primaryBkgId || primaryDuty?.bookingRef?.clientCode || (typeof primaryDuty?.bookingRef === 'string' ? primaryDuty?.bookingRef : primaryDuty?.bookingRef?._id) || guestName || currentSegmentKey;
                const chosenTheme = getPackageTheme(packageKey);

                const allMatchingDuties = primaryBkgId
                    ? duties.filter(d => d.bookingId === primaryBkgId)
                    : (guestName ? duties.filter(d => (d.clientName || '').toLowerCase() === guestName.toLowerCase()) : []);
                const matchingBkg = primaryBkgId
                    ? bookings.find(b => b.bookingId === primaryBkgId)
                    : (guestName ? bookings.find(b => (b.clientName || '').toLowerCase() === guestName.toLowerCase()) : null);

                const allDatesSet = new Set([
                    ...allMatchingDuties.map(d => d.date ? new Date(d.date).toISOString().split('T')[0] : '').filter(Boolean),
                    ...(matchingBkg?.itinerary || []).map(it => it.date ? String(it.date).slice(0, 10) : '').filter(Boolean),
                    ...segmentDays.map(item => rows[item.rowIdx]?.dateStr).filter(Boolean)
                ]);
                const sortedPackageDates = [...allDatesSet].sort();

                const isMultiDay = segmentDays.length >= 2 || sortedPackageDates.length >= 2;
                const totalDays = sortedPackageDates.length >= 2 ? sortedPackageDates.length : segmentDays.length;

                segmentDays.forEach((item, dayIndex) => {
                    const { slot, rowIdx } = item;
                    const rowDateStr = rows[rowIdx]?.dateStr;
                    const dateIdxInPackage = sortedPackageDates.indexOf(rowDateStr);

                    const dayNo = (dateIdxInPackage >= 0 ? dateIdxInPackage + 1 : (dayIndex + 1));
                    slot.isPackage = isMultiDay;
                    slot.packageTotalDays = totalDays;
                    slot.packageDayNumber = dayNo;
                    slot.isPackageStart = (dayNo === 1);
                    slot.isPackageEnd = (dayNo === totalDays);
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
                    const bkgKey = primary.bookingId || primary.bookingRef?.clientCode || (typeof primary.bookingRef === 'string' ? primary.bookingRef : primary.bookingRef?._id) || primary.clientName || 'duty';

                    if (bkgKey !== currentSegmentKey) {
                        flushSegment();
                        currentSegmentKey = bkgKey;
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
    }, [selectedYear, selectedMonth, daysInMonth, fleetColumns, duties, bookings, todayStr]);

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

    // Compute all duties in the package when a cell is selected
    const selectedPackageDuties = useMemo(() => {
        if (!selectedCellData?.slot?.duties || selectedCellData.slot.duties.length === 0) {
            return [];
        }
        const primary = selectedCellData.slot.duties[0];
        const bkgId = primary.bookingId;
        const bkgRef = primary.bookingRef?._id || primary.bookingRef;
        const clientName = (primary.clientName || '').trim().toLowerCase();
        const carNumStr = (selectedCellData.vehicle?.number || '').replace(/[^0-9]/g, '');

        // 1. By bookingId
        if (bkgId) {
            const matches = duties.filter(d => d.bookingId === bkgId);
            const matchingBkg = bookings.find(b => b.bookingId === bkgId);

            if (matchingBkg && Array.isArray(matchingBkg.itinerary) && matchingBkg.itinerary.length > 1) {
                const combinedDays = matchingBkg.itinerary.map((it, idx) => {
                    const itDateStr = it.date ? String(it.date).slice(0, 10) : '';
                    const matchedDuty = matches.find(d => d.date && new Date(d.date).toISOString().slice(0, 10) === itDateStr)
                        || matches.find(d => Number(d.dayNo) === (it.dayNo || idx + 1));

                    if (matchedDuty) return matchedDuty;

                    return {
                        _id: it._id || `itin_${idx}`,
                        date: it.date,
                        dayNo: it.dayNo || (idx + 1),
                        hotel: it.hotel || it.pickupPoint || matchingBkg.hotel || '-',
                        clientName: matchingBkg.clientName,
                        mobileNumber: matchingBkg.mobileNumber,
                        time: it.time || '09:00 AM',
                        duty: it.duty || it.description || 'Tour Day',
                        revenue: Number(it.amount || 0),
                        status: 'Confirmed',
                        bookingId: bkgId,
                        driver: { name: it.driverName || selectedCellData.vehicle?.currentDriver?.name || 'Driver' },
                        vehicle: { carNumber: it.vehicleNumber || selectedCellData.vehicle?.fullReg || selectedCellData.vehicle?.number }
                    };
                });

                if (combinedDays.length > 1) {
                    return [...combinedDays].sort((a, b) => new Date(a.date) - new Date(b.date));
                }
            }

            if (matches.length > 0) {
                return [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // 2. By bookingRef
        if (bkgRef) {
            const matches = duties.filter(d => {
                const ref = d.bookingRef?._id || d.bookingRef;
                return ref && String(ref) === String(bkgRef);
            });
            if (matches.length > 0) {
                return [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // 3. By clientName if package (spans across multiple vehicles)
        if (selectedCellData.slot?.isPackage && clientName) {
            const matches = duties.filter(d => {
                const sameClient = (d.clientName || '').trim().toLowerCase() === clientName;
                return sameClient;
            });
            if (matches.length > 1) {
                return [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // 4. By calendarGrid segment in the same car column
        if (selectedCellData.slot?.isPackage && selectedCellData.colIndex !== undefined) {
            const colIdx = selectedCellData.colIndex;
            const segmentDuties = [];
            calendarGrid.forEach(r => {
                const s = r.carSlots[colIdx];
                if (s && s.isPackage && s.colorTheme === selectedCellData.slot.colorTheme && s.guestDisplay === selectedCellData.slot.guestDisplay) {
                    segmentDuties.push(...s.duties);
                }
            });
            if (segmentDuties.length > 1) {
                return [...segmentDuties].sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        return selectedCellData.slot.duties;
    }, [selectedCellData, duties, calendarGrid, bookings]);

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

    // Package view helper computations for Detail Modal
    const isPackageView = Boolean(
        selectedCellData &&
        !selectedCellData.isOS &&
        ((selectedPackageDuties && selectedPackageDuties.length > 1) || selectedCellData.slot?.isPackage)
    );

    const totalPackageFare = isPackageView
        ? selectedPackageDuties.reduce((acc, d) => acc + Number(d.revenue || d.totalAmount || 0), 0)
        : 0;

    const packageDriver = isPackageView
        ? (selectedPackageDuties.find(d => d.driver?.name || d.customDriverName)?.driver || selectedCellData?.vehicle?.currentDriver)
        : null;

    const packageDriverName = packageDriver?.name ||
        (isPackageView ? selectedPackageDuties.find(d => d.customDriverName)?.customDriverName : null) ||
        selectedCellData?.vehicle?.currentDriver?.name ||
        'Fleet Driver';

    const packageDriverPhone = packageDriver?.phone ||
        packageDriver?.mobile ||
        selectedCellData?.vehicle?.currentDriver?.mobile ||
        '';

    const packageBookingId = isPackageView
        ? (selectedPackageDuties.find(d => d.bookingId)?.bookingId || selectedCellData?.slot?.duties?.[0]?.bookingId)
        : null;

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


            {/* THE EXCEL-STYLE MASTER GRID */}
            <div style={{
                maxHeight: 'calc(100vh - 180px)',
                overflow: 'auto',
                border: '1px solid #2d3748',
                borderRadius: '12px',
                background: '#1a202c',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
                position: 'relative'
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
                        <tr style={{ background: '#1e3a5f', color: '#ffffff', textAlign: 'center' }}>
                            <th rowSpan={2} style={{
                                position: 'sticky',
                                top: 0,
                                left: 0,
                                zIndex: 50,
                                background: '#1e3a5f',
                                padding: '8px 10px',
                                borderRight: '1px solid #4a5568',
                                borderBottom: '2px solid #63b3ed',
                                width: '55px',
                                minWidth: '55px',
                                maxWidth: '55px',
                                fontWeight: '800'
                            }}>
                                Day
                            </th>
                            <th rowSpan={2} style={{
                                position: 'sticky',
                                top: 0,
                                left: '55px',
                                zIndex: 50,
                                background: '#1e3a5f',
                                padding: '8px 12px',
                                borderRight: '2px solid #2b6cb0',
                                borderBottom: '2px solid #63b3ed',
                                width: '75px',
                                minWidth: '75px',
                                maxWidth: '75px',
                                fontWeight: '800'
                            }}>
                                Date
                            </th>

                            {/* Fleet Car Models */}
                            {fleetColumns.map((col) => (
                                <th
                                    key={col.number}
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 35,
                                        background: '#1e3a5f',
                                        padding: '6px 8px',
                                        borderRight: '1px solid #4a5568',
                                        borderBottom: '1px solid #4a5568',
                                        minWidth: '84px',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        letterSpacing: '0.3px',
                                        color: '#cbd5e1',
                                        height: '32px'
                                    }}
                                >
                                    {col.model}
                                </th>
                            ))}

                            {/* OS Vehicles Header */}
                            <th style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 35,
                                padding: '6px 10px',
                                borderRight: '2px solid #2b6cb0',
                                borderBottom: '1px solid #4a5568',
                                minWidth: '80px',
                                fontWeight: '900',
                                color: '#e2e8f0',
                                background: '#234e70',
                                height: '32px'
                            }}>
                                OS
                            </th>

                            {/* Summary Columns */}
                            <th rowSpan={2} style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 35,
                                padding: '8px 8px',
                                borderRight: '1px solid #4a5568',
                                borderBottom: '2px solid #63b3ed',
                                width: '65px',
                                fontWeight: '800',
                                fontSize: '11px',
                                background: '#1a365d'
                            }}>
                                Own booked
                            </th>
                            <th rowSpan={2} style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 35,
                                padding: '8px 8px',
                                borderRight: '1px solid #4a5568',
                                borderBottom: '2px solid #63b3ed',
                                width: '65px',
                                fontWeight: '800',
                                fontSize: '11px',
                                background: '#1a365d'
                            }}>
                                Own free
                            </th>
                            <th rowSpan={2} style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 35,
                                padding: '8px 10px',
                                borderBottom: '2px solid #63b3ed',
                                width: '85px',
                                fontWeight: '900',
                                fontSize: '12px',
                                background: '#1a365d',
                                color: '#fef08a'
                            }}>
                                Day total
                            </th>
                        </tr>

                        {/* Header Row 2: Car Numbers & Driver hint */}
                        <tr style={{ background: '#172e4c', color: '#ffffff', textAlign: 'center' }}>
                            {fleetColumns.map((col) => (
                                <th
                                    key={col.number}
                                    style={{
                                        position: 'sticky',
                                        top: '32px',
                                        zIndex: 35,
                                        background: '#172e4c',
                                        padding: '5px 8px',
                                        borderRight: '1px solid #4a5568',
                                        borderBottom: '2px solid #63b3ed',
                                        fontWeight: '900',
                                        fontSize: '12px',
                                        color: '#63b3ed',
                                        height: '30px'
                                    }}
                                    title={`${col.displayName} ${col.currentDriver ? `• Default Driver: ${col.currentDriver.name}` : ''}`}
                                >
                                    <div>{col.number}</div>
                                </th>
                            ))}
                            <th style={{
                                position: 'sticky',
                                top: '32px',
                                zIndex: 35,
                                padding: '5px 8px',
                                borderRight: '2px solid #2b6cb0',
                                borderBottom: '2px solid #63b3ed',
                                fontWeight: '800',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                background: '#234e70',
                                height: '30px'
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
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 25,
                                        width: '55px',
                                        minWidth: '55px',
                                        maxWidth: '55px',
                                        padding: '6px 8px',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: isTodayRow ? '#38bdf8' : (row.dayOfWeek === 'Sun' ? '#f87171' : '#94a3b8'),
                                        borderRight: '1px solid #2d3748',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px',
                                        background: isTodayRow ? '#1a3045' : (row.dayNum % 2 === 0 ? '#1e2430' : '#171d28')
                                    }}>
                                        {row.dayOfWeek}
                                    </td>

                                    {/* Date */}
                                    <td style={{
                                        position: 'sticky',
                                        left: '55px',
                                        zIndex: 25,
                                        width: '75px',
                                        minWidth: '75px',
                                        maxWidth: '75px',
                                        padding: '6px 10px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        color: isTodayRow ? '#ffffff' : '#e2e8f0',
                                        borderRight: '2px solid #4a5568',
                                        borderBottom: '1px solid #2d3748',
                                        fontSize: '11.5px',
                                        whiteSpace: 'nowrap',
                                        background: isTodayRow ? '#1a3650' : (row.dayNum % 2 === 0 ? '#1e2430' : '#171d28')
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
                                    {row.carSlots.map((slot, cIdx) => {
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
                                                    setSelectedCellData({
                                                        dateStr: row.dateStr,
                                                        formattedDate: row.formattedDate,
                                                        dayOfWeek: row.dayOfWeek,
                                                        vehicle: slot.col,
                                                        colIndex: cIdx,
                                                        slot,
                                                        isBooked: booked,
                                                        isPackage: isPkg,
                                                        colorTheme: themeColor,
                                                        isPast,
                                                        isToday: row.isToday
                                                    });
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.filter = 'brightness(1.18)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.filter = 'none';
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
                                            if (row.osDuties.length > 0 || row.osAmount > 0) {
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
                                            if (row.osAmount > 0) e.currentTarget.style.filter = 'brightness(1.18)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.filter = 'none';
                                        }}
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
                    </tbody>

                    {/* BOTTOM SUMMARY ROW: Booked days per car */}
                    <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 40 }}>
                        <tr style={{
                            background: '#0f172a',
                            borderTop: '3px solid #38bdf8',
                            color: '#ffffff',
                            fontWeight: '900',
                            fontSize: '12px'
                        }}>
                            <td colSpan={2} style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 45,
                                background: '#0f172a',
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
                                        background: '#0f172a',
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
                                background: '#0f172a',
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
                                background: '#0f172a',
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
                                background: '#0f172a',
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
                                background: '#1e2836'
                            }} title="Grand Total Month Revenue">
                                ₹{summary.grandTotalRevenue.toLocaleString('en-IN')}
                            </td>
                        </tr>

                        {/* BOTTOM SUMMARY ROW 2: Cars' Own Total Sale / Revenue */}
                        <tr style={{
                            background: '#090d16',
                            borderTop: '1px solid rgba(74, 222, 128, 0.35)',
                            color: '#ffffff',
                            fontWeight: '900',
                            fontSize: '11.5px'
                        }}>
                            <td colSpan={2} style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 45,
                                background: '#090d16',
                                padding: '10px 12px',
                                borderRight: '2px solid #4a5568',
                                fontWeight: '950',
                                color: '#4ade80',
                                letterSpacing: '0.5px',
                                whiteSpace: 'nowrap'
                            }}>
                                💰 Total Sale (Cars)
                            </td>

                            {/* Revenue per Fleet Car */}
                            {summary.carBookedDays.map((cSummary) => (
                                <td
                                    key={`sale-${cSummary.number}`}
                                    style={{
                                        background: '#090d16',
                                        padding: '10px 4px',
                                        textAlign: 'center',
                                        fontWeight: '950',
                                        color: cSummary.totalRevenue > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                        borderRight: '1px solid #2d3748',
                                        fontSize: '11.5px',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={`${cSummary.number} Month Total Sale: ₹${cSummary.totalRevenue.toLocaleString('en-IN')}`}
                                >
                                    ₹{cSummary.totalRevenue.toLocaleString('en-IN')}
                                </td>
                            ))}

                            {/* OS Month Total */}
                            <td style={{
                                background: '#090d16',
                                padding: '10px 6px',
                                textAlign: 'center',
                                fontWeight: '950',
                                color: '#c084fc',
                                borderRight: '2px solid #4a5568',
                                fontSize: '11.5px',
                                whiteSpace: 'nowrap'
                            }} title="Total Outside Vehicle Revenue">
                                ₹{summary.totalOsRevenue.toLocaleString('en-IN')}
                            </td>

                            {/* Fleet Subtotal Revenue */}
                            <td style={{
                                background: '#090d16',
                                padding: '10px 4px',
                                textAlign: 'center',
                                fontWeight: '950',
                                color: '#38bdf8',
                                borderRight: '1px solid #2d3748',
                                fontSize: '11.5px',
                                whiteSpace: 'nowrap'
                            }} title="Total Fleet Revenue (Excluding OS)">
                                ₹{(summary.grandTotalRevenue - summary.totalOsRevenue).toLocaleString('en-IN')}
                            </td>

                            {/* Empty under Own Free */}
                            <td style={{
                                background: '#090d16',
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
                                background: '#161f2e',
                                whiteSpace: 'nowrap'
                            }} title="Grand Total Month Revenue">
                                ₹{summary.grandTotalRevenue.toLocaleString('en-IN')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* DETAIL MODAL WHEN A CELL IS CLICKED (STAYS FIRMLY UNTIL CLOSED) */}
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
                                maxWidth: isPackageView ? '1060px' : '650px',
                                maxHeight: '88vh',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                                transition: 'max-width 0.2s ease'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '16px 22px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px' }}>
                                        {selectedCellData.dayOfWeek.toUpperCase()}, {selectedCellData.formattedDate} • FLEET MASTER DETAILS
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedCellData.isOS ? (
                                            <span>Outside Vehicles (OS) Duties</span>
                                        ) : (
                                            <>
                                                <span>🚗 {selectedCellData.vehicle?.model} {selectedCellData.vehicle?.number}</span>
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                                                    ({selectedCellData.vehicle?.fullReg})
                                                </span>
                                            </>
                                        )}

                                        {isPackageView && (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '900',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                                                color: '#000000',
                                                letterSpacing: '0.5px'
                                            }}>
                                                MULTI-DAY TOUR ({selectedPackageDuties.length} DAYS)
                                            </span>
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

                            {/* Modal Body: List of Duties or Status */}
                            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                                {selectedCellData.isOS ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 14px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '10px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Total OS Duties:</span>
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#c084fc' }}>₹{(selectedCellData.osAmount || 0).toLocaleString('en-IN')}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {(selectedCellData.osDuties || []).map((duty, idx) => (
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
                                ) : isPackageView ? (
                                    /* IMAGE 2: COMPLETE MULTI-DAY PACKAGE BREAKDOWN TABLE */
                                    <div>
                                        {/* Top Package Details Banner */}
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            marginBottom: '16px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Vehicle</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#38bdf8' }}>
                                                        🚗 {selectedCellData.vehicle?.model} {selectedCellData.vehicle?.number}
                                                        {selectedCellData.vehicle?.fullReg && (
                                                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginLeft: '6px' }}>
                                                                ({selectedCellData.vehicle?.fullReg})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />

                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Driver</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#fbbf24' }}>
                                                        👨‍✈️ {packageDriverName} {packageDriverPhone && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>({packageDriverPhone})</span>}
                                                    </div>
                                                </div>

                                                {packageBookingId && (
                                                    <>
                                                        <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Booking ID</div>
                                                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#e2e8f0' }}>
                                                                #{packageBookingId}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Package Badge */}
                                            <div style={{
                                                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                                                color: '#000000',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                fontWeight: '950',
                                                fontSize: '13px',
                                                letterSpacing: '0.3px',
                                                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                                            }}>
                                                PACKAGE ({selectedPackageDuties.length} DAYS • TOTAL ₹{totalPackageFare.toLocaleString('en-IN')})
                                            </div>
                                        </div>

                                        {/* Breakdown Table Matching Image 2 */}
                                        <div style={{
                                            overflowX: 'auto',
                                            borderRadius: '10px',
                                            border: '1px solid #4a5568',
                                            background: '#0f172a'
                                        }}>
                                            <table style={{
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                fontSize: '12.5px',
                                                textAlign: 'left'
                                            }}>
                                                <thead>
                                                    <tr style={{ background: '#fef08a', color: '#000000', fontWeight: '900', borderBottom: '2px solid #ca8a04' }}>
                                                        <th style={{ padding: '10px 12px', borderRight: '1px solid #d4d4d8', width: '70px', textAlign: 'center' }}>Date</th>
                                                        <th style={{ padding: '10px 10px', borderRight: '1px solid #d4d4d8', width: '80px', textAlign: 'center' }}>So. No.</th>
                                                        <th style={{ padding: '10px 12px', borderRight: '1px solid #d4d4d8' }}>Hotel</th>
                                                        <th style={{ padding: '10px 12px', borderRight: '1px solid #d4d4d8' }}>Guest</th>
                                                        <th style={{ padding: '10px 12px', borderRight: '1px solid #d4d4d8' }}>Guest Mob</th>
                                                        <th style={{ padding: '10px 12px', borderRight: '1px solid #d4d4d8', textAlign: 'center' }}>Time</th>
                                                        <th style={{ padding: '10px 14px', borderRight: '1px solid #d4d4d8' }}>Duty</th>
                                                        <th style={{ padding: '10px 14px', borderRight: '1px solid #d4d4d8', textAlign: 'right', fontWeight: '950', color: '#000000' }}>
                                                            ₹{totalPackageFare.toLocaleString('en-IN')}
                                                        </th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>C/Out</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPackageDuties.map((duty, idx) => {
                                                        const dutyDateStr = duty.date ? new Date(duty.date).toISOString().split('T')[0] : '';
                                                        const isSelectedDay = dutyDateStr === selectedCellData.dateStr;
                                                        const dateDisplay = formatDayMonth(duty.date);
                                                        const dayNumber = duty.dayNo || (idx + 1);
                                                        const fare = Number(duty.revenue || duty.totalAmount || 0);

                                                        return (
                                                            <tr
                                                                key={duty._id || idx}
                                                                style={{
                                                                    background: isSelectedDay ? 'rgba(56, 189, 248, 0.22)' : (idx % 2 === 0 ? '#1e293b' : '#172033'),
                                                                    borderBottom: '1px solid #334155',
                                                                    borderLeft: isSelectedDay ? '4px solid #38bdf8' : '4px solid transparent',
                                                                    fontWeight: isSelectedDay ? '700' : 'normal',
                                                                    transition: 'background 0.15s ease'
                                                                }}
                                                            >
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', textAlign: 'center', fontWeight: '900', color: isSelectedDay ? '#38bdf8' : '#ffffff' }}>
                                                                    {dateDisplay}
                                                                </td>
                                                                <td style={{ padding: '10px 10px', borderRight: '1px solid #334155', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: isSelectedDay ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                                                                        color: isSelectedDay ? '#000000' : '#cbd5e1',
                                                                        fontWeight: '800',
                                                                        fontSize: '11.5px'
                                                                    }}>
                                                                        Day {dayNumber}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', color: '#cbd5e1' }}>
                                                                    {duty.hotel || '-'}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', fontWeight: '800', color: '#ffffff' }}>
                                                                    {duty.clientName || 'Guest'}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', color: '#38bdf8', fontWeight: '700' }}>
                                                                    {duty.mobileNumber || '-'}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', textAlign: 'center' }}>
                                                                    {duty.time || duty.pickupTime ? (
                                                                        <span style={{
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px',
                                                                            background: 'rgba(255, 255, 255, 0.06)',
                                                                            color: '#fde047',
                                                                            fontSize: '11px',
                                                                            fontWeight: '700'
                                                                        }}>
                                                                            {duty.time || duty.pickupTime}
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', borderRight: '1px solid #334155', color: '#e2e8f0' }}>
                                                                    {duty.duty || duty.itinerary || 'Regular Duty'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', borderRight: '1px solid #334155', textAlign: 'right', fontWeight: '900', color: '#4ade80' }}>
                                                                    ₹{fare.toLocaleString('en-IN')}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8' }}>
                                                                    {duty.cOut || duty.checkOut || (duty.status === 'Completed' ? '✓' : '-')}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (selectedCellData.slot?.duties && selectedCellData.slot.duties.length > 0) ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 14px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>Total Day Revenue:</span>
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>₹{(selectedCellData.slot.revenue || 0).toLocaleString('en-IN')}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {selectedCellData.slot.duties.map((duty, idx) => {
                                                const dName = duty.driver?.name || duty.customDriverName || 'Not Assigned';
                                                const dPhone = duty.driver?.phone || duty.driver?.mobile || '';
                                                return (
                                                    <div key={duty._id || idx} style={{
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '12px',
                                                        padding: '14px'
                                                    }}>
                                                        {/* Assigned Driver Box */}
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            background: 'rgba(251, 191, 36, 0.12)',
                                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            marginBottom: '10px'
                                                        }}>
                                                            <span style={{ fontSize: '16px' }}>👨‍✈️</span>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '10px', color: '#fde047', fontWeight: '800', textTransform: 'uppercase' }}>Assigned Driver</div>
                                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>
                                                                    {dName} {dPhone && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>({dPhone})</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Guest & Fare */}
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

                                                        {/* Route & Details */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1', marginTop: '10px', padding: '8px 12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px' }}>
                                                            <div><strong>Trip Scope:</strong> <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{isOutsideDuty(duty) ? 'Outside' : 'City Local'}</span></div>
                                                            <div><strong>Status:</strong> {duty.status || 'Active'}</div>
                                                            {duty.hotel && <div><strong>Hotel:</strong> {duty.hotel}</div>}
                                                            {duty.bookingId && <div><strong>Booking ID:</strong> <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{duty.bookingId}</span></div>}
                                                            <div style={{ gridColumn: '1 / -1' }}><strong>Duty / Route:</strong> {duty.duty || duty.itinerary || 'Regular Duty'}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : selectedCellData.isPast ? (
                                    <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔴</div>
                                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#f87171' }}>Car Was Unbooked / Idle</div>
                                        <div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
                                            No duty was assigned to <strong>{selectedCellData.vehicle?.displayName}</strong> on {selectedCellData.formattedDate}.
                                        </div>
                                        {selectedCellData.vehicle?.currentDriver && (
                                            <div style={{ color: '#fbbf24', fontSize: '12.5px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                Default Fleet Driver: <strong>{selectedCellData.vehicle.currentDriver.name}</strong>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ padding: '24px', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '14px', border: '1px solid rgba(234, 179, 8, 0.25)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🟡</div>
                                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#fef08a' }}>Free & Available to Book</div>
                                        <div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
                                            <strong>{selectedCellData.vehicle?.displayName}</strong> is free and ready to dispatch on {selectedCellData.formattedDate}.
                                        </div>
                                        {selectedCellData.vehicle?.currentDriver && (
                                            <div style={{ color: '#fbbf24', fontSize: '12.5px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                Default Fleet Driver: <strong>{selectedCellData.vehicle.currentDriver.name}</strong>
                                            </div>
                                        )}
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
