import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axios';
import {
    Calendar, Clock, Car, UploadCloud, Save, Check, AlertTriangle,
    Search, Plus, Trash2, ChevronRight, Layers, FileSpreadsheet,
    Download, Undo2, Split, Eye, RefreshCw, Lock, ArrowUpDown
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import { todayIST } from '../utils/istUtils';
import StageUploadMapView from '../components/eventExcel/StageUploadMapView';
import StageReconcileView from '../components/eventExcel/StageReconcileView';
import StageConsolidationView from '../components/eventExcel/StageConsolidationView';
import DutyDetailDrawer from '../components/eventExcel/DutyDetailDrawer';
import Step5ModulesView from '../components/eventExcel/Step5ModulesView';

export function calculateDeparturePickup(flightDateStr, flightTimeStr, leadMinutes = 120) {
    if (!flightTimeStr) return { pickupDate: flightDateStr || '', pickupTime: '' };

    const cleanTime = String(flightTimeStr).trim();
    let hours = 0;
    let minutes = 0;
    const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const meridiem = match12[3] ? match12[3].toUpperCase() : null;
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
    } else {
        const parts = cleanTime.split(':');
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
    }

    const baseStr = flightDateStr || todayIST();
    const [y, m, d] = baseStr.split('-').map(Number);
    const utcDt = new Date(Date.UTC(y || 2026, (m || 11) - 1, d || 26, hours, minutes, 0));
    utcDt.setUTCMinutes(utcDt.getUTCMinutes() - Number(leadMinutes || 120));

    const outY = utcDt.getUTCFullYear();
    const outM = String(utcDt.getUTCMonth() + 1).padStart(2, '0');
    const outD = String(utcDt.getUTCDate()).padStart(2, '0');
    const outH = String(utcDt.getUTCHours()).padStart(2, '0');
    const outMin = String(utcDt.getUTCMinutes()).padStart(2, '0');

    return { pickupDate: `${outY}-${outM}-${outD}`, pickupTime: `${outH}:${outMin}` };
}

const ROW_STATUS_STYLE = {
    Scheduled: { bg: 'transparent', badgeBg: 'rgba(56,189,248,0.14)', color: '#38bdf8' },
    Dispatched: { bg: 'rgba(245,158,11,0.06)', badgeBg: 'rgba(245,158,11,0.18)', color: '#fbbf24' },
    Running: { bg: 'rgba(16,185,129,0.06)', badgeBg: 'rgba(16,185,129,0.18)', color: '#34d399' },
    Completed: { bg: 'rgba(99,102,241,0.06)', badgeBg: 'rgba(99,102,241,0.2)', color: '#818cf8' },
    Cancelled: { bg: 'rgba(239,68,68,0.06)', badgeBg: 'rgba(239,68,68,0.18)', color: '#f87171' }
};

