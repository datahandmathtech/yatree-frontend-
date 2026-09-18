import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import axios from '../../api/axios';

const VEHICLES = [
    'Sedan', 'Innova Crysta', 'Ertiga', 'Swift Dzire', 'Tempo Traveller (12 Seater)', 
    'Tempo Traveller (16 Seater)', 'Tempo Traveller (20 Seater)', 'Tempo Traveller (26 Seater)',
    'Urbania', 'Mini Bus', 'Bus'
];

export default function EditBookingModal({ booking, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        vehicleType: '',
        totalAmount: 0,
        travelStartDate: '',
        travelEndDate: '',
        pickupLocation: '',
        dropLocation: ''
    });
    const [saving, setSaving] = useState(false);
    const startRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        if (booking) {
            setFormData({
                vehicleType: booking.vehicleType || '',
                totalAmount: booking.totalAmount || 0,
                travelStartDate: booking.travelStartDate ? new Date(booking.travelStartDate).toISOString().split('T')[0] : '',
                travelEndDate: booking.travelEndDate ? new Date(booking.travelEndDate).toISOString().split('T')[0] : '',
                pickupLocation: booking.pickupLocation || '',
                dropLocation: booking.dropLocation || ''
            });
        }
    }, [booking]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`/api/bookings/single/${booking._id}`, formData);
            onSuccess();
        } catch (error) {
            console.error('Error updating booking', error);
            alert('Failed to update booking');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '13px'
    };

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '500px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Edit Booking {booking.bookingCode}</h2>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Vehicle Type</label>
                            <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} style={inputStyle}>
                                {VEHICLES.map(v => <option key={v} value={v} style={{ background: '#0f172a', color: 'white', padding: '10px' }}>{v}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Total Package Price (₹)</label>
                            <input type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} style={inputStyle} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                <input type="date" ref={startRef} onClick={() => startRef.current?.showPicker()} value={formData.travelStartDate} onChange={e => setFormData({...formData, travelStartDate: e.target.value})} style={{...inputStyle, cursor: 'pointer', colorScheme: 'dark'}} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>End Date</label>
                                <input type="date" ref={endRef} onClick={() => endRef.current?.showPicker()} value={formData.travelEndDate} onChange={e => setFormData({...formData, travelEndDate: e.target.value})} style={{...inputStyle, cursor: 'pointer', colorScheme: 'dark'}} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Pickup Location</label>
                                <input type="text" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Drop Location</label>
                                <input type="text" value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} style={inputStyle} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
