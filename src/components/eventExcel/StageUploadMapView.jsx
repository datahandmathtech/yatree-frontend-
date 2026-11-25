import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import {
    UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight,
    Layers, Save, Table, History, ChevronRight
} from 'lucide-react';

const LOGKARO_CANONICAL_FIELDS = [
    { key: 'guestGroup', label: 'Guest / Group Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'phone', label: 'Phone / Mobile' },
    { key: 'partySide', label: 'Side / Party (Groom/Bride)' },
    { key: 'pax', label: 'PAX Count' },
    { key: 'carType', label: 'Car / Vehicle Type' },
    { key: 'serviceType', label: 'Service Type' },
    { key: 'externalRef', label: 'Client Booking Ref / Code' },
    { key: 'arrivalDate', label: 'Arrival / Pickup Date' },
    { key: 'arrivalTime', label: 'Arrival / Pickup Time' },
    { key: 'arrivalFlightNo', label: 'Arrival Flight / Train No.' },
    { key: 'arrivalMode', label: 'Arrival Mode' },
    { key: 'arrivalPickup', label: 'Pickup / Reporting Point' },
    { key: 'arrivalDrop', label: 'Drop / Destination' },
    { key: 'departureDate', label: 'Departure Flight / Train Date' },
    { key: 'departureTime', label: 'Departure Flight / Train Time' },
    { key: 'departureFlightNo', label: 'Departure Flight / Train No.' },
    { key: 'departureMode', label: 'Departure Mode' },
    { key: 'departurePickup', label: 'Departure Pickup Point' },
    { key: 'departureDrop', label: 'Departure Drop Point' },
    { key: 'guestPickupOverride', label: 'Explicit Guest Pickup Time' },
    { key: 'disposalHours', label: 'Disposal Package Hours' },
    { key: 'disposalKm', label: 'Disposal Included KM' },
    { key: 'vehicleNumber', label: 'Assigned Vehicle Number' },
    { key: 'vendorName', label: 'Vendor Name' },
    { key: 'remarks', label: 'Notes / Remarks' }
];

const StageUploadMapView = ({
    eventId,
    companyId,
    activeBatch,
    importBatches = [],
    savedTemplates = [],
    onBatchCreated,
    onBatchMapped,
    onResumeBatch
}) => {
    const [sheetConfigs, setSheetConfigs] = useState([]);
    const [activeSheetName, setActiveSheetName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [mappingSubmitting, setMappingSubmitting] = useState(false);
    const [templateNameInput, setTemplateNameInput] = useState('');
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        if (activeBatch?.sheetConfigs) {
            setSheetConfigs(activeBatch.sheetConfigs);
            const firstSel = activeBatch.sheetConfigs.find(s => s.selected) || activeBatch.sheetConfigs[0];
            if (firstSel) setActiveSheetName(firstSel.sheetName);
        } else {
            setSheetConfigs([]);
            setActiveSheetName('');
        }
    }, [activeBatch]);

    const getAuthHeaders = () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        return { Authorization: `Bearer ${userInfo.token}` };
    };

    const uploadWorkbookFile = async (file) => {
        if (!file || !eventId) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/imports?companyId=${companyId}`,
                formData,
                { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
            );
            onBatchCreated(data.batch, data.savedTemplates);
        } catch (err) {
            console.error('Import upload error:', err);
            alert('Error uploading workbook: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const activeSheet = sheetConfigs.find(s => s.sheetName === activeSheetName) || sheetConfigs[0] || null;

    const updateSheetConfig = (sheetName, updater) => {
        setSheetConfigs(prev => prev.map(sc => sc.sheetName === sheetName ? updater(sc) : sc));
    };

    const handleHeaderRowChange = (sheetName, rowIdx) => {
        updateSheetConfig(sheetName, (sc) => {
            const newHeaderRow = sc.sampleRows?.[rowIdx] || [];
            const headers = newHeaderRow.map(h => String(h || '').trim()).filter(Boolean);
            return { ...sc, headerRowIndex: Number(rowIdx), headers };
        });
    };

    const handleMappingFieldChange = (sheetName, canonicalKey, excelColumnHeader) => {
        updateSheetConfig(sheetName, (sc) => ({
            ...sc,
            columnMap: {
                ...(sc.columnMap || {}),
                [canonicalKey]: excelColumnHeader
            }
        }));
    };

    const applySavedTemplate = (tpl) => {
        if (!activeSheet || !tpl) return;
        updateSheetConfig(activeSheet.sheetName, (sc) => ({
            ...sc,
            headerRowIndex: Number(tpl.headerRowIndex) || 0,
            columnMap: { ...(tpl.columnMap || {}) }
        }));
    };

    const handleStageMovements = async () => {
        if (!activeBatch?._id) return;
        const selectedCount = sheetConfigs.filter(s => s.selected).length;
        if (selectedCount === 0) {
            alert('Select at least one worksheet to stage.');
            return;
        }
        setMappingSubmitting(true);
        try {
            const { data } = await axios.post(
                `/api/admin/events/${eventId}/imports/${activeBatch._id}/map?companyId=${companyId}`,
                {
                    companyId,
                    sheetConfigs,
                    saveTemplateName: templateNameInput.trim() || undefined
                },
                { headers: getAuthHeaders() }
            );
            onBatchMapped(data.batch, data.movements, data.reconciliation);
        } catch (err) {
            console.error('Mapping error:', err);
            alert('Failed to stage & map sheets: ' + (err.response?.data?.message || err.message));
        } finally {
            setMappingSubmitting(false);
        }
    };

    const sheetHeadersForDropdown = activeSheet
        ? ((activeSheet.sampleRows?.[activeSheet.headerRowIndex] || activeSheet.headers || []).map(h => String(h || '').trim()).filter(Boolean))
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* DROPZONE & REVISION HISTORY */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const f = e.dataTransfer?.files?.[0];
                        if (f) uploadWorkbookFile(f);
                    }}
                    style={{
                        background: dragging ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.55)',
                        border: dragging ? '2px dashed #38bdf8' : '2px dashed rgba(255,255,255,0.14)',
                        borderRadius: '20px',
                        padding: '28px',
                        textAlign: 'center',
                        transition: '0.2s'
                    }}
                >
                    <UploadCloud size={36} color="#38bdf8" style={{ marginBottom: '10px' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white' }}>
                        Drop Client Excel Workbook Here (.xlsx, .xls, .csv)
                    </h3>
                    <p style={{ margin: '6px 0 16px 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        Supports multiple sheets (Groom, Bride, Common), arrival + departure on same row, and client revisions without overwriting live records.
                    </p>
                    <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white', fontSize: '13px', fontWeight: '900', cursor: uploading ? 'wait' : 'pointer'
                    }}>
                        <FileSpreadsheet size={16} />
                        {uploading ? 'Parsing Workbook...' : 'Browse Client Workbook'}
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            disabled={uploading}
                            onChange={(e) => uploadWorkbookFile(e.target.files?.[0])}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                {/* Staged Upload Batches / Revisions */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.08)', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', color: 'white' }}>
                            <History size={16} color="#fbbf24" /> Staging Revisions & Audit Batches
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                            {importBatches.length} batch(es)
                        </span>
                    </div>
                    {importBatches.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: '20px 0', textAlign: 'center' }}>
                            No staged workbook batches yet for this event. Upload a file to begin Revision #1.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '165px', overflowY: 'auto' }}>
                            {importBatches.map(b => (
                                <div
                                    key={b._id}
                                    onClick={() => onResumeBatch(b)}
                                    style={{
                                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                                        background: activeBatch?._id === b._id ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255,255,255,0.03)',
                                        border: activeBatch?._id === b._id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>
                                            Rev #{b.revisionNumber} — {b.fileName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                                            {b.rawRowsCount} raw rows • {b.sheetConfigs?.length || 0} sheet(s)
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '10px', fontWeight: '900', padding: '3px 8px', borderRadius: '6px',
                                        background: b.status === 'Committed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                                        color: b.status === 'Committed' ? '#34d399' : '#fbbf24'
                                    }}>
                                        {b.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SHEET CHECKLIST + HEADER ROW PICKER + COLUMN MAPPING */}
            {activeBatch && sheetConfigs.length > 0 && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.55)', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.08)', padding: '22px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '950', color: 'white' }}>
                                Screen A: Sheet Selection, Header Row & Column Mapping (Rev #{activeBatch.revisionNumber})
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                                Select sheets to include, pick which row contains headers, and confirm LogKaro column mappings before staging movements.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {savedTemplates.length > 0 && (
                                <select
                                    onChange={(e) => {
                                        const found = savedTemplates.find(t => t.name === e.target.value);
                                        if (found) applySavedTemplate(found);
                                    }}
                                    defaultValue=""
                                    style={{
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'white', padding: '8px 12px', borderRadius: '10px', fontSize: '12px'
                                    }}
                                >
                                    <option value="">Apply Saved Template...</option>
                                    {savedTemplates.map(t => (
                                        <option key={t.name} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                            )}

                            <input
                                type="text"
                                placeholder="Save mapping as template (optional)..."
                                value={templateNameInput}
                                onChange={(e) => setTemplateNameInput(e.target.value)}
                                style={{
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', width: '210px'
                                }}
                            />

                            <button
                                onClick={handleStageMovements}
                                disabled={mappingSubmitting}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 20px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    border: 'none', color: 'white', fontSize: '13px', fontWeight: '900', cursor: 'pointer'
                                }}
                            >
                                {mappingSubmitting ? 'Staging & Comparing...' : 'Stage Movements'} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Sheet Selector Tabs */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                        {sheetConfigs.map(sc => (
                            <div
                                key={sc.sheetName}
                                onClick={() => setActiveSheetName(sc.sheetName)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeSheet?.sheetName === sc.sheetName ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.03)',
                                    border: activeSheet?.sheetName === sc.sheetName ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(sc.selected)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateSheetConfig(sc.sheetName, s => ({ ...s, selected: e.target.checked }))}
                                />
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{sc.sheetName}</span>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>({sc.totalRows} rows)</span>
                            </div>
                        ))}
                    </div>

                    {activeSheet && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.1fr) minmax(300px, 0.9fr)', gap: '18px' }}>
                            {/* Left: Raw Sheet Preview + Click to Choose Header Row */}
                            <div style={{
                                background: 'rgba(0,0,0,0.28)', borderRadius: '14px',
                                border: '1px solid rgba(255,255,255,0.07)', padding: '14px', overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>
                                        Preview: {activeSheet.sheetName} (Click a row to mark as Header Row)
                                    </span>
                                    <select
                                        value={activeSheet.headerRowIndex}
                                        onChange={(e) => handleHeaderRowChange(activeSheet.sheetName, e.target.value)}
                                        style={{
                                            background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#fbbf24', fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: '8px'
                                        }}
                                    >
                                        {(activeSheet.sampleRows || []).map((_, rIdx) => (
                                            <option key={rIdx} value={rIdx}>Header Row #{rIdx + 1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <tbody>
                                            {(activeSheet.sampleRows || []).map((rArr, rIdx) => {
                                                const isHeader = Number(activeSheet.headerRowIndex) === rIdx;
                                                return (
                                                    <tr
                                                        key={rIdx}
                                                        onClick={() => handleHeaderRowChange(activeSheet.sheetName, rIdx)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            background: isHeader ? 'rgba(251, 191, 36, 0.16)' : (rIdx < activeSheet.headerRowIndex ? 'rgba(255,255,255,0.01)' : 'transparent'),
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            color: isHeader ? '#fbbf24' : (rIdx < activeSheet.headerRowIndex ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)')
                                                        }}
                                                    >
                                                        <td style={{ padding: '5px 8px', fontWeight: '900', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {isHeader ? `★ R${rIdx + 1}` : `R${rIdx + 1}`}
                                                        </td>
                                                        {(Array.isArray(rArr) ? rArr.slice(0, 10) : []).map((cell, cIdx) => (
                                                            <td key={cIdx} style={{ padding: '5px 8px', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isHeader ? '800' : '500' }}>
                                                                {String(cell ?? '')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Column Mapping Grid */}
                            <div style={{
                                background: 'rgba(0,0,0,0.28)', borderRadius: '14px',
                                border: '1px solid rgba(255,255,255,0.07)', padding: '14px',
                                display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto'
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
                                    Map "{activeSheet.sheetName}" Columns → LogKaro Fields
                                </div>
                                {LOGKARO_CANONICAL_FIELDS.map(f => {
                                    const currentMapped = activeSheet.columnMap?.[f.key] || '';
                                    return (
                                        <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: currentMapped ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
                                                {f.label}
                                            </span>
                                            <select
                                                value={currentMapped}
                                                onChange={(e) => handleMappingFieldChange(activeSheet.sheetName, f.key, e.target.value)}
                                                style={{
                                                    background: '#0f172a', border: currentMapped ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                    color: currentMapped ? '#34d399' : 'rgba(255,255,255,0.6)',
                                                    padding: '5px 8px', borderRadius: '8px', fontSize: '11px'
                                                }}
                                            >
                                                <option value="">— Auto / Skip —</option>
                                                {sheetHeadersForDropdown.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StageUploadMapView;
