import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useCompany } from '../../context/CompanyContext';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw,
    Car, User, Phone, MapPin, Clock, Edit2, Trash2, X, Check,
    Search, AlertCircle, ArrowUpRight, CheckCircle2, ShieldCheck,
    Layers, Grid, ListFilter, Sparkles, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { todayIST, toISTDateString } from '../../utils/istUtils';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Distinct, high-contrast color themes matching Master Fleet Calendar (excluding red/yellow)
const PACKAGE_PALETTE = [
    { name: 'Royal Blue', bg: '#2563eb', border: '#1d4ed8', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bfdbfe', text: '#ffffff' },
    { name: 'Emerald', bg: '#059669', border: '#047857', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#a7f3d0', text: '#ffffff' },
    { name: 'Deep Purple', bg: '#7c3aed', border: '#6d28d9', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#ddd6fe', text: '#ffffff' },
    { name: 'Teal', bg: '#0d9488', border: '#0f766e', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#99f6e4', text: '#ffffff' },
    { name: 'Magenta Fuchsia', bg: '#c026d3', border: '#a21caf', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#f5d0fe', text: '#ffffff' },
    { name: 'Cerulean Cyan', bg: '#0284c7', border: '#0369a1', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bae6fd', text: '#ffffff' },
    { name: 'Indigo', bg: '#4f46e5', border: '#4338ca', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#c7d2fe', text: '#ffffff' },
    { name: 'Plum Wine', bg: '#9d174d', border: '#831843', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#fbcfe8', text: '#ffffff' },
    { name: 'Forest Green', bg: '#15803d', border: '#166534', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bbf7d0', text: '#ffffff' },
    { name: 'Dark Slate', bg: '#334155', border: '#1e293b', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#cbd5e1', text: '#ffffff' },
    { name: 'Electric Violet', bg: '#6366f1', border: '#4f46e5', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0e7ff', text: '#ffffff' },
    { name: 'Deep Ocean', bg: '#0369a1', border: '#075985', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0f2fe', text: '#ffffff' }
];

// Consistent deterministic color generator for multi-day tours / bookings
const getThemeForDuty = (duty) => {
    if (!duty) return PACKAGE_PALETTE[0];
    const key = String(duty.bookingId || duty.clientName || duty._id || 'tour');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % PACKAGE_PALETTE.length;
    return PACKAGE_PALETTE[idx];
};

// Check if a duty matches a driver (by ObjectId or name)
const doesDutyMatchDriver = (duty, driver) => {
    if (!duty || !driver) return false;
    const dutyDriverId = duty.driver?._id || duty.driver;
    const driverId = driver._id;
    if (dutyDriverId && driverId && String(dutyDriverId) === String(driverId)) {
        return true;
    }
    const dutyCustomDriver = (duty.customDriverName || duty.driverName || '').trim().toLowerCase();
    const driverName = (driver.name || '').trim().toLowerCase();
    if (dutyCustomDriver && driverName && dutyCustomDriver === driverName) {
        return true;
    }
    return false;
};

// Get clean car display: Number + Model
const getCarDisplay = (duty) => {
    const carNum = duty.vehicle?.carNumber || duty.customCarNumber || duty.carNumber || '';
    const carModel = duty.vehicle?.model || duty.carType || '';
    if (carNum && carModel && !carNum.includes(carModel)) {
        return `${carNum} (${carModel})`;
    }
    return carNum || carModel || 'Car Assigned';
};

export default function DriverLiveDRSCalendar({ isSubComponent = false }) {
    const { selectedCompany } = useCompany();
    const [searchParams] = useSearchParams();

    // Date state in IST
    const todayStr = todayIST(); // 'YYYY-MM-DD'
    const todayParts = todayStr.split('-').map(Number);
    const initialYear = todayParts[0] || new Date().getFullYear();
    const initialMonth = (todayParts[1] ? todayParts[1] - 1 : new Date().getMonth());

    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth); // 0-indexed
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Data lists
    const [duties, setDuties] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    // Filters
    const [selectedDriverId, setSelectedDriverId] = useState('all'); // 'all' or driver._id
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('schedule'); // 'schedule' (Date-Wise Schedule) or 'matrix' (31-Day Fleet Matrix)

    // Deep link from ?driver= query param
    useEffect(() => {
        const drvParam = searchParams.get('driver');
        if (drvParam && drivers.length > 0) {
            const matched = drivers.find(d => 
                (d.name && d.name.toLowerCase() === drvParam.toLowerCase()) ||
                String(d._id) === String(drvParam)
            );
            if (matched) {
                setSelectedDriverId(matched._id);
            }
        }
    }, [searchParams, drivers]);

    // Edit/Delete Modal State
    const [selectedDuty, setSelectedDuty] = useState(null);
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [editFormData, setEditFormData] = useState({
        clientName: '',
        mobileNumber: '',
        hotel: '',
        pickupPoint: '',
        duty: '',
        date: '',
        time: '',
        revenue: '',
        customCarNumber: '',
        customDriverName: '',
        driverId: '',
        vehicleId: '',
        status: 'Assigned',
        guestRemarks: ''
    });

    // Fetch Drivers, Vehicles, and Live DRS Duties
    const fetchData = useCallback(async (isSilent = false) => {
        if (!selectedCompany?._id) return;
        if (!isSilent) setLoading(true);
        setRefreshing(true);

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const authHeader = userInfo.token ? { Authorization: `Bearer ${userInfo.token}` } : {};

            // Calculate start and end date for selected month (+/- 15 day buffer for cross-month multi-day tours)
            const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 15);
            const py = prevMonthDate.getFullYear();
            const pm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
            const pd = String(prevMonthDate.getDate()).padStart(2, '0');
            const fromStr = `${py}-${pm}-${pd}`;

            const nextMonthDate = new Date(selectedYear, selectedMonth + 1, 15);
            const ny = nextMonthDate.getFullYear();
            const nm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
            const nd = String(nextMonthDate.getDate()).padStart(2, '0');
            const toStr = `${ny}-${nm}-${nd}`;

            const [drvRes, vehRes, drsRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&includeAll=true`, { headers: authHeader }).catch(() => ({ data: { drivers: [] } })),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`, { headers: authHeader }).catch(() => ({ data: { vehicles: [] } })),
                axios.get(`/api/drs/${selectedCompany._id}?from=${fromStr}&to=${toStr}`).catch(() => ({ data: [] }))
            ]);

            const drvList = drvRes.data?.drivers || drvRes.data || [];
            const vehList = vehRes.data?.vehicles || vehRes.data || [];
            const drsList = Array.isArray(drsRes.data) ? drsRes.data : [];

            setDrivers(Array.isArray(drvList) ? drvList : []);
            setVehicles(Array.isArray(vehList) ? vehList : []);
            setDuties(drsList);
        } catch (err) {
            console.error('Error fetching Driver Live DRS Calendar data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCompany?._id, selectedYear, selectedMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Days in current selected month
    const daysInMonth = useMemo(() => {
        return new Date(selectedYear, selectedMonth + 1, 0).getDate();
    }, [selectedYear, selectedMonth]);

    // Days array: [{ dayNum: 1, dateStr: '2026-10-01', dayOfWeek: 'Thu' }, ...]
    const monthDays = useMemo(() => {
        const days = [];
        const monthNumStr = String(selectedMonth + 1).padStart(2, '0');
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateStr = `${selectedYear}-${monthNumStr}-${dayStr}`;
            const dateObj = new Date(selectedYear, selectedMonth, d);
            const dayOfWeek = DAY_NAMES[dateObj.getDay()];
            days.push({
                dayNum: d,
                dateStr,
                dayOfWeek,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr
            });
        }
        return days;
    }, [selectedYear, selectedMonth, daysInMonth, todayStr]);

    // Compute duty mappings and driver month KPIs
    const driverRosterData = useMemo(() => {
        // Collect drivers list, including any driver names found in DRS that might not be in DB drivers table
        const combinedDrivers = [...drivers];
        const existingNames = new Set(drivers.map(d => (d.name || '').trim().toLowerCase()));

        duties.forEach(duty => {
            const customName = (duty.customDriverName || duty.driverName || '').trim();
            if (customName && !existingNames.has(customName.toLowerCase())) {
                existingNames.add(customName.toLowerCase());
                combinedDrivers.push({
                    _id: `custom-${customName}`,
                    name: customName,
                    mobile: duty.mobileNumber || duty.driverMobile || '',
                    isCustom: true
                });
            }
        });

        // Filter by search query if present
        const filteredDrivers = combinedDrivers.filter(drv => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (drv.name && drv.name.toLowerCase().includes(q)) ||
                   (drv.mobile && drv.mobile.toLowerCase().includes(q));
        });

        return filteredDrivers.map(driver => {
            // Find all duties for this driver in the selected month
            const driverDuties = duties.filter(duty => {
                if (!duty.date) return false;
                const dutyDateStr = toISTDateString(duty.date);
                const [y, m] = dutyDateStr.split('-').map(Number);
                if (y !== selectedYear || (m - 1) !== selectedMonth) return false;
                return doesDutyMatchDriver(duty, driver);
            });

            // Total rides in this month
            const monthRideCount = driverDuties.length;

            // Unique active days
            const activeDates = new Set(driverDuties.map(d => toISTDateString(d.date)));
            const activeDaysCount = activeDates.size;

            // Total revenue
            const totalRevenue = driverDuties.reduce((acc, d) => acc + (Number(d.revenue) || 0), 0);

            // Distinct cars driven
            const carsDrivenSet = new Set();
            driverDuties.forEach(d => {
                const car = getCarDisplay(d);
                if (car) carsDrivenSet.add(car);
            });

            // Map duties by dateStr for instant lookup in day cells
            const dutiesByDate = {};
            monthDays.forEach(day => {
                dutiesByDate[day.dateStr] = [];
            });

            driverDuties.forEach(d => {
                const dStr = toISTDateString(d.date);
                if (dutiesByDate[dStr]) {
                    dutiesByDate[dStr].push(d);
                }
            });

            return {
                driver,
                monthRideCount,
                activeDaysCount,
                totalRevenue,
                carsDriven: Array.from(carsDrivenSet),
                dutiesByDate,
                totalDuties: driverDuties
            };
        });
    }, [drivers, duties, selectedYear, selectedMonth, monthDays, searchQuery]);

    // Active driver selected for detailed view
    const activeDriverData = useMemo(() => {
        if (selectedDriverId === 'all') return null;
        return driverRosterData.find(item => String(item.driver._id) === String(selectedDriverId)) || null;
    }, [driverRosterData, selectedDriverId]);

    // Overall month statistics for banner
    const overallStats = useMemo(() => {
        let totalRides = 0;
        let totalRevenue = 0;
        let activeDriversCount = 0;

        driverRosterData.forEach(item => {
            totalRides += item.monthRideCount;
            totalRevenue += item.totalRevenue;
            if (item.monthRideCount > 0) activeDriversCount++;
        });

        return {
            totalRides,
            totalRevenue,
            activeDriversCount,
            totalDrivers: driverRosterData.length
        };
    }, [driverRosterData]);

    // Flattened & sorted duties for Date-Wise Schedule view (Date | Guest Details | Car)
    const visibleScheduleDuties = useMemo(() => {
        let list = [];
        if (selectedDriverId !== 'all') {
            list = [...(activeDriverData?.totalDuties || [])];
        } else {
            // Aggregate duties for all drivers in this month
            driverRosterData.forEach(row => {
                (row.totalDuties || []).forEach(d => {
                    if (!list.some(existing => String(existing._id) === String(d._id))) {
                        list.push(d);
                    }
                });
            });
        }

        // Apply search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(d => 
                (d.clientName && d.clientName.toLowerCase().includes(q)) ||
                (d.duty && d.duty.toLowerCase().includes(q)) ||
                (d.customDriverName && d.customDriverName.toLowerCase().includes(q)) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(q)) ||
                (d.customCarNumber && d.customCarNumber.toLowerCase().includes(q)) ||
                (d.vehicle?.carNumber && d.vehicle.carNumber.toLowerCase().includes(q)) ||
                (d.hotel && d.hotel.toLowerCase().includes(q)) ||
                (d.pickupPoint && d.pickupPoint.toLowerCase().includes(q)) ||
                (d.bookingId && d.bookingId.toLowerCase().includes(q))
            );
        }

        // Sort strictly by Date ascending, then by Time
        return list.sort((a, b) => {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            if (da !== db) return da - db;
            return String(a.time || '').localeCompare(String(b.time || ''));
        });
    }, [selectedDriverId, activeDriverData, driverRosterData, searchQuery]);

    // Month Navigation
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

    // Open duty details / edit modal
    const openDutyModal = (duty) => {
        setSelectedDuty(duty);
        setModalError('');
        const dutyDateStr = duty.date ? toISTDateString(duty.date) : todayStr;
        const matchedDriver = drivers.find(d => doesDutyMatchDriver(duty, d));
        const matchedVehicle = vehicles.find(v =>
            (duty.vehicle?._id && String(v._id) === String(duty.vehicle._id)) ||
            (duty.customCarNumber && v.carNumber && v.carNumber.trim().toLowerCase() === duty.customCarNumber.trim().toLowerCase())
        );

        setEditFormData({
            clientName: duty.clientName || '',
            mobileNumber: duty.mobileNumber || '',
            hotel: duty.hotel || '',
            pickupPoint: duty.pickupPoint || '',
            duty: duty.duty || duty.itinerary || '',
            date: dutyDateStr,
            time: duty.time || '10:00 AM',
            revenue: duty.revenue !== undefined ? duty.revenue : '',
            customCarNumber: duty.customCarNumber || (matchedVehicle ? matchedVehicle.carNumber : ''),
            customDriverName: duty.customDriverName || (matchedDriver ? matchedDriver.name : ''),
            driverId: matchedDriver ? matchedDriver._id : (duty.driver?._id || ''),
            vehicleId: matchedVehicle ? matchedVehicle._id : (duty.vehicle?._id || ''),
            status: duty.status || 'Assigned',
            guestRemarks: duty.guestRemarks || ''
        });

        setShowDutyModal(true);
    };

    // Save duty edits directly to Live DRS (/api/drs/:id)
    const handleSaveDuty = async (e) => {
        e?.preventDefault();
        if (!selectedDuty?._id) return;
        setIsSaving(true);
        setModalError('');

        try {
            const matchedFleetDriver = drivers.find(d => String(d._id) === String(editFormData.driverId));
            const matchedFleetVehicle = vehicles.find(v => String(v._id) === String(editFormData.vehicleId));

            const payload = {
                clientName: editFormData.clientName,
                mobileNumber: editFormData.mobileNumber,
                hotel: editFormData.hotel,
                pickupPoint: editFormData.pickupPoint,
                duty: editFormData.duty,
                itinerary: editFormData.duty,
                date: editFormData.date,
                time: editFormData.time,
                revenue: Number(editFormData.revenue) || 0,
                status: editFormData.status,
                guestRemarks: editFormData.guestRemarks,
                driver: matchedFleetDriver ? matchedFleetDriver._id : (editFormData.driverId || null),
                customDriverName: matchedFleetDriver ? matchedFleetDriver.name : (editFormData.customDriverName || ''),
                vehicle: matchedFleetVehicle ? matchedFleetVehicle._id : (editFormData.vehicleId || null),
                customCarNumber: matchedFleetVehicle ? matchedFleetVehicle.carNumber : (editFormData.customCarNumber || '')
            };

            await axios.put(`/api/drs/${selectedDuty._id}`, payload);
            await fetchData(true);
            setShowDutyModal(false);
        } catch (err) {
            console.error('Error updating Live DRS duty:', err);
            setModalError(err.response?.data?.message || 'Failed to update duty in Live DRS. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete duty directly from Live DRS (/api/drs/:id)
    const handleDeleteDuty = async (dutyParam = null) => {
        const target = dutyParam || selectedDuty;
        if (!target?._id) return;
        const guestName = target.clientName || 'Guest';
        const dateFormatted = target.date ? toISTDateString(target.date) : '';
        if (!window.confirm(`Are you sure you want to delete this duty for "${guestName}" (${dateFormatted})? This will remove it from Live DRS permanently.`)) {
            return;
        }

        setIsDeleting(true);
        setModalError('');

        try {
            await axios.delete(`/api/drs/${target._id}`);
            await fetchData(true);
            setShowDutyModal(false);
            setSelectedDuty(null);
        } catch (err) {
            console.error('Error deleting Live DRS duty:', err);
            setModalError(err.response?.data?.message || 'Failed to delete duty. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Quick Add Duty for a specific driver and day
    const handleQuickAddForDriver = (driver, dateStr) => {
        setSelectedDuty({ _id: null, isNew: true });
        setModalError('');
        setEditFormData({
            clientName: '',
            mobileNumber: '',
            hotel: '',
            pickupPoint: '',
            duty: 'Local Sightseeing',
            date: dateStr,
            time: '10:00 AM',
            revenue: '',
            customCarNumber: '',
            customDriverName: driver.name || '',
            driverId: driver._id.startsWith('custom-') ? '' : driver._id,
            vehicleId: '',
            status: 'Assigned',
            guestRemarks: ''
        });
        setShowDutyModal(true);
    };

    // Handle Create new duty
    const handleCreateDuty = async (e) => {
        e?.preventDefault();
        setIsSaving(true);
        setModalError('');

        try {
            const matchedFleetDriver = drivers.find(d => String(d._id) === String(editFormData.driverId));
            const matchedFleetVehicle = vehicles.find(v => String(v._id) === String(editFormData.vehicleId));

            const payload = {
                company: selectedCompany?._id,
                clientName: editFormData.clientName || 'Guest',
                mobileNumber: editFormData.mobileNumber || '',
                hotel: editFormData.hotel || '',
                pickupPoint: editFormData.pickupPoint || '',
                duty: editFormData.duty || 'City Duty',
                itinerary: editFormData.duty || 'City Duty',
                date: editFormData.date || todayStr,
                time: editFormData.time || '10:00 AM',
                revenue: Number(editFormData.revenue) || 0,
                status: editFormData.status || 'Assigned',
                guestRemarks: editFormData.guestRemarks || '',
                driver: matchedFleetDriver ? matchedFleetDriver._id : (editFormData.driverId || null),
                customDriverName: matchedFleetDriver ? matchedFleetDriver.name : (editFormData.customDriverName || ''),
                vehicle: matchedFleetVehicle ? matchedFleetVehicle._id : (editFormData.vehicleId || null),
                customCarNumber: matchedFleetVehicle ? matchedFleetVehicle.carNumber : (editFormData.customCarNumber || '')
            };

            await axios.post('/api/drs', payload);
            await fetchData(true);
            setShowDutyModal(false);
        } catch (err) {
            console.error('Error creating Live DRS duty:', err);
            setModalError(err.response?.data?.message || 'Failed to create duty in Live DRS.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            background: '#0d131f',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            color: '#e2e8f0',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            marginBottom: '40px'
        }}>
            {/* TOP HEADER CONTROLS */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '18px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                {/* Title & Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)'
                    }}>
                        <CalendarIcon size={24} color="#ffffff" />
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{
                                fontSize: '22px',
                                fontWeight: '950',
                                margin: 0,
                                letterSpacing: '-0.3px',
                                color: '#ffffff'
                            }}>
                                DRIVER LIVE DRS <span style={{ color: '#fbbf24' }}>ROSTER</span>
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                background: 'rgba(251, 191, 36, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontWeight: '800',
                                letterSpacing: '0.5px'
                            }}>
                                1 — 31 DAYS
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                            Live monthly duty schedule by driver with guest & vehicle details synced with Live DRS
                        </p>
                    </div>
                </div>

                {/* Month/Year Selector & Refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Month Picker Controls */}
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
                            title="Previous Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div style={{
                            padding: '4px 14px',
                            fontWeight: '900',
                            fontSize: '14px',
                            color: '#ffffff',
                            letterSpacing: '0.3px',
                            minWidth: '140px',
                            textAlign: 'center'
                        }}>
                            {MONTH_NAMES[selectedMonth]} {selectedYear}
                        </div>

                        <button
                            onClick={handleNextMonth}
                            title="Next Month"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleJumpToCurrent}
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            color: '#cbd5e1',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                    >
                        Today
                    </button>

                    {/* View Mode Toggle: Date-Wise Schedule vs 31-Day Matrix */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        padding: '3px',
                        gap: '2px'
                    }}>
                        <button
                            type="button"
                            onClick={() => setViewMode('schedule')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '9px',
                                border: 'none',
                                background: viewMode === 'schedule' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                                color: viewMode === 'schedule' ? '#000000' : '#94a3b8',
                                fontWeight: '900',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <ListFilter size={14} />
                            Date-Wise Schedule
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode('matrix')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '9px',
                                border: 'none',
                                background: viewMode === 'matrix' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                                color: viewMode === 'matrix' ? '#ffffff' : '#94a3b8',
                                fontWeight: '900',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Grid size={14} />
                            31-Day Fleet Matrix
                        </button>
                    </div>

                    <button
                        onClick={() => fetchData(false)}
                        disabled={refreshing}
                        style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            color: '#10b981',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Syncing...' : 'Sync Live DRS'}
                    </button>
                </div>
            </div>

            {/* SUMMARY STATS STRIP */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '16px 20px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Drivers
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '950', color: '#38bdf8', marginTop: '6px' }}>
                        {overallStats.totalDrivers} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>({overallStats.activeDriversCount} active on duty)</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '16px 20px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Rides This Month
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '950', color: '#4ade80', marginTop: '6px' }}>
                        {overallStats.totalRides} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Rides in {MONTH_NAMES[selectedMonth].slice(0, 3)}</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '16px 20px'
                }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Selected Driver Filter
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#f59e0b', marginTop: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {activeDriverData ? activeDriverData.driver.name : 'All Fleet Drivers'}
                        {activeDriverData && (
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', marginLeft: '8px' }}>
                                ({activeDriverData.monthRideCount} Rides)
                            </span>
                        )}
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '16px',
                    padding: '16px 20px'
                }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Duty Fare / Rev
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '950', color: '#fef08a', marginTop: '6px' }}>
                        ₹{(activeDriverData ? activeDriverData.totalRevenue : overallStats.totalRevenue).toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            {/* DRIVER SELECTION TABS & SEARCH BAR */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                marginBottom: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '14px 18px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="#fbbf24" />
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Filter Driver (Shows Monthly Rides Count)
                        </span>
                    </div>

                    {/* Search Input */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        width: '260px',
                        maxWidth: '100%'
                    }}>
                        <Search size={14} color="#94a3b8" style={{ marginRight: '8px' }} />
                        <input
                            type="text"
                            placeholder="Search driver by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '12px',
                                outline: 'none',
                                width: '100%'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Driver Pills Carousel */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '6px',
                    scrollbarWidth: 'thin'
                }}>
                    {/* All Drivers Button */}
                    <button
                        onClick={() => setSelectedDriverId('all')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            border: selectedDriverId === 'all' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: selectedDriverId === 'all' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            color: selectedDriverId === 'all' ? '#fbbf24' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: '800',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Layers size={14} />
                        All Drivers Matrix
                        <span style={{
                            background: selectedDriverId === 'all' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                            color: selectedDriverId === 'all' ? '#000000' : '#cbd5e1',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '900'
                        }}>
                            {overallStats.totalRides} Rides
                        </span>
                    </button>

                    {/* Individual Driver Pills */}
                    {driverRosterData.map(item => {
                        const isSelected = String(item.driver._id) === String(selectedDriverId);
                        const rides = item.monthRideCount;
                        return (
                            <button
                                key={item.driver._id}
                                onClick={() => setSelectedDriverId(isSelected ? 'all' : item.driver._id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 14px',
                                    borderRadius: '12px',
                                    border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                                    color: isSelected ? '#38bdf8' : '#e2e8f0',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: rides > 0 ? '#10b981' : '#64748b',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: '900'
                                }}>
                                    {item.driver.name ? item.driver.name.charAt(0).toUpperCase() : 'D'}
                                </span>
                                <span>{item.driver.name}</span>
                                <span style={{
                                    background: rides > 0 ? (isSelected ? '#38bdf8' : '#10b981') : 'rgba(255, 255, 255, 0.08)',
                                    color: rides > 0 ? (isSelected ? '#000000' : '#ffffff') : '#94a3b8',
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '900'
                                }}>
                                    {rides} {rides === 1 ? 'Ride' : 'Rides'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SINGLE DRIVER BANNER (When a specific driver is selected) */}
            {activeDriverData && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#38bdf8',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '950',
                            fontSize: '18px'
                        }}>
                            {activeDriverData.driver.name ? activeDriverData.driver.name.charAt(0).toUpperCase() : 'D'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
                                    {activeDriverData.driver.name}
                                </span>
                                {activeDriverData.driver.mobile && (
                                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Phone size={12} /> {activeDriverData.driver.mobile}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                <span>📅 <strong>{activeDriverData.activeDaysCount}</strong> Active Days on Duty</span>
                                <span>🚗 <strong>{activeDriverData.carsDriven.length > 0 ? activeDriverData.carsDriven.join(', ') : 'No vehicle logged'}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: '#a7f3d0', fontWeight: '800', textTransform: 'uppercase' }}>Month Total Rides</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#10b981' }}>{activeDriverData.monthRideCount} Rides</div>
                        </div>

                        <button
                            onClick={() => setSelectedDriverId('all')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ✕ Clear Filter
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW MODE 1: DATE-WISE SCHEDULE (Date | Guest Details | Car | Fare | Actions) */}
            {viewMode === 'schedule' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Header Columns Bar */}
                    <div style={{
                        display: 'none',
                        gridTemplateColumns: '170px 1fr 240px 140px 120px',
                        gap: '16px',
                        padding: '12px 20px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '14px',
                        color: '#94a3b8',
                        fontSize: '11px',
                        fontWeight: '900',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase'
                    }} className="desktop-schedule-header">
                        <div>📅 Date & Time</div>
                        <div>👤 Guest Details & Itinerary</div>
                        <div>🚗 Car (Konsi Car Hai Driver Ke Pass)</div>
                        <div style={{ textAlign: 'right' }}>💰 Fare & Status</div>
                        <div style={{ textAlign: 'center' }}>⚡ Actions</div>
                    </div>

                    {/* Schedule Duties List */}
                    {visibleScheduleDuties.length === 0 ? (
                        <div style={{
                            background: '#131b2e',
                            border: '1px solid #2d3748',
                            borderRadius: '16px',
                            padding: '60px 24px',
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <CalendarIcon size={52} color="#fbbf24" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
                                No Duties Found for {activeDriverData ? activeDriverData.driver.name : 'Selected Filter'} in {MONTH_NAMES[selectedMonth]} {selectedYear}
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '440px', margin: '0 auto 18px' }}>
                                There are no Live DRS duties matching this month and driver filter. You can add a duty or switch months above.
                            </div>
                            {activeDriverData && (
                                <button
                                    onClick={() => handleQuickAddForDriver(activeDriverData.driver, `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`)}
                                    style={{
                                        background: '#10b981',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 18px',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + Add Duty for {activeDriverData.driver.name}
                                </button>
                            )}
                        </div>
                    ) : (
                        visibleScheduleDuties.map((duty, idx) => {
                            const theme = getThemeForDuty(duty);
                            const dutyDateStr = duty.date ? toISTDateString(duty.date) : '';
                            const dutyDateParts = dutyDateStr.split('-').map(Number);
                            const dayNum = dutyDateParts[2] ? String(dutyDateParts[2]).padStart(2, '0') : '01';
                            const dayObj = new Date(dutyDateParts[0], (dutyDateParts[1] || 1) - 1, dutyDateParts[2] || 1);
                            const weekday = DAY_NAMES[dayObj.getDay()] || '';
                            const isToday = dutyDateStr === todayStr;

                            const carDisplay = getCarDisplay(duty);
                            const driverName = duty.driver?.name || duty.customDriverName || 'Driver Assigned';

                            return (
                                <div
                                    key={duty._id || idx}
                                    style={{
                                        background: isToday
                                            ? 'linear-gradient(135deg, rgba(3, 105, 161, 0.22) 0%, #131b2e 100%)'
                                            : '#131b2e',
                                        border: isToday ? '1.5px solid #38bdf8' : '1px solid #2d3748',
                                        borderLeft: `6px solid ${theme.bg}`,
                                        borderRadius: '16px',
                                        padding: '16px 20px',
                                        boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {/* Master Calendar Package Theme Top Banner */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        marginBottom: '12px',
                                        paddingBottom: '10px',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {/* Color theme tour tag matching Master Fleet Calendar */}
                                            <span style={{
                                                background: theme.bg,
                                                color: theme.text,
                                                border: `1px solid ${theme.border}`,
                                                padding: '3px 10px',
                                                borderRadius: '7px',
                                                fontSize: '11px',
                                                fontWeight: '900',
                                                letterSpacing: '0.4px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                ● {duty.duty || duty.itinerary || 'Sightseeing Duty'}
                                            </span>

                                            {isToday && (
                                                <span style={{
                                                    background: '#0284c7',
                                                    color: '#ffffff',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    fontWeight: '900',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    ● TODAY'S LIVE DUTY
                                                </span>
                                            )}

                                            {duty.bookingId && (
                                                <span style={{
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    color: '#fbbf24',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '800'
                                                }}>
                                                    Booking: {duty.bookingId}
                                                </span>
                                            )}

                                            {duty.dayNo && (
                                                <span style={{
                                                    background: 'rgba(168, 85, 247, 0.2)',
                                                    color: '#c084fc',
                                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                                    padding: '2px 7px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    fontWeight: '800'
                                                }}>
                                                    Day {duty.dayNo}
                                                </span>
                                            )}

                                            {selectedDriverId === 'all' && (
                                                <span style={{
                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                    color: '#38bdf8',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <User size={12} /> {driverName}
                                                </span>
                                            )}
                                        </div>

                                        {/* Duty Time */}
                                        <div style={{
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            color: '#e2e8f0',
                                            padding: '3px 10px',
                                            borderRadius: '8px',
                                            fontSize: '11.5px',
                                            fontWeight: '800',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <Clock size={12} color="#38bdf8" />
                                            {duty.time || '10:00 AM'}
                                        </div>
                                    </div>

                                    {/* 3 Explicit Columns: Date | Guest Details | Car | Fare | Actions */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '14px',
                                        alignItems: 'stretch'
                                    }}>
                                        {/* 1. DATE */}
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minWidth: '140px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    📅 DATE
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                    <span style={{ fontSize: '28px', fontWeight: '950', color: isToday ? '#38bdf8' : '#ffffff', lineHeight: 1 }}>
                                                        {dayNum}
                                                    </span>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#e2e8f0' }}>{weekday}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            {MONTH_NAMES[selectedMonth]?.slice(0, 3)} {selectedYear}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11px', color: '#cbd5e1' }}>
                                                Pickup: <strong>{duty.time || '10:00 AM'}</strong>
                                            </div>
                                        </div>

                                        {/* 2. GUEST DETAILS */}
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            flex: 2,
                                            minWidth: '220px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    👤 GUEST DETAILS & ROUTE
                                                </div>
                                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>
                                                    {duty.clientName || 'Guest'}
                                                </div>

                                                {(duty.hotel || duty.pickupPoint) && (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                                                        <MapPin size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                        <div>
                                                            {duty.hotel && <span>Hotel: <strong style={{ color: '#ffffff' }}>{duty.hotel}</strong> </span>}
                                                            {duty.pickupPoint && duty.pickupPoint !== duty.hotel && (
                                                                <span>| Pickup: <strong style={{ color: '#ffffff' }}>{duty.pickupPoint}</strong></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {duty.guestRemarks && (
                                                    <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.03)', padding: '5px 8px', borderRadius: '6px', borderLeft: '3px solid #fbbf24' }}>
                                                        Note: {duty.guestRemarks}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                {duty.mobileNumber ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <a
                                                            href={`tel:${duty.mobileNumber}`}
                                                            style={{
                                                                background: '#10b981',
                                                                color: '#ffffff',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Phone size={11} /> Call ({duty.mobileNumber})
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/91${duty.mobileNumber.replace(/\D/g, '').slice(-10)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                background: 'rgba(37, 211, 102, 0.15)',
                                                                color: '#25D366',
                                                                border: '1px solid rgba(37, 211, 102, 0.35)',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            💬 WhatsApp
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>No mobile provided</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. CAR (KONSI CAR HAI DRIVER KE PASS) */}
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minWidth: '180px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                    🚗 CAR (KONSI CAR HAI PASS)
                                                </div>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: '#0f172a',
                                                    border: '1.5px solid #38bdf8',
                                                    padding: '5px 10px',
                                                    borderRadius: '8px',
                                                    marginBottom: '6px'
                                                }}>
                                                    <Car size={14} color="#38bdf8" />
                                                    <span style={{ fontSize: '13px', fontWeight: '950', color: '#ffffff', fontFamily: 'monospace' }}>
                                                        {duty.vehicle?.carNumber || duty.customCarNumber || 'CAR ASSIGNED'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>
                                                    {duty.vehicle?.model || duty.carType || 'Fleet Cab'}
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11px', color: '#94a3b8' }}>
                                                Driver: <strong style={{ color: '#ffffff' }}>{driverName}</strong>
                                            </div>
                                        </div>

                                        {/* 4. FARE & STATUS */}
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minWidth: '120px',
                                            textAlign: 'right'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    FARE / REVENUE
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: '950', color: '#fef08a' }}>
                                                    ₹{(Number(duty.revenue) || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>

                                            <div>
                                                <span style={{
                                                    background: duty.status === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                                    color: duty.status === 'Completed' ? '#34d399' : '#38bdf8',
                                                    border: duty.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '10.5px',
                                                    fontWeight: '900',
                                                    display: 'inline-block'
                                                }}>
                                                    ● {duty.status || 'Assigned'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 5. ACTIONS: Real-Time Live DRS Edit & Delete */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            minWidth: '100px'
                                        }}>
                                            <button
                                                onClick={() => openDutyModal(duty)}
                                                title="Edit Live DRS Duty"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                                    color: '#38bdf8',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
                                            >
                                                <Edit2 size={13} /> Edit DRS
                                            </button>

                                            <button
                                                onClick={() => handleDeleteDuty(duty)}
                                                title="Delete from Live DRS"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: '#f87171',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                                            >
                                                <Trash2 size={13} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* THE MASTER 1-31 ROSTER TABLE (Matrix Mode) */
                <div style={{
                maxHeight: 'calc(100vh - 280px)',
                overflowX: 'auto',
                overflowY: 'auto',
                border: '1px solid #2d3748',
                borderRadius: '16px',
                background: '#131b2e',
                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontSize: '11px',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                }}>
                    <thead>
                        {/* Table Header: Driver Column + Days 1 to 31 */}
                        <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                            {/* Sticky Left Driver Column Header */}
                            <th style={{
                                position: 'sticky',
                                top: 0,
                                left: 0,
                                zIndex: 40,
                                background: '#1e293b',
                                padding: '12px 14px',
                                borderRight: '2px solid #334155',
                                borderBottom: '2px solid #475569',
                                width: '220px',
                                minWidth: '220px',
                                maxWidth: '220px',
                                fontWeight: '900',
                                textAlign: 'left',
                                fontSize: '12px',
                                letterSpacing: '0.5px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>DRIVER PROFILE</span>
                                    <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '800' }}>MONTH RIDES</span>
                                </div>
                            </th>

                            {/* 1 to 31 Day Headers */}
                            {monthDays.map(day => (
                                <th
                                    key={day.dayNum}
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 30,
                                        background: day.isToday ? '#0369a1' : '#1e293b',
                                        padding: '8px 10px',
                                        borderRight: '1px solid #334155',
                                        borderBottom: '2px solid #475569',
                                        minWidth: '190px',
                                        width: '190px',
                                        textAlign: 'center',
                                        color: day.isToday ? '#ffffff' : '#cbd5e1'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '900',
                                            color: day.isToday ? '#ffffff' : (day.dayOfWeek === 'Sun' ? '#f87171' : '#e2e8f0')
                                        }}>
                                            Day {String(day.dayNum).padStart(2, '0')}
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            color: day.isToday ? '#bae6fd' : '#94a3b8',
                                            textTransform: 'uppercase'
                                        }}>
                                            {day.dayOfWeek}
                                            {day.isToday && (
                                                <span style={{
                                                    marginLeft: '4px',
                                                    background: '#38bdf8',
                                                    color: '#000000',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    fontSize: '9px',
                                                    fontWeight: '900'
                                                }}>
                                                    TODAY
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {/* Display Driver Rows */}
                        {(activeDriverData ? [activeDriverData] : driverRosterData).length === 0 ? (
                            <tr>
                                <td colSpan={monthDays.length + 1} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <AlertCircle size={32} style={{ margin: '0 auto 10px', color: '#f59e0b' }} />
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>No Drivers Found</div>
                                    <div style={{ fontSize: '13px', marginTop: '4px' }}>Try clearing the search query or adding drivers in Drivers Hub.</div>
                                </td>
                            </tr>
                        ) : (
                            (activeDriverData ? [activeDriverData] : driverRosterData).map((row, rIdx) => {
                                const isOdd = rIdx % 2 === 1;
                                const rowBg = isOdd ? 'rgba(255, 255, 255, 0.015)' : 'transparent';
                                const ridesCount = row.monthRideCount;

                                return (
                                    <tr key={row.driver._id} style={{ background: rowBg }}>
                                        {/* Sticky Left Column: Driver Info & Monthly Rides Badge */}
                                        <td style={{
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 20,
                                            background: '#131b2e',
                                            padding: '12px 14px',
                                            borderRight: '2px solid #334155',
                                            borderBottom: '1px solid #2d3748',
                                            verticalAlign: 'top',
                                            boxShadow: '4px 0 10px rgba(0, 0, 0, 0.3)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {/* Driver Name & Badge */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff' }}>
                                                        {row.driver.name}
                                                    </div>
                                                    <span style={{
                                                        background: ridesCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                                        color: ridesCount > 0 ? '#10b981' : '#94a3b8',
                                                        border: ridesCount > 0 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '900',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {ridesCount} {ridesCount === 1 ? 'Ride' : 'Rides'}
                                                    </span>
                                                </div>

                                                {/* Driver Phone & Cars Summary */}
                                                {row.driver.mobile && (
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={11} /> {row.driver.mobile}
                                                    </div>
                                                )}

                                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                                    {row.activeDaysCount > 0 ? (
                                                        <span>{row.activeDaysCount} active duty days</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>No duty this month</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Day Cells: 1 to 31 */}
                                        {monthDays.map(day => {
                                            const dayDuties = row.dutiesByDate[day.dateStr] || [];
                                            const hasDuty = dayDuties.length > 0;

                                            return (
                                                <td
                                                    key={day.dayNum}
                                                    style={{
                                                        padding: '8px',
                                                        borderRight: '1px solid #2d3748',
                                                        borderBottom: '1px solid #2d3748',
                                                        verticalAlign: 'top',
                                                        background: day.isToday ? 'rgba(3, 105, 161, 0.06)' : 'transparent',
                                                        height: '100px'
                                                    }}
                                                >
                                                    {hasDuty ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {dayDuties.map(duty => {
                                                                const theme = getThemeForDuty(duty);
                                                                const carDisplay = getCarDisplay(duty);

                                                                return (
                                                                    <div
                                                                        key={duty._id}
                                                                        onClick={() => openDutyModal(duty)}
                                                                        title="Click to view, edit or delete in Live DRS"
                                                                        style={{
                                                                            background: 'rgba(15, 23, 42, 0.95)',
                                                                            border: `1.5px solid ${theme.border}`,
                                                                            borderRadius: '10px',
                                                                            overflow: 'hidden',
                                                                            cursor: 'pointer',
                                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                                                        }}
                                                                        onMouseEnter={e => {
                                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                                            e.currentTarget.style.boxShadow = `0 6px 16px ${theme.bg}40`;
                                                                        }}
                                                                        onMouseLeave={e => {
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                                                                        }}
                                                                    >
                                                                        {/* ROW 1: RIDE NAME / PACKAGE BADGE WITH MASTER CALENDAR COLOR THEME */}
                                                                        <div style={{
                                                                            background: theme.bg,
                                                                            color: theme.text,
                                                                            padding: '5px 8px',
                                                                            fontSize: '11px',
                                                                            fontWeight: '900',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            borderBottom: `1px solid ${theme.border}`,
                                                                            letterSpacing: '0.2px'
                                                                        }}>
                                                                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                                                                                {duty.duty || duty.itinerary || 'Duty'}
                                                                            </span>
                                                                            {duty.dayNo && (
                                                                                <span style={{
                                                                                    background: theme.badgeBg,
                                                                                    color: theme.badgeText,
                                                                                    padding: '1px 5px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '9px',
                                                                                    fontWeight: '800'
                                                                                }}>
                                                                                    Day {duty.dayNo}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* ROW 2: GUEST DETAILS (GUEST NAME, HOTEL / PICKUP, TIME) */}
                                                                        <div style={{
                                                                            padding: '6px 8px',
                                                                            background: 'rgba(0, 0, 0, 0.25)',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '3px'
                                                                        }}>
                                                                            {/* Guest Name */}
                                                                            <div style={{
                                                                                fontWeight: '800',
                                                                                fontSize: '11px',
                                                                                color: '#ffffff',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}>
                                                                                <User size={11} color="#38bdf8" />
                                                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                                    {duty.clientName || 'Guest'}
                                                                                </span>
                                                                            </div>

                                                                            {/* Hotel / Pickup & Time */}
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                fontSize: '10px',
                                                                                color: '#94a3b8'
                                                                            }}>
                                                                                <span style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px',
                                                                                    textOverflow: 'ellipsis',
                                                                                    overflow: 'hidden',
                                                                                    whiteSpace: 'nowrap',
                                                                                    maxWidth: '100px'
                                                                                }}>
                                                                                    <MapPin size={10} color="#f59e0b" />
                                                                                    {duty.hotel || duty.pickupPoint || 'Office'}
                                                                                </span>
                                                                                <span style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '2px',
                                                                                    color: '#fbbf24',
                                                                                    fontWeight: '700'
                                                                                }}>
                                                                                    <Clock size={10} />
                                                                                    {duty.time || '10:00 AM'}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* ROW 3: CAR DETAILS (LAST ROW - CAR NUMBER & MODEL) */}
                                                                        <div style={{
                                                                            padding: '5px 8px',
                                                                            fontSize: '10.5px',
                                                                            fontWeight: '800',
                                                                            color: '#38bdf8',
                                                                            background: 'rgba(56, 189, 248, 0.08)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}>
                                                                            <Car size={11} color="#38bdf8" />
                                                                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                                {carDisplay}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => handleQuickAddForDriver(row.driver, day.dateStr)}
                                                            title="Driver free — Click to schedule duty in Live DRS"
                                                            style={{
                                                                height: '100%',
                                                                minHeight: '70px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderRadius: '8px',
                                                                color: 'rgba(255, 255, 255, 0.15)',
                                                                fontSize: '12px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                                e.currentTarget.style.color = '#38bdf8';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.background = 'transparent';
                                                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.15)';
                                                            }}
                                                        >
                                                            + Add Duty
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            )}

            {/* LIVE DRS DUTY VIEW / EDIT / DELETE MODAL */}
            <AnimatePresence>
                {showDutyModal && selectedDuty && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: '#0f172a',
                                borderRadius: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                width: '100%',
                                maxWidth: '650px',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.02)'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: '900' }}>
                                            {selectedDuty.isNew ? 'Create Live DRS Duty' : 'Edit Live DRS Duty'}
                                        </h3>
                                        <span style={{
                                            fontSize: '11px',
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            color: '#10b981',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontWeight: '800'
                                        }}>
                                            Live DRS Synced
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '12px' }}>
                                        {selectedDuty.bookingId ? `Linked to Booking #${selectedDuty.bookingId}` : 'Changes update Live DRS & Master Calendar in real-time'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowDutyModal(false)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#cbd5e1',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body Form */}
                            <form
                                onSubmit={selectedDuty.isNew ? handleCreateDuty : handleSaveDuty}
                                style={{
                                    padding: '20px 24px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                }}
                            >
                                {modalError && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#f87171',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <AlertCircle size={16} />
                                        <span>{modalError}</span>
                                    </div>
                                )}

                                {/* Row 1: Guest Name & Mobile */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            👤 Guest Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editFormData.clientName}
                                            onChange={e => setEditFormData({ ...editFormData, clientName: e.target.value })}
                                            placeholder="Enter guest name"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            📞 Mobile Number
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.mobileNumber}
                                            onChange={e => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                                            placeholder="Guest contact number"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Hotel & Pickup Point */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            🏨 Hotel / Destination
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.hotel}
                                            onChange={e => setEditFormData({ ...editFormData, hotel: e.target.value })}
                                            placeholder="Hotel name or city"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            📍 Pickup Point
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.pickupPoint}
                                            onChange={e => setEditFormData({ ...editFormData, pickupPoint: e.target.value })}
                                            placeholder="Airport, Railway Station, Office"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Duty Description */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                        📝 Duty / Route Details *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.duty}
                                        onChange={e => setEditFormData({ ...editFormData, duty: e.target.value })}
                                        placeholder="e.g. Airport Drop, Kumbhalgarh Day Tour, City Sightseeing"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '10px',
                                            color: '#ffffff',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Row 4: Date, Time & Revenue */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            📅 Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={editFormData.date}
                                            onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            ⏰ Time
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.time}
                                            onChange={e => setEditFormData({ ...editFormData, time: e.target.value })}
                                            placeholder="10:00 AM"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            💰 Revenue (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={editFormData.revenue}
                                            onChange={e => setEditFormData({ ...editFormData, revenue: e.target.value })}
                                            placeholder="Duty fare"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 5: Driver Assignment */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            👤 Fleet Driver
                                        </label>
                                        <select
                                            value={editFormData.driverId}
                                            onChange={e => {
                                                const dId = e.target.value;
                                                const d = drivers.find(dr => String(dr._id) === String(dId));
                                                setEditFormData({
                                                    ...editFormData,
                                                    driverId: dId,
                                                    customDriverName: d ? d.name : editFormData.customDriverName
                                                });
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: '#1e293b',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="">-- Select Fleet Driver --</option>
                                            {drivers.map(d => (
                                                <option key={d._id} value={d._id}>{d.name} {d.mobile ? `(${d.mobile})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            ✏️ Or Custom Driver Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.customDriverName}
                                            onChange={e => setEditFormData({ ...editFormData, customDriverName: e.target.value })}
                                            placeholder="Enter driver name"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 6: Vehicle Assignment */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            🚗 Fleet Vehicle
                                        </label>
                                        <select
                                            value={editFormData.vehicleId}
                                            onChange={e => {
                                                const vId = e.target.value;
                                                const v = vehicles.find(vh => String(vh._id) === String(vId));
                                                setEditFormData({
                                                    ...editFormData,
                                                    vehicleId: vId,
                                                    customCarNumber: v ? v.carNumber : editFormData.customCarNumber
                                                });
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: '#1e293b',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="">-- Select Fleet Vehicle --</option>
                                            {vehicles.map(v => (
                                                <option key={v._id} value={v._id}>{v.carNumber} - {v.model || v.brand}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                            ✏️ Or Custom Car Number
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.customCarNumber}
                                            onChange={e => setEditFormData({ ...editFormData, customCarNumber: e.target.value })}
                                            placeholder="RJ-27-TA-9053"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 7: Duty Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '6px' }}>
                                        ⚡ Duty Status
                                    </label>
                                    <select
                                        value={editFormData.status}
                                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: '#1e293b',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '10px',
                                            color: '#ffffff',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Assigned">Assigned</option>
                                        <option value="Ongoing">Ongoing / Started</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Modal Actions */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '16px',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                    marginTop: '8px'
                                }}>
                                    {!selectedDuty.isNew && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteDuty}
                                            disabled={isDeleting || isSaving}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: '#f87171',
                                                padding: '10px 18px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                                        >
                                            <Trash2 size={16} />
                                            {isDeleting ? 'Deleting...' : 'Delete Duty'}
                                        </button>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowDutyModal(false)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                color: '#cbd5e1',
                                                padding: '10px 18px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isSaving || isDeleting}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                border: 'none',
                                                color: '#ffffff',
                                                padding: '10px 22px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '900',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                            }}
                                        >
                                            <Check size={16} />
                                            {isSaving ? 'Saving to DRS...' : (selectedDuty.isNew ? 'Create Live DRS Duty' : 'Save Changes')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
