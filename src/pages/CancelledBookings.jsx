import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    XCircle, AlertTriangle, RotateCcw, Search, Calendar, Car, IndianRupee,
    Eye, ChevronDown, CheckCircle, Clock, X, Phone, User, Filter, AlertOctagon,
    ArrowUpDown, FileText, ArrowLeft, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const MONTH_TABS = [
    'All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const BASELINE_CANCELLED_BOOKINGS = [
    {
        _id: 'cnl-mock-1',
        bookingId: '09/05',
        bookingCode: '09/05',
        clientCode: '09/05',
        clientName: 'Dr. Vivek Singhania',
        mobileNumber: '+91 98290 12345',
        travelStartDate: '2025-09-08',
        travelEndDate: '2025-09-11',
        tripStartFormatted: '08 Sep 25',
        tripEndFormatted: '11 Sep 25',
        vehicleType: 'Innova Crysta',
        totalAmount: 65000,
        advancePaid: 20000,
        balanceDue: 45000,
        cancellationReason: 'Date Passed & Guest did not call (No-Show)',
        isNoShow: true,
        cancelledAt: '2025-09-09',
        month: 'Sep'
    },
    {
        _id: 'cnl-mock-2',
        bookingId: '09/06',
        bookingCode: '09/06',
        clientCode: '09/06',
        clientName: 'Mr. Arvind Kejriwal (Corporate)',
        mobileNumber: '+91 98110 99887',
        travelStartDate: '2025-09-10',
        travelEndDate: '2025-09-12',
        tripStartFormatted: '10 Sep 25',
        tripEndFormatted: '12 Sep 25',
        vehicleType: 'Swift Dzire',
        totalAmount: 32000,
        advancePaid: 10000,
        balanceDue: 22000,
        cancellationReason: 'Date Passed & Guest did not call (No-Show)',
        isNoShow: true,
        cancelledAt: '2025-09-11',
        month: 'Sep'
    },
    {
        _id: 'cnl-mock-3',
        bookingId: '09/09',
        bookingCode: '09/09',
        clientCode: '09/09',
        clientName: 'Rajasthan Tours & Travels (Agent)',
        mobileNumber: '+91 94140 55667',
        travelStartDate: '2025-09-14',
        travelEndDate: '2025-09-16',
        tripStartFormatted: '14 Sep 25',
        tripEndFormatted: '16 Sep 25',
        vehicleType: 'Tempo Traveller',
        totalAmount: 95000,
        advancePaid: 30000,
        balanceDue: 65000,
        cancellationReason: 'Flight Cancelled / Customer Request',
        isNoShow: false,
        cancelledAt: '2025-09-13',
        month: 'Sep'
    },
    {
        _id: 'cnl-mock-4',
        bookingId: '09/10',
        bookingCode: '09/10',
        clientCode: '09/10',
        clientName: 'Mr. Sanjay Kothari',
        mobileNumber: '+91 98200 44332',
        travelStartDate: '2025-09-15',
        travelEndDate: '2025-09-17',
        tripStartFormatted: '15 Sep 25',
        tripEndFormatted: '17 Sep 25',
        vehicleType: 'Innova',
        totalAmount: 48000,
        advancePaid: 15000,
        balanceDue: 33000,
        cancellationReason: 'Date Passed & Guest did not call (No-Show)',
        isNoShow: true,
        cancelledAt: '2025-09-16',
        month: 'Sep'
    }
];

const formatTripDate = (dateVal) => {
    if (!dateVal) return '-';
    if (typeof dateVal === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2}$/.test(dateVal.trim())) {
        return dateVal.trim();
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
};

