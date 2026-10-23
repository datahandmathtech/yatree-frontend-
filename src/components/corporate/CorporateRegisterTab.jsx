import React, { useState, useEffect } from 'react';
import {
    Calendar, CheckCircle2, XCircle, RefreshCw, Zap, Save, AlertTriangle,
    ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet, Plus, ShieldCheck, Car, User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCompany } from '../../context/CompanyContext';
import CorporateDateInput from './CorporateDateInput';
import axios from '../../api/axios';

const CorporateRegisterTab = ({ contract, contracts = [], onSelectContract }) => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const primaryColor = theme?.primary || '#fbbf24';
    const secondaryColor = theme?.secondary || '#f59e0b';
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [prefilling, setPrefilling] = useState(false);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'month'
    const [monthSummary, setMonthSummary] = useState(null);
    const [monthLoading, setMonthLoading] = useState(false);

    // Real Fleet Options (Vehicles & Drivers)
    const [fleetVehicles, setFleetVehicles] = useState([]);
    const [fleetDrivers, setFleetDrivers] = useState([]);

    const contractId = contract?._id;
    const companyId = contract?.company?._id || contract?.company || selectedCompany?._id || selectedCompany?.id || localStorage.getItem('companyId');

    // Fetch real fleet vehicles & drivers for selection
    const fetchFleetOptions = async () => {
        if (!companyId) return;
        try {
            const res = await axios.get(`/api/corporate/fleet-options/${companyId}`);
            if (res.data?.success) {
                setFleetVehicles(res.data.vehicles || []);
                setFleetDrivers(res.data.drivers || []);
            }
        } catch (err) {
            console.error('Error fetching fleet options in corporate register:', err);
            // Fallback to admin vehicles & drivers if needed
            try {
                const [vRes, dRes] = await Promise.all([
                    axios.get(`/api/admin/vehicles/${companyId}?usePagination=false`).catch(() => ({ data: [] })),
                    axios.get(`/api/admin/drivers/${companyId}?usePagination=false&driverType=All`).catch(() => ({ data: [] }))
                ]);
                const rawV = Array.isArray(vRes.data) ? vRes.data : (vRes.data?.vehicles || []);
                const rawD = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.drivers || []);
                setFleetVehicles(rawV.map(v => {
                    const clean = (v.carNumber || '').split('#')[0].trim();
                    return { _id: v._id, carNumber: clean, model: v.model || '', label: `${clean}${v.model ? ` (${v.model})` : ''}` };
                }));
                setFleetDrivers(rawD.map(d => ({
                    _id: d._id, name: d.name || '', mobile: d.mobile || d.phone || '', label: `${d.name}${d.mobile ? ` (${d.mobile})` : ''}`
                })));
            } catch (fallbackErr) {
                console.error('Fallback fleet fetch failed:', fallbackErr);
            }
        }
    };

    useEffect(() => {
        fetchFleetOptions();
    }, [companyId]);

    // Fetch daily register
    const fetchRegister = async () => {
        if (!contractId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/corporate/register/${contractId}?date=${selectedDate}`);
            if (res.data?.success) {
                setRecords(res.data.data || []);
                setSummary(res.data.summary || null);
            }
        } catch (err) {
            console.error('Error fetching register:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch month summary
    const fetchMonthSummary = async () => {
        if (!contractId) return;
        setMonthLoading(true);
        try {
            const [y, m] = selectedDate.split('-');
            const res = await axios.get(`/api/corporate/register/month-summary/${contractId}?year=${y}&month=${Number(m)}`);
            if (res.data?.success) {
                setMonthSummary(res.data);
            }
        } catch (err) {
            console.error('Error fetching month summary:', err);
        } finally {
            setMonthLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'daily') {
            fetchRegister();
        } else {
            fetchMonthSummary();
        }
    }, [contractId, selectedDate, viewMode]);

    // Pre-fill 20 Vehicles
    const handlePrefill = async () => {
        if (!contractId) return;
        setPrefilling(true);
        try {
            const res = await axios.post(`/api/corporate/register/prefill/${contractId}`, { date: selectedDate });
            if (res.data?.success) {
                fetchRegister();
            }
        } catch (err) {
            console.error('Error prefilling register:', err);
            alert(err.response?.data?.message || 'Error pre-filling vehicles');
        } finally {
            setPrefilling(false);
        }
    };

    // Clear all slots to blank
    const handleClear = async () => {
        if (!contractId) return;
        if (!window.confirm('Clear all vehicles and drivers to blank for this date?')) return;
        setPrefilling(true);
        try {
            const res = await axios.post(`/api/corporate/register/clear/${contractId}`, { date: selectedDate });
            if (res.data?.success) {
                fetchRegister();
            }
        } catch (err) {
            console.error('Error clearing register:', err);
            setRecords(prev => prev.map(r => ({
                ...r,
                vehicleNumber: '',
                vehicleModel: '',
                vehicleId: null,
                driverName: '',
                driverMobile: '',
                driverId: null,
                startKm: 0,
                endKm: 0,
                totalKm: 0
            })));
        } finally {
            setPrefilling(false);
        }
    };

    // Change multiple row values locally with atomic functional updater
    const handleUpdateRow = (index, updates) => {
        setRecords(prev => {
            const updated = [...prev];
            const currentRow = updated[index] || {};
            const row = { ...currentRow, ...updates };

            if ('startKm' in updates || 'endKm' in updates) {
                const sKm = Number(row.startKm) || 0;
                const eKm = Number(row.endKm) || 0;
                row.totalKm = Math.max(0, eKm - sKm);
            }

            if ('status' in updates) {
                if (row.status === 'Absent') {
                    row.isBillable = false;
                    row.totalDayAmount = 0;
                } else {
                    row.isBillable = true;
                    row.totalDayAmount = row.dayRateSnapshot != null ? Number(row.dayRateSnapshot) : (Number(contract?.regularRateConfig?.amount) || 0);
                }
            }

            updated[index] = row;
            return updated;
        });
    };

    const handleCellChange = (index, field, value) => {
        handleUpdateRow(index, { [field]: value });
    };

    // Save entire day
    const handleBulkSave = async () => {
        if (!contractId) return;
        setSaving(true);
        try {
            await axios.post(`/api/corporate/register/bulk-save/${contractId}`, {
                date: selectedDate,
                entries: records
            });
            alert('Daily register saved successfully!');
            fetchRegister();
        } catch (err) {
            console.error('Error saving daily register:', err);
            alert(err.response?.data?.message || 'Error saving daily register');
        } finally {
            setSaving(false);
        }
    };

    // Quick Date navigation
    const adjustDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    if (!contract) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Please select or create a corporate contract first.
            </div>
        );
    }

    const contractedCount = contract.contractedVehiclesCount != null ? contract.contractedVehiclesCount : 0;

    return (
        <div>
            {/* Control Bar: Contract selector, Date Picker, View Mode Toggle */}
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
                {/* Left: Contract & Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    {/* Contract selector */}
                    <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            ACTIVE CONTRACT
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
                                    {c.clientName} ({c.contractedVehiclesCount || 20} Cars)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Navigation */}
                    <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            DEPLOYMENT DATE
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={() => adjustDate(-1)}
                                style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', width: '34px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Previous Day"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <CorporateDateInput
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ width: '165px' }}
                                size="sm"
                            />

                            <button
                                type="button"
                                onClick={() => adjustDate(1)}
                                style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', width: '34px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Next Day"
                            >
                                <ChevronRight size={16} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                style={{
                                    background: selectedDate === todayStr ? primaryColor : 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    color: selectedDate === todayStr ? '#000000' : '#ffffff',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                }}
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: View mode and Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setViewMode('daily')}
                            style={{
                                background: viewMode === 'daily' ? primaryColor : 'transparent',
                                color: viewMode === 'daily' ? '#000000' : '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer'
                            }}
                        >
                            Daily Register
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            style={{
                                background: viewMode === 'month' ? primaryColor : 'transparent',
                                color: viewMode === 'month' ? '#000000' : '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer'
                            }}
                        >
                            Month Summary
                        </button>
                    </div>

                    {viewMode === 'daily' && (
                        <>
                            <button
                                onClick={handleClear}
                                disabled={prefilling || saving}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Clear all slots back to blank"
                            >
                                <RefreshCw size={13} />
                                <span>Reset Blank</span>
                            </button>

                            <button
                                onClick={handlePrefill}
                                disabled={prefilling}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                }}
                                title="Pre-fill contracted vehicles for this day"
                            >
                                <Zap size={14} />
                                <span>{prefilling ? 'Pre-filling...' : `⚡ Pre-fill ${contractedCount} Fleet`}</span>
                            </button>

                            <button
                                onClick={handleBulkSave}
                                disabled={saving}
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
                                <Save size={14} />
                                <span>{saving ? 'Saving...' : 'Save Register'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* DAILY VIEW */}
            {viewMode === 'daily' && (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>CONTRACTED FLEET</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#ffffff', marginTop: '2px' }}>
                                {summary?.contractedVehicles || contractedCount} <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cars</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '700' }}>ACTUALLY OPERATED</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#4ade80', marginTop: '2px' }}>
                                {summary?.operatedCount || 0} <span style={{ fontSize: '12px', color: '#86efac' }}>Vehicles</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#fde047', fontWeight: '700' }}>REPLACEMENTS</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#fbbf24', marginTop: '2px' }}>
                                {summary?.replacementCount || 0} <span style={{ fontSize: '12px', color: '#fde047' }}>Cars</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '700' }}>ABSENT / NON-OPERATED</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: '#f87171', marginTop: '2px' }}>
                                {summary?.absentCount || 0} <span style={{ fontSize: '11px', color: '#fca5a5' }}>(Deducted)</span>
                            </div>
                        </div>

                        <div style={{ background: `${primaryColor}12`, border: `1px solid ${primaryColor}30`, borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>TOTAL KM TODAY</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: primaryColor, marginTop: '2px' }}>
                                {summary?.totalKm || 0} <span style={{ fontSize: '12px', color: '#94a3b8' }}>KM</span>
                            </div>
                        </div>

                        <div style={{ background: `${primaryColor}12`, border: `1px solid ${primaryColor}30`, borderRadius: '12px', padding: '12px 16px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>DAY BILLABLE AMOUNT</div>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: primaryColor, marginTop: '2px' }}>
                                ₹{Number(summary?.totalDayAmount || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Loading daily transport register...
                        </div>
                    ) : records.length === 0 ? (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '16px',
                            padding: '40px 20px',
                            textAlign: 'center'
                        }}>
                            <Car size={36} color="#64748b" style={{ margin: '0 auto 10px' }} />
                            <h4 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '15px' }}>
                                No vehicles recorded for {selectedDate}
                            </h4>
                            <p style={{ color: '#94a3b8', fontSize: '12.5px', marginBottom: '16px' }}>
                                Click the button below to instantly populate the usual {contractedCount} vehicles from contract setup.
                            </p>
                            <button
                                onClick={handlePrefill}
                                style={{
                                    background: primaryColor,
                                    color: '#000000',
                                    border: 'none',
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                ⚡ Pre-fill {contractedCount} Contracted Vehicles Now
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            background: '#111827',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            overflow: 'hidden'
                        }}>
                            {/* Datalists for Company Fleet Autocomplete */}
                            <datalist id="corporate-fleet-vehicles">
                                {fleetVehicles.map((v, i) => (
                                    <option key={v._id || i} value={v.carNumber}>
                                        {v.label || `${v.carNumber} ${v.model ? `• ${v.model}` : ''}`}
                                    </option>
                                ))}
                            </datalist>

                            <datalist id="corporate-fleet-drivers">
                                {fleetDrivers.map((d, i) => (
                                    <option key={d._id || i} value={d.name}>
                                        {d.label || `${d.name} ${d.mobile ? `• ${d.mobile}` : ''}`}
                                    </option>
                                ))}
                            </datalist>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#1f2937', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                            <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                                            <th style={{ padding: '10px 12px', minWidth: '150px' }}>
                                                Vehicle No {fleetVehicles.length > 0 && <span style={{ fontSize: '10px', color: primaryColor }}>({fleetVehicles.length})</span>}
                                            </th>
                                            <th style={{ padding: '10px 12px', minWidth: '150px' }}>
                                                Driver {fleetDrivers.length > 0 && <span style={{ fontSize: '10px', color: primaryColor }}>({fleetDrivers.length})</span>}
                                            </th>
                                            <th style={{ padding: '10px 12px', minWidth: '130px' }}>Shift / Route</th>
                                            <th style={{ padding: '10px 10px', width: '90px' }}>Start KM</th>
                                            <th style={{ padding: '10px 10px', width: '90px' }}>End KM</th>
                                            <th style={{ padding: '10px 10px', width: '80px', fontWeight: '900' }}>Total KM</th>
                                            <th style={{ padding: '10px 12px', minWidth: '130px' }}>Status</th>
                                            <th style={{ padding: '10px 12px', minWidth: '150px' }}>Replacement Info</th>
                                            <th style={{ padding: '10px 12px', minWidth: '120px' }}>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((row, idx) => {
                                            const isAbsent = row.status === 'Absent';
                                            const isReplacement = row.status === 'Replacement';

                                            return (
                                                <tr
                                                    key={row._id || idx}
                                                    style={{
                                                        background: isAbsent
                                                            ? 'rgba(239, 68, 68, 0.06)'
                                                            : isReplacement
                                                            ? 'rgba(245, 158, 11, 0.06)'
                                                            : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                    }}
                                                >
                                                    {/* Slot Number */}
                                                    <td style={{ padding: '8px 12px', fontWeight: '800', color: '#64748b' }}>
                                                        {row.slotNumber}
                                                    </td>

                                                    {/* Vehicle Number */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="text"
                                                                list="corporate-fleet-vehicles"
                                                                placeholder="Select / Type Vehicle..."
                                                                value={row.vehicleNumber || ''}
                                                                onChange={(e) => {
                                                                    const rawVal = e.target.value || '';
                                                                    const cleanVal = rawVal.trim().toUpperCase();
                                                                    const norm = cleanVal.replace(/[\s\-_]/g, '');

                                                                    const match = fleetVehicles.find(v => 
                                                                        (v.carNumber || '').replace(/[\s\-_]/g, '').toUpperCase() === norm || 
                                                                        (v.rawNumber || '').replace(/[\s\-_]/g, '').toUpperCase() === norm ||
                                                                        (v.carNumber && cleanVal.includes(v.carNumber.toUpperCase()))
                                                                    );

                                                                    const chosenVehNo = match ? match.carNumber : cleanVal;
                                                                    const updates = { vehicleNumber: chosenVehNo };

                                                                    if (match) {
                                                                        updates.vehicleId = match._id;
                                                                        if (match.model) updates.vehicleModel = match.model;
                                                                        if (match.defaultDriverName && (!row.driverName || row.driverName.startsWith('Driver '))) {
                                                                            updates.driverName = match.defaultDriverName;
                                                                            if (match.defaultDriverMobile) updates.driverMobile = match.defaultDriverMobile;
                                                                            if (match.defaultDriverId) updates.driverId = match.defaultDriverId;
                                                                        }
                                                                    }

                                                                    handleUpdateRow(idx, updates);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'rgba(255, 255, 255, 0.06)',
                                                                    border: row.vehicleNumber ? `1px solid ${primaryColor}60` : '1px solid rgba(255, 255, 255, 0.15)',
                                                                    borderRadius: '6px',
                                                                    color: '#ffffff',
                                                                    fontWeight: '800',
                                                                    padding: '6px 8px',
                                                                    fontSize: '12px'
                                                                }}
                                                                title={`Choose from ${fleetVehicles.length} fleet vehicles or type number`}
                                                            />
                                                            {row.vehicleModel && (
                                                                <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    🚗 {row.vehicleModel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Driver Name */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="text"
                                                                list="corporate-fleet-drivers"
                                                                placeholder="Select / Type Driver..."
                                                                value={row.driverName || ''}
                                                                onChange={(e) => {
                                                                    const rawVal = e.target.value || '';
                                                                    const cleanVal = rawVal.trim();
                                                                    const match = fleetDrivers.find(d => 
                                                                        (d.name || '').trim().toLowerCase() === cleanVal.toLowerCase() ||
                                                                        (d.label && d.label.toLowerCase() === cleanVal.toLowerCase())
                                                                    );

                                                                    const chosenName = match ? match.name : cleanVal;
                                                                    const updates = { driverName: chosenName };

                                                                    if (match) {
                                                                        updates.driverId = match._id;
                                                                        if (match.mobile) updates.driverMobile = match.mobile;
                                                                    }

                                                                    handleUpdateRow(idx, updates);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'rgba(255, 255, 255, 0.06)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                    borderRadius: '6px',
                                                                    color: '#cbd5e1',
                                                                    padding: '6px 8px',
                                                                    fontSize: '12px'
                                                                }}
                                                                title={`Choose from ${fleetDrivers.length} registered drivers`}
                                                            />
                                                            {row.driverMobile && (
                                                                <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                                    📞 {row.driverMobile}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Route / Shift */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Route 1"
                                                            value={row.route || ''}
                                                            onChange={(e) => handleCellChange(idx, 'route', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '6px',
                                                                color: '#94a3b8',
                                                                padding: '6px 8px',
                                                                fontSize: '11.5px'
                                                            }}
                                                        />
                                                    </td>

                                                    {/* Start KM */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <input
                                                            type="number"
                                                            value={row.startKm || ''}
                                                            onChange={(e) => handleCellChange(idx, 'startKm', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '6px',
                                                                color: '#cbd5e1',
                                                                textAlign: 'center',
                                                                padding: '6px 6px',
                                                                fontSize: '12px'
                                                            }}
                                                        />
                                                    </td>

                                                    {/* End KM */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <input
                                                            type="number"
                                                            value={row.endKm || ''}
                                                            onChange={(e) => handleCellChange(idx, 'endKm', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '6px',
                                                                color: '#cbd5e1',
                                                                textAlign: 'center',
                                                                padding: '6px 6px',
                                                                fontSize: '12px'
                                                            }}
                                                        />
                                                    </td>

                                                    {/* Total KM */}
                                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '900', color: primaryColor }}>
                                                        {row.totalKm || 0}
                                                    </td>

                                                    {/* Status Dropdown */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <select
                                                            value={row.status || 'Operated'}
                                                            onChange={(e) => handleCellChange(idx, 'status', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: isAbsent
                                                                    ? '#dc2626'
                                                                    : isReplacement
                                                                    ? '#d97706'
                                                                    : '#16a34a',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                padding: '6px 8px',
                                                                fontSize: '11.5px',
                                                                fontWeight: '800',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="Operated">✓ Operated</option>
                                                            <option value="Replacement">⇄ Replacement</option>
                                                            <option value="Absent">✕ Absent (No Show)</option>
                                                        </select>
                                                    </td>

                                                    {/* Replacement Info */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        {isReplacement ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <input
                                                                    type="text"
                                                                    list="corporate-fleet-vehicles"
                                                                    placeholder="Repl. Car No..."
                                                                    value={row.replacementVehicleNumber || ''}
                                                                    onChange={(e) => {
                                                                        const rawVal = e.target.value || '';
                                                                        const cleanVal = rawVal.trim().toUpperCase();
                                                                        const norm = cleanVal.replace(/[\s\-_]/g, '');
                                                                        const match = fleetVehicles.find(v => 
                                                                            (v.carNumber || '').replace(/[\s\-_]/g, '').toUpperCase() === norm ||
                                                                            (v.rawNumber || '').replace(/[\s\-_]/g, '').toUpperCase() === norm
                                                                        );
                                                                        const chosenVehNo = match ? match.carNumber : cleanVal;
                                                                        const updates = { replacementVehicleNumber: chosenVehNo };
                                                                        if (match) {
                                                                            updates.replacementVehicleId = match._id;
                                                                            if (match.model) updates.replacementVehicleModel = match.model;
                                                                        }
                                                                        handleUpdateRow(idx, updates);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                                        border: '1px solid #f59e0b',
                                                                        borderRadius: '4px',
                                                                        color: '#fbbf24',
                                                                        padding: '4px 6px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700'
                                                                    }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    list="corporate-fleet-drivers"
                                                                    placeholder="Repl. Driver Name..."
                                                                    value={row.replacementDriverName || ''}
                                                                    onChange={(e) => {
                                                                        const rawVal = e.target.value || '';
                                                                        const cleanVal = rawVal.trim();
                                                                        const match = fleetDrivers.find(d => (d.name || '').trim().toLowerCase() === cleanVal.toLowerCase());
                                                                        const chosenName = match ? match.name : cleanVal;
                                                                        const updates = { replacementDriverName: chosenName };
                                                                        if (match) {
                                                                            updates.replacementDriverId = match._id;
                                                                            if (match.mobile) updates.replacementDriverMobile = match.mobile;
                                                                        }
                                                                        handleUpdateRow(idx, updates);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                        borderRadius: '4px',
                                                                        color: '#cbd5e1',
                                                                        padding: '3px 6px',
                                                                        fontSize: '10.5px'
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#475569', fontSize: '11px' }}>-</span>
                                                        )}
                                                    </td>

                                                    {/* Remarks */}
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Note..."
                                                            value={row.remarks || ''}
                                                            onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                borderRadius: '6px',
                                                                color: '#94a3b8',
                                                                padding: '5px 8px',
                                                                fontSize: '11px'
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* MONTH-WISE SUMMARY VIEW */}
            {viewMode === 'month' && (
                <div>
                    {monthLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Calculating month-wise summary...
                        </div>
                    ) : monthSummary ? (
                        <div>
                            {/* Month KPI Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>TOTAL CONTRACTED DAYS</div>
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: '#ffffff', marginTop: '2px' }}>
                                        {monthSummary.summary?.totalContractedVehicleDays} <span style={{ fontSize: '11px', color: '#94a3b8' }}>Vehicle-Days</span>
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                        {monthSummary.contract?.contractedVehiclesCount} cars × {monthSummary.daysInMonth} days
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '700' }}>ACTUALLY OPERATED</div>
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: '#4ade80', marginTop: '2px' }}>
                                        {monthSummary.summary?.actuallyOperatedVehicleDays} <span style={{ fontSize: '11px', color: '#86efac' }}>Vehicle-Days</span>
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#86efac', marginTop: '2px' }}>
                                        {monthSummary.summary?.replacementVehicleDays} replacements included
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '700' }}>ABSENT / DEDUCTED</div>
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: '#f87171', marginTop: '2px' }}>
                                        {monthSummary.summary?.absentVehicleDays} <span style={{ fontSize: '11px', color: '#fca5a5' }}>Vehicle-Days</span>
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#fca5a5', marginTop: '2px' }}>
                                        Not billed to client
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '11px', color: '#fde047', fontWeight: '700' }}>MISSING ENTRIES</div>
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: '#fbbf24', marginTop: '2px' }}>
                                        {monthSummary.summary?.missingEntriesCount}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#fde047', marginTop: '2px' }}>
                                        Unfilled vehicle slots
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(254, 240, 138, 0.08)', border: '1px solid rgba(254, 240, 138, 0.3)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontSize: '11px', color: '#fef08a', fontWeight: '700' }}>TOTAL REGULAR VALUE</div>
                                    <div style={{ fontSize: '20px', fontWeight: '950', color: '#fef08a', marginTop: '2px' }}>
                                        ₹{Number(monthSummary.summary?.grandTotalRegularAmount || 0).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#fef08a', marginTop: '2px' }}>
                                        @ ₹{monthSummary.contract?.regularRateConfig?.amount ?? 0}/day
                                    </div>
                                </div>
                            </div>

                            {/* Day-by-Day Table */}
                            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#1f2937', color: '#94a3b8' }}>
                                            <th style={{ padding: '10px' }}>Date</th>
                                            <th style={{ padding: '10px' }}>Contracted</th>
                                            <th style={{ padding: '10px', color: '#4ade80' }}>Operated</th>
                                            <th style={{ padding: '10px', color: '#fbbf24' }}>Replacements</th>
                                            <th style={{ padding: '10px', color: '#f87171' }}>Absent</th>
                                            <th style={{ padding: '10px' }}>Missing</th>
                                            <th style={{ padding: '10px' }}>Total KM</th>
                                            <th style={{ padding: '10px', fontWeight: '900' }}>Day Amount</th>
                                            <th style={{ padding: '10px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(monthSummary.dayWiseBreakdown || []).map((day) => (
                                            <tr key={day.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '9px', fontWeight: '800', color: '#ffffff' }}>{day.date}</td>
                                                <td style={{ padding: '9px', color: '#94a3b8' }}>{day.contracted}</td>
                                                <td style={{ padding: '9px', fontWeight: '800', color: '#4ade80' }}>{day.operated}</td>
                                                <td style={{ padding: '9px', color: '#fbbf24' }}>{day.replacement}</td>
                                                <td style={{ padding: '9px', fontWeight: '800', color: '#f87171' }}>{day.absent}</td>
                                                <td style={{ padding: '9px', color: day.missing > 0 ? '#f59e0b' : '#64748b' }}>{day.missing}</td>
                                                <td style={{ padding: '9px' }}>{day.totalKm}</td>
                                                <td style={{ padding: '9px', fontWeight: '900', color: '#fef08a' }}>₹{Number(day.amount).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: '9px' }}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDate(day.date);
                                                            setViewMode('daily');
                                                        }}
                                                        style={{
                                                            background: `${primaryColor}20`,
                                                            color: primaryColor,
                                                            border: `1px solid ${primaryColor}40`,
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '11px',
                                                            fontWeight: '800'
                                                        }}
                                                    >
                                                        Open Day
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default CorporateRegisterTab;
