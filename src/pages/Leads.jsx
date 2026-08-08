import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { Plus, Edit, Trash2, FileText, CheckCircle, X, Download, Briefcase, Calendar, Car, IndianRupee, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SEO from '../components/SEO';

export default function Leads() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [convertingLead, setConvertingLead] = useState(null);
    const [advancePayment, setAdvancePayment] = useState('');

    const [formData, setFormData] = useState({
        clientName: '',
        mobileNumber: '',
        reference: '',
        travelStartDate: '',
        travelEndDate: '',
        carType: '',
        numberOfCars: 1,
        notes: '',
        itinerary: [],
        extraCharges: [],
        totalAmount: 0
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchLeads();
        }
    }, [selectedCompany]);

    const fetchLeads = async () => {
        try {
            const { data } = await axios.get(`/api/leads/${selectedCompany._id}`);
            setLeads(data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (lead = null) => {
        if (lead) {
            setEditingLead(lead);
            setFormData({
                clientName: lead.clientName,
                mobileNumber: lead.mobileNumber,
                reference: lead.reference || '',
                travelStartDate: lead.travelStartDate ? new Date(lead.travelStartDate).toISOString().split('T')[0] : '',
                travelEndDate: lead.travelEndDate ? new Date(lead.travelEndDate).toISOString().split('T')[0] : '',
                carType: lead.carType,
                numberOfCars: lead.numberOfCars || 1,
                notes: lead.notes || '',
                itinerary: lead.itinerary || [],
                extraCharges: lead.extraCharges || [],
                totalAmount: lead.totalAmount || 0
            });
        } else {
            setEditingLead(null);
            setFormData({
                clientName: '', mobileNumber: '', reference: '', travelStartDate: '', travelEndDate: '',
                carType: '', numberOfCars: 1, notes: '', itinerary: [], extraCharges: [], totalAmount: 0
            });
        }
        setShowModal(true);
    };

    const addItineraryDay = () => {
        setFormData({
            ...formData,
            itinerary: [...formData.itinerary, { date: '', description: '', amount: 0 }]
        });
    };

    const removeItineraryDay = (index) => {
        const newItinerary = [...formData.itinerary];
        newItinerary.splice(index, 1);
        calculateTotal(newItinerary, formData.extraCharges);
    };

    const handleItineraryChange = (index, field, value) => {
        const newItinerary = [...formData.itinerary];
        newItinerary[index][field] = field === 'amount' ? Number(value) : value;
        calculateTotal(newItinerary, formData.extraCharges);
    };

    const calculateTotal = (itinerary, extraCharges) => {
        const sum = itinerary.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) +
            extraCharges.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        setFormData(prev => ({ ...prev, itinerary, extraCharges, totalAmount: sum }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, company: selectedCompany._id };
            if (editingLead) {
                await axios.put(`/api/leads/single/${editingLead._id}`, payload);
            } else {
                await axios.post('/api/leads', payload);
            }
            setShowModal(false);
            fetchLeads();
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Failed to save lead');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                await axios.delete(`/api/leads/single/${id}`);
                fetchLeads();
            } catch (error) {
                console.error('Error deleting lead:', error);
            }
        }
    };

    const generatePDF = (lead) => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text(selectedCompany?.name || 'Company Name', 14, 22);
        
        doc.setFontSize(10);
        doc.text(`Email: ${selectedCompany?.email || 'N/A'}`, 14, 28);
        doc.text(`Phone: ${selectedCompany?.whatsappNumber || 'N/A'}`, 14, 33);
        
        doc.setLineWidth(0.5);
        doc.line(14, 38, 196, 38);

        doc.setFontSize(16);
        doc.setTextColor(theme.primary || '#f59e0b');
        doc.text('Tour Quotation', 14, 48);
        
        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text(`Client Name: ${lead.clientName}`, 14, 56);
        doc.text(`Mobile: ${lead.mobileNumber}`, 14, 62);
        doc.text(`Car Type: ${lead.numberOfCars}x ${lead.carType}`, 120, 56);
        doc.text(`Travel Dates: ${new Date(lead.travelStartDate).toLocaleDateString()} to ${new Date(lead.travelEndDate).toLocaleDateString()}`, 120, 62);

        const tableColumn = ["Date", "Description", "Amount (Rs)"];
        const tableRows = [];
        
        lead.itinerary.forEach(day => {
            const rowData = [
                new Date(day.date).toLocaleDateString(),
                day.description,
                `Rs. ${day.amount}`
            ];
            tableRows.push(rowData);
        });

        doc.autoTable({
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        const finalY = doc.previousAutoTable.finalY || 70;
        doc.setFontSize(12);
        const baseTotal = lead.itinerary.reduce((acc, curr) => acc + curr.amount, 0);
        const extraTotal = lead.extraCharges.reduce((acc, curr) => acc + curr.amount, 0);
        
        doc.text(`Base Total: Rs. ${baseTotal}`, 140, finalY + 10);
        if(extraTotal > 0) doc.text(`Extra Charges: Rs. ${extraTotal}`, 140, finalY + 16);
        
        doc.setFontSize(14);
        doc.setTextColor(0, 100, 0);
        doc.text(`Grand Total: Rs. ${lead.totalAmount}`, 140, finalY + 26);
        
        doc.save(`${lead.clientName}_Quote.pdf`);
    };

    const handleConvert = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/leads/${convertingLead._id}/convert`, {
                advancePayment: Number(advancePayment)
            });
            setShowConvertModal(false);
            fetchLeads();
            alert('Booking Confirmed! Check DRS Schedule.');
        } catch (error) {
            console.error('Error converting lead:', error);
            alert('Failed to convert booking. Please make sure advance amount is valid.');
        }
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
            <SEO title="Lead Management" />

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
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Lead <span className="text-gradient-yellow">Management</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            Manage inquiries, create quotations, and convert them to bookings.
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
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
                    <Plus size={20} /> New Lead
                </motion.button>
            </header>

            {/* Leads Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Client Info</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Travel Dates</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Car Requirement</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Quoted Amount</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></td></tr>
                        ) : leads.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>No leads found. Create your first lead!</td></tr>
                        ) : leads.map(lead => (
                            <tr key={lead._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{lead.clientName}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>{lead.mobileNumber}</div>
                                </td>
                                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="var(--primary)" /> {new Date(lead.travelStartDate).toLocaleDateString()}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Calendar size={14} color="rgba(255,255,255,0.4)" /> {new Date(lead.travelEndDate).toLocaleDateString()}</div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
                                        <Car size={14} color="var(--primary)"/> {lead.numberOfCars}x {lead.carType}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: '900', color: 'white', fontSize: '16px' }}>₹{lead.totalAmount}</td>
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px',
                                        background: lead.status === 'Confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                        color: lead.status === 'Confirmed' ? '#4ade80' : '#fde047',
                                        border: `1px solid ${lead.status === 'Confirmed' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`
                                    }}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        {lead.status !== 'Confirmed' && (
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setConvertingLead(lead); setAdvancePayment(''); setShowConvertModal(true); }} style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '12px' }}>
                                                <CheckCircle size={14} /> BOOK
                                            </motion.button>
                                        )}
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => generatePDF(lead)} style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '12px' }}>
                                            <Download size={14} /> PDF
                                        </motion.button>
                                        <button onClick={() => handleOpenModal(lead)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#f1f5f9', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(lead._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create / Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div 
                            initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                            animate={{ y: 0, opacity: 1, scale: 1 }} 
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="glass-card" 
                            style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '800' }}>{editingLead ? 'Edit Lead Quotation' : 'Create New Quotation'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Client Info Section */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Client Details</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Client Name</label>
                                            <input required type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} style={inputStyle} placeholder="e.g. Ramesh Patel" />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Mobile Number</label>
                                            <input required type="text" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} style={inputStyle} placeholder="e.g. +91 9876543210" />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Reference (Optional)</label>
                                            <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} style={inputStyle} placeholder="e.g. Justdial / Friend" />
                                        </div>
                                    </div>
                                </div>

                                {/* Tour Info Section */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Tour & Vehicle Specs</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Travel Start Date</label>
                                            <input required type="date" value={formData.travelStartDate} onChange={e => setFormData({ ...formData, travelStartDate: e.target.value })} onClick={e => e.target.showPicker && e.target.showPicker()} style={{...inputStyle, cursor: 'pointer'}} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Travel End Date</label>
                                            <input required type="date" value={formData.travelEndDate} onChange={e => setFormData({ ...formData, travelEndDate: e.target.value })} onClick={e => e.target.showPicker && e.target.showPicker()} style={{...inputStyle, cursor: 'pointer'}} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Car Type</label>
                                            <input required type="text" value={formData.carType} onChange={e => setFormData({ ...formData, carType: e.target.value })} style={inputStyle} placeholder="e.g. Innova Crysta" />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>Number of Cars</label>
                                            <input required type="number" min="1" value={formData.numberOfCars} onChange={e => setFormData({ ...formData, numberOfCars: Number(e.target.value) })} style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Itinerary Section */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ color: 'white', margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} color="var(--primary)" /> Day-wise Itinerary</h3>
                                        <button type="button" onClick={addItineraryDay} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}><Plus size={14} /> Add Day</button>
                                    </div>
                                    
                                    {formData.itinerary.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Click "Add Day" to start building the itinerary.</div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {formData.itinerary.map((day, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <div style={{ width: '30px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>D{idx + 1}</div>
                                                <input type="date" value={day.date ? new Date(day.date).toISOString().split('T')[0] : ''} onChange={e => handleItineraryChange(idx, 'date', e.target.value)} onClick={e => e.target.showPicker && e.target.showPicker()} style={{ ...inputStyle, width: '160px', cursor: 'pointer' }} />
                                                <input required type="text" placeholder="Description (e.g. Udaipur Sightseeing)" value={day.description} onChange={e => handleItineraryChange(idx, 'description', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                                <div style={{ position: 'relative', width: '140px' }}>
                                                    <IndianRupee size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                                    <input required type="number" min="0" placeholder="Amount" value={day.amount} onChange={e => handleItineraryChange(idx, 'amount', e.target.value)} style={{ ...inputStyle, paddingLeft: '30px' }} />
                                                </div>
                                                <button type="button" onClick={() => removeItineraryDay(idx)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Total Summary */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '20px', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '5px' }}>Grand Total</div>
                                        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '32px', fontWeight: '900', letterSpacing: '-1px' }}>₹{formData.totalAmount.toLocaleString('en-IN')}</h2>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '12px 30px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '15px', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)' }}>{editingLead ? 'Update Lead' : 'Save & Generate Lead'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Convert Modal */}
            <AnimatePresence>
                {showConvertModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div 
                            initial={{ y: 50, opacity: 0, scale: 0.9 }} 
                            animate={{ y: 0, opacity: 1, scale: 1 }} 
                            exit={{ y: 20, opacity: 0, scale: 0.9 }}
                            className="glass-card" 
                            style={{ width: '100%', maxWidth: '450px', background: '#0f172a', border: '1px solid rgba(34,197,94,0.3)', padding: '30px' }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                                    <CheckCircle size={30} />
                                </div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '900' }}>Confirm Booking</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>
                                    This will create <strong>{convertingLead?.itinerary?.length || 0}</strong> daily DRS schedules for <strong>{convertingLead?.numberOfCars}</strong> car(s).
                                </p>
                            </div>
                            <form onSubmit={handleConvert}>
                                <div style={{ marginBottom: '25px' }}>
                                    <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>Advance Payment Received (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80' }} />
                                        <input required type="number" min="0" value={advancePayment} onChange={e => setAdvancePayment(e.target.value)} style={{ ...inputStyle, paddingLeft: '45px', fontSize: '18px', fontWeight: 'bold', borderColor: 'rgba(34,197,94,0.3)' }} placeholder="e.g. 5000" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button type="button" onClick={() => setShowConvertModal(false)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 15px rgba(34,197,94,0.3)' }}>Convert to Booking</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