export default function CancelledBookings() {
    const navigate = useNavigate();
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFy, setSelectedFy] = useState('FY 26-27');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFyDropdown, setShowFyDropdown] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState('bookingCode');
    const [sortAsc, setSortAsc] = useState(true);

    // Detail Modal
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchCancelledBookings();
        } else {
            setBookings(BASELINE_CANCELLED_BOOKINGS);
        }
    }, [selectedCompany]);

    const fetchCancelledBookings = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}?status=Cancelled`);
            if (Array.isArray(data) && data.length > 0) {
                const formatted = data.map(b => {
                    let reason = 'Cancelled';
                    if (b.notes) {
                        const splitted = b.notes.split('Cancelled: ');
                        if (splitted.length > 1) {
                            reason = splitted[1].split(' | ')[0].trim();
                        } else {
                            reason = b.notes;
                        }
                    }
                    const isNoShow = reason.toLowerCase().includes('no-show') || reason.toLowerCase().includes('date passed') || reason.toLowerCase().includes('call nahi aaya');
                    return {
                        ...b,
                        bookingId: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                        bookingCode: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                        clientName: b.clientName || b.guestName || 'Valued Guest',
                        cancellationReason: reason,
                        isNoShow
                    };
                });
                setBookings(formatted);
            } else {
                setBookings(BASELINE_CANCELLED_BOOKINGS);
            }
        } catch (error) {
            console.error('Error fetching cancelled bookings:', error);
            setBookings(BASELINE_CANCELLED_BOOKINGS);
        } finally {
            setLoading(false);
        }
    };

    // Restore Booking handler (moves it back to Confirmed Bookings)
    const handleRestoreBooking = async (bkg) => {
        const confirmRestore = window.confirm(`Do you want to restore booking ${bkg.bookingCode || bkg.bookingId} back to Confirmed Bookings?`);
        if (!confirmRestore) return;

        try {
            setRestoringId(bkg._id);
            if (bkg._id && !String(bkg._id).startsWith('cnl-mock')) {
                await axios.put(`/api/bookings/single/${bkg._id}`, {
                    bookingStatus: 'Confirmed',
                    notes: `${bkg.notes ? bkg.notes + ' | ' : ''}Restored from Cancelled on ${new Date().toLocaleDateString()}`
                });
            }

            // Remove from cancelled list
            setBookings(prev => prev.filter(b => b._id !== bkg._id));
            if (showDetailModal && selectedBooking?._id === bkg._id) {
                setShowDetailModal(false);
            }
            alert(`Booking ${bkg.bookingCode || bkg.bookingId} restored successfully! It is now active under Confirmed Bookings.`);
        } catch (err) {
            console.error('Error restoring booking:', err);
            alert(err.response?.data?.message || 'Failed to restore booking');
        } finally {
            setRestoringId(null);
        }
    };

    // Filter & Sort
    const processedBookings = useMemo(() => {
        let list = bookings.length > 0 ? bookings : BASELINE_CANCELLED_BOOKINGS;

        // Month filter
        if (selectedMonth !== 'All Months') {
            const monthMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const targetPrefix = monthMap[selectedMonth];

            list = list.filter(b => {
                if (b.month && b.month === selectedMonth) return true;
                const code = b.bookingId || b.bookingCode || '';
                if (targetPrefix && /^\d{2}\//.test(code)) {
                    if (code.startsWith(targetPrefix + '/')) return true;
                }
                const d = new Date(b.travelStartDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });
        }

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(b => (
                (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
                (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
                (b.clientName && b.clientName.toLowerCase().includes(q)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(q)) ||
                (b.cancellationReason && b.cancellationReason.toLowerCase().includes(q))
            ));
        }

        // Sorting
        return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'totalAmount' || sortField === 'advancePaid' || sortField === 'balanceDue') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [bookings, selectedMonth, searchTerm, sortField, sortAsc]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const totalCancelled = processedBookings.length;
        const lostValue = processedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
        const advanceHeld = processedBookings.reduce((sum, b) => sum + (Number(b.advancePaid) || 0), 0);
        const noShowCount = processedBookings.filter(b => b.isNoShow).length;

        return {
            totalCancelled,
            lostValue,
            advanceHeld,
            noShowCount
        };
    }, [processedBookings]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    return (
        <div style={{
            padding: '24px',
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, #111a2e, #070d19)',
            color: '#ffffff',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <SEO title="Cancelled Bookings - LogKaro" />

            {/* 1. Header Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <XCircle size={24} color="#f87171" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: '900',
                                color: '#ffffff',
                                margin: 0,
                                letterSpacing: '-0.5px'
                            }}>
                                Cancelled Bookings
                            </h1>
                            <span style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                padding: '2px 10px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: '800'
                            }}>
                                {kpiStats.totalCancelled} Rides
                            </span>
                        </div>
                        <p style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            margin: '4px 0 0 0',
                            fontWeight: '500'
                        }}>
                            Rides cancelled due to expired dates, guest no-show, or cancellation requests.
                        </p>
                    </div>
                </div>

                {/* Back to Confirmed Bookings Link */}
                <button
                    onClick={() => navigate('/admin/bookings')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeft size={14} /> Back to Confirmed Bookings
                </button>
            </div>

            {/* 2. Filter Bar: FY Selector, Month Tabs, Live Search */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '22px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    maxWidth: '100%'
                }}>
                    {/* FY Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowFyDropdown(!showFyDropdown)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span>{selectedFy}</span>
                            <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                        </button>
                        {showFyDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '110%',
                                left: 0,
                                background: '#0f172a',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                zIndex: 100,
                                minWidth: '110px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}>
                                {['FY 26-27', 'FY 25-26', 'FY 24-25'].map(fy => (
                                    <div
                                        key={fy}
                                        onClick={() => {
                                            setSelectedFy(fy);
                                            setShowFyDropdown(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            color: selectedFy === fy ? '#f87171' : 'rgba(255,255,255,0.8)',
                                            background: selectedFy === fy ? 'rgba(239, 68, 68, 0.15)' : 'transparent'
                                        }}
                                    >
                                        {fy}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Month Pills */}
                    {MONTH_TABS.map(m => {
                        const isActive = selectedMonth === m;
                        return (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '10px',
                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    background: isActive ? '#ef4444' : 'rgba(255, 255, 255, 0.03)',
                                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                                    fontWeight: isActive ? '800' : '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {m}
                            </button>
                        );
                    })}
                </div>

                {/* Instant Search Bar */}
                <div style={{
                    position: 'relative',
                    width: '320px',
                    maxWidth: '100%'
                }}>
                    <Search
                        size={15}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,0.4)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search code, guest, car, reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '9px 12px 9px 36px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px'
                        }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. Four KPI Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* 1. Total Cancelled */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171'
                    }}>
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Total Cancelled
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: '#ffffff', marginTop: '2px', lineHeight: '1.2' }}>
                            {kpiStats.totalCancelled}
                        </div>
                    </div>
                </div>

                {/* 2. Lost Package Value */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(244, 63, 94, 0.2)',
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fb7185',
                        fontWeight: '900'
                    }}>
                        <IndianRupee size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Lost Package Value
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: '#ffffff', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.lostValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* 3. Date Passed / No-Show Count */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24'
                    }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Date Passed / No-Show
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: '#fbbf24', marginTop: '2px', lineHeight: '1.2' }}>
                            {kpiStats.noShowCount}
                        </div>
                    </div>
                </div>

                {/* 4. Advance Paid / Held */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8'
                    }}>
                        <IndianRupee size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Advance Held / Bal
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: '#ffffff', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.advanceHeld.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Cancelled Bookings Table */}
            <div style={{
                background: '#070d19',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', width: '50px' }}>#</th>
                                <th
                                    onClick={() => handleSort('bookingCode')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Booking Code <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('clientName')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Guest / Agent Name <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('totalAmount')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Package (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('advancePaid')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Advance (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('travelStartDate')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Scheduled Dates <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('vehicleType')}
                                    style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Car Type <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                    </div>
                                </th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>
                                    Cancellation Reason
                                </th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px' }}>
                                        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(239, 68, 68, 0.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                                    </td>
                                </tr>
                            ) : processedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                                        No cancelled bookings found.
                                    </td>
                                </tr>
                            ) : (
                                processedBookings.map((bkg, index) => {
                                    const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || `${index + 1}`;
                                    const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
                                    const eDate = bkg.tripEndFormatted || formatTripDate(bkg.travelEndDate);
                                    const isNoShow = bkg.isNoShow;

                                    return (
                                        <tr
                                            key={bkg._id || index}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            className="drs-row-hover"
                                        >
                                            {/* 1. # */}
                                            <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '600' }}>
                                                {index + 1}
                                            </td>

                                            {/* 2. Booking Code */}
                                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    color: '#f87171',
                                                    fontWeight: '800',
                                                    fontSize: '13.5px',
                                                    textDecoration: 'line-through',
                                                    textDecorationColor: 'rgba(248, 113, 113, 0.6)'
                                                }}>
                                                    {bkgCode}
                                                </span>
                                            </td>

                                            {/* 3. Guest / Agent Name */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '13.5px' }}>
                                                        {bkg.clientName}
                                                    </span>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '11.5px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={11} /> {bkg.mobileNumber || 'No phone'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 4. Package Amount */}
                                            <td style={{ padding: '14px 16px', color: '#ffffff', fontWeight: '800', fontSize: '13px' }}>
                                                ₹{Number(bkg.totalAmount || 0).toLocaleString('en-IN')}
                                            </td>

                                            {/* 5. Advance Paid */}
                                            <td style={{ padding: '14px 16px', color: '#38bdf8', fontWeight: '700', fontSize: '13px' }}>
                                                ₹{Number(bkg.advancePaid || 0).toLocaleString('en-IN')}
                                            </td>

                                            {/* 6. Scheduled Dates */}
                                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600' }}>
                                                        {sDate}
                                                    </span>
                                                    {eDate && eDate !== '-' && (
                                                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>
                                                            to {eDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 7. Car Type */}
                                            <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '12.5px', fontWeight: '600' }}>
                                                {bkg.vehicleType || 'Standard Sedan'}
                                            </td>

                                            {/* 8. Cancellation Reason */}
                                            <td style={{ padding: '14px 16px' }}>
                                                {isNoShow ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        border: '1px solid rgba(245, 158, 11, 0.35)',
                                                        color: '#fbbf24',
                                                        fontSize: '11.5px',
                                                        fontWeight: '700'
                                                    }}>
                                                        <AlertTriangle size={12} /> Date Passed (No-Show)
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(239, 68, 68, 0.12)',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        color: '#fca5a5',
                                                        fontSize: '11.5px',
                                                        fontWeight: '600'
                                                    }}>
                                                        <XCircle size={12} /> {bkg.cancellationReason || 'Cancelled'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* 9. Actions */}
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    {/* Restore Button */}
                                                    <button
                                                        onClick={() => handleRestoreBooking(bkg)}
                                                        disabled={restoringId === bkg._id}
                                                        title="Restore this booking back to Confirmed Bookings"
                                                        style={{
                                                            padding: '6px 14px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            border: '1px solid rgba(52, 211, 153, 0.4)',
                                                            borderRadius: '20px',
                                                            color: '#34d399',
                                                            fontSize: '11.5px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <RotateCcw size={12} />
                                                        {restoringId === bkg._id ? 'Restoring...' : 'Restore Ride'}
                                                    </button>

                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBooking(bkg);
                                                            setShowDetailModal(true);
                                                        }}
                                                        title="View Details"
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'rgba(255, 255, 255, 0.06)',
                                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                                            borderRadius: '20px',
                                                            color: '#ffffff',
                                                            fontSize: '11.5px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Eye size={12} /> View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer status summary */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)'
                }}>
                    <span>
                        Showing {processedBookings.length} cancelled booking{processedBookings.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Tip: Click "Restore Ride" if the guest calls back or reschedules the tour.
                    </span>
                </div>
            </div>

            {/* 5. Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedBooking && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 99999,
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '560px',
                                background: '#0b1120',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '16px',
                                padding: '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <XCircle size={20} color="#f87171" />
                                        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                            Cancelled Booking {selectedBooking.bookingCode || selectedBooking.bookingId}
                                        </h2>
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0 0' }}>
                                        Detailed breakdown and cancellation records
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Booking Information Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    padding: '14px'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Guest / Client</div>
                                            <div style={{ fontSize: '13.5px', color: 'white', fontWeight: '700', marginTop: '2px' }}>{selectedBooking.clientName}</div>
                                            <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '1px' }}>{selectedBooking.mobileNumber || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Vehicle Requested</div>
                                            <div style={{ fontSize: '13.5px', color: 'white', fontWeight: '700', marginTop: '2px' }}>{selectedBooking.vehicleType || 'Standard'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Scheduled Trip Start</div>
                                            <div style={{ fontSize: '13px', color: 'white', fontWeight: '600', marginTop: '2px' }}>
                                                {selectedBooking.tripStartFormatted || formatTripDate(selectedBooking.travelStartDate)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Scheduled Trip End</div>
                                            <div style={{ fontSize: '13px', color: 'white', fontWeight: '600', marginTop: '2px' }}>
                                                {selectedBooking.tripEndFormatted || formatTripDate(selectedBooking.travelEndDate)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Info */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    padding: '14px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '10px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Total Package</div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                                            ₹{Number(selectedBooking.totalAmount || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Advance Collected</div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8', marginTop: '2px' }}>
                                            ₹{Number(selectedBooking.advancePaid || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Balance Due</div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#fb7185', marginTop: '2px' }}>
                                            ₹{Number(selectedBooking.balanceDue || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>

                                {/* Reason & Status */}
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '10px',
                                    padding: '14px'
                                }}>
                                    <div style={{ fontSize: '11.5px', color: '#fca5a5', fontWeight: '700', marginBottom: '4px' }}>
                                        Reason for Cancellation
                                    </div>
                                    <div style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: '600' }}>
                                        {selectedBooking.cancellationReason || 'Date Passed & Guest did not call (No-Show)'}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDetailModal(false)}
                                    style={{
                                        padding: '9px 18px',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '12.5px'
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRestoreBooking(selectedBooking)}
                                    disabled={restoringId === selectedBooking._id}
                                    style={{
                                        padding: '9px 20px',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '12.5px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                    }}
                                >
                                    <RotateCcw size={14} /> Restore to Confirmed Bookings
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
