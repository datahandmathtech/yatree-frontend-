import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Truck, ShieldCheck, AlertTriangle, RefreshCw, ExternalLink, CheckCircle, Clock
} from 'lucide-react';

const Step5ModulesView = ({
    duties = [],
    vehicleCalendar = [],
    counts = {},
    config = {},
    retryingSync,
    onRetrySync,
    onSelectDuty
}) => {
    const navigate = useNavigate();
    const vendorDuties = duties.filter(d => d.vehicleSource === 'Vendor' && d.status !== 'Cancelled');
    const cancelledVendorDuties = duties.filter(d => d.vehicleSource === 'Vendor' && d.status === 'Cancelled');
    const syncErrorDuties = duties.filter(d => d.syncStatus === 'SyncError' || d.syncStatus === 'Pending');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* MODULE LINKS & OUTBOX SYNC HEALTH */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.55)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(56,189,248,0.25)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#38bdf8' }}>LIVE DRS / DISPATCH</div>
                    <div style={{ fontSize: '26px', fontWeight: '950', color: 'white', margin: '6px 0' }}>{counts.drsDuties || 0} synced duties</div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        Same durable Duty ID (LK-xxx) linked across DRS & Live Event Sheet.
                    </p>
                    <button onClick={() => navigate('/admin/drs')} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(56,189,248,0.16)', border: '1px solid rgba(56,189,248,0.35)', color: '#38bdf8', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        Open Live DRS <ExternalLink size={12} />
                    </button>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.55)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(168,85,247,0.25)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#c084fc' }}>VENDOR BOOK (OUTSIDE CARS)</div>
                    <div style={{ fontSize: '26px', fontWeight: '950', color: 'white', margin: '6px 0' }}>{vendorDuties.length} outside vehicle duty</div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        One linked vendor duty per external car. Time edits do not overwrite agreed vendor cost.
                    </p>
                    <button onClick={() => navigate('/admin/outside-cars')} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(168,85,247,0.16)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        Open Vendor Book <ExternalLink size={12} />
                    </button>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.55)', padding: '20px', borderRadius: '18px', border: syncErrorDuties.length > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,129,0.25)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: syncErrorDuties.length > 0 ? '#f87171' : '#34d399' }}>OUTBOX TRANSACTIONAL SYNC</div>
                    <div style={{ fontSize: '26px', fontWeight: '950', color: 'white', margin: '6px 0' }}>
                        {syncErrorDuties.length === 0 ? 'All Synced' : `${syncErrorDuties.length} Pending / Error`}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        Timezone: {config.timezone || 'Asia/Kolkata'} • Turnaround buffer: {config.defaultTurnaroundMinutes || 30}m
                    </p>
                    <button
                        onClick={onRetrySync}
                        disabled={retryingSync}
                        style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={12} /> {retryingSync ? 'Syncing...' : 'Re-sync & Retry Outbox'}
                    </button>
                </div>
            </div>

            {/* MASTER VEHICLE CALENDAR / REUSE & TURNAROUND VIEW */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.55)', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)', padding: '22px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '950', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} color="#10b981" /> Master Vehicle Calendar & Reuse Timeline ({vehicleCalendar.length} Distinct Vehicles)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                            Shows multiple non-overlapping duties assigned per physical car (checked against {config.defaultTurnaroundMinutes || 30}-min turnaround buffer).
                        </p>
                    </div>
                    <button onClick={() => navigate('/admin/vehicles')} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        Fleet Vehicles Master <ExternalLink size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                    </button>
                </div>

                {vehicleCalendar.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        No physical vehicle numbers assigned yet. Click any Duty ID or Assign Vehicle on Step 4 to allocate Own Fleet or Vendor vehicles.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {vehicleCalendar.map(vc => (
                            <div key={vc.vehicleNumber} style={{ background: 'rgba(0,0,0,0.28)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '950', color: '#38bdf8' }}>{vc.vehicleNumber}</span>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>{vc.carType}</span>
                                        <span style={{
                                            fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px',
                                            background: vc.vehicleSource === 'Vendor' ? 'rgba(168,85,247,0.2)' : 'rgba(16,185,129,0.2)',
                                            color: vc.vehicleSource === 'Vendor' ? '#c084fc' : '#34d399'
                                        }}>
                                            {vc.vehicleSource === 'Vendor' ? `Vendor: ${vc.vendorName || 'Outside'}` : 'Own Fleet'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '800' }}>
                                        {vc.duties.length} duty/duties
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {vc.duties.map(d => (
                                        <div
                                            key={d.dutyId}
                                            onClick={() => {
                                                const full = duties.find(x => x.dutyId === d.dutyId);
                                                if (full && onSelectDuty) onSelectDuty(full);
                                            }}
                                            style={{
                                                padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                                background: d.hasConflict ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.04)',
                                                border: d.hasConflict ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)'
                                            }}
                                        >
                                            <div style={{ fontSize: '12px', fontWeight: '900', color: d.hasConflict ? '#f87171' : '#fbbf24' }}>
                                                {d.dutyId} • {d.pickupDate} {d.guestPickup} {d.hasConflict ? '⚠ CONFLICT' : ''}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'white', marginTop: '2px' }}>
                                                {d.serviceType}: {d.guestGroup}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
                                                {d.pickupPoint} → {d.dropLocation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* VENDOR BOOK RECONCILIATION */}
            {(vendorDuties.length > 0 || cancelledVendorDuties.length > 0) && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '20px',
                    border: '1px solid rgba(168, 85, 247, 0.2)', padding: '22px'
                }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '950', color: '#c084fc' }}>
                        Vendor Book Linked Payables ({vendorDuties.length} Active, {cancelledVendorDuties.length} Cancelled Review)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[...vendorDuties, ...cancelledVendorDuties].map(d => (
                            <div
                                key={d.dutyId}
                                onClick={() => onSelectDuty && onSelectDuty(d)}
                                style={{
                                    padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.28)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer',
                                    border: d.status === 'Cancelled' ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.06)'
                                }}
                            >
                                <div>
                                    <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '12px', marginRight: '8px' }}>{d.dutyId}</span>
                                    <span style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{d.vendorName || 'Vendor TBA'}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginLeft: '8px' }}>({d.vehicleNumber || d.carType}) • {d.pickupDate} {d.guestPickup}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>
                                        Cost: ₹{d.status === 'Cancelled' ? (d.vendorCancellationCharge || 0) : (d.vendorCost || 0)}
                                    </span>
                                    <span style={{
                                        fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px',
                                        background: d.status === 'Cancelled' ? 'rgba(239,68,68,0.2)' : (d.vendorCostApproved ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'),
                                        color: d.status === 'Cancelled' ? '#f87171' : (d.vendorCostApproved ? '#34d399' : '#fbbf24')
                                    }}>
                                        {d.status === 'Cancelled' ? 'Review Cancellation Charge' : (d.vendorCostApproved ? 'Cost Approved' : 'Needs Cost Approval')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step5ModulesView;
