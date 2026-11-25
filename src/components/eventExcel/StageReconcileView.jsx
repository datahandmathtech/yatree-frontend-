import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import {
    AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, Lock,
    Split, Layers, Clock, FileWarning, Check
} from 'lucide-react';

const StageReconcileView = ({
    eventId,
    companyId,
    activeBatch,
    reconciliation,
    initialDecisions = {},
    onDecisionsSaved,
    onBackToMap
}) => {
    const [decisions, setDecisions] = useState(initialDecisions || {});
    const [movementPatches, setMovementPatches] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setDecisions(initialDecisions || {});
    }, [initialDecisions]);

    if (!activeBatch || !reconciliation) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.5)', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)', padding: '40px', textAlign: 'center'
            }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
                    Stage a client workbook in Step 1 & 2 first to review duplicates, revisions, and missing fields.
                </p>
                <button
                    onClick={onBackToMap}
                    style={{
                        padding: '10px 20px', borderRadius: '12px', background: '#2563eb',
                        color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer'
                    }}
                >
                    Go to Step 1: Upload & Map
                </button>
            </div>
        );
    }

    const summary = reconciliation.summary || {};
    const possibleDuplicates = reconciliation.possibleDuplicates || [];
    const changedItems = reconciliation.changedItems || [];
    const missingDetails = reconciliation.missingDetails || [];
    const retainedLiveDuties = reconciliation.retainedLiveDuties || [];

    const setDecision = (itemId, payload) => {
        setDecisions(prev => ({ ...prev, [itemId]: payload }));
    };

    const setPatchValue = (movId, movKey, field, val) => {
        const k = movKey || movId;
        setMovementPatches(prev => ({
            ...prev,
            [k]: { ...(prev[k] || { movementId: movId, movementKey: movKey }), [field]: val }
        }));
    };

    const handleProceedToConsolidation = async () => {
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/imports/${activeBatch._id}/decisions?companyId=${companyId}`,
                {
                    companyId,
                    decisions,
                    movementPatches: Object.values(movementPatches)
                },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            onDecisionsSaved(data);
        } catch (err) {
            console.error('Save decisions error:', err);
            alert('Error saving reconciliation decisions: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* SUMMARY PILLS BAR */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.55)', borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)', padding: '18px 22px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '950', color: 'white' }}>
                        Screen B: Reconciliation Review (Rev #{activeBatch.revisionNumber} — {activeBatch.fileName})
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: 'rgba(16,185,129,0.16)', color: '#34d399' }}>
                            New: {summary.newCount || 0}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: 'rgba(245,158,11,0.16)', color: '#fbbf24' }}>
                            Possible Duplicates: {possibleDuplicates.length}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: 'rgba(56,189,248,0.16)', color: '#38bdf8' }}>
                            Changed / Revisions: {changedItems.length}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: 'rgba(239,68,68,0.16)', color: '#f87171' }}>
                            Missing Details: {missingDetails.length}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                            Unchanged: {summary.unchangedCount || 0}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleProceedToConsolidation}
                    disabled={submitting}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 22px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        border: 'none', color: 'white', fontSize: '13px', fontWeight: '900', cursor: 'pointer'
                    }}
                >
                    {submitting ? 'Saving Decisions...' : 'Apply Decisions & Consolidate Cars'} <ArrowRight size={16} />
                </button>
            </div>

            {/* UNTOUCHED LIVE DUTIES BANNER */}
            {retainedLiveDuties.length > 0 && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '14px', padding: '12px 18px', fontSize: '12px', color: '#a7f3d0'
                }}>
                    <strong>Audit Protection:</strong> {retainedLiveDuties.length} existing live duty/duties (e.g. {retainedLiveDuties.slice(0, 4).map(d => d.dutyId).join(', ')}) were not in this uploaded revision and remain intact — missing rows NEVER auto-cancel a live duty.
                </div>
            )}

            {/* POSSIBLE DUPLICATES */}
            {possibleDuplicates.length > 0 && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '18px',
                    border: '1px solid rgba(245, 158, 11, 0.28)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Cross-Sheet Possible Duplicates (Human Review Required — No Auto Elimination)
                    </h4>
                    {possibleDuplicates.map(dup => {
                        const chosen = decisions[dup.id]?.action || decisions[dup.id];
                        const dupKeys = (dup.duplicates || []).map(x => x.movement?.movementKey).filter(Boolean);
                        return (
                            <div key={dup.id} style={{
                                background: 'rgba(0,0,0,0.28)', borderRadius: '14px', padding: '16px',
                                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', alignItems: 'center'
                            }}>
                                <div style={{ flex: 1, minWidth: '280px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>
                                        {dup.primary?.guestGroup} ({dup.primary?.pax} PAX) — {dup.primary?.serviceType}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '3px', fontWeight: '700' }}>
                                        {dup.summary}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>
                                        Sheet A: {dup.primary?.pickupDate} {dup.primary?.guestPickup} | {dup.primary?.pickupPoint} → {dup.primary?.dropLocation} ({dup.primary?.carType})
                                        {(dup.duplicates || []).map((d, i) => (
                                            <div key={i} style={{ marginTop: '2px', color: d.hasConflict ? '#f87171' : 'rgba(255,255,255,0.55)' }}>
                                                Match {i + 1} ({d.movement?.sourceSheet} Row {d.movement?.sourceRow}): {d.movement?.pickupDate} {d.movement?.guestPickup} • Reasons: {(d.reasons || []).join(', ')}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => setDecision(dup.id, { action: 'same_movement', duplicateMovementKeys: dupKeys })}
                                        style={{
                                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                            background: chosen === 'same_movement' ? '#2563eb' : 'rgba(56,189,248,0.14)',
                                            color: chosen === 'same_movement' ? 'white' : '#38bdf8',
                                            border: '1px solid rgba(56,189,248,0.35)'
                                        }}
                                    >
                                        Same movement (Merge sources)
                                    </button>
                                    <button
                                        onClick={() => setDecision(dup.id, { action: 'keep_separate' })}
                                        style={{
                                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                            background: chosen === 'keep_separate' ? '#059669' : 'rgba(255,255,255,0.05)',
                                            color: 'white', border: '1px solid rgba(255,255,255,0.14)'
                                        }}
                                    >
                                        Keep separate
                                    </button>
                                    <button
                                        onClick={() => setDecision(dup.id, { action: 'review_later' })}
                                        style={{
                                            padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                            background: chosen === 'review_later' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.03)',
                                            color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)'
                                        }}
                                    >
                                        Review later
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CLIENT REVISIONS / CHANGED AGAINST LIVE DUTIES */}
            {changedItems.length > 0 && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '18px',
                    border: '1px solid rgba(56, 189, 248, 0.28)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={16} /> Client Revisions vs Live Duties (Side-by-Side Comparison)
                    </h4>
                    {changedItems.map(chg => {
                        const chosen = decisions[chg.id]?.action || decisions[chg.id];
                        return (
                            <div key={chg.id} style={{
                                background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px',
                                border: chg.postDispatchRevision ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', alignItems: 'center'
                            }}>
                                <div style={{ flex: 1, minWidth: '280px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '950', color: '#38bdf8' }}>{chg.dutyId}</span>
                                        <span style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{chg.candidate?.guestGroup}</span>
                                        <span style={{
                                            fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px',
                                            background: chg.postDispatchRevision ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.2)',
                                            color: chg.postDispatchRevision ? '#f87171' : '#38bdf8'
                                        }}>
                                            Live Status: {chg.liveStatus} {chg.postDispatchRevision ? '• POST-DISPATCH ALERT' : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                        {(chg.diffs || []).map(df => (
                                            <div key={df.field} style={{
                                                background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px'
                                            }}>
                                                <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>{df.label}: </span>
                                                <span style={{ color: '#f87171', textDecoration: 'line-through' }}>{df.oldValue}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}> → </span>
                                                <span style={{ color: '#34d399', fontWeight: '900' }}>{df.newValue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setDecision(chg.id, { action: 'accept_change', reason: `Approved rev change (${chg.liveStatus})` })}
                                        disabled={chg.lockedCompleted}
                                        style={{
                                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                                            cursor: chg.lockedCompleted ? 'not-allowed' : 'pointer',
                                            background: chosen === 'accept_change' ? '#059669' : 'rgba(16,185,129,0.16)',
                                            color: '#34d399', border: '1px solid rgba(16,185,129,0.35)', opacity: chg.lockedCompleted ? 0.45 : 1
                                        }}
                                    >
                                        {chg.lockedCompleted ? 'Locked (Completed)' : 'Accept revision'}
                                    </button>
                                    <button
                                        onClick={() => setDecision(chg.id, { action: 'keep_live' })}
                                        style={{
                                            padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                            background: chosen === 'keep_live' ? '#2563eb' : 'rgba(255,255,255,0.05)',
                                            color: 'white', border: '1px solid rgba(255,255,255,0.15)'
                                        }}
                                    >
                                        Keep live value
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MISSING DETAILS & PICKUP CONFIRMATIONS */}
            {missingDetails.length > 0 && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} /> Missing Details & Suggested Departure Pickups
                    </h4>
                    {missingDetails.map(mis => {
                        const mov = mis.candidate;
                        const k = mov.movementKey;
                        const patch = movementPatches[k] || {};
                        const chosen = decisions[mis.id]?.action || decisions[mis.id];
                        return (
                            <div key={mis.id} style={{
                                background: 'rgba(0,0,0,0.28)', borderRadius: '14px', padding: '14px',
                                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                                        {mov.guestGroup} ({mov.serviceType}) • {mov.sourceSheet} Row {mov.sourceRow}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>
                                        Needs review: {(mis.missingFields || []).join(', ')}
                                        {mov.flightTime ? ` • Flight ${mov.flightDate} ${mov.flightTime} → Suggested Pickup: ${mov.pickupDate} ${mov.guestPickup}` : ''}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {mov.carTypeMissing && (
                                        <select
                                            value={patch.carType ?? mov.carType}
                                            onChange={(e) => setPatchValue(mov._id, k, 'carType', e.target.value)}
                                            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.14)', color: 'white', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                                        >
                                            <option value="Sedan">Sedan</option>
                                            <option value="Ertiga">Ertiga</option>
                                            <option value="Crysta">Crysta</option>
                                            <option value="Urbania">Urbania</option>
                                        </select>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Pickup HH:MM"
                                        value={patch.guestPickup ?? mov.guestPickup ?? ''}
                                        onChange={(e) => setPatchValue(mov._id, k, 'guestPickup', e.target.value)}
                                        style={{ width: '90px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.14)', color: '#fbbf24', padding: '6px 8px', borderRadius: '8px', fontSize: '12px', textAlign: 'center', fontWeight: '800' }}
                                    />
                                    <button
                                        onClick={() => setDecision(mis.id, { action: 'confirm_pickup' })}
                                        style={{
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                            background: chosen === 'confirm_pickup' ? '#059669' : 'rgba(16,185,129,0.16)',
                                            color: '#34d399', border: '1px solid rgba(16,185,129,0.3)'
                                        }}
                                    >
                                        <Check size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        {chosen === 'confirm_pickup' ? 'Confirmed' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {possibleDuplicates.length === 0 && changedItems.length === 0 && missingDetails.length === 0 && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '18px', padding: '28px', textAlign: 'center', color: '#34d399', fontSize: '14px', fontWeight: '800'
                }}>
                    <CheckCircle size={24} style={{ marginBottom: '8px' }} />
                    <div>Clean Import! {summary.newCount || 0} movement(s) staged with zero duplicates or conflicts. Click "Apply Decisions & Consolidate Cars" above.</div>
                </div>
            )}
        </div>
    );
};

export default StageReconcileView;
