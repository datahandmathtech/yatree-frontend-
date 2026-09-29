import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, UserCheck, Calendar, IndianRupee, Car, Check, X, Sparkles, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { formatDateIST, toISTDateString } from '../../utils/istUtils';

const SmartGuestBookingSelector = ({
    bookings = [],
    selectedDate = '',
    selectedDriverId = '',
    selectedVehicleId = '',
    value = { bookingRef: '', bookingId: '', guestName: '' },
    amount = '',
    onChange
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const lastAutoSelectKey = useRef('');

    // Normalize date for comparison (YYYY-MM-DD)
    const normDate = useMemo(() => {
        if (!selectedDate) return '';
        try {
            return toISTDateString(selectedDate);
        } catch {
            return String(selectedDate).slice(0, 10);
        }
    }, [selectedDate]);

    // Find the currently selected booking object
    const selectedBooking = useMemo(() => {
        if (!value?.bookingRef && !value?.bookingId) return null;
        return bookings.find(b => 
            (value.bookingRef && String(b._id) === String(value.bookingRef)) ||
            (value.bookingId && (String(b.bookingId) === String(value.bookingId) || String(b.clientCode) === String(value.bookingId)))
        ) || null;
    }, [bookings, value?.bookingRef, value?.bookingId]);

    // Helper to check if driver is assigned to booking
    const checkDriverMatch = (b, dId, targetDate) => {
        if (!dId) return false;
        const targetStr = String(dId).toLowerCase();
        if (String(b.driver?._id || b.driver || '').toLowerCase() === targetStr) return true;
        if (String(b.assignedDriver?._id || b.assignedDriver || '').toLowerCase() === targetStr) return true;
        if (b.driver?.name && b.driver.name.toLowerCase().includes(targetStr)) return true;
        if (Array.isArray(b.itinerary)) {
            return b.itinerary.some(item => {
                const itemDId = String(item.driver?._id || item.driver || '').toLowerCase();
                if (itemDId === targetStr) return true;
                if (!targetDate) return false;
                const itemDateStr = item.date ? toISTDateString(item.date) : '';
                return itemDateStr === targetDate && itemDId === targetStr;
            });
        }
        return false;
    };

    // Helper to check if vehicle is assigned to booking
    const checkVehicleMatch = (b, vId, targetDate) => {
        if (!vId) return false;
        const targetStr = String(vId).toLowerCase();
        if (String(b.vehicle?._id || b.vehicle || '').toLowerCase() === targetStr) return true;
        if (String(b.assignedVehicle?._id || b.assignedVehicle || '').toLowerCase() === targetStr) return true;
        if (Array.isArray(b.itinerary)) {
            return b.itinerary.some(item => {
                const itemVId = String(item.vehicle?._id || item.vehicle || '').toLowerCase();
                if (itemVId === targetStr) return true;
                if (!targetDate) return false;
                const itemDateStr = item.date ? toISTDateString(item.date) : '';
                return itemDateStr === targetDate && itemVId === targetStr;
            });
        }
        return false;
    };

    // Helper to check if date falls in booking duration
    const checkDateMatch = (b, targetDate) => {
        if (!targetDate) return false;
        if (b.travelStartDate) {
            const sDate = toISTDateString(b.travelStartDate);
            const eDate = b.travelEndDate ? toISTDateString(b.travelEndDate) : sDate;
            if (targetDate >= sDate && targetDate <= eDate) return true;
        }
        if (b.pickupDate) {
            const pDate = toISTDateString(b.pickupDate);
            const dDate = b.dropDate ? toISTDateString(b.dropDate) : pDate;
            if (targetDate >= pDate && targetDate <= dDate) return true;
        }
        if (b.date) {
            const dateStr = toISTDateString(b.date);
            if (dateStr === targetDate) return true;
        }
        if (Array.isArray(b.itinerary)) {
            return b.itinerary.some(item => {
                const itemDateStr = item.date ? toISTDateString(item.date) : '';
                return itemDateStr === targetDate;
            });
        }
        return false;
    };

    // Filter and score bookings
    const scoredBookings = useMemo(() => {
        if (!bookings || bookings.length === 0) return [];

        const query = (searchQuery || '').trim().toLowerCase();

        return bookings.map(b => {
            let score = 0;
            const bClientName = (b.clientName || '').toLowerCase();
            const bClientCode = (b.clientCode || b.bookingId || '').toLowerCase();
            const bPickup = (b.pickupLocation || b.pickupCity || '').toLowerCase();
            const bDrop = (b.dropLocation || b.dropCity || '').toLowerCase();

            const isDateMatch = checkDateMatch(b, normDate);
            const isDriverMatch = checkDriverMatch(b, selectedDriverId, normDate);
            const isVehicleMatch = checkVehicleMatch(b, selectedVehicleId, normDate);

            // Exact tour start date match
            const isStartDateExact = normDate && b.travelStartDate && toISTDateString(b.travelStartDate) === normDate;

            if (isDateMatch && (isDriverMatch || isVehicleMatch)) {
                score += 500; // Perfect match: Date + Driver/Vehicle
            } else if (isDriverMatch || isVehicleMatch) {
                score += 350; // Driver or vehicle match
            } else if (isDateMatch) {
                score += 250; // Date match
            }

            if (isStartDateExact) score += 60;

            let isQueryMatch = false;
            if (query) {
                if (bClientName.includes(query) || bClientCode.includes(query) || bPickup.includes(query) || bDrop.includes(query)) {
                    isQueryMatch = true;
                    score += 1000;
                }
            } else {
                isQueryMatch = true;
            }

            return {
                booking: b,
                score,
                isDateMatch,
                isDriverMatch,
                isVehicleMatch,
                isStartDateExact,
                isQueryMatch
            };
        })
        .filter(item => {
            if (query) return item.isQueryMatch;
            return true;
        })
        .sort((a, b) => b.score - a.score);
    }, [bookings, normDate, selectedDriverId, selectedVehicleId, searchQuery]);

    // ── AUTOMATIC SMART AUTO-SELECTION ──
    // Auto-select ONLY when a Driver (or Vehicle) is selected and matches the booking on the specified date!
    useEffect(() => {
        if (!bookings || bookings.length === 0) return;

        const hasDriverOrVehicle = Boolean(selectedDriverId || selectedVehicleId);
        const currentKey = `${normDate}_${selectedDriverId || ''}_${selectedVehicleId || ''}`;

        // If no driver or vehicle is selected, never auto-select!
        if (!hasDriverOrVehicle) {
            if (lastAutoSelectKey.current && !searchQuery) {
                lastAutoSelectKey.current = '';
                onChange({
                    bookingRef: '',
                    bookingId: '',
                    guestName: '',
                    bookingObj: null
                });
            }
            return;
        }

        // If no booking is selected OR context (date/driver/vehicle) changed and user is not manually searching
        const contextChanged = lastAutoSelectKey.current !== currentKey;
        const shouldReevaluate = !selectedBooking || (contextChanged && !searchQuery);

        if (shouldReevaluate) {
            // Find candidate that matches the selected driver (and/or vehicle)
            const bestCandidate = scoredBookings.find(item => {
                if (selectedDriverId && !item.isDriverMatch) return false;
                if (selectedVehicleId && !item.isVehicleMatch) return false;
                return (item.isDriverMatch || item.isVehicleMatch);
            });

            if (bestCandidate) {
                const b = bestCandidate.booking;
                lastAutoSelectKey.current = currentKey;
                onChange({
                    bookingRef: b._id,
                    bookingId: b.clientCode || b.bookingId || '',
                    guestName: b.clientName || '',
                    bookingObj: b
                });
                setIsOpen(false);
            } else if (contextChanged && lastAutoSelectKey.current && !searchQuery) {
                // Changed driver/vehicle/date and no matching booking found for this combination
                lastAutoSelectKey.current = currentKey;
                onChange({
                    bookingRef: '',
                    bookingId: '',
                    guestName: '',
                    bookingObj: null
                });
            }
        }
    }, [scoredBookings, normDate, selectedDriverId, selectedVehicleId, selectedBooking, searchQuery]);

    const handleSelectBooking = (b) => {
        onChange({
            bookingRef: b._id,
            bookingId: b.clientCode || b.bookingId || '',
            guestName: b.clientName || '',
            bookingObj: b
        });
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClearSelection = () => {
        onChange({
            bookingRef: '',
            bookingId: '',
            guestName: '',
            bookingObj: null
        });
        setIsOpen(true);
    };

    const numAmount = Number(amount) || 0;
    const bkgTotal = Number(selectedBooking?.totalAmount || 0);
    const bkgAdv = Number(selectedBooking?.advancePaid || 0);
    const bkgDue = selectedBooking?.balanceDue !== undefined 
        ? Number(selectedBooking.balanceDue) 
        : Math.max(0, bkgTotal - bkgAdv);
    const postDeductDue = Math.max(0, bkgDue - numAmount);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                    <UserCheck size={14} /> Guest Tour Booking (Package Deduction)
                </span>
                {selectedBooking && (
                    <button
                        type="button"
                        onClick={handleClearSelection}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                    >
                        Change / Search Other
                    </button>
                )}
            </label>

            {/* Selected Booking Card Preview */}
            {selectedBooking ? (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.14) 0%, rgba(15, 23, 42, 0.75) 100%)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ color: 'white', fontWeight: '950', fontSize: '16px' }}>
                                    {selectedBooking.clientName || 'Guest'}
                                </span>
                                {selectedBooking.clientCode && (
                                    <span style={{ background: 'rgba(251, 191, 36, 0.25)', color: '#fbbf24', fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.5)' }}>
                                        {selectedBooking.clientCode}
                                    </span>
                                )}
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                    ✨ Auto Matched
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', flexWrap: 'wrap' }}>
                                {selectedBooking.travelStartDate && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={12} color="#fbbf24" />
                                        {formatDateIST(selectedBooking.travelStartDate)}
                                        {selectedBooking.travelEndDate && selectedBooking.travelEndDate !== selectedBooking.travelStartDate && (
                                            ` to ${formatDateIST(selectedBooking.travelEndDate)}`
                                        )}
                                    </span>
                                )}
                                {(selectedBooking.pickupLocation || selectedBooking.pickupCity) && (
                                    <span>• {selectedBooking.pickupLocation || selectedBooking.pickupCity}</span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearSelection}
                            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Financial Summary & Live Due Deduction Card */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: '12px',
                        padding: '10px 12px'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '700' }}>Tour Fare</div>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>₹{bkgTotal.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '700' }}>Advance Paid</div>
                            <div style={{ color: '#10b981', fontWeight: '800', fontSize: '13px' }}>₹{bkgAdv.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: '800' }}>Balance Due</div>
                            <div style={{ color: '#fbbf24', fontWeight: '950', fontSize: '14px' }}>₹{bkgDue.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Deduction Notice Banner */}
                    {numAmount > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '800' }}>
                                <Sparkles size={14} />
                                <span>₹{numAmount.toLocaleString()} will deduct from balance</span>
                            </div>
                            <div style={{ color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>₹{bkgDue.toLocaleString()}</span>
                                <ArrowRight size={12} />
                                <span style={{ color: '#10b981' }}>₹{postDeductDue.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Search / Select Booking Input & Dropdown */
                <div style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: isOpen ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        padding: '0 12px',
                        height: '50px',
                        gap: '10px'
                    }}>
                        <Search size={16} color={isOpen ? '#fbbf24' : 'rgba(255,255,255,0.4)'} />
                        <input
                            type="text"
                            placeholder="Type Guest Name or Booking Code (e.g. Puneet, 09/80)..."
                            value={searchQuery}
                            onFocus={() => setIsOpen(true)}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsOpen(true);
                            }}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '14px',
                                outline: 'none',
                                fontWeight: '600'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Matching Bookings List Dropdown */}
                    {isOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '56px',
                            left: 0,
                            right: 0,
                            zIndex: 1200,
                            background: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '14px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '6px'
                        }}>
                            {scoredBookings.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    No matching guest bookings found. Try another search.
                                </div>
                            ) : (
                                scoredBookings.map(({ booking: b, isDateMatch, isDriverMatch, isVehicleMatch, score }) => {
                                    const fare = Number(b.totalAmount || 0);
                                    const adv = Number(b.advancePaid || 0);
                                    const due = b.balanceDue !== undefined ? Number(b.balanceDue) : Math.max(0, fare - adv);

                                    return (
                                        <div
                                            key={b._id}
                                            onClick={() => handleSelectBooking(b)}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginBottom: '4px',
                                                background: score >= 200 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.02)',
                                                border: score >= 200 ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid transparent'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = score >= 200 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.02)'}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>
                                                        {b.clientName || 'Guest'}
                                                    </span>
                                                    {b.clientCode && (
                                                        <span style={{ color: '#fbbf24', fontSize: '10px', fontWeight: '900', background: 'rgba(251,191,36,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                                            {b.clientCode}
                                                        </span>
                                                    )}
                                                    {isDateMatch && (
                                                        <span style={{ color: '#10b981', fontSize: '9px', fontWeight: '800', background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                                                            📅 Active Tour
                                                        </span>
                                                    )}
                                                    {(isDriverMatch || isVehicleMatch) && (
                                                        <span style={{ color: '#38bdf8', fontSize: '9px', fontWeight: '800', background: 'rgba(56,189,248,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                                                            {isDriverMatch ? '🚗 Driver Match' : '🚙 Vehicle Match'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                    {b.travelStartDate ? formatDateIST(b.travelStartDate) : ''}
                                                    {(b.pickupLocation || b.pickupCity) ? ` • ${b.pickupLocation || b.pickupCity}` : ''}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '13px' }}>
                                                    Due: ₹{due.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                    Fare: ₹{fare.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartGuestBookingSelector;
