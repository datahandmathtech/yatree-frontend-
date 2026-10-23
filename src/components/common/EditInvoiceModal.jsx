import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Download } from 'lucide-react';
import axios from '../../api/axios';

/**
 * Edit an existing Tax Invoice.
 * Props:
 *  - invoiceId (preferred) OR booking.taxInvoiceId
 *  - onDownload(invoice) optional: shows a Download PDF button
 */
export default function EditInvoiceModal({ booking, invoiceId, onClose, onSuccess, onDownload }) {
    const resolvedId = invoiceId || booking?.taxInvoiceId;
    const [invoiceData, setInvoiceData] = useState(null);
    const [formData, setFormData] = useState({
        billToName: '',
        companyName: '',
        mobile: '',
        gstin: '',
        address: '',
        invoiceDate: '',
        gstMode: 'GST Inclusive',
        gstRate: 5
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (resolvedId) {
            fetchInvoice();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedId]);

    const fetchInvoice = async () => {
        try {
            const { data } = await axios.get(`/api/invoices/single/${resolvedId}`);
            setInvoiceData(data);
            setFormData({
                billToName: data.billTo?.name || '',
                companyName: data.billTo?.companyName || '',
                mobile: data.billTo?.mobile || '',
                gstin: data.billTo?.gstin || '',
                address: data.billTo?.address || '',
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate).toISOString().split('T')[0] : '',
                gstMode: data.gstMode || 'GST Inclusive',
                gstRate: data.gstRate ?? 5
            });
        } catch (err) {
            console.error('Error fetching invoice', err);
            alert('Failed to load invoice');
            onClose && onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/invoices/single/${resolvedId}`, {
                billTo: {
                    name: formData.billToName,
                    companyName: formData.companyName,
                    mobile: formData.mobile,
                    gstin: formData.gstin,
                    address: formData.address
                },
                invoiceDate: formData.invoiceDate || undefined,
                gstMode: formData.gstMode,
                gstRate: Number(formData.gstRate) || 0
            });
            onSuccess && onSuccess(data);
        } catch (error) {
            console.error('Error updating invoice', error);
            alert(error.response?.data?.message || 'Failed to update invoice');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px', boxSizing: 'border-box' };
    const labelStyle = { fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' };

    if (loading || !invoiceData) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '520px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Edit Tax Invoice</h2>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px' }}>
                        <strong style={{ color: '#34d399' }}>{invoiceData.invoiceNumber}</strong>
                        {invoiceData.bookingId ? <> • Booking <strong style={{ color: '#fbbf24' }}>{invoiceData.bookingId}</strong></> : null}
                        {' '}• ₹{Number(invoiceData.totalAmount || 0).toLocaleString('en-IN')} • {invoiceData.status}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Billed To (Guest Name)</label>
                                <input type="text" required value={formData.billToName} onChange={e => setFormData({ ...formData, billToName: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Company Name</label>
                                <input type="text" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mobile</label>
                                <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>GSTIN</label>
                                <input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Invoice Date</label>
                                <input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} onClick={e => e.target.showPicker?.()} style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>GST Mode</label>
                                <select value={formData.gstMode} onChange={e => setFormData({ ...formData, gstMode: e.target.value })} style={inputStyle}>
                                    <option value="GST Inclusive" style={{ background: '#0f172a', color: 'white' }}>GST Inclusive</option>
                                    <option value="GST Extra" style={{ background: '#0f172a', color: 'white' }}>GST Extra</option>
                                    <option value="No GST" style={{ background: '#0f172a', color: 'white' }}>No GST</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>GST %</label>
                                <input type="number" min="0" value={formData.gstRate} onChange={e => setFormData({ ...formData, gstRate: e.target.value })} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            {onDownload && (
                                <button type="button" onClick={() => onDownload(invoiceData)} style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Download size={15} /> PDF
                                </button>
                            )}
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Invoice'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
