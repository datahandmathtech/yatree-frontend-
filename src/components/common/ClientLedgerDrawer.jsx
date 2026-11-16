import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Car, CheckCircle, Clock, Plus, Download, Fuel, Edit, Trash2, IndianRupee, Eye, ExternalLink, User } from 'lucide-react';
import AssignDriverModal from './AssignDriverModal';
import EditBookingModal from './EditBookingModal';
import axios from '../../api/axios';
import { useCompany } from '../../context/CompanyContext';
import { generateClientLedgerPDF } from '../../utils/clientLedgerPdf';

export default function ClientLedgerDrawer({ booking: propBooking, onClose, onAddEntry, onEditBooking, onEntryUpdated }) {
    const { selectedCompany } = useCompany();
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingOverrides, setBookingOverrides] = useState(null);

    useEffect(() => {
        setBookingOverrides(null);
    }, [propBooking?._id, propBooking?._vehicleId, propBooking?._eventId]);

    const booking = propBooking ? (bookingOverrides ? { ...propBooking, ...bookingOverrides } : propBooking) : null;
    const isEventBooking = Boolean(booking?.isEvent || booking?._isEventDuty || booking?.eventId || booking?._eventId);

    // Edit entry modal state
    const [editingEntry, setEditingEntry] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editMode, setEditMode] = useState('Cash to Company');
    const [editBankAccountId, setEditBankAccountId] = useState('');
    const [editReference, setEditReference] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [showFullEditModal, setShowFullEditModal] = useState(false);
    const [bookingForFullEdit, setBookingForFullEdit] = useState(null);
    const [loadingFullEdit, setLoadingFullEdit] = useState(false);

    // Dedicated Event Duty Edit Modal states (keeps Event duties separated from Lead/Tour Booking form)
    const [showEventEditModal, setShowEventEditModal] = useState(false);
    const [eventEditForm, setEventEditForm] = useState(null);
    const [savingEventEdit, setSavingEventEdit] = useState(false);

    const handleOpenFullEditBooking = async () => {
        if (isEventBooking) {
            const vehId = booking._vehicleId || (booking._id && booking._id !== booking._eventId ? booking._id : '');
            const rawPlate = booking.rawCarNumber || booking.carNumber || booking.vehicleNumber || '';
            const cleanPlate = rawPlate.split('#')[0].trim();
            setEventEditForm({
                _id: vehId,
                _eventId: booking._eventId || booking.eventId || '',
                eventName: booking.eventName || 'Event',
                vehicleSource: booking.vehicleSource || 'External',
                carNumber: cleanPlate,
                rawCarNumber: rawPlate,
                model: booking.model || booking.vehicleType || 'Sedan',
                guestName: booking.guestName || booking.clientName || '',
                date: booking.dutyDate || (booking.travelStartDate ? String(booking.travelStartDate).slice(0, 10) : new Date().toISOString().split('T')[0]),
                dutyTime: booking.dutyTime || booking.time || '09:00 AM',
                dutyType: booking.dutyType || booking.pickupLocation || '',
                dropLocation: booking.dropLocation || booking.hotel || '',
                driverName: booking.driverName || '',
                ownerName: booking.ownerName || '',
                dutyAmount: booking.dutyAmount ?? booking.totalAmount ?? 0,
                buyAmount: booking.buyAmount ?? 0,
                remarks: booking.remarks || ''
            });
            setShowEventEditModal(true);
            return;
        }

        const bkgId = booking?._id || booking?._realBookingId;
        if (!bkgId) return;
        try {
            setLoadingFullEdit(true);
            const res = await axios.get(`/api/bookings/single/${bkgId}`);
            if (res.data) {
                setBookingForFullEdit(res.data);
                setShowFullEditModal(true);
            } else {
                setBookingForFullEdit(booking);
                setShowFullEditModal(true);
            }
        } catch (err) {
            console.error('Error fetching full booking for edit:', err);
            setBookingForFullEdit(booking);
            setShowFullEditModal(true);
        } finally {
            setLoadingFullEdit(false);
        }
    };

    const handleSaveEventEdit = async (e) => {
        e.preventDefault();
        if (!eventEditForm) return;
        try {
            setSavingEventEdit(true);
            const compId = selectedCompany?._id || (typeof booking?.company === 'object' ? booking?.company?._id : booking?.company);

            if (eventEditForm._id) {
                const parts = (eventEditForm.rawCarNumber || '').split('#');
                const cleanPlate = (eventEditForm.carNumber || 'TBA').trim().toUpperCase();
                let internalCarNumber = `${cleanPlate}#${eventEditForm.date}`;
                if (cleanPlate === parts[0] && eventEditForm.date === parts[1] && parts[2]) {
                    internalCarNumber += `#${parts[2]}`;
                } else {
                    internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                }

                await axios.put(`/api/admin/vehicles/${eventEditForm._id}`, {
                    carNumber: internalCarNumber,
                    model: eventEditForm.model?.trim() || 'Sedan',
                    property: eventEditForm.dropLocation?.trim() || '',
                    dropLocation: eventEditForm.dropLocation?.trim() || '',
                    dutyAmount: Number(eventEditForm.dutyAmount) || 0,
                    ownerName: eventEditForm.ownerName?.trim() || '',
                    buyAmount: Number(eventEditForm.buyAmount) || 0,
                    eventId: eventEditForm._eventId || undefined,
                    companyId: compId,
                    isOutsideCar: true,
                    transactionType: 'Buy',
                    createdAt: eventEditForm.date,
                    driverName: eventEditForm.driverName?.trim() || '',
                    vehicleSource: eventEditForm.vehicleSource || 'External',
                    dutyType: eventEditForm.dutyType?.trim() || '',
                    dutyTime: eventEditForm.dutyTime?.trim() || '09:00 AM',
                    remarks: eventEditForm.remarks || '',
                    guestName: eventEditForm.guestName?.trim() || ''
                });

                const updatedAmt = Number(eventEditForm.dutyAmount) || 0;
                const advAmt = Number(booking?.advancePaid) || 0;
                setBookingOverrides({
                    clientName: eventEditForm.guestName?.trim() || booking.clientName,
                    guestName: eventEditForm.guestName?.trim() || '',
                    carNumber: cleanPlate,
                    vehicleNumber: cleanPlate,
                    rawCarNumber: internalCarNumber,
                    model: eventEditForm.model?.trim() || 'Sedan',
                    vehicleType: eventEditForm.model?.trim() || 'Sedan',
                    vehicleSource: eventEditForm.vehicleSource || 'External',
                    driverName: eventEditForm.driverName?.trim() || '',
                    ownerName: eventEditForm.ownerName?.trim() || '',
                    buyAmount: Number(eventEditForm.buyAmount) || 0,
                    dutyAmount: updatedAmt,
                    totalAmount: updatedAmt,
                    balanceDue: Math.max(0, updatedAmt - advAmt),
                    dutyType: eventEditForm.dutyType?.trim() || '',
                    pickupLocation: eventEditForm.dutyType?.trim() || '',
                    dropLocation: eventEditForm.dropLocation?.trim() || '',
                    hotel: eventEditForm.dropLocation?.trim() || '',
                    dutyTime: eventEditForm.dutyTime?.trim() || '09:00 AM',
                    dutyDate: eventEditForm.date,
                    travelStartDate: eventEditForm.date,
                    travelEndDate: eventEditForm.date,
                    remarks: eventEditForm.remarks || ''
                });
            } else if (eventEditForm._eventId) {
                await axios.put(`/api/admin/events/${eventEditForm._eventId}`, {
                    client: eventEditForm.guestName?.trim() || '',
                    date: eventEditForm.date,
                    location: eventEditForm.dropLocation?.trim() || '',
                    proformaAmount: Number(eventEditForm.dutyAmount) || 0
                });

                const updatedAmt = Number(eventEditForm.dutyAmount) || 0;
                const advAmt = Number(booking?.advancePaid) || 0;
                setBookingOverrides({
                    clientName: eventEditForm.guestName?.trim() || booking.clientName,
                    guestName: eventEditForm.guestName?.trim() || '',
                    totalAmount: updatedAmt,
                    dutyAmount: updatedAmt,
                    balanceDue: Math.max(0, updatedAmt - advAmt),
                    hotel: eventEditForm.dropLocation?.trim() || '',
                    dropLocation: eventEditForm.dropLocation?.trim() || '',
                    dutyDate: eventEditForm.date,
                    travelStartDate: eventEditForm.date,
                    travelEndDate: eventEditForm.date
                });
            }

            setShowEventEditModal(false);
            setEventEditForm(null);
            await fetchLedger();
            if (onEntryUpdated) onEntryUpdated();
        } catch (err) {
            console.error('Error updating event duty:', err);
            alert(err.response?.data?.message || 'Failed to update event duty');
        } finally {
            setSavingEventEdit(false);
        }
    };
    const [deletingEdit, setDeletingEdit] = useState(false);

    // Guest Trip Modal state
    const [showTripModal, setShowTripModal] = useState(false);
    const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
    const [tripDuties, setTripDuties] = useState([]);
    const [loadingTripDuties, setLoadingTripDuties] = useState(false);
    const [selectedDutyRowIdx, setSelectedDutyRowIdx] = useState(null);

    const formatDayMonth = (dStr) => {
        if (!dStr) return '-';
        try {
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return String(dStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${day}-${month}`;
        } catch {
            return String(dStr);
        }
    };

    const loadTripDuties = async () => {
        if (!booking) return;
        setLoadingTripDuties(true);
        try {
            if (isEventBooking) {
                setTripDuties([{
                    _id: booking._vehicleId || booking._id || 'event_duty',
                    date: booking.dutyDate || booking.travelStartDate,
                    dayNo: 1,
                    hotel: booking.dropLocation || booking.hotel || booking.eventName || 'Event Venue',
                    clientName: booking.guestName || booking.clientName || 'Event Guest',
                    mobileNumber: booking.mobileNumber || '-',
                    time: booking.dutyTime || booking.time || '09:00 AM',
                    duty: booking.dutyType || booking.pickupLocation || `${booking.eventName || 'Event'} Duty`,
                    revenue: Number(booking.dutyAmount || booking.totalAmount || 0),
                    status: booking.status || 'Confirmed',
                    cOut: '-',
                    driver: { name: booking.driverName || 'Assigned' },
                    vehicle: { carNumber: (booking.carNumber || booking.vehicleNumber || booking.vehicleType || '-').split('#')[0] }
                }]);
                setLoadingTripDuties(false);
                return;
            }

            let freshBooking = booking;
            if (booking?._id && !String(booking._id).startsWith('bkg-mock')) {
                try {
                    const res = await axios.get(`/api/bookings/single/${booking._id}`);
                    if (res.data) freshBooking = res.data;
                } catch (err) {
                    console.warn('Could not fetch single booking, using prop booking', err);
                }
            }

            const totalPkgFare = Number(freshBooking.totalAmount || freshBooking.packagePrice || 0);
            const existingItin = Array.isArray(freshBooking.itinerary) ? freshBooking.itinerary : [];
            const existingDrs = Array.isArray(freshBooking.drsDuties) ? freshBooking.drsDuties : [];

            const validDrs = existingDrs.filter(d => typeof d === 'object' && d !== null && (d.date || d._id));

            if (validDrs.length > 0) {
                const sorted = [...validDrs].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0) || (Number(a.dayNo) || 0) - (Number(b.dayNo) || 0));
                const enriched = sorted.map((d, idx) => {
                    const matchItin = existingItin.find(it => (d.dayNo && Number(it.dayNo) === Number(d.dayNo)) || (d.date && it.date && String(it.date).slice(0, 10) === new Date(d.date).toISOString().slice(0, 10)));
                    return {
                        ...d,
                        dayNo: d.dayNo || matchItin?.dayNo || (idx + 1),
                        hotel: d.hotel || matchItin?.hotel || matchItin?.pickupPoint || freshBooking.hotel || freshBooking.source || 'Direct',
                        clientName: d.clientName || freshBooking.clientName || 'Guest',
                        mobileNumber: d.mobileNumber || freshBooking.mobileNumber || '-',
                        time: d.time || d.pickupTime || matchItin?.time || '10:00 AM',
                        duty: d.duty || d.description || matchItin?.duty || matchItin?.description || 'Tour Duty',
                        revenue: Number(d.revenue || d.totalAmount || 0) || (matchItin?.amount ? Number(matchItin.amount) : 0) || Math.round(totalPkgFare / (sorted.length || 1)),
                        cOut: d.cOut || d.checkOut || (d.status === 'Completed' ? '✓' : '-')
                    };
                });
                setTripDuties(enriched);
            } else if (existingItin.length > 0) {
                const mapped = existingItin.map((it, idx) => ({
                    _id: it._id || `itin_${idx}`,
                    date: it.date || freshBooking.travelStartDate,
                    dayNo: it.dayNo || (idx + 1),
                    hotel: it.hotel || it.pickupPoint || freshBooking.hotel || freshBooking.source || 'Direct',
                    clientName: freshBooking.clientName || 'Guest',
                    mobileNumber: freshBooking.mobileNumber || '-',
                    time: it.time || '10:00 AM',
                    duty: it.duty || it.description || 'Tour Day',
                    revenue: Number(it.amount || 0) || Math.round(totalPkgFare / existingItin.length),
                    status: 'Confirmed',
                    cOut: '-',
                    driver: { name: it.driverName || 'Not Assigned' },
                    vehicle: { carNumber: it.vehicleNumber || freshBooking.vehicleType || '-' }
                }));
                setTripDuties(mapped);
            } else {
                setTripDuties([{
                    _id: freshBooking._id || 'single_day',
                    date: freshBooking.travelStartDate,
                    dayNo: 1,
                    hotel: freshBooking.hotel || freshBooking.source || 'Direct',
                    clientName: freshBooking.clientName || 'Guest',
                    mobileNumber: freshBooking.mobileNumber || '-',
                    time: '10:00 AM',
                    duty: `${freshBooking.vehicleType || 'Cab'} Tour`,
                    revenue: totalPkgFare,
                    status: 'Confirmed',
                    cOut: '-',
                    driver: { name: 'Not Assigned' },
                    vehicle: { carNumber: freshBooking.vehicleType || '-' }
                }]);
            }
        } catch (e) {
            console.error('Error loading trip duties:', e);
        } finally {
            setLoadingTripDuties(false);
        }
    };

    useEffect(() => {
        if (showTripModal && booking) {
            loadTripDuties();
        }
    }, [showTripModal, booking]);

    useEffect(() => {
        if (booking) {
            fetchBankAccounts();
            if (booking.client || isEventBooking || booking._dutyForPayment?._id || booking._vehicleId || booking._id) {
                fetchLedger();
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [propBooking]);

    const fetchBankAccounts = async () => {
        try {
            const compId = selectedCompany?._id || (typeof booking?.company === 'object' ? booking?.company?._id : booking?.company);
            if (!compId) return;
            const { data } = await axios.get(`/api/banks/company/${compId}`);
            setBankAccounts(data || []);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const resolveEntryModeName = (entry) => {
        if (entry.type === 'Fuel') return 'Guest Fuel';
        if (entry.bankName) {
            const matched = bankAccounts.find(b => (b.bankName || '').toLowerCase().trim() === (entry.bankName || '').toLowerCase().trim());
            return matched?.bankName || entry.bankName;
        }
        if (entry.paymentMode && !['UPI / QR Code', 'Bank Transfer / NEFT', 'Advance Payment', 'Payment Received'].includes(entry.paymentMode)) {
            if (/cash/i.test(entry.paymentMode)) return 'Cash';
            return entry.paymentMode;
        }
        const desc = entry.description || '';
        for (const b of bankAccounts) {
            if (b.bankName && desc.toLowerCase().includes(b.bankName.toLowerCase())) {
                return b.bankName;
            }
        }
        const viaPart = desc.split('via ')[1]?.split(' (')[0]?.trim();
        if (viaPart) {
            if (/cash/i.test(viaPart)) return 'Cash';
            if (!['UPI / QR Code', 'Bank Transfer / NEFT'].includes(viaPart)) return viaPart;
        }
        if (booking?.bankName) return booking.bankName;
        if (booking?.paymentMode && /cash/i.test(booking.paymentMode)) return 'Cash';
        return viaPart || (entry.type === 'Advance' ? 'Advance' : 'Bank');
    };

    const fetchLedger = async () => {
        try {
            const clientId = typeof booking?.client === 'object' ? booking?.client?._id : booking?.client;
            if (!clientId) {
                const lookupId = booking?._dutyForPayment?._id || booking?._vehicleId || booking?._id;
                if (lookupId) {
                    const { data } = await axios.get(`/api/drs/duty/${lookupId}/payments`);
                    setLedgerEntries(Array.isArray(data?.payments) ? data.payments : []);
                } else {
                    setLedgerEntries([]);
                }
                setLoading(false);
                return;
            }
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);

            const bkgIdStr = String(booking._id || booking._realBookingId || '');
            const leadIdStr = String(typeof booking.lead === 'object' ? (booking.lead?._id || '') : (booking.lead || ''));
            const rawBkgId = String(booking.rawBookingId || booking.bookingId || '');
            const bkgCode = String(booking.bookingCode || booking.bookingId || '');
            const clientCode = String(booking.clientCode || '');

            const drsDutyIds = new Set(
                (Array.isArray(booking.drsDuties) ? booking.drsDuties : [])
                    .map(d => String(typeof d === 'object' ? (d?._id || '') : d))
                    .filter(Boolean)
            );

            const validCodes = [bkgCode, rawBkgId, clientCode]
                .filter(Boolean)
                .map(c => c.trim().toLowerCase());

            const sDateObj = booking.travelStartDate ? new Date(booking.travelStartDate) : null;
            const eDateObj = booking.travelEndDate ? new Date(booking.travelEndDate) : sDateObj;
            const cDateObj = (booking.bookingDate || booking.createdAt) ? new Date(booking.bookingDate || booking.createdAt) : sDateObj;

            // Strict per-booking date boundaries (10 days buffer) to prevent cross-booking contamination
            const tripStartDate = sDateObj ? new Date(sDateObj) : (cDateObj ? new Date(cDateObj) : null);
            const tripEndDate = eDateObj ? new Date(eDateObj) : tripStartDate;
            const advanceExpectedDate = booking.advanceDate ? new Date(booking.advanceDate) : (cDateObj || tripStartDate);

            const bkgCarPlate = (booking.vehicleNumber || booking.customCarNumber || '').replace(/[\s-]/g, '').toLowerCase();

            const bkgLedger = (data || []).filter(entry => {
                if (entry.type === 'Bill') return false;

                const refId = entry.referenceId ? String(entry.referenceId) : '';
                const desc = (entry.description || '').toLowerCase();
                const entryDate = entry.date ? new Date(entry.date) : null;

                // 1. Explicit referenceId: If referenceId is present, it MUST match this booking or its duties
                // NOTE: For Fuel entries, referenceId points to Fuel record, so don't reject Fuel here!
                if (refId && entry.type !== 'Fuel') {
                    if (refId === bkgIdStr || (leadIdStr && refId === leadIdStr) || drsDutyIds.has(refId)) {
                        return true;
                    }
                    // Has referenceId to another entity/booking -> reject!
                    return false;
                }

                // 2. Booking code in description
                const hasOurCode = validCodes.length > 0 && validCodes.some(code => code && desc.includes(code));

                // Check if description mentions ANY booking code (e.g. Booking 11/19, Booking 9/28, etc.)
                const codeMatch = desc.match(/(?:booking|bkg|lead|client)\s*(?:#|code|id)?\s*[:\-]?\s*([a-z0-9\/\-_]+)/i)
                    || desc.match(/\b(\d{1,2}\/\d{1,4})\b/);

                if (codeMatch) {
                    const foundCode = codeMatch[1].trim().toLowerCase();
                    if (validCodes.some(c => c && (c === foundCode || c.includes(foundCode) || foundCode.includes(c)))) {
                        return true;
                    }
                    // It explicitly mentions a different booking code -> reject!
                    return false;
                }

                if (hasOurCode) {
                    return true;
                }

                // 3. Fuel entries: strictly check trip dates and car plate
                if (entry.type === 'Fuel') {
                    const carMatch = desc.match(/\(([a-z0-9\s-]+)\)/);
                    if (carMatch) {
                        const entryPlate = carMatch[1].replace(/[\s-]/g, '').toLowerCase();
                        if (bkgCarPlate && entryPlate && !bkgCarPlate.includes(entryPlate) && !entryPlate.includes(bkgCarPlate)) {
                            return false;
                        }
                    }
                    if (entryDate && tripStartDate && tripEndDate) {
                        const fuelMin = new Date(tripStartDate.getTime() - 2 * 86400000);
                        const fuelMax = new Date(tripEndDate.getTime() + 2 * 86400000);
                        return entryDate >= fuelMin && entryDate <= fuelMax;
                    }
                    return false;
                }

                // 4. Advance entries: match within 7 days of advanceDate or booking creation date
                if (entry.type === 'Advance') {
                    if (entryDate && advanceExpectedDate) {
                        const advMin = new Date(advanceExpectedDate.getTime() - 7 * 86400000);
                        const advMax = tripEndDate ? new Date(tripEndDate.getTime() + 5 * 86400000) : new Date(advanceExpectedDate.getTime() + 7 * 86400000);
                        return entryDate >= advMin && entryDate <= advMax;
                    }
                    return false;
                }

                // 5. Payment entries: payments for this trip happen within [tripStartDate - 5 days, tripEndDate + 10 days]
                if (entry.type === 'Payment') {
                    if (entryDate && tripStartDate && tripEndDate) {
                        const payMin = new Date(tripStartDate.getTime() - 5 * 86400000);
                        const payMax = new Date(tripEndDate.getTime() + 10 * 86400000);
                        return entryDate >= payMin && entryDate <= payMax;
                    }
                    return false;
                }

                return false;
            }).sort((a,b) => new Date(a.date) - new Date(b.date));
            setLedgerEntries(bkgLedger);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditPayment = (entry) => {
        setEditingEntry(entry);
        setEditAmount(String(entry.amount || ''));
        const dateStr = entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        setEditDate(dateStr);

        // Determine mode
        let mode = 'Cash to Company';
        if (entry.type === 'Fuel') {
            mode = 'Fuel (Guest)';
        } else if (entry.bankName && entry.bankName !== 'Cash') {
            mode = entry.bankName;
        } else if (entry.paymentMode && /driver\s+cash/i.test(entry.paymentMode)) {
            mode = 'Driver Cash';
        } else if (entry.paymentMode && /cash/i.test(entry.paymentMode)) {
            mode = 'Cash to Company';
        } else if (entry.paymentMode) {
            mode = entry.paymentMode;
        }

        const rawSearch = (entry.bankName || mode || '').toLowerCase().trim();
        const matchedBank = bankAccounts.find(b => {
            const bName = (b.bankName || '').toLowerCase().trim();
            return bName === rawSearch || bName.includes(rawSearch) || rawSearch.includes(bName);
        });

        if (matchedBank) {
            mode = matchedBank.bankName;
            setEditBankAccountId(matchedBank._id);
        } else {
            setEditBankAccountId(bankAccounts[0]?._id || '');
        }
        setEditMode(mode);

        // Extract reference
        const desc = entry.description || '';
        const refMatch = desc.match(/Ref:\s*([^)]+)/i);
        setEditReference(refMatch ? refMatch[1].trim() : (entry.reference || ''));
    };

    const handleSaveEditEntry = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!editingEntry) return;

        try {
            setSavingEdit(true);
            const numAmt = Number(editAmount);
            if (isNaN(numAmt) || numAmt <= 0) {
                alert('Please enter a valid amount.');
                setSavingEdit(false);
                return;
            }

            const isBank = !['Cash to Company', 'Driver Cash', 'Fuel (Guest)'].includes(editMode);
            const searchMode = (editMode || '').toLowerCase().trim();
            const selectedBank = isBank
                ? (bankAccounts.find(b => (b.bankName || '').toLowerCase().trim() === searchMode || (b.bankName || '').toLowerCase().includes(searchMode))
                   || bankAccounts.find(b => String(b._id) === String(editBankAccountId)))
                : null;
            const bankName = selectedBank?.bankName || (isBank ? editMode : 'Cash');
            const finalBankAccountId = selectedBank?._id || (isBank ? editBankAccountId : undefined);

            if (editingEntry._id) {
                await axios.put(`/api/clients/ledger/${editingEntry._id}`, {
                    amount: numAmt,
                    date: editDate,
                    paymentMode: editingEntry.type === 'Fuel' ? 'Fuel (Guest)' : editMode,
                    bankName: bankName,
                    bankAccountId: finalBankAccountId,
                    reference: editReference
                });
            } else if (booking?._id) {
                // If it's the booking's un-persisted initial advance
                const diff = numAmt - (Number(editingEntry.amount) || 0);
                await axios.put(`/api/bookings/single/${booking._id}`, {
                    advancePaid: Math.max(0, (Number(booking.advancePaid) || 0) + diff),
                    bankName: bankName,
                    advanceDate: editDate,
                    advanceBankAccountId: isBank ? (selectedBank?._id || undefined) : undefined
                });
            }

            alert('Entry updated successfully!');
            setEditingEntry(null);
            await fetchLedger();
            if (onEntryUpdated) onEntryUpdated();
        } catch (err) {
            console.error('Error updating ledger entry:', err);
            alert(err.response?.data?.message || 'Failed to update ledger entry');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!editingEntry) return;
        if (!window.confirm(`Delete this ${editingEntry.type} entry of ₹${Number(editingEntry.amount).toLocaleString('en-IN')}? This will update the client balance and booking dues.`)) {
            return;
        }

        try {
            setDeletingEdit(true);
            if (editingEntry._id) {
                await axios.delete(`/api/clients/ledger/${editingEntry._id}`);
            } else if (booking?._id) {
                // Initial advance stored only on the booking (no separate ledger row)
                await axios.put(`/api/bookings/single/${booking._id}`, {
                    advancePaid: Math.max(0, (Number(booking.advancePaid) || 0) - (Number(editingEntry.amount) || 0))
                });
            }
            alert('Entry deleted successfully!');
            setEditingEntry(null);
            await fetchLedger();
            if (onEntryUpdated) onEntryUpdated();
        } catch (err) {
            console.error('Error deleting entry:', err);
            alert(err.response?.data?.message || 'Failed to delete entry');
        } finally {
            setDeletingEdit(false);
        }
    };

    if (!booking) return null;

    const totalFare = Number(booking.totalAmount) || 0;
    const fuelAmt = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;

    // Prepare display rows
    let displayEntries = [...ledgerEntries];
    const recordedPaymentSum = displayEntries
        .filter(e => e.type === 'Advance' || e.type === 'Payment')
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalAdvancePaid = Number(booking.advancePaid) || 0;

    if (totalAdvancePaid > recordedPaymentSum) {
        const missingAdv = totalAdvancePaid - recordedPaymentSum;
        const initMode = booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : (booking.paymentMode || 'Cash'));
        displayEntries.unshift({
            date: booking.advanceDate || booking.createdAt || new Date(),
            type: 'Advance',
            amount: missingAdv,
            bankName: booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : ''),
            paymentMode: initMode,
            description: `Advance Received via ${initMode}`
        });
    } else if (booking.advancePayment && Number(booking.advancePayment) > 0 && !displayEntries.some(e => e.type === 'Advance')) {
        const advAmt = Number(booking.advancePayment);
        const initMode = booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : (booking.paymentMode || 'Cash'));
        displayEntries.unshift({
            date: booking.advanceDate || booking.createdAt || new Date(),
            type: 'Advance',
            amount: advAmt,
            bankName: booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : ''),
            paymentMode: initMode,
            description: `Advance Received via ${initMode}`
        });
    }
    const hasFuelEntry = displayEntries.some(e => e.type === 'Fuel');
    if (!hasFuelEntry && fuelAmt > 0) {
        displayEntries.push({
            date: booking.travelEndDate || booking.updatedAt || booking.createdAt || new Date(),
            type: 'Fuel',
            amount: fuelAmt,
            description: 'Fuel Paid by Guest (Deducted)'
        });
    }

    // Strict chronological sort: Date ascending, then createdAt / timestamp ascending
    displayEntries.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        const dayA = new Date(a.date).setHours(0, 0, 0, 0);
        const dayB = new Date(b.date).setHours(0, 0, 0, 0);
        if (dayA !== dayB) return dayA - dayB;

        if (da !== db && (da % 86400000 !== 0 || db % 86400000 !== 0)) {
            return da - db;
        }
        const ca = new Date(a.createdAt || a.date).getTime();
        const cb = new Date(b.createdAt || b.date).getTime();
        if (ca !== cb) return ca - cb;

        if (a.type === 'Advance' && b.type !== 'Advance') return -1;
        if (b.type === 'Advance' && a.type !== 'Advance') return 1;
        return 0;
    });

    const totalCredits = displayEntries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const effectivePaid = Math.max(totalAdvancePaid + fuelAmt, totalCredits);
    const balanceDue = Math.max(0, totalFare - totalCredits);
    const isPaidFull = balanceDue <= 0;

    // Auto-heal discrepancy between Client Ledger and Booking document in MongoDB
    useEffect(() => {
        if (!booking?._id || loading || isEventBooking) return;
        const dbBal = Number(booking.balanceDue);
        if (!isNaN(dbBal) && (dbBal !== balanceDue || (isPaidFull && booking.paymentStatus !== 'Full Received'))) {
            axios.put(`/api/bookings/single/${booking._id}`, {
                balanceDue: balanceDue,
                paymentStatus: isPaidFull ? 'Full Received' : (effectivePaid > 0 ? 'Partial' : 'Pending')
            }).then(() => {
                if (onEntryUpdated) onEntryUpdated();
            }).catch(e => console.error('Silent booking ledger sync error:', e));
        }
    }, [booking?._id, balanceDue, isPaidFull, loading, isEventBooking]);

    const firstTxDate = displayEntries.length > 0 ? new Date(displayEntries[0].date) : null;
    const bkgCreated = booking.createdAt ? new Date(booking.createdAt) : null;
    const bkgDate = booking.bookingDate ? new Date(booking.bookingDate) : null;
    const bkgAdv = booking.advanceDate ? new Date(booking.advanceDate) : null;
    const candidateDates = [firstTxDate, bkgCreated, bkgDate, bkgAdv].filter(Boolean);
    const earliestDate = candidateDates.length > 0 ? new Date(Math.min(...candidateDates.map(d => d.getTime()))) : new Date();
    const createdDate = earliestDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const sDate = booking.tripStartFormatted || (booking.travelStartDate ? new Date(booking.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');
    const eDate = booking.tripEndFormatted || (booking.travelEndDate ? new Date(booking.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');

    const handleDownloadPdf = () => {
        let runBal = totalFare;
        const pdfRows = [
            {
                date: createdDate,
                particulars: isEventBooking
                    ? `Event Duty Fare (${booking.eventName || 'Event'})`
                    : `Tour Package Booking Fare (${sDate} to ${eDate})`,
                fare: totalFare,
                paid: null,
                balance: totalFare,
                mode: isEventBooking ? 'Event Duty' : 'Booking Confirmed'
            }
        ];

        displayEntries.forEach(entry => {
            const amt = Number(entry.amount) || 0;
            runBal -= amt;
            const isFuel = entry.type === 'Fuel';
            const isAdv = entry.type === 'Advance';
            pdfRows.push({
                date: new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
                particulars: isFuel ? 'Fuel Paid by Guest (Deducted)' : (isAdv ? 'Advance Payment Received' : 'Payment Received'),
                fare: null,
                paid: amt,
                balance: Math.max(0, runBal),
                mode: resolveEntryModeName(entry)
            });
        });

        generateClientLedgerPDF(booking, pdfRows, selectedCompany);
    };

    return (
        <AnimatePresence>
            <motion.div key="client-ledger-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 999998 }} />
            <motion.aside key="client-ledger-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '640px', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 999999, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '10px', borderRadius: '10px', color: '#60a5fa' }}><FileText size={20} /></div>
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Client Ledger & Payment Statement</h2>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                Track package fare, payments received & pending balance.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                {/* Scrollable Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {/* Top Stats Overview Card */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: isEventBooking ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isEventBooking ? '#c084fc' : '#60a5fa', padding: '7px', borderRadius: '8px' }}><Car size={16} /></div>
                                <div>
                                    <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{booking.vehicleType || 'Standard Vehicle'}{isEventBooking && booking.vehicleNumber ? ` (${booking.vehicleNumber})` : ''}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><span>{isEventBooking ? `🎉 Event Duty • ${booking.eventName || 'Event'}` : 'Client Booking & Trip Details'}</span><button type="button" onClick={() => setShowTripModal(true)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '0 2px', display: 'inline-flex', alignItems: 'center' }} title={isEventBooking ? 'View Event Duty Details' : 'View Guest Trip Itinerary'}><Eye size={13} /></button></div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: 'white', fontWeight: '700' }}>
                                {isEventBooking ? 'Guest:' : 'Client:'} <span style={{ color: isEventBooking ? '#c084fc' : '#60a5fa' }}>{booking.clientName}</span>
                                <button
                                    type="button"
                                    onClick={handleOpenFullEditBooking}
                                    disabled={loadingFullEdit}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginLeft: '8px',
                                        padding: '4px 9px',
                                        borderRadius: '8px',
                                        background: isEventBooking ? 'rgba(168, 85, 247, 0.18)' : 'rgba(251, 191, 36, 0.15)',
                                        border: isEventBooking ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(251, 191, 36, 0.4)',
                                        color: isEventBooking ? '#d8b4fe' : '#fbbf24',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                    title={isEventBooking ? 'Edit Event Duty Details & Fare' : 'Edit Booking & Tour Package Details'}
                                >
                                    <span>{loadingFullEdit ? 'Loading...' : (isEventBooking ? 'Edit Event Duty' : 'Edit Guest')}</span>
                                </button>
                                <button type="button" onClick={() => setShowTripModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '10px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 8px rgba(56, 189, 248, 0.2)', transition: 'all 0.15s ease' }} title={isEventBooking ? 'View Event Duty Schedule' : 'View Guest Trip Itinerary & Duty Schedule'}><Eye size={14} /><span>{isEventBooking ? 'View Duty' : 'View Trip'}</span></button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip Start</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{sDate || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip End</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{eDate || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Package Price</div>
                                <div style={{ fontSize: '14px', color: 'white', fontWeight: '800' }}>₹{totalFare.toLocaleString('en-IN')}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Total Received</div>
                                <div style={{ fontSize: '20px', color: '#10b981', fontWeight: '900' }}>₹{effectivePaid.toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Balance Due</div>
                                <div style={{ fontSize: '20px', color: isPaidFull ? '#10b981' : '#f59e0b', fontWeight: '900' }}>₹{balanceDue.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Payment Status</div>
                                <div style={{ 
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                    padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap',
                                    background: isPaidFull ? 'rgba(16, 185, 129, 0.2)' : effectivePaid > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: isPaidFull ? '#34d399' : effectivePaid > 0 ? '#fbbf24' : '#f87171',
                                    border: isPaidFull ? '1px solid rgba(16, 185, 129, 0.4)' : effectivePaid > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                                }}>
                                    {isPaidFull ? <><CheckCircle size={13} /> Paid</> : effectivePaid > 0 ? `Part Paid (₹${balanceDue.toLocaleString('en-IN')} Due)` : 'Payment Due'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Statement Table Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '7px', borderRadius: '8px', color: 'rgba(255,255,255,0.7)' }}><FileText size={16} /></div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '800' }}>Billing & Payment Statement</h3>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Itemized breakdown of package charges and received payments.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Statement Table */}
                    <div style={{ width: '100%', overflowX: 'auto', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Date</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Particulars / Description</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'right' }}>Package Fare (₹)</th>
                                    <th style={{ padding: '12px 10px', color: '#34d399', fontWeight: '700', textAlign: 'right' }}>Paid / Received (₹)</th>
                                    <th style={{ padding: '12px 10px', color: '#fbbf24', fontWeight: '700', textAlign: 'right' }}>Balance Due (₹)</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'center' }}>Payment Mode</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Row 1: Tour Package Booking Fare / Event Duty Fare */}
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                                    <td style={{ padding: '12px 10px', color: 'white', whiteSpace: 'nowrap' }}>{createdDate}</td>
                                    <td style={{ padding: '12px 10px' }}>
                                        <div style={{ color: 'white', fontWeight: '700' }}>
                                            {isEventBooking ? `Event Duty Fare (${booking.eventName || 'Event'})` : 'Tour Package Booking Fare'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 10px', color: 'white', fontWeight: '700', textAlign: 'right' }}>₹{totalFare.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>—</td>
                                    <td style={{ padding: '12px 10px', color: 'white', fontWeight: '700', textAlign: 'right' }}>₹{totalFare.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: isEventBooking ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isEventBooking ? '#d8b4fe' : '#60a5fa', fontSize: '11px', fontWeight: '700' }}>
                                            {isEventBooking ? 'Event Duty' : 'Booking Confirmed'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                        <button
                                                type="button"
                                                onClick={isEventBooking ? handleOpenFullEditBooking : (onEditBooking || handleOpenFullEditBooking)}
                                                title={isEventBooking ? 'Edit Event Duty Details & Fare' : 'Edit Tour Package Booking Details & Fare'}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: 'rgba(167, 139, 250, 0.15)',
                                                    border: '1px solid rgba(167, 139, 250, 0.35)',
                                                    borderRadius: '6px',
                                                    color: '#c4b5fd',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Edit size={12} />
                                                <span>Edit</span>
                                            </button>
                                    </td>
                                </tr>

                                {/* Subsequent Rows */}
                                {(() => {
                                    let runBal = totalFare;
                                    if (loading) {
                                        return <tr><td colSpan="7" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>;
                                    }
                                    if (displayEntries.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="7" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                                    No payments recorded yet.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return displayEntries.map((entry, idx) => {
                                        const amt = Number(entry.amount) || 0;
                                        runBal -= amt;
                                        const isFuel = entry.type === 'Fuel';
                                        const isAdv = entry.type === 'Advance';
                                        const modeName = resolveEntryModeName(entry);

                                        return (
                                            <tr key={entry._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isFuel ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                                                <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                                                    {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '12px 10px' }}>
                                                    {isFuel ? (
                                                        <div>
                                                            <div style={{ color: '#fbbf24', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <Fuel size={13} color="#fbbf24" />
                                                                <span>Fuel Paid by Guest</span>
                                                            </div>
                                                            {(() => {
                                                                const rawDesc = entry.description || '';
                                                                const cleanDesc = rawDesc
                                                                    .replace(/^Fuel paid by guest\s*/i, '')
                                                                    .replace(/deducted from booking balance/i, '')
                                                                    .replace(/[()]/g, '')
                                                                    .trim();
                                                                return cleanDesc ? (
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
                                                                        {cleanDesc}
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#34d399', fontWeight: '700' }}>
                                                                {isAdv ? 'Advance Payment Received' : 'Payment Received'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>—</td>
                                                <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: '800', textAlign: 'right' }}>
                                                    + ₹{amt.toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 10px', color: Math.max(0, runBal) === 0 ? '#10b981' : '#fbbf24', fontWeight: '800', textAlign: 'right' }}>
                                                    ₹{Math.max(0, runBal).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: '3px 8px', borderRadius: '6px', 
                                                        background: isFuel ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.15)', 
                                                        color: isFuel ? '#fbbf24' : '#6ee7b7', 
                                                        fontSize: '11px', fontWeight: '700' 
                                                    }}>
                                                        {modeName}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditPayment(entry)}
                                                        title="Edit this entry"
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: 'rgba(56, 189, 248, 0.15)',
                                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                                            borderRadius: '6px',
                                                            color: '#38bdf8',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Edit size={12} />
                                                        <span>Edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {onAddEntry && !isPaidFull && (
                            <button onClick={onAddEntry} style={{ flex: 1, minWidth: '150px', padding: '12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Plus size={16} /> Record Payment
                            </button>
                        )}
                        {onEditBooking && (
                            <button onClick={onEditBooking} style={{ flex: 1, minWidth: '140px', padding: '12px', background: 'rgba(167, 139, 250, 0.14)', border: '1px solid rgba(167, 139, 250, 0.35)', color: '#c4b5fd', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Edit size={15} /> Edit Booking
                            </button>
                        )}
                        <button onClick={handleDownloadPdf} style={{ flex: 1, minWidth: '150px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Download size={16} /> Download Ledger PDF
                        </button>
                    </div>
                </div>

                {/* EDIT PAYMENT ENTRY MODAL */}
                <AnimatePresence>
                    {editingEntry && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000000, padding: '20px' }}>
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '460px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '8px', borderRadius: '8px' }}>
                                            <Edit size={16} />
                                        </div>
                                        <div>
                                            <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '800' }}>
                                                Edit {editingEntry.type === 'Fuel' ? 'Guest Fuel Entry' : (editingEntry.type === 'Advance' ? 'Advance Payment' : 'Payment Entry')}
                                            </h3>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                Client: {booking.clientName}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setEditingEntry(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}><X size={18} /></button>
                                </div>

                                <form onSubmit={handleSaveEditEntry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={editAmount}
                                            onChange={e => setEditAmount(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#10b981', outline: 'none', fontSize: '16px', fontWeight: '800', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Payment Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            onClick={e => e.target.showPicker?.()}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer', colorScheme: 'dark' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Payment Mode</label>
                                        <select
                                            value={editMode}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditMode(val);
                                                const matchedBank = bankAccounts.find(b => b.bankName === val);
                                                if (matchedBank) setEditBankAccountId(matchedBank._id);
                                            }}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: '#0b1120', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            {editingEntry.type === 'Fuel' && (
                                                <option value="Fuel (Guest)">⛽ Fuel Paid by Guest (Deducted from Balance)</option>
                                            )}
                                            <option value="Cash to Company">💵 Cash to Company (Cash Book)</option>
                                            {bankAccounts.map(b => (
                                                <option key={b._id} value={b.bankName}>
                                                    🏦 {b.bankName} - {b.accountNumber} ({b.accountHolderName})
                                                </option>
                                            ))}
                                            <option value="UPI / QR Code">📱 UPI / QR Code (General)</option>
                                            <option value="Bank Transfer / NEFT">🏛 Bank Transfer / NEFT (General)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Reference / UTR / Note (Optional)</label>
                                        <input
                                            type="text"
                                            value={editReference}
                                            onChange={e => setEditReference(e.target.value)}
                                            placeholder="UTR or transaction note"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
                                        {(editingEntry._id || booking?._id) && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteEntry}
                                                disabled={deletingEdit || savingEdit}
                                                style={{
                                                    padding: '10px 14px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    color: '#f87171',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    fontSize: '12px',
                                                    fontWeight: '700'
                                                }}
                                                title="Delete this ledger entry"
                                            >
                                                <Trash2 size={14} />
                                                <span>{deletingEdit ? 'Deleting...' : 'Delete'}</span>
                                            </button>
                                        )}
                                        <div style={{ flex: 1 }} />
                                        <button
                                            type="button"
                                            onClick={() => setEditingEntry(null)}
                                            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingEdit}
                                            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }}
                                        >
                                            {savingEdit ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                {/* GUEST TRIP BREAKDOWN MODAL MATCHING IMAGE 2 */}
                <AnimatePresence>
                    {showTripModal && (
                        <motion.div
                            key="guest-trip-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTripModal(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(5px)',
                                zIndex: 1000001,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px'
                            }}
                        >
                            <motion.div
                                key="guest-trip-modal-container"
                                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: '#0d131f',
                                    border: '1px solid #334155',
                                    borderRadius: '16px',
                                    width: '100%',
                                    maxWidth: '960px',
                                    maxHeight: '90vh',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
                                }}
                            >
                                {/* Modal Header */}
                                <div style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255, 255, 255, 0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '8px', borderRadius: '10px' }}>
                                            <Eye size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '16px', fontWeight: '800' }}>
                                                Guest Trip Itinerary & Duty Schedule
                                            </h3>
                                            <div style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                                                Guest: <strong style={{ color: '#ffffff' }}>{booking.clientName}</strong>
                                                {booking.mobileNumber ? ` • 📞 ${booking.mobileNumber}` : ''}
                                                {booking.bookingId || booking.bookingCode ? ` • Booking #${booking.bookingCode || booking.bookingId}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowTripModal(false)}
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Body / Table */}
                                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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
                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#38bdf8' }}>
                                                    🚗 {tripDuties[0]?.vehicle?.carNumber || tripDuties[0]?.customCarNumber || booking.vehicleType || 'Standard Vehicle'}
                                                </div>
                                            </div>
                                            <div style={{ width: '1px', height: '26px', background: 'rgba(255, 255, 255, 0.1)' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Driver</div>
                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#fbbf24' }}>
                                                    👨‍✈️ {tripDuties.find(d => d.driver?.name || d.customDriverName)?.driver?.name || tripDuties.find(d => d.customDriverName)?.customDriverName || 'To Be Assigned'}
                                                </div>
                                            </div>
                                            {(booking.bookingId || booking.bookingCode) && (
                                                <>
                                                    <div style={{ width: '1px', height: '26px', background: 'rgba(255, 255, 255, 0.1)' }} />
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Booking ID</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#e2e8f0' }}>
                                                            #{booking.bookingCode || booking.bookingId}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                            PACKAGE ({tripDuties.length} DAYS • TOTAL ₹{totalFare.toLocaleString('en-IN')})
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
                                                        ₹{totalFare.toLocaleString('en-IN')}
                                                    </th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>C/Out</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loadingTripDuties ? (
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                            Loading trip details...
                                                        </td>
                                                    </tr>
                                                ) : tripDuties.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                            No trip duties found for this booking.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    tripDuties.map((duty, idx) => {
                                                        const isSelectedRow = selectedDutyRowIdx === idx;
                                                        const dateDisplay = formatDayMonth(duty.date);
                                                        const dayNumber = duty.dayNo || (idx + 1);
                                                        const fare = Number(duty.revenue || duty.amount || duty.totalAmount || 0);
                                                        const hotelName = duty.hotel || duty.pickupPoint || booking.hotel || booking.source || 'Direct';

                                                        return (
                                                            <tr
                                                                key={duty._id || idx}
                                                                onClick={() => setSelectedDutyRowIdx(isSelectedRow ? null : idx)}
                                                                style={{
                                                                    background: isSelectedRow ? 'rgba(56, 189, 248, 0.22)' : (idx % 2 === 0 ? '#1e293b' : '#172033'),
                                                                    borderBottom: '1px solid #334155',
                                                                    borderLeft: isSelectedRow ? '4px solid #38bdf8' : '4px solid transparent',
                                                                    cursor: 'pointer',
                                                                    transition: 'background 0.15s ease'
                                                                }}
                                                            >
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', textAlign: 'center', fontWeight: '900', color: isSelectedRow ? '#38bdf8' : '#ffffff' }}>
                                                                    {dateDisplay}
                                                                </td>
                                                                <td style={{ padding: '10px 10px', borderRight: '1px solid #334155', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: isSelectedRow ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                                                                        color: isSelectedRow ? '#000000' : '#cbd5e1',
                                                                        fontWeight: '800',
                                                                        fontSize: '11.5px'
                                                                    }}>
                                                                        Day {dayNumber}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', color: '#cbd5e1' }}>
                                                                    {hotelName}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', fontWeight: '800', color: '#ffffff' }}>
                                                                    {duty.clientName || booking.clientName || 'Guest'}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', borderRight: '1px solid #334155', color: '#38bdf8', fontWeight: '700' }}>
                                                                    {duty.mobileNumber || booking.mobileNumber || '-'}
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
                                                                    {duty.duty || duty.description || duty.itinerary || 'Regular Duty'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', borderRight: '1px solid #334155', textAlign: 'right', fontWeight: '900', color: '#4ade80' }}>
                                                                    ₹{fare.toLocaleString('en-IN')}
                                                                </td>
                                                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8' }}>
                                                                    {duty.cOut || duty.checkOut || (duty.status === 'Completed' ? '✓' : '-')}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div style={{
                                    padding: '14px 22px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowTripModal(false)}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#ffffff',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowTripModal(false);
                                            setShowAssignDriverModal(true);
                                        }}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            border: 'none',
                                            color: '#000000',
                                            fontWeight: '900',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                        }}
                                        title="Assign Driver & Vehicle directly"
                                    >
                                        <Car size={15} />
                                        <span>Assignment</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const startDate = booking.travelStartDate ? new Date(booking.travelStartDate).toISOString().split('T')[0] : '';
                                            const url = startDate ? `/admin/drs?date=${startDate}` : '/admin/drs';
                                            window.location.href = url;
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
                                            gap: '6px',
                                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                        <span>View in Live DRS</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ASSIGN DRIVER MODAL */}
                {showAssignDriverModal && (
                    <AssignDriverModal
                        isOpen={showAssignDriverModal}
                        onClose={() => {
                            setShowAssignDriverModal(false);
                            setShowTripModal(true);
                        }}
                        booking={booking}
                        companyId={selectedCompany?._id || (typeof booking?.company === 'object' ? booking?.company?._id : booking?.company)}
                        onSaved={() => {
                            setShowAssignDriverModal(false);
                            loadTripDuties();
                            setShowTripModal(true);
                            fetchLedger();
                            if (onEntryUpdated) onEntryUpdated();
                        }}
                    />
                )}
                {/* Modal: Edit Guest Details (Only for normal bookings/leads) */}
                {showFullEditModal && bookingForFullEdit && !isEventBooking && (
                    <EditBookingModal
                        key={`full-edit-${bookingForFullEdit._id}`}
                        booking={bookingForFullEdit}
                        onClose={() => {
                            setShowFullEditModal(false);
                            setBookingForFullEdit(null);
                        }}
                        onSuccess={() => {
                            setShowFullEditModal(false);
                            setBookingForFullEdit(null);
                            fetchLedger();
                            if (onEntryUpdated) onEntryUpdated();
                        }}
                    />
                )}

                {/* Modal: Dedicated Edit Event Duty Modal (for Event duties — does NOT navigate to Lead form) */}
                {showEventEditModal && eventEditForm && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000010,
                            padding: '16px'
                        }}
                        onClick={() => setShowEventEditModal(false)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '560px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: '#0b1120',
                                border: '1px solid rgba(168, 85, 247, 0.35)',
                                borderRadius: '18px',
                                padding: '22px',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.75)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                        🎉 {eventEditForm.eventName || 'Event Duty'}
                                    </div>
                                    <h3 style={{ margin: '2px 0 0', color: 'white', fontSize: '18px', fontWeight: '900' }}>
                                        Edit Event Duty Details
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEventEditModal(false)}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', width: '32px', height: '32px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEventEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {eventEditForm._id && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {['Fleet', 'External'].map(src => (
                                            <button
                                                key={src}
                                                type="button"
                                                onClick={() => setEventEditForm(prev => ({ ...prev, vehicleSource: src }))}
                                                style={{
                                                    flex: 1,
                                                    padding: '9px',
                                                    borderRadius: '10px',
                                                    border: eventEditForm.vehicleSource === src ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                                                    background: eventEditForm.vehicleSource === src ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                                                    color: eventEditForm.vehicleSource === src ? '#e9d5ff' : 'rgba(255,255,255,0.5)',
                                                    fontWeight: '800',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {src === 'Fleet' ? '🏢 Own Fleet Car' : '🚕 Outside / External Car'}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Guest Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={eventEditForm.guestName}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, guestName: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Duty Fare / Amount (₹) *</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={eventEditForm.dutyAmount}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, dutyAmount: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#34d399', fontWeight: '800', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Duty Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={eventEditForm.date}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, date: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    {eventEditForm._id && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Duty Time</label>
                                            <input
                                                type="text"
                                                value={eventEditForm.dutyTime}
                                                onChange={e => setEventEditForm(prev => ({ ...prev, dutyTime: e.target.value }))}
                                                placeholder="e.g. 09:00 AM"
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {eventEditForm._id && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Vehicle Number *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={eventEditForm.carNumber}
                                                    onChange={e => setEventEditForm(prev => ({ ...prev, carNumber: e.target.value.toUpperCase() }))}
                                                    placeholder="e.g. RJ27TA1234"
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Car Model</label>
                                                <input
                                                    type="text"
                                                    value={eventEditForm.model}
                                                    onChange={e => setEventEditForm(prev => ({ ...prev, model: e.target.value }))}
                                                    placeholder="e.g. Crysta / Dzire"
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Driver Name</label>
                                                <input
                                                    type="text"
                                                    value={eventEditForm.driverName}
                                                    onChange={e => setEventEditForm(prev => ({ ...prev, driverName: e.target.value }))}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Duty Type / Route</label>
                                                <input
                                                    type="text"
                                                    value={eventEditForm.dutyType}
                                                    onChange={e => setEventEditForm(prev => ({ ...prev, dutyType: e.target.value }))}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: eventEditForm._id && eventEditForm.vehicleSource === 'External' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Hotel / Venue / Drop Location</label>
                                        <input
                                            type="text"
                                            value={eventEditForm.dropLocation}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, dropLocation: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    {eventEditForm._id && eventEditForm.vehicleSource === 'External' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Vendor / Owner Name</label>
                                            <input
                                                type="text"
                                                value={eventEditForm.ownerName}
                                                onChange={e => setEventEditForm(prev => ({ ...prev, ownerName: e.target.value }))}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {eventEditForm._id && eventEditForm.vehicleSource === 'External' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Vendor Buy Cost (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={eventEditForm.buyAmount}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, buyAmount: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fbbf24', fontWeight: '700', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                )}

                                {eventEditForm._id && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '700' }}>Remarks</label>
                                        <textarea
                                            rows={2}
                                            value={eventEditForm.remarks}
                                            onChange={e => setEventEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowEventEditModal(false)}
                                        style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingEventEdit}
                                        style={{ padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.35)' }}
                                    >
                                        {savingEventEdit ? 'Saving...' : 'Save Event Duty'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </motion.aside>
        </AnimatePresence>
    );
}
