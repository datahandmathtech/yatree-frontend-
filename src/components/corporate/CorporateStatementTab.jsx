import React, { useState, useEffect } from 'react';
import {
    FileText, Calendar, Lock, Unlock, Printer, Download, AlertTriangle,
    CheckCircle2, RefreshCw, Layers, ShieldCheck, ChevronRight, Check
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import CorporateMonthInput from './CorporateMonthInput';
import axios from '../../api/axios';
import PrintableStatementModal from './PrintableStatementModal';

const MONTHS = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' }
];

const CorporateStatementTab = ({ contract, contracts = [], onSelectContract }) => {
    const { theme } = useTheme();
    const primaryColor = theme?.primary || '#fbbf24';
    const secondaryColor = theme?.secondary || '#f59e0b';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [statementData, setStatementData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [adjustments, setAdjustments] = useState(0);
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [showPrintModal, setShowPrintModal] = useState(false);

    const contractId = contract?._id;

    const fetchStatementPreview = async () => {
        if (!contractId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/corporate/statement/preview/${contractId}?year=${selectedYear}&month=${selectedMonth}`);
            if (res.data?.success) {
                setStatementData(res.data);
                setAdjustments(res.data.reconciliation?.adjustments || 0);
                setAdjustmentReason(res.data.reconciliation?.adjustmentReason || '');
            }
        } catch (err) {
            console.error('Error fetching statement preview:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatementPreview();
    }, [contractId, selectedYear, selectedMonth]);

    // Lock Statement
    const handleLockStatement = async () => {
        if (!window.confirm(`Lock and finalize monthly statement for ${MONTHS[selectedMonth - 1].name} ${selectedYear}? This will lock the billing figures.`)) return;
        setActionLoading(true);
        try {
            await axios.post(`/api/corporate/statement/lock/${contractId}`, {
                year: selectedYear,
                month: selectedMonth,
                adjustments: Number(adjustments),
                adjustmentReason
            });
            alert('Monthly statement locked successfully!');
            fetchStatementPreview();
        } catch (err) {
            console.error('Error locking statement:', err);
            alert(err.response?.data?.message || 'Error locking monthly statement');
        } finally {
            setActionLoading(false);
        }
    };

    // Unlock Statement
    const handleUnlockStatement = async () => {
        if (!window.confirm('Unlock monthly statement to permit modifications?')) return;
        setActionLoading(true);
        try {
            await axios.post(`/api/corporate/statement/unlock/${contractId}`, {
                year: selectedYear,
                month: selectedMonth
            });
            alert('Monthly statement unlocked.');
            fetchStatementPreview();
        } catch (err) {
            console.error('Error unlocking statement:', err);
            alert(err.response?.data?.message || 'Error unlocking statement');
        } finally {
            setActionLoading(false);
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!statementData) return;
        const reg = statementData.sectionA_regularTransport || {};
        const duties = statementData.sectionB_onCallDuties?.duties || [];
        const rec = statementData.reconciliation || {};

        let csv = `CORPORATE MONTHLY BILL RECONCILIATION STATEMENT\n`;
        csv += `Client:,"${contract.clientName}",Contract Code:,"${contract.clientCode}"\n`;
        csv += `Billing Period:,"${statementData.billingPeriod?.startDate} to ${statementData.billingPeriod?.endDate}"\n\n`;

        csv += `SECTION A: REGULAR DAILY STAFF TRANSPORT (20-VEHICLE DEPLOYMENT)\n`;
        csv += `Contracted Vehicles / Day,Total Days,Contracted Vehicle-Days,Operated Vehicle-Days,Replacements,Absent Days,Rate / Day,Total Regular Amount\n`;
        csv += `${reg.contractedVehiclesPerDay},${reg.totalCalendarDays},${reg.totalContractedVehicleDays},${reg.operatedVehicleDays},${reg.replacementVehicleDays},${reg.absentVehicleDays},${reg.ratePerDay},${reg.totalRegularAmount}\n\n`;

        csv += `SECTION B: APPROVED ON-CALL DUTY SLIPS\n`;
        csv += `Duty Slip #,Date,PO / Ref,Passenger / Employee,Duty Type,Vehicle No,Driver,Total KM,Total Hrs,Base Rate,Extra KM Chg,Extra Hr Chg,Toll/Parking,Allowance,Discount,Billable Amount,Approval Status\n`;

        duties.forEach(d => {
            const chg = d.charges || {};
            const exec = d.execution || {};
            csv += `"${d.dutySlipNumber}","${d.dutyDate}","${d.requestReference || ''}","${d.guestDetails?.name || ''}","${d.dutyType}","${d.vehicleNumber}","${d.driverName}",${exec.totalKm || 0},${exec.totalHours || 0},${chg.baseRate || 0},${chg.extraKmAmount || 0},${chg.extraHoursAmount || 0},${(chg.tollAmount || 0) + (chg.parkingAmount || 0)},${chg.driverAllowance || 0},${chg.discountAmount || 0},${chg.taxableAmount || 0},"${d.status}"\n`;
        });

        csv += `\nBILL RECONCILIATION & TOTALS\n`;
        csv += `Section A Regular Charges,${rec.regularCharges || 0}\n`;
        csv += `Section B Approved On-call Charges,${rec.approvedOnCallCharges || 0}\n`;
        csv += `Less Adjustments / Discounts,-${rec.adjustments || 0}\n`;
        csv += `Gross Taxable Value,${rec.taxableValue || 0}\n`;
        csv += `GST (${rec.gstRate || 5}%),${rec.gstAmount || 0}\n`;
        csv += `Net Invoice Amount,${rec.netPayable || 0}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Corporate_Statement_${contract.clientCode || 'CORP'}_${selectedYear}_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!contract) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Please select or create a corporate contract first.
            </div>
        );
    }

    const reg = statementData?.sectionA_regularTransport || {};
    const onCall = statementData?.sectionB_onCallDuties || {};
    const rec = statementData?.reconciliation || {};
    const isLocked = statementData?.isLocked || false;
    const warnings = statementData?.warnings || [];

    return (
        <div>
            {/* Filter Bar: Contract, Month, Year & Action Buttons */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
            }}>
                {/* Left: Contract, Month, Year */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            CLIENT CONTRACT
                        </span>
                        <select
                            value={contract._id}
                            onChange={(e) => {
                                const found = contracts.find(c => c._id === e.target.value);
                                if (found && onSelectContract) onSelectContract(found);
                            }}
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#ffffff',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700'
                            }}
                        >
                            {contracts.map(c => (
                                <option key={c._id} value={c._id}>
                                    {c.clientName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            BILLING MONTH
                        </span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: primaryColor,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '800'
                            }}
                        >
                            {MONTHS.map(m => (
                                <option key={m.num} value={m.num}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            YEAR
                        </span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: primaryColor,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '800'
                            }}
                        >
                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Interactive Month Picker with Calendar popup */}
                    <div>
                        <CorporateMonthInput
                            label="OPEN CALENDAR"
                            value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                    const parts = val.split('-');
                                    if (parts.length === 2) {
                                        setSelectedYear(Number(parts[0]));
                                        setSelectedMonth(Number(parts[1]));
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Right: Actions (Lock/Unlock, Print, Export) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Lock / Unlock */}
                    {isLocked ? (
                        <button
                            onClick={handleUnlockStatement}
                            disabled={actionLoading}
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <Unlock size={14} />
                            <span>Unlock Statement</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleLockStatement}
                            disabled={actionLoading}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: '800',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <Lock size={14} />
                            <span>Lock Final Statement</span>
                        </button>
                    )}

                    {/* Print Statement */}
                    <button
                        onClick={() => setShowPrintModal(true)}
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                            color: '#000000',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: `0 4px 12px ${primaryColor}40`
                        }}
                    >
                        <Printer size={14} color="#000000" />
                        <span>Print Annexure</span>
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={exportToCSV}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={14} />
                        <span>CSV</span>
                    </button>
                </div>
            </div>

            {/* Warnings Alert Banner (Pending Approvals, Missing KM) */}
            {warnings.length > 0 && (
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: '800', fontSize: '13px', marginBottom: '6px' }}>
                        <AlertTriangle size={18} />
                        <span>Reconciliation Warnings ({warnings.length} items require attention before final lock)</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '12px', color: '#fde047' }}>
                        {warnings.slice(0, 5).map((w, i) => (
                            <li key={i}>{w.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    Reconciling monthly bill records...
                </div>
            ) : statementData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Top KPI Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {/* Section A: Regular Transport Total */}
                        <div style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}30`, borderRadius: '14px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                                SECTION A: REGULAR TRANSPORT
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '950', color: primaryColor, marginTop: '4px' }}>
                                ₹{Number(reg.totalRegularAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                                {reg.operatedVehicleDays || 0} operated vehicle-days ({reg.absentVehicleDays || 0} absent deducted)
                            </div>
                        </div>

                        {/* Section B: Approved On-call Total */}
                        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '14px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '800', textTransform: 'uppercase' }}>
                                SECTION B: APPROVED ON-CALL
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '950', color: '#4ade80', marginTop: '4px' }}>
                                ₹{Number(onCall.totalApprovedOnCallAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                                {onCall.approvedDutiesCount || 0} approved trips ({onCall.pendingApprovalCount || 0} pending)
                            </div>
                        </div>

                        {/* Gross Taxable Value */}
                        <div style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}30`, borderRadius: '14px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', color: primaryColor, fontWeight: '800', textTransform: 'uppercase' }}>
                                TOTAL TAXABLE VALUE
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '950', color: primaryColor, marginTop: '4px' }}>
                                ₹{Number(rec.taxableValue || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                                Regular + On-call minus adjustments
                            </div>
                        </div>

                        {/* Net Invoice Amount */}
                        <div style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}30 100%)`, border: `2px solid ${primaryColor}`, borderRadius: '14px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', color: primaryColor, fontWeight: '900', textTransform: 'uppercase' }}>
                                NET INVOICE PAYABLE
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '950', color: '#ffffff', marginTop: '4px' }}>
                                ₹{Number(rec.netPayable || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '4px', fontWeight: '700' }}>
                                Incl. {rec.gstRate || 5}% GST (₹{Number(rec.gstAmount || 0).toLocaleString('en-IN')})
                            </div>
                        </div>
                    </div>

                    {/* SECTION A TABLE: Regular Daily Transport Reconciliation */}
                    <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: '#1e293b', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: primaryColor }}>
                                    SECTION A: Regular 20-Vehicle Staff Transportation Register
                                </h4>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                    Contracted: {reg.contractedVehiclesPerDay} vehicles/day • Tender Tariff: ₹{reg.ratePerDay}/day
                                </span>
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: primaryColor }}>
                                ₹{Number(reg.totalRegularAmount || 0).toLocaleString('en-IN')}
                            </span>
                        </div>

                        <div style={{ padding: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>CALENDAR DAYS</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>{reg.totalCalendarDays} Days</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>CONTRACTED VEH-DAYS</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>{reg.totalContractedVehicleDays}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#86efac' }}>OPERATED VEH-DAYS</div>
                                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#4ade80' }}>{reg.operatedVehicleDays}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#fde047' }}>REPLACEMENTS</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}>{reg.replacementVehicleDays}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#fca5a5' }}>ABSENT (DEDUCTED)</div>
                                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#f87171' }}>{reg.absentVehicleDays}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>TOTAL RUN KM</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: primaryColor }}>{reg.totalKm || 0} KM</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION B TABLE: Approved On-call Duties Reconciliation */}
                    <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', background: '#1e293b', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#4ade80' }}>
                                    SECTION B: Approved On-call Duty Slips ({onCall.approvedDutiesCount || 0} Trips)
                                </h4>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                    Reconciled trips with meter readings & corporate approval
                                </span>
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>
                                ₹{Number(onCall.totalApprovedOnCallAmount || 0).toLocaleString('en-IN')}
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#172033', color: '#94a3b8' }}>
                                        <th style={{ padding: '9px 12px' }}>Duty Slip #</th>
                                        <th style={{ padding: '9px 12px' }}>Date</th>
                                        <th style={{ padding: '9px 12px' }}>Passenger / Emp</th>
                                        <th style={{ padding: '9px 12px' }}>Duty Type</th>
                                        <th style={{ padding: '9px 12px' }}>Vehicle</th>
                                        <th style={{ padding: '9px 10px', textAlign: 'center' }}>KM / Hrs</th>
                                        <th style={{ padding: '9px 12px', textAlign: 'right' }}>Base</th>
                                        <th style={{ padding: '9px 12px', textAlign: 'right' }}>Extra KM/Hr</th>
                                        <th style={{ padding: '9px 12px', textAlign: 'right' }}>Toll/Parking</th>
                                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '900' }}>Billable</th>
                                        <th style={{ padding: '9px 12px', textAlign: 'center' }}>Sign-off</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(onCall.duties || []).map((duty) => {
                                        const chg = duty.charges || {};
                                        const exec = duty.execution || {};
                                        const isApp = duty.status === 'Approved';

                                        return (
                                            <tr key={duty._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isApp ? 'transparent' : 'rgba(245, 158, 11, 0.05)' }}>
                                                <td style={{ padding: '9px 12px', fontWeight: '800', color: primaryColor }}>{duty.dutySlipNumber}</td>
                                                <td style={{ padding: '9px 12px', color: '#ffffff' }}>{duty.dutyDate}</td>
                                                <td style={{ padding: '9px 12px' }}>{duty.guestDetails?.name || 'Employee'}</td>
                                                <td style={{ padding: '9px 12px' }}>{duty.dutyType}</td>
                                                <td style={{ padding: '9px 12px', color: '#fef08a' }}>{duty.vehicleNumber}</td>
                                                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{exec.totalKm || 0} KM / {exec.totalHours || 0}h</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'right' }}>₹{chg.baseRate || 0}</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'right' }}>₹{(chg.extraKmAmount || 0) + (chg.extraHoursAmount || 0)}</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'right' }}>₹{(chg.tollAmount || 0) + (chg.parkingAmount || 0)}</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '900', color: isApp ? '#4ade80' : '#fbbf24' }}>
                                                    ₹{Number(chg.taxableAmount || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: '800',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: isApp ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                        color: isApp ? '#4ade80' : '#fbbf24'
                                                    }}>
                                                        {duty.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Adjustments & Final Statement Confirmation */}
                    <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                            Adjustments & Statement Locking
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Adjustment (₹)</label>
                                        <input
                                            type="number"
                                            disabled={isLocked}
                                            value={adjustments}
                                            onChange={(e) => setAdjustments(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Adjustment Reason</label>
                                        <input
                                            type="text"
                                            disabled={isLocked}
                                            placeholder="Agreed corporate deduction or rebate..."
                                            value={adjustmentReason}
                                            onChange={(e) => setAdjustmentReason(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                                    Locking the statement archives the underlying records for this billing cycle and enables exporting the verified statement annexure for invoice attachment.
                                </p>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                                    <span>Regular Transport:</span>
                                    <span>₹{Number(rec.regularCharges || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                                    <span>Approved On-call:</span>
                                    <span>₹{Number(rec.approvedOnCallCharges || 0).toLocaleString('en-IN')}</span>
                                </div>
                                {Number(adjustments) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>
                                        <span>Adjustment:</span>
                                        <span>-₹{Number(adjustments).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', color: '#fef08a', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                                    <span>Taxable Value:</span>
                                    <span>₹{Number(rec.taxableValue || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '950', color: primaryColor, marginTop: '4px' }}>
                                    <span>Net Payable:</span>
                                    <span>₹{Number(rec.netPayable || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* PRINT STATEMENT MODAL */}
            {showPrintModal && (
                <PrintableStatementModal
                    statementData={statementData}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
};

export default CorporateStatementTab;
