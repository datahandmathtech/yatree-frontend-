import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Save, Plus, Trash2, Calculator, TrendingUp, TrendingDown,
    Car, Calendar, Sparkles, Edit2, Check, Settings, Info, MapPin,
    User, Phone, Mail, FileText, ChevronDown, CheckCircle, Clock
} from 'lucide-react';
import axios from '../../api/axios';

const ALL_VEHICLES = [
    'Innova Crysta',
    'Sedan',
    'SUV',
    'Swift Dzire',
    'Ciaz',
    'Etios',
    'Honda City',
    'Ertiga',
    'Toyota Fortuner',
    'Innova Hycross',
    'Tempo Traveller',
    'Tempo Traveller (12 Seater)',
    'Tempo Traveller (17 Seater)',
    'Urbania',
    'BMW / Audi',
    'Hatchback',
    'Luxury'
];

const ALL_SOURCES = [
    'Website',
    'Google Ads',
    'WhatsApp',
    'Referral',
    'Repeat Client',
    'Travel Agent',
    'Phone Call',
    'Social Media',
    'Direct Walk-in',
    'Other'
];

const BOOKING_REFERENCES = ['Direct', 'Travel Agent'];

const toLocalDateString = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getDaysDifference = (s, e) => {
    if (!s || !e) return 1;
    const d1 = new Date(s);
    const d2 = new Date(e);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
};

const addDaysToDateString = (dateStr, days) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    return toLocalDateString(d);
};

