import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Car, CheckCircle, Plus, Download } from 'lucide-react';
import axios from '../../api/axios';

export default function ClientLedgerDrawer({ booking, onClose, onAddEntry }) {
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (booking && booking.client) {
            fetchLedger();
        }
    }, [booking]);

    const fetchLedger = async () => {
        try {
            const clientId = typeof booking.client === 'object' ? booking.client._id : booking.client;
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);
            const bkgLedger = data.filter(entry => entry.referenceId === booking._id && entry.type === 'Payment').sort((a,b) => new Date(a.date) - new Date(b.date));
            setLedgerEntries(bkgLedger);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 999998 }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '500px', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 999999, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '10px', borderRadius: '10px', color: '#60a5fa' }}><FileText size={20} /></div>
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Client Ledger - {booking.bookingCode || booking.bookingId}</h2>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>View client account, payments and outstanding balance.</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '6px', borderRadius: '6px' }}><Car size={16} /></div>
                                <div>
                                    <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{booking.vehicleType}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Client booking details and trip information</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>Name : {booking.clientName}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Booking Code</div>
                                <div style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '800' }}>{booking.bookingCode || booking.bookingId}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip Start</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{booking.tripStartFormatted || new Date(booking.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Trip End</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{booking.tripEndFormatted || new Date(booking.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Package Price</div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>₹{(booking.totalAmount || 0).toLocaleString()}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Total Received</div>
                                <div style={{ fontSize: '18px', color: '#34d399', fontWeight: '800' }}>₹{(booking.advancePaid || 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Closing Balance</div>
                                <div style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '800' }}>₹{(booking.balanceDue !== undefined ? booking.balanceDue : (booking.totalAmount - (booking.advancePaid || 0))).toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Status</div>
                                <div style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: (booking.balanceDue || 0) <= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: (booking.balanceDue || 0) <= 0 ? '#4ade80' : '#fbbf24', border: (booking.balanceDue || 0) <= 0 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(251,191,36,0.4)' }}>
                                    {(booking.balanceDue || 0) <= 0 ? 'Settled' : 'Pending'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '8px', color: 'rgba(255,255,255,0.7)' }}><FileText size={16} /></div>
                        <div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '700' }}>Accounting Ledger</h3>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Complete payment history for this booking.</p>
                        </div>
                    </div>
                    
                    <div style={{ width: '100%', overflowX: 'auto', marginBottom: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Date</th>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Particulars</th>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Debit (₹)</th>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Credit (₹)</th>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Running Bal (₹)</th>
                                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>{new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>Opening Balance / Package Value</td>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>{(booking.totalAmount || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>-</td>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>{(booking.totalAmount || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 8px', color: 'white' }}>System</td>
                                </tr>
                                {(() => {
                                    let runBal = booking.totalAmount || 0;
                                    return ledgerEntries.map((entry, idx) => {
                                        runBal -= (entry.amount || 0);
                                        return (
                                            <tr key={entry._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>{idx === 0 ? 'Advance Received' : 'Payment Received'}</td>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>-</td>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>{(entry.amount || 0).toLocaleString()}</td>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>{runBal.toLocaleString()}</td>
                                                <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.8)' }}>{entry.description.split('via ')[1]?.split(' (')[0] || 'Unknown'}</td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    {(booking.balanceDue || 0) <= 0 ? (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: '#22c55e', color: 'white', borderRadius: '50%', padding: '4px' }}><CheckCircle size={16} /></div>
                            <div>
                                <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '13px' }}>Booking fully settled</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '2px' }}>Total received ₹{(booking.advancePaid || 0).toLocaleString()}. No outstanding balance.</div>
                            </div>
                        </div>
                    ) : null}
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {onAddEntry && (
                            <button onClick={onAddEntry} style={{ flex: 1, padding: '12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Plus size={16} /> Add Entry
                            </button>
                        )}
                        <button onClick={() => alert('Download PDF feature coming soon')} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Download size={16} /> Download Ledger PDF
                        </button>
                    </div>
                </div>
            </motion.aside>
        </AnimatePresence>
    );
}
