import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import {
    Calendar, Plus, Trash2, X, Users, Car, Clock,
    MapPin, IndianRupee, Search, Briefcase, Filter,
    CheckCircle2, AlertCircle, Edit3, ChevronLeft, ChevronRight, Phone,
    Share2, UserCheck, ShieldCheck, Sparkles, RefreshCw, Send, Check,
    AlertOctagon, Eye, ArrowRight, CheckCheck, Navigation, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumDateInput from './PremiumDateInput';
import { formatDateIST, formatTimeIST, todayIST, nowIST, toISTDateString } from '../../utils/istUtils';
import { generateBookingConfirmationPDF } from '../../utils/bookingConfirmationPdf';
import ClientLedgerDrawer from './ClientLedgerDrawer';
import { Edit, Download, User } from 'lucide-react';

// Smart Time Parser for Chronological Sorting
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 99999;
    const s = String(timeStr).trim().toUpperCase();
    if (s === 'APG') return 99000;
    if (s === 'TBA') return 99900;

    const match24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        let hours = parseInt(match24[1], 10);
        const minutes = parseInt(match24[2], 10);
        return hours * 60 + minutes;
    }

    const match12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = parseInt(match12[2] || '0', 10);
        const meridiem = match12[3].toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const matchHour = s.match(/^(\d{1,2})$/);
    if (matchHour) {
        let hours = parseInt(matchHour[1], 10);
        if (hours >= 1 && hours <= 6) hours += 12;
        return hours * 60;
    }

    return 80000;
};

const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

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

