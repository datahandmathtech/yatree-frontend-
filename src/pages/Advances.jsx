import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Search, Plus, X, CheckCircle, AlertCircle, IndianRupee, Calendar, User, FileText, Filter, ChevronLeft, ChevronRight, Building2, UserCheck, CreditCard } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import SmartGuestBookingSelector from '../components/common/SmartGuestBookingSelector';
import BankSelector from '../components/common/BankSelector';
import {
    todayIST,
    toISTDateString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';

const Advances = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [advances, setAdvances] = useState([]);
    const [salarySummary, setSalarySummary] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear());
    // Add Advance Modal State
    const [showModal, setShowModal] = useState(false);
    const getLocalYYYYMMDD = () => todayIST();

    const [formData, setFormData] = useState({
        driverId: '',
        amount: '',
        date: '',
        remark: '',
        givenBy: 'Office',
        paidBy: 'Company',
        paymentMode: 'Cash',
        bankAccountId: '',
        bookingId: '',
        bookingRef: '',
        guestName: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .advances-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-top: 20px;
                gap: 20px;
            }
            .advances-controls {
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            @media (max-width: 1024px) {
                .advances-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .advances-controls {
                    width: 100%;
                }
            }
            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .hide-mobile { display: none !important; }
                .show-mobile { display: block !important; }
            }
            @media (max-width: 480px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                .modal-content-wrapper {
                    padding: 20px !important;
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    // ── NAVIGATION RESET ──
    useEffect(() => {
        const resetAll = () => {
            setSearchTerm('');
            setFilterStatus('All');
            const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // Use IST
            setSelectedMonth(now.getUTCMonth() + 1);
            setSelectedYear(now.getUTCFullYear());
            setShowModal(false);
            setEditingId(null);
            setMessage({ type: '', text: '' });
            setFormData({
                driverId: '',
                amount: '',
                date: '',
                remark: '',
                givenBy: 'Office'
            });
        };

        resetAll();

        // Cleanup function: Clear state when the component is about to unmount or path changes
        return () => resetAll();
    }, [location.pathname, location.key]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver');
        const monthParam = params.get('month');
        const yearParam = params.get('year');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setSelectedMonth(Number(monthParam));
        if (yearParam) setSelectedYear(Number(yearParam));
    }, [location.search]);

    useEffect(() => {
        if (selectedCompany) {
            fetchData();
        }
    }, [selectedCompany, selectedMonth, selectedYear]);

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            // Fetch drivers, advances, summary, bank accounts, and active bookings
            const [driversRes, advancesRes, salaryRes, banksRes, bookingsRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&driverType=All&isFreelancer=false&month=${selectedMonth}&year=${selectedYear}`),
                axios.get(`/api/admin/advances/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}&isFreelancer=false`),
                axios.get(`/api/admin/salary-summary/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`),
                axios.get(`/api/banks/company/${selectedCompany._id}`).catch(() => axios.get(`/api/admin/bank-accounts/${selectedCompany._id}`)).catch(() => ({ data: [] })),
                axios.get(`/api/bookings/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] }))
            ]);

            setDrivers(driversRes.data.drivers || []);
            setAdvances(Array.isArray(advancesRes.data) ? advancesRes.data : []);
            const summary = Array.isArray(salaryRes.data) ? salaryRes.data : [];
            setSalarySummary(summary.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setBankAccounts(Array.isArray(banksRes.data) ? banksRes.data : (banksRes.data?.bankAccounts || []));
            setBookings(bookingsRes.data?.bookings || bookingsRes.data || []);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAdvance = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const payload = {
                ...formData,
                companyId: selectedCompany._id,
                paidBy: formData.givenBy === 'Guest' ? 'Guest' : 'Company'
            };

            if (editingId) {
                await axios.put(`/api/admin/advances/${editingId}`, payload, { headers: { Authorization: `Bearer ${userInfo.token}` } });
                setMessage({ type: 'success', text: 'Advance updated successfully!' });
            } else {
                await axios.post('/api/admin/advances', payload, { headers: { Authorization: `Bearer ${userInfo.token}` } });
                setMessage({ type: 'success', text: 'Advance recorded successfully!' });
            }

            setTimeout(() => {
                setShowModal(false);
                setEditingId(null);
                setFormData({
                    driverId: '',
                    amount: '',
                    date: '',
                    remark: '',
                    givenBy: 'Office',
                    paidBy: 'Company',
                    paymentMode: 'Cash',
                    bankAccountId: '',
                    bookingId: '',
                    bookingRef: '',
                    guestName: ''
                });
                setMessage({ type: '', text: '' });
                fetchData();
            }, 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save advance' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (adv) => {
        setEditingId(adv._id);
        const isGuest = adv.givenBy === 'Guest' || adv.paidBy === 'Guest' || adv.advanceType === 'Guest';
        setFormData({
            driverId: adv.driver?._id || adv.driver,
            amount: adv.amount || '',
            date: toISTDateString(adv.date),
            remark: adv.remark || '',
            givenBy: isGuest ? 'Guest' : 'Office',
            paidBy: isGuest ? 'Guest' : 'Company',
            paymentMode: adv.paymentMode || (isGuest ? 'Cash by Guest' : (adv.bankAccount ? 'Bank Transfer' : 'Cash')),
            bankAccountId: adv.bankAccount?._id || adv.bankAccount || '',
            bookingId: adv.bookingId || '',
            bookingRef: adv.booking?._id || adv.booking || '',
            guestName: adv.guestName || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this advance record?')) return;

        try {
            await axios.delete(`/api/admin/advances/${id}`);
            fetchData();
            // Show toast or message if you have a toast component
        } catch (err) {
            console.error('Failed to delete advance:', err);
            alert('Failed to delete advance record');
        }
    };

    const filtered = advances.filter(a => {
        const matchesSearch = (a.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.remark?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const totalAdvanceAmount = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const recoveredAmount = advances.reduce((sum, a) => sum + (a.recoveredAmount || 0), 0);
    const pendingAmount = totalAdvanceAmount - recoveredAmount;

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    return (
        <div key={location.key} className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title="Driver Advances" description="Manage and track advances given to drivers and their recovery status." />

            <header className="advances-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: 'clamp(40px,10vw,50px)',
                        height: 'clamp(40px,10vw,50px)',
                        background: 'linear-gradient(135deg, white, #f8fafc)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        flexShrink: 0
                    }}>
                        <IndianRupee size={28} color="var(--primary)" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}></div>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Financial Oversight</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: 'clamp(24px,5vw,32px)', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                            Cash <span className="theme-gradient-text">Advances</span>
                        </h1>
                    </div>
                </div>

                <div className="advances-controls">
                    <div className="glass-card" style={{ padding: '12px 20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>Total Issued</span>
                        <span style={{ color: 'white', fontSize: '18px', fontWeight: '900' }}>₹{totalAdvanceAmount.toLocaleString()}</span>
                    </div>
                    <div className="glass-card" style={{ padding: '12px 20px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)', display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#8b5cf6', textTransform: 'uppercase' }}>Recovered</span>
                        <span style={{ color: 'white', fontSize: '18px', fontWeight: '900' }}>₹{recoveredAmount.toLocaleString()}</span>
                    </div>
                    <div className="glass-card" style={{ padding: '12px 20px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.1)', display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>Current Balance</span>
                        <span style={{ color: 'white', fontSize: '18px', fontWeight: '900' }}>₹{pendingAmount.toLocaleString()}</span>
                    </div>
                </div>
            </header>

            <div className="advances-header" style={{ gap: '15px', marginBottom: '30px' }}>
                <div style={{ position: 'relative', flex: '1', display: 'flex', gap: '15px', minWidth: '200px' }}>
                    <div style={{ position: 'relative', flex: '1' }}>
                        <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '50px', marginBottom: 0 }}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-field hide-mobile"
                        style={{ width: '150px', marginBottom: 0, height: '54px' }}
                    >
                        <option value="All" style={{ background: '#0f172a' }}>All Status</option>
                        <option value="Pending" style={{ background: '#0f172a' }}>Pending</option>
                        <option value="Settled" style={{ background: '#0f172a' }}>Settled</option>
                    </select>
                </div>

                <div className="advances-controls" style={{ width: 'auto', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => shiftMonth(-1)}
                            style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="input-field"
                                style={{ height: '38px', fontSize: '12px', padding: '0 8px', width: '80px', background: 'transparent', border: 'none', marginBottom: 0 }}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="input-field"
                                style={{ height: '38px', fontSize: '12px', padding: '0 8px', width: '80px', background: 'transparent', border: 'none', marginBottom: 0 }}
                            >
                                {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => shiftMonth(1)}
                            style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({
                                driverId: '',
                                amount: '',
                                date: todayIST(),
                                remark: '',
                                givenBy: 'Office',
                                paidBy: 'Company',
                                bankAccountId: bankAccounts[0]?._id || '',
                                bookingId: '',
                                bookingRef: '',
                                guestName: ''
                            });
                            setShowModal(true);
                        }}
                        className="btn-primary"
                        style={{ height: '50px', padding: '0 20px', borderRadius: '15px', fontWeight: '1000' }}
                    >
                        <Plus size={20} /> <span className="hide-mobile">RECORD ADVANCE</span><span className="show-mobile">ADD</span>
                    </button>
                </div>
            </div>

            {/* Personnel Salary Ledger Section */}
            <section style={{ marginBottom: '60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                    <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Personnel <span style={{ color: 'var(--primary)' }}>Salary Ledger</span></h2>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '20px', fontWeight: '800', marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '1px' }}>Real-time Duty Calculation</span>
                </div>

                <div className="stats-grid">
                    {salarySummary.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', padding: '60px', background: 'rgba(30, 41, 59, 0.2)', borderRadius: '30px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.05)' }}>
                            <IndianRupee size={40} style={{ margin: '0 auto 15px', opacity: 0.2, color: 'var(--text-muted)' }} />
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: '600' }}>No salary data available yet. Attendance records are required for calculation.</p>
                        </div>
                    ) : salarySummary.map((s, idx) => (
                        <motion.div
                            key={s.driverId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-card"
                            style={{
                                padding: '25px',
                                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '16px' }}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '800', margin: 0 }}>{s.name}</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px', fontWeight: '600' }}>{s.workingDays} Duty Days</p>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '4px 10px', borderRadius: '20px',
                                    background: s.netPayable >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                    color: s.netPayable >= 0 ? '#10b981' : '#f43f5e',
                                    fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', border: `1px solid ${s.netPayable >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                                    letterSpacing: '0.5px'
                                }}>
                                    {s.netPayable >= 0 ? 'Payable' : 'Extra'}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase' }}>Earned</span>
                                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '900', marginTop: '2px' }}>₹{s.totalEarned.toLocaleString()}</div>
                                </div>
                                <div style={{ background: 'rgba(244, 63, 94, 0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                    <span style={{ fontSize: '8px', color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase' }}>Advance</span>
                                    <div style={{ color: '#f43f5e', fontSize: '14px', fontWeight: '900', marginTop: '2px' }}>₹{(s.totalAdvances || 0).toLocaleString()}</div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: 'auto', padding: '15px', borderRadius: '14px',
                                background: s.netPayable >= 0 ? 'rgba(14, 165, 233, 0.1)' : 'rgba(244, 63, 94, 0.12)',
                                border: `1px solid ${s.netPayable >= 0 ? 'rgba(14, 165, 233, 0.2)' : 'rgba(244, 63, 94, 0.25)'}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ color: 'white', fontWeight: '800', fontSize: '12px' }}>FINAL</span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'white', fontSize: '20px', fontWeight: '1000' }}>₹{Math.abs(s.netPayable).toLocaleString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', marginTop: '40px' }}>
                <div style={{ width: '4px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
                <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Advance Payment Records</h2>
            </div>

            <div className="table-responsive-wrapper hide-mobile">
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 10px', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Source</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Recovered</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Remarks</th>
                            <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '80px 0' }}>
                                <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>LOADING TRANSACTIONS...</p>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '120px 0', background: 'rgba(30, 41, 59, 0.2)', borderRadius: '30px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                                <IndianRupee size={60} style={{ margin: '0 auto 20px', opacity: 0.1, color: 'var(--primary)' }} />
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>No Advance Records</h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Record a new advance to start tracking.</p>
                            </td></tr>
                        ) : filtered.map((advance, idx) => (
                            <motion.tr
                                key={advance._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="glass-card-hover-effect"
                                style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}
                            >
                                <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                            {advance.driver?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ color: 'white', fontWeight: '700' }}>{advance.driver?.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{advance.driver?.mobile}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                                        {formatDateIST(advance.date)}
                                    </div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ 
                                        color: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? '#fbbf24' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? '#10b981' : '#60a5fa'), 
                                        fontSize: '11px', 
                                        fontWeight: '900', 
                                        textTransform: 'uppercase',
                                        background: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? 'rgba(251, 191, 36, 0.12)' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? 'rgba(16, 185, 129, 0.12)' : 'rgba(96, 165, 250, 0.12)'),
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        border: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? '1px solid rgba(251, 191, 36, 0.25)' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(96, 165, 250, 0.25)')
                                    }}>
                                        {advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? (
                                            <>
                                                <UserCheck size={13} />
                                                <span>Guest {advance.guestName ? `(${advance.guestName})` : advance.bookingId ? `(${advance.bookingId})` : ''}</span>
                                            </>
                                        ) : (advance.paymentMode === 'Cash' || !advance.bankAccount ? (
                                            <>
                                                <span>💵</span>
                                                <span>Cash in Hand</span>
                                            </>
                                        ) : (
                                            <>
                                                <Building2 size={13} />
                                                <span>Bank {advance.bankAccount?.bankName ? `(${advance.bankAccount.bankName})` : ''}</span>
                                            </>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ color: 'white', fontWeight: '800' }}>₹ {advance.amount?.toLocaleString()}</div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ color: '#10b981', fontWeight: '700' }}>₹ {advance.recoveredAmount?.toLocaleString() || 0}</div>
                                </td>
                                <td style={{ padding: '20px 25px' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {advance.remark || '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '20px 25px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleEdit(advance)}
                                            style={{
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: '#38bdf8',
                                                border: 'none',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Search size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(advance._id)}
                                            style={{
                                                background: 'rgba(244, 63, 94, 0.1)',
                                                color: '#f43f5e',
                                                border: 'none',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="show-mobile">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                        <p>No advances found.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {filtered.map(advance => (
                            <motion.div
                                key={advance._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                                            {advance.driver?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', color: 'white', fontSize: '16px' }}>{advance.driver?.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateIST(advance.date)}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '16px' }}>₹{advance.amount?.toLocaleString()}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Amount</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Recovered</div>
                                        <div style={{ color: '#10b981', fontWeight: '700', fontSize: '14px' }}>₹{advance.recoveredAmount?.toLocaleString() || 0}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '4px' }}>Source</div>
                                        <div style={{ 
                                            color: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? '#fbbf24' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? '#10b981' : '#60a5fa'), 
                                            fontSize: '10px', 
                                            fontWeight: '900', 
                                            textTransform: 'uppercase',
                                            background: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? 'rgba(251, 191, 36, 0.12)' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? 'rgba(16, 185, 129, 0.12)' : 'rgba(96, 165, 250, 0.12)'),
                                            padding: '3px 8px',
                                            borderRadius: '5px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? '1px solid rgba(251, 191, 36, 0.25)' : (advance.paymentMode === 'Cash' || !advance.bankAccount ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(96, 165, 250, 0.25)')
                                        }}>
                                            {advance.givenBy === 'Guest' || advance.paidBy === 'Guest' ? (
                                                 <>
                                                     <UserCheck size={11} />
                                                     <span>Guest {advance.guestName ? `(${advance.guestName})` : ''}</span>
                                                 </>
                                             ) : (advance.paymentMode === 'Cash' || !advance.bankAccount ? (
                                                 <>
                                                     <span>💵</span>
                                                     <span>Cash in Hand</span>
                                                 </>
                                             ) : (
                                                 <>
                                                     <Building2 size={11} />
                                                     <span>Bank {advance.bankAccount?.bankName ? `(${advance.bankAccount.bankName})` : ''}</span>
                                                 </>
                                             ))}
                                         </div>
                                    </div>
                                </div>

                                {advance.remark && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>
                                        "{advance.remark}"
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={() => handleEdit(advance)}
                                        style={{
                                            background: 'rgba(56, 189, 248, 0.1)',
                                            color: '#38bdf8',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '800'
                                        }}
                                    >
                                        EDIT
                                    </button>
                                    <button
                                        onClick={() => handleDelete(advance._id)}
                                        style={{
                                            background: 'rgba(244, 63, 94, 0.1)',
                                            color: '#f43f5e',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <X size={14} /> DELETE
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Advance Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '540px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', margin: 0, fontWeight: '950', letterSpacing: '-0.5px' }}>{editingId ? 'Edit Record' : 'Log Advance'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>Manage driver financial assistance.</p>
                                </div>
                                <button
                                    onClick={() => { setShowModal(false); setEditingId(null); setFormData({ driverId: '', amount: '', date: '', remark: '', givenBy: 'Office', paidBy: 'Company', bankAccountId: '', bookingId: '', bookingRef: '', guestName: '' }); }}
                                    className="glass-card"
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                ><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSaveAdvance} style={{ display: 'grid', gap: '20px' }}>
                                <div className="input-field-group">
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Select Driver</label>
                                    <select
                                        className="input-field"
                                        required
                                        value={formData.driverId}
                                        onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                        style={{ height: '54px' }}
                                    >
                                        <option value="" style={{ background: '#0f172a', color: 'white' }}>Select a driver...</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id} style={{ background: '#0f172a', color: 'white' }}>{d.name} ({d.mobile})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-grid-2">
                                    <div className="input-field-group">
                                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IndianRupee size={14} /> Amount</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="0"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            style={{ height: '54px' }}
                                        />
                                    </div>
                                    <div className="input-field-group">
                                        <PremiumDateInput
                                            value={formData.date}
                                            onChange={v => setFormData({ ...formData, date: v })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Paid By / Given By Selector */}
                                <div className="input-field-group">
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <CreditCard size={14} /> Paid By / Source
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, givenBy: 'Office', paidBy: 'Company', paymentMode: formData.paymentMode === 'Guest Cash' ? 'Cash' : (formData.paymentMode || 'Cash'), bookingId: '', bookingRef: '', guestName: '' })}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: formData.paidBy === 'Company' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                background: formData.paidBy === 'Company' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: formData.paidBy === 'Company' ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <Building2 size={16} /> 🏢 By Company
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, givenBy: 'Guest', paidBy: 'Guest', paymentMode: 'Guest Cash', bankAccountId: '' })}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: formData.paidBy === 'Guest' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                                background: formData.paidBy === 'Guest' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: formData.paidBy === 'Guest' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <UserCheck size={16} /> 👤 By Guest
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Section for Company (Cash vs Bank Account) */}
                                {formData.paidBy === 'Company' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Payment Account / Method
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, paymentMode: 'Cash', bankAccountId: '' })}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    border: (!formData.bankAccountId && (formData.paymentMode === 'Cash' || !formData.paymentMode)) ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                    background: (!formData.bankAccountId && (formData.paymentMode === 'Cash' || !formData.paymentMode)) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                                    color: (!formData.bankAccountId && (formData.paymentMode === 'Cash' || !formData.paymentMode)) ? '#10b981' : 'rgba(255,255,255,0.6)',
                                                    fontWeight: '800',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                💵 Cash in Hand
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, paymentMode: 'Bank Transfer', bankAccountId: formData.bankAccountId || (bankAccounts[0]?._id || '') })}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    border: (formData.bankAccountId || formData.paymentMode === 'Bank Transfer' || formData.paymentMode === 'UPI') ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                    background: (formData.bankAccountId || formData.paymentMode === 'Bank Transfer' || formData.paymentMode === 'UPI') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                    color: (formData.bankAccountId || formData.paymentMode === 'Bank Transfer' || formData.paymentMode === 'UPI') ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                    fontWeight: '800',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                🏦 Bank Account
                                            </button>
                                        </div>

                                        {/* If Cash is chosen: Live Cash in Hand Balance Impact */}
                                        {(!formData.bankAccountId && (formData.paymentMode === 'Cash' || !formData.paymentMode)) ? (
                                            <div style={{
                                                background: 'rgba(16, 185, 129, 0.08)',
                                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Current Cash in Hand:</span>
                                                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '900' }}>₹{(selectedCompany?.cashBalance || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                {Number(formData.amount) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(16, 185, 129, 0.2)', paddingTop: '6px' }}>
                                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Cash Balance After:</span>
                                                        <span style={{
                                                            fontSize: '14px',
                                                            fontWeight: '950',
                                                            color: ((selectedCompany?.cashBalance || 0) - Number(formData.amount)) < 0 ? '#f43f5e' : '#10b981'
                                                        }}>
                                                            ₹{((selectedCompany?.cashBalance || 0) - Number(formData.amount)).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span>💵</span> Deducts from Cash in Hand & logs in Cash Book
                                                </div>
                                            </div>
                                        ) : (
                                            <BankSelector
                                                bankAccounts={bankAccounts}
                                                value={formData.bankAccountId}
                                                amount={formData.amount}
                                                onChange={(bId) => setFormData({ ...formData, bankAccountId: bId, paymentMode: 'Bank Transfer' })}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Dynamic Section for Guest (Booking selection) */}
                                {formData.paidBy === 'Guest' && (
                                    <SmartGuestBookingSelector
                                        bookings={bookings}
                                        selectedDate={formData.date}
                                        selectedDriverId={formData.driverId}
                                        value={{
                                            bookingRef: formData.bookingRef,
                                            bookingId: formData.bookingId,
                                            guestName: formData.guestName
                                        }}
                                        amount={formData.amount}
                                        onChange={({ bookingRef, bookingId, guestName }) => setFormData({
                                            ...formData,
                                            bookingRef,
                                            bookingId,
                                            guestName
                                        })}
                                    />
                                )}

                                <div className="input-field-group">
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} /> Remark / Purpose</label>
                                    <textarea
                                        className="input-field"
                                        placeholder="Ex: Urgent family need, Fuel advance, Guest cash advance..."
                                        rows="2"
                                        value={formData.remark}
                                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                        style={{ resize: 'none', paddingTop: '15px' }}
                                    />
                                </div>

                                {message.text && (
                                    <div style={{
                                        padding: '15px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px',
                                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                        color: message.type === 'success' ? '#10b981' : '#f43f5e',
                                        border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                                    }}>
                                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary"
                                    style={{ height: '56px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}
                                >
                                    {submitting ? 'RECORDING...' : (editingId ? 'UPDATE ADVANCE' : 'CONFIRM ADVANCE')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Advances;

