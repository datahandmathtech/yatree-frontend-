import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Car, CheckCircle, Clock, Plus, Download, Fuel, Edit } from 'lucide-react';
import axios from '../../api/axios';
import { useCompany } from '../../context/CompanyContext';
import { generateClientLedgerPDF } from '../../utils/clientLedgerPdf';

export default function ClientLedgerDrawer({ booking, onClose, onAddEntry, onEditBooking }) {
    const { selectedCompany } = useCompany();
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (booking && booking.client) {
            fetchLedger();
        } else {
            setLoading(false);
        }
    }, [booking]);

    const fetchLedger = async () => {
        try {
            const clientId = typeof booking.client === 'object' ? booking.client?._id : booking.client;
            if (!clientId) {
                setLoading(false);
                return;
            }
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);
            const bkgCode = booking.bookingCode || booking.bookingId;
            const bkgLedger = (data || []).filter(entry => {
                if (['Payment', 'Advance', 'Fuel'].includes(entry.type)) {
                    if (entry.referenceId === booking._id) return true;
                    if (bkgCode && entry.description && (entry.description.includes(bkgCode) || (booking.bookingId && entry.description.includes(booking.bookingId)))) return true;
                }
                return false;
            }).sort((a,b) => new Date(a.date) - new Date(b.date));
            setLedgerEntries(bkgLedger);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return null;

    const totalFare = Number(booking.totalAmount) || 0;
    const totalCredits = ledgerEntries.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const effectivePaid = Math.max(Number(booking.advancePaid) || 0, totalCredits);
    const balanceDue = booking.balanceDue !== undefined ? Number(booking.balanceDue) : Math.max(0, totalFare - effectivePaid);
    const isPaidFull = balanceDue <= 0;

    const createdDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
    const sDate = booking.tripStartFormatted || (booking.travelStartDate ? new Date(booking.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');
    const eDate = booking.tripEndFormatted || (booking.travelEndDate ? new Date(booking.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '');

    // Prepare display rows
    let displayEntries = [...ledgerEntries];
    if (displayEntries.length === 0 && (booking.advancePaid || 0) > 0) {
        displayEntries.push({
            date: booking.advanceDate || booking.createdAt || new Date(),
            type: 'Advance',
            amount: booking.advancePaid,
            description: `Advance Received via ${booking.paymentMode || 'UPI / QR Code'}`
        });
    }

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
                mode: isFuel ? 'Guest Fuel' : (entry.description?.split('via ')[1]?.split(' (')[0] || (isAdv ? 'Advance' : 'Payment'))
            });
        });

        generateClientLedgerPDF(booking, pdfRows, selectedCompany);
    };

    return (
        <AnimatePresence>
            <motion.div key="client-ledger-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 999998 }} />
            <motion.aside key="client-ledger-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '560px', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 999999, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
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
                                    padding: '5px 14px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '800',
                                    background: isPaidFull ? 'rgba(16, 185, 129, 0.2)' : effectivePaid > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: isPaidFull ? '#34d399' : effectivePaid > 0 ? '#fbbf24' : '#f87171',
                                    border: isPaidFull ? '1px solid rgba(16, 185, 129, 0.4)' : effectivePaid > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                                }}>
                                    {isPaidFull ? 'Paid in Full' : effectivePaid > 0 ? `Part Paid (₹${balanceDue.toLocaleString('en-IN')} Due)` : 'Payment Due'}
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
                                </tr>

                                {/* Subsequent Rows */}
                                {(() => {
                                    let runBal = totalFare;
                                    if (loading) {
                                        return <tr><td colSpan="6" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>;
                                    }
                                    if (displayEntries.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
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
                                        const modeName = isFuel 
                                            ? 'Guest Fuel' 
                                            : (entry.description?.split('via ')[1]?.split(' (')[0] || (isAdv ? 'Advance Payment' : 'Payment Received'));

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
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                                Deducted from booking balance {entry.description ? `(${entry.description.replace(/^Fuel paid by guest\s*/i, '')})` : ''}
                                                            </div>
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
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Settlement Status Card */}
                    {isPaidFull ? (
                        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: '#10b981', color: 'white', borderRadius: '50%', padding: '4px', display: 'flex' }}><CheckCircle size={16} /></div>
                            <div>
                                <div style={{ color: '#34d399', fontWeight: '800', fontSize: '13px' }}>Booking Fully Paid & Settled</div>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px' }}>Total received ₹{effectivePaid.toLocaleString('en-IN')}. Zero outstanding balance.</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderRadius: '50%', padding: '6px', display: 'flex' }}><Clock size={16} /></div>
                            <div>
                                <div style={{ color: '#fbbf24', fontWeight: '800', fontSize: '13px' }}>₹{balanceDue.toLocaleString('en-IN')} Outstanding Balance Due</div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '2px' }}>Client has paid ₹{effectivePaid.toLocaleString('en-IN')} of total ₹{totalFare.toLocaleString('en-IN')}.</div>
                            </div>
                        </div>
                    )}
                    
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
            </motion.aside>
        </AnimatePresence>
    );
}
