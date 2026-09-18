import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import axios from '../../api/axios';

export default function EditInvoiceModal({ booking, onClose, onSuccess }) {
    const [invoiceData, setInvoiceData] = useState(null);
    const [formData, setFormData] = useState({
        billToName: '',
        gstMode: 'GST Extra'
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (booking && booking.taxInvoiceId) {
            fetchInvoice();
        }
    }, [booking]);

    const fetchInvoice = async () => {
        try {
            const { data } = await axios.get(`/api/invoices/${booking.taxInvoiceId}`);
            setInvoiceData(data);
            setFormData({
                billToName: data.billTo?.name || '',
                gstMode: data.gstMode || 'GST Extra'
            });
        } catch (err) {
            console.error('Error fetching invoice', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Update invoice logic here (assuming backend supports PUT /api/invoices/:id, but for now we just patch status)
            // Wait, we need an endpoint to actually update it. Since backend has updateInvoiceStatus, we might need a general update.
            // For now, let's just use what we have or add a PUT endpoint.
            await axios.put(`/api/invoices/${booking.taxInvoiceId}`, {
                billTo: { ...invoiceData.billTo, name: formData.billToName },
                gstMode: formData.gstMode
            });
            onSuccess();
        } catch (error) {
            console.error('Error updating invoice', error);
            alert('Failed to update invoice');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' };

    if (loading) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '500px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Edit Tax Invoice {invoiceData?.invoiceNumber}</h2>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Billed To</label>
                            <input type="text" value={formData.billToName} onChange={e => setFormData({...formData, billToName: e.target.value})} style={inputStyle} />
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                            <select value={formData.gstMode} onChange={e => setFormData({...formData, gstMode: e.target.value})} style={inputStyle}>
                                
                                <option value="GST Extra" style={{ background: '#0f172a', color: 'white' }}>GST Extra (5%)</option>
                                <option value="GST Inclusive" style={{ background: '#0f172a', color: 'white' }}>GST Inclusive</option>
                                <option value="No GST" style={{ background: '#0f172a', color: 'white' }}>No GST</option>

                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
