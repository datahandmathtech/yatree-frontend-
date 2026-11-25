import React, { useState, useMemo } from 'react';
import axios from '../../api/axios';
import {
    Users, Car, Check, ArrowRight, Layers, Plus, Trash2, FileSpreadsheet, Split
} from 'lucide-react';

const StageConsolidationView = ({
    eventId,
    companyId,
    activeBatch,
    movements = [],
    initialProposed = [],
    onCommitted,
    onBackToReconcile
}) => {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [consolidationGroups, setConsolidationGroups] = useState([]);
    const [mergeCarType, setMergeCarType] = useState('Urbania');
    const [committing, setCommitting] = useState(false);

    const groupedKeySet = useMemo(() => {
        const s = new Set();
        consolidationGroups.forEach(g => (g.movementKeys || []).forEach(k => s.add(String(k))));
        return s;
    }, [consolidationGroups]);

    const toggleKey = (key) => {
        setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const handleMergeSelectedIntoOneCar = () => {
        if (selectedKeys.length < 2) {
            alert('Select at least 2 guest movements to combine into a shared vehicle.');
            return;
        }
        const selectedMovs = movements.filter(m => selectedKeys.includes(String(m._id || m.movementKey)));
        const first = selectedMovs[0];
        const diffService = selectedMovs.some(m => m.serviceType !== first.serviceType);
        if (diffService && !window.confirm('Selected movements have different service types. Continue combining into one vehicle duty?')) {
            return;
        }

        const totalPax = selectedMovs.reduce((s, m) => s + (Number(m.pax) || 1), 0);
        const label = selectedMovs.map(m => m.guestGroup).join(' + ');
        setConsolidationGroups(prev => [
            ...prev,
            {
                id: `grp-${Date.now()}`,
                movementIds: selectedMovs.map(m => String(m._id || m.movementKey)),
                movementKeys: selectedMovs.map(m => String(m._id || m.movementKey)),
                carType: mergeCarType,
                label,
                totalPax,
                guests: selectedMovs
            }
        ]);
        setSelectedKeys([]);
    };

    const handleRemoveGroup = (grpId) => {
        setConsolidationGroups(prev => prev.filter(g => g.id !== grpId));
    };

    const ungroupedMovements = useMemo(() => {
        return movements.filter(m => !groupedKeySet.has(String(m._id || m.movementKey)));
    }, [movements, groupedKeySet]);

    const handleCommitToLiveSheet = async () => {
        if (!activeBatch?._id) return;
        setCommitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/imports/${activeBatch._id}/commit?companyId=${companyId}`,
                {
                    companyId,
                    consolidationGroups
                },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            onCommitted(data);
        } catch (err) {
            console.error('Commit error:', err);
            alert('Error committing approved vehicle duties: ' + (err.response?.data?.message || err.message));
        } finally {
            setCommitting(false);
        }
    };

    if (!activeBatch || movements.length === 0) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.5)', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)', padding: '36px', textAlign: 'center'
            }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
                    Complete Step 3 Reconciliation first to view approved unique guest movements for vehicle consolidation.
                </p>
                <button
                    onClick={onBackToReconcile}
                    style={{ padding: '10px 20px', borderRadius: '12px', background: '#2563eb', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}
                >
                    Go to Reconciliation
                </button>
            </div>
        );
    }

    const totalProposedCars = consolidationGroups.length + ungroupedMovements.length;
    const totalPax = movements.reduce((s, m) => s + (Number(m.pax) || 1), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* HEADER */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.55)', borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)', padding: '18px 22px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '950', color: 'white' }}>
                        Screen C: Guest-to-Car Consolidation & Passenger Manifest
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        {movements.length} unique guest group movement(s) • {totalPax} Total PAX → Resulting in <strong style={{ color: '#38bdf8' }}>{totalProposedCars} vehicle duty/duties</strong>. System never auto-shares different guest groups without your confirmation.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedKeys.length >= 2 && (
                        <>
                            <select
                                value={mergeCarType}
                                onChange={(e) => setMergeCarType(e.target.value)}
                                style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '9px 12px', borderRadius: '10px', fontSize: '12px' }}
                            >
                                <option value="Sedan">Sedan</option>
                                <option value="Crysta">Crysta</option>
                                <option value="Urbania">Urbania</option>
                                <option value="Tempo 12 Seater">Tempo 12s</option>
                                <option value="Tempo 17 Seater">Tempo 17s</option>
                                <option value="Bus 35 Seater">Bus 35s</option>
                            </select>
                            <button
                                onClick={handleMergeSelectedIntoOneCar}
                                style={{
                                    padding: '10px 16px', borderRadius: '12px',
                                    background: 'rgba(56, 189, 248, 0.16)', border: '1px solid rgba(56, 189, 248, 0.4)',
                                    color: '#38bdf8', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Layers size={14} /> Combine {selectedKeys.length} into 1 Vehicle
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleCommitToLiveSheet}
                        disabled={committing || activeBatch.status === 'Committed'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '12px 22px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none', color: 'white', fontSize: '13px', fontWeight: '900', cursor: 'pointer'
                        }}
                    >
                        <Check size={16} strokeWidth={3} />
                        {activeBatch.status === 'Committed' ? 'Already Committed' : (committing ? 'Committing to Live Sheet...' : `Approve ${totalProposedCars} Vehicle Duties & Sync`)}
                    </button>
                </div>
            </div>

            {/* OPERATOR-CONSOLIDATED SHARED VEHICLE GROUPS */}
            {consolidationGroups.length > 0 && (
                <div style={{
                    background: 'rgba(56, 189, 248, 0.06)', borderRadius: '18px',
                    border: '1px solid rgba(56, 189, 248, 0.25)', padding: '18px',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#38bdf8' }}>
                        Shared Car Allocations ({consolidationGroups.length})
                    </h4>
                    {consolidationGroups.map(grp => (
                        <div key={grp.id} style={{
                            background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                                    {grp.carType} — {grp.totalPax} PAX Combined ({grp.guests.length} groups)
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                    Manifest: {grp.guests.map(g => `${g.guestGroup} (${g.pax})`).join(' | ')}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveGroup(grp.id)}
                                style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Unmerge
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* INDIVIDUAL UNIQUE GUEST MOVEMENTS TABLE */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.5)', borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 14px', width: '40px' }}></th>
                            <th style={{ padding: '12px 14px' }}>Guest / Group</th>
                            <th style={{ padding: '12px 10px' }}>PAX</th>
                            <th style={{ padding: '12px 12px' }}>Service</th>
                            <th style={{ padding: '12px 12px' }}>Pickup Date & Time</th>
                            <th style={{ padding: '12px 12px' }}>Flight / Train</th>
                            <th style={{ padding: '12px 12px' }}>Route</th>
                            <th style={{ padding: '12px 12px' }}>Proposed Car</th>
                            <th style={{ padding: '12px 12px' }}>Source Evidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ungroupedMovements.map(m => {
                            const key = String(m._id || m.movementKey);
                            const isChecked = selectedKeys.includes(key);
                            return (
                                <tr
                                    key={key}
                                    onClick={() => toggleKey(key)}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: isChecked ? 'rgba(56,189,248,0.1)' : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <td style={{ padding: '10px 14px' }}>
                                        <input type="checkbox" checked={isChecked} onChange={() => {}} />
                                    </td>
                                    <td style={{ padding: '10px 14px', fontWeight: '800', fontSize: '13px', color: 'white' }}>
                                        {m.guestGroup}
                                        {m.partySide && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#fbbf24' }}>[{m.partySide}]</span>}
                                    </td>
                                    <td style={{ padding: '10px 10px', fontWeight: '900', color: '#38bdf8', fontSize: '13px' }}>{m.pax}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '900', color: m.serviceType === 'DEPARTURE' ? '#f59e0b' : '#10b981' }}>{m.serviceType}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'white' }}>
                                        {m.pickupDate} <strong style={{ color: '#fbbf24' }}>{m.guestPickup}</strong>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                        {m.flightTime ? `${m.flightDate} ${m.flightTime}` : '—'} {m.flightNumber}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                                        {m.pickupPoint} → {m.dropLocation}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', color: '#a855f7' }}>{m.carType}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                        {(m.sourceLinks || []).map(sl => `${sl.sheetName} R${sl.rowNumber}`).join(', ') || `${m.sourceSheet} R${m.sourceRow}`}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StageConsolidationView;
