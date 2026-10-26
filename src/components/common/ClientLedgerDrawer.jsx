import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Car, CheckCircle, Clock, Plus, Download, Fuel, Edit, Trash2, IndianRupee } from 'lucide-react';
import axios from '../../api/axios';
import { useCompany } from '../../context/CompanyContext';
import { generateClientLedgerPDF } from '../../utils/clientLedgerPdf';

export default function ClientLedgerDrawer({ booking, onClose, onAddEntry, onEditBooking, onEntryUpdated }) {
    const { selectedCompany } = useCompany();
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit entry modal state
    const [editingEntry, setEditingEntry] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editMode, setEditMode] = useState('Cash to Company');
    const [editBankAccountId, setEditBankAccountId] = useState('');
    const [editReference, setEditReference] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingEdit, setDeletingEdit] = useState(false);

    useEffect(() => {
        if (booking && booking.client) {
            fetchLedger();
            fetchBankAccounts();
        } else {
            setLoading(false);
        }
    }, [booking]);

    const fetchBankAccounts = async () => {
        try {
            const compId = selectedCompany?._id || (typeof booking?.company === 'object' ? booking?.company?._id : booking?.company);
            if (!compId) return;
            const { data } = await axios.get(`/api/banks/company/${compId}`);
            setBankAccounts(data || []);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const resolveEntryModeName = (entry) => {
        if (entry.type === 'Fuel') return 'Guest Fuel';
        if (entry.bankName) {
            const matched = bankAccounts.find(b => (b.bankName || '').toLowerCase().trim() === (entry.bankName || '').toLowerCase().trim());
            return matched?.bankName || entry.bankName;
        }
        if (entry.paymentMode && !['UPI / QR Code', 'Bank Transfer / NEFT', 'Advance Payment', 'Payment Received'].includes(entry.paymentMode)) {
            if (/cash/i.test(entry.paymentMode)) return 'Cash';
            return entry.paymentMode;
        }
        const desc = entry.description || '';
        for (const b of bankAccounts) {
            if (b.bankName && desc.toLowerCase().includes(b.bankName.toLowerCase())) {
                return b.bankName;
            }
        }
        const viaPart = desc.split('via ')[1]?.split(' (')[0]?.trim();
        if (viaPart) {
            if (/cash/i.test(viaPart)) return 'Cash';
            if (!['UPI / QR Code', 'Bank Transfer / NEFT'].includes(viaPart)) return viaPart;
        }
        if (booking?.bankName) return booking.bankName;
        if (booking?.paymentMode && /cash/i.test(booking.paymentMode)) return 'Cash';
        return viaPart || (entry.type === 'Advance' ? 'Advance' : 'Bank');
    };

    const fetchLedger = async () => {
        try {
            const clientId = typeof booking.client === 'object' ? booking.client?._id : booking.client;
            if (!clientId) {
                setLoading(false);
                return;
            }
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);

            const bkgIdStr = String(booking._id || '');
            const leadIdStr = String(typeof booking.lead === 'object' ? (booking.lead?._id || '') : (booking.lead || ''));
            const rawBkgId = String(booking.rawBookingId || booking.bookingId || '');
            const bkgCode = String(booking.bookingCode || booking.bookingId || '');
            const clientCode = String(booking.clientCode || '');

            const bkgLedger = (data || []).filter(entry => {
                if (entry.type === 'Bill') return false;
                return true;
            }).sort((a,b) => new Date(a.date) - new Date(b.date));
            setLedgerEntries(bkgLedger);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditPayment = (entry) => {
        setEditingEntry(entry);
        setEditAmount(String(entry.amount || ''));
        const dateStr = entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        setEditDate(dateStr);

        // Determine mode
        let mode = 'Cash to Company';
        if (entry.type === 'Fuel') {
            mode = 'Fuel (Guest)';
        } else if (entry.bankName && entry.bankName !== 'Cash') {
            mode = entry.bankName;
        } else if (entry.paymentMode && /driver\s+cash/i.test(entry.paymentMode)) {
            mode = 'Driver Cash';
        } else if (entry.paymentMode && /cash/i.test(entry.paymentMode)) {
            mode = 'Cash to Company';
        } else if (entry.paymentMode) {
            mode = entry.paymentMode;
        }

        const rawSearch = (entry.bankName || mode || '').toLowerCase().trim();
        const matchedBank = bankAccounts.find(b => {
            const bName = (b.bankName || '').toLowerCase().trim();
            return bName === rawSearch || bName.includes(rawSearch) || rawSearch.includes(bName);
        });

        if (matchedBank) {
            mode = matchedBank.bankName;
            setEditBankAccountId(matchedBank._id);
        } else {
            setEditBankAccountId(bankAccounts[0]?._id || '');
        }
        setEditMode(mode);

        // Extract reference
        const desc = entry.description || '';
        const refMatch = desc.match(/Ref:\s*([^)]+)/i);
        setEditReference(refMatch ? refMatch[1].trim() : (entry.reference || ''));
    };

    const handleSaveEditEntry = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!editingEntry) return;

        try {
            setSavingEdit(true);
            const numAmt = Number(editAmount);
            if (isNaN(numAmt) || numAmt <= 0) {
                alert('Please enter a valid amount.');
                setSavingEdit(false);
                return;
            }

            const isBank = !['Cash to Company', 'Driver Cash', 'Fuel (Guest)'].includes(editMode);
            const searchMode = (editMode || '').toLowerCase().trim();
            const selectedBank = isBank
                ? (bankAccounts.find(b => (b.bankName || '').toLowerCase().trim() === searchMode || (b.bankName || '').toLowerCase().includes(searchMode))
                   || bankAccounts.find(b => String(b._id) === String(editBankAccountId)))
                : null;
            const bankName = selectedBank?.bankName || (isBank ? editMode : 'Cash');
            const finalBankAccountId = selectedBank?._id || (isBank ? editBankAccountId : undefined);

            if (editingEntry._id) {
                await axios.put(`/api/clients/ledger/${editingEntry._id}`, {
                    amount: numAmt,
                    date: editDate,
                    paymentMode: editingEntry.type === 'Fuel' ? 'Fuel (Guest)' : editMode,
                    bankName: bankName,
                    bankAccountId: finalBankAccountId,
                    reference: editReference
                });
            } else if (booking?._id) {
                // If it's the booking's un-persisted initial advance
                const diff = numAmt - (Number(editingEntry.amount) || 0);
                await axios.put(`/api/bookings/single/${booking._id}`, {
                    advancePaid: Math.max(0, (Number(booking.advancePaid) || 0) + diff),
                    bankName: bankName,
                    advanceDate: editDate,
                    advanceBankAccountId: isBank ? (selectedBank?._id || undefined) : undefined
                });
            }

            alert('Entry updated successfully!');
            setEditingEntry(null);
            await fetchLedger();
            if (onEntryUpdated) onEntryUpdated();
        } catch (err) {
            console.error('Error updating ledger entry:', err);
            alert(err.response?.data?.message || 'Failed to update ledger entry');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!editingEntry) return;
        if (!window.confirm(`Delete this ${editingEntry.type} entry of ₹${Number(editingEntry.amount).toLocaleString('en-IN')}? This will update the client balance and booking dues.`)) {
            return;
        }

        try {
            setDeletingEdit(true);
            if (editingEntry._id) {
                await axios.delete(`/api/clients/ledger/${editingEntry._id}`);
            } else if (booking?._id) {
                // Initial advance stored only on the booking (no separate ledger row)
                await axios.put(`/api/bookings/single/${booking._id}`, {
                    advancePaid: Math.max(0, (Number(booking.advancePaid) || 0) - (Number(editingEntry.amount) || 0))
                });
            }
            alert('Entry deleted successfully!');
            setEditingEntry(null);
            await fetchLedger();
            if (onEntryUpdated) onEntryUpdated();
        } catch (err) {
            console.error('Error deleting entry:', err);
            alert(err.response?.data?.message || 'Failed to delete entry');
        } finally {
            setDeletingEdit(false);
        }
    };

    if (!booking) return null;

    const totalFare = Number(booking.totalAmount) || 0;
    const fuelAmt = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;

    // Prepare display rows
    let displayEntries = [...ledgerEntries];
    const recordedPaymentSum = displayEntries
        .filter(e => e.type === 'Advance' || e.type === 'Payment')
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalAdvancePaid = Number(booking.advancePaid) || 0;

    if (totalAdvancePaid > recordedPaymentSum) {
        const missingAdv = totalAdvancePaid - recordedPaymentSum;
        const initMode = booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : (booking.paymentMode || 'Cash'));
        displayEntries.unshift({
            date: booking.advanceDate || booking.createdAt || new Date(),
            type: 'Advance',
            amount: missingAdv,
            bankName: booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : ''),
            paymentMode: initMode,
            description: `Advance Received via ${initMode}`
        });
    } else if (booking.advancePayment && Number(booking.advancePayment) > 0 && !displayEntries.some(e => e.type === 'Advance')) {
        const advAmt = Number(booking.advancePayment);
        const initMode = booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : (booking.paymentMode || 'Cash'));
        displayEntries.unshift({
            date: booking.advanceDate || booking.createdAt || new Date(),
            type: 'Advance',
            amount: advAmt,
            bankName: booking.bankName || (/cash/i.test(booking.paymentMode || '') ? 'Cash' : ''),
            paymentMode: initMode,
            description: `Advance Received via ${initMode}`
        });
    }
    const hasFuelEntry = displayEntries.some(e => e.type === 'Fuel');
    if (!hasFuelEntry && fuelAmt > 0) {
        displayEntries.push({
            date: booking.travelEndDate || booking.updatedAt || booking.createdAt || new Date(),
            type: 'Fuel',
            amount: fuelAmt,
            description: 'Fuel Paid by Guest (Deducted)'
        });
    }

    const totalCredits = displayEntries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const effectivePaid = Math.max(totalAdvancePaid + fuelAmt, totalCredits);
    const balanceDue = Math.max(0, totalFare - totalCredits);
    const isPaidFull = balanceDue <= 0;

    const createdDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
    const sDate = booking.tripStartFormatted || (booking.travelStartDate ? new Date(booking.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');
    const eDate = booking.tripEndFormatted || (booking.travelEndDate ? new Date(booking.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');

    const handleDownloadPdf = () => {
        let runBal = totalFare;
        const pdfRows = [
            {
                date: createdDate,
                particulars: `Tour Package Booking Fare (${sDate} to ${eDate})`,
                fare: totalFare,
                paid: null,
                balance: totalFare,
                mode: 'Booking Confirmed'
            }
        ];

        displayEntries.forEach(entry => {
            const amt = Number(entry.amount) || 0;
            runBal -= amt;
            const isFuel = entry.type === 'Fuel';
            const isAdv = entry.type === 'Advance';
            pdfRows.push({
                date: new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
                particulars: isFuel ? 'Fuel Paid by Guest (Deducted)' : (isAdv ? 'Advance Payment Received' : 'Payment Received'),
                fare: null,
                paid: amt,
                balance: Math.max(0, runBal),
                mode: resolveEntryModeName(entry)
            });
        });

        generateClientLedgerPDF(booking, pdfRows, selectedCompany);
    };

    return (
        <AnimatePresence>
            <motion.div key="client-ledger-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 999998 }} />
            <motion.aside key="client-ledger-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '640px', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 999999, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '10px', borderRadius: '10px', color: '#60a5fa' }}><FileText size={20} /></div>
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Client Ledger & Payment Statement</h2>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                Track package fare, payments received & pending balance.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                {/* Scrollable Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {/* Top Stats Overview Card */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '7px', borderRadius: '8px' }}><Car size={16} /></div>
                                <div>
                                    <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{booking.vehicleType || 'Standard Vehicle'}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Client Booking & Trip Details</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: 'white', fontWeight: '700' }}>
                                Client: <span style={{ color: '#60a5fa' }}>{booking.clientName}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip Start</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{sDate || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip End</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{eDate || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Package Price</div>
                                <div style={{ fontSize: '14px', color: 'white', fontWeight: '800' }}>₹{totalFare.toLocaleString('en-IN')}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Total Received</div>
                                <div style={{ fontSize: '20px', color: '#10b981', fontWeight: '900' }}>₹{effectivePaid.toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Balance Due</div>
                                <div style={{ fontSize: '20px', color: isPaidFull ? '#10b981' : '#f59e0b', fontWeight: '900' }}>₹{balanceDue.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: '600' }}>Payment Status</div>
                                <div style={{ 
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                    padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap',
                                    background: isPaidFull ? 'rgba(16, 185, 129, 0.2)' : effectivePaid > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: isPaidFull ? '#34d399' : effectivePaid > 0 ? '#fbbf24' : '#f87171',
                                    border: isPaidFull ? '1px solid rgba(16, 185, 129, 0.4)' : effectivePaid > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                                }}>
                                    {isPaidFull ? <><CheckCircle size={13} /> Paid</> : effectivePaid > 0 ? `Part Paid (₹${balanceDue.toLocaleString('en-IN')} Due)` : 'Payment Due'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Statement Table Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '7px', borderRadius: '8px', color: 'rgba(255,255,255,0.7)' }}><FileText size={16} /></div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '800' }}>Billing & Payment Statement</h3>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Itemized breakdown of package charges and received payments.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Statement Table */}
                    <div style={{ width: '100%', overflowX: 'auto', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Date</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Particulars / Description</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'right' }}>Package Fare (₹)</th>
                                    <th style={{ padding: '12px 10px', color: '#34d399', fontWeight: '700', textAlign: 'right' }}>Paid / Received (₹)</th>
                                    <th style={{ padding: '12px 10px', color: '#fbbf24', fontWeight: '700', textAlign: 'right' }}>Balance Due (₹)</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'center' }}>Payment Mode</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Row 1: Tour Package Booking Fare */}
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                                    <td style={{ padding: '12px 10px', color: 'white', whiteSpace: 'nowrap' }}>{createdDate}</td>
                                    <td style={{ padding: '12px 10px' }}>
                                        <div style={{ color: 'white', fontWeight: '700' }}>Tour Package Booking Fare</div>
                                    </td>
                                    <td style={{ padding: '12px 10px', color: 'white', fontWeight: '700', textAlign: 'right' }}>₹{totalFare.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>—</td>
                                    <td style={{ padding: '12px 10px', color: 'white', fontWeight: '700', textAlign: 'right' }}>₹{totalFare.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '11px', fontWeight: '700' }}>
                                            Booking Confirmed
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                        {onEditBooking && (
                                            <button
                                                type="button"
                                                onClick={onEditBooking}
                                                title="Edit Tour Package Booking Details & Fare"
                                                style={{
                                                    padding: '4px 8px',
                                                    background: 'rgba(167, 139, 250, 0.15)',
                                                    border: '1px solid rgba(167, 139, 250, 0.35)',
                                                    borderRadius: '6px',
                                                    color: '#c4b5fd',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Edit size={12} />
                                                <span>Edit</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {/* Subsequent Rows */}
                                {(() => {
                                    let runBal = totalFare;
                                    if (loading) {
                                        return <tr><td colSpan="7" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>;
                                    }
                                    if (displayEntries.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="7" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                                    No payments recorded yet.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return displayEntries.map((entry, idx) => {
                                        const amt = Number(entry.amount) || 0;
                                        runBal -= amt;
                                        const isFuel = entry.type === 'Fuel';
                                        const isAdv = entry.type === 'Advance';
                                        const modeName = resolveEntryModeName(entry);

                                        return (
                                            <tr key={entry._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isFuel ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                                                <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                                                    {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '12px 10px' }}>
                                                    {isFuel ? (
                                                        <div>
                                                            <div style={{ color: '#fbbf24', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <Fuel size={13} color="#fbbf24" />
                                                                <span>Fuel Paid by Guest</span>
                                                            </div>
                                                            {(() => {
                                                                const rawDesc = entry.description || '';
                                                                const cleanDesc = rawDesc
                                                                    .replace(/^Fuel paid by guest\s*/i, '')
                                                                    .replace(/deducted from booking balance/i, '')
                                                                    .replace(/[()]/g, '')
                                                                    .trim();
                                                                return cleanDesc ? (
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
                                                                        {cleanDesc}
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#34d399', fontWeight: '700' }}>
                                                                {isAdv ? 'Advance Payment Received' : 'Payment Received'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>—</td>
                                                <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: '800', textAlign: 'right' }}>
                                                    + ₹{amt.toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 10px', color: Math.max(0, runBal) === 0 ? '#10b981' : '#fbbf24', fontWeight: '800', textAlign: 'right' }}>
                                                    ₹{Math.max(0, runBal).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: '3px 8px', borderRadius: '6px', 
                                                        background: isFuel ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.15)', 
                                                        color: isFuel ? '#fbbf24' : '#6ee7b7', 
                                                        fontSize: '11px', fontWeight: '700' 
                                                    }}>
                                                        {modeName}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditPayment(entry)}
                                                        title="Edit this entry"
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: 'rgba(56, 189, 248, 0.15)',
                                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                                            borderRadius: '6px',
                                                            color: '#38bdf8',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Edit size={12} />
                                                        <span>Edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {onAddEntry && !isPaidFull && (
                            <button onClick={onAddEntry} style={{ flex: 1, minWidth: '150px', padding: '12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Plus size={16} /> Record Payment
                            </button>
                        )}
                        {onEditBooking && (
                            <button onClick={onEditBooking} style={{ flex: 1, minWidth: '140px', padding: '12px', background: 'rgba(167, 139, 250, 0.14)', border: '1px solid rgba(167, 139, 250, 0.35)', color: '#c4b5fd', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Edit size={15} /> Edit Booking
                            </button>
                        )}
                        <button onClick={handleDownloadPdf} style={{ flex: 1, minWidth: '150px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Download size={16} /> Download Ledger PDF
                        </button>
                    </div>
                </div>

                {/* EDIT PAYMENT ENTRY MODAL */}
                <AnimatePresence>
                    {editingEntry && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000000, padding: '20px' }}>
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '460px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '8px', borderRadius: '8px' }}>
                                            <Edit size={16} />
                                        </div>
                                        <div>
                                            <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '800' }}>
                                                Edit {editingEntry.type === 'Fuel' ? 'Guest Fuel Entry' : (editingEntry.type === 'Advance' ? 'Advance Payment' : 'Payment Entry')}
                                            </h3>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                Client: {booking.clientName}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setEditingEntry(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}><X size={18} /></button>
                                </div>

                                <form onSubmit={handleSaveEditEntry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={editAmount}
                                            onChange={e => setEditAmount(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#10b981', outline: 'none', fontSize: '16px', fontWeight: '800', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Payment Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            onClick={e => e.target.showPicker?.()}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer', colorScheme: 'dark' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Payment Mode</label>
                                        <select
                                            value={editMode}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditMode(val);
                                                const matchedBank = bankAccounts.find(b => b.bankName === val);
                                                if (matchedBank) setEditBankAccountId(matchedBank._id);
                                            }}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: '#0b1120', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            {editingEntry.type === 'Fuel' && (
                                                <option value="Fuel (Guest)">⛽ Fuel Paid by Guest (Deducted from Balance)</option>
                                            )}
                                            <option value="Cash to Company">💵 Cash to Company (Cash Book)</option>
                                            {bankAccounts.map(b => (
                                                <option key={b._id} value={b.bankName}>
                                                    🏦 {b.bankName} - {b.accountNumber} ({b.accountHolderName})
                                                </option>
                                            ))}
                                            <option value="UPI / QR Code">📱 UPI / QR Code (General)</option>
                                            <option value="Bank Transfer / NEFT">🏛 Bank Transfer / NEFT (General)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>Reference / UTR / Note (Optional)</label>
                                        <input
                                            type="text"
                                            value={editReference}
                                            onChange={e => setEditReference(e.target.value)}
                                            placeholder="UTR or transaction note"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
                                        {(editingEntry._id || booking?._id) && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteEntry}
                                                disabled={deletingEdit || savingEdit}
                                                style={{
                                                    padding: '10px 14px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    color: '#f87171',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    fontSize: '12px',
                                                    fontWeight: '700'
                                                }}
                                                title="Delete this ledger entry"
                                            >
                                                <Trash2 size={14} />
                                                <span>{deletingEdit ? 'Deleting...' : 'Delete'}</span>
                                            </button>
                                        )}
                                        <div style={{ flex: 1 }} />
                                        <button
                                            type="button"
                                            onClick={() => setEditingEntry(null)}
                                            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingEdit}
                                            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }}
                                        >
                                            {savingEdit ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.aside>
        </AnimatePresence>
    );
}
