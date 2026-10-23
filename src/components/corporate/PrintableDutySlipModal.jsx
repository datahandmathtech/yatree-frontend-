import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, Clock, Navigation, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PrintableDutySlipModal = ({ dutySlip, contract, onClose }) => {
    const printRef = useRef(null);
    const { theme } = useTheme();
    const primaryColor = theme?.primary || '#f59e0b';
    const secondaryColor = theme?.secondary || '#d97706';

    if (!dutySlip) return null;

    const handlePrint = () => {
        window.print();
    };

    const cName = dutySlip.contract?.clientName || contract?.clientName || 'Corporate Client';
    const cAddress = dutySlip.contract?.billingAddress || contract?.billingAddress || 'Corporate Office';
    const cGst = dutySlip.contract?.gstin || contract?.gstin || 'N/A';

    const exec = dutySlip.execution || {};
    const chg = dutySlip.charges || {};
    const app = dutySlip.approval || {};
    const guest = dutySlip.guestDetails || {};

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
            {/* Modal Box */}
            <div style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '92vh',
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
                        <ShieldCheck size={22} color={primaryColor} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                                Corporate Duty Slip Preview
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Slip #{dutySlip.dutySlipNumber} • {dutySlip.dutyType}
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
                            <span>Print Duty Slip</span>
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

                {/* Printable Document Area */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                    <div
                        ref={printRef}
                        id="printable-duty-slip"
                        style={{
                            background: '#ffffff',
                            color: '#0f172a',
                            padding: '32px',
                            borderRadius: '8px',
                            border: '2px solid #cbd5e1',
                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Company & Slip Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: '#0369a1', letterSpacing: '-0.5px' }}>
                                    LOGKARO FLEET
                                </h1>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Corporate Staff Transportation & On-Call Services
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                                    GSTIN: 08AAACL1234F1Z9 • 24x7 Transport Desk: +91 98765 43210
                                </p>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    display: 'inline-block',
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    padding: '5px 14px',
                                    borderRadius: '6px',
                                    fontSize: '15px',
                                    fontWeight: '900',
                                    letterSpacing: '0.5px'
                                }}>
                                    DUTY SLIP
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
                                    #{dutySlip.dutySlipNumber}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                    Date: {dutySlip.dutyDate}
                                </div>
                            </div>
                        </div>

                        {/* Client & Booking Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#f1f5f9', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    CORPORATE CLIENT
                                </span>
                                <h4 style={{ margin: '2px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                                    {cName}
                                </h4>
                                <p style={{ margin: '2px 0', fontSize: '11.5px', color: '#475569' }}>
                                    {cAddress}
                                </p>
                                {cGst !== 'N/A' && (
                                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>
                                        <strong>GSTIN:</strong> {cGst}
                                    </p>
                                )}
                            </div>

                            <div>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    BOOKING / REQUEST REFERENCE
                                </span>
                                <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                    PO / Ref #: <span style={{ color: '#0369a1' }}>{dutySlip.requestReference || 'N/A'}</span>
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#334155' }}>
                                    <strong>Duty Package:</strong> {dutySlip.dutyType}
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '11.5px', color: '#475569' }}>
                                    <strong>Status:</strong> <span style={{
                                        fontWeight: '800',
                                        color: dutySlip.status === 'Approved' ? '#16a34a' : (dutySlip.status === 'Completed' ? '#0284c7' : '#ea580c')
                                    }}>{dutySlip.status.toUpperCase()}</span>
                                </p>
                            </div>
                        </div>

                        {/* Passenger, Vehicle & Driver Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {/* Employee / Guest */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                    PASSENGER / EMPLOYEE
                                </span>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                    {guest.name || 'Corporate Employee'}
                                </div>
                                {guest.empId && <div style={{ fontSize: '11.5px', color: '#475569' }}>Emp ID: {guest.empId}</div>}
                                {guest.department && <div style={{ fontSize: '11px', color: '#64748b' }}>Dept: {guest.department}</div>}
                                {guest.mobile && <div style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: '600' }}>📞 {guest.mobile}</div>}
                            </div>

                            {/* Vehicle Details */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                    VEHICLE DETAILS
                                </span>
                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                                    {dutySlip.vehicleNumber}
                                </div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>
                                    {dutySlip.vehicleModel || dutySlip.vehicleCategory}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    Category: {dutySlip.vehicleCategory}
                                </div>
                            </div>

                            {/* Driver Details */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                    CHAUFFEUR / DRIVER
                                </span>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                    {dutySlip.driverName}
                                </div>
                                <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '700' }}>
                                    📞 {dutySlip.driverMobile || 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Itinerary */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '20px', background: '#f8fafc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' }}>
                                        🟢 PICKUP LOCATION
                                    </span>
                                    <p style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                        {dutySlip.pickupLocation}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' }}>
                                        🔴 DROP LOCATION
                                    </span>
                                    <p style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                        {dutySlip.dropLocation}
                                    </p>
                                </div>
                            </div>
                            {dutySlip.reportingAddress && (
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '11.5px', color: '#475569' }}>
                                    <strong>Reporting Instructions:</strong> {dutySlip.reportingAddress}
                                </div>
                            )}
                        </div>

                        {/* Meter & Hours Table */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '8px' }}>
                                METER (KM) & TIME RECORD
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#0284c7', color: '#ffffff' }}>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7' }}>Closing KM</th>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7' }}>Opening KM</th>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7', fontWeight: '900' }}>TOTAL KM</th>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7' }}>End Time</th>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7' }}>Start Time</th>
                                        <th style={{ padding: '8px', border: '1px solid #0284c7', fontWeight: '900' }}>TOTAL HOURS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: '#f8fafc', fontWeight: '700', color: '#0f172a' }}>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{exec.closingKm || '-'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{exec.openingKm || '-'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#0284c7', fontSize: '14px', fontWeight: '900' }}>
                                            {exec.totalKm || 0} KM
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>
                                            {exec.endDateTime ? new Date(exec.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>
                                            {exec.startDateTime ? new Date(exec.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#0284c7', fontSize: '14px', fontWeight: '900' }}>
                                            {exec.totalHours || 0} Hrs
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Charges & Rate Breakdown Table */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '8px' }}>
                                RATE & CHARGE BREAKDOWN (CONTRACT TENDER TARIFF)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px', color: '#334155' }}>Base Package ({dutySlip.dutyType}) - Incl. {chg.includedKm || 0} KM / {chg.includedHours || 0} Hrs</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{Number(chg.baseRate || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                    {Number(chg.extraKmAmount || 0) > 0 && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#334155' }}>Extra Distance: {chg.extraKm} KM @ ₹{chg.extraKmRate}/KM</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{Number(chg.extraKmAmount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    {Number(chg.extraHoursAmount || 0) > 0 && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#334155' }}>Extra Duration: {chg.extraHours} Hrs @ ₹{chg.extraHourRate}/Hr</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{Number(chg.extraHoursAmount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    {(Number(chg.tollAmount || 0) > 0 || Number(chg.parkingAmount || 0) > 0) && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#334155' }}>Toll & Parking Charges</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{(Number(chg.tollAmount || 0) + Number(chg.parkingAmount || 0)).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    {Number(chg.driverAllowance || 0) > 0 && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#334155' }}>Driver Outstation / Day Allowance</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{Number(chg.driverAllowance).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    {Number(chg.discountAmount || 0) > 0 && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                                            <td style={{ padding: '8px' }}>Authorized Adjustment / Discount ({chg.discountReason || 'Agreed adjustment'})</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>-₹{Number(chg.discountAmount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    <tr style={{ background: '#f1f5f9', fontWeight: '900', fontSize: '13px' }}>
                                        <td style={{ padding: '10px 8px', color: '#0369a1' }}>TOTAL BILLABLE TAXABLE AMOUNT</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0369a1', fontSize: '15px' }}>₹{Number(chg.taxableAmount || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Sign-off Boxes */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px', paddingTop: '16px', borderTop: '2px dashed #cbd5e1' }}>
                            {/* Driver Signature */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>
                                    {dutySlip.driverName}
                                </div>
                                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                                    Chauffeur Signature
                                </div>
                            </div>

                            {/* Corporate User / Desk Approval */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', textAlign: 'center', background: app.approvalStatus === 'Approved' ? '#f0fdf4' : '#ffffff' }}>
                                <div style={{ height: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    {app.approvalStatus === 'Approved' ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: '900', fontSize: '13px' }}>
                                                <CheckCircle2 size={16} /> APPROVED
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#334155', fontWeight: '700' }}>
                                                {app.approvedBy} {app.designation ? `(${app.designation})` : ''}
                                            </div>
                                        </>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                                            Pending Client Sign-off
                                        </span>
                                    )}
                                </div>
                                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                                    Corporate User / Desk Signature & Seal
                                </div>
                            </div>
                        </div>

                        {/* Footer Notes */}
                        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
                            This is an authorized computer-generated duty slip under contract {contract?.clientCode || dutySlip.contract?.clientCode || ''}. GST and invoicing are billed monthly as per agreed tender terms.
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Media Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-duty-slip, #printable-duty-slip * {
                        visibility: visible !important;
                    }
                    #printable-duty-slip {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintableDutySlipModal;
