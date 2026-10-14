import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Car, Search, FileText, CheckCircle, IndianRupee,
    ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
    Receipt, Download, Eye, Calendar, MapPin, User, Phone,
    Clock, ShieldCheck, AlertCircle, X, ChevronUp, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';
import ClientLedgerDrawer from '../components/common/ClientLedgerDrawer';
import EditInvoiceModal from '../components/common/EditInvoiceModal';
import { getFinancialYear, getAvailableFinancialYears } from '../utils/istUtils';

const MONTH_TABS = [
    'All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const formatTripDate = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};

export default function CompletedBookings() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ledgerModalBooking, setLedgerModalBooking] = useState(null);
    const [invoiceModalBooking, setInvoiceModalBooking] = useState(null);
    const [viewItineraryBooking, setViewItineraryBooking] = useState(null);
    const [downloadPdfModalBooking, setDownloadPdfModalBooking] = useState(null);
    const [selectedFy, setSelectedFy] = useState('FY 26-27');
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFyDropdown, setShowFyDropdown] = useState(false);
    const fyOptions = useMemo(() => getAvailableFinancialYears(bookings), [bookings]);

    // Sorting
    const [sortField, setSortField] = useState('travelEndDate');
    const [sortAsc, setSortAsc] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchCompletedBookings();
        } else {
            setBookings([]);
        }
    }, [selectedCompany]);

    const fetchCompletedBookings = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}?status=Completed`);
            if (Array.isArray(data) && data.length > 0) {
                const formatted = data.map(b => ({
                    ...b,
                    _id: b._id,
                    bookingId: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    bookingCode: b.bookingCode || b.clientCode || b.bookingId || 'BKG',
                    guestName: b.clientName || b.guestName || 'Valued Guest',
                    clientName: b.clientName || b.guestName || 'Valued Guest',
                    mobileNumber: b.mobileNumber || '',
                    packagePrice: Number(b.totalAmount) || 0,
                    totalAmount: Number(b.totalAmount) || 0,
                    vehicleType: b.vehicleType || 'Innova Crysta',
                    month: b.month || 'Sep',
                    travelStartDate: b.travelStartDate,
                    travelEndDate: b.travelEndDate,
                    createdAt: b.createdAt
                }));
                setBookings(formatted);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching completed bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter & Sort
    const processedBookings = useMemo(() => {
        let list = bookings;

        // Financial Year filter
        if (selectedFy && selectedFy !== 'All FY') {
            list = list.filter(b => {
                const itemFy = getFinancialYear(b.travelEndDate || b.travelStartDate || b.createdAt);
                return itemFy === selectedFy;
            });
        }

        // Month filter
        if (selectedMonth && selectedMonth !== 'All Months') {
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
                const d = new Date(b.travelEndDate || b.travelStartDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return true;
            });
        }

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(b => (
                (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
                (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
                (b.guestName && b.guestName.toLowerCase().includes(q)) ||
                (b.clientName && b.clientName.toLowerCase().includes(q)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(q)) ||
                (b.pickupPoint && b.pickupPoint.toLowerCase().includes(q)) ||
                (b.dropPoint && b.dropPoint.toLowerCase().includes(q))
            ));
        }

        // Sorting
        return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'packagePrice' || sortField === 'totalAmount') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (sortField === 'travelEndDate' || sortField === 'travelStartDate' || sortField === 'createdAt') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [bookings, selectedMonth, selectedFy, searchTerm, sortField, sortAsc]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const totalRides = processedBookings.length;
        const packageValue = processedBookings.reduce((sum, b) => sum + (Number(b.packagePrice || b.totalAmount) || 0), 0);
        const taxInvoices = totalRides;

        return {
            totalRides,
            packageValue,
            taxInvoices
        };
    }, [processedBookings]);

    // Pagination calculations
    const totalPages = Math.ceil(processedBookings.length / itemsPerPage) || 1;
    const paginatedBookings = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedBookings.slice(start, start + itemsPerPage);
    }, [processedBookings, currentPage, itemsPerPage]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const handleDownloadInvoice = (bkg) => {
        const invoicePayload = {
            invoiceNumber: `INV-${bkg.bookingId?.replace('/', '-') || bkg._id?.slice(-5) || '001'}`,
            date: bkg.travelEndDate || bkg.travelStartDate || new Date().toISOString(),
            bookingId: bkg.bookingId || bkg.bookingCode,
            billTo: {
                name: bkg.guestName || bkg.clientName,
                companyName: '',
                mobile: bkg.mobileNumber || '',
                email: '',
                address: 'Local Fleet Service',
                gstin: '',
                placeOfSupply: 'Rajasthan (08)'
            },
            items: [
                {
                    description: `${bkg.vehicleType || 'Commercial Vehicle'} Rental & Travel Service`,
                    sacCode: '996601',
                    quantity: 1,
                    rate: bkg.packagePrice || bkg.totalAmount || 0,
                    amount: bkg.packagePrice || bkg.totalAmount || 0
                }
            ],
            gstMode: 'GST Inclusive',
            gstRate: 5,
            isInterState: false,
            advanceAdjusted: bkg.packagePrice || bkg.totalAmount || 0,
            notes: 'Completed ride tax invoice generated automatically.'
        };

        generateTaxInvoicePDF(invoicePayload, selectedCompany);
    };

    return (
        <div style={{
            padding: '24px clamp(16px, 3vw, 32px)',
            background: '#070c18',
            minHeight: '100vh',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <SEO title="Completed Bookings - LogKaro" />

            {/* 1. Header Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CheckCircle size={22} color="#34d399" />
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
                                Completed Bookings
                            </h1>
                            <span style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: 'rgba(52, 211, 153, 0.15)',
                                color: '#34d399',
                                fontSize: '11px',
                                fontWeight: '800',
                                border: '1px solid rgba(52, 211, 153, 0.3)'
                            }}>
                                {processedBookings.length} Finished Trips
                            </span>
                        </div>
                        <p style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            margin: '3px 0 0 0',
                            fontWeight: '500'
                        }}>
                            View day-wise tour itinerary, guest scene, and download tour confirmation or tax invoice PDFs.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Filter Bar: FY Selector, Month Pills, Search */}
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
                    gap: '10px',
                    maxWidth: '100%',
                    flexWrap: 'wrap'
                }}>
                    {/* FY Dropdown */}
                    <div style={{ position: 'relative', zIndex: 110, flexShrink: 0 }}>
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
                            <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.6)', transform: showFyDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {showFyDropdown && (
                            <>
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                                    onClick={() => setShowFyDropdown(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    background: '#0f172a',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px',
                                    zIndex: 1000,
                                    minWidth: '120px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                                    overflow: 'hidden'
                                }}>
                                    {fyOptions.map(fy => (
                                        <div
                                            key={fy}
                                            onClick={() => {
                                                setSelectedFy(fy);
                                                setShowFyDropdown(false);
                                            }}
                                            style={{
                                                padding: '9px 14px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                color: selectedFy === fy ? '#fbbf24' : 'rgba(255,255,255,0.8)',
                                                background: selectedFy === fy ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedFy !== fy) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedFy !== fy) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {fy}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Month Pills Container */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none'
                    }}>
                        {MONTH_TABS.map(m => {
                            const isActive = selectedMonth === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => {
                                        setSelectedMonth(m);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        background: isActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.03)',
                                        color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
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
                </div>

                {/* Search Bar */}
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
                        placeholder="Search by code, guest, car, route..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
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
                </div>
            </div>

            {/* 3. KPI Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '26px'
            }}>
                {/* Total Completed Rides */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399'
                    }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Completed Rides
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>
                            {kpiStats.totalRides}
                        </div>
                    </div>
                </div>

                {/* Package Value */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24'
                    }}>
                        <IndianRupee size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Total Tour Value
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>
                            ₹{kpiStats.packageValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Tax Invoices */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa'
                    }}>
                        <Receipt size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Invoices Ready
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>
                            {kpiStats.taxInvoices}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Completed Bookings Table */}
            <div style={{
                background: 'rgba(13, 21, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '20px'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{
                                background: '#0a101d',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', width: '50px' }}>
                                    #
                                </th>
                                <th
                                    onClick={() => handleSort('bookingId')}
                                    style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Booking ID <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('guestName')}
                                    style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Guest & Contact <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
                                    Vehicle & Route
                                </th>
                                <th
                                    onClick={() => handleSort('travelStartDate')}
                                    style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Trip Dates <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('packagePrice')}
                                    style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Package Price (₹) <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                                    Itinerary (Scene)
                                </th>
                                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                        No completed bookings found for {selectedMonth} {selectedFy}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBookings.map((bkg, idx) => {
                                    const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;
                                    const bal = (bkg.packagePrice || bkg.totalAmount || 0) - (bkg.advancePaid || 0);
                                    const daysCount = Array.isArray(bkg.itinerary) && bkg.itinerary.length > 0 
                                        ? bkg.itinerary.length 
                                        : 1;

                                    return (
                                        <tr
                                            key={bkg._id || idx}
                                            style={{
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Serial No */}
                                            <td style={{ padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                                                {serialNo}
                                            </td>

                                            {/* Booking ID */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#fbbf24', fontFamily: 'monospace' }}>
                                                        {bkg.bookingId}
                                                    </span>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '9.5px',
                                                        fontWeight: '700',
                                                        background: 'rgba(52, 211, 153, 0.15)',
                                                        color: '#34d399',
                                                        width: 'fit-content'
                                                    }}>
                                                        ✓ Completed
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Guest Name & Mobile */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                                                    {bkg.guestName}
                                                </div>
                                                {bkg.mobileNumber && (
                                                    <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={10} /> {bkg.mobileNumber}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Vehicle & Route */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Car size={13} color="#60a5fa" />
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
                                                        {bkg.vehicleType || 'Commercial Car'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={10} color="#f87171" />
                                                    <span>{bkg.pickupPoint || 'Jaipur'} {bkg.dropPoint ? `➔ ${bkg.dropPoint}` : ''}</span>
                                                </div>
                                            </td>

                                            {/* Trip Dates */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                    {formatTripDate(bkg.travelStartDate)} {bkg.travelEndDate && bkg.travelEndDate !== bkg.travelStartDate ? `- ${formatTripDate(bkg.travelEndDate)}` : ''}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                                                    {daysCount} {daysCount > 1 ? 'Days Tour' : 'Day Tour'}
                                                </div>
                                            </td>

                                            {/* Package Price & Accounts */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#ffffff' }}>
                                                        ₹{Number(bkg.packagePrice || bkg.totalAmount || 0).toLocaleString('en-IN')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLedgerModalBooking(bkg)}
                                                        title="View Accounts Ledger"
                                                        style={{
                                                            padding: '3px 10px',
                                                            background: bal > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                            border: `1px solid ${bal > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                                                            borderRadius: '20px',
                                                            color: bal > 0 ? '#ef4444' : '#4ade80',
                                                            fontSize: '10.5px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {bal > 0 ? `Bal ₹${bal.toLocaleString('en-IN')}` : 'Accounts'}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Itinerary (Scene) */}
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setViewItineraryBooking(bkg)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        background: 'rgba(59, 130, 246, 0.15)',
                                                        border: '1px solid rgba(59, 130, 246, 0.35)',
                                                        borderRadius: '8px',
                                                        padding: '5px 12px',
                                                        color: '#60a5fa',
                                                        fontSize: '11.5px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.28)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                                                >
                                                    <Eye size={13} />
                                                    <span>View Scene</span>
                                                </button>
                                            </td>

                                            {/* Actions: Download PDF & Edit Invoice */}
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                    {/* PDF Download Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDownloadPdfModalBooking(bkg)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            background: 'rgba(251, 191, 36, 0.15)',
                                                            border: '1px solid rgba(251, 191, 36, 0.4)',
                                                            borderRadius: '8px',
                                                            padding: '5px 11px',
                                                            color: '#fbbf24',
                                                            fontSize: '11.5px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.28)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                                                        title="Download Tour Itinerary or Tax Invoice PDF"
                                                    >
                                                        <Download size={13} />
                                                        <span>PDF</span>
                                                    </button>

                                                    {/* Edit Invoice Button */}
                                                    {bkg.invoiceGenerated ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setInvoiceModalBooking(bkg)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: '#0284c7',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '5px 10px',
                                                                color: '#ffffff',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Edit size={12} />
                                                            <span>Invoice</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadInvoice(bkg)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: 'rgba(255,255,255,0.06)',
                                                                border: '1px solid rgba(255,255,255,0.12)',
                                                                borderRadius: '8px',
                                                                padding: '5px 10px',
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Generate & Download Tax Invoice"
                                                        >
                                                            <Receipt size={12} />
                                                            <span>Invoice</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Footer: Count and Pagination */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '4px 4px'
            }}>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '500' }}>
                    Showing {processedBookings.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, processedBookings.length)} of {processedBookings.length} completed bookings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            color: currentPage === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                        const isActive = pageNum === currentPage;
                        return (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    background: isActive ? '#fbbf24' : 'rgba(255,255,255,0.03)',
                                    color: isActive ? '#000' : 'rgba(255,255,255,0.8)',
                                    fontWeight: isActive ? '900' : '600',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            color: currentPage === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* ITINERARY MODAL ("Kya Scene Hai" - Tour Schedule)         */}
            {/* ========================================================= */}
            {viewItineraryBooking && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(3, 7, 18, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '780px',
                        maxHeight: '90vh',
                        background: '#0d1526',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        borderRadius: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    color: '#fbbf24',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '900' }}>
                                            Trip Itinerary & Tour Details
                                        </h3>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: '#fbbf24',
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            fontFamily: 'monospace'
                                        }}>
                                            {viewItineraryBooking.bookingId}
                                        </span>
                                    </div>
                                    <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                        Guest: <strong style={{ color: '#fff' }}>{viewItineraryBooking.guestName}</strong> ({viewItineraryBooking.mobileNumber || 'No phone'})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewItineraryBooking(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'rgba(255,255,255,0.7)',
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

                        {/* Modal Body: Scrollable */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
                            {/* Summary Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '12px',
                                marginBottom: '22px'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Vehicle Assigned</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>{viewItineraryBooking.vehicleType || 'Innova Crysta'}</div>
                                    {viewItineraryBooking.vehicleNumber && (
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Car: {viewItineraryBooking.vehicleNumber}</div>
                                    )}
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Tour Dates</div>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                                        {formatTripDate(viewItineraryBooking.travelStartDate)} {viewItineraryBooking.travelEndDate ? `- ${formatTripDate(viewItineraryBooking.travelEndDate)}` : ''}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px', fontWeight: '700' }}>✓ Tour Completed</div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Package & Balance</div>
                                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#fbbf24' }}>
                                        ₹{Number(viewItineraryBooking.packagePrice || viewItineraryBooking.totalAmount || 0).toLocaleString('en-IN')}
                                    </div>
                                    {(() => {
                                        const bal = (viewItineraryBooking.packagePrice || viewItineraryBooking.totalAmount || 0) - (viewItineraryBooking.advancePaid || 0);
                                        return (
                                            <div style={{ fontSize: '11px', color: bal > 0 ? '#ef4444' : '#4ade80', fontWeight: '700', marginTop: '2px' }}>
                                                {bal > 0 ? `Pending: ₹${bal.toLocaleString('en-IN')}` : 'Fully Settled'}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Itinerary Schedule Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Calendar size={16} color="#fbbf24" />
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                                    Day-wise Tour Schedule ("Kya Scene Hai")
                                </h4>
                            </div>

                            {/* Itinerary List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                                {Array.isArray(viewItineraryBooking.itinerary) && viewItineraryBooking.itinerary.length > 0 ? (
                                    viewItineraryBooking.itinerary.map((day, dIdx) => (
                                        <div
                                            key={day._id || dIdx}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '12px',
                                                padding: '14px 16px',
                                                display: 'flex',
                                                gap: '14px',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            {/* Day Badge */}
                                            <div style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: 'rgba(251, 191, 36, 0.15)',
                                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                                color: '#fbbf24',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                textAlign: 'center',
                                                flexShrink: 0
                                            }}>
                                                Day {day.dayNo || (dIdx + 1)}
                                            </div>

                                            {/* Day Details */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                                                        {day.date ? formatTripDate(day.date) : `Day ${dIdx + 1}`} • {day.time || '09:00 AM'}
                                                    </div>
                                                    {day.amount > 0 && (
                                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24' }}>
                                                            ₹{Number(day.amount).toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Duty / Route */}
                                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4', marginBottom: '6px' }}>
                                                    {day.duty || day.description || 'Sightseeing / Transfer Service'}
                                                </div>

                                                {/* Pickup / Vehicle / Driver Tags */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                                    {day.pickupPoint && (
                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <MapPin size={10} color="#f87171" /> {day.pickupPoint}
                                                        </span>
                                                    )}
                                                    {(day.vehicleNumber || day.customCarNumber) && (
                                                        <span style={{ fontSize: '11px', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Car size={10} /> {day.vehicleNumber || day.customCarNumber}
                                                        </span>
                                                    )}
                                                    {(day.driverName || day.customDriverName) && (
                                                        <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <User size={10} /> {day.driverName || day.customDriverName} {day.driverPhone ? `(${day.driverPhone})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        gap: '14px',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            background: 'rgba(251, 191, 36, 0.15)',
                                            color: '#fbbf24',
                                            fontWeight: '900',
                                            fontSize: '13px'
                                        }}>
                                            Tour Plan
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                                                {viewItineraryBooking.pickupPoint || 'Jaipur Local / Outstation'} {viewItineraryBooking.dropPoint ? `➔ ${viewItineraryBooking.dropPoint}` : ''}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                                Vehicle: {viewItineraryBooking.vehicleType || 'Commercial Vehicle'} • Full Tour Service Completed
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inclusions & Notes */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '18px'
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24', marginBottom: '6px' }}>
                                    Inclusions & Tour Details
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                                    ✓ All Fuel, Toll Tax, State Border Permits, Parking charges included as per package agreement.
                                    {viewItineraryBooking.notes && (
                                        <div style={{ marginTop: '6px', color: '#ffffff', fontWeight: '600' }}>
                                            Special Notes: {viewItineraryBooking.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer: Action Buttons */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            background: '#0a101d',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                type="button"
                                onClick={() => {
                                    generateBookingConfirmationPDF(viewItineraryBooking, selectedCompany, { withAmount: true });
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    border: '1px solid rgba(251, 191, 36, 0.4)',
                                    color: '#fbbf24',
                                    fontSize: '12.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={14} />
                                <span>Itinerary PDF (With Amount)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    generateBookingConfirmationPDF(viewItineraryBooking, selectedCompany, { withAmount: false });
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={14} />
                                <span>Guest Copy (Without Amount)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    handleDownloadInvoice(viewItineraryBooking);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    background: '#0284c7',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <Receipt size={14} />
                                <span>Tax Invoice PDF</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewItineraryBooking(null)}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '12.5px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DOWNLOAD PDF OPTIONS MODAL                                */}
            {/* ========================================================= */}
            {downloadPdfModalBooking && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(3, 7, 18, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '480px',
                        background: '#0d1526',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download size={18} color="#fbbf24" />
                                <h3 style={{ margin: 0, color: 'white', fontSize: '17px', fontWeight: '900' }}>
                                    Download PDF Options
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDownloadPdfModalBooking(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'rgba(255,255,255,0.7)',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', marginBottom: '18px', lineHeight: '1.4' }}>
                            Select the document you want to download for booking <strong style={{ color: '#fbbf24' }}>{downloadPdfModalBooking.bookingId}</strong> ({downloadPdfModalBooking.guestName}):
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Option 1: Itinerary with amount */}
                            <button
                                type="button"
                                onClick={() => {
                                    generateBookingConfirmationPDF(downloadPdfModalBooking, selectedCompany, { withAmount: true });
                                    setDownloadPdfModalBooking(null);
                                }}
                                style={{
                                    padding: '14px 16px',
                                    background: 'rgba(251, 191, 36, 0.08)',
                                    border: '1px solid rgba(251, 191, 36, 0.35)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)'}
                            >
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>
                                        💰 Tour Itinerary (With Amount)
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                        Complete tour schedule with day-wise amounts and total quotation price.
                                    </div>
                                </div>
                                <span style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '900' }}>➔</span>
                            </button>

                            {/* Option 2: Itinerary without amount */}
                            <button
                                type="button"
                                onClick={() => {
                                    generateBookingConfirmationPDF(downloadPdfModalBooking, selectedCompany, { withAmount: false });
                                    setDownloadPdfModalBooking(null);
                                }}
                                style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                            >
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                                        📄 Tour Itinerary (Guest Copy - No Price)
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                        Clean day-wise tour itinerary without showing commercial pricing.
                                    </div>
                                </div>
                                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', fontWeight: '900' }}>➔</span>
                            </button>

                            {/* Option 3: Tax Invoice */}
                            <button
                                type="button"
                                onClick={() => {
                                    handleDownloadInvoice(downloadPdfModalBooking);
                                    setDownloadPdfModalBooking(null);
                                }}
                                style={{
                                    padding: '14px 16px',
                                    background: 'rgba(2, 132, 199, 0.1)',
                                    border: '1px solid rgba(2, 132, 199, 0.35)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(2, 132, 199, 0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(2, 132, 199, 0.1)'}
                            >
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#38bdf8' }}>
                                        🧾 Official Tax Invoice (GST)
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                        Itemized tax invoice with SAC code, GST breakdown and company details.
                                    </div>
                                </div>
                                <span style={{ fontSize: '18px', color: '#38bdf8', fontWeight: '900' }}>➔</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ledgerModalBooking && (
                <ClientLedgerDrawer 
                    booking={ledgerModalBooking} 
                    onClose={() => setLedgerModalBooking(null)}
                />
            )}

            {invoiceModalBooking && (
                <EditInvoiceModal 
                    booking={invoiceModalBooking} 
                    onClose={() => setInvoiceModalBooking(null)}
                    onSuccess={() => {
                        setInvoiceModalBooking(null);
                        fetchCompletedBookings();
                        alert('Invoice updated successfully!');
                    }}
                />
            )}
        </div>
    );
}
