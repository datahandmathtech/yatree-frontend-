import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import {
    X, Save, Car, Clock, Plane, Train, MapPin, Users, FileText, History,
    AlertTriangle, CheckCircle, XCircle, ShieldAlert, ArrowRight, RefreshCw, Lock
} from 'lucide-react';

const DutyDetailDrawer = ({
    eventId,
    companyId,
    duty,
    fleetVehicles = [],
    drivers = [],
    vendors = [],
    rateCard = [],
    defaultTurnaroundMinutes = 30,
    onClose,
    onDutyUpdated
}) => {
    const [tab, setTab] = useState('details'); // 'details' | 'assign' | 'manifest' | 'audit'
    const [form, setForm] = useState({});
    const [historyData, setHistoryData] = useState({ changes: [], sourceRows: [], outboxEvents: [] });
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [overlapWarning, setOverlapWarning] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [vendorCancelCharge, setVendorCancelCharge] = useState(0);
    const [showCancelBox, setShowCancelBox] = useState(false);
    const [unlockReason, setUnlockReason] = useState('');

    useEffect(() => {
        if (duty) {
            setForm({ ...duty });
            setOverlapWarning(null);
            fetchHistory(duty.dutyId || duty._id);
        }
    }, [duty]);

    const getHeaders = () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        return { Authorization: `Bearer ${userInfo.token}` };
    };

    const fetchHistory = async (dKey) => {
        if (!eventId || !dKey) return;
        setLoadingHistory(true);
        try {
            const { data } = await axios.get(
                `/api/admin/events/${eventId}/duties/${dKey}/history?companyId=${companyId}`,
                { headers: getHeaders() }
            );
            setHistoryData({
                changes: data.changes || [],
                sourceRows: data.sourceRows || [],
                outboxEvents: data.outboxEvents || []
            });
        } catch (err) {
            console.error('Error loading duty history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSaveDetails = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                companyId,
                version: duty.version,
                changeType: 'DrawerEdit',
                reason: unlockReason || form.overrideReason || 'Drawer update',
                unlockCorrection: Boolean((duty.status === 'Completed' || duty.isLocked) && unlockReason.trim())
            };
            const { data } = await axios.patch(
                `/api/admin/events/${eventId}/duties/${duty.dutyId || duty._id}?companyId=${companyId}`,
                payload,
                { headers: getHeaders() }
            );
            onDutyUpdated(data.duty);
            if (data.turnaroundConflict?.conflict) {
                alert(`Saved, but Turnaround Warning: ${data.turnaroundConflict.message}`);
            } else {
                alert(`✓ Saved ${data.duty.dutyId} (v${data.duty.version}) & synced!`);
            }
            fetchHistory(duty.dutyId || duty._id);
        } catch (err) {
            if (err.response?.status === 409) {
                alert('⚠ Version Conflict: Someone else modified this duty. Reloading latest server state.');
                if (err.response?.data?.serverDuty) onDutyUpdated(err.response.data.serverDuty);
            } else {
                alert(err.response?.data?.message || err.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAssignVehicle = async (forceAssign = false) => {
        setAssigning(true);
        setOverlapWarning(null);
        try {
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/duties/${duty.dutyId || duty._id}/assign?companyId=${companyId}`,
                {
                    companyId,
                    vehicleSource: form.vehicleSource || 'Own',
                    vehicleId: form.vehicle || null,
                    vehicleNumber: form.vehicleNumber || '',
                    driverId: form.driver || null,
                    driverName: form.driverName || '',
                    driverPhone: form.driverPhone || '',
                    vendorName: form.vendorName || '',
                    vendorCost: Number(form.vendorCost) || 0,
                    vendorCostApproved: Boolean(form.vendorCostApproved),
                    forceAssign
                },
                { headers: getHeaders() }
            );
            onDutyUpdated(data.duty);
            alert(`✓ Vehicle assigned & synced (${data.duty.vehicleSource === 'Vendor' ? 'DRS + Vendor Book' : 'DRS + Fleet Calendar'})!`);
            fetchHistory(duty.dutyId || duty._id);
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.conflict) {
                setOverlapWarning(err.response.data);
            } else {
                alert('Assignment failed: ' + (err.response?.data?.message || err.message));
            }
        } finally {
            setAssigning(false);
        }
    };

    const handleCancelDuty = async () => {
        if (!cancelReason.trim()) {
            alert('Please enter an explicit cancellation reason (missing rows never auto-cancel).');
            return;
        }
        try {
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/duties/${duty.dutyId || duty._id}/cancel?companyId=${companyId}`,
                { companyId, reason: cancelReason, vendorCancellationCharge: Number(vendorCancelCharge) || 0 },
                { headers: getHeaders() }
            );
            onDutyUpdated(data.duty);
            setShowCancelBox(false);
            alert(`Duty ${data.duty.dutyId} explicitly marked Cancelled across Live Sheet & DRS.`);
            fetchHistory(duty.dutyId || duty._id);
        } catch (err) {
            alert('Cancel failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateReturnLeg = async () => {
        try {
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/duties/${duty.dutyId || duty._id}/return-leg?companyId=${companyId}`,
                { companyId },
                { headers: getHeaders() }
            );
            onDutyUpdated(data.returnDuty, true);
            alert(`✓ Created Return Leg duty ${data.returnDuty.dutyId} (${data.returnDuty.pickupPoint} -> ${data.returnDuty.dropLocation})`);
        } catch (err) {
            alert('Failed creating return leg: ' + (err.response?.data?.message || err.message));
        }
    };

    if (!duty) return null;

    const svc = (form.serviceType || 'ARRIVAL').toUpperCase();
    const isCompletedLocked = (duty.status === 'Completed' || duty.isLocked) && !unlockReason.trim();

    // Live Disposal preview calculation
    const rateItem = rateCard.find(rc => String(rc.serviceName || '').toUpperCase().includes('DISPOS')) || {};
    const calcActualHours = (() => {
        const s = String(form.actualStartTime || form.guestPickup || '').split(':');
        const e = String(form.actualEndTime || '').split(':');
        if (s.length < 2 || e.length < 2 || !form.actualEndTime) return 0;
        let diff = (parseInt(e[0], 10) * 60 + parseInt(e[1], 10)) - (parseInt(s[0], 10) * 60 + parseInt(s[1], 10));
        if (diff < 0) diff += 1440;
        return Number((diff / 60).toFixed(2));
    })();
    const extraHoursPreview = Math.max(0, Number((calcActualHours - (Number(form.disposalHours) || 8)).toFixed(2)));
    const extraKmPreview = Math.max(0, (Number(form.actualKm) || 0) - (Number(form.disposalKm) || 80));

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10100, background: 'rgba(3,7,18,0.75)',
            backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end'
        }} onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 'min(100%, 620px)', height: '100vh', background: '#0b1222',
                    borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column',
                    color: '#f8fafc', overflow: 'hidden'
                }}
            >
                {/* HEADER */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '950', color: '#38bdf8' }}>{duty.dutyId}</span>
                            <span style={{ fontSize: '11px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                                {svc}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.45)' }}>
                                v{duty.version} • {duty.syncStatus}
                            </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginTop: '4px' }}>
                            {duty.guestGroup} ({duty.pax} PAX)
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* COMPLETED LOCK BANNER */}
                {(duty.status === 'Completed' || duty.isLocked) && (
                    <div style={{ padding: '10px 24px', background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <Lock size={14} color="#fbbf24" />
                        <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800' }}>Completed Duty Locked. Reason to unlock edit:</span>
                        <input
                            type="text"
                            placeholder="Authorised correction reason..."
                            value={unlockReason}
                            onChange={(e) => setUnlockReason(e.target.value)}
                            style={{ flex: 1, minWidth: '180px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(251,191,36,0.35)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }}
                        />
                    </div>
                )}

                {/* TABS */}
                <div style={{ display: 'flex', gap: '6px', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                    {[
                        { id: 'details', label: 'Service & Time' },
                        { id: 'assign', label: 'Assign Car / Vendor' },
                        { id: 'manifest', label: `Guests & Sources (${duty.guests?.length || 1})` },
                        { id: 'audit', label: `Audit History (${historyData.changes.length})` }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap',
                                background: tab === t.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                                color: tab === t.id ? '#38bdf8' : 'rgba(255,255,255,0.6)'
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* BODY */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {tab === 'details' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Guest / Group</label>
                                    <input type="text" value={form.guestGroup || ''} onChange={e => setForm({ ...form, guestGroup: e.target.value })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>PAX & Car Type</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <input type="number" min="1" value={form.pax || 1} onChange={e => setForm({ ...form, pax: Number(e.target.value) })}
                                            style={{ width: '70px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }} />
                                        <input type="text" value={form.carType || ''} onChange={e => setForm({ ...form, carType: e.target.value })}
                                            style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Pickup Date</label>
                                    <input type="date" value={form.pickupDate || ''} onChange={e => setForm({ ...form, pickupDate: e.target.value })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', colorScheme: 'dark' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Guest Pickup Time (Separate from Flight)</label>
                                    <input type="text" value={form.guestPickup || ''} onChange={e => setForm({ ...form, guestPickup: e.target.value, manualPickupOverride: true })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', fontWeight: '900' }} />
                                </div>
                            </div>

                            {/* CONDITIONAL: ARRIVAL / DEPARTURE FLIGHT OR TRAIN */}
                            {(svc === 'ARRIVAL' || svc === 'DEPARTURE') && (
                                <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#38bdf8' }}>
                                            {svc === 'DEPARTURE' ? 'Departure Flight / Train & Lead Override' : 'Arrival Flight / Train Details (Optional)'}
                                        </span>
                                        {svc === 'DEPARTURE' && (
                                            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#fbbf24' }}>
                                                <input type="checkbox" checked={Boolean(form.isStation)} onChange={e => setForm({ ...form, isStation: e.target.checked, pickupLeadMinutes: e.target.checked ? 60 : 120 })} />
                                                Station / Train (custom lead)
                                            </label>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Flight/Train Date</label>
                                            <input type="date" value={form.flightDate || ''} onChange={e => setForm({ ...form, flightDate: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', colorScheme: 'dark' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Flight/Train Time</label>
                                            <input type="text" placeholder="18:00" value={form.flightTime || ''} onChange={e => setForm({ ...form, flightTime: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Flight / Train No.</label>
                                            <input type="text" placeholder="6E-742" value={form.flightNumber || ''} onChange={e => setForm({ ...form, flightNumber: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                    </div>
                                    {svc === 'DEPARTURE' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '8px', alignItems: 'center' }}>
                                            <div>
                                                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Lead (mins)</label>
                                                <input type="number" value={form.pickupLeadMinutes ?? 120} onChange={e => setForm({ ...form, pickupLeadMinutes: Number(e.target.value), manualPickupOverride: false })}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Override Reason</label>
                                                <input type="text" placeholder="Hotel distance buffer..." value={form.overrideReason || ''} onChange={e => setForm({ ...form, overrideReason: e.target.value })}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                            </div>
                                            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '14px', color: '#34d399' }}>
                                                <input type="checkbox" checked={Boolean(form.pickupConfirmed)} onChange={e => setForm({ ...form, pickupConfirmed: e.target.checked })} />
                                                Confirmed
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CONDITIONAL: DISPOSAL */}
                            {svc === 'DISPOSAL' && (
                                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#34d399' }}>Disposal Package & Extra Hours / KM Tracker</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Package Preset</label>
                                            <select
                                                value={form.disposalPackage || '8h / 80km'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const h = val.startsWith('4h') ? 4 : val.startsWith('12h') ? 12 : 8;
                                                    const km = val.startsWith('4h') ? 40 : val.startsWith('12h') ? 120 : 80;
                                                    setForm({ ...form, disposalPackage: val, disposalHours: h, disposalKm: km });
                                                }}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '12px' }}
                                            >
                                                <option value="4h / 40km">4h / 40km</option>
                                                <option value="8h / 80km">8h / 80km</option>
                                                <option value="12h / 120km">12h / 120km</option>
                                                <option value="Custom">Custom</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Incl. Hours</label>
                                            <input type="number" value={form.disposalHours || 8} onChange={e => setForm({ ...form, disposalHours: Number(e.target.value) })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Incl. KM</label>
                                            <input type="number" value={form.disposalKm || 80} onChange={e => setForm({ ...form, disposalKm: Number(e.target.value) })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Actual Start</label>
                                            <input type="text" placeholder={form.guestPickup || '09:00'} value={form.actualStartTime || ''} onChange={e => setForm({ ...form, actualStartTime: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Actual Release</label>
                                            <input type="text" placeholder="19:00" value={form.actualEndTime || ''} onChange={e => setForm({ ...form, actualEndTime: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Actual KM</label>
                                            <input type="number" value={form.actualKm || 0} onChange={e => setForm({ ...form, actualKm: Number(e.target.value) })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                    </div>
                                    {(extraHoursPreview > 0 || extraKmPreview > 0) && (
                                        <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800' }}>
                                            ⚡ Potential Extras Flagged: +{extraHoursPreview} hrs {extraKmPreview > 0 ? `/ +${extraKmPreview} km` : ''} (Est. Extra ₹{Math.round(extraHoursPreview * (Number(rateItem.extraHourRate) || 0) + extraKmPreview * (Number(rateItem.extraKmRate) || 0))})
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CONDITIONAL: INTERCITY */}
                            {svc === 'INTERCITY' && (
                                <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#c084fc' }}>Intercity Route, Stopovers & Return Leg</span>
                                        <button
                                            type="button"
                                            onClick={handleCreateReturnLeg}
                                            style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.4)', color: 'white', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            + Create Return Leg
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Route</label>
                                            <input type="text" placeholder="Udaipur -> Jaipur" value={form.intercityRoute || ''} onChange={e => setForm({ ...form, intercityRoute: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Stopovers / Expected Drop ETA</label>
                                            <input type="text" placeholder="Nathdwara / ETA 14:30" value={form.stopovers || ''} onChange={e => setForm({ ...form, stopovers: e.target.value })}
                                                style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Pickup / Reporting Location</label>
                                    <input type="text" value={form.pickupPoint || ''} onChange={e => setForm({ ...form, pickupPoint: e.target.value })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Drop / Destination</label>
                                    <input type="text" value={form.dropLocation || ''} onChange={e => setForm({ ...form, dropLocation: e.target.value })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Client / Duty Fare (₹)</label>
                                    <input type="number" value={form.dutyAmount || 0} onChange={e => setForm({ ...form, dutyAmount: Number(e.target.value) })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Status</label>
                                    <select value={form.status || 'Scheduled'} onChange={e => setForm({ ...form, status: e.target.value })}
                                        style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Dispatched">Dispatched</option>
                                        <option value="Running">Running</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Operational Remarks</label>
                                <textarea rows={2} value={form.remarks || ''} onChange={e => setForm({ ...form, remarks: e.target.value })}
                                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                            </div>

                            {/* EXPLICIT CANCELLATION SECTION */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                                <button type="button" onClick={() => setShowCancelBox(!showCancelBox)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                                    {showCancelBox ? 'Hide Cancellation Form' : 'Cancel This Duty Explicitly...'}
                                </button>
                                {showCancelBox && (
                                    <div style={{ marginTop: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input type="text" placeholder="Cancellation reason (required)" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                                            style={{ width: '100%', padding: '7px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', color: 'white', fontSize: '12px' }} />
                                        {form.vehicleSource === 'Vendor' && (
                                            <input type="number" placeholder="Vendor cancellation charge (₹)" value={vendorCancelCharge} onChange={e => setVendorCancelCharge(e.target.value)}
                                                style={{ width: '100%', padding: '7px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', color: 'white', fontSize: '12px' }} />
                                        )}
                                        <button type="button" onClick={handleCancelDuty} style={{ padding: '8px 14px', borderRadius: '8px', background: '#ef4444', border: 'none', color: 'white', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
                                            Confirm Explicit Cancellation
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'assign' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['Own', 'Vendor'].map(src => (
                                    <button
                                        key={src}
                                        type="button"
                                        onClick={() => setForm({ ...form, vehicleSource: src })}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '900', fontSize: '13px', cursor: 'pointer',
                                            background: form.vehicleSource === src ? (src === 'Vendor' ? 'rgba(168,85,247,0.25)' : 'rgba(16,185,129,0.22)') : 'rgba(255,255,255,0.04)',
                                            border: form.vehicleSource === src ? `1px solid ${src === 'Vendor' ? '#a855f7' : '#10b981'}` : '1px solid rgba(255,255,255,0.08)',
                                            color: 'white'
                                        }}
                                    >
                                        {src === 'Own' ? 'Own Fleet Vehicle' : 'Outside Vendor Car'}
                                    </button>
                                ))}
                            </div>

                            {form.vehicleSource === 'Own' ? (
                                <>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Select Physical Own Fleet Vehicle</label>
                                        <select
                                            value={form.vehicle || ''}
                                            onChange={(e) => {
                                                const v = fleetVehicles.find(x => x._id === e.target.value);
                                                setForm({
                                                    ...form,
                                                    vehicle: v?._id || null,
                                                    vehicleNumber: v?.carNumber || form.vehicleNumber,
                                                    driver: v?.currentDriver?._id || form.driver,
                                                    driverName: v?.currentDriver?.name || form.driverName,
                                                    driverPhone: v?.currentDriver?.mobile || v?.currentDriver?.phone || form.driverPhone
                                                });
                                            }}
                                            style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '13px' }}
                                        >
                                            <option value="">-- Choose Fleet Car or Type Plate Below --</option>
                                            {fleetVehicles.map(v => (
                                                <option key={v._id} value={v._id}>
                                                    {v.carNumber} ({v.model}) {v.currentDriver?.name ? `- ${v.currentDriver.name}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Vehicle Number</label>
                                            <input type="text" value={form.vehicleNumber || ''} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                                                style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', fontWeight: '800' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Assign Driver</label>
                                            <select
                                                value={form.driver || ''}
                                                onChange={(e) => {
                                                    const dr = drivers.find(x => x._id === e.target.value);
                                                    setForm({ ...form, driver: dr?._id || null, driverName: dr?.name || '', driverPhone: dr?.mobile || dr?.phone || '' });
                                                }}
                                                style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '12px' }}
                                            >
                                                <option value="">-- Choose Driver --</option>
                                                {drivers.map(dr => (
                                                    <option key={dr._id} value={dr._id}>{dr.name} ({dr.mobile || dr.phone || ''})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Vendor Name (Vendor Book)</label>
                                            <input
                                                type="text"
                                                list="event-excel-vendors"
                                                value={form.vendorName || ''}
                                                onChange={e => setForm({ ...form, vendorName: e.target.value })}
                                                placeholder="Enter or select vendor..."
                                                style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                            />
                                            <datalist id="event-excel-vendors">
                                                {vendors.map(v => <option key={v} value={v} />)}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Outside Vehicle Number</label>
                                            <input type="text" value={form.vehicleNumber || ''} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                                                placeholder="RJ27-..."
                                                style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#c084fc', fontWeight: '800' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Agreed Vendor Buy Cost (₹)</label>
                                            <input type="number" value={form.vendorCost || 0} onChange={e => setForm({ ...form, vendorCost: Number(e.target.value) })}
                                                style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                        </div>
                                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '18px', color: '#34d399', fontWeight: '700' }}>
                                            <input type="checkbox" checked={Boolean(form.vendorCostApproved)} onChange={e => setForm({ ...form, vendorCostApproved: e.target.checked })} />
                                            Vendor Cost Independently Approved
                                        </label>
                                    </div>
                                </>
                            )}

                            {overlapWarning && (
                                <div style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.45)', borderRadius: '12px', padding: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={15} /> Turnaround / Schedule Conflict ({defaultTurnaroundMinutes}m buffer)
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{overlapWarning.message}</div>
                                    <button
                                        type="button"
                                        onClick={() => handleAssignVehicle(true)}
                                        style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '8px', background: '#ef4444', border: 'none', color: 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        Override Turnaround Conflict & Assign Anyway
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={assigning}
                                onClick={() => handleAssignVehicle(false)}
                                style={{ padding: '10px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', color: 'white', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {assigning ? 'Checking Turnaround & Syncing...' : 'Check Availability & Assign Vehicle'}
                            </button>
                        </div>
                    )}

                    {tab === 'manifest' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '900', color: '#38bdf8' }}>
                                    Passenger Groups in This Vehicle ({duty.pax} Total PAX)
                                </h4>
                                {(duty.guests && duty.guests.length > 0 ? duty.guests : [{ guestGroup: duty.guestGroup, pax: duty.pax }]).map((g, i) => (
                                    <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{g.guestGroup} {g.partySide ? `[${g.partySide}]` : ''}</span>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#fbbf24' }}>{g.pax} PAX</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                    Original Client Workbook Source Evidence ({(duty.sourceLinks || []).length})
                                </h4>
                                {(duty.sourceLinks || []).length === 0 ? (
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                        {duty.rawSourceSheet ? `${duty.rawSourceSheet} Row ${duty.rawSourceRow}` : 'Created manually on Live Event Sheet.'}
                                    </div>
                                ) : (
                                    (duty.sourceLinks || []).map((sl, i) => (
                                        <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px', fontSize: '12px' }}>
                                            <div style={{ fontWeight: '800', color: 'white' }}>Sheet: {sl.sheetName} • Row #{sl.rowNumber}</div>
                                            {sl.rawSnippet && <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>{sl.rawSnippet}</div>}
                                        </div>
                                    ))
                                )}
                                {historyData.sourceRows.length > 0 && (
                                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                        Raw Excel Array Evidence: {JSON.stringify(historyData.sourceRows[0]?.rawData)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'audit' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {loadingHistory ? (
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Loading audit trail...</div>
                            ) : historyData.changes.length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>No edits recorded yet.</div>
                            ) : historyData.changes.map(c => (
                                <div key={c._id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.45)', fontSize: '10px' }}>
                                        <span>v{c.version} • {c.changeType} by {c.changedByName || 'Admin'}</span>
                                        <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                                    </div>
                                    <div style={{ marginTop: '4px', color: 'white', fontWeight: '700' }}>
                                        {c.field}: <span style={{ color: '#f87171' }}>{String(c.oldValue ?? '—')}</span> → <span style={{ color: '#34d399' }}>{String(c.newValue ?? '—')}</span>
                                    </div>
                                    {c.reason && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{c.reason}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                {tab === 'details' && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                            Close
                        </button>
                        <button
                            disabled={saving || isCompletedLocked}
                            onClick={handleSaveDetails}
                            style={{
                                padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none', color: 'white', fontWeight: '900', cursor: (saving || isCompletedLocked) ? 'not-allowed' : 'pointer',
                                opacity: isCompletedLocked ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Save size={15} /> {saving ? 'Saving...' : 'Save Duty Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DutyDetailDrawer;