const LiveEventExcel = () => {
    const { selectedCompany } = useCompany();
    const navigate = useNavigate();
    const { eventId: urlEventId } = useParams();
    const quickImportInputRef = useRef(null);

    // Master Event Selection
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(false);

    // 5-Step Flow UI (Steps: 1 Upload, 2 Map, 3 Reconcile, '3c' Consolidation, 4 Live Sheet, 5 Connected Modules)
    const [activeStep, setActiveStep] = useState(4);

    // Live Duties & Undo Stack + Dirty Tracking
    const [duties, setDuties] = useState([]);
    const [dirtyIds, setDirtyIds] = useState(new Set());
    const [undoStack, setUndoStack] = useState([]);
    const [saving, setSaving] = useState(false);
    const [retryingSync, setRetryingSync] = useState(false);
    const [syncBannerState, setSyncBannerState] = useState({ state: 'synced', message: 'Live • Synchronized' });

    // Selection, Filters, Sort
    const [selectedDutyIds, setSelectedDutyIds] = useState([]);
    const [serviceFilter, setServiceFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('pickupDate');
    const [sortAsc, setSortAsc] = useState(true);

    // Drawer & Masters
    const [drawerDuty, setDrawerDuty] = useState(null);
    const [fleetVehicles, setFleetVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [vehicleCalendar, setVehicleCalendar] = useState([]);

    // Staging Batch States (Screens A, B, C)
    const [importBatches, setImportBatches] = useState([]);
    const [activeBatch, setActiveBatch] = useState(null);
    const [stagedMovements, setStagedMovements] = useState([]);
    const [reconciliation, setReconciliation] = useState(null);
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [proposedConsolidation, setProposedConsolidation] = useState([]);

    // Configuration Parameters
    const [config, setConfig] = useState({
        departureLeadMinutes: 120,
        stationLeadMinutes: 60,
        defaultTurnaroundMinutes: 30,
        disposalHours: 8,
        disposalKm: 80,
        intercityRouteNotes: 'Udaipur -> Jaipur',
        timezone: 'Asia/Kolkata'
    });

    const [counts, setCounts] = useState({
        rawRows: 0,
        uniqueGuestGroups: 0,
        vehicleDuties: 0,
        distinctVehicles: 0,
        drsDuties: 0,
        vendorDuties: 0,
        outboxFailed: 0
    });

    const [alerts, setAlerts] = useState([]);

    const getHeaders = () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        return { Authorization: `Bearer ${userInfo.token}` };
    };

    const companyId = selectedCompany?._id || '';

    // 1. Fetch Events
    useEffect(() => {
        if (!companyId) return;
        axios.get(`/api/admin/events/${companyId}`, { headers: getHeaders() })
            .then(({ data }) => {
                const list = data || [];
                setEvents(list);
                if (urlEventId) setSelectedEventId(urlEventId);
                else if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0]._id);
            })
            .catch(err => console.error('Error fetching events:', err));
    }, [companyId, urlEventId]);

    // 2. Load Complete Duties & Staging Sheet
    const loadSheetData = async (evId) => {
        if (!evId || !companyId) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/events/${evId}/duties?companyId=${companyId}`, {
                headers: getHeaders()
            });
            setSelectedEvent(data.event);
            setDuties(data.duties || []);
            setDirtyIds(new Set());
            setUndoStack([]);
            setSelectedDutyIds([]);
            if (data.excelConfig) setConfig(prev => ({ ...prev, ...data.excelConfig }));
            if (data.counts) setCounts(data.counts);
            setAlerts(data.reconciliationAlerts || []);
            setFleetVehicles(data.fleetVehicles || []);
            setDrivers(data.drivers || []);
            setVendors(data.vendors || []);
            setImportBatches(data.importBatches || []);
            setVehicleCalendar(data.vehicleCalendar || []);
            setSavedTemplates(data.event?.mappingTemplates || []);

            const hasErr = (data.duties || []).some(d => d.syncStatus === 'SyncError') || (data.counts?.outboxFailed || 0) > 0;
            const hasPending = (data.duties || []).some(d => d.syncStatus === 'Pending');
            if (hasErr) setSyncBannerState({ state: 'error', message: 'Sync Error — Click Retry Sync' });
            else if (hasPending) setSyncBannerState({ state: 'pending', message: 'Sync Pending' });
            else setSyncBannerState({ state: 'synced', message: 'Live • Synchronized' });
        } catch (err) {
            console.error('Error loading event sheet:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEventId && companyId) loadSheetData(selectedEventId);
    }, [selectedEventId, companyId]);

    // 3. Inline Cell Edits with Undo Stack
    const handleCellChange = (dutyIdKey, field, value) => {
        setUndoStack(prev => [...prev.slice(-24), JSON.parse(JSON.stringify(duties))]);
        setDuties(prev => prev.map(d => {
            if ((d.dutyId || d._id) !== dutyIdKey) return d;
            if (d.status === 'Completed' || d.isLocked) {
                alert(`Duty ${d.dutyId} is Completed & locked. Open Drawer to unlock correction.`);
                return d;
            }
            const updated = { ...d, [field]: value };
            if (updated.serviceType === 'DEPARTURE') {
                if (field === 'guestPickup') {
                    updated.manualPickupOverride = true;
                } else if ((field === 'flightTime' || field === 'flightDate' || field === 'serviceType') && !updated.manualPickupOverride && updated.flightTime) {
                    const lead = updated.pickupLeadMinutes ?? (updated.isStation ? config.stationLeadMinutes : config.departureLeadMinutes);
                    const calc = calculateDeparturePickup(updated.flightDate || updated.pickupDate, updated.flightTime, lead);
                    updated.pickupDate = calc.pickupDate;
                    updated.guestPickup = calc.pickupTime;
                }
            }
            return updated;
        }));
        setDirtyIds(prev => new Set(prev).add(dutyIdKey));
        setSyncBannerState({ state: 'dirty', message: 'Unsaved local edits' });
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const previousSnapshot = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        setDuties(previousSnapshot);
    };

    // Multi-cell Clipboard Paste from Excel (Section 5 requirement!)
    const handleGridPaste = (e, startRowDutyId, startField) => {
        const text = e.clipboardData?.getData('text/plain');
        if (!text || (!text.includes('\t') && !text.includes('\n'))) return; // Let single cell paste behave normally
        e.preventDefault();

        const pastedRows = text.trim().split(/\r?\n/).map(line => line.split('\t'));
        const editableCols = ['guestGroup', 'pax', 'carType', 'serviceType', 'pickupDate', 'guestPickup', 'flightDate', 'flightTime', 'pickupPoint', 'dropLocation', 'vehicleNumber'];
        const startColIdx = editableCols.indexOf(startField);
        if (startColIdx === -1) return;

        const visibleKeys = filteredAndSortedDuties.map(d => d.dutyId || d._id);
        const startRowIdx = visibleKeys.indexOf(startRowDutyId);
        if (startRowIdx === -1) return;

        setUndoStack(prev => [...prev.slice(-24), JSON.parse(JSON.stringify(duties))]);
        const touched = new Set(dirtyIds);

        setDuties(prev => {
            const next = [...prev];
            pastedRows.forEach((cols, rOffset) => {
                const targetKey = visibleKeys[startRowIdx + rOffset];
                if (!targetKey) return;
                const targetIdx = next.findIndex(d => (d.dutyId || d._id) === targetKey);
                if (targetIdx === -1 || next[targetIdx].isLocked || next[targetIdx].status === 'Completed') return;

                const rowCopy = { ...next[targetIdx] };
                cols.forEach((cellVal, cOffset) => {
                    const colName = editableCols[startColIdx + cOffset];
                    if (!colName) return;
                    rowCopy[colName] = colName === 'pax' ? (Number(cellVal) || 1) : cellVal.trim();
                });
                next[targetIdx] = rowCopy;
                touched.add(targetKey);
            });
            return next;
        });
        setDirtyIds(touched);
        setSyncBannerState({ state: 'dirty', message: 'Unsaved pasted edits' });
    };

    // 4. Add New Manual Duty
    const handleAddDuty = async () => {
        if (!selectedEventId) return;
        try {
            const { data } = await axios.post(
                `/api/admin/events/${selectedEventId}/duties?companyId=${companyId}`,
                {
                    companyId,
                    guestGroup: 'New Guest / Group',
                    pax: 2,
                    carType: 'Crysta',
                    serviceType: serviceFilter !== 'All' ? serviceFilter.toUpperCase() : 'ARRIVAL',
                    pickupDate: todayIST(),
                    guestPickup: '10:00',
                    pickupPoint: selectedEvent?.location || 'Udaipur Airport',
                    dropLocation: 'Hotel'
                },
                { headers: getHeaders() }
            );
            setDuties(prev => [...prev, data.duty]);
            setDrawerDuty(data.duty);
        } catch (err) {
            alert('Error adding duty: ' + (err.response?.data?.message || err.message));
        }
    };

    // 5. Save Dirty Edits & Parameters (with optimistic concurrency v check!)
    const handleSaveAndSync = async () => {
        if (!selectedEventId) return;
        setSaving(true);
        try {
            // Save config first
            await axios.patch(
                `/api/admin/events/${selectedEventId}/excel-config?companyId=${companyId}`,
                { companyId, excelConfig: config, reconciliationAlerts: alerts },
                { headers: getHeaders() }
            );

            const dirtyList = duties.filter(d => dirtyIds.has(d.dutyId || d._id));
            let conflictHit = null;

            for (const d of dirtyList) {
                try {
                    await axios.patch(
                        `/api/admin/events/${selectedEventId}/duties/${d.dutyId || d._id}?companyId=${companyId}`,
                        { ...d, companyId, version: d.version, changeType: 'CellEdit' },
                        { headers: getHeaders() }
                    );
                } catch (err) {
                    if (err.response?.status === 409) {
                        conflictHit = d.dutyId;
                    } else {
                        throw err;
                    }
                }
            }

            if (conflictHit) {
                setSyncBannerState({ state: 'error', message: `Version Conflict on ${conflictHit}` });
                alert(`⚠ Concurrent Edit Conflict detected on ${conflictHit}! Reloading latest server duties to prevent silent overwrite.`);
            } else {
                alert(`✓ Saved ${dirtyList.length} modified duty/duties and synced cleanly with DRS, Vendor Book & Master Calendar!`);
            }
            await loadSheetData(selectedEventId);
        } catch (err) {
            console.error('Save & Sync error:', err);
            setSyncBannerState({ state: 'error', message: 'Sync Failed — Unsaved / Retry' });
            alert('Save error: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleRetryOutboxSync = async () => {
        if (!selectedEventId) return;
        setRetryingSync(true);
        try {
            const { data } = await axios.post(
                `/api/admin/events/${selectedEventId}/outbox/retry?companyId=${companyId}`,
                { companyId },
                { headers: getHeaders() }
            );
            alert(data.message);
            await loadSheetData(selectedEventId);
        } catch (err) {
            alert('Retry sync failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setRetryingSync(false);
        }
    };

    // 6. Merge & Split Duties
    const handleMergeSelected = async () => {
        if (selectedDutyIds.length < 2) {
            alert('Select 2 or more rows in the grid checkboxes first to merge into one vehicle.');
            return;
        }
        try {
            const { data } = await axios.post(
                `/api/admin/events/${selectedEventId}/duties/merge?companyId=${companyId}`,
                { companyId, dutyIds: selectedDutyIds },
                { headers: getHeaders() }
            );
            alert(data.message);
            await loadSheetData(selectedEventId);
        } catch (err) {
            alert('Merge failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSplitSelected = async () => {
        if (selectedDutyIds.length !== 1) {
            alert('Select exactly 1 row to split into multiple car duties.');
            return;
        }
        const splitStr = window.prompt('Split this duty into how many vehicles?', '2');
        const splitCount = parseInt(splitStr, 10);
        if (!splitCount || splitCount < 2) return;
        try {
            const { data } = await axios.post(
                `/api/admin/events/${selectedEventId}/duties/${selectedDutyIds[0]}/split?companyId=${companyId}`,
                { companyId, splitCount },
                { headers: getHeaders() }
            );
            alert(data.message);
            await loadSheetData(selectedEventId);
        } catch (err) {
            alert('Split failed: ' + (err.response?.data?.message || err.message));
        }
    };

    // 7. Quick Workbook Upload from Header -> directly creates Batch & opens Step 2 Mapping
    const handleQuickFileUpload = async (file) => {
        if (!file || !selectedEventId) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post(
                `/api/admin/events/${selectedEventId}/imports?companyId=${companyId}`,
                formData,
                { headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' } }
            );
            setActiveBatch(data.batch);
            if (data.savedTemplates) setSavedTemplates(data.savedTemplates);
            setImportBatches(prev => [data.batch, ...prev]);
            setActiveStep(2);
        } catch (err) {
            alert('Error uploading workbook: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleResumeBatch = async (batch) => {
        setActiveBatch(batch);
        if (batch.status === 'Staged') {
            setActiveStep(2);
            return;
        }
        try {
            const { data } = await axios.get(
                `/api/admin/events/${selectedEventId}/imports/${batch._id}/reconcile?companyId=${companyId}`,
                { headers: getHeaders() }
            );
            setStagedMovements(data.movements || []);
            setReconciliation(data.reconciliation);
            setActiveStep(batch.status === 'Committed' ? 4 : 3);
        } catch (err) {
            setActiveStep(2);
        }
    };

    // 8. Export XLSX / CSV
    const handleExportXlsx = async () => {
        if (!selectedEventId) return;
        try {
            const res = await axios.get(
                `/api/admin/events/${selectedEventId}/duties/export?companyId=${companyId}`,
                { headers: getHeaders(), responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(selectedEvent?.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_Live_Event_Excel.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export XLSX failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleExportCsv = () => {
        const headers = ['Duty ID', 'Guest/Group', 'PAX', 'Car Type', 'Service', 'Pickup Date', 'Guest Pickup', 'Flight Date', 'Flight Time', 'Pickup', 'Drop', 'Vehicle Number', 'Source', 'Status'];
        const rows = filteredAndSortedDuties.map(d => [
            d.dutyId, d.guestGroup, d.pax, d.carType, d.serviceType, d.pickupDate, d.guestPickup,
            d.flightDate, d.flightTime, d.pickupPoint, d.dropLocation, d.vehicleNumber, d.vehicleSource, d.status
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(selectedEvent?.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_Duties.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleResolveBottomAlert = async (alertItem) => {
        if (alertItem.type === 'pickup_confirm' && alertItem.dutyId) {
            const target = duties.find(d => d.dutyId === alertItem.dutyId);
            if (target) {
                await axios.patch(
                    `/api/admin/events/${selectedEventId}/duties/${target.dutyId}?companyId=${companyId}`,
                    { companyId, pickupConfirmed: true, version: target.version, changeType: 'CellEdit', reason: 'Confirmed pickup time from alert' },
                    { headers: getHeaders() }
                ).catch(() => {});
            }
        }
        const nextAlerts = alerts.map(a => a.id === alertItem.id ? { ...a, status: 'resolved' } : a);
        setAlerts(nextAlerts);
        await axios.patch(
            `/api/admin/events/${selectedEventId}/excel-config?companyId=${companyId}`,
            { companyId, reconciliationAlerts: nextAlerts },
            { headers: getHeaders() }
        ).catch(() => {});
        await loadSheetData(selectedEventId);
    };

    // Filtering & Sorting
    const filteredAndSortedDuties = useMemo(() => {
        const list = duties.filter(d => {
            if (serviceFilter !== 'All') {
                const st = (d.serviceType || '').toUpperCase();
                if (!st.includes(serviceFilter.toUpperCase())) return false;
            }
            if (statusFilter !== 'All' && d.status !== statusFilter) return false;
            if (sourceFilter !== 'All' && d.vehicleSource !== sourceFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = (d.dutyId || '').toLowerCase().includes(q)
                    || (d.guestGroup || '').toLowerCase().includes(q)
                    || (d.carType || '').toLowerCase().includes(q)
                    || (d.pickupPoint || '').toLowerCase().includes(q)
                    || (d.dropLocation || '').toLowerCase().includes(q)
                    || (d.vehicleNumber || '').toLowerCase().includes(q)
                    || (d.vendorName || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });

        return [...list].sort((a, b) => {
            let va = a[sortField] ?? '';
            let vb = b[sortField] ?? '';
            if (sortField === 'pax') {
                va = Number(va) || 0;
                vb = Number(vb) || 0;
            } else {
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
            }
            if (va === vb) return String(a.guestPickup || '').localeCompare(String(b.guestPickup || ''));
            return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
    }, [duties, serviceFilter, statusFilter, sourceFilter, searchQuery, sortField, sortAsc]);

    const handleSort = (field) => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(true); }
    };

    const pendingAlerts = alerts.filter(a => a.status === 'pending');

    return (
        <div style={{
            minHeight: '100vh',
            background: '#090e1a',
            color: '#f8fafc',
            padding: 'clamp(16px, 3vw, 32px)',
            fontFamily: "'Inter', -apple-system, sans-serif"
        }}>
            <SEO title="Live Event Excel & Reconciliation Centre | LogKaro" />

            {/* ═══ TOP HEADER ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        EVENT MANAGEMENT / SPREADSHEET CENTRE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '950', margin: 0, color: 'white' }}>
                            Live Event Excel
                        </h1>
                        <select
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setActiveBatch(null);
                                setActiveStep(4);
                            }}
                            style={{
                                background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(251, 191, 36, 0.45)',
                                color: '#fbbf24', fontSize: '13px', fontWeight: '900', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            {events.map(ev => (
                                <option key={ev._id} value={ev._id}>
                                    {ev.name} ({ev.client || 'Client'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                        One editable sheet for vehicle duties, with linked DRS, Vendor Book and Master Calendar.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        ref={quickImportInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => handleQuickFileUpload(e.target.files?.[0])}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => quickImportInputRef.current?.click()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                            borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            color: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                        }}
                    >
                        <UploadCloud size={16} /> Import client workbook
                    </button>

                    <button
                        onClick={handleExportXlsx}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
                            borderRadius: '12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                            color: '#34d399', fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                        }}
                    >
                        <Download size={15} /> XLSX
                    </button>

                    <button
                        onClick={handleExportCsv}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
                            borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                        }}
                    >
                        CSV
                    </button>

                    <button
                        onClick={handleSaveAndSync}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px',
                            borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            border: 'none', color: 'white', fontSize: '13px', fontWeight: '900',
                            cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
                        }}
                    >
                        <Check size={17} strokeWidth={3} />
                        {saving ? 'Syncing...' : `Save & Sync${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ''}`}
                    </button>
                </div>
            </div>

            {/* ═══ 4 METRIC CARDS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Raw workbook rows</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '4px 0' }}>{counts.rawRows}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Groom + Bride + Common</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Unique guest groups</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '4px 0' }}>{counts.uniqueGuestGroups}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>After duplicate review</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Vehicle duties</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: '#38bdf8', margin: '4px 0' }}>{counts.vehicleDuties}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Car movement = one duty</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Distinct vehicles assigned</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: '#10b981', margin: '4px 0' }}>{counts.distinctVehicles}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Vehicles can be reused</div>
                </div>
            </div>

            {/* ═══ 5-STEP FLOW STEPPER (+ CAR CONSOLIDATION STAGE C) ═══ */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.45)', padding: '10px 18px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                gap: '10px', overflowX: 'auto', marginBottom: '22px'
            }}>
                {[
                    { id: 1, num: 1, label: 'Upload all sheets' },
                    { id: 2, num: 2, label: 'Map client columns' },
                    { id: 3, num: 3, label: 'Reconcile exceptions' },
                    { id: '3c', num: 'C', label: 'Car consolidation' },
                    { id: 4, num: 4, label: 'Final vehicle-wise sheet' },
                    { id: 5, num: 5, label: 'DRS / Vendor / Calendar' }
                ].map((step, idx, arr) => (
                    <React.Fragment key={step.id}>
                        <div
                            onClick={() => setActiveStep(step.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                padding: '6px 12px', borderRadius: '10px',
                                background: activeStep === step.id ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                                border: activeStep === step.id ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                                color: activeStep === step.id ? '#38bdf8' : 'rgba(255,255,255,0.48)',
                                fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: activeStep === step.id ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                                color: activeStep === step.id ? 'black' : 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '950'
                            }}>{step.num}</span>
                            {step.label}
                        </div>
                        {idx < arr.length - 1 && <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}
                    </React.Fragment>
                ))}
            </div>

            {/* ═══ SCREEN A: UPLOAD & MAP (STEPS 1 & 2) ═══ */}
            {(activeStep === 1 || activeStep === 2) && (
                <StageUploadMapView
                    eventId={selectedEventId}
                    companyId={companyId}
                    activeBatch={activeBatch}
                    importBatches={importBatches}
                    savedTemplates={savedTemplates}
                    onBatchCreated={(batch, tpls) => {
                        setActiveBatch(batch);
                        if (tpls) setSavedTemplates(tpls);
                        setImportBatches(prev => [batch, ...prev.filter(x => x._id !== batch._id)]);
                        setActiveStep(2);
                    }}
                    onBatchMapped={(batch, movs, recon) => {
                        setActiveBatch(batch);
                        setStagedMovements(movs || []);
                        setReconciliation(recon);
                        setActiveStep(3);
                    }}
                    onResumeBatch={handleResumeBatch}
                />
            )}

            {/* ═══ SCREEN B: RECONCILIATION REVIEW (STEP 3) ═══ */}
            {activeStep === 3 && (
                <StageReconcileView
                    eventId={selectedEventId}
                    companyId={companyId}
                    activeBatch={activeBatch}
                    reconciliation={reconciliation}
                    initialDecisions={activeBatch?.operatorDecisions || {}}
                    onBackToMap={() => setActiveStep(1)}
                    onDecisionsSaved={(data) => {
                        setActiveBatch(data.batch);
                        setStagedMovements(data.movements || []);
                        setProposedConsolidation(data.proposedDuties || []);
                        setReconciliation(data.reconciliation);
                        setActiveStep('3c');
                    }}
                />
            )}

            {/* ═══ SCREEN C: GUEST-TO-CAR CONSOLIDATION ═══ */}
            {activeStep === '3c' && (
                <StageConsolidationView
                    eventId={selectedEventId}
                    companyId={companyId}
                    activeBatch={activeBatch}
                    movements={stagedMovements}
                    initialProposed={proposedConsolidation}
                    onBackToReconcile={() => setActiveStep(3)}
                    onCommitted={async () => {
                        setActiveStep(4);
                        await loadSheetData(selectedEventId);
                    }}
                />
            )}

            {/* ═══ STEP 5: CONNECTED MODULES (DRS / VENDOR BOOK / MASTER CALENDAR) ═══ */}
            {activeStep === 5 && (
                <Step5ModulesView
                    duties={duties}
                    vehicleCalendar={vehicleCalendar}
                    counts={counts}
                    config={config}
                    retryingSync={retryingSync}
                    onRetrySync={handleRetryOutboxSync}
                    onSelectDuty={(d) => setDrawerDuty(d)}
                />
            )}

            {/* ═══ SCREEN D: FINAL VEHICLE-WISE REGISTER (STEP 4) ═══ */}
            {activeStep === 4 && (
                <>
                    {/* HEADER + TOOLBAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '950', margin: 0, color: 'white' }}>
                                    Final vehicle-wise register
                                </h2>
                                <span style={{
                                    padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900',
                                    background: syncBannerState.state === 'error' ? 'rgba(239,68,68,0.18)' : syncBannerState.state === 'dirty' ? 'rgba(245,158,11,0.18)' : 'rgba(34, 197, 94, 0.15)',
                                    color: syncBannerState.state === 'error' ? '#f87171' : syncBannerState.state === 'dirty' ? '#fbbf24' : '#4ade80',
                                    border: `1px solid ${syncBannerState.state === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.3)'}`
                                }}>
                                    {syncBannerState.message}
                                </span>
                                {syncBannerState.state === 'error' && (
                                    <button onClick={handleRetryOutboxSync} style={{ padding: '3px 10px', borderRadius: '6px', background: '#ef4444', border: 'none', color: 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>
                                        Retry Failed Sync
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                                Click Duty ID to open Details Drawer • Supports Excel tab-separated multi-cell paste • Departure retains flight & pickup times separately.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                                <input
                                    type="text"
                                    placeholder="Filter guest, plate, route..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '7px 10px 7px 30px', borderRadius: '10px', fontSize: '12px', width: '190px' }}
                                />
                            </div>

                            <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo last grid edit before save" style={{
                                padding: '7px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: undoStack.length > 0 ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                            }}>
                                <Undo2 size={14} /> Undo ({undoStack.length})
                            </button>

                            {selectedDutyIds.length >= 2 && (
                                <button onClick={handleMergeSelected} style={{
                                    padding: '7px 12px', borderRadius: '10px', background: 'rgba(56,189,248,0.16)', border: '1px solid rgba(56,189,248,0.4)',
                                    color: '#38bdf8', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    <Layers size={14} /> Merge ({selectedDutyIds.length})
                                </button>
                            )}

                            {selectedDutyIds.length === 1 && (
                                <button onClick={handleSplitSelected} style={{
                                    padding: '7px 12px', borderRadius: '10px', background: 'rgba(168,85,247,0.16)', border: '1px solid rgba(168,85,247,0.4)',
                                    color: '#c084fc', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    <Split size={14} /> Split Car
                                </button>
                            )}

                            <button onClick={handleAddDuty} style={{
                                padding: '7px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
                                color: 'white', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                            }}>
                                <Plus size={14} /> Add duty
                            </button>
                        </div>
                    </div>

                    {/* SERVICE + STATUS + SOURCE FILTERS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['All', 'Arrival', 'Departure', 'Disposal', 'Intercity', 'Local'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setServiceFilter(tab)}
                                    style={{
                                        padding: '6px 13px', borderRadius: '8px', border: 'none',
                                        background: serviceFilter === tab ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255,255,255,0.03)',
                                        color: serviceFilter === tab ? '#38bdf8' : 'rgba(255,255,255,0.55)',
                                        fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                                    }}
                                >
                                    {tab === 'All' ? 'All Duties' : tab}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '11px' }}>
                                <option value="All">All Sources</option>
                                <option value="Own">Own Fleet</option>
                                <option value="Vendor">Vendor Cars</option>
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '11px' }}>
                                <option value="All">All Statuses</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="Running">Running</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* SPREADSHEET GRID */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.5)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)',
                        overflowX: 'auto', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1320px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)', fontSize: '10.5px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '10px 10px', width: '36px' }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredAndSortedDuties.length > 0 && selectedDutyIds.length === filteredAndSortedDuties.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedDutyIds(filteredAndSortedDuties.map(d => d.dutyId));
                                                else setSelectedDutyIds([]);
                                            }}
                                        />
                                    </th>
                                    <th onClick={() => handleSort('dutyId')} style={{ padding: '10px 10px', width: '92px', cursor: 'pointer', position: 'sticky', left: 0, background: '#0f172a', zIndex: 2 }}>
                                        Duty ID <ArrowUpDown size={10} style={{ display: 'inline' }} />
                                    </th>
                                    <th onClick={() => handleSort('guestGroup')} style={{ padding: '10px 10px', minWidth: '175px', cursor: 'pointer', position: 'sticky', left: '92px', background: '#0f172a', zIndex: 2 }}>
                                        Guest / Group <ArrowUpDown size={10} style={{ display: 'inline' }} />
                                    </th>
                                    <th onClick={() => handleSort('pax')} style={{ padding: '10px 8px', width: '60px', cursor: 'pointer' }}>PAX</th>
                                    <th style={{ padding: '10px 10px', width: '125px' }}>Car Type</th>
                                    <th style={{ padding: '10px 10px', width: '125px' }}>Service Type</th>
                                    <th onClick={() => handleSort('pickupDate')} style={{ padding: '10px 10px', width: '128px', cursor: 'pointer' }}>Pickup Date</th>
                                    <th onClick={() => handleSort('guestPickup')} style={{ padding: '10px 8px', width: '92px', cursor: 'pointer' }}>Guest Pickup</th>
                                    <th style={{ padding: '10px 10px', width: '122px' }}>Flight Date</th>
                                    <th style={{ padding: '10px 8px', width: '88px' }}>Flight Time</th>
                                    <th style={{ padding: '10px 10px', minWidth: '140px' }}>From / Reporting</th>
                                    <th style={{ padding: '10px 10px', minWidth: '140px' }}>To / Destination</th>
                                    <th style={{ padding: '10px 10px', width: '125px' }}>Vehicle Number</th>
                                    <th style={{ padding: '10px 8px', width: '100px' }}>Source</th>
                                    <th style={{ padding: '10px 8px', width: '110px' }}>Status</th>
                                    <th style={{ padding: '10px 8px', width: '75px' }}>Inspect</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={16} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading Live Event Sheet...</td></tr>
                                ) : filteredAndSortedDuties.length === 0 ? (
                                    <tr>
                                        <td colSpan={16} style={{ padding: '44px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>
                                                No live vehicle duties staged for this event yet.
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <button onClick={() => setActiveStep(1)} style={{ padding: '8px 16px', borderRadius: '10px', background: '#2563eb', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                                                    Step 1: Import Client Excel Workbook
                                                </button>
                                                <button onClick={handleAddDuty} style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                                                    + Add Manual Duty Row
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAndSortedDuties.map((duty) => {
                                    const dKey = duty.dutyId || duty._id;
                                    const isDirty = dirtyIds.has(dKey);
                                    const isChecked = selectedDutyIds.includes(dKey);
                                    const stStyle = ROW_STATUS_STYLE[duty.status] || ROW_STATUS_STYLE.Scheduled;
                                    const rowBg = duty.turnaroundConflict ? 'rgba(239,68,68,0.1)' : stStyle.bg;

                                    return (
                                        <tr key={duty._id || dKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: rowBg, opacity: duty.status === 'Cancelled' ? 0.6 : 1 }}>
                                            <td style={{ padding: '8px 10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => setSelectedDutyIds(prev => prev.includes(dKey) ? prev.filter(x => x !== dKey) : [...prev, dKey])}
                                                />
                                            </td>
                                            <td onClick={() => setDrawerDuty(duty)} style={{ padding: '8px 10px', cursor: 'pointer', position: 'sticky', left: 0, background: '#0c1324', zIndex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: '950', fontSize: '12px' }}>
                                                    {duty.dutyId}
                                                    {isDirty && <span title="Unsaved edit" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />}
                                                    {(duty.status === 'Completed' || duty.isLocked) && <Lock size={11} color="#818cf8" />}
                                                    {duty.turnaroundConflict && <AlertTriangle size={12} color="#f87171" title={duty.turnaroundMessage} />}
                                                </div>
                                            </td>
                                            <td style={{ padding: '4px 8px', position: 'sticky', left: '92px', background: '#0c1324', zIndex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={duty.guestGroup || ''}
                                                    onPaste={(e) => handleGridPaste(e, dKey, 'guestGroup')}
                                                    onChange={(e) => handleCellChange(dKey, 'guestGroup', e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '5px 6px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '700' }}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="number" min="1" value={duty.pax || 1} onChange={(e) => handleCellChange(dKey, 'pax', Number(e.target.value))}
                                                    style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '12.5px' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <select value={duty.carType || 'Crysta'} onChange={(e) => handleCellChange(dKey, 'carType', e.target.value)}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '5px', borderRadius: '6px', fontSize: '11.5px' }}>
                                                    <option value="Sedan">Sedan</option>
                                                    <option value="Ertiga">Ertiga</option>
                                                    <option value="Crysta">Crysta</option>
                                                    <option value="Innova Hycross">Innova Hycross</option>
                                                    <option value="Fortuner">Fortuner</option>
                                                    <option value="Urbania">Urbania</option>
                                                    <option value="Tempo 12 Seater">Tempo 12s</option>
                                                    <option value="Tempo 17 Seater">Tempo 17s</option>
                                                    <option value="Bus 35 Seater">Bus 35s</option>
                                                    <option value="Bus 45 Seater">Bus 45s</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <select value={duty.serviceType || 'ARRIVAL'} onChange={(e) => handleCellChange(dKey, 'serviceType', e.target.value)}
                                                    style={{
                                                        width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: duty.serviceType === 'DEPARTURE' ? '#fbbf24' : duty.serviceType === 'ARRIVAL' ? '#34d399' : '#38bdf8',
                                                        padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: '900'
                                                    }}>
                                                    <option value="ARRIVAL">ARRIVAL</option>
                                                    <option value="DEPARTURE">DEPARTURE</option>
                                                    <option value="DISPOSAL">DISPOSAL</option>
                                                    <option value="INTERCITY">INTERCITY</option>
                                                    <option value="LOCAL">LOCAL</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="date" value={duty.pickupDate || ''} onChange={(e) => handleCellChange(dKey, 'pickupDate', e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '11.5px', colorScheme: 'dark' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="text" value={duty.guestPickup || ''} onChange={(e) => handleCellChange(dKey, 'guestPickup', e.target.value)}
                                                    style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: '#fbbf24', fontWeight: '900', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="date" value={duty.flightDate || ''} onChange={(e) => handleCellChange(dKey, 'flightDate', e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: '11.5px', colorScheme: 'dark' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="text" placeholder="--:--" value={duty.flightTime || ''} onChange={(e) => handleCellChange(dKey, 'flightTime', e.target.value)}
                                                    style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="text" value={duty.pickupPoint || ''} onChange={(e) => handleCellChange(dKey, 'pickupPoint', e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="text" value={duty.dropLocation || ''} onChange={(e) => handleCellChange(dKey, 'dropLocation', e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '12px' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <input type="text" placeholder="Assign..." value={duty.vehicleNumber || ''} onChange={(e) => handleCellChange(dKey, 'vehicleNumber', e.target.value)}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#38bdf8', padding: '5px 7px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800' }} />
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <select value={duty.vehicleSource || 'Own'} onChange={(e) => handleCellChange(dKey, 'vehicleSource', e.target.value)}
                                                    style={{
                                                        width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                                        color: duty.vehicleSource === 'Vendor' ? '#c084fc' : '#34d399', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                                                    }}>
                                                    <option value="Own">Own</option>
                                                    <option value="Vendor">Vendor</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <select value={duty.status || 'Scheduled'} onChange={(e) => handleCellChange(dKey, 'status', e.target.value)}
                                                    style={{ width: '100%', background: stStyle.badgeBg, border: 'none', color: stStyle.color, padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                                    <option value="Scheduled">Scheduled</option>
                                                    <option value="Dispatched">Dispatched</option>
                                                    <option value="Running">Running</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                <button onClick={() => setDrawerDuty(duty)} title="Inspect Drawer, Vehicle Assign, Source Evidence & Audit History"
                                                    style={{ padding: '5px 9px', borderRadius: '7px', background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}>
                                                    <Eye size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* PARAMETERS CONFIG BAR */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.45)', padding: '14px 18px', borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                        gap: '14px', flexWrap: 'wrap', marginBottom: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>Airport lead (m)</label>
                            <input type="number" value={config.departureLeadMinutes} onChange={e => setConfig({ ...config, departureLeadMinutes: Number(e.target.value) || 120 })}
                                style={{ width: '56px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>Station lead (m)</label>
                            <input type="number" value={config.stationLeadMinutes} onChange={e => setConfig({ ...config, stationLeadMinutes: Number(e.target.value) || 60 })}
                                style={{ width: '56px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>Turnaround (m)</label>
                            <input type="number" value={config.defaultTurnaroundMinutes} onChange={e => setConfig({ ...config, defaultTurnaroundMinutes: Number(e.target.value) || 30 })}
                                style={{ width: '56px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>Disposal hrs / km</label>
                            <input type="number" value={config.disposalHours} onChange={e => setConfig({ ...config, disposalHours: Number(e.target.value) || 8 })}
                                style={{ width: '48px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }} />
                            <input type="number" value={config.disposalKm} onChange={e => setConfig({ ...config, disposalKm: Number(e.target.value) || 80 })}
                                style={{ width: '52px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '170px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)' }}>Intercity notes</label>
                            <input type="text" value={config.intercityRouteNotes} onChange={e => setConfig({ ...config, intercityRouteNotes: e.target.value })}
                                style={{ flex: 1, height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 10px', borderRadius: '8px', fontSize: '12px' }} />
                        </div>
                    </div>

                    {/* BOTTOM PANELS: IMPORT RECONCILIATION ALERTS + CONNECTED MODULE STATUS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '22px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '950', color: 'white' }}>Import Reconciliation Alerts</h3>
                                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>
                                    {pendingAlerts.length} for review
                                </span>
                            </div>

                            {pendingAlerts.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12.5px' }}>
                                    ✓ No pending duplicates or unconfirmed pickups. Use Step 1–3 for staged client revisions.
                                </div>
                            ) : pendingAlerts.map(al => (
                                <div key={al.id} style={{ background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{al.title}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{al.description}</div>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                        {al.type === 'duplicate' && activeBatch ? (
                                            <button onClick={() => setActiveStep(3)} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(56,189,248,0.16)', border: '1px solid rgba(56,189,248,0.35)', color: '#38bdf8', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                                                Review in Step 3
                                            </button>
                                        ) : null}
                                        <button onClick={() => handleResolveBottomAlert(al)} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                                            {al.type === 'pickup_confirm' ? 'Confirm pickup' : 'Mark reviewed'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '22px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '950', color: 'white' }}>Connected Module Status</h3>
                                <button onClick={() => setActiveStep(5)} style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                                    Open Calendar & Links →
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)' }}>
                                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Live DRS</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#38bdf8' }}>{counts.drsDuties} duties</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)' }}>
                                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Vendor Book (Outside Cars)</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#c084fc' }}>{counts.vendorDuties} outside vehicle duty</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)' }}>
                                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Master Calendar</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#10b981' }}>{counts.distinctVehicles} vehicles ({counts.vehicleDuties} duties)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)' }}>
                                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Event timezone</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '900', color: 'white' }}>{config.timezone}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* SLIDE-OVER DUTY DETAILS, VEHICLE ASSIGN, SOURCE & AUDIT DRAWER */}
            {drawerDuty && (
                <DutyDetailDrawer
                    eventId={selectedEventId}
                    companyId={companyId}
                    duty={drawerDuty}
                    fleetVehicles={fleetVehicles}
                    drivers={drivers}
                    vendors={vendors}
                    rateCard={selectedEvent?.rateCard || []}
                    defaultTurnaroundMinutes={config.defaultTurnaroundMinutes}
                    onClose={() => setDrawerDuty(null)}
                    onDutyUpdated={async (updatedDuty, addNew = false) => {
                        setDrawerDuty(updatedDuty);
                        if (addNew) {
                            setDuties(prev => [...prev, updatedDuty]);
                        }
                        await loadSheetData(selectedEventId);
                    }}
                />
            )}
        </div>
    );
};

export default LiveEventExcel;
