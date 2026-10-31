import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, CheckCircle, Plus, Trash2, Copy, Save, Search, Moon, RotateCcw } from 'lucide-react';
import axios from '../../api/axios';

const inputStyle = {
    background: '#070d18',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '7px',
    color: 'white',
    padding: '6px 10px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%'
};

const normalizePlate = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const extractDigits = (str) => {
    const m = String(str || '').match(/\d{3,4}/);
    return m ? m[0] : '';
};
const matchFleetVehicle = (vId, vNum, fleetList) => {
    if (!fleetList || fleetList.length === 0) return null;
    if (vId && vId !== 'custom' && vId !== '__custom__') {
        const byId = fleetList.find(v => String(v._id) === String(vId));
        if (byId) return byId;
    }
    if (!vNum) return null;
    const normTarget = normalizePlate(vNum);
    if (!normTarget) return null;
    const byNorm = fleetList.find(v => normalizePlate(v.carNumber) === normTarget);
    if (byNorm) return byNorm;
    const targetDigits = extractDigits(vNum);
    if (targetDigits) {
        const candidates = fleetList.filter(v => extractDigits(v.carNumber) === targetDigits);
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1) {
            const vUpper = String(vNum).toUpperCase();
            const byModel = candidates.find(v => {
                const m = (v.model || v.carType || '').toUpperCase();
                return m && vUpper.includes(m);
            });
            if (byModel) return byModel;
        }
    }
    return null;
};

