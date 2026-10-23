import React, { useRef } from 'react';
import { Printer, X, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const PrintableStatementModal = ({ statementData, onClose }) => {
    const printRef = useRef(null);
    const { theme } = useTheme();
    const primaryColor = theme?.primary || '#f59e0b';
    const secondaryColor = theme?.secondary || '#d97706';

    if (!statementData) return null;

    const handlePrint = () => {
        window.print();
    };

    const {
        contract = {},
        year,
        month,
        billingPeriod = {},
        sectionA_regularTransport = {},
        sectionB_onCallDuties = {},
        reconciliation = {},
        isLocked,
        statementRecord
    } = statementData;

    const monthName = MONTH_NAMES[(month || 1) - 1];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px',
            overflowY: 'auto'
        }}>
            <div style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '960px',
                maxHeight: '94vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                overflow: 'hidden'
            }}>
                {/* Header Controls */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#1e293b'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={22} color={primaryColor} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                                Monthly Bill Reconciliation Statement
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {contract.clientName} • {monthName} {year}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: primaryColor,
                                color: '#000000',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: `0 4px 12px ${primaryColor}40`
                            }}
                        >
                            <Printer size={16} />
                            <span>Print Statement</span>
                        </button>

                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: '#ffffff',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                    <div
                        ref={printRef}
                        id="printable-monthly-statement"
                        style={{
                            background: '#ffffff',
                            color: '#0f172a',
                            padding: '36px',
                            borderRadius: '8px',
                            border: '2px solid #cbd5e1',
                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Statement Title Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: '#0369a1' }}>
                                    LOGKARO FLEET SERVICES
                                </h1>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                    MONTHLY CORPORATE BILL RECONCILIATION STATEMENT
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                                    GSTIN: 08AAACL1234F1Z9 • Billing Period: {billingPeriod.startDate} to {billingPeriod.endDate}
                                </p>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    display: 'inline-block',
                                    background: isLocked ? '#16a34a' : '#0284c7',
                                    color: '#ffffff',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase'
                                }}>
                                    {isLocked ? 'VERIFIED & LOCKED' : 'DRAFT STATEMENT'}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
                                    Ref: {statementRecord?.statementNumber || `CORP-STMT-${contract.clientCode || 'EXP'}-${year}-${String(month).padStart(2, '0')}`}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                    Date: {new Date().toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                                        BILLED TO (CORPORATE CLIENT)
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                                        {contract.clientName}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#475569' }}>
                                        {contract.billingAddress || 'Corporate Office'}
                                    </div>
                                    {contract.gstin && <div style={{ fontSize: '11px', color: '#64748b' }}><strong>GSTIN:</strong> {contract.gstin}</div>}
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                                        CONTRACT DETAILS
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                        Contract Code: {contract.clientCode || 'N/A'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        Contracted Daily Vehicles: <strong>{sectionA_regularTransport.contractedVehiclesPerDay} Vehicles</strong>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        Tender Tariff: ₹{Number(sectionA_regularTransport.ratePerDay).toLocaleString('en-IN')}/day/vehicle
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION A: Regular Daily Transport Summary */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0284c7', color: '#ffffff', padding: '8px 12px', borderRadius: '6px 6px 0 0' }}>
                                <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>
                                    SECTION A: REGULAR DAILY STAFF TRANSPORT (20-VEHICLE DEPLOYMENT)
                                </span>
                                <span style={{ fontWeight: '800', fontSize: '13px' }}>
                                    ₹{Number(sectionA_regularTransport.totalRegularAmount || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11.5px', border: '1px solid #cbd5e1' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#334155' }}>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Contracted / Day</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Total Days</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Contracted Vehicle-Days</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#16a34a' }}>Operated Vehicle-Days</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#d97706' }}>Replacements</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#dc2626' }}>Absent / Deducted</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Tender Rate / Day</th>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: '900' }}>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ fontWeight: '700', color: '#0f172a' }}>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{sectionA_regularTransport.contractedVehiclesPerDay}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{sectionA_regularTransport.totalCalendarDays}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{sectionA_regularTransport.totalContractedVehicleDays}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#16a34a', fontWeight: '900' }}>{sectionA_regularTransport.operatedVehicleDays}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#d97706' }}>{sectionA_regularTransport.replacementVehicleDays}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#dc2626' }}>{sectionA_regularTransport.absentVehicleDays}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>₹{Number(sectionA_regularTransport.ratePerDay).toLocaleString('en-IN')}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: '900', color: '#0284c7', fontSize: '13px' }}>
                                            ₹{Number(sectionA_regularTransport.totalRegularAmount).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                * Only operated & replacement vehicle days are billed. Absent days have been strictly deducted. Total run: {sectionA_regularTransport.totalKm || 0} KM.
                            </div>
                        </div>

                        {/* SECTION B: On-Call Duties Summary & Slips */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0284c7', color: '#ffffff', padding: '8px 12px', borderRadius: '6px 6px 0 0' }}>
                                <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>
                                    SECTION B: APPROVED ON-CALL DUTY SLIPS ({sectionB_onCallDuties.approvedDutiesCount || 0} TRIPS)
                                </span>
                                <span style={{ fontWeight: '800', fontSize: '13px' }}>
                                    ₹{Number(sectionB_onCallDuties.totalApprovedOnCallAmount || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#334155' }}>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Duty Slip #</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Date</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Passenger</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Duty Type</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Vehicle</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>KM</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Hrs</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Base</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Extra</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>Toll/Pk</th>
                                        <th style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: '900' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(sectionB_onCallDuties.duties || []).filter(d => d.status === 'Approved').map(duty => (
                                        <tr key={duty._id} style={{ color: '#0f172a' }}>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: '800', color: '#0284c7' }}>{duty.dutySlipNumber}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.dutyDate}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.guestDetails?.name || 'Employee'}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.dutyType}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.vehicleNumber}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.execution?.totalKm || 0}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{duty.execution?.totalHours || 0}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>₹{duty.charges?.baseRate || 0}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>₹{(duty.charges?.extraKmAmount || 0) + (duty.charges?.extraHoursAmount || 0)}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>₹{(duty.charges?.tollAmount || 0) + (duty.charges?.parkingAmount || 0)}</td>
                                            <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: '800' }}>₹{Number(duty.charges?.taxableAmount || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                    {(!sectionB_onCallDuties.duties || sectionB_onCallDuties.duties.filter(d => d.status === 'Approved').length === 0) && (
                                        <tr>
                                            <td colSpan={11} style={{ padding: '12px', border: '1px solid #cbd5e1', color: '#64748b', fontStyle: 'italic' }}>
                                                No approved on-call duties for this billing cycle.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* FINAL RECONCILIATION & TOTALS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    VERIFICATION NOTES & CERTIFICATION
                                </div>
                                <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                                    Certified that the vehicles mentioned in Section A were deployed as per contract terms and on-call duties in Section B were duly requisitioned by authorized corporate personnel. Duty slips and meter readings have been verified against log records.
                                </p>
                            </div>

                            <div>
                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '6px 0', color: '#475569' }}>Section A (Regular Transport):</td>
                                            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700' }}>₹{Number(reconciliation.regularCharges || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '6px 0', color: '#475569' }}>Section B (Approved On-call):</td>
                                            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700' }}>₹{Number(reconciliation.approvedOnCallCharges || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        {Number(reconciliation.adjustments || 0) > 0 && (
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                                                <td style={{ padding: '6px 0' }}>Less Adjustments / Discounts:</td>
                                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700' }}>-₹{Number(reconciliation.adjustments).toLocaleString('en-IN')}</td>
                                            </tr>
                                        )}
                                        <tr style={{ borderBottom: '1px solid #0284c7', fontWeight: '800', color: '#0369a1' }}>
                                            <td style={{ padding: '6px 0' }}>Total Taxable Value:</td>
                                            <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{Number(reconciliation.taxableValue || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '6px 0', color: '#475569' }}>Applicable GST ({reconciliation.gstRate || 5}%):</td>
                                            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '700' }}>₹{Number(reconciliation.gstAmount || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a' }}>
                                            <td style={{ padding: '8px 0' }}>NET INVOICE PAYABLE:</td>
                                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#0369a1' }}>₹{Number(reconciliation.netPayable || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '30px' }}>
                            <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                                    PREPARED BY (YATREE / LOGKARO OPERATIONS)
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                                    VERIFIED & ACCEPTED BY ({contract.clientName})
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-monthly-statement, #printable-monthly-statement * {
                        visibility: visible !important;
                    }
                    #printable-monthly-statement {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 15px !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintableStatementModal;
