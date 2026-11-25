import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axios';
import {
    Calendar, Clock, Car, Plane, Train, MapPin, UploadCloud, Save, Check,
    AlertCircle, Search, Plus, Trash2, ArrowRight, ShieldCheck, CheckCircle,
    XCircle, RefreshCw, FileSpreadsheet, Eye, ChevronRight, Layers, HelpCircle,
    Filter, Database, ArrowDownToLine, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import * as XLSX from 'xlsx';
import { todayIST, toISTDateString, formatTimeIST } from '../utils/istUtils';

// -------------------------------------------------------------
// PURE BUSINESS RULES & TIME UTILITIES
// -------------------------------------------------------------

export function calculateDeparturePickup(flightDateStr, flightTimeStr, leadMinutes = 120) {
    if (!flightTimeStr) return { pickupDate: flightDateStr, pickupTime: '' };
    
    // Parse flight time (HH:mm or HH:mm AM/PM)
    let hours = 0;
    let minutes = 0;
    const cleanTime = String(flightTimeStr).trim();
    
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

    // Build Date object based on flightDateStr
    const baseDate = flightDateStr ? new Date(`${flightDateStr}T00:00:00`) : new Date();
    baseDate.setHours(hours, minutes, 0, 0);

    // Subtract lead minutes
    baseDate.setMinutes(baseDate.getMinutes() - Number(leadMinutes || 120));

    // Extract pickup date and time in 24hr and 12hr formats
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const pickupDate = `${y}-${m}-${d}`;

    const outH = String(baseDate.getHours()).padStart(2, '0');
    const outM = String(baseDate.getMinutes()).padStart(2, '0');
    const pickupTime = `${outH}:${outM}`;

    return { pickupDate, pickupTime };
}

const LiveEventExcel = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const navigate = useNavigate();
    const { eventId: urlEventId } = useParams();

    // Master Events List for Dropdown
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stepper Active Step (1..5)
    const [activeStep, setActiveStep] = useState(4); // Default on 4: Final vehicle-wise sheet

    // Service Filters
    const [serviceFilter, setServiceFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Spreadsheet Live Duties
    const [duties, setDuties] = useState([]);

    // Configuration Parameters
    const [config, setConfig] = useState({
        departureLeadMinutes: 120,
        defaultTurnaroundMinutes: 30,
        disposalHours: 8,
        disposalKm: 80,
        intercityRouteNotes: 'Udaipur -> Jaipur',
        timezone: 'Asia/Kolkata'
    });

    // Counts & Metric Cards
    const [counts, setCounts] = useState({
        rawRows: 14,
        uniqueGuestGroups: 11,
        vehicleDuties: 5,
        distinctVehicles: 3,
        drsDuties: 5,
        vendorDuties: 1
    });

    // Reconciliation Alerts
    const [alerts, setAlerts] = useState([
        {
            id: 'alt-1',
            type: 'duplicate',
            title: 'Potential duplicate: Mr. Rahul + 9',
            description: 'Groom Arrival row 12 ↔ Common Arrival row 8 • No flight number yet • same date/time/group',
            status: 'pending',
            guestGroup: 'Mr. Rahul + 9'
        },
        {
            id: 'alt-2',
            type: 'pickup_confirm',
            title: 'Guest pickup needs confirmation',
            description: 'Departure duty LK-003 • Flight 18:00 • Suggested pickup 16:00 (120 min before flight)',
            status: 'pending',
            dutyId: 'LK-003',
            suggestedPickup: '16:00'
        }
    ]);

    // Modal States
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadWorkbook, setUploadWorkbook] = useState(null);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [selectedSheets, setSelectedSheets] = useState([]);
    const [parsingStaging, setParsingStaging] = useState(false);

    // ── 1. Fetch Events for Company ──
    const fetchCompanyEvents = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const eventList = data || [];
            setEvents(eventList);
            
            // Choose event from URL or first available
            const initialId = urlEventId || (eventList.length > 0 ? eventList[0]._id : '');
            if (initialId) {
                setSelectedEventId(initialId);
            }
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    };

    useEffect(() => {
        fetchCompanyEvents();
    }, [selectedCompany]);

    // ── 2. Load Selected Event Live Excel Data ──
    const loadEventExcelData = async (evId) => {
        if (!evId) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/${evId}/excel-duties`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            setSelectedEvent(data.event);
            if (data.excelDuties && data.excelDuties.length > 0) {
                setDuties(data.excelDuties);
            } else {
                // Initialize with Starter Prototype Data matching specification mockup
                const today = todayIST();
                setDuties([
                    {
                        dutyId: 'LK-001',
                        guestGroup: 'Mr. Rahul + 9',
                        pax: 10,
                        carType: 'Urbania',
                        serviceType: 'ARRIVAL',
                        pickupDate: today,
                        guestPickup: '10:40',
                        flightDate: '',
                        flightTime: '',
                        pickupPoint: 'Udaipur Airport',
                        dropLocation: 'Taj Aravali',
                        vehicleNumber: 'RJ27-TA-1001',
                        vehicleSource: 'Own',
                        status: 'Scheduled'
                    },
                    {
                        dutyId: 'LK-002',
                        guestGroup: 'Ms. Priya + 2',
                        pax: 3,
                        carType: 'Crysta',
                        serviceType: 'ARRIVAL',
                        pickupDate: today,
                        guestPickup: '13:00',
                        flightDate: '',
                        flightTime: '',
                        pickupPoint: 'Udaipur Airport',
                        dropLocation: 'Trident',
                        vehicleNumber: 'RJ27-TA-1002',
                        vehicleSource: 'Own',
                        status: 'Scheduled'
                    },
                    {
                        dutyId: 'LK-003',
                        guestGroup: 'Mr. Amit + 3',
                        pax: 4,
                        carType: 'Crysta',
                        serviceType: 'DEPARTURE',
                        pickupDate: today,
                        guestPickup: '16:00',
                        flightDate: today,
                        flightTime: '18:00',
                        pickupPoint: 'Trident',
                        dropLocation: 'Udaipur Airport',
                        vehicleNumber: 'RJ27-TA-1001',
                        vehicleSource: 'Own',
                        status: 'Scheduled'
                    },
                    {
                        dutyId: 'LK-004',
                        guestGroup: 'Family guests',
                        pax: 6,
                        carType: 'Urbania',
                        serviceType: 'DISPOSAL',
                        pickupDate: today,
                        guestPickup: '09:00',
                        flightDate: '',
                        flightTime: '',
                        pickupPoint: 'Taj Aravali',
                        dropLocation: 'Local Disposal',
                        vehicleNumber: 'RJ27-TA-1004',
                        vehicleSource: 'Vendor',
                        status: 'Scheduled'
                    },
                    {
                        dutyId: 'LK-005',
                        guestGroup: 'Mr. Shah + 1',
                        pax: 2,
                        carType: 'Crysta',
                        serviceType: 'INTERCITY',
                        pickupDate: today,
                        guestPickup: '07:00',
                        flightDate: '',
                        flightTime: '',
                        pickupPoint: 'Udaipur',
                        dropLocation: 'Jaipur',
                        vehicleNumber: 'RJ27-TA-1005',
                        vehicleSource: 'Own',
                        status: 'Scheduled'
                    }
                ]);
            }

            if (data.excelConfig) {
                setConfig(prev => ({ ...prev, ...data.excelConfig }));
            }
            if (data.reconciliationAlerts && data.reconciliationAlerts.length > 0) {
                setAlerts(data.reconciliationAlerts);
            }
            if (data.counts) {
                setCounts(data.counts);
            }
        } catch (err) {
            console.error('Error loading excel duties:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEventId) {
            loadEventExcelData(selectedEventId);
        }
    }, [selectedEventId]);

    // Recalculate distinct vehicles whenever duties change
    useEffect(() => {
        const distinctVehs = new Set(duties.map(d => (d.vehicleNumber || '').trim()).filter(Boolean));
        setCounts(prev => ({
            ...prev,
            vehicleDuties: duties.length,
            distinctVehicles: distinctVehs.size,
            vendorDuties: duties.filter(d => d.vehicleSource === 'Vendor').length
        }));
    }, [duties]);

    // ── 3. Handle Cell Edits in Grid ──
    const handleCellChange = (index, field, value) => {
        setDuties(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };

            // Automatic Departure Pickup Lead Time Logic (Flight Time minus 120 mins)
            if (updated.serviceType === 'DEPARTURE') {
                if (field === 'flightTime' || field === 'flightDate' || field === 'serviceType') {
                    const fDate = updated.flightDate || updated.pickupDate || todayIST();
                    const fTime = updated.flightTime;
                    if (fTime) {
                        const { pickupDate, pickupTime } = calculateDeparturePickup(fDate, fTime, config.departureLeadMinutes);
                        updated.pickupDate = pickupDate;
                        updated.guestPickup = pickupTime;
                    }
                }
            }

            next[index] = updated;
            return next;
        });
    };

    // ── 4. Add New Duty Row ──
    const handleAddDuty = () => {
        const today = todayIST();
        const nextNum = duties.length + 1;
        const newId = `LK-${String(nextNum).padStart(3, '0')}`;
        const newRow = {
            dutyId: newId,
            guestGroup: 'New Guest / Group',
            pax: 2,
            carType: 'Crysta',
            serviceType: 'ARRIVAL',
            pickupDate: today,
            guestPickup: '10:00',
            flightDate: '',
            flightTime: '',
            pickupPoint: selectedEvent?.location || 'Airport',
            dropLocation: 'Hotel',
            vehicleNumber: '',
            vehicleSource: 'Own',
            status: 'Scheduled'
        };
        setDuties(prev => [...prev, newRow]);
    };

    // ── 5. Delete Duty Row ──
    const handleDeleteDuty = (index) => {
        if (!window.confirm('Delete this vehicle duty?')) return;
        setDuties(prev => prev.filter((_, i) => i !== index));
    };

    // ── 6. Save & Sync to Live DRS / Vendor Book ──
    const handleSaveAndSync = async () => {
        if (!selectedEventId) {
            alert('Please select an event first');
            return;
        }
        setSaving(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post(`/api/admin/events/${selectedEventId}/excel-duties`, {
                excelDuties: duties,
                excelConfig: config,
                reconciliationAlerts: alerts,
                rawRowsCount: counts.rawRows,
                uniqueGroupsCount: counts.uniqueGuestGroups
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            alert('✓ Live Event Excel successfully saved and synced to Live DRS & Vendor Book!');
            loadEventExcelData(selectedEventId);
        } catch (err) {
            console.error('Error saving excel duties:', err);
            alert('Error saving live sheet: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // ── 7. Reconciliation Alert Decisions ──
    const handleAlertDecision = (alertId, decision) => {
        setAlerts(prev => prev.map(a => {
            if (a.id === alertId) {
                return { ...a, status: decision === 'dismiss' ? 'ignored' : 'resolved' };
            }
            return a;
        }));
    };

    // ── 8. Excel Workbook Upload & Multi-Sheet Parsing ──
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                setUploadWorkbook(wb);
                setAvailableSheets(wb.SheetNames || []);
                setSelectedSheets(wb.SheetNames || []);
                setShowUploadModal(true);
            } catch (err) {
                alert('Error reading workbook file. Ensure it is a valid XLSX/XLS document.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImportSheets = () => {
        if (!uploadWorkbook || selectedSheets.length === 0) return;
        setParsingStaging(true);

        try {
            let totalRawCount = 0;
            const stagedDuties = [];
            const guestMap = new Map();

            selectedSheets.forEach(sheetName => {
                const ws = uploadWorkbook.Sheets[sheetName];
                if (!ws) return;
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                totalRawCount += rows.length;

                rows.forEach((r, rowIdx) => {
                    const guestName = r['Guest Name'] || r['Guest / Group'] || r['Guest'] || r['Name'] || r['Passenger'] || `Guest ${rowIdx + 1}`;
                    const pax = Number(r['PAX'] || r['Pax'] || r['No of Pax'] || r['Count']) || 1;
                    const carType = r['Car Type'] || r['Vehicle'] || r['Cab'] || 'Crysta';

                    // Detect Arrival fields
                    const arrDate = r['Arrival Date'] || r['Date'] || todayIST();
                    const arrTime = r['Arrival Time'] || r['Time'] || '10:00';
                    const arrFlight = r['Flight No.'] || r['Flight'] || '';
                    const pickup = r['Pickup'] || r['From'] || 'Udaipur Airport';
                    const drop = r['Drop'] || r['To'] || r['Hotel'] || 'Hotel';

                    // Detect Departure fields (handles client sheets with arrival and departure on same row)
                    const depDate = r['Departure Date'] || r['Return Date'];
                    const depFlightTime = r['Departure Time'] || r['Flight Time'];

                    // Add Arrival Duty
                    stagedDuties.push({
                        dutyId: `LK-${String(stagedDuties.length + 1).padStart(3, '0')}`,
                        guestGroup: guestName,
                        pax,
                        carType,
                        serviceType: 'ARRIVAL',
                        pickupDate: arrDate,
                        guestPickup: arrTime,
                        flightDate: arrDate,
                        flightTime: arrTime,
                        flightNumber: arrFlight,
                        pickupPoint: pickup,
                        dropLocation: drop,
                        vehicleNumber: '',
                        vehicleSource: 'Own',
                        status: 'Scheduled',
                        rawSourceSheet: sheetName,
                        rawSourceRow: rowIdx + 2
                    });

                    // If Departure exists on same row, create SECOND movement (as per spec requirement!)
                    if (depDate || depFlightTime) {
                        const { pickupDate, pickupTime } = calculateDeparturePickup(depDate || arrDate, depFlightTime || '18:00', config.departureLeadMinutes);
                        stagedDuties.push({
                            dutyId: `LK-${String(stagedDuties.length + 1).padStart(3, '0')}`,
                            guestGroup: guestName,
                            pax,
                            carType,
                            serviceType: 'DEPARTURE',
                            pickupDate: pickupDate,
                            guestPickup: pickupTime,
                            flightDate: depDate || arrDate,
                            flightTime: depFlightTime || '18:00',
                            flightNumber: r['Return Flight'] || arrFlight,
                            pickupPoint: drop,
                            dropLocation: pickup,
                            vehicleNumber: '',
                            vehicleSource: 'Own',
                            status: 'Scheduled',
                            rawSourceSheet: sheetName,
                            rawSourceRow: rowIdx + 2
                        });
                    }

                    guestMap.set(guestName.toLowerCase().trim(), true);
                });
            });

            setDuties(stagedDuties);
            setCounts(prev => ({
                ...prev,
                rawRows: totalRawCount,
                uniqueGuestGroups: guestMap.size,
                vehicleDuties: stagedDuties.length
            }));
            setShowUploadModal(false);
            alert(`✓ Successfully staged ${stagedDuties.length} vehicle duties across ${selectedSheets.length} sheets!`);
        } catch (err) {
            console.error('Error staging workbook:', err);
            alert('Error parsing sheets: ' + err.message);
        } finally {
            setParsingStaging(false);
        }
    };

    // ── 9. Filtered Duties for Live Grid ──
    const filteredDuties = useMemo(() => {
        return duties.filter(d => {
            // Service Filter
            if (serviceFilter !== 'All') {
                const sType = (d.serviceType || '').toUpperCase();
                if (serviceFilter === 'Arrival' && !sType.includes('ARRIV')) return false;
                if (serviceFilter === 'Departure' && !sType.includes('DEPART')) return false;
                if (serviceFilter === 'Disposal' && !sType.includes('DISPOS')) return false;
                if (serviceFilter === 'Intercity' && !sType.includes('INTERC')) return false;
            }
            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = (d.dutyId || '').toLowerCase().includes(q) ||
                              (d.guestGroup || '').toLowerCase().includes(q) ||
                              (d.carType || '').toLowerCase().includes(q) ||
                              (d.pickupPoint || '').toLowerCase().includes(q) ||
                              (d.dropLocation || '').toLowerCase().includes(q) ||
                              (d.vehicleNumber || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [duties, serviceFilter, searchQuery]);

    // Active pending alerts count
    const pendingAlerts = alerts.filter(a => a.status === 'pending');

    return (
        <div className="live-event-excel-container" style={{
            minHeight: '100vh',
            background: '#090e1a',
            color: '#f8fafc',
            padding: 'clamp(20px, 3vw, 36px)',
            fontFamily: "'Inter', -apple-system, sans-serif"
        }}>
            <SEO title="Live Event Excel | LogKaro Enterprise Fleet" />

            {/* ═══ TOP BREADCRUMB & HEADER ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        EVENT MANAGEMENT / SPREADSHEET CENTRE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '950', margin: 0, letterSpacing: '-0.5px', color: 'white' }}>
                            Live Event Excel
                        </h1>
                        {/* Event Selector Dropdown */}
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                color: '#fbbf24',
                                fontSize: '13px',
                                fontWeight: '900',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {events.map(ev => (
                                <option key={ev._id} value={ev._id}>
                                    {ev.name} ({ev.client || 'Client'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>
                        One editable sheet for vehicle duties, with linked DRS, Vendor Book and Master Calendar.
                    </p>
                </div>

                {/* Top Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                        borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: '0.2s'
                    }}>
                        <UploadCloud size={17} /> Import client workbook
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>

                    <button
                        onClick={handleSaveAndSync}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                            borderRadius: '14px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            border: 'none', color: 'white', fontSize: '13px', fontWeight: '900',
                            cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
                        }}
                    >
                        <Check size={18} strokeWidth={3} /> {saving ? 'Syncing...' : 'Save & Sync'}
                    </button>
                </div>
            </div>

            {/* ═══ 4 OPERATIONAL METRIC CARDS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px 20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Raw workbook rows</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '4px 0' }}>{counts.rawRows}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Groom + Bride + Common</div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px 20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Unique guest groups</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '4px 0' }}>{counts.uniqueGuestGroups}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>After duplicate review</div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px 20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Vehicle duties</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: '#38bdf8', margin: '4px 0' }}>{counts.vehicleDuties}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Car movement = one duty</div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px 20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Distinct vehicles assigned</div>
                    <div style={{ fontSize: '28px', fontWeight: '950', color: '#10b981', margin: '4px 0' }}>{counts.distinctVehicles}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Vehicles can be reused</div>
                </div>
            </div>

            {/* ═══ 5-STEP FLOW STEPPER ═══ */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.45)', padding: '12px 20px', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                gap: '12px', overflowX: 'auto', marginBottom: '28px'
            }}>
                {[
                    { num: 1, label: 'Upload all sheets' },
                    { num: 2, label: 'Map client columns' },
                    { num: 3, label: 'Reconcile exceptions' },
                    { num: 4, label: 'Final vehicle-wise sheet' },
                    { num: 5, label: 'DRS / Vendor / Calendar' }
                ].map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <div
                            onClick={() => setActiveStep(step.num)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                padding: '6px 12px', borderRadius: '10px',
                                background: activeStep === step.num ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                border: activeStep === step.num ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                                color: activeStep === step.num ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                                fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: activeStep === step.num ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                                color: activeStep === step.num ? 'black' : 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '950'
                            }}>{step.num}</span>
                            {step.label}
                        </div>
                        {idx < 4 && <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}
                    </React.Fragment>
                ))}
            </div>

            {/* ═══ FINAL VEHICLE-WISE REGISTER HEADER ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '950', margin: 0, color: 'white' }}>
                            Final vehicle-wise register
                        </h2>
                        <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>
                            Live • Synchronized
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                        Edit a cell below. Departure has separate flight time and guest pickup time.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Filter duties..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', padding: '8px 12px 8px 34px', borderRadius: '10px', fontSize: '12px', outline: 'none'
                            }}
                        />
                    </div>

                    {/* + Add Duty Button */}
                    <button onClick={handleAddDuty} style={{
                        padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '12px',
                        fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Plus size={14} /> + Add duty
                    </button>
                </div>
            </div>

            {/* ═══ SERVICE FILTER TABS ═══ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {['All', 'Arrival', 'Departure', 'Disposal', 'Intercity'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setServiceFilter(tab)}
                        style={{
                            padding: '6px 14px', borderRadius: '8px', border: 'none',
                            background: serviceFilter === tab ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                            color: serviceFilter === tab ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                            fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                        }}
                    >
                        {tab === 'All' ? 'All Duties' : tab}
                    </button>
                ))}
            </div>

            {/* ═══ THE SPREADSHEET GRID ═══ */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.5)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
                overflowX: 'auto', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '12px 14px', width: '90px' }}>Duty ID</th>
                            <th style={{ padding: '12px 14px', minWidth: '160px' }}>Guest / Group</th>
                            <th style={{ padding: '12px 10px', width: '60px' }}>PAX</th>
                            <th style={{ padding: '12px 14px', width: '120px' }}>Car Type</th>
                            <th style={{ padding: '12px 14px', width: '130px' }}>Service Type</th>
                            <th style={{ padding: '12px 12px', width: '130px' }}>Pickup Date</th>
                            <th style={{ padding: '12px 10px', width: '95px' }}>Guest Pickup</th>
                            <th style={{ padding: '12px 12px', width: '120px' }}>Flight Date</th>
                            <th style={{ padding: '12px 10px', width: '95px' }}>Flight Time</th>
                            <th style={{ padding: '12px 14px', minWidth: '150px' }}>Pickup / Reporting</th>
                            <th style={{ padding: '12px 14px', minWidth: '150px' }}>Drop / Destination</th>
                            <th style={{ padding: '12px 14px', width: '130px' }}>Vehicle Number</th>
                            <th style={{ padding: '12px 12px', width: '100px' }}>Source</th>
                            <th style={{ padding: '12px 12px', width: '110px' }}>Status</th>
                            <th style={{ padding: '12px 10px', width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDuties.length === 0 ? (
                            <tr>
                                <td colSpan={15} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                    No vehicle duties found matching current filters. Click <strong>+ Add duty</strong> to create one.
                                </td>
                            </tr>
                        ) : filteredDuties.map((duty, idx) => (
                            <tr key={duty.dutyId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: '0.2s' }}>
                                {/* Duty ID */}
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{ color: '#38bdf8', fontWeight: '950', fontSize: '12px', cursor: 'pointer' }}>
                                        {duty.dutyId || `LK-${String(idx + 1).padStart(3, '0')}`}
                                    </span>
                                </td>

                                {/* Guest / Group */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="text"
                                        value={duty.guestGroup || ''}
                                        onChange={(e) => handleCellChange(idx, 'guestGroup', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '6px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* PAX */}
                                <td style={{ padding: '6px 8px' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        value={duty.pax || 1}
                                        onChange={(e) => handleCellChange(idx, 'pax', Number(e.target.value))}
                                        style={{ width: '100%', textAlign: 'center', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '13px', fontWeight: '700' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Car Type */}
                                <td style={{ padding: '6px 10px' }}>
                                    <select
                                        value={duty.carType || 'Sedan'}
                                        onChange={(e) => handleCellChange(idx, 'carType', e.target.value)}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '6px', borderRadius: '8px', fontSize: '12px' }}
                                    >
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

                                {/* Service Type */}
                                <td style={{ padding: '6px 10px' }}>
                                    <select
                                        value={duty.serviceType || 'ARRIVAL'}
                                        onChange={(e) => handleCellChange(idx, 'serviceType', e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                            color: duty.serviceType === 'ARRIVAL' ? '#10b981' :
                                                   duty.serviceType === 'DEPARTURE' ? '#f59e0b' :
                                                   duty.serviceType === 'DISPOSAL' ? '#38bdf8' : '#a855f7',
                                            padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '900'
                                        }}
                                    >
                                        <option value="ARRIVAL">ARRIVAL</option>
                                        <option value="DEPARTURE">DEPARTURE</option>
                                        <option value="DISPOSAL">DISPOSAL</option>
                                        <option value="INTERCITY">INTERCITY</option>
                                        <option value="LOCAL">LOCAL</option>
                                    </select>
                                </td>

                                {/* Pickup Date */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="date"
                                        value={duty.pickupDate || todayIST()}
                                        onChange={(e) => handleCellChange(idx, 'pickupDate', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '12px', colorScheme: 'dark' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Guest Pickup Time */}
                                <td style={{ padding: '6px 8px' }}>
                                    <input
                                        type="text"
                                        placeholder="10:00"
                                        value={duty.guestPickup || ''}
                                        onChange={(e) => handleCellChange(idx, 'guestPickup', e.target.value)}
                                        style={{ width: '100%', textAlign: 'center', background: 'transparent', border: '1px solid transparent', color: '#fbbf24', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: '900' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Flight Date */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="date"
                                        value={duty.flightDate || ''}
                                        onChange={(e) => handleCellChange(idx, 'flightDate', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '6px', fontSize: '12px', colorScheme: 'dark' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Flight Time */}
                                <td style={{ padding: '6px 8px' }}>
                                    <input
                                        type="text"
                                        placeholder="--:--"
                                        value={duty.flightTime || ''}
                                        onChange={(e) => handleCellChange(idx, 'flightTime', e.target.value)}
                                        style={{ width: '100%', textAlign: 'center', background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Pickup / Reporting Location */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="text"
                                        value={duty.pickupPoint || ''}
                                        onChange={(e) => handleCellChange(idx, 'pickupPoint', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Drop / Destination Location */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="text"
                                        value={duty.dropLocation || ''}
                                        onChange={(e) => handleCellChange(idx, 'dropLocation', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                                        className="editable-cell"
                                    />
                                </td>

                                {/* Vehicle Number */}
                                <td style={{ padding: '6px 10px' }}>
                                    <input
                                        type="text"
                                        placeholder="RJ27-..."
                                        value={duty.vehicleNumber || ''}
                                        onChange={(e) => handleCellChange(idx, 'vehicleNumber', e.target.value)}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#38bdf8', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}
                                    />
                                </td>

                                {/* Source (Own / Vendor) */}
                                <td style={{ padding: '6px 8px' }}>
                                    <select
                                        value={duty.vehicleSource || 'Own'}
                                        onChange={(e) => handleCellChange(idx, 'vehicleSource', e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                            color: duty.vehicleSource === 'Vendor' ? '#a855f7' : '#10b981', padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800'
                                        }}
                                    >
                                        <option value="Own">Own Fleet</option>
                                        <option value="Vendor">Vendor</option>
                                    </select>
                                </td>

                                {/* Status */}
                                <td style={{ padding: '6px 8px' }}>
                                    <select
                                        value={duty.status || 'Scheduled'}
                                        onChange={(e) => handleCellChange(idx, 'status', e.target.value)}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '6px', borderRadius: '8px', fontSize: '11px' }}
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Dispatched">Dispatched</option>
                                        <option value="Running">Running</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>

                                {/* Delete */}
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDeleteDuty(idx)}
                                        style={{ background: 'none', border: 'none', color: '#f87171', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                                        title="Delete duty"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══ PARAMETERS CONFIG BAR ═══ */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.45)', padding: '16px 20px', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                gap: '16px', flexWrap: 'wrap', marginBottom: '28px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        Departure pickup lead (minutes)
                    </label>
                    <input
                        type="number"
                        value={config.departureLeadMinutes}
                        onChange={(e) => setConfig({ ...config, departureLeadMinutes: Number(e.target.value) || 120 })}
                        style={{ width: '60px', height: '34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        Default turnaround (minutes)
                    </label>
                    <input
                        type="number"
                        value={config.defaultTurnaroundMinutes}
                        onChange={(e) => setConfig({ ...config, defaultTurnaroundMinutes: Number(e.target.value) || 30 })}
                        style={{ width: '60px', height: '34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        Disposal hours (selected duty)
                    </label>
                    <input
                        type="number"
                        value={config.disposalHours}
                        onChange={(e) => setConfig({ ...config, disposalHours: Number(e.target.value) || 8 })}
                        style={{ width: '50px', height: '34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        Disposal included KM
                    </label>
                    <input
                        type="number"
                        value={config.disposalKm}
                        onChange={(e) => setConfig({ ...config, disposalKm: Number(e.target.value) || 80 })}
                        style={{ width: '50px', height: '34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        Intercity route notes
                    </label>
                    <input
                        type="text"
                        value={config.intercityRouteNotes}
                        onChange={(e) => setConfig({ ...config, intercityRouteNotes: e.target.value })}
                        style={{ flex: 1, height: '34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 10px', borderRadius: '8px', fontSize: '12px' }}
                    />
                </div>
            </div>

            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>
                ✓ Arrival + Departure + Disposal + Intercity in the same sheet. Flight number is optional. Auto-synced with Live DRS.
            </div>

            {/* ═══ BOTTOM TWO SECTION PANELS ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                
                {/* 1. Import Reconciliation Alerts */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.5)', padding: '24px', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '950', margin: 0, color: 'white' }}>
                            Import Reconciliation Alerts
                        </h3>
                        <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>
                            {pendingAlerts.length} for review
                        </span>
                    </div>

                    {pendingAlerts.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                            ✓ No outstanding reconciliation alerts. All guest groups and departure times confirmed.
                        </div>
                    ) : pendingAlerts.map(alert => (
                        <div key={alert.id} style={{
                            background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px'
                        }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{alert.title}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{alert.description}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {alert.type === 'duplicate' ? (
                                    <>
                                        <button
                                            onClick={() => handleAlertDecision(alert.id, 'merge')}
                                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            Same movement
                                        </button>
                                        <button
                                            onClick={() => handleAlertDecision(alert.id, 'separate')}
                                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            Keep separate
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleAlertDecision(alert.id, 'confirm')}
                                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        Confirm pickup
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: 'auto' }}>
                        Exception decisions preserve original sheet names and rows for audit.
                    </div>
                </div>

                {/* 2. Connected Module Status */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.5)', padding: '24px', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '950', margin: 0, color: 'white' }}>
                            Connected Module Status
                        </h3>
                        <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            Live Engine
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Live DRS</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#38bdf8' }}>{counts.drsDuties || duties.length} duties</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Vendor Book</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#a855f7' }}>{counts.vendorDuties} outside vehicle duty</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Master Calendar</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#10b981' }}>{counts.distinctVehicles} vehicles ({duties.length} duties)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Event timezone</span>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{config.timezone}</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: 'auto', lineHeight: 1.5 }}>
                        One physical car may take a 10:40 pickup and another at 13:00 if trip completion and turnaround permit. Vendor costs require independent approval.
                    </div>
                </div>
            </div>

            {/* ═══ MULTI-SHEET UPLOAD & STAGING MODAL ═══ */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="modal-overlay" style={{ zIndex: 10050 }}>
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            style={{
                                width: 'min(95%, 640px)', background: '#0a101f', borderRadius: '24px',
                                border: '1px solid rgba(255,255,255,0.1)', padding: '28px', position: 'relative',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '950', color: 'white' }}>
                                        Import Client Workbook Sheets
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                                        Select worksheets to stage into Live Event Excel (e.g. Groom, Bride, Common)
                                    </p>
                                </div>
                                <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', marginBottom: '24px' }}>
                                {availableSheets.map(s => {
                                    const isChecked = selectedSheets.includes(s);
                                    return (
                                        <div
                                            key={s}
                                            onClick={() => {
                                                if (isChecked) setSelectedSheets(selectedSheets.filter(x => x !== s));
                                                else setSelectedSheets([...selectedSheets, s]);
                                            }}
                                            style={{
                                                padding: '12px 16px', borderRadius: '12px',
                                                background: isChecked ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                                                border: isChecked ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                                                color: isChecked ? '#38bdf8' : 'white', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700'
                                            }}
                                        >
                                            <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: 'pointer' }} />
                                            <FileSpreadsheet size={16} /> {s}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    style={{ padding: '10px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmImportSheets}
                                    disabled={parsingStaging}
                                    style={{
                                        padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        border: 'none', color: 'white', fontSize: '13px', fontWeight: '900', cursor: parsingStaging ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {parsingStaging ? 'Staging...' : `Stage ${selectedSheets.length} Sheets`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveEventExcel;
