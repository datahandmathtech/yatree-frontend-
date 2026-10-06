import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Car, Search, FileText, CheckCircle, IndianRupee,
    ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
    Receipt, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';
import ClientLedgerDrawer from '../components/common/ClientLedgerDrawer';
import EditInvoiceModal from '../components/common/EditInvoiceModal';
import { getFinancialYear, getAvailableFinancialYears } from '../utils/istUtils';
import { Edit } from 'lucide-react';

const MONTH_TABS = [
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

// Baseline Mockup Data matching media_1788928571880.png (Total 28 rides, Package Value: ₹14,56,000, Invoices: 28)
const BASELINE_COMPLETED_BOOKINGS = [];

export default function CompletedBookings() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ledgerModalBooking, setLedgerModalBooking] = useState(null);
    const [invoiceModalBooking, setInvoiceModalBooking] = useState(null);
    const [selectedFy, setSelectedFy] = useState('FY 26-27');
    const [selectedMonth, setSelectedMonth] = useState('Sep');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFyDropdown, setShowFyDropdown] = useState(false);
    const fyOptions = useMemo(() => getAvailableFinancialYears(bookings), [bookings]);

    // Sorting
    const [sortField, setSortField] = useState('bookingId');
    const [sortAsc, setSortAsc] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 500;

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
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q))
            ));
        }

        // Sorting
        return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'packagePrice' || sortField === 'totalAmount') {
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
            <SEO title="Completed - LogKaro" />

            {/* 1. Header Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '24px'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Car size={22} color="#fbbf24" />
                </div>
                <div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '900',
                        color: '#ffffff',
                        margin: 0,
                        letterSpacing: '-0.5px'
                    }}>
                        Completed
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: '3px 0 0 0',
                        fontWeight: '500'
                    }}>
                        Completed rides ready for tax invoice download.
                    </p>
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
                    maxWidth: '100%'
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
                        {/* Month Pills */}
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
                        placeholder="Search by booking code or guest name..."
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

            {/* 3. Three KPI Metric Cards */}
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
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8'
                    }}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                            Total Completed Rides
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
                        borderRadius: '50%',
                        background: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: '900',
                        fontSize: '20px'
                    }}>
                        ₹
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                            Package Value
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
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399'
                    }}>
                        <Receipt size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                            Tax Invoices
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>
                            {kpiStats.taxInvoices}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Completed Table */}
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
                                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', width: '60px' }}>
                                    #
                                </th>
                                <th
                                    onClick={() => handleSort('bookingId')}
                                    style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Booking ID <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('guestName')}
                                    style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Guest Name <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('packagePrice')}
                                    style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Package Price (₹) <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                        No completed bookings found for {selectedMonth} {selectedFy}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBookings.map((bkg, idx) => {
                                    const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;
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
                                            <td style={{ padding: '14px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                                                {serialNo}
                                            </td>

                                            {/* Booking ID */}
                                            <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                                                {bkg.bookingId}
                                            </td>

                                            {/* Guest Name */}
                                            <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>
                                                {bkg.guestName}
                                            </td>

                                            {/* Package Price & Accounts */}
<td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{Number(bkg.packagePrice || bkg.totalAmount || 0).toLocaleString('en-IN')}</span>
        
        {(() => {
            const bal = (bkg.packagePrice || bkg.totalAmount || 0) - (bkg.advancePaid || 0);
            return (
                <button
                    type="button"
                    onClick={() => setLedgerModalBooking(bkg)}
                    title="View Accounts Ledger"
                    style={{
                        padding: '4px 12px',
                        background: bal > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        border: `1px solid ${bal > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                        borderRadius: '20px',
                        color: bal > 0 ? '#ef4444' : '#4ade80',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Accounts
                </button>
            );
        })()}
    </div>
</td>

{/* Actions */}
<td style={{ padding: '14px 18px', textAlign: 'right' }}>
    {bkg.invoiceGenerated ? (
        <button
            type="button"
            onClick={() => setInvoiceModalBooking(bkg)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 14px',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0369a1'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#0284c7'}
        >
            <Edit size={14} />
            <span>Edit Invoice</span>
        </button>
    ) : (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600' }}>Blank</span>
    )}
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
        
            {ledgerModalBooking && (
                <ClientLedgerDrawer 
                    booking={ledgerModalBooking} 
                    onClose={() => setLedgerModalBooking(null)}
                    // No onAddEntry because this is Completed bookings
                />
            )}

            {invoiceModalBooking && (
                <EditInvoiceModal 
                    booking={invoiceModalBooking} 
                    onClose={() => setInvoiceModalBooking(null)}
                    onSuccess={() => {
                        setInvoiceModalBooking(null);
                        fetchBookings();
                        alert('Invoice updated successfully!');
                    }}
                />
            )}
</div>
    );
}