export default function LiveDRSOperations({ selectedCompany, theme }) {
    const [duties, setDuties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateTab, setDateTab] = useState('both'); // 'today', 'tomorrow', 'both', 'custom', 'range'
    const [customDate, setCustomDate] = useState(todayIST());
    const [startDate, setStartDate] = useState(todayIST());
    const [endDate, setEndDate] = useState(todayIST());
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Counts for tabs
    const [tabCounts, setTabCounts] = useState({ today: 0, tomorrow: 0, both: 0 });

    // Dropdowns
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [banks, setBanks] = useState([]);

    // Modal States
    const [showDirectBookingModal, setShowDirectBookingModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEditDutyModal, setShowEditDutyModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedDutyForAssign, setSelectedDutyForAssign] = useState(null);
    const [selectedDutyForEdit, setSelectedDutyForEdit] = useState(null);
    const [selectedDutyForPayment, setSelectedDutyForPayment] = useState(null);
    const [assignDriverId, setAssignDriverId] = useState('');
    const [assignVehicleId, setAssignVehicleId] = useState('');
    const [savingAssign, setSavingAssign] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    // Payment Collection Form States
    const [collectAmount, setCollectAmount] = useState('');
    const [collectPaymentMode, setCollectPaymentMode] = useState('UPI / QR Code');
    const [collectBankAccountId, setCollectBankAccountId] = useState('');
    const [collectPaymentReference, setCollectPaymentReference] = useState('');
    const [collectNotes, setCollectNotes] = useState('');
    const [collectMarkFullPaid, setCollectMarkFullPaid] = useState(false);
    const [collectingPayment, setCollectingPayment] = useState(false);

    // Direct Booking Form State
    const initialDirectBookingForm = {
        clientName: '',
        mobileNumber: '',
        hotel: '',
        date: todayIST(),
        endDate: '',
        time: '09:00 AM',
        duty: '',
        carType: 'Sedan',
        revenue: '',
        advancePaid: '',
        paymentMode: 'UPI / QR Code',
        bankAccountId: '',
        driver: '',
        vehicle: '',
        guestRemarks: '',
        createConfirmedBooking: true
    };
    const [directForm, setDirectForm] = useState(initialDirectBookingForm);
    const [editForm, setEditForm] = useState({});
    const [submittingDirect, setSubmittingDirect] = useState(false);
    const [successBanner, setSuccessBanner] = useState(null);

    // Bookings ending today & Confirmed table state
    const [allCompanyBookings, setAllCompanyBookings] = useState([]);
    const [hoveredBookingId, setHoveredBookingId] = useState(null);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [ledgerModalBooking, setLedgerModalBooking] = useState(null);
    const [showBookingAssignModal, setShowBookingAssignModal] = useState(false);
    const [assigningBooking, setAssigningBooking] = useState(null);
    const [assignItinerary, setAssignItinerary] = useState([]);
    const [masterDriverId, setMasterDriverId] = useState('');
    const [masterVehicleNumber, setMasterVehicleNumber] = useState('');
    const [savingBookingAssign, setSavingBookingAssign] = useState(false);

    const todayDateStr = todayIST();
    const tomorrowDateStr = getTomorrowDate();

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchDuties();
            fetchDropdowns();
            fetchAllCompanyBookings();
        }
    }, [selectedCompany, dateTab, customDate, startDate, endDate]);

    const fetchAllCompanyBookings = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}`);
            setAllCompanyBookings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching bookings in Live DRS:', err);
        }
    };

    const fetchDuties = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            let url = `/api/drs/${selectedCompany._id}?`;
            if (dateTab === 'today') {
                url += `date=${todayDateStr}`;
            } else if (dateTab === 'tomorrow') {
                url += `date=${tomorrowDateStr}`;
            } else if (dateTab === 'both') {
                url += `view=today-tomorrow`;
            } else if (dateTab === 'range') {
                url += `from=${startDate}&to=${endDate}`;
            } else {
                url += `date=${customDate}`;
            }

            const { data } = await axios.get(url);
            const fetchedDuties = Array.isArray(data) ? data : [];
            setDuties(fetchedDuties);

            // Compute tab counts
            if (dateTab === 'both') {
                const todayCount = fetchedDuties.filter(d => {
                    const dStr = d.date ? new Date(d.date).toISOString().split('T')[0] : '';
                    return dStr === todayDateStr;
                }).length;
                const tomorrowCount = fetchedDuties.filter(d => {
                    const dStr = d.date ? new Date(d.date).toISOString().split('T')[0] : '';
                    return dStr === tomorrowDateStr;
                }).length;
                setTabCounts({
                    today: todayCount,
                    tomorrow: tomorrowCount,
                    both: fetchedDuties.length
                });
            }
        } catch (error) {
            console.error('Error fetching Live DRS duties:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [dRes, vRes, bRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&status=active`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/bank-accounts/${selectedCompany._id}`).catch(() => ({ data: [] }))
            ]);
            setDrivers(dRes.data?.drivers || dRes.data || []);
            setVehicles(vRes.data?.vehicles || vRes.data || []);
            setBanks(Array.isArray(bRes.data) ? bRes.data : []);
        } catch (err) {
            console.error('Error loading dropdowns in Live DRS:', err);
        }
    };

    // Filter & Sort Duties
    const filteredDuties = useMemo(() => {
        return (duties || [])
            .filter(duty => {
                // Search filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const guest = (duty.clientName || '').toLowerCase();
                    const mob = (duty.mobileNumber || '').toString().toLowerCase();
                    const hotel = (duty.hotel || '').toLowerCase();
                    const dutyText = (duty.duty || duty.itinerary || '').toLowerCase();
                    const bkgId = (duty.bookingId || '').toLowerCase();
                    const car = (duty.carType || '').toLowerCase();
                    const driverName = (duty.driver?.name || duty.customDriverName || '').toLowerCase();
                    const carNum = (duty.vehicle?.carNumber || duty.customCarNumber || '').toLowerCase();

                    const match = guest.includes(q) || mob.includes(q) || hotel.includes(q) ||
                        dutyText.includes(q) || bkgId.includes(q) || car.includes(q) ||
                        driverName.includes(q) || carNum.includes(q);
                    if (!match) return false;
                }

                // Status Filter
                if (statusFilter !== 'All') {
                    if (statusFilter === 'Unassigned') {
                        const hasDriver = !!(duty.driver || duty.customDriverName);
                        const hasVehicle = !!(duty.vehicle || duty.customCarNumber);
                        if (hasDriver && hasVehicle) return false;
                    } else if (statusFilter === 'Pending Payment') {
                        const bkgTotal = Number(duty.bookingRef?.totalAmount || duty.revenue || 0);
                        const bkgAdv = Number(duty.bookingRef?.advancePaid || duty.advancePaid || 0);
                        const bkgBal = duty.bookingRef?.balanceDue !== undefined ? Number(duty.bookingRef.balanceDue) : Math.max(0, bkgTotal - bkgAdv);
                        const isPaid = duty.paymentStatus === 'Full Received' || duty.paymentStatus === 'Fully Paid' || (bkgBal === 0 && bkgTotal > 0);
                        if (isPaid) return false;
                    } else if (duty.status !== statusFilter) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                // Sort by Date first, then Time
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB;

                return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
            });
    }, [duties, searchQuery, statusFilter]);

    // Bookings ending today computation
    const endingTodayBookings = useMemo(() => {
        const targetDate = todayDateStr;
        return (allCompanyBookings || []).filter(b => {
            if (!b.travelEndDate) return false;
            const dStr = toISTDateString(b.travelEndDate);
            const rawStr = typeof b.travelEndDate === 'string' ? b.travelEndDate.split('T')[0] : '';
            const utcStr = new Date(b.travelEndDate).toISOString().split('T')[0];
            const isEndingToday = dStr === targetDate || rawStr === targetDate || utcStr === targetDate;
            if (!isEndingToday) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = b.clientName && b.clientName.toLowerCase().includes(q);
                const matchCode = (b.bookingCode || b.clientCode || b.bookingId || '').toLowerCase().includes(q);
                const matchMobile = b.mobileNumber && b.mobileNumber.toLowerCase().includes(q);
                const matchVehicle = b.vehicleType && b.vehicleType.toLowerCase().includes(q);
                return matchName || matchCode || matchMobile || matchVehicle;
            }
            return true;
        });
    }, [allCompanyBookings, todayDateStr, searchQuery]);

    const endingKpiMetrics = useMemo(() => {
        let totalRev = 0;
        let adv = 0;
        let bal = 0;
        endingTodayBookings.forEach(b => {
            const tot = Number(b.totalAmount) || 0;
            const paid = Number(b.advancePaid) || 0;
            const due = Number(b.balanceDue !== undefined ? b.balanceDue : (tot - paid)) || 0;
            totalRev += tot;
            adv += paid;
            bal += due;
        });
        return {
            totalRevenue: totalRev,
            advanceCollected: adv,
            pendingToCollect: bal,
            totalCount: endingTodayBookings.length
        };
    }, [endingTodayBookings]);

    const handleOpenAssignBooking = (bkg) => {
        setAssigningBooking(bkg);
        let days = [];
        if (Array.isArray(bkg.itinerary) && bkg.itinerary.length > 0) {
            days = bkg.itinerary.map((d, i) => ({
                dayNo: d.dayNo || (i + 1),
                date: d.date || bkg.travelStartDate,
                time: d.time || '09:00 AM',
                duty: d.duty || d.description || 'City Tour / Transfer',
                vehicleType: d.vehicleType || bkg.vehicleType || 'Innova Crysta',
                driverId: d.driverId || d.driver?._id || d.driver || '',
                driverName: d.driverName || d.driver?.name || d.customDriverName || '',
                driverPhone: d.driverPhone || d.driver?.mobile || d.driverMobile || '',
                vehicleId: d.vehicleId || d.vehicle?._id || d.vehicle || '',
                vehicleNumber: d.vehicleNumber || d.vehicle?.carNumber || d.customCarNumber || ''
            }));
        } else {
            const s = bkg.travelStartDate ? new Date(bkg.travelStartDate) : new Date();
            const e = bkg.travelEndDate ? new Date(bkg.travelEndDate) : s;
            const daysCount = Math.max(1, Math.round((e - s) / 86400000) + 1);
            for (let i = 0; i < daysCount; i++) {
                const curDate = new Date(s);
                curDate.setDate(curDate.getDate() + i);
                days.push({
                    dayNo: i + 1,
                    date: curDate.toISOString().split('T')[0],
                    time: '09:00 AM',
                    duty: i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                    vehicleType: bkg.vehicleType || 'Innova Crysta',
                    driverId: '',
                    driverName: '',
                    driverPhone: '',
                    vehicleId: '',
                    vehicleNumber: ''
                });
            }
        }
        const firstAssigned = days.find(d => d.driverId || d.driverName);
        setMasterDriverId(firstAssigned ? (firstAssigned.driverId || '__custom__') : '');
        setMasterVehicleNumber(firstAssigned ? firstAssigned.vehicleNumber : (bkg.vehicleNumber || ''));
        setAssignItinerary(days);
        setShowBookingAssignModal(true);
    };

    const handleApplyMasterDriverBooking = (driverVal) => {
        setMasterDriverId(driverVal);
        const allDrivers = drivers || [];
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

    const handleApplyMasterVehicleBooking = (vehVal) => {
        setMasterVehicleNumber(vehVal);
        setAssignItinerary(prev => prev.map(day => ({
            ...day,
            vehicleNumber: vehVal
        })));
    };

    const handleUpdateDayDriverBooking = (index, driverVal) => {
        const updated = [...assignItinerary];
        const allDrivers = drivers || [];
        if (!driverVal) {
            updated[index] = { ...updated[index], driverId: '', driverName: '', driverPhone: '' };
        } else if (driverVal === '__custom__') {
            updated[index] = { ...updated[index], driverId: 'custom' };
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

    const handleSaveBookingDriverAssignments = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            setSavingBookingAssign(true);
            await axios.post(`/api/bookings/${assigningBooking._id}/assign-drivers`, {
                itinerary: assignItinerary
            });
            await fetchAllCompanyBookings();
            await fetchDuties();
            alert('Driver and Vehicle assigned successfully! DRS and Bookings have been updated.');
            setShowBookingAssignModal(false);
        } catch (err) {
            console.error('Error saving driver assignments:', err);
            alert(err.response?.data?.message || 'Failed to save driver assignments');
        } finally {
            setSavingBookingAssign(false);
        }
    };

    const shareBookingOnWhatsApp = (bkg) => {
        if (!bkg) return;
        const phone = (bkg.mobileNumber || '').replace(/[^0-9]/g, '');
        const clientName = bkg.clientName || 'Guest';
        const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || '';
        const sDate = formatTripDate(bkg.travelStartDate);
        const eDate = formatTripDate(bkg.travelEndDate);
        const car = bkg.vehicleType || 'Cab';
        const total = (Number(bkg.totalAmount) || 0).toLocaleString('en-IN');
        const adv = (Number(bkg.advancePaid) || 0).toLocaleString('en-IN');
        const bal = (Number(bkg.balanceDue !== undefined ? bkg.balanceDue : (bkg.totalAmount - bkg.advancePaid)) || 0).toLocaleString('en-IN');

        const text = `*Booking Details - ${selectedCompany?.name || 'LogKaro'}*\n\n` +
            `Hello *${clientName}*,\n` +
            `Your tour is completing today (${eDate})!\n` +
            `• Booking Code: *${bkgCode}*\n` +
            `• Trip Dates: *${sDate}* to *${eDate}*\n` +
            `• Vehicle: *${car}*\n` +
            `• Total Amount: *₹${total}*\n` +
            `• Advance Paid: *₹${adv}*\n` +
            `• Balance Due: *₹${bal}*\n\n` +
            `Thank you for traveling with us! Have a wonderful day ahead.`;

        const url = phone ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // KPI Metrics calculation
    const kpiMetrics = useMemo(() => {
        let totalCount = duties.length;
        let assignedCount = 0;
        let unassignedCount = 0;
        let completedCount = 0;
        let totalRevenue = 0;
        let advanceCollected = 0;
        let pendingToCollect = 0;

        // Dedup bookings so multi-day duties of the same booking don't double count revenue/balance
        const processedBookings = new Set();

        duties.forEach(d => {
            const hasDriver = !!(d.driver || d.customDriverName);
            const hasVehicle = !!(d.vehicle || d.customCarNumber);
            if (hasDriver && hasVehicle) {
                assignedCount++;
            } else {
                unassignedCount++;
            }

            if (d.status === 'Completed') {
                completedCount++;
            }

            const bkgKey = d.bookingRef?._id ? String(d.bookingRef._id) : (d.bookingId && !d.isDirectBooking ? String(d.bookingId) : null);
            if (bkgKey) {
                if (!processedBookings.has(bkgKey)) {
                    processedBookings.add(bkgKey);
                    const bkgTotal = Number(d.bookingRef?.totalAmount || d.revenue || 0);
                    const bkgAdv = Number(d.bookingRef?.advancePaid || d.advancePaid || 0);
                    const bkgBal = d.bookingRef?.balanceDue !== undefined ? Number(d.bookingRef.balanceDue) : Math.max(0, bkgTotal - bkgAdv);

                    totalRevenue += bkgTotal;
                    advanceCollected += bkgAdv;
                    pendingToCollect += bkgBal;
                }
            } else {
                const fare = Number(d.revenue || 0);
                const adv = Number(d.advancePaid || (d.paymentStatus === 'Full Received' ? fare : 0));
                const bal = d.paymentStatus === 'Full Received' ? 0 : Math.max(0, fare - adv);

                totalRevenue += fare;
                advanceCollected += adv;
                pendingToCollect += bal;
            }
        });

        return {
            totalCount,
            assignedCount,
            unassignedCount,
            completedCount,
            totalRevenue,
            advanceCollected,
            pendingToCollect
        };
    }, [duties]);

    // Open Payment Status & Collection Modal
    const openPaymentModal = (duty) => {
        const totAmount = Number(duty.bookingRef?.totalAmount || duty.revenue || 0);
        const advPaid = Number(duty.bookingRef?.advancePaid || duty.advancePaid || 0);
        const balDue = duty.bookingRef?.balanceDue !== undefined ? Number(duty.bookingRef.balanceDue) : Math.max(0, totAmount - advPaid);

        setSelectedDutyForPayment(duty);
        setCollectAmount(balDue > 0 ? balDue : '');
        setCollectPaymentMode('UPI / QR Code');
        setCollectBankAccountId(banks.length > 0 ? banks[0]._id : '');
        setCollectPaymentReference('');
        setCollectNotes('');
        setCollectMarkFullPaid(balDue <= 0);
        setShowPaymentModal(true);
    };

    // Collect Payment Submit Handler
    const handleCollectPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDutyForPayment) return;

        const numAmount = Number(collectAmount) || 0;
        if (numAmount <= 0 && !collectMarkFullPaid) {
            alert('Please enter a valid collection amount or check Mark as Fully Paid');
            return;
        }

        setCollectingPayment(true);
        try {
            const payload = {
                amount: numAmount,
                paymentMode: collectPaymentMode,
                bankAccountId: collectBankAccountId || null,
                paymentReference: collectPaymentReference.trim(),
                notes: collectNotes.trim(),
                markFullPaid: collectMarkFullPaid
            };

            const { data } = await axios.post(`/api/drs/${selectedDutyForPayment._id}/collect-payment`, payload);

            setSuccessBanner({
                code: selectedDutyForPayment.bookingId || 'DRS',
                guest: selectedDutyForPayment.clientName || 'Guest',
                time: `₹${numAmount.toLocaleString('en-IN')} Received (${collectPaymentMode})`
            });
            setTimeout(() => setSuccessBanner(null), 8000);

            setShowPaymentModal(false);
            setSelectedDutyForPayment(null);
            fetchDuties();
            fetchDropdowns();
        } catch (err) {
            console.error('Error collecting DRS payment:', err);
            alert(err.response?.data?.message || 'Failed to collect payment');
        } finally {
            setCollectingPayment(false);
        }
    };

    // Direct Booking Submit Handler
    const handleDirectBookingSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCompany?._id) return;

        if (!directForm.clientName || !directForm.clientName.trim()) {
            alert('Please enter guest name');
            return;
        }

        setSubmittingDirect(true);
        try {
            const selectedDriverObj = drivers.find(d => d._id === directForm.driver);
            const selectedVehicleObj = vehicles.find(v => v._id === directForm.vehicle);

            const payload = {
                company: selectedCompany._id,
                clientName: directForm.clientName.trim(),
                mobileNumber: directForm.mobileNumber.trim(),
                hotel: directForm.hotel.trim(),
                date: directForm.date,
                time: directForm.time || '09:00 AM',
                duty: directForm.duty.trim() || 'City Duty',
                itinerary: directForm.duty.trim() || 'City Duty',
                carType: directForm.carType || 'Sedan',
                driver: directForm.driver || null,
                customDriverName: selectedDriverObj ? selectedDriverObj.name : '',
                vehicle: directForm.vehicle || null,
                customCarNumber: selectedVehicleObj ? selectedVehicleObj.carNumber : '',
                revenue: Number(directForm.revenue) || 0,
                advancePaid: Number(directForm.advancePaid) || 0,
                paymentMode: directForm.paymentMode,
                bankAccountId: directForm.bankAccountId || null,
                guestRemarks: directForm.guestRemarks || '',
                createConfirmedBooking: directForm.createConfirmedBooking,
                status: (directForm.driver || selectedDriverObj) ? 'Assigned' : 'Scheduled'
            };

            const { data } = await axios.post('/api/drs', payload);

            setSuccessBanner({
                code: data.clientCode || data.duty?.bookingId || 'DIRECT',
                guest: directForm.clientName,
                time: directForm.time
            });
            setTimeout(() => setSuccessBanner(null), 8000);

            setShowDirectBookingModal(false);
            setDirectForm(initialDirectBookingForm);
            fetchDuties();
        } catch (error) {
            console.error('Error creating direct booking in Live DRS:', error);
            alert(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setSubmittingDirect(false);
        }
    };

    // Quick Assign Driver & Vehicle Handler
    const handleQuickAssignSave = async (e) => {
        e.preventDefault();
        if (!selectedDutyForAssign) return;

        setSavingAssign(true);
        try {
            const selectedDriverObj = drivers.find(d => d._id === assignDriverId);
            const selectedVehicleObj = vehicles.find(v => v._id === assignVehicleId);

            const updatePayload = {
                driver: assignDriverId || null,
                customDriverName: selectedDriverObj ? selectedDriverObj.name : (assignDriverId ? '' : selectedDutyForAssign.customDriverName),
                vehicle: assignVehicleId || null,
                customCarNumber: selectedVehicleObj ? selectedVehicleObj.carNumber : (assignVehicleId ? '' : selectedDutyForAssign.customCarNumber),
                status: (assignDriverId || selectedDriverObj) ? 'Assigned' : selectedDutyForAssign.status
            };

            await axios.put(`/api/drs/${selectedDutyForAssign._id}`, updatePayload);
            setShowAssignModal(false);
            setSelectedDutyForAssign(null);
            fetchDuties();
        } catch (err) {
            console.error('Error updating assignment:', err);
            alert('Failed to update driver/vehicle assignment');
        } finally {
            setSavingAssign(false);
        }
    };

    // Full Edit Duty Handler
    const handleEditDutySave = async (e) => {
        e.preventDefault();
        if (!selectedDutyForEdit) return;

        setSavingEdit(true);
        try {
            const selectedDriverObj = drivers.find(d => d._id === editForm.driver);
            const selectedVehicleObj = vehicles.find(v => v._id === editForm.vehicle);

            const updatePayload = {
                clientName: editForm.clientName,
                mobileNumber: editForm.mobileNumber,
                hotel: editForm.hotel,
                date: editForm.date,
                time: editForm.time,
                duty: editForm.duty,
                itinerary: editForm.duty,
                carType: editForm.carType,
                revenue: Number(editForm.revenue) || 0,
                paymentStatus: editForm.paymentStatus,
                driver: editForm.driver || null,
                customDriverName: selectedDriverObj ? selectedDriverObj.name : editForm.customDriverName,
                vehicle: editForm.vehicle || null,
                customCarNumber: selectedVehicleObj ? selectedVehicleObj.carNumber : editForm.customCarNumber,
                status: editForm.status || 'Scheduled',
                guestRemarks: editForm.guestRemarks || ''
            };

            await axios.put(`/api/drs/${selectedDutyForEdit._id}`, updatePayload);
            setShowEditDutyModal(false);
            setSelectedDutyForEdit(null);
            fetchDuties();
        } catch (err) {
            console.error('Error editing duty:', err);
            alert('Failed to update duty');
        } finally {
            setSavingEdit(false);
        }
    };

    const openEditModal = (duty) => {
        setSelectedDutyForEdit(duty);
        setEditForm({
            clientName: duty.clientName || '',
            mobileNumber: duty.mobileNumber || '',
            hotel: duty.hotel || duty.pickupPoint || '',
            date: duty.date ? new Date(duty.date).toISOString().split('T')[0] : todayDateStr,
            time: duty.time || '09:00 AM',
            duty: duty.duty || duty.itinerary || '',
            carType: duty.carType || 'Sedan',
            revenue: duty.revenue || 0,
            paymentStatus: duty.paymentStatus || 'Advance Received',
            driver: duty.driver?._id || duty.driver || '',
            customDriverName: duty.customDriverName || '',
            vehicle: duty.vehicle?._id || duty.vehicle || '',
            customCarNumber: duty.customCarNumber || '',
            status: duty.status || 'Scheduled',
            guestRemarks: duty.guestRemarks || ''
        });
        setShowEditDutyModal(true);
    };

    // Quick Status Update Handler
    const handleStatusChange = async (dutyId, newStatus) => {
        try {
            await axios.put(`/api/drs/${dutyId}`, { status: newStatus });
            setDuties(prev => prev.map(d => d._id === dutyId ? { ...d, status: newStatus } : d));
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to change status');
        }
    };

    // Delete Duty Handler
    const handleDeleteDuty = async (duty) => {
        if (!window.confirm(`Are you sure you want to remove duty for ${duty.clientName}?`)) return;
        try {
            await axios.delete(`/api/drs/${duty._id}`);
            setDuties(prev => prev.filter(d => d._id !== duty._id));
        } catch (err) {
            console.error('Error deleting duty:', err);
            alert('Failed to delete duty');
        }
    };

    // WhatsApp Dispatch Message
    const handleShareWhatsApp = (duty) => {
        const guestName = duty.clientName || 'Guest';
        const guestMob = duty.mobileNumber || '';
        const driverName = duty.driver?.name || duty.customDriverName || 'To be assigned';
        const driverMob = duty.driver?.mobile || '';
        const carNum = duty.vehicle?.carNumber || duty.customCarNumber || duty.carType || 'Car';
        const dutyDate = duty.date ? formatDateIST(duty.date) : 'Today';
        const time = duty.time || '09:00 AM';
        const pickup = duty.pickupPoint || duty.hotel || 'Hotel/Pickup Point';

        const text = `🚖 *Yatree Destination - Duty Dispatch Slip*\n\n` +
            `*Booking ID:* ${duty.bookingId || 'N/A'}\n` +
            `*Guest:* ${guestName} (${guestMob})\n` +
            `*Date & Time:* ${dutyDate} at ${time}\n` +
            `*Pickup:* ${pickup}\n` +
            `*Duty/Route:* ${duty.duty || duty.itinerary || 'Scheduled Trip'}\n` +
            `*Vehicle:* ${carNum} (${duty.carType || 'Sedan'})\n` +
            `*Driver:* ${driverName} ${driverMob ? `(${driverMob})` : ''}\n\n` +
            `Have a safe journey! For support: +91 9876543210`;

        const url = `https://wa.me/${guestMob ? guestMob.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed':
                return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
            case 'Assigned':
                return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
            case 'Ongoing':
            case 'Started':
                return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
            case 'Cancelled':
                return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
            default:
                return { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' };
        }
    };

    return (
        <div style={{ marginTop: '10px' }}>
            {/* Success Banner */}
            <AnimatePresence>
                {successBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.15))',
                            border: '1px solid #22c55e',
                            borderRadius: '16px',
                            padding: '14px 20px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#4ade80',
                            boxShadow: '0 10px 25px rgba(34, 197, 94, 0.2)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={24} color="#4ade80" />
                            <div>
                                <div style={{ fontWeight: '900', fontSize: '14px', color: '#ffffff' }}>
                                    Booking Confirmed & Dispatched! (Client Code: {successBanner.code})
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                    Duty for {successBanner.guest} at {successBanner.time} has been added to Live DRS & Confirmed Bookings.
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSuccessBanner(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OPERATIONS DISPATCH CONTROLS & DATE TABS */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '18px 24px',
                marginBottom: '22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(20px)'
            }}>
                {/* Left: Quick Date Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', marginRight: '4px' }}>
                        <Navigation size={13} color="#fbbf24" /> Period:
                    </div>

                    <button
                        onClick={() => setDateTab('today')}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '14px',
                            border: dateTab === 'today' ? '1.5px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                            background: dateTab === 'today' ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1))' : 'rgba(255,255,255,0.03)',
                            color: dateTab === 'today' ? '#fbbf24' : 'rgba(255,255,255,0.75)',
                            fontWeight: '900',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: dateTab === 'today' ? '0 4px 15px rgba(251, 191, 36, 0.2)' : 'none'
                        }}
                    >
                        <span>⚡ Today</span>
                        <span style={{ fontSize: '11px', opacity: 0.8, fontFamily: 'monospace' }}>({formatDateIST(todayDateStr)})</span>
                    </button>

                    <button
                        onClick={() => setDateTab('tomorrow')}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '14px',
                            border: dateTab === 'tomorrow' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                            background: dateTab === 'tomorrow' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))' : 'rgba(255,255,255,0.03)',
                            color: dateTab === 'tomorrow' ? '#38bdf8' : 'rgba(255,255,255,0.75)',
                            fontWeight: '900',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: dateTab === 'tomorrow' ? '0 4px 15px rgba(56, 189, 248, 0.2)' : 'none'
                        }}
                    >
                        <span>⚡ Tomorrow</span>
                        <span style={{ fontSize: '11px', opacity: 0.8, fontFamily: 'monospace' }}>({formatDateIST(tomorrowDateStr)})</span>
                    </button>

                    <button
                        onClick={() => setDateTab('both')}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '14px',
                            border: dateTab === 'both' ? '1.5px solid #4ade80' : '1px solid rgba(255,255,255,0.08)',
                            background: dateTab === 'both' ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1))' : 'rgba(255,255,255,0.03)',
                            color: dateTab === 'both' ? '#4ade80' : 'rgba(255,255,255,0.75)',
                            fontWeight: '900',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: dateTab === 'both' ? '0 4px 15px rgba(74, 222, 128, 0.2)' : 'none'
                        }}
                    >
                        <Calendar size={14} />
                        <span>Today + Tomorrow</span>
                    </button>

                    <button
                        onClick={() => setDateTab('range')}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '14px',
                            border: dateTab === 'range' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                            background: dateTab === 'range' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(147, 51, 234, 0.12))' : 'rgba(255,255,255,0.03)',
                            color: dateTab === 'range' ? '#c084fc' : 'rgba(255,255,255,0.75)',
                            fontWeight: '900',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: dateTab === 'range' ? '0 4px 15px rgba(168, 85, 247, 0.2)' : 'none'
                        }}
                    >
                        <Calendar size={14} />
                        <span>📅 Date Range</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDateTab('endingToday')}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '14px',
                            border: dateTab === 'endingToday' ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                            background: dateTab === 'endingToday' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))' : 'rgba(255,255,255,0.03)',
                            color: dateTab === 'endingToday' ? '#fbbf24' : 'rgba(255,255,255,0.75)',
                            fontWeight: '900',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: dateTab === 'endingToday' ? '0 4px 15px rgba(245, 158, 11, 0.25)' : 'none'
                        }}
                    >
                        <span>🏁 Rides Ending Today</span>
                        <span style={{
                            fontSize: '11px',
                            background: dateTab === 'endingToday' ? '#fbbf24' : 'rgba(245, 158, 11, 0.2)',
                            color: dateTab === 'endingToday' ? '#000' : '#fbbf24',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: '900'
                        }}>
                            {endingTodayBookings.length}
                        </span>
                    </button>

                    {/* Date Range or Single Date Inputs */}
                    {dateTab === 'range' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px', background: 'rgba(168, 85, 247, 0.08)', padding: '4px 10px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                            <div style={{ width: '135px' }}>
                                <PremiumDateInput
                                    value={startDate}
                                    onChange={(v) => {
                                        setStartDate(v);
                                        setDateTab('range');
                                    }}
                                />
                            </div>
                            <span style={{ color: '#c084fc', fontWeight: '900', fontSize: '13px' }}>➔</span>
                            <div style={{ width: '135px' }}>
                                <PremiumDateInput
                                    value={endDate}
                                    onChange={(v) => {
                                        setEndDate(v);
                                        setDateTab('range');
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                            <div style={{ width: '145px' }}>
                                <PremiumDateInput
                                    value={customDate}
                                    onChange={(v) => {
                                        setCustomDate(v);
                                        setDateTab('custom');
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => fetchDuties()}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontSize: '12.5px',
                            fontWeight: '800',
                            transition: 'all 0.2s'
                        }}
                        title="Refresh Live DRS"
                    >
                        <RefreshCw size={14} className={loading ? 'pulse-animation' : ''} /> Refresh
                    </button>

                    <button
                        onClick={() => {
                            setDirectForm({
                                ...initialDirectBookingForm,
                                date: dateTab === 'tomorrow' ? tomorrowDateStr : todayDateStr
                            });
                            setShowDirectBookingModal(true);
                        }}
                        style={{
                            padding: '11px 22px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none',
                            color: '#000000',
                            fontWeight: '1000',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} /> Direct Booking (Instant DRS)
                    </button>
                </div>
            </div>

            {/* OPERATIONS KPI SUMMARY CARDS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* 1. Total Duties */}
                <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.5))',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '20px',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        <Car size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled Duties</div>
                        <div style={{ fontSize: '24px', fontWeight: '1000', color: 'white', marginTop: '2px', lineHeight: 1 }}>{kpiMetrics.totalCount}</div>
                        <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700', marginTop: '4px' }}>
                            {kpiMetrics.assignedCount} Assigned • {kpiMetrics.unassignedCount} Open
                        </div>
                    </div>
                </motion.div>

                {/* 2. To Collect Today / Scheduled */}
                <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                        background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.7))',
                        border: kpiMetrics.pendingToCollect > 0 ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: kpiMetrics.pendingToCollect > 0 ? '0 8px 24px rgba(245, 158, 11, 0.2)' : '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 To Collect (Pending)</div>
                        <div style={{ fontSize: '24px', fontWeight: '1000', color: '#fbbf24', marginTop: '2px', lineHeight: 1 }}>
                            ₹{(dateTab === 'endingToday' ? endingKpiMetrics.pendingToCollect : kpiMetrics.pendingToCollect).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: '4px' }}>
                            Remaining from active duties
                        </div>
                    </div>
                </motion.div>

                {/* 3. Advance Collected */}
                <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                        background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.1), rgba(15, 23, 42, 0.7))',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: '20px',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💳 Advance / Received</div>
                        <div style={{ fontSize: '24px', fontWeight: '1000', color: '#4ade80', marginTop: '2px', lineHeight: 1 }}>
                            ₹{(dateTab === 'endingToday' ? endingKpiMetrics.advanceCollected : kpiMetrics.advanceCollected).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: '4px' }}>
                            Collected towards duties
                        </div>
                    </div>
                </motion.div>

                {/* 4. Total Schedule Fare */}
                <motion.div
                    whileHover={{ y: -3 }}
                    style={{
                        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.5))',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '20px',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        <Briefcase size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Package Fare</div>
                        <div style={{ fontSize: '24px', fontWeight: '1000', color: '#38bdf8', marginTop: '2px', lineHeight: 1 }}>
                            ₹{(dateTab === 'endingToday' ? endingKpiMetrics.totalRevenue : kpiMetrics.totalRevenue).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: '4px' }}>
                            Gross scheduled revenue
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* SEARCH & STATUS FILTER BAR */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '18px'
            }}>
                <div style={{ position: 'relative', width: 'clamp(260px, 35vw, 420px)' }}>
                    <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search by Guest, Mobile, Hotel, Route, Driver, Car..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '11px 16px 11px 42px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            color: 'white',
                            fontSize: '13.5px',
                            outline: 'none',
                            fontWeight: '600'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>Filter:</span>
                    {['All', 'Pending Payment', 'Unassigned', 'Scheduled', 'Assigned', 'Ongoing', 'Completed'].map(st => {
                        const isPendingTab = st === 'Pending Payment';
                        const isActive = statusFilter === st;
                        return (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    border: isPendingTab && isActive ? '1px solid #fbbf24' : 'none',
                                    background: isActive ? (isPendingTab ? '#f59e0b' : '#38bdf8') : (isPendingTab ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.05)'),
                                    color: isActive ? '#000000' : (isPendingTab ? '#fbbf24' : 'rgba(255,255,255,0.7)'),
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: isActive ? (isPendingTab ? '0 4px 12px rgba(245, 158, 11, 0.3)' : '0 4px 12px rgba(56, 189, 248, 0.3)') : 'none'
                                }}
                            >
                                {isPendingTab && <IndianRupee size={12} />}
                                {st}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* OPERATIONS DISPATCH TABLE CONTAINER */}
            {dateTab === 'endingToday' ? (
                /* CONFIRMED BOOKINGS DESIGN FOR RIDES ENDING TODAY */
                <div style={{
                    background: 'rgba(10, 16, 30, 0.75)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '24px',
                    overflowX: 'auto',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(25px)',
                    padding: '16px'
                }} className="custom-scrollbar">
                    {/* Header Banner */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '16px',
                        paddingBottom: '14px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                            }}>
                                🏁
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '17px', fontWeight: '900' }}>
                                    Rides & Bookings Ending Today ({formatDateIST(todayDateStr)})
                                </h3>
                                <p style={{ margin: '3px 0 0', color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px' }}>
                                    Confirmed bookings concluding today. Verify duty completion, vehicle status & collect remaining balances.
                                </p>
                            </div>
                        </div>
                        <span style={{
                            background: '#f59e0b',
                            color: '#000000',
                            padding: '6px 14px',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '12px',
                            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                        }}>
                            {endingTodayBookings.length} Active Ride(s) Ending Today
                        </span>
                    </div>

                    <table style={{
                        width: '100%',
                        minWidth: '1250px',
                        borderCollapse: 'collapse',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>#</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Booking Code</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Package Price</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Received</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Balance</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Trip Start</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Trip End (Today)</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Car Type</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px' }}>Driver & Vehicle</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>Client Ledger</th>
                                <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {endingTodayBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.45)' }}>
                                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏁</div>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>No Rides Ending Today</div>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                                            There are no confirmed bookings scheduled to conclude on {formatDateIST(todayDateStr)}.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                endingTodayBookings.map((bkg, index) => {
                                    const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || `${index + 1}`;
                                    const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
                                    const eDate = bkg.tripEndFormatted || formatTripDate(bkg.travelEndDate);

                                    let drvName = null;
                                    let vehNumber = null;
                                    if (bkg.itinerary && bkg.itinerary.length > 0) {
                                        const lastAssigned = [...bkg.itinerary].reverse().find(d => d.driverId || d.driverName) || bkg.itinerary.find(d => d.driverId || d.driverName);
                                        if (lastAssigned) {
                                            drvName = lastAssigned.driverName || (drivers.find(d => String(d._id) === String(lastAssigned.driverId))?.name);
                                            vehNumber = lastAssigned.vehicleNumber;
                                        }
                                    }

                                    return (
                                        <tr
                                            key={bkg._id || index}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
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

                                                    {hoveredBookingId === (bkg._id || bkgCode) && (
                                                        <div style={{
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
                                                        }}>
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
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3. Package Price */}
                                            <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                                ₹{(Number(bkg.totalAmount) || 0).toLocaleString('en-IN')}
                                            </td>

                                            {/* 4. Received */}
                                            <td style={{ padding: '14px 16px', color: '#4ade80', fontSize: '13px', fontWeight: '700' }}>
                                                ₹{(Number(bkg.advancePaid) || 0).toLocaleString('en-IN')}
                                            </td>

                                            {/* 5. Balance */}
                                            <td style={{
                                                padding: '14px 16px',
                                                color: (bkg.totalAmount - bkg.advancePaid) > 0 ? '#f87171' : '#4ade80',
                                                fontSize: '13px',
                                                fontWeight: '800'
                                            }}>
                                                ₹{(Number(bkg.balanceDue !== undefined ? bkg.balanceDue : (bkg.totalAmount - bkg.advancePaid)) || 0).toLocaleString('en-IN')}
                                            </td>

                                            {/* 6. Trip Start */}
                                            <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                                {sDate}
                                            </td>

                                            {/* 7. Trip End */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    background: 'rgba(245, 158, 11, 0.2)',
                                                    color: '#fbbf24',
                                                    border: '1px solid rgba(245, 158, 11, 0.45)',
                                                    padding: '3px 9px',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '800',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    🏁 {eDate} (Ends Today)
                                                </span>
                                            </td>

                                            {/* 8. Car Type */}
                                            <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                                {bkg.vehicleType || '-'}
                                            </td>

                                            {/* 9. Driver & Vehicle */}
                                            <td style={{ padding: '14px 16px' }}>
                                                {drvName ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenAssignBooking(bkg)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '11.5px',
                                                            fontWeight: '800',
                                                            background: 'rgba(6, 95, 70, 0.45)',
                                                            color: '#34d399',
                                                            border: '1px solid rgba(52, 211, 153, 0.4)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Click to view/change assigned driver & vehicle"
                                                    >
                                                        <span>👤 {drvName} {vehNumber ? `[${vehNumber}]` : ''}</span>
                                                        <Edit size={11} color="#34d399" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenAssignBooking(bkg)}
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
                                                        title="Click to Assign Vehicle & Driver"
                                                    >
                                                        <Car size={13} color="#fbbf24" />
                                                        <span>+ Assign Car & Driver</span>
                                                    </button>
                                                )}
                                            </td>

                                            {/* 10. Client Ledger */}
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setLedgerModalBooking(bkg)}
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

                                            {/* 11. Actions */}
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setActiveActionMenu(activeActionMenu === bkg._id ? null : bkg._id)}
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
                                                        •••
                                                    </button>
                                                    {activeActionMenu === bkg._id && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: '100%',
                                                            marginTop: '4px',
                                                            background: '#0B1121',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '12px',
                                                            padding: '6px',
                                                            width: '190px',
                                                            zIndex: 100,
                                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                                            textAlign: 'left'
                                                        }}>
                                                            <button
                                                                onClick={() => { setActiveActionMenu(null); handleOpenAssignBooking(bkg); }}
                                                                style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Car size={14} color="#60a5fa" /> Assign Driver
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveActionMenu(null); generateBookingConfirmationPDF(bkg, selectedCompany); }}
                                                                style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Download size={14} color="#fbbf24" /> Generate PDF
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveActionMenu(null); shareBookingOnWhatsApp(bkg); }}
                                                                style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', color: 'white', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                                            >
                                                                <Share2 size={14} color="#34d399" /> WhatsApp Share
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
            ) : (
            <div style={{
                background: 'rgba(10, 16, 30, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                overflowX: 'auto',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(25px)',
                padding: '10px'
            }} className="custom-scrollbar">
                <table style={{
                    width: '100%',
                    minWidth: '1320px',
                    tableLayout: 'fixed',
                    borderCollapse: 'separate',
                    borderSpacing: '0 8px',
                    textAlign: 'left'
                }}>
                    <thead>
                        <tr style={{ background: '#090f1d' }}>
                            <th style={{ width: '45px', padding: '14px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                            <th style={{ width: '125px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time & Date</th>
                            <th style={{ width: '110px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Code</th>
                            <th style={{ width: '180px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Guest Details</th>
                            <th style={{ width: '140px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hotel / Pickup</th>
                            <th style={{ width: '230px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duty / Route Details</th>
                            <th style={{ width: '150px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</th>
                            <th style={{ width: '160px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver</th>
                            <th style={{ width: '125px', padding: '14px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fare (₹)</th>
                            <th style={{ width: '130px', padding: '14px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                            <th style={{ width: '110px', padding: '14px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                                    <div className="pulse-animation" style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8' }}>Loading Live Dispatch Schedule...</div>
                                </td>
                            </tr>
                        ) : filteredDuties.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '70px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px' }}>
                                    <Car size={42} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 14px' }} />
                                    <div style={{ color: 'white', fontWeight: '900', fontSize: '17px' }}>No DRS Duties for Selected Period</div>
                                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '6px 0 20px' }}>
                                        No duties scheduled for Today / Tomorrow matching your filter criteria.
                                    </p>
                                    <button
                                        onClick={() => setShowDirectBookingModal(true)}
                                        style={{
                                            padding: '10px 22px',
                                            background: '#f59e0b',
                                            border: 'none',
                                            borderRadius: '14px',
                                            fontWeight: '900',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            color: '#000',
                                            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.3)'
                                        }}
                                    >
                                        + Add Instant Direct Booking
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            filteredDuties.map((duty, idx) => {
                                const dutyDateStr = duty.date ? new Date(duty.date).toISOString().split('T')[0] : '';
                                const isDutyToday = dutyDateStr === todayDateStr;
                                const isDutyTomorrow = dutyDateStr === tomorrowDateStr;

                                const driverName = duty.driver?.name || duty.customDriverName || '';
                                const driverPhone = duty.driver?.mobile || '';
                                const vehicleNum = duty.vehicle?.carNumber || duty.customCarNumber || '';
                                const carModel = duty.vehicle?.model || duty.carType || 'Car';
                                const bkgCode = duty.bookingId || (duty.bookingRef?.clientCode) || '-';
                                const statusStyle = getStatusStyle(duty.status || 'Scheduled');

                                return (
                                    <tr
                                        key={duty._id || idx}
                                        style={{
                                            background: 'rgba(15, 23, 42, 0.85)',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        className="driver-card-hover"
                                    >
                                        {/* # */}
                                        <td style={{
                                            padding: '14px 10px',
                                            color: 'rgba(255,255,255,0.5)',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            textAlign: 'center',
                                            borderTopLeftRadius: '14px',
                                            borderBottomLeftRadius: '14px',
                                            borderLeft: `3px solid ${statusStyle.text}`
                                        }}>
                                            {idx + 1}
                                        </td>

                                        {/* Time & Day */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={13} color="#38bdf8" />
                                                <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '13px' }}>
                                                    {duty.time || '09:00 AM'}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: '5px' }}>
                                                {isDutyToday ? (
                                                    <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '6px', fontWeight: '900', letterSpacing: '0.5px' }}>
                                                        TODAY
                                                    </span>
                                                ) : isDutyTomorrow ? (
                                                    <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontWeight: '900', letterSpacing: '0.5px' }}>
                                                        TOMORROW
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>
                                                        {formatDateIST(dutyDateStr)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Booking Code */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ color: '#fbbf24', fontWeight: '1000', fontSize: '13.5px', letterSpacing: '0.5px' }}>
                                                {bkgCode}
                                            </div>
                                            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '3px', fontWeight: '700' }}>
                                                {duty.isDirectBooking ? 'Direct' : 'Package'}
                                            </div>
                                        </td>

                                        {/* Guest Details */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ color: '#ffffff', fontWeight: '800', fontSize: '13.5px', lineHeight: 1.3 }}>
                                                    {duty.clientName || 'Guest'}
                                                </span>
                                                {(duty.dayNo || (duty.bookingRef?.travelStartDate && duty.bookingRef?.travelEndDate)) && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '800',
                                                        color: '#38bdf8',
                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        🗓️ Day {duty.dayNo || 1}
                                                    </span>
                                                )}
                                            </div>
                                            {duty.mobileNumber && duty.mobileNumber !== 'TBA' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11.5px', fontFamily: 'monospace', fontWeight: '700' }}>
                                                        {duty.mobileNumber}
                                                    </span>
                                                    <a
                                                        href={`https://wa.me/${duty.mobileNumber.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Message Guest on WhatsApp"
                                                        style={{ color: '#34d399', display: 'flex', padding: '2px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '4px' }}
                                                    >
                                                        <Share2 size={11} />
                                                    </a>
                                                    <a
                                                        href={`tel:${duty.mobileNumber}`}
                                                        title="Call Guest"
                                                        style={{ color: '#60a5fa', display: 'flex', padding: '2px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '4px' }}
                                                    >
                                                        <Phone size={11} />
                                                    </a>
                                                </div>
                                            )}
                                        </td>

                                        {/* Hotel / Pickup */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', color: '#e2e8f0', fontSize: '12px', fontWeight: '700', lineHeight: 1.35 }}>
                                                <MapPin size={13} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                    {duty.hotel || duty.pickupPoint || 'City / Hotel'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Duty / Route Details (Fixed Word Break & Overlap Proof) */}
                                        <td style={{
                                            padding: '14px 14px',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'anywhere',
                                            whiteSpace: 'normal',
                                            lineHeight: 1.4
                                        }}>
                                            <div style={{ color: '#f8fafc', fontSize: '12.5px', fontWeight: '700' }}>
                                                {duty.duty || duty.itinerary || 'City Duty'}
                                            </div>
                                            {duty.bookingRef?.travelStartDate && duty.bookingRef?.travelEndDate && (
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', fontWeight: '600' }}>
                                                    {formatDateIST(duty.bookingRef.travelStartDate)} to {formatDateIST(duty.bookingRef.travelEndDate)}
                                                </div>
                                            )}
                                            {duty.guestRemarks && (
                                                <div style={{ color: '#fbbf24', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                                                    Note: {duty.guestRemarks}
                                                </div>
                                            )}
                                        </td>

                                        {/* Vehicle */}
                                        <td style={{ padding: '14px 12px' }}>
                                            {vehicleNum ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{
                                                        background: 'rgba(56, 189, 248, 0.12)',
                                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                                        color: '#38bdf8',
                                                        padding: '3px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '11.5px',
                                                        fontWeight: '900',
                                                        width: 'fit-content'
                                                    }}>
                                                        {vehicleNum}
                                                    </span>
                                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '600' }}>
                                                        {carModel}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: '700' }}>
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>

                                        {/* Driver */}
                                        <td style={{ padding: '14px 12px' }}>
                                            {driverName ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <div style={{ color: '#4ade80', fontWeight: '800', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <UserCheck size={13} /> {driverName}
                                                    </div>
                                                    {driverPhone && (
                                                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '600' }}>
                                                            {driverPhone}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: '700' }}>
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>

                                        {/* Fare / Collection (Clickable to open Payment Breakdown & Collection Modal) */}
                                        <td style={{ padding: '10px 12px' }}>
                                            {(() => {
                                                const totAmount = Number(duty.bookingRef?.totalAmount || duty.revenue || 0);
                                                const advPaid = Number(duty.bookingRef?.advancePaid || duty.advancePaid || 0);
                                                const balDue = duty.bookingRef?.balanceDue !== undefined ? Number(duty.bookingRef.balanceDue) : Math.max(0, totAmount - advPaid);
                                                const isFullyPaid = duty.paymentStatus === 'Full Received' || duty.paymentStatus === 'Fully Paid' || (balDue === 0 && totAmount > 0);

                                                return (
                                                    <div
                                                        onClick={() => openPaymentModal(duty)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            padding: '6px 10px',
                                                            borderRadius: '10px',
                                                            background: isFullyPaid ? 'rgba(34, 197, 94, 0.12)' : balDue > 0 ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255,255,255,0.04)',
                                                            border: isFullyPaid ? '1px solid rgba(34, 197, 94, 0.35)' : balDue > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px',
                                                            minWidth: '105px'
                                                        }}
                                                        title="Click to view payment status or collect payment"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ color: '#ffffff', fontWeight: '1000', fontSize: '13px' }}>
                                                                ₹{totAmount.toLocaleString('en-IN')}
                                                            </span>
                                                            {isFullyPaid ? (
                                                                <CheckCircle2 size={13} color="#4ade80" />
                                                            ) : (
                                                                <IndianRupee size={12} color="#fbbf24" />
                                                            )}
                                                        </div>
                                                        {isFullyPaid ? (
                                                            <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '900', textTransform: 'uppercase' }}>
                                                                ✅ Full Received
                                                            </span>
                                                        ) : balDue > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: '900' }}>
                                                                    Due: ₹{balDue.toLocaleString('en-IN')}
                                                                </span>
                                                                {advPaid > 0 && (
                                                                    <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                                                        (Adv: ₹{advPaid.toLocaleString('en-IN')})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                                                {duty.paymentStatus || 'Pending'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                            <select
                                                value={duty.status || 'Scheduled'}
                                                onChange={(e) => handleStatusChange(duty._id, e.target.value)}
                                                style={{
                                                    padding: '5px 8px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${statusStyle.border}`,
                                                    background: statusStyle.bg,
                                                    color: statusStyle.text,
                                                    fontSize: '11.5px',
                                                    fontWeight: '900',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                    width: '100%',
                                                    maxWidth: '110px'
                                                }}
                                            >
                                                <option value="Scheduled" style={{ background: '#0f172a', color: 'white' }}>Scheduled</option>
                                                <option value="Assigned" style={{ background: '#0f172a', color: 'white' }}>Assigned</option>
                                                <option value="Started" style={{ background: '#0f172a', color: 'white' }}>Started</option>
                                                <option value="Ongoing" style={{ background: '#0f172a', color: 'white' }}>Ongoing</option>
                                                <option value="Completed" style={{ background: '#0f172a', color: 'white' }}>Completed</option>
                                                <option value="Cancelled" style={{ background: '#0f172a', color: 'white' }}>Cancelled</option>
                                            </select>
                                        </td>

                                        {/* Actions */}
                                        <td style={{
                                            padding: '14px 12px',
                                            textAlign: 'center',
                                            borderTopRightRadius: '14px',
                                            borderBottomRightRadius: '14px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                {/* WhatsApp Share */}
                                                <button
                                                    onClick={() => handleShareWhatsApp(duty)}
                                                    title="Share Dispatch Slip on WhatsApp"
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(52, 211, 153, 0.15)',
                                                        border: '1px solid rgba(52, 211, 153, 0.3)',
                                                        color: '#34d399',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Share2 size={13} />
                                                </button>

                                                {/* Edit Duty */}
                                                <button
                                                    onClick={() => openEditModal(duty)}
                                                    title="Edit Duty Details"
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                                        color: '#38bdf8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Edit3 size={13} />
                                                </button>

                                                {/* Delete Duty */}
                                                <button
                                                    onClick={() => handleDeleteDuty(duty)}
                                                    title="Delete Duty"
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        color: '#f87171',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Trash2 size={13} />
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
            )}

            {/* MODAL: DIRECT BOOKING / INSTANT DRS INSERT */}
            <AnimatePresence>
                {showDirectBookingModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '650px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: '#0b1120',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '24px',
                                padding: '24px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
                            }}
                            className="custom-scrollbar"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={20} color="#fbbf24" /> Direct Booking (Instant Live DRS)
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', fontSize: '12px' }}>
                                        Creates DRS Duty and automatically generates Confirmed Booking with full client codes.
                                    </p>
                                </div>
                                <button onClick={() => setShowDirectBookingModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleDirectBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Row 1: Date & Time */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Duty Date (Start Date) *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={directForm.date}
                                            onChange={(e) => setDirectForm({ ...directForm, date: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Tour End Date <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>(Optional Multi-Day)</span>
                                        </label>
                                        <input
                                            type="date"
                                            min={directForm.date}
                                            value={directForm.endDate || ''}
                                            onChange={(e) => setDirectForm({ ...directForm, endDate: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Multi-day Tour helper badge */}
                                {directForm.endDate && directForm.endDate > directForm.date && (
                                    <div style={{
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        border: '1px solid rgba(251, 191, 36, 0.25)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        color: '#fbbf24',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <Calendar size={16} />
                                        <span>
                                            ✨ Multi-Day Tour: Will create {Math.max(1, Math.round((new Date(directForm.endDate) - new Date(directForm.date)) / (1000 * 60 * 60 * 24)) + 1)} daily DRS duties from {formatDateIST(directForm.date)} to {formatDateIST(directForm.endDate)}!
                                        </span>
                                    </div>
                                )}

                                {/* Row 1b: Time */}
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                        Duty Time *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 09:00 AM, 11:00, APG"
                                        value={directForm.time}
                                        onChange={(e) => setDirectForm({ ...directForm, time: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>

                                {/* Row 2: Guest Name & Mobile */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Guest / Client Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Mr. Sharma"
                                            value={directForm.clientName}
                                            onChange={(e) => setDirectForm({ ...directForm, clientName: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Mobile Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="10 digit mobile"
                                            value={directForm.mobileNumber}
                                            onChange={(e) => setDirectForm({ ...directForm, mobileNumber: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Hotel & Duty Route */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Hotel / Source Pickup
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Marriott, Airport"
                                            value={directForm.hotel}
                                            onChange={(e) => setDirectForm({ ...directForm, hotel: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Duty / Route Description *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Airport Drop / Sightseeing 8hr 80km"
                                            value={directForm.duty}
                                            onChange={(e) => setDirectForm({ ...directForm, duty: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Car Type, Assign Driver & Vehicle */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Car Type
                                        </label>
                                        <select
                                            value={directForm.carType}
                                            onChange={(e) => setDirectForm({ ...directForm, carType: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="Sedan">Sedan (Dzire / Etios)</option>
                                            <option value="Innova Crysta">Innova Crysta</option>
                                            <option value="Ertiga">Ertiga</option>
                                            <option value="Innova">Innova</option>
                                            <option value="Tempo Traveller">Tempo Traveller</option>
                                            <option value="Luxury / SUV">Luxury / SUV</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Assign Driver
                                        </label>
                                        <select
                                            value={directForm.driver}
                                            onChange={(e) => setDirectForm({ ...directForm, driver: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="">-- Select Driver (Optional) --</option>
                                            {drivers.map(d => (
                                                <option key={d._id} value={d._id}>{d.name} ({d.mobile || 'No mob'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Assign Vehicle
                                        </label>
                                        <select
                                            value={directForm.vehicle}
                                            onChange={(e) => setDirectForm({ ...directForm, vehicle: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="">-- Select Vehicle (Optional) --</option>
                                            {vehicles.map(v => (
                                                <option key={v._id} value={v._id}>{v.carNumber} - {v.model || v.type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 5: Package Revenue & Advance */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                                            Total Fare / Price (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            placeholder="e.g. 3500"
                                            value={directForm.revenue}
                                            onChange={(e) => setDirectForm({ ...directForm, revenue: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fbbf24', fontSize: '14px', fontWeight: '800', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#4ade80', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                                            Advance Received (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 1000"
                                            value={directForm.advancePaid}
                                            onChange={(e) => setDirectForm({ ...directForm, advancePaid: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#4ade80', fontSize: '14px', fontWeight: '800', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Payment Mode
                                        </label>
                                        <select
                                            value={directForm.paymentMode}
                                            onChange={(e) => setDirectForm({ ...directForm, paymentMode: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="UPI / QR Code">UPI / QR Code</option>
                                            <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                            <option value="Cash">Cash to Company</option>
                                            <option value="Driver Cash">Driver Cash in Hand</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 6: Auto Confirm Checkbox */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                                    <input
                                        type="checkbox"
                                        id="autoConfirmCheck"
                                        checked={directForm.createConfirmedBooking}
                                        onChange={(e) => setDirectForm({ ...directForm, createConfirmedBooking: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: '#fbbf24', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="autoConfirmCheck" style={{ fontSize: '13px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                                        Auto-generate Confirmed Booking in system with Client Code (Recommended)
                                    </label>
                                </div>

                                {/* Form Buttons */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDirectBookingModal(false)}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingDirect}
                                        style={{
                                            flex: 2,
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            border: 'none',
                                            color: '#000000',
                                            fontWeight: '900',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {submittingDirect ? 'Creating Booking & DRS...' : 'Confirm & Dispatch to Live DRS'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: QUICK ASSIGN DRIVER & VEHICLE */}
            <AnimatePresence>
                {showAssignModal && selectedDutyForAssign && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '480px',
                                background: '#0b1120',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '20px',
                                padding: '24px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '17px', fontWeight: '800' }}>
                                        Assign Driver & Vehicle
                                    </h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', fontSize: '12px' }}>
                                        Guest: {selectedDutyForAssign.clientName} ({selectedDutyForAssign.time})
                                    </p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleQuickAssignSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                        Select Driver
                                    </label>
                                    <select
                                        value={assignDriverId}
                                        onChange={(e) => setAssignDriverId(e.target.value)}
                                        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                    >
                                        <option value="">-- No Driver / Custom --</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id}>{d.name} ({d.mobile || 'No mob'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                        Select Vehicle
                                    </label>
                                    <select
                                        value={assignVehicleId}
                                        onChange={(e) => setAssignVehicleId(e.target.value)}
                                        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                    >
                                        <option value="">-- No Vehicle / Custom --</option>
                                        {vehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.carNumber} - {v.model || v.type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingAssign}
                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#38bdf8', border: 'none', color: '#000000', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        {savingAssign ? 'Saving...' : 'Save Assignment'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: EDIT DUTY FULL DETAILS */}
            <AnimatePresence>
                {showEditDutyModal && selectedDutyForEdit && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '600px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: '#0b1120',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '20px',
                                padding: '24px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
                            }}
                            className="custom-scrollbar"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                <div>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Edit3 size={18} color="#38bdf8" /> Edit Duty Details
                                    </h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', fontSize: '12px' }}>
                                        Booking Code: {selectedDutyForEdit.bookingId || 'Direct'}
                                    </p>
                                </div>
                                <button onClick={() => setShowEditDutyModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleEditDutySave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Guest Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.clientName}
                                            onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Mobile Number</label>
                                        <input
                                            type="text"
                                            value={editForm.mobileNumber}
                                            onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Duty Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editForm.date}
                                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Duty Time</label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.time}
                                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Hotel / Pickup</label>
                                        <input
                                            type="text"
                                            value={editForm.hotel}
                                            onChange={(e) => setEditForm({ ...editForm, hotel: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Duty / Route</label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.duty}
                                            onChange={(e) => setEditForm({ ...editForm, duty: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Fare (₹)</label>
                                        <input
                                            type="number"
                                            value={editForm.revenue}
                                            onChange={(e) => setEditForm({ ...editForm, revenue: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fbbf24', fontSize: '13px', fontWeight: '800', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Payment Status</label>
                                        <select
                                            value={editForm.paymentStatus}
                                            onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="Advance Received">Advance Received</option>
                                            <option value="Fully Paid">Fully Paid</option>
                                            <option value="Pending">Pending</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Duty Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="Assigned">Assigned</option>
                                            <option value="Started">Started</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Driver</label>
                                        <select
                                            value={editForm.driver}
                                            onChange={(e) => setEditForm({ ...editForm, driver: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="">-- No Driver --</option>
                                            {drivers.map(d => (
                                                <option key={d._id} value={d._id}>{d.name} ({d.mobile || 'No mob'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Vehicle</label>
                                        <select
                                            value={editForm.vehicle}
                                            onChange={(e) => setEditForm({ ...editForm, vehicle: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                        >
                                            <option value="">-- No Vehicle --</option>
                                            {vehicles.map(v => (
                                                <option key={v._id} value={v._id}>{v.carNumber} - {v.model || v.type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Guest Remarks / Notes</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. VIP guest, water bottles required"
                                        value={editForm.guestRemarks}
                                        onChange={(e) => setEditForm({ ...editForm, guestRemarks: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditDutyModal(false)}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingEdit}
                                        style={{ flex: 1.5, padding: '12px', borderRadius: '10px', background: '#38bdf8', border: 'none', color: '#000000', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        {savingEdit ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: PAYMENT STATUS & LIVE COLLECTION DRAWER */}
            <AnimatePresence>
                {showPaymentModal && selectedDutyForPayment && (() => {
                    const duty = selectedDutyForPayment;
                    const totAmount = Number(duty.bookingRef?.totalAmount || duty.revenue || 0);
                    const advPaid = Number(duty.bookingRef?.advancePaid || duty.advancePaid || 0);
                    const balDue = duty.bookingRef?.balanceDue !== undefined ? Number(duty.bookingRef.balanceDue) : Math.max(0, totAmount - advPaid);
                    const isFullyPaid = duty.paymentStatus === 'Full Received' || duty.paymentStatus === 'Fully Paid' || (balDue === 0 && totAmount > 0);

                    return (
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.88)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 999999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                style={{
                                    width: '100%',
                                    maxWidth: '650px',
                                    maxHeight: '92vh',
                                    overflowY: 'auto',
                                    background: '#0b1120',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    borderRadius: '24px',
                                    padding: '26px',
                                    boxShadow: '0 25px 70px rgba(0,0,0,0.8)'
                                }}
                                className="custom-scrollbar"
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                                <IndianRupee size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'white', margin: 0, fontSize: '19px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                                                    Payment Status & Collection
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                                    <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '12px' }}>
                                                        {duty.bookingId || 'Direct Booking'}
                                                    </span>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>•</span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '12px' }}>
                                                        {duty.clientName || 'Guest'}
                                                    </span>
                                                    {duty.mobileNumber && (
                                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11.5px', fontFamily: 'monospace' }}>
                                                            ({duty.mobileNumber})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowPaymentModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Tour Route Details Banner */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '14px',
                                    padding: '12px 16px',
                                    marginBottom: '18px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '10px',
                                    fontSize: '12.5px'
                                }}>
                                    <div>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Duty / Route: </span>
                                        <span style={{ color: 'white', fontWeight: '800' }}>{duty.duty || duty.itinerary || 'City Duty'}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        {duty.vehicle?.carNumber || duty.customCarNumber ? (
                                            <span style={{ color: '#38bdf8', fontWeight: '800' }}>
                                                🚗 {duty.vehicle?.carNumber || duty.customCarNumber}
                                            </span>
                                        ) : null}
                                        {duty.driver?.name || duty.customDriverName ? (
                                            <span style={{ color: '#4ade80', fontWeight: '800' }}>
                                                👤 {duty.driver?.name || duty.customDriverName}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {/* 4 Financial Summary Cards */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '22px'
                                }}>
                                    {/* Total Fare */}
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>Total Fare</div>
                                        <div style={{ fontSize: '18px', fontWeight: '1000', color: 'white', marginTop: '4px' }}>
                                            ₹{totAmount.toLocaleString('en-IN')}
                                        </div>
                                    </div>

                                    {/* Advance Received */}
                                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10.5px', color: '#4ade80', fontWeight: '800', textTransform: 'uppercase' }}>Advance Paid</div>
                                        <div style={{ fontSize: '18px', fontWeight: '1000', color: '#4ade80', marginTop: '4px' }}>
                                            ₹{advPaid.toLocaleString('en-IN')}
                                        </div>
                                    </div>

                                    {/* Balance Due to Collect */}
                                    <div style={{
                                        background: balDue > 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.15))' : 'rgba(34, 197, 94, 0.1)',
                                        border: balDue > 0 ? '1.5px solid #fbbf24' : '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '16px',
                                        padding: '14px',
                                        textAlign: 'center',
                                        boxShadow: balDue > 0 ? '0 4px 15px rgba(245, 158, 11, 0.2)' : 'none'
                                    }}>
                                        <div style={{ fontSize: '10.5px', color: balDue > 0 ? '#fbbf24' : '#4ade80', fontWeight: '900', textTransform: 'uppercase' }}>
                                            {balDue > 0 ? '🔥 Remaining Due' : 'Balance Due'}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: balDue > 0 ? '#fbbf24' : '#4ade80', marginTop: '4px' }}>
                                            ₹{balDue.toLocaleString('en-IN')}
                                        </div>
                                    </div>

                                    {/* Current Status */}
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>Status</div>
                                        <div style={{ fontSize: '12px', fontWeight: '900', color: isFullyPaid ? '#4ade80' : balDue > 0 ? '#fbbf24' : 'white', marginTop: '4px' }}>
                                            {isFullyPaid ? '✅ Fully Paid' : (duty.paymentStatus || 'Pending')}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Explanation */}
                                {isFullyPaid ? (
                                    <div style={{
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        color: '#4ade80',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <CheckCircle2 size={18} />
                                        <span>Full payment of ₹{totAmount.toLocaleString('en-IN')} has been received and verified for this booking!</span>
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'rgba(245, 158, 11, 0.12)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        color: '#fbbf24',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <AlertCircle size={18} />
                                        <span>Pending collection of ₹{balDue.toLocaleString('en-IN')} remaining. Record the received amount below to settle.</span>
                                    </div>
                                )}

                                {/* Receive Payment Form */}
                                <form onSubmit={handleCollectPaymentSubmit} style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '18px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ color: 'white', margin: 0, fontSize: '14.5px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Sparkles size={16} color="#fbbf24" /> Receive Payment Entry
                                        </h4>
                                        {balDue > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCollectAmount(balDue);
                                                    setCollectMarkFullPaid(true);
                                                }}
                                                style={{
                                                    background: 'rgba(251, 191, 36, 0.15)',
                                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                                    color: '#fbbf24',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ⚡ Fill Full Due (₹{balDue.toLocaleString('en-IN')})
                                            </button>
                                        )}
                                    </div>

                                    {/* Amount & Mode */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                                                Amount Received (₹) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                required={!collectMarkFullPaid}
                                                placeholder={balDue > 0 ? String(balDue) : '0'}
                                                value={collectAmount}
                                                onChange={(e) => setCollectAmount(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '11px 14px',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                                    borderRadius: '10px',
                                                    color: '#fbbf24',
                                                    fontSize: '16px',
                                                    fontWeight: '900',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                                Payment Mode *
                                            </label>
                                            <select
                                                value={collectPaymentMode}
                                                onChange={(e) => setCollectPaymentMode(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '11px 14px',
                                                    background: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="UPI / QR Code">UPI / QR Code</option>
                                                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                                <option value="Cash">Cash to Company</option>
                                                <option value="Driver Cash">Cash to Driver in Hand</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Bank Account Selection */}
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                            Deposit to Bank / Cash Account (Optional)
                                        </label>
                                        <select
                                            value={collectBankAccountId}
                                            onChange={(e) => setCollectBankAccountId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '11px 14px',
                                                background: '#0f172a',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                color: 'white',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="">-- Do Not Deposit to Bank Account --</option>
                                            {banks.map(b => (
                                                <option key={b._id} value={b._id}>
                                                    {b.bankName} - {b.accountNumber ? `A/c ...${b.accountNumber.slice(-4)}` : b.accountType} (Bal: ₹{(b.currentBalance || 0).toLocaleString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Reference & Notes */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                                Transaction / UTR Ref
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. UTR12345678"
                                                value={collectPaymentReference}
                                                onChange={(e) => setCollectPaymentReference(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                                Remarks / Note
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Paid at hotel reception"
                                                value={collectNotes}
                                                onChange={(e) => setCollectNotes(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mark as Full Paid Checkbox */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                        <input
                                            type="checkbox"
                                            id="markFullPaidCheck"
                                            checked={collectMarkFullPaid}
                                            onChange={(e) => setCollectMarkFullPaid(e.target.checked)}
                                            style={{ width: '16px', height: '16px', accentColor: '#4ade80', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="markFullPaidCheck" style={{ fontSize: '12.5px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                                            Mark booking as Completely Settled (Full Received)
                                        </label>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentModal(false)}
                                            style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={collectingPayment}
                                            style={{
                                                flex: 2,
                                                padding: '12px',
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                border: 'none',
                                                color: '#ffffff',
                                                fontWeight: '900',
                                                fontSize: '13.5px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                                            }}
                                        >
                                            {collectingPayment ? 'Recording Payment...' : `💰 Receive & Save Payment (₹${(Number(collectAmount) || 0).toLocaleString('en-IN')})`}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