export default function EditBookingModal({ booking, onClose, onSuccess }) {
    // Basic & Client details
    const [bookingReference, setBookingReference] = useState('Direct');
    const [travelAgentName, setTravelAgentName] = useState('');
    const [travelAgentMobile, setTravelAgentMobile] = useState('');
    const [clientName, setClientName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [alternateMobile, setAlternateMobile] = useState('');
    const [email, setEmail] = useState('');
    const [gstin, setGstin] = useState('');
    const [source, setSource] = useState('Website');
    const [reference, setReference] = useState('');
    const [salesPerson, setSalesPerson] = useState('');

    // Tour details
    const [vehicleType, setVehicleType] = useState('Innova Crysta');
    const [numberOfCars, setNumberOfCars] = useState(1);
    const [travelStartDate, setTravelStartDate] = useState('');
    const [travelEndDate, setTravelEndDate] = useState('');
    const [isBreakTour, setIsBreakTour] = useState(false);
    const [excludedDates, setExcludedDates] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [pickupPoint, setPickupPoint] = useState('');
    const [dropPoint, setDropPoint] = useState('');
    const [gstMode, setGstMode] = useState('GST Inclusive');
    const [gstRate, setGstRate] = useState(5);

    // Vehicle Matrix Inputs
    const [fuelType, setFuelType] = useState('Diesel');
    const [totalKmRun, setTotalKmRun] = useState('');
    const [vehicleAverage, setVehicleAverage] = useState('');
    const [fuelRate, setFuelRate] = useState('');
    const [driverSalary, setDriverSalary] = useState('');
    const [nightHold, setNightHold] = useState('');
    const [tollAndParking, setTollAndParking] = useState('');
    const [matrixGstAmount, setMatrixGstAmount] = useState('');
    const [targetPerDay, setTargetPerDay] = useState('2500');
    const [matrixSimSalePrice, setMatrixSimSalePrice] = useState('');

    // Day-wise Itinerary
    const [itinerary, setItinerary] = useState([]);

    // Remarks & Inclusions
    const [specialRemarks, setSpecialRemarks] = useState('');
    const [inclusions, setInclusions] = useState({
        driverAllowance: true,
        nightAllowance: true,
        tollParking: true,
        gstIncluded: true,
        manualRemarks: ''
    });

    const [saving, setSaving] = useState(false);

    const vehicleOptions = useMemo(() => {
        const set = new Set(ALL_VEHICLES);
        if (booking?.vehicleType) set.add(booking.vehicleType);
        if (vehicleType) set.add(vehicleType);
        if (Array.isArray(itinerary)) {
            itinerary.forEach(d => { if (d.vehicleType) set.add(d.vehicleType); });
        }
        return Array.from(set);
    }, [booking, vehicleType, itinerary]);

    useEffect(() => {
        if (booking) {
            setBookingReference(booking.bookingReference || 'Direct');
            setTravelAgentName(booking.travelAgentName || '');
            setTravelAgentMobile(booking.travelAgentMobile || '');
            setClientName(booking.clientName || booking.guestName || '');
            setMobileNumber(booking.mobileNumber || '');
            setAlternateMobile(booking.alternateMobile || '');
            setEmail(booking.email || '');
            setGstin(booking.gstin || '');
            setSource(booking.source || 'Website');
            setReference(booking.reference || '');
            setSalesPerson(booking.salesPerson || '');

            const initialVeh = booking.vehicleType || booking.itinerary?.[0]?.vehicleType || 'Innova Crysta';
            setVehicleType(initialVeh);
            setNumberOfCars(booking.numberOfCars || 1);
            setTravelStartDate(toLocalDateString(booking.travelStartDate));
            setTravelEndDate(toLocalDateString(booking.travelEndDate));
            const initExcl = Array.isArray(booking.excludedDates) ? booking.excludedDates : [];
            setExcludedDates(initExcl);
            setIsBreakTour(Boolean(booking.isBreakTour || initExcl.length > 0));
            setTotalAmount(Number(booking.totalAmount || booking.packagePrice) || 0);
            setPickupPoint(booking.pickupPoint || booking.pickupLocation || '');
            setDropPoint(booking.dropPoint || booking.dropLocation || '');
            setGstMode(booking.gstMode || 'GST Inclusive');
            setGstRate(booking.gstRate || 5);

            // Populate Matrix
            const matrix = booking.vehicleMatrix || {};
            setFuelType(matrix.fuelType || 'Diesel');
            setTotalKmRun(matrix.totalKmRun ? String(matrix.totalKmRun) : '');
            setVehicleAverage(matrix.vehicleAverage ? String(matrix.vehicleAverage) : '');
            setFuelRate(matrix.fuelRate ? String(matrix.fuelRate) : '');
            setDriverSalary(matrix.driverSalary ? String(matrix.driverSalary) : '');
            setNightHold(matrix.nightHold ? String(matrix.nightHold) : '');
            setTollAndParking(matrix.tollAndParking ? String(matrix.tollAndParking) : '');
            setMatrixGstAmount(matrix.gstAmount ? String(matrix.gstAmount) : '');
            setTargetPerDay(matrix.targetPerDay ? String(matrix.targetPerDay) : '2500');

            // Populate Itinerary
            if (Array.isArray(booking.itinerary) && booking.itinerary.length > 0) {
                setItinerary(booking.itinerary.map((d, i) => ({
                    dayNo: d.dayNo || (i + 1),
                    date: toLocalDateString(d.date),
                    time: d.time || '09:00 AM',
                    isApg: d.isApg || d.time === 'APG',
                    duty: d.duty || d.description || (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                    description: d.duty || d.description || (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                    vehicleType: d.vehicleType || initialVeh,
                    vehicleCount: d.vehicleCount || booking.numberOfCars || 1,
                    quantity: d.quantity || d.vehicleCount || booking.numberOfCars || 1,
                    rate: d.rate !== undefined ? d.rate : 0,
                    amount: d.amount !== undefined ? d.amount : 0,
                    pickupPoint: d.pickupPoint || '',
                    vehicleNumber: d.vehicleNumber || '',
                    driverName: d.driverName || '',
                    driverPhone: d.driverPhone || ''
                })));
            } else {
                const sDate = toLocalDateString(booking.travelStartDate);
                const eDate = toLocalDateString(booking.travelEndDate);
                const days = getDaysDifference(sDate, eDate);
                const daysArr = [];
                for (let i = 0; i < days; i++) {
                    daysArr.push({
                        dayNo: i + 1,
                        date: sDate ? addDaysToDateString(sDate, i) : toLocalDateString(new Date()),
                        time: i === 0 ? '09:00 AM' : '10:00 AM',
                        isApg: false,
                        duty: i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                        description: i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                        vehicleType: booking.vehicleType || 'Innova Crysta',
                        vehicleCount: booking.numberOfCars || 1,
                        quantity: booking.numberOfCars || 1,
                        rate: 0,
                        amount: 0,
                        pickupPoint: '',
                        vehicleNumber: '',
                        driverName: '',
                        driverPhone: ''
                    });
                }
                setItinerary(daysArr);
            }

            // Populate Remarks & Inclusions
            setSpecialRemarks(booking.specialRemarks || booking.notes || '');
            if (booking.inclusions) {
                setInclusions({
                    driverAllowance: booking.inclusions.driverAllowance !== false,
                    nightAllowance: booking.inclusions.nightAllowance !== false,
                    tollParking: booking.inclusions.tollParking !== false,
                    gstIncluded: booking.inclusions.gstIncluded !== false,
                    manualRemarks: booking.inclusions.manualRemarks || ''
                });
            }
        }
    }, [booking]);

    // All tour calendar dates & Break Tour active days
    const allTourDates = useMemo(() => {
        if (!travelStartDate) return [];
        const s = toLocalDateString(travelStartDate);
        const e = toLocalDateString(travelEndDate || travelStartDate);
        if (!s) return [];
        const total = Math.min(90, getDaysDifference(s, e));
        const arr = [];
        for (let i = 0; i < total; i++) {
            arr.push(addDaysToDateString(s, i));
        }
        return arr;
    }, [travelStartDate, travelEndDate]);

    const validExcludedDates = useMemo(() => {
        if (!Array.isArray(excludedDates)) return [];
        const set = new Set(allTourDates);
        return excludedDates.filter(d => set.has(d));
    }, [excludedDates, allTourDates]);

    const totalStayDays = Math.max(1, allTourDates.length);
    const activeCarDays = Math.max(1, totalStayDays - validExcludedDates.length);

    // Cost Matrix Calculations (uses activeCarDays when Break Tour is active)
    const numDays = activeCarDays;
    const kmVal = parseFloat(totalKmRun) || 0;
    const avgVal = parseFloat(vehicleAverage) || 0;
    const rateVal = parseFloat(fuelRate) || 0;
    const fuelCost = avgVal > 0 ? (kmVal / avgVal) * rateVal : 0;
    const driverSalaryVal = parseFloat(driverSalary) || 0;
    const nightHoldVal = parseFloat(nightHold) || 0;
    const tollVal = parseFloat(tollAndParking) || 0;
    const gstVal = parseFloat(matrixGstAmount) || 0;
    const targetPerDayVal = parseFloat(targetPerDay) || 2500;
    const totalTargetProfit = targetPerDayVal * numDays;

    const totalCost = fuelCost + driverSalaryVal + nightHoldVal + tollVal + gstVal;
    const recommendedSaleFare = totalCost + totalTargetProfit;
    const currentPkg = parseFloat(totalAmount) || 0;
    const totalProfit = currentPkg - totalCost;
    const perDayProfit = numDays > 0 ? totalProfit / numDays : 0;
    const marginPercent = currentPkg > 0 ? Math.round((totalProfit / currentPkg) * 100) : 0;

    // Simulation price calculation
    const matrixSimPriceVal = parseFloat(matrixSimSalePrice) || 0;
    const simNetProfit = matrixSimPriceVal > 0 ? matrixSimPriceVal - totalCost : 0;
    const simPerDayProfit = (matrixSimPriceVal > 0 && numDays > 0) ? simNetProfit / numDays : 0;

    const toggleBreakTourDate = (dateStr) => {
        const isExcl = excludedDates.includes(dateStr);
        let nextExcl;
        if (isExcl) {
            nextExcl = excludedDates.filter(d => d !== dateStr);
        } else {
            const activeAfter = allTourDates.filter(d => !excludedDates.includes(d) && d !== dateStr).length;
            if (activeAfter < 1) {
                alert('At least 1 active car usage day is required!');
                return;
            }
            nextExcl = [...excludedDates, dateStr].sort();
        }
        setExcludedDates(nextExcl);
        if (nextExcl.length > 0) setIsBreakTour(true);

        // Keep itinerary synced
        if (!isExcl) {
            setItinerary(prev => prev
                .filter(it => toLocalDateString(it.date) !== dateStr)
                .map((it, idx) => ({ ...it, dayNo: idx + 1 }))
            );
        } else {
            setItinerary(prev => {
                if (prev.some(it => toLocalDateString(it.date) === dateStr)) return prev;
                const newRow = {
                    dayNo: 1,
                    date: dateStr,
                    time: '09:00 AM',
                    isApg: false,
                    pickupPoint: '',
                    duty: 'City Tour / Transfer',
                    description: 'City Tour / Transfer',
                    vehicleType: vehicleType || 'Innova Crysta',
                    vehicleCount: numberOfCars || 1,
                    quantity: numberOfCars || 1,
                    rate: 0,
                    amount: 0,
                    vehicleNumber: '',
                    driverName: '',
                    driverPhone: ''
                };
                return [...prev, newRow]
                    .sort((a, b) => toLocalDateString(a.date).localeCompare(toLocalDateString(b.date)))
                    .map((it, idx) => ({ ...it, dayNo: idx + 1 }));
            });
        }
    };

    // Travel Date Change handler
    const handleTravelDateChange = (field, value) => {
        let sDate = field === 'travelStartDate' ? value : travelStartDate;
        let eDate = field === 'travelEndDate' ? value : travelEndDate;

        if (field === 'travelStartDate') {
            setTravelStartDate(value);
            if (!eDate || eDate < value) {
                eDate = value;
                setTravelEndDate(value);
            }
        } else {
            setTravelEndDate(value);
            if (!sDate || value < sDate) {
                sDate = value;
                setTravelStartDate(value);
            }
        }

        if (sDate && eDate) {
            const daysCount = getDaysDifference(sDate, eDate);
            const newItinerary = [];
            for (let i = 0; i < daysCount; i++) {
                const dateStr = addDaysToDateString(sDate, i);
                if (excludedDates.includes(dateStr)) continue;
                const existing = itinerary[newItinerary.length];
                const isApg = existing ? existing.isApg : false;
                const r = existing ? (Number(existing.rate) || 0) : 0;
                const q = existing ? (Number(existing.quantity || existing.vehicleCount) || numberOfCars || 1) : (numberOfCars || 1);

                newItinerary.push({
                    dayNo: newItinerary.length + 1,
                    date: dateStr,
                    time: existing?.time || (isApg ? 'APG' : (newItinerary.length === 0 ? '09:00 AM' : '10:00 AM')),
                    isApg: isApg,
                    duty: existing?.duty || (newItinerary.length === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                    description: existing?.description || existing?.duty || (newItinerary.length === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                    vehicleType: existing?.vehicleType || vehicleType,
                    vehicleCount: q,
                    quantity: q,
                    rate: r,
                    amount: existing ? (Number(existing.amount) || (q * r)) : (q * r),
                    pickupPoint: existing?.pickupPoint || '',
                    vehicleNumber: existing?.vehicleNumber || '',
                    driverName: existing?.driverName || '',
                    driverPhone: existing?.driverPhone || ''
                });
            }
            setItinerary(newItinerary);
            const total = newItinerary.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
            if (total > 0) {
                setTotalAmount(total);
            }
        }
    };

    // Itinerary Row Change handler
    const handleItineraryRowChange = (index, field, value) => {
        const updated = [...itinerary];
        const row = { ...updated[index] };

        if (field === 'isApg') {
            row.isApg = value;
            if (value) {
                row.time = 'APG';
            } else if (row.time === 'APG') {
                row.time = '09:00 AM';
            }
        } else if (field === 'rate' || field === 'quantity') {
            const qty = field === 'quantity'
                ? (value === '' ? '' : Math.max(1, parseInt(value) || 1))
                : (row.quantity === '' ? 1 : (Number(row.quantity || row.vehicleCount) || 1));
            const rate = field === 'rate'
                ? (value === '' ? '' : Math.max(0, parseFloat(value) || 0))
                : (row.rate === '' ? 0 : (Number(row.rate) || 0));
            row.rate = rate;
            row.quantity = qty;
            row.vehicleCount = qty === '' ? 1 : qty;
            const numericQty = qty === '' ? 1 : Number(qty);
            const numericRate = rate === '' ? 0 : Number(rate);
            row.amount = numericQty * numericRate;
        } else if (field === 'amount') {
            row.amount = value === '' ? '' : (Number(value) || 0);
            const qty = Number(row.quantity || row.vehicleCount) || 1;
            if (qty === 1 && row.amount !== '') {
                row.rate = Number(row.amount);
            }
        } else if (field === 'vehicleType') {
            row.vehicleType = value;
        } else if (field === 'duty') {
            row.duty = value;
            row.description = value;
        } else {
            row[field] = value;
        }

        updated[index] = row;
        setItinerary(updated);
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || Number(curr.rate) || 0), 0);
        if (total > 0) {
            setTotalAmount(total);
        }
    };

    const addAnotherDay = () => {
        let nextDate = '';
        const len = itinerary.length;
        if (len > 0 && itinerary[len - 1].date) {
            nextDate = addDaysToDateString(toLocalDateString(itinerary[len - 1].date), 1);
        } else if (travelStartDate) {
            nextDate = addDaysToDateString(travelStartDate, len);
        } else {
            nextDate = toLocalDateString(new Date());
        }

        const newDay = {
            dayNo: len + 1,
            date: nextDate,
            time: '09:00 AM',
            isApg: false,
            pickupPoint: '',
            duty: 'City Tour / Transfer',
            description: 'City Tour / Transfer',
            vehicleType: vehicleType,
            vehicleCount: numberOfCars || 1,
            quantity: numberOfCars || 1,
            rate: 0,
            amount: 0,
            vehicleNumber: '',
            driverName: '',
            driverPhone: ''
        };

        const updated = [...itinerary, newDay];
        setItinerary(updated);
        setTravelEndDate(nextDate);
    };

    const removeItineraryDay = (index) => {
        if (itinerary.length <= 1) return;
        const updated = itinerary
            .filter((_, i) => i !== index)
            .map((day, i) => ({ ...day, dayNo: i + 1 }));
        setItinerary(updated);
        if (updated.length > 0 && updated[updated.length - 1].date) {
            setTravelEndDate(toLocalDateString(updated[updated.length - 1].date));
        }
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        if (total > 0) {
            setTotalAmount(total);
        }
    };

    const handleInclusionToggle = (key) => {
        setInclusions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const calculatedTotal = (itinerary && itinerary.length > 0)
                ? itinerary.reduce((sum, d) => sum + (Number(d.amount) || Number(d.rate) || 0), 0)
                : (Number(totalAmount) || 0);
            const finalTotal = calculatedTotal > 0 ? calculatedTotal : (Number(totalAmount) || 0);
            const finalVehicle = (itinerary && itinerary.length > 0 && itinerary[0].vehicleType) ? itinerary[0].vehicleType : vehicleType;
            const finalPickup = (itinerary && itinerary.length > 0 && itinerary[0].pickupPoint) ? itinerary[0].pickupPoint : pickupPoint;

            const payload = {
                bookingReference,
                travelAgentName,
                travelAgentMobile,
                clientName,
                mobileNumber,
                alternateMobile,
                email,
                gstin,
                source,
                reference,
                salesPerson,
                vehicleType: finalVehicle,
                numberOfCars,
                travelStartDate,
                travelEndDate,
                isBreakTour: Boolean(isBreakTour || validExcludedDates.length > 0),
                excludedDates: validExcludedDates,
                activeDaysCount: activeCarDays,
                totalAmount: finalTotal,
                pickupPoint: finalPickup,
                dropPoint,
                pickupLocation: finalPickup,
                dropLocation: dropPoint,
                gstMode,
                gstRate,
                specialRemarks,
                notes: specialRemarks,
                inclusions,
                itinerary,
                vehicleMatrix: {
                    fuelType,
                    totalKmRun: kmVal,
                    vehicleAverage: avgVal,
                    fuelRate: rateVal,
                    fuelCost: Math.round(fuelCost),
                    driverSalary: driverSalaryVal,
                    nightHold: nightHoldVal,
                    tollAndParking: tollVal,
                    gstAmount: gstVal,
                    targetPerDay: targetPerDayVal,
                    totalCost: Math.round(totalCost),
                    totalProfit: Math.round(totalProfit),
                    perDayProfit: Math.round(perDayProfit)
                }
            };

            await axios.put(`/api/bookings/single/${booking._id}`, payload);
            onSuccess();
        } catch (error) {
            console.error('Error updating booking:', error);
            alert(error.response?.data?.message || 'Failed to update booking details');
        } finally {
            setSaving(false);
        }
    };

    const darkInputStyle = {
        width: '100%',
        padding: '9px 12px',
        background: '#090f1d',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: '13px',
        outline: 'none',
        transition: 'all 0.15s ease'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.4px'
    };

    return (
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
                maxWidth: '1080px',
                maxHeight: '92vh',
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
                    padding: '18px 24px',
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
                            <Edit2 size={18} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '900' }}>
                                    Edit Booking & Quotation
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
                                    {booking.bookingCode || booking.bookingId}
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                Update booking details, vehicle cost matrix, and day-wise itinerary schedule.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
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

                {/* Form Body: Scrollable with all 4 sequential sections */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    
                    {/* ========================================================= */}
                    {/* SECTION 1: BOOKING & CLIENT DETAILS                       */}
                    {/* ========================================================= */}
                    <div style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fbbf24', color: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '11px' }}>1</span>
                                <span style={{ color: '#fbbf24', fontSize: '12.5px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                    Booking & Client Details
                                </span>
                            </div>

                            {/* Booking Reference Toggle */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {BOOKING_REFERENCES.map(ref => (
                                    <button
                                        key={ref}
                                        type="button"
                                        onClick={() => setBookingReference(ref)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: bookingReference === ref ? '#fbbf24' : 'transparent',
                                            color: bookingReference === ref ? '#000' : 'rgba(255,255,255,0.7)',
                                            fontWeight: '800',
                                            fontSize: '11.5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {ref}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Travel Agent Fields if selected */}
                        {bookingReference === 'Travel Agent' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px', padding: '12px', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                <div>
                                    <label style={labelStyle}>Travel Agent Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Agency or Agent Name"
                                        value={travelAgentName}
                                        onChange={e => setTravelAgentName(e.target.value)}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Agent Contact / Mobile *</label>
                                    <input
                                        type="text"
                                        placeholder="+91 Mobile Number"
                                        value={travelAgentMobile}
                                        onChange={e => setTravelAgentMobile(e.target.value)}
                                        style={darkInputStyle}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Guest & Client Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                            <div>
                                <label style={labelStyle}>Guest Name *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Guest full name"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Mobile Number *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="+91 Mobile number"
                                    value={mobileNumber}
                                    onChange={e => setMobileNumber(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Alternate Mobile</label>
                                <input
                                    type="text"
                                    placeholder="Optional"
                                    value={alternateMobile}
                                    onChange={e => setAlternateMobile(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="client@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>GSTIN</label>
                                <input
                                    type="text"
                                    placeholder="GST number"
                                    value={gstin}
                                    onChange={e => setGstin(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Booking Source</label>
                                <select
                                    value={source}
                                    onChange={e => setSource(e.target.value)}
                                    style={darkInputStyle}
                                >
                                    {ALL_SOURCES.map(s => (
                                        <option key={s} value={s} style={{ background: '#090f1d' }}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Vehicle & Travel Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Vehicle Type</label>
                                <select
                                    value={vehicleType}
                                    onChange={e => {
                                        const vt = e.target.value;
                                        setVehicleType(vt);
                                        setItinerary(prev => prev.map(d => ({ ...d, vehicleType: vt })));
                                    }}
                                    style={darkInputStyle}
                                >
                                    {vehicleOptions.map(v => (
                                        <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Number of Cars</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={numberOfCars}
                                    onChange={e => {
                                        const cars = Math.max(1, parseInt(e.target.value) || 1);
                                        setNumberOfCars(cars);
                                        setItinerary(prev => prev.map(d => ({
                                            ...d,
                                            vehicleCount: cars,
                                            quantity: cars,
                                            amount: cars * (Number(d.rate) || 0)
                                        })));
                                    }}
                                    style={darkInputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Travel Start Date *</label>
                                <input
                                    required
                                    type="date"
                                    value={travelStartDate}
                                    onChange={e => handleTravelDateChange('travelStartDate', e.target.value)}
                                    style={{ ...darkInputStyle, colorScheme: 'dark' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Travel End Date *</label>
                                <input
                                    required
                                    type="date"
                                    value={travelEndDate}
                                    onChange={e => handleTravelDateChange('travelEndDate', e.target.value)}
                                    style={{ ...darkInputStyle, colorScheme: 'dark' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Quoted Package Fare (₹) *</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 15000"
                                    value={totalAmount || ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                        setTotalAmount(val);
                                    }}
                                    style={{ ...darkInputStyle, color: '#fbbf24', fontWeight: '900' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Pickup Point</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Jaipur Airport / Hotel"
                                    value={pickupPoint}
                                    onChange={e => setPickupPoint(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Drop Point</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Delhi Airport / Hotel"
                                    value={dropPoint}
                                    onChange={e => setDropPoint(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                        </div>

                        {/* BREAK TOUR / CAR USAGE SCHEDULE (SKIP CAR DAYS) */}
                        {allTourDates.length > 0 && (
                            <div style={{
                                marginTop: '12px',
                                background: (isBreakTour || validExcludedDates.length > 0)
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.9))'
                                    : 'rgba(255, 255, 255, 0.02)',
                                border: (isBreakTour || validExcludedDates.length > 0)
                                    ? '1px solid rgba(245, 158, 11, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                padding: '12px 14px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isBreakTour && validExcludedDates.length > 0) {
                                                    setIsBreakTour(false);
                                                    setExcludedDates([]);
                                                } else {
                                                    setIsBreakTour(prev => !prev);
                                                }
                                            }}
                                            style={{
                                                background: (isBreakTour || validExcludedDates.length > 0)
                                                    ? 'rgba(245, 158, 11, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.06)',
                                                border: (isBreakTour || validExcludedDates.length > 0)
                                                    ? '1.5px solid #fbbf24'
                                                    : '1px solid rgba(255, 255, 255, 0.15)',
                                                color: (isBreakTour || validExcludedDates.length > 0)
                                                    ? '#fbbf24'
                                                    : '#cbd5e1',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>{(isBreakTour || validExcludedDates.length > 0) ? '✅' : '⏸️'}</span>
                                            <span>Break Tour (Guest Skip Car Days)</span>
                                        </button>

                                        <span style={{ background: 'rgba(148, 163, 184, 0.12)', border: '1px solid rgba(148, 163, 184, 0.25)', color: '#cbd5e1', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700' }}>
                                            📅 Total Stay: <strong style={{ color: 'white' }}>{totalStayDays} Day{totalStayDays > 1 ? 's' : ''}</strong>
                                        </span>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800' }}>
                                            🚗 Car Used: <strong>{activeCarDays} Day{activeCarDays > 1 ? 's' : ''}</strong>
                                        </span>
                                        {validExcludedDates.length > 0 && (
                                            <span style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800' }}>
                                                🚫 Break / No Car: <strong>{validExcludedDates.length} Day{validExcludedDates.length > 1 ? 's' : ''}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {(isBreakTour || validExcludedDates.length > 0) && (
                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                        <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '7px' }}>
                                            💡 Click on any date when guest is <strong style={{ color: '#f87171' }}>NOT using the car</strong> (Break Day):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                                            {allTourDates.map((dStr, idx) => {
                                                const isOff = validExcludedDates.includes(dStr);
                                                const dObj = new Date(dStr + 'T00:00:00');
                                                const dayLabel = dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                                const weekDay = dObj.toLocaleDateString('en-IN', { weekday: 'short' });
                                                return (
                                                    <button
                                                        key={dStr}
                                                        type="button"
                                                        onClick={() => toggleBreakTourDate(dStr)}
                                                        style={{
                                                            background: isOff ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.14)',
                                                            border: isOff ? '1.5px solid rgba(239, 68, 68, 0.55)' : '1.5px solid rgba(16, 185, 129, 0.45)',
                                                            color: isOff ? '#fca5a5' : '#6ee7b7',
                                                            padding: '5px 9px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            minWidth: '70px'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '9.5px', fontWeight: '700', opacity: 0.75 }}>{weekDay} • D{idx + 1}</span>
                                                        <span style={{ fontSize: '11.5px', fontWeight: '900', textDecoration: isOff ? 'line-through' : 'none' }}>{dayLabel}</span>
                                                        <span style={{ fontSize: '9px', fontWeight: '800', color: isOff ? '#f87171' : '#34d399' }}>
                                                            {isOff ? '🚫 No Car' : '🚗 Car Use'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* SECTION 2: VEHICLE & COST MATRIX (Real-time P&L)          */}
                    {/* ========================================================= */}
                    <div style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fbbf24', color: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '11px' }}>2</span>
                                <span style={{ color: '#fbbf24', fontSize: '12.5px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                    Vehicle & Cost Matrix ({numDays} Active Car {numDays > 1 ? 'Days' : 'Day'}{validExcludedDates.length > 0 ? ` / ${totalStayDays}d Stay` : ''})
                                </span>
                            </div>

                            {/* Fuel Type Pills */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {['Diesel', 'Petrol', 'CNG', 'EV'].map(ft => (
                                    <button
                                        key={ft}
                                        type="button"
                                        onClick={() => setFuelType(ft)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: fuelType === ft ? '#3b82f6' : 'transparent',
                                            color: fuelType === ft ? '#fff' : 'rgba(255,255,255,0.7)',
                                            fontWeight: '800',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {ft}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Matrix Inputs Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Total KM Run</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Est. Km"
                                    value={totalKmRun}
                                    onChange={e => setTotalKmRun(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Avg ({fuelType === 'EV' ? 'km/unit' : 'km/l'})</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Mileage"
                                    value={vehicleAverage}
                                    onChange={e => setVehicleAverage(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Fuel Rate (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Rate"
                                    value={fuelRate}
                                    onChange={e => setFuelRate(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Fuel Cost (Auto)</label>
                                <div style={{ ...darkInputStyle, background: 'rgba(255,255,255,0.03)', color: '#38bdf8', fontWeight: '800' }}>
                                    ₹{Math.round(fuelCost).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Driver Salary (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={driverSalary}
                                    onChange={e => setDriverSalary(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Night Hold (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={nightHold}
                                    onChange={e => setNightHold(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Toll & Parking (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={tollAndParking}
                                    onChange={e => setTollAndParking(e.target.value)}
                                    style={darkInputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Target Profit/Day</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="2500"
                                    value={targetPerDay}
                                    onChange={e => setTargetPerDay(e.target.value)}
                                    style={{ ...darkInputStyle, color: '#34d399', fontWeight: '800' }}
                                />
                            </div>
                        </div>

                        {/* Live P&L Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>TOTAL TOUR COST</div>
                                <div style={{ fontSize: '17px', fontWeight: '900', color: '#f87171' }}>
                                    ₹{Math.round(totalCost).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>TARGET PROFIT</div>
                                <div style={{ fontSize: '17px', fontWeight: '900', color: '#34d399' }}>
                                    ₹{Math.round(totalTargetProfit).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>RECOMMENDED FARE</div>
                                <div style={{ fontSize: '17px', fontWeight: '900', color: '#60a5fa' }}>
                                    ₹{Math.round(recommendedSaleFare).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>ACTUAL NET PROFIT</div>
                                <div style={{ fontSize: '17px', fontWeight: '900', color: totalProfit >= 0 ? '#34d399' : '#f87171' }}>
                                    ₹{Math.round(totalProfit).toLocaleString('en-IN')} ({marginPercent}%)
                                </div>
                            </div>
                        </div>

                        {/* Sale Price Simulator */}
                        <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#93c5fd' }}>Sale Price Simulator:</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Test quote (e.g. 18000)"
                                    value={matrixSimSalePrice}
                                    onChange={e => setMatrixSimSalePrice(e.target.value)}
                                    style={{ ...darkInputStyle, width: '180px', padding: '6px 10px' }}
                                />
                                {matrixSimPriceVal > 0 && (
                                    <span style={{ fontSize: '12px', color: simNetProfit >= 0 ? '#34d399' : '#f87171', fontWeight: '700' }}>
                                        Net Profit: ₹{Math.round(simNetProfit).toLocaleString('en-IN')} (₹{Math.round(simPerDayProfit)}/day)
                                    </span>
                                )}
                            </div>
                            {matrixSimPriceVal > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setTotalAmount(matrixSimPriceVal)}
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.25)',
                                        border: '1px solid #3b82f6',
                                        color: '#93c5fd',
                                        borderRadius: '6px',
                                        padding: '4px 12px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Apply as Fare
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SECTION 3: DAY-WISE ITINERARY & PRICING                   */}
                    {/* ========================================================= */}
                    <div style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fbbf24', color: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '11px' }}>3</span>
                            <span style={{ color: '#fbbf24', fontSize: '12.5px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                Day-wise Itinerary & Pricing
                            </span>
                        </div>

                        {/* Itinerary Table */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto', marginBottom: '14px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                                <thead style={{ background: '#060a12', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '60px' }}>DAY</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '150px' }}>DATE</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '110px' }}>TIME</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '55px' }}>APG</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>ROUTE / ITINERARY</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '130px' }}>VEHICLE</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '65px' }}>QTY</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11.5px', fontWeight: '800', color: '#f8fafc', textAlign: 'right', width: '130px' }}>RATE (₹)</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11.5px', fontWeight: '800', color: '#fbbf24', textAlign: 'right', width: '140px' }}>AMOUNT (₹)</th>
                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '50px' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itinerary.map((day, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{ background: '#fbbf24', color: '#000', fontWeight: '900', fontSize: '11px', padding: '3px 7px', borderRadius: '6px', display: 'inline-block' }}>
                                                    D{day.dayNo || idx + 1}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="date"
                                                    value={toLocalDateString(day.date)}
                                                    onChange={e => handleItineraryRowChange(idx, 'date', e.target.value)}
                                                    style={{ ...darkInputStyle, colorScheme: 'dark', padding: '6px 8px', fontSize: '12px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="text"
                                                    value={day.isApg ? 'APG' : (day.time || '09:00 AM')}
                                                    disabled={day.isApg}
                                                    onChange={e => handleItineraryRowChange(idx, 'time', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', color: day.isApg ? '#fbbf24' : '#fff' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!day.isApg}
                                                    onChange={e => handleItineraryRowChange(idx, 'isApg', e.target.checked)}
                                                    style={{ width: '15px', height: '15px', accentColor: '#fbbf24', cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Airport Pickup & Local Sightseeing"
                                                    value={day.duty || day.description || ''}
                                                    onChange={e => handleItineraryRowChange(idx, 'duty', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 10px', fontSize: '12px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <select
                                                    value={day.vehicleType || vehicleType}
                                                    onChange={e => handleItineraryRowChange(idx, 'vehicleType', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                >
                                                    {vehicleOptions.map(v => (
                                                        <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={day.quantity !== undefined ? day.quantity : (day.vehicleCount || 1)}
                                                    onChange={e => handleItineraryRowChange(idx, 'quantity', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 4px', fontSize: '12px', textAlign: 'center', width: '55px', margin: '0 auto' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={day.rate !== undefined ? day.rate : 0}
                                                    onChange={e => handleItineraryRowChange(idx, 'rate', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 10px', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={day.amount !== undefined ? day.amount : 0}
                                                    onChange={e => handleItineraryRowChange(idx, 'amount', e.target.value)}
                                                    style={{ ...darkInputStyle, padding: '6px 10px', fontSize: '13.5px', fontWeight: '900', color: '#fbbf24', textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItineraryDay(idx)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Itinerary Bottom Bar: + Add Another Day & Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={addAnotherDay}
                                style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    color: '#fbbf24',
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '12.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Plus size={15} /> Add Another Day
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#060a12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 18px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                                    Total Quoted Fare:
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24' }}>
                                    ₹{Number(totalAmount).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SECTION 4: REMARKS & INCLUSIONS (2-Column)                */}
                    {/* ========================================================= */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        {/* Left: Special Remarks */}
                        <div style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                    Any Remark / Special Request of Guest
                                </span>
                            </div>
                            <textarea
                                maxLength={500}
                                rows={4}
                                placeholder="e.g. Need wheelchair assistance, prefer Non-AC on hills, baby seat..."
                                value={specialRemarks}
                                onChange={e => setSpecialRemarks(e.target.value)}
                                style={{ ...darkInputStyle, resize: 'vertical', minHeight: '90px', lineHeight: '1.4' }}
                            />
                        </div>

                        {/* Right: Inclusions Checkboxes */}
                        <div style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                    Trip Inclusion Remarks
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { key: 'driverAllowance', label: 'Driver allowance included' },
                                    { key: 'nightAllowance', label: 'Night allowance included' },
                                    { key: 'tollParking', label: 'Toll & parking charges included' },
                                    { key: 'gstIncluded', label: 'GST prices included' }
                                ].map(({ key, label }) => (
                                    <label
                                        key={key}
                                        onClick={() => handleInclusionToggle(key)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: inclusions[key] ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            background: inclusions[key] ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                                            border: `1px solid ${inclusions[key] ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: '900'
                                        }}>
                                            {inclusions[key] && '✓'}
                                        </div>
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Manual Inclusions */}
                            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                                <label style={{ ...labelStyle, marginBottom: '4px' }}>Custom Inclusions (Auto-Saved)</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. State border tax included, parking at client cost..."
                                    value={inclusions.manualRemarks || ''}
                                    onChange={e => setInclusions(prev => ({ ...prev, manualRemarks: e.target.value }))}
                                    style={{ ...darkInputStyle, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                            <Info size={14} color="#38bdf8" />
                            <span>Changes will be updated directly to booking and itinerary schedule.</span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '9px 20px',
                                    background: '#0a101d',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '9px 24px',
                                    background: '#fbbf24',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                <Save size={15} />
                                {saving ? 'Saving Changes...' : 'Update Booking'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