// Searchable Driver Combobox
function DriverSelectDropdown({ day, idx, driversList, onSelectDriver, onSelectCustom }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const q = search.trim().toLowerCase();
    const filteredDrivers = (driversList || []).filter(d => {
        if (!q) return true;
        const name = (d.name || '').toLowerCase();
        const mob = (d.mobile || d.phone || '').toLowerCase();
        return name.includes(q) || mob.includes(q);
    });

    const isSelected = Boolean(day.driverName);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                style={{
                    ...inputStyle,
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: isSelected ? '#34d399' : 'rgba(255,255,255,0.7)',
                    border: isSelected ? '1px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(255,255,255,0.15)',
                    fontWeight: isSelected ? '800' : '600',
                    background: isSelected ? 'rgba(52, 211, 153, 0.08)' : '#070d18'
                }}
                title={day.driverName ? `${day.driverName} (${day.driverPhone || ''})` : 'Search & Select Driver'}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                    {isSelected ? `👤 ${day.driverName}` : '-- Select Driver (Search) --'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.65, flexShrink: 0 }}>
                    <Search size={12} />
                    <span style={{ fontSize: '8px' }}>▼</span>
                </span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999999,
                    background: '#0d1829', border: '1px solid #34d399', borderRadius: '8px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.85)', marginTop: '4px', maxHeight: '250px',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div style={{ padding: '6px', background: '#09111e', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Search size={13} color="#34d399" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Type driver name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '11.5px', outline: 'none' }}
                        />
                        {search && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSearch(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                        )}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                        {filteredDrivers.length > 0 ? (
                            filteredDrivers.map(drv => (
                                <div
                                    key={drv._id}
                                    onClick={() => { onSelectDriver(drv); setIsOpen(false); }}
                                    style={{
                                        padding: '6px 8px', borderRadius: '5px', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: day.driverId === drv._id ? 'rgba(52, 211, 153, 0.15)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = day.driverId === drv._id ? 'rgba(52, 211, 153, 0.15)' : 'transparent'}
                                >
                                    <span style={{ fontWeight: '800', color: '#34d399', fontSize: '12px' }}>👤 {drv.name}</span>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{drv.mobile || drv.phone}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>No drivers found for "{search}"</div>
                        )}
                        <div
                            onClick={() => { onSelectCustom(); setIsOpen(false); }}
                            style={{ padding: '7px 8px', marginTop: '3px', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fbbf24', fontSize: '11.5px', fontWeight: '800', textAlign: 'center', borderRadius: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            + Other / Outsourced Driver (Custom)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Searchable Vehicle Combobox
function VehicleSelectDropdown({ day, idx, vehiclesList, outsideVehiclesList, onSelectVehicle, onSelectCustom }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const q = search.trim().toLowerCase();
    const companyVehicles = (vehiclesList || []).filter(v => !v.isOutsideCar);
    const filteredCompany = companyVehicles.filter(v => {
        if (!q) return true;
        const num = (v.carNumber || '').toLowerCase();
        const model = (v.model || v.carType || '').toLowerCase();
        return num.includes(q) || model.includes(q);
    });

    const filteredOutside = (outsideVehiclesList || []).filter(v => {
        if (!q) return false;
        const num = (v.carNumber || v.plateNumber || '').toLowerCase();
        const owner = (v.ownerName || v.vendorName || '').toLowerCase();
        const model = (v.carType || v.model || '').toLowerCase();
        return num.includes(q) || owner.includes(q) || model.includes(q);
    });

    const isSelected = Boolean(day.vehicleNumber);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                style={{
                    ...inputStyle,
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                    border: isSelected ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255,255,255,0.15)',
                    fontWeight: isSelected ? '800' : '600',
                    background: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#070d18'
                }}
                title={day.vehicleNumber ? `${day.vehicleNumber} (${day.vehicleType || 'Cab'})` : 'Search & Select Vehicle'}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                    {isSelected ? `🚗 ${day.vehicleNumber}` : '-- Select Vehicle (Search) --'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.65, flexShrink: 0 }}>
                    <Search size={12} />
                    <span style={{ fontSize: '8px' }}>▼</span>
                </span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999999,
                    background: '#0d1829', border: '1px solid #38bdf8', borderRadius: '8px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.85)', marginTop: '4px', maxHeight: '250px',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div style={{ padding: '6px', background: '#09111e', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Search size={13} color="#38bdf8" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search car number or model (e.g. 9836, Crysta)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '11.5px', outline: 'none' }}
                        />
                        {search && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSearch(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                        )}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                        {filteredCompany.length > 0 && (
                            <div>
                                <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', padding: '3px 8px', letterSpacing: '0.4px' }}>
                                    Company Fleet ({filteredCompany.length})
                                </div>
                                {filteredCompany.map(veh => (
                                    <div
                                        key={veh._id}
                                        onClick={() => { onSelectVehicle(veh); setIsOpen(false); }}
                                        style={{
                                            padding: '6px 8px', borderRadius: '5px', cursor: 'pointer',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: day.vehicleId === veh._id ? 'rgba(56, 189, 248, 0.15)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = day.vehicleId === veh._id ? 'rgba(56, 189, 248, 0.15)' : 'transparent'}
                                    >
                                        <span style={{ fontWeight: '800', color: '#38bdf8', fontSize: '12px' }}>🚗 {veh.carNumber}</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{veh.carType || veh.model || 'Cab'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {filteredOutside.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                                <div style={{ fontSize: '9.5px', color: '#c084fc', fontWeight: '800', textTransform: 'uppercase', padding: '3px 8px', letterSpacing: '0.4px' }}>
                                    Market / Outside Cars ({filteredOutside.length})
                                </div>
                                {filteredOutside.map(veh => (
                                    <div
                                        key={veh._id || veh.carNumber}
                                        onClick={() => {
                                            onSelectVehicle({
                                                _id: 'custom',
                                                carNumber: veh.carNumber || veh.plateNumber,
                                                carType: veh.carType || veh.model,
                                                isOutsideCar: true,
                                                ownerName: veh.ownerName || veh.vendorName,
                                                buyAmount: veh.buyAmount || veh.dailyRate || veh.payout,
                                                driverName: veh.driverName || veh.driver?.name,
                                                driverPhone: veh.driverPhone || veh.driver?.mobile
                                            });
                                            setIsOpen(false);
                                        }}
                                        style={{ padding: '6px 8px', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(192, 132, 252, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div>
                                            <span style={{ fontWeight: '800', color: '#c084fc', fontSize: '12px' }}>🏢 {veh.carNumber || veh.plateNumber}</span>
                                            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.6)', marginLeft: '6px' }}>{veh.ownerName || veh.vendorName}</span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{veh.carType || veh.model}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {filteredCompany.length === 0 && filteredOutside.length === 0 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>No vehicles found for "{search}"</div>
                        )}
                        <div
                            onClick={() => { onSelectCustom(); setIsOpen(false); }}
                            style={{ padding: '7px 8px', marginTop: '3px', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fbbf24', fontSize: '11.5px', fontWeight: '800', textAlign: 'center', borderRadius: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            + Other / Outsourced Vehicle (Custom)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AssignDriverModal({ isOpen, onClose, booking, onSaved, companyId }) {
    const [driversList, setDriversList] = useState([]);
    const [vehiclesList, setVehiclesList] = useState([]);
    const [outsideVehiclesList, setOutsideVehiclesList] = useState([]);
    const [assignItinerary, setAssignItinerary] = useState([]);
    const [copySuccessMsg, setCopySuccessMsg] = useState('');
    const [savingAssignment, setSavingAssignment] = useState(false);

    useEffect(() => {
        if (isOpen && booking) {
            loadFleetAndInit();
        }
    }, [isOpen, booking]);

    const loadFleetAndInit = async () => {
        try {
            const compId = companyId || (typeof booking?.company === 'object' ? booking?.company?._id : booking?.company);
            let dList = [];
            let vList = [];
            let outVList = [];
            if (compId) {
                const [dRes, vRes, outVRes] = await Promise.all([
                    axios.get(`/api/admin/drivers/${compId}?usePagination=false&status=active`).catch(() => ({ data: [] })),
                    axios.get(`/api/admin/vehicles/${compId}?usePagination=false`).catch(() => ({ data: [] })),
                    axios.get(`/api/admin/vehicles/${compId}?usePagination=false&type=outside&includeBlocked=true`).catch(() => ({ data: [] }))
                ]);
                dList = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.drivers || []);
                vList = Array.isArray(vRes.data) ? vRes.data : (vRes.data?.vehicles || []);
                outVList = Array.isArray(outVRes.data) ? outVRes.data : (outVRes.data?.vehicles || []);
                setDriversList(dList);
                setVehiclesList(vList);
                setOutsideVehiclesList(outVList);
            }
            initAssignmentItinerary(vList, dList);
        } catch (err) {
            console.error('Error fetching fleet data for driver assignment:', err);
            initAssignmentItinerary([], []);
        }
    };

    const formatTripDate = (dateVal) => {
        if (!dateVal) return '';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return String(dateVal);
        }
    };

    const showTemporaryCopyBanner = (msg) => {
        setCopySuccessMsg(msg);
        setTimeout(() => setCopySuccessMsg(''), 3500);
    };

    const uniqueVendorsList = useMemo(() => {
        const set = new Set();
        (outsideVehiclesList || []).forEach(v => {
            if (v.ownerName?.trim()) set.add(v.ownerName.trim());
            if (v.vendorName?.trim()) set.add(v.vendorName.trim());
        });
        (vehiclesList || []).forEach(v => {
            if (v.ownerName?.trim()) set.add(v.ownerName.trim());
        });
        (assignItinerary || []).forEach(day => {
            if (day.ownerName?.trim()) set.add(day.ownerName.trim());
        });
        return Array.from(set).sort();
    }, [outsideVehiclesList, vehiclesList, assignItinerary]);

    const findMatchingOutsideVendor = (inputPlate) => {
        if (!inputPlate) return null;
        const clean = inputPlate.replace(/[\s-]/g, '').toUpperCase();
        if (!clean) return null;

        const matchedOut = (outsideVehiclesList || []).find(v => {
            const vPlate = (v.carNumber || v.plateNumber || '').replace(/[\s-]/g, '').toUpperCase();
            return vPlate && (vPlate === clean || clean.includes(vPlate) || vPlate.includes(clean));
        });
        if (matchedOut) {
            return {
                ownerName: matchedOut.ownerName || matchedOut.vendorName || '',
                buyAmount: matchedOut.buyAmount || matchedOut.dailyRate || matchedOut.payout || '',
                driverName: matchedOut.driverName || matchedOut.driver?.name || '',
                driverPhone: matchedOut.driverPhone || matchedOut.driver?.mobile || '',
                vehicleType: matchedOut.carType || matchedOut.model || ''
            };
        }

        const matchedFleet = (vehiclesList || []).find(v => {
            const vPlate = (v.carNumber || v.plateNumber || '').replace(/[\s-]/g, '').toUpperCase();
            return vPlate && (vPlate === clean || clean.includes(vPlate) || vPlate.includes(clean)) && v.ownerName;
        });
        if (matchedFleet) {
            return {
                ownerName: matchedFleet.ownerName || '',
                buyAmount: matchedFleet.buyAmount || '',
                driverName: matchedFleet.driverName || '',
                driverPhone: matchedFleet.driverPhone || '',
                vehicleType: matchedFleet.carType || matchedFleet.model || ''
            };
        }

        return null;
    };

    const initAssignmentItinerary = (currentVehicles = vehiclesList, currentDrivers = driversList) => {
        if (!booking) return;

        const sRaw = booking.travelStartDate ? new Date(booking.travelStartDate) : new Date();
        const s = isNaN(sRaw.getTime()) ? new Date() : sRaw;
        const eRaw = booking.travelEndDate ? new Date(booking.travelEndDate) : s;
        const e = isNaN(eRaw.getTime()) || eRaw < s ? s : eRaw;

        const sMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const eMidnight = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        const dateRangeDays = Math.max(1, Math.round((eMidnight - sMidnight) / 86400000) + 1);

        const excludedSet = new Set(
            Array.isArray(booking.excludedDates)
                ? booking.excludedDates.map(d => String(d).slice(0, 10))
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

        const existingItin = (Array.isArray(booking.itinerary) ? booking.itinerary : []).filter(
            it => !it.date || !excludedSet.has(String(it.date).slice(0, 10))
        );
        const existingDrs = (Array.isArray(booking.drsDuties) ? booking.drsDuties : []).filter(
            dr => !dr.date || !excludedSet.has(new Date(dr.date).toISOString().slice(0, 10))
        );

        const usedDrsIds = new Set();
        const days = [];

        const totalDays = Math.max(effectiveActiveDates.length, existingItin.length, existingDrs.length, 1);

        for (let i = 0; i < totalDays; i++) {
            const dayNo = i + 1;
            let defaultDateStr = effectiveActiveDates[i];
            if (!defaultDateStr) {
                if (effectiveActiveDates.length > 0) {
                    const baseDate = new Date(effectiveActiveDates[0]);
                    baseDate.setDate(baseDate.getDate() + i);
                    const y = baseDate.getFullYear();
                    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
                    const dNum = String(baseDate.getDate()).padStart(2, '0');
                    defaultDateStr = `${y}-${m}-${dNum}`;
                } else {
                    const curDate = new Date(sMidnight);
                    curDate.setDate(curDate.getDate() + i);
                    const y = curDate.getFullYear();
                    const m = String(curDate.getMonth() + 1).padStart(2, '0');
                    const dNum = String(curDate.getDate()).padStart(2, '0');
                    defaultDateStr = `${y}-${m}-${dNum}`;
                }
            }

            // Match itinerary item first by exact date, then by dayNo, then by array index
            const itinItem =
                existingItin.find(it => it.date && String(it.date).slice(0, 10) === defaultDateStr) ||
                existingItin.find(it => Number(it.dayNo) === dayNo) ||
                existingItin[i] ||
                {};

            // Find matching DRS duty that hasn't been matched yet
            let drsItem = existingDrs.find(dr => {
                if (usedDrsIds.has(String(dr._id))) return false;
                const dDateStr = dr.date ? new Date(dr.date).toISOString().slice(0, 10) : '';
                if (dDateStr && defaultDateStr && dDateStr === defaultDateStr) {
                    const drCar = dr.customCarNumber || dr.vehicle?.carNumber || '';
                    if (itinItem.vehicleNumber && drCar && String(drCar).trim().toLowerCase() === String(itinItem.vehicleNumber).trim().toLowerCase()) {
                        return true;
                    }
                }
                return false;
            });

            if (!drsItem) {
                drsItem = existingDrs.find(dr => {
                    if (usedDrsIds.has(String(dr._id))) return false;
                    const dDateStr = dr.date ? new Date(dr.date).toISOString().slice(0, 10) : '';
                    return dDateStr && defaultDateStr && dDateStr === defaultDateStr;
                });
            }

            if (!drsItem) {
                drsItem = existingDrs.find(dr => !usedDrsIds.has(String(dr._id)) && Number(dr.dayNo) === dayNo);
            }

            if (drsItem) usedDrsIds.add(String(drsItem._id));

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
                booking.vehicleType ||
                'Innova Crysta';

            const timeVal = drsItem?.pickupTime || drsItem?.time || itinItem.time || '09:00 AM';
            const isApgVal = drsItem?.isApg !== undefined ? Boolean(drsItem.isApg) : Boolean(itinItem.isApg || timeVal === 'APG');
            const pickupVal = drsItem?.pickupPoint || drsItem?.hotel || drsItem?.hotelName || itinItem.pickupPoint || booking.pickupLocation || '';
            const dutyVal =
                drsItem?.duty ||
                drsItem?.sightseeing ||
                drsItem?.route ||
                itinItem.duty ||
                itinItem.description ||
                (booking.tripDetails && totalDays === 1 ? booking.tripDetails : '') ||
                '';

            const amtVal =
                (drsItem?.revenue !== undefined && Number(drsItem.revenue) > 0)
                    ? Number(drsItem.revenue)
                    : (itinItem.amount !== undefined && Number(itinItem.amount) > 0 ? Number(itinItem.amount) : '');

            const fleetCars = (currentVehicles || []).filter(v => !v.isOutsideCar);
            const matchedCompCar = matchFleetVehicle(rawVehId, vehNum, fleetCars);
            const isCompanyCar = Boolean(matchedCompCar);

            const effectiveVehId = matchedCompCar ? String(matchedCompCar._id) : (rawVehId ? String(rawVehId) : '');
            const effectiveVehNum = matchedCompCar ? matchedCompCar.carNumber : vehNum;
            const effectiveVehType = matchedCompCar ? (matchedCompCar.carType || matchedCompCar.model || vehType) : vehType;

            const isOutside = !isCompanyCar && Boolean(drsItem?.isOutsideCar || itinItem.isOutsideCar || drsItem?.vendorName || itinItem.ownerName);
            const ownerNameVal = isCompanyCar ? '' : (drsItem?.vendorName || itinItem.ownerName || itinItem.vendorName || '');
            const buyAmtVal = isCompanyCar ? '' : (drsItem?.vendorPayout !== undefined ? drsItem.vendorPayout : (itinItem.buyAmount || ''));

            days.push({
                dayNo,
                date: defaultDateStr,
                time: timeVal,
                isApg: isApgVal,
                pickupPoint: pickupVal,
                duty: dutyVal,
                vehicleType: effectiveVehType,
                driverId: drvId,
                driverName: drvName,
                driverPhone: drvPhone,
                vehicleId: effectiveVehId,
                vehicleNumber: effectiveVehNum,
                isOutsideCar: isOutside,
                ownerName: ownerNameVal,
                buyAmount: buyAmtVal,
                amount: amtVal,
                km: itinItem.km || 0,
                stayType: drsItem?.stayType || itinItem?.stayType || 'Same Day Return'
            });
        }

        setAssignItinerary(days);
    };

    const handleUpdateDayDriver = (dayIdx, driverVal) => {
        const allDrivers = driversList || [];
        let drvId = '';
        let drvName = '';
        let drvPhone = '';
        let vehNum = '';
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
                }
            }
        } else if (driverVal === '__custom__') {
            drvId = 'custom';
        }

        setAssignItinerary(prev => prev.map((day, idx) => {
            if (idx !== dayIdx) return day;
            return {
                ...day,
                driverId: drvId,
                driverName: drvName || (drvId === 'custom' ? day.driverName : ''),
                driverPhone: drvPhone || (drvId === 'custom' ? day.driverPhone : ''),
                vehicleNumber: vehNum || day.vehicleNumber,
                vehicleId: vehId || day.vehicleId
            };
        }));
    };

    const handleUpdateDayVehicleSelect = (dayIdx, vehVal) => {
        const companyVehicles = (vehiclesList || []).filter(v => !v.isOutsideCar);
        let vId = '';
        let vNum = '';
        let vType = '';

        if (vehVal && vehVal !== '__custom__') {
            const found = companyVehicles.find(v => String(v._id) === String(vehVal));
            if (found) {
                vId = found._id;
                vNum = found.carNumber;
                vType = found.carType || found.model || '';
            }
        } else if (vehVal === '__custom__') {
            vId = 'custom';
        }

        setAssignItinerary(prev => prev.map((day, idx) => {
            if (idx !== dayIdx) return day;
            const isCustom = vId === 'custom';
            return {
                ...day,
                vehicleId: vId,
                vehicleNumber: isCustom ? day.vehicleNumber : vNum,
                vehicleType: vType || day.vehicleType,
                isOutsideCar: isCustom,
                ownerName: isCustom ? day.ownerName : '',
                buyAmount: isCustom ? day.buyAmount : ''
            };
        }));
    };

    const handleAddCarForDate = (idx) => {
        const target = assignItinerary[idx];
        if (!target) return;
        const newRow = {
            dayNo: target.dayNo,
            date: target.date,
            time: target.time || '09:00 AM',
            isApg: Boolean(target.isApg),
            pickupPoint: target.pickupPoint || '',
            duty: target.duty || '',
            vehicleType: target.vehicleType || booking.vehicleType || 'Innova Crysta',
            driverId: '',
            driverName: '',
            driverPhone: '',
            vehicleId: '',
            vehicleNumber: '',
            isOutsideCar: false,
            ownerName: '',
            buyAmount: '',
            amount: '',
            km: target.km || 0,
            isAdditionalCar: true,
            stayType: target.stayType || 'Same Day Return'
        };
        setAssignItinerary(prev => {
            const next = [...prev];
            next.splice(idx + 1, 0, newRow);
            return next;
        });
    };

    const handleRemoveCarRow = (idx) => {
        setAssignItinerary(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUpdateDayField = (dayIdx, field, val) => {
        setAssignItinerary(prev => prev.map((day, idx) => {
            if (idx !== dayIdx) return day;
            return {
                ...day,
                [field]: val
            };
        }));
    };

    const handleCopyDayToAll = (sourceIdx = 0, mode = 'all') => {
        const src = assignItinerary[sourceIdx];
        if (!src) return;

        const srcKey = src.date ? String(src.date).slice(0, 10) : `day_${src.dayNo}`;
        const sourceCars = assignItinerary.filter(row => {
            const k = row.date ? String(row.date).slice(0, 10) : `day_${row.dayNo}`;
            return k === srcKey;
        });

        if (sourceCars.length === 0) return;

        const distinctDaysMap = new Map();
        assignItinerary.forEach(row => {
            const k = row.date ? String(row.date).slice(0, 10) : `day_${row.dayNo}`;
            if (!distinctDaysMap.has(k)) {
                distinctDaysMap.set(k, { key: k, dayNo: row.dayNo, date: row.date, rows: [] });
            }
            distinctDaysMap.get(k).rows.push(row);
        });

        const dayKeys = Array.from(distinctDaysMap.keys());
        const srcDayIndex = dayKeys.indexOf(srcKey);
        const newItinerary = [];

        dayKeys.forEach((k, dIdx) => {
            const dayData = distinctDaysMap.get(k);
            const isSourceDay = k === srcKey;
            const isBeforeSource = dIdx < srcDayIndex;

            if (isSourceDay || (mode === 'below' && isBeforeSource)) {
                dayData.rows.forEach(r => newItinerary.push(r));
                return;
            }

            // Target day: replicate exact multi-car structure of sourceCars
            sourceCars.forEach((srcCar, cIdx) => {
                const existingCar = dayData.rows[cIdx] || dayData.rows[0] || {};
                newItinerary.push({
                    dayNo: dayData.dayNo,
                    date: dayData.date,
                    time: existingCar.time || srcCar.time || '09:00 AM',
                    isApg: existingCar.isApg !== undefined ? existingCar.isApg : Boolean(srcCar.isApg),
                    pickupPoint: existingCar.pickupPoint || srcCar.pickupPoint || '',
                    duty: existingCar.duty || srcCar.duty || '',
                    vehicleType: srcCar.vehicleType || existingCar.vehicleType || 'Innova Crysta',
                    driverId: srcCar.driverId || '',
                    driverName: srcCar.driverName || '',
                    driverPhone: srcCar.driverPhone || '',
                    vehicleId: srcCar.vehicleId || '',
                    vehicleNumber: srcCar.vehicleNumber || '',
                    isOutsideCar: Boolean(srcCar.isOutsideCar),
                    ownerName: srcCar.ownerName || '',
                    buyAmount: srcCar.buyAmount || '',
                    stayType: srcCar.stayType || 'Same Day Return',
                    amount: existingCar.amount !== undefined ? existingCar.amount : (cIdx === 0 ? srcCar.amount : ''),
                    km: existingCar.km || srcCar.km || 0,
                    isAdditionalCar: cIdx > 0
                });
            });
        });

        setAssignItinerary(newItinerary);
        const carCountText = sourceCars.length > 1 ? `${sourceCars.length} Cabs & Drivers` : 'Driver & Vehicle';
        if (mode === 'all') {
            showTemporaryCopyBanner(`Copied ${carCountText} from Day ${src.dayNo || (srcDayIndex + 1)} across all ${dayKeys.length} days! (Tours & Rates preserved)`);
        } else {
            showTemporaryCopyBanner(`Copied ${carCountText} from Day ${src.dayNo || (srcDayIndex + 1)} to days below!`);
        }
    };

    const handleSaveDriverAssignments = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            setSavingAssignment(true);
            const distinctDates = [];
            assignItinerary.forEach(d => {
                const dStr = d.date ? String(d.date).slice(0, 10) : '';
                if (dStr && !distinctDates.includes(dStr)) {
                    distinctDates.push(dStr);
                }
            });

            const companyVehicles = (vehiclesList || []).filter(v => !v.isOutsideCar);
            const normalizedItinerary = assignItinerary.map((d, idx) => {
                const dStr = d.date ? String(d.date).slice(0, 10) : '';
                const dateDayNo = dStr && distinctDates.includes(dStr) ? (distinctDates.indexOf(dStr) + 1) : (d.dayNo || idx + 1);
                const matched = matchFleetVehicle(d.vehicleId, d.vehicleNumber, companyVehicles);
                const isCompany = Boolean(matched);
                return {
                    ...d,
                    dayNo: dateDayNo,
                    duty: (d.duty || '').trim() || 'Local Sightseeing / Tour',
                    description: (d.duty || '').trim() || 'Local Sightseeing / Tour',
                    time: d.isApg ? 'APG' : (d.time || '09:00 AM'),
                    vehicle: matched ? matched._id : (d.vehicleId === 'custom' ? undefined : (d.vehicleId || undefined)),
                    vehicleId: matched ? matched._id : d.vehicleId,
                    vehicleNumber: matched ? matched.carNumber : (d.vehicleNumber || ''),
                    vehicleType: matched ? (matched.carType || matched.model || d.vehicleType) : d.vehicleType,
                    isOutsideCar: isCompany ? false : Boolean(d.isOutsideCar),
                    ownerName: isCompany ? '' : (d.ownerName || ''),
                    buyAmount: isCompany ? '' : (d.buyAmount || ''),
                    stayType: d.stayType || 'Same Day Return'
                };
            });

            if (booking._id && !String(booking._id).startsWith('bkg-mock')) {
                await axios.post(`/api/bookings/${booking._id}/assign-drivers`, {
                    itinerary: normalizedItinerary
                });
            }
            alert('Drivers, Vehicles & Duty Schedule saved and synced to Live DRS!');
            onSaved && onSaved();
            onClose();
        } catch (err) {
            console.error('Error saving driver assignments:', err);
            alert(err.response?.data?.message || 'Failed to save driver assignments');
        } finally {
            setSavingAssignment(false);
        }
    };

    if (!isOpen || !booking) return null;

    const bkgCode = booking.bookingCode || booking.bookingId || booking.rawBookingId;
    const clientName = booking.clientName || booking.guestName || 'Valued Guest';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            padding: '16px'
        }}>
            <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
                style={{
                    width: '100%',
                    maxWidth: '1060px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0b1325',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 22px',
                    background: '#0f172a',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#38bdf8'
                        }}>
                            <Car size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '17px', fontWeight: '800' }}>
                                    Assign Drivers & Vehicles
                                </h2>
                                {Array.isArray(booking.drsDuties) && booking.drsDuties.length > 0 ? (
                                    <span style={{
                                        background: 'rgba(16, 185, 129, 0.18)',
                                        color: '#34d399',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        padding: '2px 9px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '800'
                                    }}>
                                        ● Live in DRS
                                    </span>
                                ) : (
                                    <span style={{
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(245, 158, 11, 0.35)',
                                        padding: '2px 9px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '800'
                                    }}>
                                        Pending DRS Push
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                                Booking: <strong style={{ color: '#38bdf8' }}>{bkgCode}</strong> • Guest: <strong style={{ color: 'white' }}>{clientName}</strong> • Dates: <strong style={{ color: '#fbbf24' }}>{formatTripDate(assignItinerary[0]?.date || booking.travelStartDate)} to {formatTripDate(assignItinerary[assignItinerary.length - 1]?.date || booking.travelEndDate)} ({assignItinerary.length} Days)</strong> • Cab: <strong style={{ color: 'white' }}>{booking.vehicleType || 'Car'}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {assignItinerary.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleCopyDayToAll(0, 'all')}
                                style={{
                                    padding: '8px 14px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#090d16',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                }}
                                title="Fill Day 1 and click here to copy same Driver & Vehicle across all days (Tours & Rates stay individual)"
                            >
                                📋 Copy Driver & Cab to All {assignItinerary.length} Days
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                color: 'rgba(255,255,255,0.75)',
                                cursor: 'pointer',
                                padding: '6px'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
                    {copySuccessMsg && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.16)',
                            border: '1px solid rgba(52, 211, 153, 0.45)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            marginBottom: '12px',
                            color: '#6ee7b7',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <CheckCircle size={15} color="#34d399" />
                            <span>{copySuccessMsg}</span>
                        </div>
                    )}

                    {/* Column Headers */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '125px 1.15fr 1.15fr 130px 1.3fr 110px 145px',
                        gap: '10px',
                        padding: '0 12px 8px 12px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px'
                    }}>
                        <div>Day & Date</div>
                        <div style={{ color: '#34d399' }}>1. Assign Driver</div>
                        <div style={{ color: '#38bdf8' }}>2. Assign Vehicle</div>
                        <div style={{ color: '#fbbf24' }}>3. Time & Stay</div>
                        <div style={{ color: '#c084fc' }}>4. Guest Tour / Duty Details</div>
                        <div style={{ color: '#4ade80' }}>5. Amount (₹)</div>
                        <div style={{ textAlign: 'right' }}>Action</div>
                    </div>

                    {/* Day Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {assignItinerary.map((day, idx) => {
                            const allDrivers = driversList || [];
                            const allVehicles = (vehiclesList || []).filter(v => !v.isOutsideCar);
                            const matchedFleetDriver = allDrivers.find(d => String(d._id) === String(day.driverId));
                            const isCustomDriver = day.driverId === 'custom' || (!matchedFleetDriver && Boolean(day.driverName));
                            const matchedFleetVehicle = matchFleetVehicle(day.vehicleId, day.vehicleNumber, allVehicles);
                            const isCustomVehicle = !matchedFleetVehicle && (day.vehicleId === 'custom' || Boolean(day.vehicleNumber) || Boolean(day.isOutsideCar));

                            const dStr = day.date ? String(day.date).slice(0, 10) : '';
                            const sameDateItems = assignItinerary.filter(d => (d.date ? String(d.date).slice(0, 10) : '') === dStr);
                            const carIndex = sameDateItems.indexOf(day) + 1;
                            const totalCarsForDate = sameDateItems.length;

                            const distinctDates = [];
                            assignItinerary.forEach(d => {
                                const ds = d.date ? String(d.date).slice(0, 10) : '';
                                if (ds && !distinctDates.includes(ds)) distinctDates.push(ds);
                            });
                            const dayNumber = dStr && distinctDates.includes(dStr) ? (distinctDates.indexOf(dStr) + 1) : (day.dayNo || idx + 1);

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.75)',
                                        border: (day.driverName && day.vehicleNumber) ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        display: 'grid',
                                        gridTemplateColumns: '125px 1.15fr 1.15fr 130px 1.3fr 110px 145px',
                                        gap: '10px',
                                        alignItems: 'start'
                                    }}
                                >
                                    {/* Day & Date */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: '#1e3a8a',
                                                color: '#93c5fd',
                                                padding: '2px 7px',
                                                borderRadius: '5px',
                                                fontSize: '10.5px',
                                                fontWeight: '800'
                                            }}>
                                                Day {dayNumber}
                                            </span>
                                            {totalCarsForDate > 1 && (
                                                <span style={{
                                                    background: carIndex === 1 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                                    color: carIndex === 1 ? '#38bdf8' : '#c084fc',
                                                    border: carIndex === 1 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
                                                    padding: '2px 6px',
                                                    borderRadius: '5px',
                                                    fontSize: '10px',
                                                    fontWeight: '800'
                                                }}>
                                                    🚗 Car {carIndex}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>
                                            {day.date ? new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                                        </div>
                                    </div>

                                    {/* 1. Assign Driver */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <DriverSelectDropdown
                                            day={day}
                                            idx={idx}
                                            driversList={allDrivers}
                                            onSelectDriver={(drv) => {
                                                handleUpdateDayDriver(idx, drv._id);
                                            }}
                                            onSelectCustom={() => {
                                                handleUpdateDayDriver(idx, '__custom__');
                                            }}
                                        />

                                        {isCustomDriver && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Driver Name"
                                                    value={day.driverName || ''}
                                                    onChange={(e) => handleUpdateDayField(idx, 'driverName', e.target.value)}
                                                    style={{ ...inputStyle, height: '32px', fontSize: '11.5px', padding: '4px 8px' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Mobile No."
                                                    value={day.driverPhone || ''}
                                                    onChange={(e) => handleUpdateDayField(idx, 'driverPhone', e.target.value)}
                                                    style={{ ...inputStyle, height: '32px', fontSize: '11.5px', padding: '4px 8px' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Assign Vehicle */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <VehicleSelectDropdown
                                            day={day}
                                            idx={idx}
                                            vehiclesList={allVehicles}
                                            outsideVehiclesList={outsideVehiclesList}
                                            onSelectVehicle={(veh) => {
                                                if (veh._id === 'custom') {
                                                    handleUpdateDayField(idx, 'vehicleId', 'custom');
                                                    handleUpdateDayField(idx, 'vehicleNumber', veh.carNumber || '');
                                                    handleUpdateDayField(idx, 'vehicleType', veh.carType || day.vehicleType);
                                                    handleUpdateDayField(idx, 'isOutsideCar', true);
                                                    if (veh.ownerName) handleUpdateDayField(idx, 'ownerName', veh.ownerName);
                                                    if (veh.buyAmount) handleUpdateDayField(idx, 'buyAmount', veh.buyAmount);
                                                    if (veh.driverName && !day.driverName) handleUpdateDayField(idx, 'driverName', veh.driverName);
                                                    if (veh.driverPhone && !day.driverPhone) handleUpdateDayField(idx, 'driverPhone', veh.driverPhone);
                                                } else {
                                                    handleUpdateDayVehicleSelect(idx, veh._id);
                                                }
                                            }}
                                            onSelectCustom={() => {
                                                handleUpdateDayVehicleSelect(idx, '__custom__');
                                            }}
                                        />

                                        {isCustomVehicle && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Enter Car No. (e.g. RJ27 TA 1234)"
                                                    value={day.vehicleNumber || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        const matched = matchFleetVehicle(null, val, allVehicles);
                                                        if (matched) {
                                                            handleUpdateDayField(idx, 'vehicleId', matched._id);
                                                            handleUpdateDayField(idx, 'vehicleNumber', matched.carNumber);
                                                            handleUpdateDayField(idx, 'vehicleType', matched.carType || matched.model || day.vehicleType);
                                                            handleUpdateDayField(idx, 'isOutsideCar', false);
                                                            handleUpdateDayField(idx, 'ownerName', '');
                                                            handleUpdateDayField(idx, 'buyAmount', '');
                                                        } else {
                                                            const matchOut = findMatchingOutsideVendor(val);
                                                            handleUpdateDayField(idx, 'vehicleNumber', val);
                                                            handleUpdateDayField(idx, 'isOutsideCar', true);
                                                            if (matchOut) {
                                                                if (matchOut.ownerName && !day.ownerName) handleUpdateDayField(idx, 'ownerName', matchOut.ownerName);
                                                                if (matchOut.buyAmount && !day.buyAmount) handleUpdateDayField(idx, 'buyAmount', matchOut.buyAmount);
                                                                if (matchOut.driverName && !day.driverName) handleUpdateDayField(idx, 'driverName', matchOut.driverName);
                                                                if (matchOut.vehicleType && !day.vehicleType) handleUpdateDayField(idx, 'vehicleType', matchOut.vehicleType);
                                                            }
                                                        }
                                                    }}
                                                    style={{ ...inputStyle, height: '30px', fontSize: '11px', fontWeight: '700', padding: '3px 8px' }}
                                                />
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px' }}>
                                                    <input
                                                        type="text"
                                                        list="assignModalVendorList"
                                                        placeholder="Vendor / Owner Name"
                                                        value={day.ownerName || ''}
                                                        onChange={(e) => handleUpdateDayField(idx, 'ownerName', e.target.value)}
                                                        style={{ ...inputStyle, height: '28px', fontSize: '10.5px', padding: '2px 6px', color: '#c084fc' }}
                                                        title="Outside Vendor / Market Owner"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Payout (₹)"
                                                        value={day.buyAmount || ''}
                                                        onChange={(e) => handleUpdateDayField(idx, 'buyAmount', e.target.value)}
                                                        style={{ ...inputStyle, height: '28px', fontSize: '10.5px', padding: '2px 6px', color: '#f87171' }}
                                                        title="Buy Amount / Vendor Payout"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Time & Stay */}
                                    <div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            placeholder="09:00 AM"
                                            disabled={Boolean(day.isApg)}
                                            value={day.isApg ? 'APG' : (day.time || '')}
                                            onChange={(e) => handleUpdateDayField(idx, 'time', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                height: '36px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                padding: '4px 8px',
                                                color: day.isApg ? '#fbbf24' : 'white'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextApg = !day.isApg;
                                                handleUpdateDayField(idx, 'isApg', nextApg);
                                                if (nextApg) handleUpdateDayField(idx, 'time', 'APG');
                                                else if (day.time === 'APG') handleUpdateDayField(idx, 'time', '09:00 AM');
                                            }}
                                            style={{
                                                height: '36px',
                                                padding: '0 8px',
                                                borderRadius: '7px',
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                border: day.isApg ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                                                background: day.isApg ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                                                color: day.isApg ? '#fbbf24' : 'rgba(255,255,255,0.6)'
                                            }}
                                            title="As Per Guest (APG)"
                                        >
                                            APG
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateDayField(idx, 'stayType', 'Same Day Return')}
                                            title="Driver returns same day"
                                            style={{
                                                flex: 1,
                                                padding: '3px 2px',
                                                fontSize: '9.5px',
                                                fontWeight: '900',
                                                borderRadius: '5px',
                                                border: (day.stayType || 'Same Day Return') === 'Same Day Return' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                background: (day.stayType || 'Same Day Return') === 'Same Day Return' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255,255,255,0.03)',
                                                color: (day.stayType || 'Same Day Return') === 'Same Day Return' ? '#4ade80' : 'rgba(255,255,255,0.4)',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            🔄 Return
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateDayField(idx, 'stayType', 'Night Hold')}
                                            title="Driver stays overnight (Night Hold)"
                                            style={{
                                                flex: 1,
                                                padding: '3px 2px',
                                                fontSize: '9.5px',
                                                fontWeight: '900',
                                                borderRadius: '5px',
                                                border: day.stayType === 'Night Hold' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                                                background: day.stayType === 'Night Hold' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.03)',
                                                color: day.stayType === 'Night Hold' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            🌙 Hold
                                        </button>
                                    </div>
                                    </div>

                                    {/* 4. Guest Tour / Duty Details */}
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Guest Tour / Route / Pickup Details..."
                                            value={day.duty || ''}
                                            onChange={(e) => handleUpdateDayField(idx, 'duty', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                height: '36px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                padding: '4px 10px'
                                            }}
                                        />
                                    </div>

                                    {/* 5. Amount (₹) */}
                                    <div>
                                        <input
                                            type="number"
                                            placeholder="₹ Amount"
                                            value={day.amount !== undefined && day.amount !== 0 ? day.amount : ''}
                                            onChange={(e) => handleUpdateDayField(idx, 'amount', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                height: '36px',
                                                fontSize: '12.5px',
                                                fontWeight: '800',
                                                padding: '4px 10px',
                                                color: '#4ade80',
                                                border: Number(day.amount) > 0 ? '1px solid rgba(74, 222, 128, 0.45)' : '1px solid rgba(255,255,255,0.15)'
                                            }}
                                        />
                                    </div>

                                    {/* Action */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', height: '36px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleAddCarForDate(idx)}
                                            style={{
                                                padding: '5px 8px',
                                                background: 'rgba(16, 185, 129, 0.16)',
                                                color: '#34d399',
                                                border: '1px solid rgba(16, 185, 129, 0.45)',
                                                borderRadius: '6px',
                                                fontSize: '10.5px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Add an additional car for this date"
                                        >
                                            <Plus size={12} /> Car
                                        </button>

                                        {totalCarsForDate > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCarRow(idx)}
                                                style={{
                                                    padding: '5px 7px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    borderRadius: '6px',
                                                    fontSize: '10.5px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Remove this car row"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}

                                        {idx === 0 && assignItinerary.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyDayToAll(0, 'all')}
                                                style={{
                                                    padding: '5px 8px',
                                                    background: 'rgba(245, 158, 11, 0.18)',
                                                    color: '#fbbf24',
                                                    border: '1px solid rgba(245, 158, 11, 0.45)',
                                                    borderRadius: '6px',
                                                    fontSize: '10.5px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title="Copy Day 1 Driver & Vehicle to all days (preserves tour & rate)"
                                            >
                                                Copy Cab ↓
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 22px',
                    background: '#0f172a',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                        <span>
                            Package Total: <strong style={{ color: '#4ade80', fontSize: '14px' }}>
                                ₹{(assignItinerary.reduce((acc, d) => acc + (Number(d.amount) || 0), 0) || Number(booking.totalAmount) || 0).toLocaleString('en-IN')}
                            </strong>
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '9px 18px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '13px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDriverAssignments}
                            disabled={savingAssignment}
                            style={{
                                padding: '9px 20px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '900',
                                fontSize: '13px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            <Save size={16} />
                            <span>{savingAssignment ? 'Saving...' : 'Save & Sync to DRS'}</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            <datalist id="assignModalVendorList">
                {uniqueVendorsList.map((vName, vIdx) => (
                    <option key={vIdx} value={vName} />
                ))}
            </datalist>
        </div>
    );
}
