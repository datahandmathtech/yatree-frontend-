import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Calendar, Car, IndianRupee, Download, CheckCircle, Clock,
    AlertCircle, Search, Filter, Phone, MessageSquare, Plus,
    FileText, X, ArrowUpRight, ShieldCheck, UserCheck,
    CreditCard, Hourglass, Edit, MoreVertical, User, ArrowUpDown,
    ChevronLeft, ChevronRight, AlertTriangle, AlertOctagon, Ban, XCircle, ChevronDown, Fuel, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';
import { generateClientLedgerPDF } from '../utils/clientLedgerPdf';
import EditBookingModal from '../components/common/EditBookingModal';
import ClientLedgerDrawer from '../components/common/ClientLedgerDrawer';
import AssignDriverModal from '../components/common/AssignDriverModal';
import BankSelector from '../components/common/BankSelector';
import { getFinancialYear, getAvailableFinancialYears } from '../utils/istUtils';

const MONTH_TABS = [
    'All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const BASELINE_DRIVERS = [
    { _id: 'drv-1', name: 'Ramesh Kumar', mobile: '+91 98765 11223', vehicleNumber: 'RJ14 PA 1234', vehicleModel: 'Innova Crysta' },
    { _id: 'drv-2', name: 'Suresh Gurjar', mobile: '+91 98234 22334', vehicleNumber: 'RJ14 TA 5678', vehicleModel: 'Innova' },
    { _id: 'drv-3', name: 'Mukesh Sharma', mobile: '+91 98111 33445', vehicleNumber: 'RJ14 PA 9012', vehicleModel: 'Ertiga' },
    { _id: 'drv-4', name: 'Mahesh Verma', mobile: '+91 97654 44556', vehicleNumber: 'RJ14 CA 3456', vehicleModel: 'Swift Dzire' },
    { _id: 'drv-5', name: 'Dinesh Yadav', mobile: '+91 98333 55667', vehicleNumber: 'RJ14 PA 7890', vehicleModel: 'Tempo Traveller' }
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

const isDatePassedBooking = (bkg) => {
    if (!bkg) return false;
    const status = (bkg.bookingStatus || '').toLowerCase();
    if (status === 'completed' || status === 'cancelled') return false;
    const dateVal = bkg.travelEndDate || bkg.travelStartDate;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
};

export default function Bookings() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFy, setSelectedFy] = useState(() => searchParams.get('fy') || 'FY 26-27');
    const [showFyDropdown, setShowFyDropdown] = useState(false);
    const fyOptions = useMemo(() => getAvailableFinancialYears(bookings), [bookings]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const m = searchParams.get('month');
        return (m && MONTH_TABS.includes(m)) ? m : 'All Months';
    });
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || searchParams.get('code') || '');

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

    // Ensure if navigated with a specific booking code, the month & FY match the actual booking record
    useEffect(() => {
        const targetCode = searchParams.get('code');
        if (targetCode && bookings.length > 0) {
            const matched = bookings.find(b =>
                (b.bookingCode && b.bookingCode.toLowerCase() === targetCode.toLowerCase()) ||
                (b.clientCode && b.clientCode.toLowerCase() === targetCode.toLowerCase()) ||
                (b.bookingId && b.bookingId.toLowerCase() === targetCode.toLowerCase())
            );
            if (matched) {
                const d = new Date(matched.travelStartDate || matched.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const actualMonth = months[d.getMonth()];
                    if (actualMonth && MONTH_TABS.includes(actualMonth)) {
                        setSelectedMonth(actualMonth);
                    }
                }
                const actualFy = getFinancialYear(matched.travelStartDate || matched.travelEndDate || matched.createdAt);
                if (actualFy) {
                    setSelectedFy(actualFy);
                }
            }
        }
    }, [bookings, searchParams]);

    // Sorting state
    const [sortField, setSortField] = useState('createdAt');
    const [sortAsc, setSortAsc] = useState(false);

    // Hover tooltip state for Booking Code
    const [hoveredBookingId, setHoveredBookingId] = useState(null);

    // Action menu state
    const [activeActionMenu, setActiveActionMenu] = useState(null);

    // Modals
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [ledgerModalBooking, setLedgerModalBooking] = useState(null);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    // Invoice Form Data
    const [invoiceFormData, setInvoiceFormData] = useState({
        billTo: { name: '', companyName: '', mobile: '', email: '', address: '', gstin: '', placeOfSupply: 'Rajasthan (08)' },
        items: [],
        gstMode: 'GST Extra',
        gstRate: 5,
        isInterState: false,
        advanceAdjusted: 0,
        notes: ''
    });

    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [paymentRef, setPaymentRef] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bankAccountId, setBankAccountId] = useState('');

    // Cancel Form
    const [cancelReason, setCancelReason] = useState('');
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundMode, setRefundMode] = useState('Bank');
    const [cancelling, setCancelling] = useState(false);

    // Assign Driver Modal State
    const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
    const [assigningBooking, setAssigningBooking] = useState(null);
    const [assignItinerary, setAssignItinerary] = useState([]);
    const [driversList, setDriversList] = useState([]);
    const [vehiclesList, setVehiclesList] = useState([]);
    const [savingAssignment, setSavingAssignment] = useState(false);
    const [downloadOptionModal, setDownloadOptionModal] = useState(null);
    const [masterDriverId, setMasterDriverId] = useState('');
    const [masterVehicleNumber, setMasterVehicleNumber] = useState('');
    const [copySuccessMsg, setCopySuccessMsg] = useState('');

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchBookings();
            fetchDriversAndVehicles();
            fetchBankAccounts();
        } else {
            setBookings([]);
        }
    }, [selectedCompany]);

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

    const fetchDriversAndVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [dRes, vRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&status=active`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] }))
            ]);
            setDriversList(dRes.data?.drivers || dRes.data || []);
            setVehiclesList(vRes.data?.vehicles || vRes.data || []);
        } catch (err) {
            console.error('Error fetching drivers/vehicles:', err);
        }
    };

    const showTemporaryCopyBanner = (msg) => {
        setCopySuccessMsg(msg);
        setTimeout(() => {
            setCopySuccessMsg('');
        }, 3500);
    };

    const handleApplyMasterDriver = (driverVal) => {
        setMasterDriverId(driverVal);
        const allDrivers = driversList || [];
        let drvId = '';
        let drvName = '';
        let drvPhone = '';
        let vehNum = masterVehicleNumber;
        let vehId = '';

        if (driverVal && driverVal !== '__custom__') {
            const found = allDrivers.find(d => String(d._id) === String(driverVal));
            if (found) {
                drvId = found._id;
                drvName = found.name;
                drvPhone = found.mobile || found.phone || '';
                if (found.vehicleNumber || found.vehicle?.carNumber) {
                    vehNum = found.vehicleNumber || found.vehicle?.carNumber;
                    vehId = found.vehicleId || found.vehicle?._id || '';
                    setMasterVehicleNumber(vehNum);
                }
            }
        } else if (driverVal === '__custom__') {
            drvId = 'custom';
        }

        setAssignItinerary(prev => prev.map(day => ({
            ...day,
            driverId: drvId,
            driverName: drvName || (drvId === 'custom' ? day.driverName : ''),
            driverPhone: drvPhone || (drvId === 'custom' ? day.driverPhone : ''),
            vehicleNumber: vehNum || day.vehicleNumber,
            vehicleId: vehId || day.vehicleId
        })));
    };

    const handleApplyMasterVehicle = (vehVal) => {
        setMasterVehicleNumber(vehVal);
        const allVehicles = vehiclesList || [];
        const matchedVeh = allVehicles.find(
            v => String(v._id) === String(vehVal) || (v.carNumber && v.carNumber.toLowerCase() === String(vehVal).trim().toLowerCase())
        );
        setAssignItinerary(prev => prev.map(day => ({
            ...day,
            vehicleId: matchedVeh ? matchedVeh._id : '',
            vehicleNumber: matchedVeh ? matchedVeh.carNumber : vehVal,
            vehicleType: matchedVeh?.carType || day.vehicleType
        })));
    };

    const handleCopyDayToAll = (sourceIdx = 0, mode = 'all') => {
        const src = assignItinerary[sourceIdx];
        if (!src) return;
        setAssignItinerary(prev => prev.map((day, idx) => {
            if (idx === sourceIdx) return day;
            if (mode === 'below' && idx < sourceIdx) return day;
            return {
                ...day,
                driverId: src.driverId || '',
                driverName: src.driverName || '',
                driverPhone: src.driverPhone || '',
                vehicleId: src.vehicleId || '',
                vehicleNumber: src.vehicleNumber || '',
                vehicleType: src.vehicleType || day.vehicleType
            };
        }));
        if (src.driverId) setMasterDriverId(src.driverId);
        if (src.vehicleNumber) setMasterVehicleNumber(src.vehicleNumber);
        if (mode === 'all') {
            showTemporaryCopyBanner(`Copied Day ${sourceIdx + 1} Driver & Vehicle across all ${assignItinerary.length} days!`);
        } else {
            showTemporaryCopyBanner(`Copied Day ${sourceIdx + 1} Driver & Vehicle to Day ${sourceIdx + 2} → Day ${assignItinerary.length}!`);
        }
    };

    const handleCopyPreviousDay = (targetIdx) => {
        if (targetIdx <= 0) return;
        const prevDay = assignItinerary[targetIdx - 1];
        if (!prevDay) return;
        setAssignItinerary(prev => prev.map((day, idx) => {
            if (idx !== targetIdx) return day;
            return {
                ...day,
                driverId: prevDay.driverId || '',
                driverName: prevDay.driverName || '',
                driverPhone: prevDay.driverPhone || '',
                vehicleId: prevDay.vehicleId || '',
                vehicleNumber: prevDay.vehicleNumber || '',
                vehicleType: prevDay.vehicleType || day.vehicleType
            };
        }));
        showTemporaryCopyBanner(`Copied Day ${targetIdx} Driver & Vehicle into Day ${targetIdx + 1}!`);
    };

    const handleAddExtraAssignDay = () => {
        setAssignItinerary(prev => {
            const lastDay = prev[prev.length - 1];
            let nextDateStr = new Date().toISOString().split('T')[0];
            if (lastDay?.date) {
                const d = new Date(lastDay.date);
                if (!isNaN(d.getTime())) {
                    d.setDate(d.getDate() + 1);
                    nextDateStr = d.toISOString().split('T')[0];
                }
            }
            return [
                ...prev,
                {
                    dayNo: prev.length + 1,
                    date: nextDateStr,
                    time: lastDay?.time || '09:00 AM',
                    isApg: Boolean(lastDay?.isApg),
                    pickupPoint: lastDay?.pickupPoint || '',
                    duty: lastDay?.duty || 'Local Sightseeing / Tour',
                    vehicleType: lastDay?.vehicleType || assigningBooking?.vehicleType || 'Innova Crysta',
                    driverId: lastDay?.driverId || '',
                    driverName: lastDay?.driverName || '',
                    driverPhone: lastDay?.driverPhone || '',
                    vehicleId: lastDay?.vehicleId || '',
                    vehicleNumber: lastDay?.vehicleNumber || '',
                    amount: lastDay?.amount || ''
                }
            ];
        });
    };

    const handleRemoveAssignDay = (idxToRemove) => {
        if (assignItinerary.length <= 1) return;
        setAssignItinerary(prev => prev.filter((_, idx) => idx !== idxToRemove).map((d, i) => ({
            ...d,
            dayNo: i + 1
        })));
    };

    const handleOpenAssignDriver = (bkg) => {
        setAssigningBooking(bkg);
        setCopySuccessMsg('');

        const sRaw = bkg.travelStartDate ? new Date(bkg.travelStartDate) : new Date();
        const s = isNaN(sRaw.getTime()) ? new Date() : sRaw;
        const eRaw = bkg.travelEndDate ? new Date(bkg.travelEndDate) : s;
        const e = isNaN(eRaw.getTime()) || eRaw < s ? s : eRaw;

        const sMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const eMidnight = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        const dateRangeDays = Math.max(1, Math.round((eMidnight - sMidnight) / 86400000) + 1);

        const excludedSet = new Set(
            Array.isArray(bkg.excludedDates)
                ? bkg.excludedDates.map(d => String(d).slice(0, 10))
                : []
        );

        const allCalendarDates = [];
        for (let dIdx = 0; dIdx < dateRangeDays; dIdx++) {
            const curDate = new Date(sMidnight);
            curDate.setDate(curDate.getDate() + dIdx);
            const y = curDate.getFullYear();
            const m = String(curDate.getMonth() + 1).padStart(2, '0');
            const dNum = String(curDate.getDate()).padStart(2, '0');
            allCalendarDates.push(`${y}-${m}-${dNum}`);
        }

        const activeCalendarDates = allCalendarDates.filter(dStr => !excludedSet.has(dStr));
        const effectiveActiveDates = activeCalendarDates.length > 0 ? activeCalendarDates : allCalendarDates;

        const existingItin = (Array.isArray(bkg.itinerary) ? bkg.itinerary : []).filter(
            it => !it.date || !excludedSet.has(String(it.date).slice(0, 10))
        );
        const existingDrs = (Array.isArray(bkg.drsDuties) ? bkg.drsDuties : []).filter(
            dr => !dr.date || !excludedSet.has(new Date(dr.date).toISOString().slice(0, 10))
        );
        const totalDays = Math.max(effectiveActiveDates.length, existingItin.length, existingDrs.length);

        const days = [];
        for (let i = 0; i < totalDays; i++) {
            const dayNo = i + 1;
            let defaultDateStr = effectiveActiveDates[i];
            if (!defaultDateStr) {
                const curDate = new Date(sMidnight);
                curDate.setDate(curDate.getDate() + i);
                const y = curDate.getFullYear();
                const m = String(curDate.getMonth() + 1).padStart(2, '0');
                const dNum = String(curDate.getDate()).padStart(2, '0');
                defaultDateStr = `${y}-${m}-${dNum}`;
            }

            const itinItem =
                existingItin.find(it => it.date && String(it.date).slice(0, 10) === defaultDateStr) ||
                existingItin.find(it => Number(it.dayNo) === dayNo) ||
                existingItin[i] ||
                {};

            const itemDateStr = itinItem.date ? String(itinItem.date).slice(0, 10) : defaultDateStr;

            const drsItem =
                existingDrs.find(dr => dr.date && new Date(dr.date).toISOString().slice(0, 10) === itemDateStr) ||
                existingDrs.find(dr => Number(dr.dayNo) === dayNo) ||
                (existingDrs.length === totalDays ? existingDrs[i] : null);

            const rawDrvId =
                (drsItem && (drsItem.driver?._id || drsItem.driver)) ||
                itinItem.driverId ||
                itinItem.driver?._id ||
                itinItem.driver ||
                '';

            const drvName =
                drsItem?.driver?.name ||
                drsItem?.customDriverName ||
                itinItem.driverName ||
                itinItem.driver?.name ||
                itinItem.customDriverName ||
                '';

            const drvPhone =
                drsItem?.driver?.mobile ||
                drsItem?.driverMobile ||
                itinItem.driverPhone ||
                itinItem.driver?.mobile ||
                itinItem.driverMobile ||
                '';

            const drvId = rawDrvId ? String(rawDrvId) : (drvName ? 'custom' : '');

            const rawVehId =
                (drsItem && (drsItem.vehicle?._id || drsItem.vehicle)) ||
                itinItem.vehicleId ||
                itinItem.vehicle?._id ||
                itinItem.vehicle ||
                '';

            const vehNum =
                drsItem?.vehicle?.carNumber ||
                drsItem?.customCarNumber ||
                itinItem.vehicleNumber ||
                itinItem.vehicle?.carNumber ||
                itinItem.customCarNumber ||
                '';

            const vehType =
                drsItem?.vehicle?.carType ||
                drsItem?.vehicleType ||
                itinItem.vehicleType ||
                bkg.vehicleType ||
                'Innova Crysta';

            const timeVal = drsItem?.pickupTime || drsItem?.time || itinItem.time || '09:00 AM';
            const isApgVal = drsItem?.isApg !== undefined ? Boolean(drsItem.isApg) : Boolean(itinItem.isApg || timeVal === 'APG');
            const pickupVal = drsItem?.pickupPoint || drsItem?.hotel || drsItem?.hotelName || itinItem.pickupPoint || bkg.pickupLocation || '';
            const dutyVal =
                drsItem?.duty ||
                drsItem?.sightseeing ||
                drsItem?.route ||
                itinItem.duty ||
                itinItem.description ||
                (bkg.tripDetails && totalDays === 1 ? bkg.tripDetails : '') ||
                '';

            const amtVal =
                (drsItem?.revenue !== undefined && Number(drsItem.revenue) > 0)
                    ? Number(drsItem.revenue)
                    : (itinItem.amount !== undefined && Number(itinItem.amount) > 0 ? Number(itinItem.amount) : '');

            days.push({
                dayNo,
                date: itemDateStr,
                time: timeVal,
                isApg: isApgVal,
                pickupPoint: pickupVal,
                duty: dutyVal,
                vehicleType: vehType,
                driverId: drvId,
                driverName: drvName,
                driverPhone: drvPhone,
                vehicleId: rawVehId ? String(rawVehId) : '',
                vehicleNumber: vehNum,
                amount: amtVal,
                km: itinItem.km || 0
            });
        }

        const firstAssigned = days.find(d => d.driverId || d.driverName);
        setMasterDriverId(firstAssigned ? (firstAssigned.driverId === 'custom' ? '__custom__' : firstAssigned.driverId) : '');
        setMasterVehicleNumber(firstAssigned ? firstAssigned.vehicleNumber : (bkg.vehicleNumber || ''));
        setAssignItinerary(days);
        setShowAssignDriverModal(true);
    };

    const handleCompleteBooking = async (bkg) => {
        const code = bkg.bookingCode || bkg.clientCode || bkg.bookingId || 'this booking';
        if (!window.confirm(`Mark ${code} as Completed? This booking will be moved to Completed Bookings.`)) {
            return;
        }
        try {
            await axios.put(`/api/bookings/single/${bkg._id}`, { bookingStatus: 'Completed' });
            fetchBookings();
        } catch (err) {
            console.error('Error completing booking:', err);
            alert('Failed to mark booking as completed');
        }
    };

    const handleSaveDriverAssignments = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            setSavingAssignment(true);
            const normalizedItinerary = assignItinerary.map((d, idx) => ({
                ...d,
                dayNo: idx + 1,
                duty: (d.duty || '').trim() || 'Local Sightseeing / Tour',
                description: (d.duty || '').trim() || 'Local Sightseeing / Tour',
                time: d.isApg ? 'APG' : (d.time || '09:00 AM')
            }));
            if (assigningBooking._id && !String(assigningBooking._id).startsWith('bkg-mock')) {
                await axios.post(`/api/bookings/${assigningBooking._id}/assign-drivers`, {
                    itinerary: normalizedItinerary
                });
                await fetchBookings();
            } else {
                setBookings(prev => prev.map(b => {
                    if (b._id === assigningBooking._id || b.bookingCode === assigningBooking.bookingCode) {
                        return { ...b, itinerary: normalizedItinerary };
                    }
                    return b;
                }));
            }
            alert('Drivers, Vehicles & Duty Schedule saved and synced to Live DRS!');
            setShowAssignDriverModal(false);
        } catch (err) {
            console.error('Error saving driver assignments:', err);
            alert(err.response?.data?.message || 'Failed to save driver assignments');
        } finally {
            setSavingAssignment(false);
        }
    };

    const handleUpdateDayDriver = (index, driverVal) => {
        const updated = [...assignItinerary];
        const allDrivers = driversList || [];
        if (!driverVal) {
            updated[index] = {
                ...updated[index],
                driverId: '',
                driverName: '',
                driverPhone: ''
            };
        } else if (driverVal === '__custom__') {
            updated[index] = {
                ...updated[index],
                driverId: 'custom',
                driverName: updated[index].driverName || '',
                driverPhone: updated[index].driverPhone || ''
            };
        } else {
            const found = allDrivers.find(d => String(d._id) === String(driverVal));
            if (found) {
                updated[index] = {
                    ...updated[index],
                    driverId: found._id,
                    driverName: found.name,
                    driverPhone: found.mobile || found.phone || '',
                    vehicleId: found.vehicleId || found.vehicle?._id || updated[index].vehicleId || '',
                    vehicleNumber: found.vehicleNumber || found.vehicle?.carNumber || updated[index].vehicleNumber || ''
                };
            }
        }
        setAssignItinerary(updated);
    };

    const handleUpdateDayVehicleSelect = (index, vehicleVal) => {
        const updated = [...assignItinerary];
        const allVehicles = vehiclesList || [];
        if (!vehicleVal) {
            updated[index] = {
                ...updated[index],
                vehicleId: '',
                vehicleNumber: ''
            };
        } else if (vehicleVal === '__custom__') {
            updated[index] = {
                ...updated[index],
                vehicleId: 'custom',
                vehicleNumber: updated[index].vehicleNumber || ''
            };
        } else {
            const found = allVehicles.find(v => String(v._id) === String(vehicleVal));
            if (found) {
                updated[index] = {
                    ...updated[index],
                    vehicleId: found._id,
                    vehicleNumber: found.carNumber || '',
                    vehicleType: found.carType || updated[index].vehicleType
                };
            }
        }
        setAssignItinerary(updated);
    };

    const handleUpdateDayField = (index, field, value) => {
        const updated = [...assignItinerary];
        const nextRow = {
            ...updated[index],
            [field]: value
        };
        if (field === 'driverName') {
            const allDrivers = driversList || [];
            const matchedDrv = allDrivers.find(d => d.name && d.name.toLowerCase() === String(value).trim().toLowerCase());
            if (!matchedDrv) {
                nextRow.driverId = value ? 'custom' : '';
            }
        }
        if (field === 'vehicleNumber') {
            const allVehicles = vehiclesList || [];
            const matchedVeh = allVehicles.find(v => v.carNumber && v.carNumber.toLowerCase() === String(value).trim().toLowerCase());
            nextRow.vehicleId = matchedVeh ? matchedVeh._id : '';
            if (matchedVeh?.carType) nextRow.vehicleType = matchedVeh.carType;
        }
        updated[index] = nextRow;
        setAssignItinerary(updated);
    };


    const handleConfirmCancel = async () => {
        if (!selectedBooking) return;
        try {
            setCancelling(true);
            const reason = cancelReason.trim() || 'Date Passed & Guest did not call (No-Show)';
            if (selectedBooking._id && !String(selectedBooking._id).startsWith('bkg-mock')) {
                await axios.post(`/api/bookings/${selectedBooking._id}/cancel`, { reason });
            }
            // Remove from active confirmed bookings
            setBookings(prev => prev.filter(b => b._id !== selectedBooking._id));
            setShowCancelModal(false);
            setCancelReason('');
                                                                    setRefundAmount(0);
                                                                    setRefundMode('Bank');
            alert(`Booking ${selectedBooking.bookingCode || selectedBooking.bookingId} cancelled and moved to Cancelled Bookings.`);
        } catch (err) {
            console.error('Error cancelling booking:', err);
            alert(err.response?.data?.message || 'Failed to cancel booking');
        } finally {
            setCancelling(false);
        }
    };

    const handleDeleteBooking = async (bkg) => {
        const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || 'Booking';
        const confirmDelete = window.confirm(
            `Are you sure you want to permanently delete Booking ${bkgCode} (${bkg.clientName || 'Guest'})?\n\nThis will also automatically delete all associated duties from Live DRS!`
        );
        if (!confirmDelete) return;

        try {
            setLoading(true);
            if (bkg._id && !String(bkg._id).startsWith('bkg-mock')) {
                await axios.delete(`/api/bookings/${bkg._id}`);
            }
            setBookings(prev => prev.filter(b => b._id !== bkg._id));
            alert(`Booking ${bkgCode} and associated Live DRS duties deleted successfully!`);
        } catch (err) {
            console.error('Error deleting booking:', err);
            alert(err.response?.data?.message || 'Failed to delete booking');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoCancelAllOverdue = async () => {
        const overdueList = processedBookings.filter(isDatePassedBooking);
        if (overdueList.length === 0) return;
        const confirmCancel = window.confirm(`Move all ${overdueList.length} date-passed booking(s) to Cancelled Bookings? (Reason: Date Passed & Guest did not call / No-Show)`);
        if (!confirmCancel) return;

        try {
            setLoading(true);
            for (const bkg of overdueList) {
                if (bkg._id && !String(bkg._id).startsWith('bkg-mock')) {
                    await axios.post(`/api/bookings/${bkg._id}/cancel`, {
                        reason: 'Date Passed & Guest did not call (No-Show)'
                    }).catch(e => console.error('Cancel error for bkg:', bkg._id, e));
                }
            }
            const overdueIds = new Set(overdueList.map(b => b._id));
            setBookings(prev => prev.filter(b => !overdueIds.has(b._id)));
            alert(`Successfully moved ${overdueList.length} date-passed ride(s) to Cancelled Bookings!`);
        } catch (err) {
            console.error('Error auto-cancelling overdue:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}`);
            if (Array.isArray(data) && data.length > 0) {
                const normalized = data.map(b => {
                    if (isDatePassedBooking(b)) {
                        if (b._id && !String(b._id).startsWith('bkg-mock')) {
                            axios.put(`/api/bookings/single/${b._id}`, { bookingStatus: 'Completed' }).catch(() => {});
                        }
                        return { ...b, bookingStatus: 'Completed' };
                    }
                    return b;
                });
                setBookings(normalized);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter & Sort Bookings
    const processedBookings = useMemo(() => {
        let list = bookings;

        // ONLY show active Confirmed and Ongoing bookings whose ride date has not completed yet
        list = list.filter(b =>
            (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Ongoing' || b.status === 'Confirmed' || b.status === 'Ongoing') &&
            !isDatePassedBooking(b)
        );

        // 0. Financial Year Filter
        if (selectedFy && selectedFy !== 'All FY') {
            list = list.filter(b => {
                const itemFy = getFinancialYear(b.travelStartDate || b.travelEndDate || b.createdAt);
                return itemFy === selectedFy;
            });
        }

        // 1. Month Filter
        if (selectedMonth !== 'All Months') {
            list = list.filter(b => {
                const d = new Date(b.travelStartDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });
        }

        // 2. Search Filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(b => (
                (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
                (b.clientCode && b.clientCode.toLowerCase().includes(q)) ||
                (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
                (b.clientName && b.clientName.toLowerCase().includes(q)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(q))
            ));
        }

        // 3. Sorting
          console.log('Final list length before sort:', list.length, 'selectedMonth:', selectedMonth);
          return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'bookingCode') {
                valA = a.bookingCode || a.clientCode || a.bookingId || '';
                valB = b.bookingCode || b.clientCode || b.bookingId || '';
            } else if (sortField === 'totalAmount' || sortField === 'advancePaid' || sortField === 'balanceDue') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [bookings, selectedMonth, selectedFy, searchTerm, sortField, sortAsc]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const totalBookings = processedBookings.length;
        const packageValue = processedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
        const receivedAmount = processedBookings.reduce((sum, b) => {
            const fuelAmt = (b.guestFuelFilled || Number(b.guestFuelAmount) > 0) ? (Number(b.guestFuelAmount) || 0) : 0;
            return sum + (Number(b.advancePaid) || 0) + fuelAmt;
        }, 0);
        const balanceDue = processedBookings.reduce((sum, b) => {
            const fuelAmt = (b.guestFuelFilled || Number(b.guestFuelAmount) > 0) ? (Number(b.guestFuelAmount) || 0) : 0;
            const bDue = b.balanceDue !== undefined ? Number(b.balanceDue) : Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.advancePaid) || 0) - fuelAmt);
            return sum + Math.max(0, bDue);
        }, 0);

        return {
            totalBookings,
            packageValue,
            receivedAmount,
            balanceDue
        };
    }, [processedBookings]);

    // Overdue / Date-Passed Bookings
    const overdueBookings = useMemo(() => {
        return processedBookings.filter(isDatePassedBooking);
    }, [processedBookings]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    
    const resolveEntryModeName = (entry, bkg = ledgerModalBooking) => {
        if (entry.type === 'Fuel') return 'Guest Fuel';
        if (entry.bankName) return entry.bankName;
        if (entry.paymentMode && !['UPI / QR Code', 'Bank Transfer / NEFT', 'Advance Payment', 'Payment Received'].includes(entry.paymentMode)) {
            if (/cash/i.test(entry.paymentMode)) return 'Cash';
            return entry.paymentMode;
        }
        const desc = entry.description || '';
        const parenMatch = desc.match(/\(([^)]+)\)/);
        if (parenMatch && parenMatch[1] && !/^Ref:/i.test(parenMatch[1].trim()) && !/^LK-/i.test(parenMatch[1].trim())) {
            return parenMatch[1].trim();
        }
        const viaPart = desc.split('via ')[1]?.split(' (')[0]?.trim();
        if (viaPart) {
            if (/cash/i.test(viaPart)) return 'Cash';
            if (!['UPI / QR Code', 'Bank Transfer / NEFT'].includes(viaPart)) return viaPart;
        }
        if (bkg?.bankName) return bkg.bankName;
        if (bkg?.paymentMode && /cash/i.test(bkg.paymentMode)) return 'Cash';
        return viaPart || (entry.type === 'Advance' ? 'Advance' : 'Bank');
    };

    const handleOpenLedger = (bkg) => {
        setLedgerModalBooking(bkg);
    };

    const handleOpenPaymentModal = (bkg) => {
        setSelectedBooking(bkg);
        const due = bkg.balanceDue !== undefined ? bkg.balanceDue : ((bkg.totalAmount || 0) - (bkg.advancePaid || 0));
        setPaymentAmount(due > 0 ? String(due) : '');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentRef('');
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            if (selectedBooking._id && !String(selectedBooking._id).startsWith('bkg-mock')) {
                const isCash = paymentMode === 'Cash' || paymentMode === 'Driver Cash';
                const { data } = await axios.post(`/api/bookings/${selectedBooking._id}/payment`, {
                    amount: Number(paymentAmount),
                    paymentMode,
                    paymentReference: paymentRef,
                    paymentDate,
                    bankAccountId: !isCash ? bankAccountId : undefined
                });
                fetchBookings();
                if (ledgerModalBooking && String(ledgerModalBooking._id) === String(selectedBooking._id)) {
                    const updatedBkg = data?.booking ? { ...ledgerModalBooking, ...data.booking } : {
                        ...ledgerModalBooking,
                        advancePaid: (Number(ledgerModalBooking.advancePaid) || 0) + Number(paymentAmount),
                        balanceDue: Math.max(0, (Number(ledgerModalBooking.totalAmount) || 0) - ((Number(ledgerModalBooking.advancePaid) || 0) + Number(paymentAmount)))
                    };
                    handleOpenLedger(updatedBkg);
                }
            } else {
                // Update local state for mock booking
                setBookings(prev => prev.map(b => {
                    if (b._id === selectedBooking._id) {
                        const newAdv = (Number(b.advancePaid) || 0) + Number(paymentAmount);
                        const newDue = Math.max(0, (Number(b.totalAmount) || 0) - newAdv);
                        return { ...b, advancePaid: newAdv, balanceDue: newDue };
                    }
                    return b;
                }));
            }
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentRef('');
            alert('Payment recorded successfully!');
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    const handleOpenDetailModal = (bkg) => {
        setSelectedBooking(bkg);
        setShowDetailModal(true);
    };

    const handleOpenInvoiceModal = (bkg) => {
        setSelectedBooking(bkg);
        const itineraryItems = (bkg.itinerary && bkg.itinerary.length > 0)
            ? bkg.itinerary.map((d, i) => ({
                description: `Day ${d.dayNo || i + 1}: ${d.duty || d.description || 'Chauffeur Driven Travel'} (${bkg.vehicleType || 'Cab'})`,
                sacCode: '996601',
                quantity: 1,
                rate: d.amount || 0,
                amount: d.amount || 0
            }))
            : [{
                description: `${bkg.numberOfCars || 1}x ${bkg.vehicleType || 'Motor Cab'} Rental Service (${bkg.bookingCode || bkg.bookingId})`,
                sacCode: '996601',
                quantity: 1,
                rate: bkg.taxableAmount || bkg.totalAmount || 0,
                amount: bkg.taxableAmount || bkg.totalAmount || 0
            }];

        setInvoiceFormData({
            billTo: {
                name: bkg.clientName || '',
                companyName: bkg.client?.name || '',
                mobile: bkg.mobileNumber || '',
                email: bkg.email || '',
                address: bkg.client?.address || '',
                gstin: bkg.gstin || bkg.client?.gstNumber || '',
                placeOfSupply: 'Rajasthan (08)'
            },
            items: itineraryItems,
            gstMode: bkg.gstMode || 'GST Extra',
            gstRate: bkg.gstRate || 5,
            isInterState: false,
            advanceAdjusted: bkg.advancePaid || 0,
            notes: `Booking Reference: ${bkg.bookingCode || bkg.bookingId}`
        });
        setShowInvoiceModal(true);
    };

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        try {
            setCreatingInvoice(true);
            const payload = {
                company: selectedCompany?._id,
                booking: selectedBooking?._id,
                bookingId: selectedBooking?.bookingCode || selectedBooking?.bookingId,
                billTo: invoiceFormData.billTo,
                items: invoiceFormData.items,
                gstMode: invoiceFormData.gstMode,
                gstRate: invoiceFormData.gstRate,
                isInterState: invoiceFormData.isInterState,
                advanceAdjusted: Number(invoiceFormData.advanceAdjusted) || 0,
                notes: invoiceFormData.notes,
                status: 'Issued'
            };

            const { data: newInv } = await axios.post('/api/invoices', payload);
            setShowInvoiceModal(false);
            fetchBookings();
            generateTaxInvoicePDF(newInv, selectedCompany);
            alert(`Tax Invoice ${newInv.invoiceNumber} generated & downloaded successfully!`);
        } catch (error) {
            console.error('Error generating invoice:', error);
            alert(error.response?.data?.message || 'Failed to generate tax invoice');
        } finally {
            setCreatingInvoice(false);
        }
    };

    const shareOnWhatsApp = (bkg) => {
        const cleanMobile = (bkg.mobileNumber || '').replace(/[^0-9]/g, '');
        const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
        const msg = `*Namaste ${bkg.clientName} ji!*\n\nYour booking with *${selectedCompany?.name || 'LogKaro Fleet'}* is confirmed!\n\n*Booking Code:* ${bkg.bookingCode || bkg.bookingId}\n*Vehicle:* ${bkg.vehicleType}\n*Start Date:* ${sDate}\n*Total Fare:* Rs. ${(bkg.totalAmount || 0).toLocaleString('en-IN')}\n*Advance Paid:* Rs. ${(bkg.advancePaid || 0).toLocaleString('en-IN')}\n*Balance Payable:* Rs. ${(bkg.balanceDue || 0).toLocaleString('en-IN')}\n\nHave a wonderful trip!\n\n_LogKaro Fleet Operations_`;

        const url = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.3)',
        color: 'white',
        outline: 'none',
        fontSize: '13px'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '30px 24px', position: 'relative' }}>
            <SEO title="Confirmed - LogKaro" />

            {/* TOP HEADER MATCHING EXACT MOCKUP */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        background: 'rgba(251, 191, 36, 0.08)',
                        color: '#fbbf24',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Calendar size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                            Confirmed Bookings
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '3px 0 0 0' }}>
                            All your live bookings in one place. Track, manage and handle accounts.
                        </p>
                    </div>
            {/* 4 KPI METRIC CARDS (Exact match with media_1788927832202.png) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px', marginBottom: '0', flex: 1
            }}>
                {/* 1. Total Bookings */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(2, 132, 199, 0.15)',
                        border: '1px solid rgba(2, 132, 199, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8'
                    }}>
                        <FileText size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Total Bookings
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            {kpiStats.totalBookings}
                        </div>
                    </div>
                </div>

                {/* 2. Package Value */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        background: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: '900'
                    }}>
                        <IndianRupee size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Package Value
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.packageValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* 3. Received Amount */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399'
                    }}>
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Received Amount
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.receivedAmount.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* 4. Balance Due */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171'
                    }}>
                        <Hourglass size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Balance Due
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.balanceDue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </div>
                </div>
                
                {/* Search Bar MOVED TO TOP ROW */}
                <div style={{
                    position: 'relative',
                    width: '320px',
                    maxWidth: '100%',
                    marginTop: '6px'
                }}>
                    <Search
                        size={15}
                        color="rgba(255,255,255,0.4)"
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search by booking code or mobile number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px 10px 38px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '24px',
                            color: 'white',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                    />
                </div>
            </div>

            {/* MONTH FILTER PILLS & FY SELECTOR */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
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
            </div>

            {/* DATE PASSED / NO-SHOW WARNING BANNER */}
            


            {/* FULL-WIDTH TABLE MATCHING SCREENSHOT (media_1788927832202.png) */}
            <div style={{
                background: '#070d19',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflowX: 'auto',
                minHeight: '420px',
                paddingBottom: activeActionMenu ? '220px' : '24px',
                transition: 'padding-bottom 0.2s ease',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                position: 'relative'
            }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                    <thead style={{ background: '#050a14', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', width: '50px' }}>
                                #
                            </th>
                            <th
                                onClick={() => handleSort('bookingCode')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Booking Code <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('totalAmount')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Package Price (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('advancePaid')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Received (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('balanceDue')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Balance (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('travelStartDate')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Trip Start <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('travelEndDate')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Trip End <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
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
                            <th
                                onClick={() => handleSort('bookingStatus')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Driver <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>
                                Client Ledger
                            </th>
                            <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '50px' }}>
                                    <div className="loader"></div>
                                </td>
                            </tr>
                        ) : processedBookings.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                                    No confirmed bookings found for the selected month.
                                </td>
                            </tr>
                        ) : (
                            processedBookings.map((bkg, index) => {
                                const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || `${index + 1}`;
                                const isRunning = (bkg.bookingStatus || '').toLowerCase() === 'running';
                                const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
                                const eDate = bkg.tripEndFormatted || formatTripDate(bkg.travelEndDate);

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
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600' }}>
                                            {index + 1}
                                        </td>

                                        {/* 2. Booking Code (with Hover Tooltip) */}
                                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                                            <div
                                                onMouseEnter={() => setHoveredBookingId(bkg._id || bkgCode)}
                                                onMouseLeave={() => setHoveredBookingId(null)}
                                                style={{ display: 'inline-block', position: 'relative' }}
                                            >
                                                <span style={{
                                                    color: '#fbbf24',
                                                    fontWeight: '800',
                                                    fontSize: '13px',
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: '3px',
                                                    cursor: 'pointer'
                                                }}>
                                                    {bkgCode}
                                                </span>

                                                {/* Hover Tooltip Popup matching screenshot */}
                                                <AnimatePresence>
                                                    {hoveredBookingId === (bkg._id || bkgCode) && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            transition={{ duration: 0.15 }}
                                                            style={{
                                                                position: 'absolute',
                                                                left: '100%',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                marginLeft: '12px',
                                                                background: '#070f21',
                                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                borderRadius: '10px',
                                                                padding: '10px 14px',
                                                                zIndex: 999,
                                                                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                                                                minWidth: '180px',
                                                                pointerEvents: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(255,255,255,0.08)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                flexShrink: 0
                                                            }}>
                                                                <User size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '800', fontSize: '13px', color: 'white', whiteSpace: 'nowrap' }}>
                                                                    {bkg.clientName || 'Guest'}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                                                    {bkg.mobileNumber || 'No mobile'}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>

                                        {/* 3. Package Price */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(Number(bkg.totalAmount) || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* 4. Received */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(() => {
                                                const fuelAmt = (bkg.guestFuelFilled || Number(bkg.guestFuelAmount) > 0) ? (Number(bkg.guestFuelAmount) || 0) : 0;
                                                const effRec = (Number(bkg.advancePaid) || 0) + fuelAmt;
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                        <span>{effRec.toLocaleString('en-IN')}</span>
                                                        {fuelAmt > 0 && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                color: '#34d399',
                                                                background: 'rgba(16, 185, 129, 0.15)',
                                                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                                                borderRadius: '4px',
                                                                padding: '1px 5px',
                                                                fontWeight: '800'
                                                            }}>
                                                                + ₹{fuelAmt.toLocaleString('en-IN')} Fuel
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>

                                        {/* 5. Balance */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(() => {
                                                const fuelAmt = (bkg.guestFuelFilled || Number(bkg.guestFuelAmount) > 0) ? (Number(bkg.guestFuelAmount) || 0) : 0;
                                                const effRec = (Number(bkg.advancePaid) || 0) + fuelAmt;
                                                const effBal = bkg.balanceDue !== undefined 
                                                    ? Math.max(0, Number(bkg.balanceDue)) 
                                                    : Math.max(0, (Number(bkg.totalAmount) || 0) - effRec);
                                                return (
                                                    <span style={{ color: effBal === 0 ? '#34d399' : '#fbbf24' }}>
                                                        {effBal.toLocaleString('en-IN')}
                                                    </span>
                                                );
                                            })()}
                                        </td>

                                        {/* 6. Trip Start */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            {sDate}
                                        </td>

                                        {/* 7. Trip End */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            <div>{eDate}</div>
                                            {Array.isArray(bkg.excludedDates) && bkg.excludedDates.length > 0 && (
                                                <div
                                                    style={{
                                                        marginTop: '3px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: 'rgba(239, 68, 68, 0.14)',
                                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                                        color: '#f87171',
                                                        padding: '1px 6px',
                                                        borderRadius: '5px',
                                                        fontSize: '10px',
                                                        fontWeight: '800',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title={`Break / No Car Dates: ${bkg.excludedDates.join(', ')}`}
                                                >
                                                    ⏸️ Break ({bkg.excludedDates.length} Off)
                                                </div>
                                            )}
                                        </td>

                                        {/* 8. Car Type */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            {bkg.vehicleType || '-'}
                                        </td>

                                        {/* 9. Status Pill */}
                                        <td style={{ padding: '14px 16px' }}>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                                                  {(() => {
                                                       const drsArr = Array.isArray(bkg.drsDuties) ? bkg.drsDuties : [];
                                                       const itinArr = Array.isArray(bkg.itinerary) ? bkg.itinerary : [];
                                                       const isLiveInDrs = drsArr.length > 0;

                                                       const allVehiclesSet = new Set();
                                                       const allDriversSet = new Set();

                                                       drsArr.forEach(d => {
                                                           const v = (d.vehicle?.carNumber || d.customCarNumber || '').split('#')[0].trim();
                                                           if (v) allVehiclesSet.add(v);
                                                           const dr = (d.driver?.name || d.customDriverName || '').trim();
                                                           if (dr) allDriversSet.add(dr);
                                                       });

                                                       itinArr.forEach(it => {
                                                           const v = (it.vehicleNumber || '').split('#')[0].trim();
                                                           if (v) allVehiclesSet.add(v);
                                                           let dr = (it.driverName || '').trim();
                                                           if (!dr && it.driverId) {
                                                               const foundDrv = driversList.find(d => String(d._id) === String(it.driverId));
                                                               if (foundDrv) dr = foundDrv.name;
                                                           }
                                                           if (dr) allDriversSet.add(dr);
                                                       });

                                                       const distinctVehicles = Array.from(allVehiclesSet);
                                                       const distinctDrivers = Array.from(allDriversSet);
                                                       const hasMultipleCars = distinctVehicles.length > 1 || (Number(bkg.numberOfCars) > 1);
                                                       const hasMultipleDrivers = distinctDrivers.length > 1;

                                                       const hasAnyAssignment = distinctVehicles.length > 0 || distinctDrivers.length > 0 || isLiveInDrs;

                                                       if (hasAnyAssignment) {
                                                           return (
                                                               <button
                                                                   type="button"
                                                                   onClick={() => handleOpenAssignDriver(bkg)}
                                                                   style={{
                                                                       padding: '6px 12px',
                                                                       borderRadius: '10px',
                                                                       fontSize: '11.5px',
                                                                       fontWeight: '800',
                                                                       background: hasMultipleCars
                                                                           ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.4), rgba(14, 116, 144, 0.25))'
                                                                           : 'linear-gradient(135deg, rgba(6, 95, 70, 0.55), rgba(4, 120, 87, 0.35))',
                                                                       color: hasMultipleCars ? '#38bdf8' : '#34d399',
                                                                       border: hasMultipleCars ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(52, 211, 153, 0.45)',
                                                                       display: 'flex',
                                                                       flexDirection: 'column',
                                                                       alignItems: 'flex-start',
                                                                       gap: '3px',
                                                                       cursor: 'pointer',
                                                                       textAlign: 'left'
                                                                   }}
                                                                   title={`Click to edit/view drivers & vehicles\nCars: ${distinctVehicles.join(', ') || 'Pending'}\nDrivers: ${distinctDrivers.join(', ') || 'Pending'}`}
                                                               >
                                                                   {hasMultipleCars ? (
                                                                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                           <span>🚗 Multiple Cars ({distinctVehicles.length || bkg.numberOfCars || 2})</span>
                                                                           <Edit size={11} color="#38bdf8" />
                                                                       </div>
                                                                   ) : (
                                                                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                           <span>👤 {distinctDrivers[0] || 'Driver Pending'}</span>
                                                                           <Edit size={11} color="#34d399" />
                                                                       </div>
                                                                   )}
                                                                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: hasMultipleCars ? '#bae6fd' : '#a7f3d0', fontWeight: '700' }}>
                                                                       {hasMultipleCars ? (
                                                                           <span>{hasMultipleDrivers ? `👥 Multiple Drivers (${distinctDrivers.length})` : (distinctDrivers[0] ? `👤 ${distinctDrivers[0]}` : 'Drivers Assigned')}</span>
                                                                       ) : (
                                                                           distinctVehicles[0] && <span>🚗 {distinctVehicles[0]}</span>
                                                                       )}
                                                                   </div>
                                                               </button>
                                                           );
                                                       } else {
                                                           return (
                                                               <button
                                                                   type="button"
                                                                   onClick={() => handleOpenAssignDriver(bkg)}
                                                                   style={{
                                                                       padding: '6px 14px',
                                                                       borderRadius: '20px',
                                                                       fontSize: '11px',
                                                                       fontWeight: '900',
                                                                       background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))',
                                                                       color: '#fbbf24',
                                                                       border: '1.5px solid rgba(245, 158, 11, 0.6)',
                                                                       display: 'flex',
                                                                       alignItems: 'center',
                                                                       gap: '6px',
                                                                       cursor: 'pointer',
                                                                       boxShadow: '0 2px 10px rgba(245, 158, 11, 0.2)'
                                                                   }}
                                                                   title="Click to Assign Drivers & Vehicles and send to Live DRS"
                                                                 >
                                                                   <Car size={13} color="#fbbf24" />
                                                                   <span>+ Assign Car & Driver</span>
                                                               </button>
                                                           );
                                                       }
                                                   })()}
                                                  {isDatePassedBooking(bkg) && (
                                                      <button
                                                          onClick={() => handleCompleteBooking(bkg)}
                                                          style={{
                                                              padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 'bold',
                                                              background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.5)',
                                                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                          }}
                                                          title="Trip finished: Click to move to Completed Bookings"
                                                      >
                                                          <CheckCircle size={11} color="#34d399" /> Complete Trip
                                                      </button>
                                                  )}
                                              </div>
                                          </td>

                                        {/* Client Ledger & Actions */}
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleOpenLedger(bkg)}
                                                style={{
                                                    padding: '6px 14px',
                                                    background: '#2563eb',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    color: 'white',
                                                    fontSize: '11.5px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                                }}
                                            >
                                                Accounts
                                            </button>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => setActiveActionMenu(activeActionMenu === (bkg._id || index) ? null : (bkg._id || index))}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        background: 'transparent',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: 'rgba(255,255,255,0.8)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                </button>

                                                {activeActionMenu === (bkg._id || index) && (
                                                    <>
                                                        <div
                                                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                                            onClick={() => setActiveActionMenu(null)}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: '100%',
                                                            marginTop: '6px',
                                                            background: '#0B1121',
                                                            border: '1px solid rgba(255,255,255,0.16)',
                                                            borderRadius: '12px',
                                                            padding: '8px',
                                                            width: '210px',
                                                            zIndex: 1000,
                                                            boxShadow: '0 14px 44px rgba(0,0,0,0.75)',
                                                            textAlign: 'left'
                                                        }}>
                                                            <button onClick={() => { setActiveActionMenu(null); handleOpenAssignDriver(bkg); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Assign Driver
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); setDownloadOptionModal(bkg); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Generate PDF
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); setSelectedBooking(bkg); setShowEditModal(true); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <Edit size={14} color="#a78bfa" /> Edit Booking
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); setSelectedBooking(bkg); setShowPaymentModal(true); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Record Payment
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); handleCompleteBooking(bkg); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: '#34d399', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <CheckCircle size={14} color="#34d399" /> Complete Trip
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); shareOnWhatsApp(bkg); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> WhatsApp Share
                                                            </button>
                                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
                                                            <button onClick={() => { setActiveActionMenu(null); setSelectedBooking(bkg); setCancelReason('Customer request'); setShowCancelModal(true); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: '#f87171', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Cancel Booking
                                                            </button>
                                                            <button onClick={() => { setActiveActionMenu(null); handleDeleteBooking(bkg); }} style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}>
                                                                <Trash2 size={14} color="#ef4444" /> Delete Booking
                                                            </button>
                                                        </div>
                                                    </>
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

            {/* FOOTER: SHOWING 1 TO 8 OF 8 BOOKINGS + PAGINATION */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '18px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '500' }}>
                    Showing 1 to {processedBookings.length} of {processedBookings.length} bookings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#fbbf24',
                            color: '#000',
                            fontWeight: '900',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        1
                    </button>

                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* RECORD PAYMENT MODAL */}
              <AnimatePresence>
                  {showPaymentModal && selectedBooking && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '480px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Record Payment</h2>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Amount to Pay (₹)</label>
                                        <input required type="number" min="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} placeholder="Amount" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                                        <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} onClick={e => e.target.showPicker?.()} style={{ ...inputStyle, cursor: 'pointer' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="Cash">💵 Cash to Company (Cash Book)</option>
                                        <option value="Driver Cash">💵 Driver Cash in Hand (Cash Book)</option>
                                        <option value="UPI / QR Code">📱 UPI / QR Code (Bank Account)</option>
                                        <option value="Bank Transfer / NEFT">🏦 Bank Transfer / NEFT</option>
                                    </select>
                                </div>
                                {!(paymentMode === 'Cash' || paymentMode === 'Driver Cash') && (
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
                                    <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} placeholder="UTR or Transaction ID" />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Save Payment</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL / EDIT MODAL */}
            <AnimatePresence>
                {showDetailModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Booking {selectedBooking.bookingCode || selectedBooking.bookingId}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '2px 0 0 0', fontSize: '12px' }}>Guest: {selectedBooking.clientName} ({selectedBooking.mobileNumber})</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Total Package</div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '2px' }}>₹{(selectedBooking.totalAmount || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Balance Due</div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#f87171', marginTop: '2px' }}>₹{(selectedBooking.balanceDue !== undefined ? selectedBooking.balanceDue : (selectedBooking.totalAmount - selectedBooking.advancePaid)).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Vehicle Type</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginTop: '2px' }}>{selectedBooking.vehicleType}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Trip Dates</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginTop: '2px' }}>{selectedBooking.tripStartFormatted || formatTripDate(selectedBooking.travelStartDate)} to {selectedBooking.tripEndFormatted || formatTripDate(selectedBooking.travelEndDate)}</div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', padding: '10px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Close</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CANCEL MODAL */}
            <AnimatePresence>
                {showCancelModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '480px', background: '#0b1120', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <XCircle size={22} color="#f87171" />
                                    <h2 style={{ color: '#f87171', margin: 0, fontSize: '18px', fontWeight: '800' }}>Cancel Booking</h2>
                                </div>
                                <button onClick={() => setShowCancelModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>

                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '0 0 14px 0' }}>
                                Are you sure you want to cancel booking <strong style={{ color: 'white' }}>{selectedBooking.bookingCode || selectedBooking.bookingId}</strong> for <strong style={{ color: '#fbbf24' }}>{selectedBooking.clientName}</strong>?
                            </p>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11.5px', fontWeight: '600', marginBottom: '6px' }}>
                                    Quick Select Reason
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {[
                                        'Date Passed & Guest did not call (No-Show)',
                                        'Customer Request / Tour Cancelled',
                                        'Flight / Train Cancelled',
                                        'Emergency / Personal Reasons'
                                    ].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setCancelReason(r)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                border: cancelReason === r ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                                background: cancelReason === r ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                                                color: cancelReason === r ? '#fca5a5' : 'rgba(255,255,255,0.7)',
                                                fontSize: '11px',
                                                fontWeight: cancelReason === r ? '700' : '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>

                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11.5px', fontWeight: '600', marginBottom: '4px' }}>
                                    Cancellation Note / Reason
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter reason for cancellation..."
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    style={{ ...inputStyle, width: '100%' }}
                                />
                            </div>

                            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', margin: '0 0 16px 0' }}>
                                ℹ️ This booking will be removed from Confirmed Bookings and stored in <strong>Cancelled Bookings</strong>. It can be restored anytime.
                            </p>

                            
                            {selectedBooking.advancePaid > 0 && (
                                <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                                    <div style={{ fontSize: '13px', color: '#f87171', fontWeight: '700', marginBottom: '10px' }}>
                                        Advance Received: ₹{selectedBooking.advancePaid.toLocaleString()}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '4px' }}>Initiate Refund (₹)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={selectedBooking.advancePaid} 
                                                value={refundAmount} 
                                                onChange={e => setRefundAmount(e.target.value)} 
                                                style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                                                placeholder="Amount to refund"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '4px' }}>Refund Mode</label>
                                            <select 
                                                value={refundMode} 
                                                onChange={e => setRefundMode(e.target.value)}
                                                style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                                            >
                                                <option value="Bank">Bank</option>
                                                <option value="Cash">Cash</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                                        {Number(refundAmount) === selectedBooking.advancePaid ? 
                                            "100% Refunded. Booking will move to Lost Leads." : 
                                            `₹${selectedBooking.advancePaid - Number(refundAmount)} retained. Booking will move to Completed for Tax Invoice.`
                                        }
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12.5px' }}
                                >
                                    Keep Booking
                                </button>
                                <button
                                    onClick={handleConfirmCancel}
                                    disabled={cancelling}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '12.5px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                                    }}
                                >
                                    {cancelling ? 'Cancelling...' : <><XCircle size={14} /> Confirm & Move</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* INVOICE MODAL */}
            <AnimatePresence>
                {showInvoiceModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Generate Tax Invoice</h2>
                                <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Billed To</label>
                                    <input type="text" value={invoiceFormData.billTo.name} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, name: e.target.value } })} style={inputStyle} placeholder="Client Name" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                                    <select value={invoiceFormData.gstMode} onChange={e => setInvoiceFormData({ ...invoiceFormData, gstMode: e.target.value })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="GST Extra">GST Extra (5%)</option>
                                        <option value="GST Inclusive">GST Inclusive</option>
                                        <option value="No GST">No GST</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={creatingInvoice} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
                                        {creatingInvoice ? 'Generating...' : 'Generate & Download PDF'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ASSIGN DRIVER & VEHICLES MODAL (SIMPLE, CLEAN ROW LAYOUT + 1-CLICK COPY) */}
            <AnimatePresence>
                {showAssignDriverModal && assigningBooking && (
                    <AssignDriverModal
                        key="assign-driver-modal"
                        isOpen={showAssignDriverModal}
                        booking={assigningBooking}
                        companyId={selectedCompany?._id}
                        onClose={() => setShowAssignDriverModal(false)}
                        onSaved={() => { fetchBookings(); }}
                    />
                )}
                {/* Export Options Modal (With Amount vs Without Amount) */}
                {downloadOptionModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(3, 7, 18, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '460px',
                            background: '#0d1526',
                            border: '1px solid rgba(251, 191, 36, 0.35)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '17px', fontWeight: '900' }}>
                                    📄 Download PDF Options
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setDownloadOptionModal(null)}
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
                                Select whether you want to display quotation prices or export itinerary without pricing figures for your client.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Option 1: With Amount */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        generateBookingConfirmationPDF(downloadOptionModal, selectedCompany, { withAmount: true });
                                        setDownloadOptionModal(null);
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
                                            💰 With Amount (Full Quotation)
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                            Shows day-wise amount, base fare, GST & total payable price.
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '900' }}>➔</span>
                                </button>

                                {/* Option 2: Without Amount */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        generateBookingConfirmationPDF(downloadOptionModal, selectedCompany, { withAmount: false });
                                        setDownloadOptionModal(null);
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
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>
                                            👁️ Without Amount (Client Mode)
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                                            Hides all financial details for sharing with guests directly.
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '18px', color: 'white', fontWeight: '900' }}>➔</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        
            {/* CLIENT LEDGER DRAWER */}
            {ledgerModalBooking && (
                <ClientLedgerDrawer
                    booking={ledgerModalBooking}
                    onClose={() => setLedgerModalBooking(null)}
                    onAddEntry={() => {
                        const bkg = ledgerModalBooking;
                        setLedgerModalBooking(null);
                        handleOpenPaymentModal(bkg);
                    }}
                    onEditBooking={() => {
                        const bkg = ledgerModalBooking;
                        setLedgerModalBooking(null);
                        setSelectedBooking(bkg);
                        setShowEditModal(true);
                    }}
                    onEntryUpdated={() => {
                        fetchBookings();
                    }}
                />
            )}

            {showEditModal && selectedBooking && (
                <EditBookingModal 
                    booking={selectedBooking} 
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        setShowEditModal(false);
                        fetchBookings();
                        alert('Booking updated successfully!');
                    }}
                />
            )}
</div>
    );
}
