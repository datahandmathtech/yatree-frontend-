import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, Printer, FileText, CheckCircle2, Clock, AlertTriangle,
    Eye, Edit3, Trash2, ShieldCheck, MapPin, User, Phone, Check, X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCompany } from '../../context/CompanyContext';
import CorporateDateInput from './CorporateDateInput';
import axios from '../../api/axios';
import PrintableDutySlipModal from './PrintableDutySlipModal';

const CorporateDutySlipsTab = ({ contract, contracts = [], onSelectContract }) => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const primaryColor = theme?.primary || '#fbbf24';
    const secondaryColor = theme?.secondary || '#f59e0b';

    const [slips, setSlips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [filterDate, setFilterDate] = useState('');

    // Real Fleet Options (Vehicles & Drivers)
    const [fleetVehicles, setFleetVehicles] = useState([]);
    const [fleetDrivers, setFleetDrivers] = useState([]);

    const contractId = contract?._id;
    const companyId = contract?.company?._id || contract?.company || selectedCompany?._id || selectedCompany?.id || localStorage.getItem('companyId');

    const fetchFleetOptions = async () => {
        if (!companyId) return;
        try {
            const res = await axios.get(`/api/corporate/fleet-options/${companyId}`);
            if (res.data?.success) {
                setFleetVehicles(res.data.vehicles || []);
                setFleetDrivers(res.data.drivers || []);
            }
        } catch (err) {
            console.error('Error fetching fleet options in duty slips:', err);
        }
    };

    useEffect(() => {
        fetchFleetOptions();
    }, [companyId]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [printSlip, setPrintSlip] = useState(null);

    // Create Form State
    const [createForm, setCreateForm] = useState({
        requestReference: '',
        dutyDate: new Date().toISOString().split('T')[0],
        dutyTime: '09:00',
        dutyType: '8 Hours / 80 KM Local Package',
        vehicleCategory: 'Sedan (Dzire/Etios)',
        vehicleNumber: '',
        vehicleModel: 'Dzire',
        driverName: '',
        driverMobile: '',
        guestName: '',
        guestEmpId: '',
        guestDept: '',
        guestMobile: '',
        pickupLocation: '',
        dropLocation: '',
        reportingAddress: '',
        remarks: ''
    });

    // Close / Execution Form State
    const [closeForm, setCloseForm] = useState({
        openingKm: '',
        closingKm: '',
        startTime: '',
        endTime: '',
        tollAmount: '',
        parkingAmount: '',
        nightCharge: '',
        driverAllowance: '',
        discountAmount: '',
        discountReason: '',
        status: 'Completed',
        remarks: ''
    });

    // Approval Form State
    const [approveForm, setApproveForm] = useState({
        approvedBy: '',
        designation: 'Transport Manager',
        approvalStatus: 'Approved',
        approvalRemarks: ''
    });

    const fetchDutySlips = async () => {
        if (!contractId) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (statusFilter !== 'all') queryParams.append('status', statusFilter);
            if (search) queryParams.append('search', search);
            if (filterDate) queryParams.append('date', filterDate);

            const res = await axios.get(`/api/corporate/duty-slips/${contractId}?${queryParams.toString()}`);
            if (res.data?.success) {
                setSlips(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching duty slips:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDutySlips();
    }, [contractId, statusFilter, filterDate]);

    // Handle Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDutySlips();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Open Create Modal
    const handleOpenCreate = () => {
        const defaultDuty = contract?.rateCard?.[0]?.dutyType || '8 Hours / 80 KM Local Package';
        const defaultVehicle = contract?.defaultVehicles?.[0] || {};

        setCreateForm({
            requestReference: '',
            dutyDate: new Date().toISOString().split('T')[0],
            dutyTime: '09:00',
            dutyType: defaultDuty,
            vehicleCategory: 'Sedan (Dzire/Etios)',
            vehicleNumber: defaultVehicle.vehicleNumber || '',
            vehicleModel: defaultVehicle.vehicleModel || 'Dzire',
            driverName: defaultVehicle.driverName || '',
            driverMobile: defaultVehicle.driverMobile || '',
            guestName: '',
            guestEmpId: '',
            guestDept: '',
            guestMobile: '',
            pickupLocation: '',
            dropLocation: '',
            reportingAddress: '',
            remarks: ''
        });
        setShowCreateModal(true);
    };

    // Submit Create
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                requestReference: createForm.requestReference,
                dutyDate: createForm.dutyDate,
                dutyTime: createForm.dutyTime,
                dutyType: createForm.dutyType,
                vehicleCategory: createForm.vehicleCategory,
                vehicleNumber: createForm.vehicleNumber,
                vehicleModel: createForm.vehicleModel,
                driverName: createForm.driverName,
                driverMobile: createForm.driverMobile,
                guestDetails: {
                    name: createForm.guestName,
                    empId: createForm.guestEmpId,
                    department: createForm.guestDept,
                    mobile: createForm.guestMobile
                },
                pickupLocation: createForm.pickupLocation,
                dropLocation: createForm.dropLocation,
                reportingAddress: createForm.reportingAddress,
                remarks: createForm.remarks
            };

            await axios.post(`/api/corporate/duty-slips/${contractId}`, payload);
            setShowCreateModal(false);
            fetchDutySlips();
        } catch (err) {
            console.error('Error creating duty slip:', err);
            alert(err.response?.data?.message || 'Error creating duty slip');
        }
    };

    // Open Close / Meter Reading Modal
    const handleOpenClose = (slip) => {
        setSelectedSlip(slip);
        const exec = slip.execution || {};
        const chg = slip.charges || {};

        setCloseForm({
            openingKm: exec.openingKm != null && exec.openingKm !== 0 ? exec.openingKm : (exec.openingKm === 0 ? '0' : ''),
            closingKm: exec.closingKm != null && exec.closingKm !== 0 ? exec.closingKm : (exec.closingKm === 0 ? '0' : ''),
            startTime: exec.startDateTime ? new Date(exec.startDateTime).toISOString().slice(11, 16) : '09:00',
            endTime: exec.endDateTime ? new Date(exec.endDateTime).toISOString().slice(11, 16) : '18:00',
            tollAmount: chg.tollAmount || '',
            parkingAmount: chg.parkingAmount || '',
            nightCharge: chg.nightCharge || '',
            driverAllowance: chg.driverAllowance || '',
            discountAmount: chg.discountAmount || '',
            discountReason: chg.discountReason || '',
            status: slip.status === 'Requested' || slip.status === 'Assigned' ? 'Completed' : slip.status,
            remarks: slip.remarks || ''
        });
        setShowCloseModal(true);
    };

    // Submit Close Slip
    const handleCloseSubmit = async (e) => {
        e.preventDefault();
        try {
            const startDateTime = new Date(`${selectedSlip.dutyDate}T${closeForm.startTime}:00`);
            const endDateTime = new Date(`${selectedSlip.dutyDate}T${closeForm.endTime}:00`);

            const totalKm = Math.max(0, Number(closeForm.closingKm) - Number(closeForm.openingKm));

            const payload = {
                execution: {
                    openingKm: Number(closeForm.openingKm),
                    closingKm: Number(closeForm.closingKm),
                    totalKm,
                    startDateTime,
                    endDateTime
                },
                charges: {
                    tollAmount: Number(closeForm.tollAmount),
                    parkingAmount: Number(closeForm.parkingAmount),
                    nightCharge: Number(closeForm.nightCharge),
                    driverAllowance: Number(closeForm.driverAllowance),
                    discountAmount: Number(closeForm.discountAmount),
                    discountReason: closeForm.discountReason
                },
                status: closeForm.status,
                remarks: closeForm.remarks
            };

            await axios.put(`/api/corporate/duty-slips/single/${selectedSlip._id}`, payload);
            setShowCloseModal(false);
            fetchDutySlips();
        } catch (err) {
            console.error('Error updating duty slip execution:', err);
            alert(err.response?.data?.message || 'Error updating duty slip');
        }
    };

    // Open Approval Modal
    const handleOpenApprove = (slip) => {
        setSelectedSlip(slip);
        setApproveForm({
            approvedBy: slip.approval?.approvedBy || contract.contactPerson?.name || '',
            designation: slip.approval?.designation || contract.contactPerson?.designation || 'Transport In-charge',
            approvalStatus: 'Approved',
            approvalRemarks: slip.approval?.approvalRemarks || ''
        });
        setShowApproveModal(true);
    };

    // Submit Approval
    const handleApproveSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/corporate/duty-slips/${selectedSlip._id}/approval`, approveForm);
            setShowApproveModal(false);
            fetchDutySlips();
        } catch (err) {
            console.error('Error approving duty slip:', err);
            alert(err.response?.data?.message || 'Error recording approval');
        }
    };

    // Delete Slip
    const handleDeleteSlip = async (id, slipNo) => {
        if (!window.confirm(`Delete Duty Slip #${slipNo}?`)) return;
        try {
            await axios.delete(`/api/corporate/duty-slips/single/${id}`);
            fetchDutySlips();
        } catch (err) {
            console.error('Error deleting slip:', err);
            alert(err.response?.data?.message || 'Error deleting duty slip');
        }
    };

    if (!contract) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Please select or create a corporate contract first.
            </div>
        );
    }

    return (
        <div>
            {/* Header / Search / Filter Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                    {/* Contract selector */}
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

                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '340px' }}>
                        <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input
                            type="text"
                            placeholder="Search slip #, employee, car, PO..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 32px',
                                background: '#1e293b',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '12.5px'
                            }}
                        />
                    </div>

                    {/* Duty Date Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CorporateDateInput
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            placeholder="Filter by Date"
                            size="sm"
                            style={{ width: '155px' }}
                        />
                        {filterDate && (
                            <button
                                type="button"
                                onClick={() => setFilterDate('')}
                                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                                title="Clear date filter"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Status filter tabs */}
                    <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {['all', 'Requested', 'Completed', 'Approved'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                style={{
                                    background: statusFilter === st ? primaryColor : 'transparent',
                                    color: statusFilter === st ? '#000000' : '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleOpenCreate}
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        color: '#000000',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: `0 4px 12px ${primaryColor}40`
                    }}
                >
                    <Plus size={16} color="#000000" />
                    <span>New On-call Duty Slip</span>
                </button>
            </div>

            {/* Duty Slips Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading duty slips...
                </div>
            ) : slips.length === 0 ? (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '40px 20px',
                    textAlign: 'center'
                }}>
                    <FileText size={36} color="#64748b" style={{ margin: '0 auto 10px' }} />
                    <h4 style={{ color: '#ffffff', margin: '0 0 4px', fontSize: '15px' }}>No On-call Duty Slips Found</h4>
                    <p style={{ color: '#94a3b8', fontSize: '12.5px', marginBottom: '16px' }}>
                        Generate a new on-call duty slip for airport pickup, drop, or local packages.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        style={{ background: primaryColor, color: '#000000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer' }}
                    >
                        + Create First Duty Slip
                    </button>
                </div>
            ) : (
                <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#1f2937', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <th style={{ padding: '10px 14px' }}>Duty Slip #</th>
                                    <th style={{ padding: '10px 12px' }}>Date</th>
                                    <th style={{ padding: '10px 12px' }}>Duty Type & PO</th>
                                    <th style={{ padding: '10px 12px' }}>Passenger / Emp</th>
                                    <th style={{ padding: '10px 12px' }}>Vehicle & Driver</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>KM / Hrs</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Calculated Amount</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Approval Status</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slips.map((slip, idx) => {
                                    const exec = slip.execution || {};
                                    const chg = slip.charges || {};
                                    const app = slip.approval || {};
                                    const isApproved = slip.status === 'Approved';
                                    const isCompleted = slip.status === 'Completed';

                                    return (
                                        <tr
                                            key={slip._id}
                                            style={{
                                                background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}
                                        >
                                            {/* Slip Number */}
                                            <td style={{ padding: '10px 14px' }}>
                                                <div style={{ fontWeight: '900', color: primaryColor, fontSize: '13px' }}>
                                                    {slip.dutySlipNumber}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                                    {slip.pickupLocation} → {slip.dropLocation}
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: '800', color: '#ffffff' }}>{slip.dutyDate}</div>
                                                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                                    {slip.dutyDateTime ? new Date(slip.dutyDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </div>
                                            </td>

                                            {/* Duty Type & PO */}
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{slip.dutyType}</div>
                                                {slip.requestReference && (
                                                    <div style={{ fontSize: '11px', color: primaryColor, fontWeight: '700' }}>
                                                        PO: {slip.requestReference}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Guest / Employee */}
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: '800', color: '#ffffff' }}>
                                                    {slip.guestDetails?.name || 'Corporate Guest'}
                                                </div>
                                                {slip.guestDetails?.empId && (
                                                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                                        ID: {slip.guestDetails.empId} {slip.guestDetails.department ? `(${slip.guestDetails.department})` : ''}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Vehicle & Driver */}
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: '800', color: primaryColor }}>
                                                    🚗 {slip.vehicleNumber}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                                    👨‍✈️ {slip.driverName}
                                                </div>
                                            </td>

                                            {/* KM & Hours */}
                                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                                <div style={{ fontWeight: '800', color: primaryColor }}>
                                                    {exec.totalKm || 0} KM
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    {exec.totalHours || 0} Hrs
                                                </div>
                                            </td>

                                            {/* Charge Breakdown */}
                                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '950', color: '#4ade80' }}>
                                                    ₹{Number(chg.taxableAmount || chg.baseRate || 0).toLocaleString('en-IN')}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                    Base ₹{chg.baseRate || 0} {Number(chg.extraKmAmount || 0) > 0 ? `+ ExKM ₹${chg.extraKmAmount}` : ''}
                                                </div>
                                            </td>

                                            {/* Approval Status Badge */}
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    background: isApproved
                                                        ? 'rgba(34, 197, 94, 0.2)'
                                                        : isCompleted
                                                        ? `${primaryColor}20`
                                                        : 'rgba(245, 158, 11, 0.2)',
                                                    color: isApproved
                                                        ? '#4ade80'
                                                        : isCompleted
                                                        ? primaryColor
                                                        : '#fbbf24',
                                                    border: `1px solid ${isApproved ? 'rgba(34, 197, 94, 0.4)' : (isCompleted ? `${primaryColor}40` : 'rgba(245, 158, 11, 0.4)')}`
                                                }}>
                                                    {slip.status.toUpperCase()}
                                                </span>
                                                {isApproved && app.approvedBy && (
                                                    <div style={{ fontSize: '10px', color: '#86efac', marginTop: '3px' }}>
                                                        by {app.approvedBy}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                    {/* Meter Reading / Close */}
                                                    <button
                                                        onClick={() => handleOpenClose(slip)}
                                                        style={{
                                                            background: `${primaryColor}20`,
                                                            color: primaryColor,
                                                            border: `1px solid ${primaryColor}40`,
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '11.5px',
                                                            fontWeight: '700'
                                                        }}
                                                        title="Enter Meter KM & Close Slip"
                                                    >
                                                        KM / Close
                                                    </button>

                                                    {/* Corporate Approval */}
                                                    <button
                                                        onClick={() => handleOpenApprove(slip)}
                                                        style={{
                                                            background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: isApproved ? '#4ade80' : '#fbbf24',
                                                            border: 'none',
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '11.5px',
                                                            fontWeight: '700'
                                                        }}
                                                        title="Corporate Sign-off & Approval"
                                                    >
                                                        {isApproved ? 'Approved ✓' : 'Approve'}
                                                    </button>

                                                    {/* Print Slip */}
                                                    <button
                                                        onClick={() => setPrintSlip(slip)}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.08)',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            padding: '5px 7px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Print PDF Duty Slip"
                                                    >
                                                        <Printer size={13} />
                                                    </button>

                                                    {/* Delete */}
                                                    {!isApproved && (
                                                        <button
                                                            onClick={() => handleDeleteSlip(slip._id, slip.dutySlipNumber)}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                color: '#f87171',
                                                                border: 'none',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Delete Duty Slip"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CREATE DUTY SLIP MODAL */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '720px',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                                Create On-call Corporate Duty Slip
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleCreateSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Date, Time & PO */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '12px' }}>
                                <div>
                                    <CorporateDateInput
                                        label="Duty Date"
                                        required
                                        name="dutyDate"
                                        value={createForm.dutyDate}
                                        onChange={(e) => setCreateForm({ ...createForm, dutyDate: e.target.value })}
                                        size="sm"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Pickup Time *</label>
                                    <input
                                        type="time"
                                        required
                                        value={createForm.dutyTime}
                                        onChange={(e) => setCreateForm({ ...createForm, dutyTime: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '600', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Request Ref / PO #</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PO-2026-99"
                                        value={createForm.requestReference}
                                        onChange={(e) => setCreateForm({ ...createForm, requestReference: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Duty Type from Rate Card */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: primaryColor, display: 'block', marginBottom: '6px' }}>
                                    Duty Type & Agreed Tariff Package *
                                </label>
                                <select
                                    value={createForm.dutyType}
                                    onChange={(e) => setCreateForm({ ...createForm, dutyType: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: `1px solid ${primaryColor}70`, borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '700', outline: 'none' }}
                                >
                                    {(contract?.rateCard || []).map((rc, i) => (
                                        <option key={i} value={rc.dutyType}>
                                            {rc.dutyType} (Base ₹{rc.baseRate} • {rc.includedKm} KM / {rc.includedHours} Hrs)
                                        </option>
                                    ))}
                                    {(!contract?.rateCard || contract.rateCard.length === 0) && (
                                        <option value="8 Hours / 80 KM Local Package">8 Hours / 80 KM Local Package</option>
                                    )}
                                </select>
                            </div>

                            {/* Passenger Details */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                                    Corporate Employee / Guest Info
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Employee Name"
                                        value={createForm.guestName}
                                        onChange={(e) => setCreateForm({ ...createForm, guestName: e.target.value })}
                                        style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#ffffff', fontSize: '12.5px', outline: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Emp ID"
                                        value={createForm.guestEmpId}
                                        onChange={(e) => setCreateForm({ ...createForm, guestEmpId: e.target.value })}
                                        style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#ffffff', fontSize: '12.5px', outline: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Department"
                                        value={createForm.guestDept}
                                        onChange={(e) => setCreateForm({ ...createForm, guestDept: e.target.value })}
                                        style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#ffffff', fontSize: '12.5px', outline: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Mobile"
                                        value={createForm.guestMobile}
                                        onChange={(e) => setCreateForm({ ...createForm, guestMobile: e.target.value })}
                                        style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#ffffff', fontSize: '12.5px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Datalists for Duty Slip Vehicle & Driver selection */}
                            <datalist id="duty-fleet-vehicles">
                                {fleetVehicles.map((v, i) => (
                                    <option key={v._id || i} value={v.carNumber}>
                                        {v.label || `${v.carNumber} ${v.model ? `• ${v.model}` : ''}`}
                                    </option>
                                ))}
                            </datalist>

                            <datalist id="duty-fleet-drivers">
                                {fleetDrivers.map((d, i) => (
                                    <option key={d._id || i} value={d.name}>
                                        {d.label || `${d.name} ${d.mobile ? `• ${d.mobile}` : ''}`}
                                    </option>
                                ))}
                            </datalist>

                            {/* Vehicle, Driver Name & Driver Mobile - Clean 3-Column Layout */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span>Vehicle Number *</span>
                                        {fleetVehicles.length > 0 && <span style={{ fontSize: '10px', color: primaryColor }}>({fleetVehicles.length} fleet cars)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        list="duty-fleet-vehicles"
                                        required
                                        placeholder="Type or select car..."
                                        value={createForm.vehicleNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            const match = fleetVehicles.find(v => (v.carNumber || '').toUpperCase() === val || (v.rawNumber || '').toUpperCase() === val);
                                            setCreateForm({
                                                ...createForm,
                                                vehicleNumber: val,
                                                vehicleId: match?._id || createForm.vehicleId,
                                                vehicleModel: match?.model || createForm.vehicleModel
                                            });
                                        }}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: `1px solid ${createForm.vehicleNumber ? primaryColor : 'rgba(255,255,255,0.16)'}`, borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '800', outline: 'none' }}
                                    />
                                    {createForm.vehicleModel && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                                            🚗 {createForm.vehicleModel}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span>Driver Name *</span>
                                        {fleetDrivers.length > 0 && <span style={{ fontSize: '10px', color: '#38bdf8' }}>({fleetDrivers.length} drivers)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        list="duty-fleet-drivers"
                                        required
                                        placeholder="Type or select driver..."
                                        value={createForm.driverName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const match = fleetDrivers.find(d => (d.name || '').toLowerCase() === val.toLowerCase());
                                            setCreateForm({
                                                ...createForm,
                                                driverName: val,
                                                driverMobile: match?.mobile || createForm.driverMobile,
                                                driverId: match?._id || createForm.driverId
                                            });
                                        }}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '600', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                                        Driver Mobile
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Mobile #"
                                        value={createForm.driverMobile}
                                        onChange={(e) => setCreateForm({ ...createForm, driverMobile: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Pickup & Drop */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Pickup Location *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Airport Terminal 2 / Corporate Campus"
                                        value={createForm.pickupLocation}
                                        onChange={(e) => setCreateForm({ ...createForm, pickupLocation: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Drop Location *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Hotel Marriott / Residence"
                                        value={createForm.dropLocation}
                                        onChange={(e) => setCreateForm({ ...createForm, dropLocation: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Reporting Remarks</label>
                                <input
                                    type="text"
                                    placeholder="Special instructions, gate number..."
                                    value={createForm.reportingAddress}
                                    onChange={(e) => setCreateForm({ ...createForm, reportingAddress: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', background: primaryColor, border: 'none', color: '#000000', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    Generate Duty Slip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CLOSE DUTY SLIP / METER RECORD MODAL */}
            {showCloseModal && selectedSlip && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                                    Record Meter KM & Close Duty Slip #{selectedSlip.dutySlipNumber}
                                </h3>
                                <span style={{ fontSize: '11.5px', color: primaryColor }}>{selectedSlip.dutyType}</span>
                            </div>
                            <button onClick={() => setShowCloseModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleCloseSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* KM Readings */}
                            <div style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}30`, padding: '12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: primaryColor, textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Odometer / Meter Readings (KM)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Opening KM *</label>
                                        <input
                                            type="number"
                                            required
                                            value={closeForm.openingKm}
                                            onChange={(e) => setCloseForm({ ...closeForm, openingKm: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Closing KM *</label>
                                        <input
                                            type="number"
                                            required
                                            value={closeForm.closingKm}
                                            onChange={(e) => setCloseForm({ ...closeForm, closingKm: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>TOTAL RUN</div>
                                        <div style={{ fontSize: '18px', fontWeight: '950', color: primaryColor }}>
                                            {Math.max(0, Number(closeForm.closingKm) - Number(closeForm.openingKm))} KM
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Time Readings */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={closeForm.startTime}
                                        onChange={(e) => setCloseForm({ ...closeForm, startTime: e.target.value })}
                                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12.5px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>End / Release Time</label>
                                    <input
                                        type="time"
                                        value={closeForm.endTime}
                                        onChange={(e) => setCloseForm({ ...closeForm, endTime: e.target.value })}
                                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12.5px' }}
                                    />
                                </div>
                            </div>

                            {/* Extras (Toll, Parking, Allowance) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Toll Charges (₹)</label>
                                    <input
                                        type="number"
                                        value={closeForm.tollAmount}
                                        onChange={(e) => setCloseForm({ ...closeForm, tollAmount: e.target.value })}
                                        style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Parking (₹)</label>
                                    <input
                                        type="number"
                                        value={closeForm.parkingAmount}
                                        onChange={(e) => setCloseForm({ ...closeForm, parkingAmount: e.target.value })}
                                        style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Night Charge (₹)</label>
                                    <input
                                        type="number"
                                        value={closeForm.nightCharge}
                                        onChange={(e) => setCloseForm({ ...closeForm, nightCharge: e.target.value })}
                                        style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Driver Allow. (₹)</label>
                                    <input
                                        type="number"
                                        value={closeForm.driverAllowance}
                                        onChange={(e) => setCloseForm({ ...closeForm, driverAllowance: e.target.value })}
                                        style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                    />
                                </div>
                            </div>

                            {/* Adjustment / Discount */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#fca5a5', display: 'block', marginBottom: '3px' }}>Adjustment / Disc (₹)</label>
                                    <input
                                        type="number"
                                        value={closeForm.discountAmount}
                                        onChange={(e) => setCloseForm({ ...closeForm, discountAmount: e.target.value })}
                                        style={{ width: '100%', padding: '7px 8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', fontWeight: '700' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Adjustment Reason</label>
                                    <input
                                        type="text"
                                        placeholder="Agreed corporate deduction..."
                                        value={closeForm.discountReason}
                                        onChange={(e) => setCloseForm({ ...closeForm, discountReason: e.target.value })}
                                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCloseModal(false)}
                                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', background: primaryColor, border: 'none', color: '#000000', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    Save & Compute Charges
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CORPORATE APPROVAL MODAL */}
            {showApproveModal && selectedSlip && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={20} color="#4ade80" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                                    Corporate Sign-off: #{selectedSlip.dutySlipNumber}
                                </h3>
                            </div>
                            <button onClick={() => setShowApproveModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleApproveSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>
                                    Authorized Signee Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rajesh Sharma"
                                    value={approveForm.approvedBy}
                                    onChange={(e) => setApproveForm({ ...approveForm, approvedBy: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>
                                    Signee Designation
                                </label>
                                <input
                                    type="text"
                                    placeholder="Transport Desk / Admin Executive"
                                    value={approveForm.designation}
                                    onChange={(e) => setApproveForm({ ...approveForm, designation: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>
                                    Approval Decision
                                </label>
                                <select
                                    value={approveForm.approvalStatus}
                                    onChange={(e) => setApproveForm({ ...approveForm, approvalStatus: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#ffffff', fontSize: '13px', fontWeight: '700' }}
                                >
                                    <option value="Approved">✓ Approve as Billable Item</option>
                                    <option value="Pending">⏳ Pending Verification</option>
                                    <option value="Rejected">✕ Reject / Disputed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>
                                    Remarks / Note
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Approval remarks..."
                                    value={approveForm.approvalRemarks}
                                    onChange={(e) => setApproveForm({ ...approveForm, approvalRemarks: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '12px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowApproveModal(false)}
                                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', background: '#10b981', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    Record Approval
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINT DUTY SLIP MODAL */}
            {printSlip && (
                <PrintableDutySlipModal
                    dutySlip={printSlip}
                    contract={contract}
                    onClose={() => setPrintSlip(null)}
                />
            )}
        </div>
    );
};

export default CorporateDutySlipsTab;
