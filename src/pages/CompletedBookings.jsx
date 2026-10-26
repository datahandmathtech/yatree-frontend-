import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Car, Search, FileText, CheckCircle, IndianRupee,
    ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
    Receipt, Download, Eye, Calendar, MapPin, User, Phone,
    Clock, ShieldCheck, AlertCircle, X, ChevronUp, Edit,
    Plus, CreditCard, Hourglass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';
import ClientLedgerDrawer from '../components/common/ClientLedgerDrawer';
import EditInvoiceModal from '../components/common/EditInvoiceModal';
import EditBookingModal from '../components/common/EditBookingModal';
import AssignDriverModal from '../components/common/AssignDriverModal';
import BankSelector from '../components/common/BankSelector';
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
    const [assigningBooking, setAssigningBooking] = useState(null);
    const [editingBooking, setEditingBooking] = useState(null);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [viewItineraryBooking, setViewItineraryBooking] = useState(null);
    const [downloadPdfModalBooking, setDownloadPdfModalBooking] = useState(null);

    // Record Payment Modal State
    const [paymentModalBooking, setPaymentModalBooking] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [paymentRef, setPaymentRef] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bankAccountId, setBankAccountId] = useState('');
    const [savingPayment, setSavingPayment] = useState(false);

    const [searchParams] = useSearchParams();
    const [selectedFy, setSelectedFy] = useState(() => searchParams.get('fy') || 'FY 26-27');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const m = searchParams.get('month');
        return (m && MONTH_TABS.includes(m)) ? m : 'All Months';
    });
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || searchParams.get('code') || '');
    const [showFyDropdown, setShowFyDropdown] = useState(false);
    const fyOptions = useMemo(() => getAvailableFinancialYears(bookings), [bookings]);

    useEffect(() => {
        const qParam = searchParams.get('search') || searchParams.get('code');
        const mParam = searchParams.get('month');
        const fyParam = searchParams.get('fy');
        if (qParam !== null && qParam !== undefined && qParam !== '') {
            setSearchTerm(qParam);
        }
        if (mParam && MONTH_TABS.includes(mParam)) {
            setSelectedMonth(mParam);
        }
        if (fyParam) {
            setSelectedFy(fyParam);
        }
    }, [searchParams]);

    // Sorting
    const [sortField, setSortField] = useState('travelEndDate');
    const [sortAsc, setSortAsc] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchCompletedBookings();
            fetchBankAccounts();
            fetchCompanyInvoices();
        } else {
            setBookings([]);
        }
    }, [selectedCompany]);

    // Real Tax Invoices of this company (to show Generated / Not Generated state per booking)
    const [companyInvoices, setCompanyInvoices] = useState([]);
    const [generatingInvoiceFor, setGeneratingInvoiceFor] = useState(null);
    const [editInvoiceId, setEditInvoiceId] = useState(null);

    const fetchCompanyInvoices = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/invoices/${selectedCompany._id}?limit=5000`);
            setCompanyInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        }
    };

    const invoiceByBooking = useMemo(() => {
        const map = new Map();
        companyInvoices.forEach(inv => {
            if (inv.status === 'Cancelled') return;
            const bId = inv.booking?._id || inv.booking;
            if (bId) map.set(`id:${String(bId)}`, inv);
            if (inv.bookingId) map.set(`code:${String(inv.bookingId).trim()}`, inv);
        });
        return map;
    }, [companyInvoices]);

    const getBookingInvoice = (bkg) => {
        if (!bkg) return null;
        return invoiceByBooking.get(`id:${String(bkg._id)}`)
            || (bkg.clientCode && invoiceByBooking.get(`code:${String(bkg.clientCode).trim()}`))
            || (bkg.bookingId && invoiceByBooking.get(`code:${String(bkg.bookingId).trim()}`))
            || (bkg.bookingCode && invoiceByBooking.get(`code:${String(bkg.bookingCode).trim()}`))
            || null;
    };

    const handleGenerateInvoice = async (bkg) => {
        if (!bkg?._id) return;
        const code = bkg.bookingCode || bkg.clientCode || bkg.bookingId || '';
        if (!window.confirm(`Generate Tax Invoice for ${code} (${bkg.clientName || 'Guest'})?\nIt will be added to Tax Invoices with the next serial number.`)) return;
        try {
            setGeneratingInvoiceFor(bkg._id);
            const { data } = await axios.post(`/api/invoices/from-booking/${bkg._id}`);
            await fetchCompanyInvoices();
            alert(`Tax Invoice ${data?.invoiceNumber || ''} generated successfully!`);
        } catch (err) {
            console.error('Error generating invoice:', err);
            alert(err.response?.data?.message || 'Failed to generate invoice');
        } finally {
            setGeneratingInvoiceFor(null);
        }
    };

    const handleDownloadRealInvoice = (inv) => {
        if (!inv) return;
        const pdfData = {
            invoiceNumber: inv.invoiceNumber,
            date: inv.invoiceDate || new Date().toISOString(),
            bookingId: inv.bookingId || '',
            billTo: {
                name: inv.billTo?.name || 'Valued Guest',
                companyName: inv.billTo?.companyName || '',
                mobile: inv.billTo?.mobile || '',
                email: inv.billTo?.email || '',
                address: inv.billTo?.address || 'Local Fleet Service',
                gstin: inv.billTo?.gstin || '',
                placeOfSupply: inv.billTo?.placeOfSupply || 'Rajasthan (08)'
            },
            items: Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [{
                description: 'Rental & Travel Service',
                sacCode: inv.sacCode || '996601',
                quantity: 1,
                rate: Number(inv.taxableAmount) || 0,
                amount: Number(inv.taxableAmount) || 0
            }],
            gstMode: inv.gstMode || 'GST Inclusive',
            gstRate: inv.gstRate ?? 5,
            isInterState: Boolean(inv.isInterState),
            advanceAdjusted: Number(inv.advanceAdjusted) || 0,
            notes: inv.notes || 'Official Tax Invoice'
        };
        generateTaxInvoicePDF(pdfData, selectedCompany);
    };

    const fetchBankAccounts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/banks/company/${selectedCompany._id}`);
            setBankAccounts(data || []);
            if (data && data.length > 0) {
                const def = data.find(b => b.isDefault) || data[0];
                setBankAccountId(def._id);
            }
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const fetchCompletedBookings = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}?status=Completed`);
            if (Array.isArray(data) && data.length > 0) {
                const formatted = data.map(b => {
                    // Extract vehicle numbers & driver names from itinerary or root
                    const vehNums = [...new Set((b.itinerary || []).map(i => i.vehicleNumber).filter(Boolean))];
                    if (b.vehicleNumber && !vehNums.includes(b.vehicleNumber)) vehNums.unshift(b.vehicleNumber);

                    const drivers = [...new Set((b.itinerary || []).map(i => i.driverName).filter(Boolean))];
                    if (b.driverName && !drivers.includes(b.driverName)) drivers.unshift(b.driverName);

                    // Extract duties / route description from itinerary
                    const duties = (b.itinerary || [])
                        .map(i => (i.duty || i.description || i.pickupPoint || '').trim())
                        .filter(Boolean);

                    let routeSummary = '';
                    if (b.pickupPoint && b.dropPoint) {
                        routeSummary = `${b.pickupPoint} ➔ ${b.dropPoint}`;
                    } else if (b.route) {
                        routeSummary = b.route;
                    } else if (duties.length > 0) {
                        routeSummary = duties.join(' ➔ ');
                    } else if (b.pickupPoint) {
                        routeSummary = b.pickupPoint;
                    } else if (b.dropPoint) {
                        routeSummary = `➔ ${b.dropPoint}`;
                    }

                    const displayCode = b.clientCode || b.bookingCode || b.bookingId || 'BKG';
                    const pkgAmt = Number(b.totalAmount || b.packagePrice) || 0;
                    const advAmt = Number(b.advancePaid) || 0;
                    const balAmt = b.balanceDue !== undefined ? Math.max(0, Number(b.balanceDue)) : Math.max(0, pkgAmt - advAmt);

                    return {
                        ...b,
                        _id: b._id,
                        bookingId: displayCode,
                        bookingCode: displayCode,
                        rawBookingId: b.bookingId,
                        clientCode: b.clientCode || displayCode,
                        guestName: b.clientName || b.guestName || 'Valued Guest',
                        clientName: b.clientName || b.guestName || 'Valued Guest',
                        mobileNumber: b.mobileNumber || '',
                        packagePrice: pkgAmt,
                        totalAmount: pkgAmt,
                        advancePaid: advAmt,
                        balanceDue: balAmt,
                        vehicleType: b.vehicleType || 'Commercial Vehicle',
                        vehicleNumbers: vehNums,
                        primaryVehicleNumber: vehNums[0] || b.vehicleNumber || '',
                        driverNames: drivers,
                        primaryDriverName: drivers[0] || b.driverName || '',
                        routeSummary: routeSummary,
                        travelStartDate: b.travelStartDate,
                        travelEndDate: b.travelEndDate,
                        createdAt: b.createdAt
                    };
                });
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

    const handleOpenPaymentModal = (bkg) => {
        if (!bkg) return;
        const pkg = Number(bkg.packagePrice || bkg.totalAmount) || 0;
        const adv = Number(bkg.advancePaid) || 0;
        const due = bkg.balanceDue !== undefined ? Math.max(0, Number(bkg.balanceDue)) : Math.max(0, pkg - adv);
        setPaymentModalBooking(bkg);
        setPaymentAmount(due > 0 ? String(due) : '');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentRef('');
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!paymentModalBooking) return;
        try {
            setSavingPayment(true);
            const isCash = paymentMode === 'Cash' || paymentMode === 'Driver Cash';
            await axios.post(`/api/bookings/${paymentModalBooking._id}/payment`, {
                amount: Number(paymentAmount),
                paymentMode,
                paymentReference: paymentRef,
                paymentDate,
                bankAccountId: !isCash ? bankAccountId : undefined
            });
            setPaymentModalBooking(null);
            setPaymentAmount('');
            setPaymentRef('');
            await fetchCompletedBookings();
            fetchCompanyInvoices();
            alert('Balance payment recorded! Tax Invoice is now ready.');
        } catch (error) {
            console.error('Error recording payment:', error);
            alert(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setSavingPayment(false);
        }
    };

    // Filter & Sort
    const processedBookings = useMemo(() => {
        let list = bookings;

        // 0. Strict completed validation: trips whose travel dates are in the future cannot be completed
        const nowEnd = new Date();
        nowEnd.setHours(23, 59, 59, 999);
        list = list.filter(b => {
            if (b.bookingStatus === 'Cancelled' || b.status === 'Cancelled') return false;
            if (b.travelStartDate) {
                const d = new Date(b.travelStartDate);
                if (!isNaN(d.getTime()) && d > nowEnd) return false;
            }
            return true;
        });

        // Financial Year filter
        if (selectedFy && selectedFy !== 'All FY') {
            list = list.filter(b => {
                const itemFy = getFinancialYear(b.travelStartDate || b.travelEndDate || b.createdAt);
                return itemFy === selectedFy;
            });
        }

        // Month filter (based on trip dates)
        if (selectedMonth && selectedMonth !== 'All Months') {
            list = list.filter(b => {
                const d = new Date(b.travelStartDate || b.travelEndDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });
        }

        // Search filter (searches across booking code, guest, phone, car, plate, driver, route)
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(b => (
                (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
                (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
                (b.rawBookingId && b.rawBookingId.toLowerCase().includes(q)) ||
                (b.guestName && b.guestName.toLowerCase().includes(q)) ||
                (b.clientName && b.clientName.toLowerCase().includes(q)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(q)) ||
                (b.primaryVehicleNumber && b.primaryVehicleNumber.toLowerCase().includes(q)) ||
                (b.primaryDriverName && b.primaryDriverName.toLowerCase().includes(q)) ||
                (b.routeSummary && b.routeSummary.toLowerCase().includes(q)) ||
                (b.vehicleNumbers && b.vehicleNumbers.some(v => v.toLowerCase().includes(q))) ||
                (b.driverNames && b.driverNames.some(d => d.toLowerCase().includes(q))) ||
                (b.pickupPoint && b.pickupPoint.toLowerCase().includes(q)) ||
                (b.dropPoint && b.dropPoint.toLowerCase().includes(q))
            ));
        }

        // Sorting
        return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'packagePrice' || sortField === 'totalAmount' || sortField === 'advancePaid' || sortField === 'balanceDue') {
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
        const receivedAmount = processedBookings.reduce((sum, b) => {
            const fuel = b.guestFuelFilled ? (Number(b.guestFuelAmount) || 0) : 0;
            return sum + (Number(b.advancePaid) || 0) + fuel;
        }, 0);
        const balanceDue = processedBookings.reduce((sum, b) => {
            const pkg = Number(b.packagePrice || b.totalAmount) || 0;
            const fuel = b.guestFuelFilled ? (Number(b.guestFuelAmount) || 0) : 0;
            const adv = (Number(b.advancePaid) || 0) + fuel;
            const bal = b.balanceDue !== undefined ? Math.max(0, Number(b.balanceDue)) : Math.max(0, pkg - adv);
            return sum + bal;
        }, 0);
        const taxInvoices = processedBookings.length;

        return {
            totalRides,
            packageValue,
            receivedAmount,
            balanceDue,
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
        const realInv = getBookingInvoice(bkg);
        if (realInv) {
            handleDownloadRealInvoice(realInv);
            return;
        }
        // No tax invoice yet -> generate it first (adds to Tax Invoices with serial number)
        handleGenerateInvoice(bkg);
    };

    // eslint-disable-next-line no-unused-vars
    const handleDownloadDraftInvoice = (bkg) => {
        const invoicePayload = {
            invoiceNumber: `INV-${bkg.bookingId?.replace('/', '-') || bkg._id?.slice(-5) || '001'}`,
            date: bkg.travelEndDate || bkg.travelStartDate || new Date().toISOString(),
            bookingId: bkg.bookingId || bkg.bookingCode,
            billTo: {
                name: bkg.guestName || bkg.clientName,
                companyName: bkg.client?.name || '',
                mobile: bkg.mobileNumber || '',
                email: bkg.email || '',
                address: bkg.client?.address || 'Local Fleet Service',
                gstin: bkg.gstin || bkg.client?.gstNumber || '',
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
            gstMode: bkg.gstMode || 'GST Inclusive',
            gstRate: bkg.gstRate || 5,
            isInterState: false,
            advanceAdjusted: Number(bkg.advancePaid) || 0,
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
                            Manage finished trip accounts, clear balance payments, and download GST tax invoices.
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '18px'
            }}>
                {/* Total Completed Rides */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                        flexShrink: 0
                    }}>
                        <CheckCircle size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Completed Rides
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff', marginTop: '1px' }}>
                            {kpiStats.totalRides}
                        </div>
                    </div>
                </div>

                {/* Package Value */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                        flexShrink: 0
                    }}>
                        <IndianRupee size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Total Tour Value
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff', marginTop: '1px' }}>
                            ₹{kpiStats.packageValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Received Amount */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                        flexShrink: 0
                    }}>
                        <CreditCard size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Received Amount
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#34d399', marginTop: '1px' }}>
                            ₹{kpiStats.receivedAmount.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Balance Due */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        flexShrink: 0
                    }}>
                        <Hourglass size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Balance Pending
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: kpiStats.balanceDue > 0 ? '#f87171' : '#34d399', marginTop: '1px' }}>
                            ₹{kpiStats.balanceDue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Tax Invoices */}
                <div style={{
                    background: 'rgba(13, 21, 38, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                        flexShrink: 0
                    }}>
                        <Receipt size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>
                            Tax Invoices Ready
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff', marginTop: '1px' }}>
                            {kpiStats.taxInvoices}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Completed Bookings Table */}
            <div style={{
                background: 'rgba(13, 21, 38, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                overflow: 'visible',
                marginBottom: '20px'
            }}>
                <div style={{ overflowX: 'auto', minHeight: '420px', paddingBottom: activeActionMenu ? '220px' : '24px', transition: 'padding-bottom 0.2s ease' }}>
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
                                <th style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', width: '44px' }}>
                                    #
                                </th>
                                <th
                                    onClick={() => handleSort('bookingId')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Booking ID <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('guestName')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Guest & Contact <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('travelStartDate')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Trip Dates <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('packagePrice')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Package (₹) <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('advancePaid')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Received (₹) <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('balanceDue')}
                                    style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Balance (₹) <ArrowUpDown size={11} />
                                    </div>
                                </th>
                                <th style={{ padding: '11px 12px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    Fleet
                                </th>
                                <th style={{ padding: '11px 12px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    Ledger
                                </th>
                                <th style={{ padding: '11px 12px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    Invoice
                                </th>
                                <th style={{ padding: '11px 14px', fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', width: '60px' }}>
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={11} style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                        No completed bookings found for {selectedMonth} {selectedFy}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBookings.map((bkg, idx) => {
                                    const serialNo = (currentPage - 1) * itemsPerPage + idx + 1;
                                    const pkgPrice = Number(bkg.packagePrice || bkg.totalAmount) || 0;
                                    const fuelAmt = bkg.guestFuelFilled ? (Number(bkg.guestFuelAmount) || 0) : 0;
                                    const recAmt = (Number(bkg.advancePaid) || 0) + fuelAmt;
                                    const bal = bkg.balanceDue !== undefined ? Math.max(0, Number(bkg.balanceDue)) : Math.max(0, pkgPrice - recAmt);
                                    const daysCount = Array.isArray(bkg.itinerary) && bkg.itinerary.length > 0 
                                        ? bkg.itinerary.length 
                                        : 1;
                                    const rowMenuId = bkg._id || idx;

                                    return (
                                        <tr
                                            key={rowMenuId}
                                            style={{
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Serial No */}
                                            <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                                                {serialNo}
                                            </td>

                                            {/* Booking ID */}
                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#fbbf24', fontFamily: 'monospace' }}>
                                                    {bkg.bookingId}
                                                </span>
                                            </td>

                                            {/* Guest Name & Mobile */}
                                            <td style={{ padding: '10px 14px' }}>
                                                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#ffffff' }}>
                                                    {bkg.guestName}
                                                </div>
                                                {bkg.mobileNumber && (
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={9} /> {bkg.mobileNumber}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Trip Dates */}
                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                    {formatTripDate(bkg.travelStartDate)} {bkg.travelEndDate && bkg.travelEndDate !== bkg.travelStartDate ? `- ${formatTripDate(bkg.travelEndDate)}` : ''}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                                                    {daysCount} {daysCount > 1 ? 'Days Tour' : 'Day Tour'}
                                                </div>
                                            </td>

                                            {/* Package Price */}
                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#ffffff' }}>
                                                    ₹{pkgPrice.toLocaleString('en-IN')}
                                                </span>
                                            </td>

                                            {/* Received Amount */}
                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#34d399' }}>
                                                    ₹{recAmt.toLocaleString('en-IN')}
                                                </span>
                                            </td>

                                            {/* Balance Due */}
                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                {bal > 0 ? (
                                                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#f87171' }}>
                                                        ₹{bal.toLocaleString('en-IN')}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#34d399' }}>
                                                        ₹0
                                                    </span>
                                                )}
                                            </td>

                                            {/* Assigned Fleet / Driver */}
                                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                                {(() => {
                                                    const veh = bkg.primaryVehicleNumber || (bkg.vehicleNumbers && bkg.vehicleNumbers[0]) || '';
                                                    const drv = bkg.primaryDriverName || (bkg.driverNames && bkg.driverNames[0]) || '';
                                                    const hasFleet = Boolean(veh || drv);
                                                    const cleanVeh = veh ? veh.split('#')[0] : '';
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssigningBooking(bkg)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                background: hasFleet ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                                border: `1px solid ${hasFleet ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                                                                borderRadius: '8px',
                                                                padding: '4px 8px',
                                                                color: hasFleet ? '#38bdf8' : '#fbbf24',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            title="Assign / Reassign Drivers & Vehicles"
                                                        >
                                                            <Car size={12} />
                                                            <span>{hasFleet ? ((bkg.vehicleNumbers && bkg.vehicleNumbers.length > 1) ? `Multiple Cars (${bkg.vehicleNumbers.length})` : (cleanVeh || drv)) : '+ Assign'}</span>
                                                        </button>
                                                    );
                                                })()}
                                            </td>

                                            {/* Client Ledger */}
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setLedgerModalBooking(bkg)}
                                                    title="Open Client Account Ledger & Payment Statement"
                                                    style={{
                                                        padding: '4px 11px',
                                                        background: '#2563eb',
                                                        border: 'none',
                                                        borderRadius: '16px',
                                                        color: '#ffffff',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    Accounts
                                                </button>
                                            </td>

                                            {/* Tax Invoice: Red = not generated (click to generate) | Green = generated (click to edit) + Download */}
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                {(() => {
                                                    const inv = getBookingInvoice(bkg);
                                                    if (!inv) {
                                                        const busy = generatingInvoiceFor === bkg._id;
                                                        return (
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => handleGenerateInvoice(bkg)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    background: 'rgba(239, 68, 68, 0.18)',
                                                                    border: '1px solid rgba(248, 113, 113, 0.5)',
                                                                    borderRadius: '16px',
                                                                    padding: '4px 10px',
                                                                    color: '#f87171',
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    cursor: busy ? 'wait' : 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title="Invoice not generated yet — click to generate Tax Invoice"
                                                            >
                                                                <Receipt size={11} />
                                                                <span>{busy ? 'Generating...' : 'Invoice'}</span>
                                                            </button>
                                                        );
                                                    }
                                                    const shortNo = String(inv.invoiceNumber || '').replace(/^LK-/, '');
                                                    return (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditInvoiceId(inv._id)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    background: 'rgba(16, 185, 129, 0.18)',
                                                                    border: '1px solid rgba(52, 211, 153, 0.5)',
                                                                    borderRadius: '16px',
                                                                    padding: '4px 10px',
                                                                    color: '#34d399',
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title={`Tax Invoice ${inv.invoiceNumber} — click to edit`}
                                                            >
                                                                <CheckCircle size={11} />
                                                                <span>{shortNo || 'Invoice'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownloadRealInvoice(inv)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: 'rgba(2, 132, 199, 0.2)',
                                                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                                                    borderRadius: '50%',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    color: '#38bdf8',
                                                                    cursor: 'pointer',
                                                                    padding: 0
                                                                }}
                                                                title="Download Tax Invoice PDF"
                                                            >
                                                                <Download size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Action Menu (3-dot dropdown matching Confirmed Bookings) */}
                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveActionMenu(activeActionMenu === rowMenuId ? null : rowMenuId)}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '6px',
                                                            background: 'transparent',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            color: 'rgba(255,255,255,0.8)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Booking Actions"
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>

                                                    {activeActionMenu === rowMenuId && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: '100%',
                                                            marginTop: '4px',
                                                            background: '#0B1121',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: '10px',
                                                            padding: '5px',
                                                            width: '185px',
                                                            zIndex: 200,
                                                            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                                            textAlign: 'left'
                                                        }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveActionMenu(null); setEditingBooking(bkg); }}
                                                                style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Edit size={13} color="#a78bfa" /> Edit Booking
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveActionMenu(null); setAssigningBooking(bkg); }}
                                                                style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Car size={13} color="#38bdf8" /> Assign Drivers & Vehicles
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveActionMenu(null); handleOpenPaymentModal(bkg); }}
                                                                style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <IndianRupee size={13} color="#4ade80" /> Record Payment
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveActionMenu(null); handleDownloadInvoice(bkg); }}
                                                                style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Receipt size={13} color="#38bdf8" /> Download Invoice
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveActionMenu(null); const inv = getBookingInvoice(bkg); if (inv) setEditInvoiceId(inv._id); else handleGenerateInvoice(bkg); }}
                                                                style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <FileText size={13} color="#fbbf24" /> Customize Invoice
                                                            </button>
                                                        </div>
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
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>{viewItineraryBooking.vehicleType || 'Commercial Vehicle'}</div>
                                    {(viewItineraryBooking.primaryVehicleNumber || (viewItineraryBooking.vehicleNumbers && viewItineraryBooking.vehicleNumbers.length > 0)) && (
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                            Car: {viewItineraryBooking.vehicleNumbers?.join(', ') || viewItineraryBooking.primaryVehicleNumber}
                                        </div>
                                    )}
                                    {(viewItineraryBooking.primaryDriverName || (viewItineraryBooking.driverNames && viewItineraryBooking.driverNames.length > 0)) && (
                                        <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>
                                            Driver: {viewItineraryBooking.driverNames?.join(', ') || viewItineraryBooking.primaryDriverName}
                                        </div>
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
                                                {viewItineraryBooking.routeSummary || viewItineraryBooking.pickupPoint || 'Tour Package / Sightseeing'}
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
                    onAddEntry={() => {
                        const bkg = ledgerModalBooking;
                        const pkg = Number(bkg.packagePrice || bkg.totalAmount) || 0;
                        const adv = Number(bkg.advancePaid) || 0;
                        const bal = Math.max(0, pkg - adv);
                        if (bal <= 0) {
                            alert('Booking is already fully paid and settled.');
                            return;
                        }
                        setLedgerModalBooking(null);
                        handleOpenPaymentModal(bkg);
                    }}
                    onEditBooking={() => {
                        const bkg = ledgerModalBooking;
                        setLedgerModalBooking(null);
                        setEditingBooking(bkg);
                    }}
                    onEntryUpdated={() => {
                        fetchCompletedBookings();
                    }}
                />
            )}

            {/* RECORD PAYMENT MODAL */}
            <AnimatePresence>
                {paymentModalBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '480px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Record Balance Payment</h2>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                        Booking: <strong style={{ color: '#fbbf24' }}>{paymentModalBooking.bookingId}</strong> • Guest: <strong style={{ color: 'white' }}>{paymentModalBooking.guestName}</strong>
                                    </div>
                                </div>
                                <button onClick={() => setPaymentModalBooking(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Amount to Receive (₹)</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: 'white',
                                                outline: 'none',
                                                fontSize: '13px'
                                            }}
                                            placeholder="Amount"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            onClick={e => e.target.showPicker?.()}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: 'white',
                                                outline: 'none',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="Cash">💵 Cash to Company (Cash Book)</option>
                                        <option value="UPI / QR Code">📱 UPI / QR Code (Bank Account)</option>
                                        <option value="Bank Transfer / NEFT">🏦 Bank Transfer / NEFT</option>
                                    </select>
                                </div>
                                {paymentMode !== 'Cash' && (
                                    <BankSelector
                                        bankAccounts={bankAccounts}
                                        value={bankAccountId}
                                        onChange={setBankAccountId}
                                        amount={paymentAmount}
                                        label="Credit to Bank Account"
                                        required
                                    />
                                )}
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Reference / UTR (Optional)</label>
                                    <input
                                        type="text"
                                        value={paymentRef}
                                        onChange={e => setPaymentRef(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: 'white',
                                            outline: 'none',
                                            fontSize: '13px'
                                        }}
                                        placeholder="UTR or Transaction ID"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setPaymentModalBooking(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={savingPayment} style={{ flex: 1, padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
                                        {savingPayment ? 'Saving...' : 'Save Payment'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {editingBooking && (
                <EditBookingModal
                    booking={editingBooking}
                    onClose={() => setEditingBooking(null)}
                    onSuccess={() => {
                        setEditingBooking(null);
                        fetchCompletedBookings();
                        alert('Completed booking updated successfully!');
                    }}
                />
            )}

            {(editInvoiceId || invoiceModalBooking) && (
                <EditInvoiceModal
                    invoiceId={editInvoiceId}
                    booking={invoiceModalBooking}
                    onClose={() => { setEditInvoiceId(null); setInvoiceModalBooking(null); }}
                    onDownload={(inv) => handleDownloadRealInvoice(inv)}
                    onSuccess={() => {
                        setEditInvoiceId(null);
                        setInvoiceModalBooking(null);
                        fetchCompanyInvoices();
                        fetchCompletedBookings();
                        alert('Invoice updated successfully!');
                    }}
                />
            )}

            {assigningBooking && (
                <AssignDriverModal
                    isOpen={Boolean(assigningBooking)}
                    onClose={() => setAssigningBooking(null)}
                    booking={assigningBooking}
                    onSaved={() => {
                        fetchCompletedBookings();
                        setAssigningBooking(null);
                    }}
                    companyId={selectedCompany?._id}
                />
            )}
        </div>
    );
}
