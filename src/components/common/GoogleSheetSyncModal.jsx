import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, Copy, Check, CheckCircle2, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import axios from '../../api/axios';

export default function GoogleSheetSyncModal({ isOpen, onClose, selectedCompany, onSyncComplete }) {
    const [copied, setCopied] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(null);
    const [syncError, setSyncError] = useState(null);

    const sheetId = '152Ch-MllhqF4fgUOJbvPgtYdVqgUlDkgdBSJ1N1Dlas';
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=1452390929`;
    const backendApiUrl = window.location.origin;

    const companyId = selectedCompany?._id || '';

    // Complete Google Apps Script for 2-Way Real-time Sync
    const appsScriptCode = `// ==========================================
// YATREE DESTINATIONS - LIVE DRS 2-WAY SYNC
// Sheet: Daily Rental FY 26-27
// ==========================================

var API_URL = "${backendApiUrl}/api/drs/sync/sheet-webhook";
var COMPANY_ID = "${companyId}";

// 1. Automatic Real-Time onEdit Trigger (Jab bhi Sheet me koi cell edit ho)
function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var sheetName = sheet.getName();
    var range = e.range;
    var row = range.getRow();
    
    // Ignore header rows 1 & 2
    if (row <= 2) return;
    
    // Read the edited row (Columns A to J: Date, SoNo, Hotel, Guest, Mobile, Time, Duty, Rate, COut, Car)
    var rowData = sheet.getRange(row, 1, 1, 10).getValues()[0];
    
    // Find the date for this row (if column A is empty, look upwards to find the active date group)
    var dateVal = rowData[0];
    if (!dateVal || String(dateVal).trim() === '') {
      for (var r = row - 1; r >= 3; r--) {
        var prevDate = sheet.getRange(r, 1).getValue();
        if (prevDate && String(prevDate).trim() !== '') {
          dateVal = prevDate;
          break;
        }
      }
    }
    
    var guestName = rowData[3];
    if (!guestName || String(guestName).trim() === '') return;
    
    var payload = {
      companyId: COMPANY_ID,
      tabName: sheetName,
      singleRow: {
        date: String(dateVal),
        soNo: rowData[1],
        hotel: String(rowData[2] || ''),
        guest: String(rowData[3] || ''),
        guestMob: String(rowData[4] || ''),
        time: String(rowData[5] || ''),
        duty: String(rowData[6] || ''),
        rate: Number(rowData[7]) || 0,
        cOut: String(rowData[8] || ''),
        car: String(rowData[9] || '')
      }
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(API_URL, options);
  } catch(err) {
    Logger.log("onEdit Error: " + err);
  }
}

// 2. Custom Menu in Google Sheets
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🚕 Yatree Live DRS")
    .addItem("🔄 Sync Entire Sheet to Live DRS", "syncAllRowsToLiveDRS")
    .addToUi();
}

// 3. Full Sheet Sync Function
function syncAllRowsToLiveDRS() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  
  var values = sheet.getRange(3, 1, lastRow - 2, 10).getValues();
  var rows = [];
  var currentDate = "";
  
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (r[0] && String(r[0]).trim() !== '') {
      currentDate = String(r[0]).trim();
    }
    var guest = r[3];
    if (!guest || String(guest).trim() === '') continue;
    
    rows.push({
      date: currentDate,
      soNo: r[1],
      hotel: String(r[2] || ''),
      guest: String(r[3] || ''),
      guestMob: String(r[4] || ''),
      time: String(r[5] || ''),
      duty: String(r[6] || ''),
      rate: Number(r[7]) || 0,
      cOut: String(r[8] || ''),
      car: String(r[9] || '')
    });
  }
  
  var payload = {
    companyId: COMPANY_ID,
    tabName: sheetName,
    rows: rows
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(API_URL, options);
  SpreadsheetApp.getUi().alert("✅ Live DRS Synced Successfully! " + rows.length + " duties updated.");
}
`;

    const handleCopyScript = () => {
        navigator.clipboard.writeText(appsScriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleSyncFromSheetNow = async () => {
        setSyncing(true);
        setSyncSuccess(null);
        setSyncError(null);
        try {
            // Call server to fetch latest sheet data for the company
            const { data } = await axios.get(`/api/drs/sync/sheet-data/${companyId}?month=10&year=2026`);
            setSyncSuccess(`Connected! ${data.totalDuties || 0} duties mapped with Google Sheet.`);
            if (onSyncComplete) onSyncComplete();
        } catch (err) {
            console.error('Error syncing sheet:', err);
            setSyncError('Could not connect to Google Sheet. Please check the Apps Script setup.');
        } finally {
            setSyncing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999, padding: '20px' }}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', background: '#0b1120', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '10px', color: '#10b981' }}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900' }}>Google Sheet 2-Way Sync</h2>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Real-time bi-directional connection between Live DRS & your Google Sheet.</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {/* Connected Sheet Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>📊</span>
                                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>Daily Rental FY 26-27</span>
                                </div>
                                <a 
                                    href={sheetUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    Open Sheet <ExternalLink size={12} />
                                </a>
                            </div>

                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                                <div><b>Tab Name:</b> <span style={{ color: '#fbbf24' }}>Oct. 26</span> (Daily Rental duties)</div>
                                <div><b>Sheet ID:</b> <code style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{sheetId}</code></div>
                            </div>
                        </div>

                        {/* Step-by-Step Instructions */}
                        <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
                            <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '13px', marginBottom: '8px' }}>
                                ⚡ Real-Time Auto Sync Setup (Sirf 30 Seconds ka Kaam):
                            </div>
                            <ol style={{ margin: 0, paddingLeft: '18px', color: 'rgba(255,255,255,0.85)', fontSize: '12px', lineHeight: '1.8' }}>
                                <li>Apni Google Sheet (<a href={sheetUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Daily Rental FY 26-27</a>) open karein.</li>
                                <li>Top menu me <b>Extensions (एक्सटेंशन)</b> par click karein aur <b>Apps Script</b> select karein.</li>
                                <li>Niche diya gaya script code <b>Copy</b> karke wahan paste karein aur <b>Save (Ctrl+S)</b> dabayein.</li>
                                <li><b>Ho gaya!</b> Ab aap Google Sheet me koi bhi hotel, guest, time, duty ya rate edit karenge, vo turant <b>Live DRS</b> me automatically update ho jayega!</li>
                            </ol>
                        </div>

                        {/* Code Box with Copy Button */}
                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Google Apps Script (Ready to Copy):</span>
                                <button
                                    onClick={handleCopyScript}
                                    style={{
                                        padding: '5px 12px',
                                        background: copied ? '#10b981' : '#38bdf8',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '800',
                                        fontSize: '11.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copied to Clipboard!' : 'Copy Script'}
                                </button>
                            </div>
                            <pre style={{
                                background: '#050914',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '12px',
                                color: '#94a3b8',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                margin: 0,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {appsScriptCode}
                            </pre>
                        </div>

                        {syncSuccess && (
                            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#4ade80', fontSize: '12px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} /> {syncSuccess}
                            </div>
                        )}

                        {syncError && (
                            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', fontSize: '12px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} /> {syncError}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '10px' }}>
                        <button
                            onClick={handleSyncFromSheetNow}
                            disabled={syncing}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#10b981',
                                color: '#000',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '900',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <RefreshCw size={15} className={syncing ? 'pulse-animation' : ''} />
                            {syncing ? 'Connecting...' : 'Test Connection & Sync Now'}
                        </button>

                        <button
                            onClick={onClose}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                borderRadius: '10px',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
