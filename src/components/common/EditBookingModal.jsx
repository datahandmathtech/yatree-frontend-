import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, Calculator, TrendingUp, TrendingDown, Car, Calendar, Sparkles, Edit2, Check, Settings } from 'lucide-react';
import axios from '../../api/axios';

const DEFAULT_CARS = [
    'Innova Crysta',
    'Swift Dzire',
    'Ciaz',
    'Tempo Traveller',
    'Ertiga',
    'Toyota Fortuner'
];

export default function EditBookingModal({ booking, onClose, onSuccess }) {
    // Dynamic Fleet Cars (stored in localStorage)
    const [carList, setCarList] = useState(() => {
        try {
            const saved = localStorage.getItem('yatree_fleet_cars');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error loading car list', e);
        }
        return DEFAULT_CARS;
    });

    const [showCarManager, setShowCarManager] = useState(false);
    const [newCarInput, setNewCarInput] = useState('');
    const [editingCarIdx, setEditingCarIdx] = useState(null);
    const [editingCarValue, setEditingCarValue] = useState('');

    // Basic Details
    const [clientName, setClientName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('Innova Crysta');
    const [packageValue, setPackageValue] = useState('');
    const [travelStartDate, setTravelStartDate] = useState('');
    const [travelEndDate, setTravelEndDate] = useState('');
    const [totalDays, setTotalDays] = useState('1');
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropLocation, setDropLocation] = useState('');
    
    // Day-wise Itinerary
    const [itinerary, setItinerary] = useState([]);

    // Fuel Types configuration
    const FUEL_TYPES = [
        { type: 'Diesel', label: 'Diesel', icon: '⛽', rateUnit: '₹/L', avgUnit: 'km/l' },
        { type: 'Petrol', label: 'Petrol', icon: '⛽', rateUnit: '₹/L', avgUnit: 'km/l' },
        { type: 'CNG', label: 'CNG', icon: '🍃', rateUnit: '₹/kg', avgUnit: 'km/kg' },
        { type: 'EV', label: 'Electric (EV)', icon: '⚡', rateUnit: '₹/unit', avgUnit: 'km/unit' }
    ];

    // Vehicle Matrix Inputs (Strings to avoid sticky 0)
    // NOTE: vehicleAverage and fuelRate are NOT auto-calculated; user types them manually.
    const [fuelType, setFuelType] = useState('Diesel');
    const [totalKmRun, setTotalKmRun] = useState('');
    const [vehicleAverage, setVehicleAverage] = useState('');
    const [fuelRate, setFuelRate] = useState('');
    const [driverSalary, setDriverSalary] = useState('');
    const [nightHold, setNightHold] = useState('');
    const [tollAndParking, setTollAndParking] = useState('');
    const [gstAmount, setGstAmount] = useState('');
    const [targetPerDay, setTargetPerDay] = useState('');

    // Simulation price test (e.g. test at 40000)
    const [simSalePrice, setSimSalePrice] = useState('');

    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('matrix'); // matrix (default), itinerary, general

    // Save car list to localStorage
    const updateCarList = (newList) => {
        setCarList(newList);
        try {
            localStorage.setItem('yatree_fleet_cars', JSON.stringify(newList));
        } catch (e) {
            console.error('Error saving car list', e);
        }
    };

    useEffect(() => {
        if (booking) {
            const vType = booking.vehicleType || 'Innova Crysta';
            
            // If booking vehicle is not in carList, add it
            if (vType && !carList.includes(vType)) {
                updateCarList([vType, ...carList]);
            }

            setClientName(booking.clientName || '');
            setMobileNumber(booking.mobileNumber || '');
            setVehicleType(vType);
            setPackageValue(booking.totalAmount ? String(booking.totalAmount) : '');
            
            const startD = booking.travelStartDate ? new Date(booking.travelStartDate).toISOString().split('T')[0] : '';
            const endD = booking.travelEndDate ? new Date(booking.travelEndDate).toISOString().split('T')[0] : '';
            setTravelStartDate(startD);
            setTravelEndDate(endD);

            let calculatedDays = 1;
            if (startD && endD) {
                const diffTime = Math.abs(new Date(endD) - new Date(startD));
                calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }
            setTotalDays(String(calculatedDays || 1));

            setPickupLocation(booking.pickupLocation || '');
            setDropLocation(booking.dropLocation || '');
            setItinerary(Array.isArray(booking.itinerary) ? [...booking.itinerary] : []);

            const matrix = booking.vehicleMatrix || {};
            const loadedFuelType = matrix.fuelType || 'Diesel';
            setFuelType(loadedFuelType);
            setTotalKmRun(matrix.totalKmRun ? String(matrix.totalKmRun) : '');
            // User types average and rate themselves; only show if previously entered
            setVehicleAverage(matrix.vehicleAverage ? String(matrix.vehicleAverage) : '');
            setFuelRate(matrix.fuelRate ? String(matrix.fuelRate) : '');
            setDriverSalary(matrix.driverSalary ? String(matrix.driverSalary) : '');
            setNightHold(matrix.nightHold ? String(matrix.nightHold) : '');
            setTollAndParking(matrix.tollAndParking ? String(matrix.tollAndParking) : '');
            setGstAmount(matrix.gstAmount ? String(matrix.gstAmount) : '');
            setTargetPerDay(matrix.targetPerDay ? String(matrix.targetPerDay) : '2500');
        }
    }, [booking]);

    // Handle adding new car
    const handleAddNewCar = () => {
        const trimmed = newCarInput.trim();
        if (!trimmed) return;
        if (carList.includes(trimmed)) {
            alert('This car is already in the list');
            return;
        }
        const updated = [...carList, trimmed];
        updateCarList(updated);
        setVehicleType(trimmed);
        setNewCarInput('');
    };

    // Handle editing existing car name
    const handleSaveEditCar = (idx) => {
        const trimmed = editingCarValue.trim();
        if (!trimmed) return;
        const oldName = carList[idx];
        const updated = [...carList];
        updated[idx] = trimmed;
        updateCarList(updated);
        if (vehicleType === oldName) {
            setVehicleType(trimmed);
        }
        setEditingCarIdx(null);
        setEditingCarValue('');
    };

    // Handle deleting car
    const handleDeleteCar = (idx) => {
        const carToDelete = carList[idx];
        if (carList.length <= 1) {
            alert('You must keep at least one vehicle in the list');
            return;
        }
        const updated = carList.filter((_, i) => i !== idx);
        updateCarList(updated);
        if (vehicleType === carToDelete) {
            setVehicleType(updated[0]);
        }
    };

    // Calculate dates duration
    const handleDateChange = (start, end) => {
        setTravelStartDate(start);
        setTravelEndDate(end);
        if (start && end) {
            const diffTime = Math.abs(new Date(end) - new Date(start));
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setTotalDays(String(days > 0 ? days : 1));
        }
    };

    // Auto 5% GST calculation: Package - (Package / 1.05)
    const handleAutoGST = () => {
        const pkg = parseFloat(packageValue) || 0;
        if (pkg > 0) {
            const autoGst = Math.round(pkg - (pkg / 1.05));
            setGstAmount(String(autoGst));
        }
    };

    // Current Fuel Config
    const currentFuelConfig = FUEL_TYPES.find(f => f.type === fuelType) || FUEL_TYPES[0];

    // Math Calculations
    const kmVal = parseFloat(totalKmRun) || 0;
    const avgVal = parseFloat(vehicleAverage) || 0;
    const rateVal = parseFloat(fuelRate) || 0;
    const fuelCost = avgVal > 0 ? (kmVal / avgVal) * rateVal : 0;

    const driverSalaryVal = parseFloat(driverSalary) || 0;
    const nightHoldVal = parseFloat(nightHold) || 0;
    const tollVal = parseFloat(tollAndParking) || 0;
    const gstVal = parseFloat(gstAmount) || 0;
    const packageVal = parseFloat(packageValue) || 0;
    const daysVal = Math.max(1, parseInt(totalDays) || 1);
    const targetPerDayVal = parseFloat(targetPerDay) || 0;

    const totalCost = fuelCost + driverSalaryVal + nightHoldVal + tollVal + gstVal;
    const totalProfit = packageVal - totalCost;
    const perDayProfit = daysVal > 0 ? (totalProfit / daysVal) : 0;
    const diffFromTarget = perDayProfit - targetPerDayVal;

    // Simulation calculation (e.g. if you sale at 40000)
    const simPriceVal = parseFloat(simSalePrice) || 0;
    const simProfit = simPriceVal > 0 ? (simPriceVal - totalCost) : 0;
    const simPerDay = daysVal > 0 ? (simProfit / daysVal) : 0;

    // Itinerary helpers
    const addItineraryDay = () => {
        const nextDayNo = itinerary.length + 1;
        setItinerary([
            ...itinerary,
            { dayNo: nextDayNo, date: '', time: '09:00 AM', pickupPoint: '', duty: '', vehicleType: vehicleType }
        ]);
    };

    const updateItineraryDay = (index, field, value) => {
        const newItin = [...itinerary];
        newItin[index][field] = value;
        setItinerary(newItin);
    };

    const removeItineraryDay = (index) => {
        const newItin = [...itinerary];
        newItin.splice(index, 1);
        setItinerary(newItin);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                clientName,
                mobileNumber,
                vehicleType,
                totalAmount: packageVal,
                travelStartDate,
                travelEndDate,
                pickupLocation,
                dropLocation,
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
                    netProfit: Math.round(totalProfit),
                    perDayProfit: Math.round(perDayProfit)
                }
            };

            await axios.put(`/api/bookings/single/${booking._id}`, payload);
            onSuccess();
        } catch (error) {
            console.error('Error updating booking', error);
            alert('Failed to update booking details');
        } finally {
            setSaving(false);
        }
    };

    const inputCleanStyle = {
        width: '100%',
        padding: '10px 14px',
        background: '#090d16',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        outline: 'none',
        transition: 'all 0.2s ease'
    };

    const labelStyle = { 
        fontSize: '12px', 
        color: 'rgba(255,255,255,0.65)', 
        display: 'block', 
        marginBottom: '6px',
        fontWeight: '600'
    };

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '16px' }}>
                <motion.div 
                    initial={{ y: 25, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: 25, opacity: 0 }} 
                    style={{ 
                        width: '100%', 
                        maxWidth: '960px', 
                        maxHeight: '92vh', 
                        overflow: 'hidden', 
                        background: '#0d1322', 
                        border: '1px solid rgba(255,255,255,0.15)', 
                        borderRadius: '18px', 
                        display: 'flex', 
                        flexDirection: 'column',
                        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)'
                    }}
                >
                    
                    {/* Header with Quick Booking Summary */}
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ background: '#3b82f6', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>CONFIRMED</span>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '17px', fontWeight: '800' }}>
                                    Booking #{booking?.bookingCode || booking?.bookingId || booking?._id?.slice(-6)}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '12.5px', color: 'rgba(255,255,255,0.7)' }}>
                                <span>Guest: <strong style={{ color: 'white' }}>{clientName || 'N/A'}</strong> ({mobileNumber || 'N/A'})</span>
                                <span>•</span>
                                <span>Vehicle: <strong style={{ color: '#60a5fa' }}>{vehicleType}</strong></span>
                                <span>•</span>
                                <span>Duration: <strong style={{ color: '#fbbf24' }}>{totalDays} Days</strong></span>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '6px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                            onClick={() => setActiveTab('matrix')}
                            style={{
                                padding: '10px 18px',
                                background: activeTab === 'matrix' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'matrix' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === 'matrix' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                fontWeight: '700',
                                fontSize: '13px',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Calculator size={15} /> Vehicle Matrix & Profit Calculator
                        </button>
                        <button
                            onClick={() => setActiveTab('itinerary')}
                            style={{
                                padding: '10px 18px',
                                background: activeTab === 'itinerary' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'itinerary' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === 'itinerary' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                fontWeight: '700',
                                fontSize: '13px',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Calendar size={15} /> Day-wise Itinerary ({itinerary.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('general')}
                            style={{
                                padding: '10px 18px',
                                background: activeTab === 'general' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'general' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === 'general' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                fontWeight: '700',
                                fontSize: '13px',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Car size={15} /> Edit Booking Details
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                        
                        {/* TAB 1: VEHICLE MATRIX (P&L CALCULATOR) */}
                        {activeTab === 'matrix' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                
                                {/* Top Control Ribbon */}
                                <div style={{ background: '#11192d', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '14px', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{...labelStyle, marginBottom: 0}}>Select Car / Vehicle</label>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowCarManager(true)}
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    color: '#60a5fa',
                                                    borderRadius: '6px',
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Settings size={12} /> Manage Cars
                                            </button>
                                        </div>
                                        <select 
                                            value={vehicleType} 
                                            onChange={e => {
                                                if (e.target.value === '__add_new__') {
                                                    setShowCarManager(true);
                                                } else {
                                                    setVehicleType(e.target.value);
                                                }
                                            }} 
                                            style={{...inputCleanStyle, border: '1px solid #3b82f6', color: '#93c5fd', fontWeight: 'bold'}}
                                        >
                                            {carList.map(vName => (
                                                <option key={vName} value={vName} style={{ background: '#0f172a', color: 'white' }}>
                                                    {vName}
                                                </option>
                                            ))}
                                            <option value="__add_new__" style={{ background: '#1e293b', color: '#60a5fa', fontWeight: 'bold' }}>
                                                ➕ Add / Edit More Cars...
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Package Selling Value (₹)</label>
                                        <input 
                                            type="number" 
                                            value={packageValue} 
                                            placeholder="e.g. 42000"
                                            onFocus={e => e.target.select()}
                                            onChange={e => setPackageValue(e.target.value)} 
                                            style={{...inputCleanStyle, color: '#fbbf24', fontWeight: '800', borderColor: 'rgba(251, 191, 36, 0.4)'}} 
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Total Tour Days</label>
                                        <input 
                                            type="number" 
                                            value={totalDays} 
                                            placeholder="1"
                                            onFocus={e => e.target.select()}
                                            onChange={e => setTotalDays(e.target.value)} 
                                            style={inputCleanStyle} 
                                        />
                                    </div>
                                </div>

                                {/* Matrix Split: Left Inputs, Right Live Output */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '18px' }}>
                                    
                                    {/* Left: Direct Operating Expenses Inputs */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        
                                        {/* Fuel Box */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    ⛽ Fuel Consumption ({fuelType})
                                                </span>
                                                <span style={{ fontSize: '12.5px', color: '#f87171', fontWeight: '800' }}>
                                                    Cost: ₹{Math.round(fuelCost).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Fuel Type Selector Pills */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ ...labelStyle, marginBottom: '6px', color: 'rgba(255,255,255,0.7)' }}>
                                                    Select Fuel Type:
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                                    {FUEL_TYPES.map(f => {
                                                        const isSelected = fuelType === f.type;
                                                        return (
                                                            <button
                                                                key={f.type}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFuelType(f.type);
                                                                }}
                                                                style={{
                                                                    padding: '6px 4px',
                                                                    background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                                                                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                                                                    color: isSelected ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: isSelected ? '800' : '500',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '4px',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                <span>{f.icon}</span>
                                                                <span>{f.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={labelStyle}>Total Km Run</label>
                                                    <input 
                                                        type="number" 
                                                        value={totalKmRun} 
                                                        placeholder="e.g. 1400"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setTotalKmRun(e.target.value)} 
                                                        style={inputCleanStyle} 
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{...labelStyle, color: '#60a5fa'}}>
                                                        Average ({currentFuelConfig.avgUnit})
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        step="0.5"
                                                        value={vehicleAverage} 
                                                        placeholder={fuelType === 'CNG' ? 'e.g. 24' : 'e.g. 12'}
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setVehicleAverage(e.target.value)} 
                                                        style={{...inputCleanStyle, borderColor: '#3b82f6'}} 
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>
                                                        Rate ({currentFuelConfig.rateUnit})
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={fuelRate} 
                                                        placeholder="e.g. 94"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setFuelRate(e.target.value)} 
                                                        style={{...inputCleanStyle, borderColor: '#60a5fa'}} 
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                                {avgVal > 0 && rateVal > 0 ? (
                                                    `Formula: (${kmVal} km ÷ ${avgVal} ${currentFuelConfig.avgUnit}) × ₹${rateVal} (${fuelType}) = ₹${Math.round(fuelCost).toLocaleString()}`
                                                ) : (
                                                    `Selected: ${fuelType}. Type vehicle average (${currentFuelConfig.avgUnit}) & state pump rate (${currentFuelConfig.rateUnit}) above.`
                                                )}
                                            </div>
                                        </div>

                                        {/* Other Direct Costs Box */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block', marginBottom: '10px' }}>
                                                🛠️ Duty & Trip Expenses (Kharcha)
                                            </span>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                                <div>
                                                    <label style={labelStyle}>Driver Salary (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        value={driverSalary} 
                                                        placeholder="e.g. 3500"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setDriverSalary(e.target.value)} 
                                                        style={inputCleanStyle} 
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Night Hold (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        value={nightHold} 
                                                        placeholder="e.g. 2000"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setNightHold(e.target.value)} 
                                                        style={inputCleanStyle} 
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={labelStyle}>Toll & Parking (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        value={tollAndParking} 
                                                        placeholder="e.g. 2000"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setTollAndParking(e.target.value)} 
                                                        style={inputCleanStyle} 
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <label style={labelStyle}>GST Amount (₹)</label>
                                                        {packageVal > 0 && (
                                                            <button 
                                                                type="button" 
                                                                onClick={handleAutoGST}
                                                                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                            >
                                                                Auto 5% (₹{Math.round(packageVal - (packageVal / 1.05))})
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        value={gstAmount} 
                                                        placeholder="e.g. 2000"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setGstAmount(e.target.value)} 
                                                        style={inputCleanStyle} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target Benchmark Setting */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <label style={{...labelStyle, color: '#93c5fd', margin: 0}}>Benchmark Target Per Day (₹)</label>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                        Innova: 2500 | Ciaz: 1500 | Dzire: 1000 | TT: 3500
                                                    </div>
                                                </div>
                                                <div style={{ width: '130px' }}>
                                                    <input 
                                                        type="number" 
                                                        value={targetPerDay} 
                                                        placeholder="e.g. 2500"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setTargetPerDay(e.target.value)} 
                                                        style={{...inputCleanStyle, textAlign: 'right', borderColor: '#3b82f6', fontWeight: 'bold'}} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Right: Live Calculation Statement & Target Comparison */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        
                                        {/* Main Statement Card */}
                                        <div style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calculator size={15} color="#fbbf24" /> P&L Live Statement
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{daysVal} Days Tour</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Package Value:</span>
                                                <span style={{ color: '#fbbf24', fontWeight: '800' }}>₹{packageVal.toLocaleString()}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fuel Consumption:</span>
                                                <span style={{ color: '#f87171' }}>- ₹{Math.round(fuelCost).toLocaleString()}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Driver + Night + Toll:</span>
                                                <span style={{ color: '#f87171' }}>- ₹{(driverSalaryVal + nightHoldVal + tollVal).toLocaleString()}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>GST Value:</span>
                                                <span style={{ color: '#f87171' }}>- ₹{gstVal.toLocaleString()}</span>
                                            </div>

                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Total Cost:</span>
                                                <span style={{ color: '#ef4444', fontWeight: '700' }}>₹{Math.round(totalCost).toLocaleString()}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', background: totalProfit >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${totalProfit >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                                                <span style={{ color: 'white', fontWeight: '800' }}>Net Profit:</span>
                                                <span style={{ color: totalProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: '900' }}>
                                                    ₹{Math.round(totalProfit).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Per Day Profit & Benchmark Match */}
                                            <div style={{ marginTop: '6px', background: '#111827', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Per Day Profit:</span>
                                                    <span style={{ color: '#ffffff', fontWeight: '800' }}>₹{Math.round(perDayProfit).toLocaleString()} / day</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Target ({vehicleType}):</span>
                                                    <span style={{ color: '#93c5fd', fontWeight: '600' }}>₹{targetPerDayVal.toLocaleString()} / day</span>
                                                </div>

                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }}></div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Profitability Status:</span>
                                                    <span style={{ 
                                                        fontSize: '13px', 
                                                        fontWeight: '900', 
                                                        padding: '4px 10px', 
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: diffFromTarget >= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                                        color: diffFromTarget >= 0 ? '#4ade80' : '#f87171'
                                                    }}>
                                                        {diffFromTarget >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        {diffFromTarget >= 0 ? '+' : '-'} ₹{Math.abs(Math.round(diffFromTarget)).toLocaleString()} / day
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Sale Price Simulator */}
                                        <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                <Sparkles size={14} color="#60a5fa" />
                                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#93c5fd' }}>
                                                    Sale Price Simulator
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Test Rate (e.g. 40000)" 
                                                        value={simSalePrice}
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => setSimSalePrice(e.target.value)}
                                                        style={{...inputCleanStyle, padding: '7px 10px', fontSize: '12.5px'}}
                                                    />
                                                </div>
                                                {simPriceVal > 0 && (
                                                    <div style={{ fontSize: '12px', textAlign: 'right' }}>
                                                        <div style={{ color: simProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                                            Profit: ₹{Math.round(simProfit).toLocaleString()}
                                                        </div>
                                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                                                            ₹{Math.round(simPerDay).toLocaleString()} / day
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>

                                </div>

                            </div>
                        )}

                        {/* TAB 2: DAY-WISE ITINERARY */}
                        {activeTab === 'itinerary' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '15px' }}>Day-wise Tour Schedule & Duty</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Add detailed duty for each day to share with customer & driver</p>
                                    </div>
                                    <button type="button" onClick={addItineraryDay} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus size={15} /> Add Day
                                    </button>
                                </div>
                                
                                {itinerary.map((day, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                                        <button type="button" onClick={() => removeItineraryDay(idx)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                                            <Trash2 size={14} />
                                        </button>
                                        
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', paddingRight: '40px' }}>
                                            <div style={{ width: '90px' }}>
                                                <label style={labelStyle}>Day</label>
                                                <input type="number" value={day.dayNo} onChange={e => updateItineraryDay(idx, 'dayNo', e.target.value)} style={inputCleanStyle} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Date</label>
                                                <input type="date" value={day.date ? new Date(day.date).toISOString().split('T')[0] : ''} onChange={e => updateItineraryDay(idx, 'date', e.target.value)} style={{...inputCleanStyle, colorScheme: 'dark'}} />
                                            </div>
                                            <div style={{ width: '130px' }}>
                                                <label style={labelStyle}>Pickup Time</label>
                                                <input type="text" value={day.time || ''} placeholder="09:00 AM" onChange={e => updateItineraryDay(idx, 'time', e.target.value)} style={inputCleanStyle} />
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <label style={labelStyle}>Route / Duty Description</label>
                                                <input type="text" value={day.duty || ''} onChange={e => updateItineraryDay(idx, 'duty', e.target.value)} style={inputCleanStyle} placeholder="e.g. Delhi to Agra, Taj Mahal & Agra Fort Sightseeing" />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={labelStyle}>Pickup Point</label>
                                                    <input type="text" value={day.pickupPoint || ''} onChange={e => updateItineraryDay(idx, 'pickupPoint', e.target.value)} style={inputCleanStyle} placeholder="e.g. Hotel / Airport" />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Assigned Vehicle</label>
                                                    <input type="text" value={day.vehicleType || vehicleType} onChange={e => updateItineraryDay(idx, 'vehicleType', e.target.value)} style={inputCleanStyle} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {itinerary.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '45px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <Calendar size={28} color="rgba(255,255,255,0.3)" style={{ marginBottom: '8px' }} />
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>No itinerary added yet.</p>
                                        <button type="button" onClick={addItineraryDay} style={{ marginTop: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                                            + Add First Day
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: BASIC BOOKING DETAILS */}
                        {activeTab === 'general' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <h4 style={{ color: 'white', margin: 0, fontSize: '14px' }}>Guest Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Guest / Client Name</label>
                                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} style={inputCleanStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Mobile Number</label>
                                            <input type="text" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} style={inputCleanStyle} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <h4 style={{ color: 'white', margin: 0, fontSize: '14px' }}>Travel Dates & Route</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Start Date</label>
                                            <input type="date" value={travelStartDate} onChange={e => handleDateChange(e.target.value, travelEndDate)} style={{...inputCleanStyle, colorScheme: 'dark'}} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>End Date</label>
                                            <input type="date" value={travelEndDate} onChange={e => handleDateChange(travelStartDate, e.target.value)} style={{...inputCleanStyle, colorScheme: 'dark'}} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Pickup Location</label>
                                            <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} style={inputCleanStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Drop Location</label>
                                            <input type="text" value={dropLocation} onChange={e => setDropLocation(e.target.value)} style={inputCleanStyle} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Actions Bar */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} style={{ flex: 1.5, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Matrix & Itinerary'}
                            </button>
                        </div>
                    </form>

                    {/* FLEET CAR MANAGEMENT MODAL */}
                    {showCarManager && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                            <div style={{ width: '100%', maxWidth: '440px', background: '#0e1726', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Car size={18} color="#3b82f6" /> Manage Fleet Cars
                                        </h3>
                                        <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Add new cars, rename or delete existing cars</p>
                                    </div>
                                    <button type="button" onClick={() => setShowCarManager(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Add New Car */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text"
                                        placeholder="Add new car (e.g. Kia Carens, Scorpio)"
                                        value={newCarInput}
                                        onChange={e => setNewCarInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCar(); } }}
                                        style={{ flex: 1, padding: '10px 14px', background: '#070b13', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddNewCar}
                                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Plus size={15} /> Add
                                    </button>
                                </div>

                                {/* Car List */}
                                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                                    {carList.map((car, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                                            {editingCarIdx === idx ? (
                                                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                                    <input 
                                                        type="text" 
                                                        value={editingCarValue} 
                                                        onChange={e => setEditingCarValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEditCar(idx); } }}
                                                        style={{ flex: 1, padding: '5px 8px', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '5px', color: 'white', fontSize: '13px' }}
                                                    />
                                                    <button type="button" onClick={() => handleSaveEditCar(idx)} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Save</button>
                                                    <button type="button" onClick={() => setEditingCarIdx(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{car}</span>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setEditingCarIdx(idx); setEditingCarValue(car); }}
                                                            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            title="Rename Car"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleDeleteCar(idx)}
                                                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            title="Delete Car"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    type="button" 
                                    onClick={() => setShowCarManager(false)}
                                    style={{ width: '100%', padding: '11px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13.5px', cursor: 'pointer', marginTop: '4px' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
