import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { Calendar, Plus, Save, Trash2, X, Users, Car, Clock, MapPin, IndianRupee } from 'lucide-react';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

export default function DRS() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const [duties, setDuties] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
        clientName: '',
        mobileNumber: '',
        date: selectedDate,
        time: '09:00 AM',
        carType: '',
        itinerary: '',
        revenue: 0,
        driver: null,
        vehicle: null
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchDuties();
            fetchDropdownData();
        }
    }, [selectedCompany, selectedDate]);

    const fetchDuties = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/drs/${selectedCompany._id}?date=${selectedDate}`);
            setDuties(data);
        } catch (error) {
            console.error('Error fetching DRS duties:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [driverRes, vehicleRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&status=active`),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`)
            ]);
            setDrivers(driverRes.data.drivers || driverRes.data || []);
            setVehicles(vehicleRes.data.vehicles || vehicleRes.data || []);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const driverOptions = drivers.map(d => ({ value: d._id, label: `${d.name} (${d.mobile})` }));
    const vehicleOptions = vehicles.map(v => ({ value: v._id, label: `${v.carNumber} - ${v.model}` }));

    const handleAssign = async (dutyId, field, value) => {
        try {
            const updated = await axios.put(`/api/drs/${dutyId}`, {
                [field]: value,
                status: 'Assigned'
            });
            setDuties(duties.map(d => d._id === dutyId ? updated.data : d));
        } catch (error) {
            console.error('Error assigning:', error);
            alert('Failed to update assignment');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this duty?')) {
            try {
                await axios.delete(`/api/drs/${id}`);
                fetchDuties();
            } catch (error) {
                console.error('Error deleting:', error);
            }
        }
    };

    const handleSubmitDirect = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/drs', {
                ...formData,
                company: selectedCompany._id,
                driver: formData.driver?.value || null,
                vehicle: formData.vehicle?.value || null,
                status: formData.driver && formData.vehicle ? 'Assigned' : 'Pending'
            });
            setShowModal(false);
            fetchDuties();
        } catch (error) {
            console.error('Error adding direct duty:', error);
            alert('Failed to add direct duty');
        }
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: 'rgba(0,0,0,0.2)',
            borderColor: state.isFocused ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            minWidth: '200px',
            minHeight: '40px',
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'var(--primary)'
            }
        }),
        singleValue: (base) => ({ ...base, color: 'white' }),
        input: (base) => ({ ...base, color: 'white' }),
        menu: (base) => ({ 
            ...base, 
            background: '#1e293b', 
            zIndex: 9999,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: state.isSelected ? 'var(--primary)' : 'white',
            cursor: 'pointer',
            '&:hover': {
                background: 'rgba(255,255,255,0.08)'
            }
        }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.4)', fontSize: '13px' })
    };

    const inputStyle = {
        position: 'relative',
        width: '100%', 
        padding: '12px', 
        borderRadius: '10px', 
        border: '1px solid rgba(255,255,255,0.1)', 
        background: 'rgba(0,0,0,0.2)', 
        color: 'white',
        outline: 'none',
        transition: 'all 0.3s ease'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="DRS Schedule" />

            {/* Header */}
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '45px',
                        height: '45px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Daily Routine <span className="text-gradient-yellow">Schedule (DRS)</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            View and manage daily vehicle assignments and driver schedules.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div 
                        style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)', cursor: 'pointer' }}
                        onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            if (input && input.showPicker) input.showPicker();
                        }}
                    >
                        <Calendar size={18} color="var(--primary)" style={{ marginRight: '10px' }} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            style={{ position: 'relative', background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setFormData({ clientName: '', mobileNumber: '', date: selectedDate, time: '09:00 AM', carType: '', itinerary: '', revenue: 0, driver: null, vehicle: null });
                            setShowModal(true);
                        }}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                        }}
                    >
                        <Plus size={20} /> Direct Booking
                    </motion.button>
                </div>
            </header>

            {/* Duties Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', width: '100px' }}>Time</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Client & Contact</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Itinerary & Req.</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', width: '250px' }}>Assignment</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Revenue</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></td></tr>
                        ) : duties.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <Calendar size={48} />
                                        <div style={{ fontSize: '18px', fontWeight: '600' }}>No duties scheduled</div>
                                        <div style={{ fontSize: '14px' }}>There are no bookings or DRS entries for {new Date(selectedDate).toLocaleDateString()}</div>
                                    </div>
                                </td>
                            </tr>
                        ) : duties.map(duty => (
                            <tr key={duty._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                <td style={{ padding: '16px 20px', fontWeight: '800', fontSize: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} color="var(--primary)" /> {duty.time}</div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {duty.clientName}
                                        {duty.leadId && <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.3)', fontWeight: '700' }}>LEAD</span>}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{duty.mobileNumber}</div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span style={{ lineHeight: '1.4' }}>{duty.itinerary}</span>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.8)' }}>
                                        <Car size={12} color="var(--primary)"/> Req: <span style={{ fontWeight: 'bold' }}>{duty.carType}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Select 
                                        options={driverOptions}
                                        value={duty.driver ? { value: duty.driver._id, label: duty.driver.name } : null}
                                        onChange={(opt) => handleAssign(duty._id, 'driver', opt?.value)}
                                        placeholder="Assign Driver"
                                        styles={customSelectStyles}
                                        isClearable
                                        menuPortalTarget={document.body}
                                    />
                                    <Select 
                                        options={vehicleOptions}
                                        value={duty.vehicle ? { value: duty.vehicle._id, label: duty.vehicle.carNumber } : null}
                                        onChange={(opt) => handleAssign(duty._id, 'vehicle', opt?.value)}
                                        placeholder="Assign Vehicle"
                                        styles={customSelectStyles}
                                        isClearable
                                        menuPortalTarget={document.body}
                                    />
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: '900', color: 'white', fontSize: '16px' }}>₹{duty.revenue}</td>
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px',
                                        background: duty.status === 'Assigned' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                        color: duty.status === 'Assigned' ? '#4ade80' : '#fde047',
                                        border: `1px solid ${duty.status === 'Assigned' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`
                                    }}>
                                        {duty.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <button onClick={() => handleDelete(duty._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Direct Booking Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div 
                            initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                            animate={{ y: 0, opacity: 1, scale: 1 }} 
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="glass-card" 
                            style={{ width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Plus size={24} color="var(--primary)" /> New Direct Duty
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} /></button>
                            </div>
                            
                            <form onSubmit={handleSubmitDirect} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Client Info */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Client Name</label>
                                    <input required type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} style={inputStyle} placeholder="e.g. Ramesh Patel" />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Mobile Number</label>
                                    <input required type="text" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} style={inputStyle} placeholder="e.g. +91 9876543210" />
                                </div>
                                
                                {/* Schedule */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Reporting Date</label>
                                    <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onClick={e => e.target.showPicker && e.target.showPicker()} style={{...inputStyle, cursor: 'pointer'}} />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Reporting Time</label>
                                    <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} style={inputStyle} />
                                </div>
                                
                                {/* Route */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Itinerary / Route</label>
                                    <input required type="text" value={formData.itinerary} onChange={e => setFormData({ ...formData, itinerary: e.target.value })} placeholder="e.g. Airport Pick up -> City Tour -> Hotel Drop" style={inputStyle} />
                                </div>
                                
                                {/* Commercials */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Car Type (Requested)</label>
                                    <input required type="text" value={formData.carType} onChange={e => setFormData({ ...formData, carType: e.target.value })} style={inputStyle} placeholder="e.g. Innova Crysta" />
                                </div>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Revenue (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                        <input required type="number" min="0" value={formData.revenue} onChange={e => setFormData({ ...formData, revenue: Number(e.target.value) })} style={{ ...inputStyle, paddingLeft: '35px' }} placeholder="Amount" />
                                    </div>
                                </div>
                                
                                {/* Pre-assign (Optional) */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '15px' }}>Advance Assignment (Optional)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Assign Driver</label>
                                            <Select options={driverOptions} onChange={opt => setFormData({...formData, driver: opt})} styles={customSelectStyles} isClearable menuPortalTarget={document.body} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Assign Vehicle</label>
                                            <Select options={vehicleOptions} onChange={opt => setFormData({...formData, vehicle: opt})} styles={customSelectStyles} isClearable menuPortalTarget={document.body} />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '12px 30px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '15px', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)' }}>Save Duty</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
