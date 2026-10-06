import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    ShieldAlert, Wallet, Droplets, Car, Search, ChevronRight, ChevronLeft,
    X, Plus, CreditCard, AlertCircle, CheckCircle2,
    Calendar, Filter, TrendingUp, Zap, Layers, Trash2, Edit3, Eye, FileText, ExternalLink, ArrowRight, Image,
    History, Activity, RefreshCw, Edit2, Shield, Activity as AutoIcon, Building2, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST, nowIST, toISTDateString } from '../utils/istUtils';
import ImageUploader from '../components/common/ImageUploader';
import SearchableSelect from '../components/common/SearchableSelect';
import SmartGuestBookingSelector from '../components/common/SmartGuestBookingSelector';
import BankSelector from '../components/common/BankSelector';

const CarUtility = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const location = useLocation();
    
    // Core state
    const [vehicles, setVehicles] = useState([]);
    const [allBorderEntries, setAllBorderEntries] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View Management: 'history' (Default chronological view), 'fleet' (Master list), 'detail' (Vehicle detail)
    const [viewMode, setViewMode] = useState('history'); 
    const [detailVehicleId, setDetailVehicleId] = useState(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    const [activeUtility, setActiveUtility] = useState('fastag');
    
    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('All');
    const [filterUtility, setFilterUtility] = useState('All');
    const [lowBalanceOnly, setLowBalanceOnly] = useState(false);
    
    // Notifications & Loading
    const [message, setMessage] = useState({ type: '', text: '' });
    const [submitting, setSubmitting] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    // Styling Injector
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary: ${theme.primary || '#fbbf24'};
                --primary-glow: rgba(251, 191, 36, 0.15);
                --glass-bg: rgba(15, 23, 42, 0.4);
                --glass-border: rgba(255, 255, 255, 0.05);
            }
            .premium-panel-utility {
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: 28px;
                box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
            }
            .utility-row {
                background: rgba(255, 255, 255, 0.01);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            .utility-row:hover {
                background: rgba(255, 255, 255, 0.03);
                transform: translateY(-2px);
            }
            .utility-card {
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid var(--glass-border);
                border-radius: 24px;
                padding: 24px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
            }
            .utility-card:hover {
                background: rgba(15, 23, 42, 0.7);
                transform: translateY(-5px);
                border-color: var(--primary);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
            }
            .utility-select-glow {
                outline: none;
                transition: all 0.3s ease;
            }
            .utility-select-glow:focus {
                border-color: var(--primary) !important;
                box-shadow: 0 0 10px var(--primary-glow) !important;
            }
            .premium-input-container {
                background: rgba(15, 23, 42, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 16px;
                padding: 10px 16px;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .premium-input-container:focus-within {
                border-color: var(--primary);
                background: rgba(15, 23, 42, 0.6);
                box-shadow: 0 0 0 3px var(--primary-glow);
            }
            .premium-input-container label {
                color: rgba(255, 255, 255, 0.4);
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .premium-input-container input, .premium-input-container select, .premium-input-container textarea {
                background: transparent;
                border: none;
                color: #fff;
                font-size: 15px;
                font-weight: 600;
                outline: none;
                width: 100%;
                padding: 0;
            }
            .premium-input-container input::placeholder, .premium-input-container textarea::placeholder {
                color: rgba(255, 255, 255, 0.2);
            }
            .premium-input-container input[type="date"] {
                color-scheme: dark;
            }
            .premium-input-container input[type="date"]::-webkit-calendar-picker-indicator {
                cursor: pointer;
                opacity: 0;
            }
            .premium-input-container input[type="number"]::-webkit-inner-spin-button, 
            .premium-input-container input[type="number"]::-webkit-outer-spin-button { 
                -webkit-appearance: none; 
                margin: 0; 
            }
            .premium-input-container input[type="number"] {
                -moz-appearance: textfield;
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, [theme]);

    const getInitialFY = () => {
        const istNow = nowIST();
        const m = istNow.getUTCMonth() + 1; // 1-12
        const y = istNow.getUTCFullYear();
        return (m >= 1 && m <= 3) ? y - 1 : y;
    };

    const [selectedMonth, setSelectedMonth] = useState(nowIST().getUTCMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(getInitialFY());

    useEffect(() => {
        if (selectedCompany) fetchAllData();
    }, [selectedCompany]);

    // AI Query / URL Navigation synchronizer
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('vehicle');
        const utilityParam = params.get('utility') || params.get('type');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const vehicleIdParam = params.get('vehicleId');

        if (searchParam) setSearchTerm(searchParam);
        if (utilityParam) {
            setFilterUtility(utilityParam);
            setActiveUtility(utilityParam);
        }
        if (monthParam) setSelectedMonth(parseInt(monthParam));
        if (yearParam) setSelectedYear(parseInt(yearParam));
        if (vehicleIdParam) {
            setSelectedVehicleId(vehicleIdParam);
        }
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setDetailVehicleId(null);
        setViewMode('history');
        const istNow = nowIST();
        setSelectedMonth(istNow.getUTCMonth() + 1);
        setSelectedYear(getInitialFY());
    }, [location.pathname, location.key]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = { Authorization: `Bearer ${token}` };
            const [vehRes, borderRes, dvrRes, banksRes, bookingsRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, { headers }),
                axios.get(`/api/admin/border-tax/${selectedCompany._id}`, { headers }),
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&driverType=All`, { headers }),
                axios.get(`/api/banks/company/${selectedCompany._id}`, { headers }).catch(() => axios.get(`/api/admin/bank-accounts/${selectedCompany._id}`, { headers })).catch(() => ({ data: [] })),
                axios.get(`/api/bookings/${selectedCompany._id}?usePagination=false`, { headers }).catch(() => ({ data: [] }))
            ]);

            const targetCompanyId = String(selectedCompany._id);
            const filteredVehs = (vehRes.data.vehicles || []).filter(v => {
                const vCompId = String(v.company?._id || v.company || '');
                return vCompId === targetCompanyId && v.isOutsideCar !== true && typeof v.carNumber === 'string' && !v.carNumber.includes('#');
            });

            setVehicles(filteredVehs);
            setAllBorderEntries(borderRes.data || []);
            setDrivers(dvrRes.data.drivers || []);
            setBankAccounts(Array.isArray(banksRes.data) ? banksRes.data : (banksRes.data?.bankAccounts || []));
            setBookings(bookingsRes.data?.bookings || bookingsRes.data || []);
        } catch (err) { 
            console.error(err); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRecharge = async (vId, data) => {
        const targetId = vId || selectedVehicleId;
        if (!targetId || targetId === 'new') return alert('Please select a vehicle');
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany._id
            };

            await axios.post(`/api/admin/vehicles/${targetId}/fastag-recharge`, data, { headers });
            setMessage({ type: 'success', text: 'Fastag Recharge Logged Successfully!' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
                if (selectedVehicleId === 'new') setSelectedVehicleId(null);
            }, 1500);
            return true;
        } catch (err) { 
            console.error('Recharge error:', err.response?.data || err.message);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error logging recharge' }); 
            return false;
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleAddTax = async (vId, formData) => {
        const targetId = vId || selectedVehicleId;
        if (!targetId || targetId === 'new') return alert('Please select a vehicle');
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            if (formData instanceof FormData && !formData.get('vehicleId')) {
                formData.append('vehicleId', targetId);
            }
            await axios.post('/api/admin/border-tax', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    companyid: selectedCompany._id
                }
            });
            setMessage({ type: 'success', text: 'Border Tax Recorded Successfully!' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
                if (selectedVehicleId === 'new') setSelectedVehicleId(null);
            }, 1500);
            return true;
        } catch (err) { 
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error recording tax' }); 
            return false;
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleDeleteRecord = async (endpoint, id) => {
        if (!window.confirm('Delete entry?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany._id
            };
            await axios.delete(`/api/admin/${endpoint}/${id}`, { headers });
            fetchAllData();
        } catch (err) { 
            alert('Fail'); 
        }
    };

    const handleUpdateRecord = async (endpoint, id, data) => {
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany?._id
            };

            await axios.put(`/api/admin/${endpoint}/${id}`, data, { headers });
            setMessage({ type: 'success', text: 'Entry Updated Successfully' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
            }, 1500);
            return true;
        } catch (err) {
            console.error('Update failed:', err.response?.data || err.message);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update Failed' });
            return false;
        } finally { 
            setSubmitting(false); 
        }
    };

    // Calculate vehicle activity within selected month & financial year cycle
    const getVehicleActivity = React.useCallback((vId) => {
        const v = vehicles.find(v => v._id === vId);
        const fHist = v ? (v.fastagHistory || []) : [];

        const getISTMonthYear = (dateInput) => {
            if (!dateInput) return { m: -1, y: -1 };
            try {
                const d = new Date(dateInput);
                if (isNaN(d.getTime())) return { m: -1, y: -1 };
                
                const formatter = new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
                });
                const parts = formatter.formatToParts(d);
                const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
                const year = parseInt(parts.find(p => p.type === 'year').value);
                return { m: month, y: year };
            } catch (e) {
                console.error("Date parsing error:", e);
                return { m: -1, y: -1 };
            }
        };

        const fFilt = fHist.filter(h => {
            const { m, y } = getISTMonthYear(h.date);
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            return (m + 1) === selectedMonth && y === calendarYear;
        });

        const bFilt = allBorderEntries.filter(e => {
            const { m, y } = getISTMonthYear(e.date);
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            return (e.vehicle?._id === vId || e.vehicle === vId) && (m + 1) === selectedMonth && y === calendarYear;
        });

        return {
            fastag: fFilt.reduce((s, h) => s + (Number(h.amount) || 0), 0),
            border: bFilt.reduce((s, e) => s + (Number(e.amount) || 0), 0),
            total: fFilt.reduce((s, h) => s + (Number(h.amount) || 0), 0) + 
                   bFilt.reduce((s, e) => s + (Number(e.amount) || 0), 0),
            items: { fastag: fFilt, border: bFilt }
        };
    }, [vehicles, allBorderEntries, selectedMonth, selectedYear]);

    // Construct unified chronological chronological logs for ALL vehicles
    const unifiedUtilityLogs = useMemo(() => {
        const logs = [];
        vehicles.forEach(v => {
            const act = getVehicleActivity(v._id);
            act.items.fastag.forEach(x => logs.push({ ...x, type: 'fastag', typeLabel: 'Fastag', car: v.carNumber, carModel: v.model, color: '#38bdf8', icon: CreditCard, vehicleId: v._id }));
            act.items.border.forEach(x => logs.push({ ...x, type: 'border', typeLabel: 'Border Tax', car: v.carNumber, carModel: v.model, color: '#fbbf24', icon: Shield, vehicleId: v._id }));
        });
        // Sort newest first
        return logs.sort((a, b) => new Date(b.date || b.billDate) - new Date(a.date || a.billDate));
    }, [vehicles, getVehicleActivity]);

    // Period Totals (respects Vehicle Filter)
    const globalStats = useMemo(() => {
        let f = 0, b = 0;
        
        const vehiclesToProcess = filterVehicle === 'All' 
            ? vehicles 
            : vehicles.filter(v => v._id === filterVehicle);

        vehiclesToProcess.forEach(v => {
            const act = getVehicleActivity(v._id);
            f += act.fastag; b += act.border;
        });
        return { 
            f, b, 
            t: f + b,
            lowBalanceCount: vehicles.filter(v => (v.fastagBalance || 0) < 500).length
        };
    }, [vehicles, getVehicleActivity, filterVehicle]);

    // Active Filters on the combined logs
    const filteredUnifiedLogs = useMemo(() => {
        return unifiedUtilityLogs
            .filter(log => filterUtility === 'All' || log.type === filterUtility)
            .filter(log => filterVehicle === 'All' || log.vehicleId === filterVehicle)
            .filter(log => {
                if (!searchTerm) return true;
                const match = (log.car + ' ' + (log.carModel || '') + ' ' + (log.remarks || '') + ' ' + (log.borderName || '') + ' ' + (log.category || '')).toLowerCase();
                return match.includes(searchTerm.toLowerCase());
            });
    }, [unifiedUtilityLogs, filterUtility, filterVehicle, searchTerm]);

    const filteredVehicles = useMemo(() => {
        return vehicles
            .filter(v => (v.carNumber + (v.model || '')).toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(v => lowBalanceOnly ? (v.fastagBalance || 0) < 500 : true);
    }, [vehicles, searchTerm, lowBalanceOnly]);

    const getImageUrl = (p) => {
        if (!p) return ''; 
        if (p.startsWith('http')) return p;
        return `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/${p.replace(/^\/+/, '')}`;
    };

    const detailVehicle = useMemo(() => vehicles.find(v => v._id === detailVehicleId), [vehicles, detailVehicleId]);

    return (
        <div key={location.key} className="container-fluid" style={{ paddingBottom: '40px', color: '#fff' }}>
            <SEO title="Car Utility" description="Fleet Accounts Hub" />

            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
                <AnimatePresence>
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
                                zIndex: 10000, padding: '15px 30px', borderRadius: '18px',
                                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)',
                                color: '#fff', fontWeight: '900', fontSize: '14px',
                                backdropFilter: 'blur(10px)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                                display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none'
                            }}
                        >
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            {message.text.toUpperCase()}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Premium Redesigned Header */}
                <header className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0 30px', gap: '20px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '35px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '52px', height: '52px', background: `linear-gradient(135deg, ${theme.primary || '#fbbf24'}, ${theme.secondary || theme.primary || '#f59e0b'})`, borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: `0 10px 25px ${theme.primary || '#fbbf24'}25`, flexShrink: 0 }}>
                            <Wallet size={24} color="black" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary || '#fbbf24', boxShadow: `0 0 8px ${theme.primary || '#fbbf24'}` }}></div>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Fleet Economics</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '950', margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>
                                Car <span className="theme-gradient-text">Utility</span>
                            </h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Period selector group */}
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', padding: '4px', border: '1px solid rgba(255,255,255,0.08)', height: '44px' }}>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="utility-select-glow"
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '13px', padding: '0 10px', height: '100%', outline: 'none', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                                    </option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px' }}>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>FY</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: theme.primary || '#fbbf24', fontWeight: '900', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                                >
                                    {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => (
                                        <option key={y} value={y} style={{ background: '#0f172a' }}>{y}-{String(y + 1).slice(-2)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        {/* Quick Add Button */}
                        <button 
                            onClick={() => { setSelectedVehicleId('new'); setActiveUtility('fastag'); }} 
                            className="btn-primary glass-card-hover-effect" 
                            style={{ 
                                padding: '0 20px', 
                                height: '44px',
                                borderRadius: '12px', 
                                fontWeight: '900', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                border: 'none',
                                background: `linear-gradient(135deg, ${theme.primary || '#fbbf24'} 0%, ${theme.secondary || theme.primary || '#f59e0b'} 100%)`,
                                color: 'black',
                                cursor: 'pointer',
                                boxShadow: `0 8px 15px ${(theme.primary || '#fbbf24')}25`
                            }}
                        >
                            <Plus size={18} /> <span>QUICK ADD</span>
                        </button>
                    </div>
                </header>

                {/* Big Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                    <SummaryStat label="Fastag Paid" val={globalStats.f} col="#38bdf8" icon={CreditCard} desc="Total Highway Tolls" />
                    <SummaryStat label="Border Tax" val={globalStats.b} col="#fbbf24" icon={Shield} desc="State Entry Permits" />
                    <SummaryStat label="Month Total" val={globalStats.t} col="#a855f7" icon={TrendingUp} isDark desc="Total Utility Budget" />
                </div>

                {/* Dynamic Screen rendering */}
                <AnimatePresence mode="wait">
                    {viewMode === 'history' && (
                        <motion.div key="history-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
                            
                            {/* Filters row for combined logs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                                {/* Search bar */}
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search remarks, borders, categories..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        className="utility-select-glow"
                                        style={{ width: '100%', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '14px', height: '48px', paddingLeft: '45px', fontSize: '14px' }} 
                                    />
                                </div>
                                
                                {/* Utility selector */}
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', height: '48px', padding: '0 15px', gap: '10px' }}>
                                    <Filter size={14} style={{ color: '#94a3b8' }} />
                                    <select
                                        value={filterUtility}
                                        onChange={e => setFilterUtility(e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="All" style={{ background: '#0f172a' }}>All Utility Types</option>
                                        <option value="fastag" style={{ background: '#0f172a' }}>Fastag tolls {filterVehicle !== 'All' ? `(${unifiedUtilityLogs.filter(l => l.type === 'fastag' && l.vehicleId === filterVehicle).length})` : ''}</option>
                                        <option value="border" style={{ background: '#0f172a' }}>Border tax permits {filterVehicle !== 'All' ? `(${unifiedUtilityLogs.filter(l => l.type === 'border' && l.vehicleId === filterVehicle).length})` : ''}</option>
                                    </select>
                                </div>

                                {/* Vehicle Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', height: '48px', padding: '0 15px', gap: '10px' }}>
                                    <Car size={14} style={{ color: '#94a3b8' }} />
                                    <select
                                        value={filterVehicle}
                                        onChange={e => setFilterVehicle(e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="All" style={{ background: '#0f172a' }}>All Vehicles</option>
                                        {vehicles.map(v => {
                                            const count = unifiedUtilityLogs.filter(l => l.vehicleId === v._id).length;
                                            return (
                                                <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>
                                                    {v.carNumber} {count > 0 ? `(${count})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Combined logs table */}
                            <div className="premium-panel-utility" style={{ overflow: 'hidden', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '28px' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Utility Type</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Details / Remarks</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Mode</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '100px', textAlign: 'center' }}>
                                                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                                                    </td>
                                                </tr>
                                            ) : filteredUnifiedLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '80px', textAlign: 'center' }}>
                                                        <div style={{ opacity: 0.2, marginBottom: '15px' }}><History size={36} style={{ margin: '0 auto' }} /></div>
                                                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>No utility logs recorded in this period matching filters.</span>
                                                    </td>
                                                </tr>
                                            ) : filteredUnifiedLogs.map((log, idx) => (
                                                <tr key={log._id + idx} className="utility-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '18px 25px', fontSize: '13px', fontWeight: '600' }}>
                                                        {formatDateIST(log.date || log.billDate)}
                                                    </td>
                                                    <td style={{ padding: '18px 25px' }}>
                                                        <div style={{ fontWeight: '800', fontSize: '15px' }}>{log.car}</div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>{log.carModel || 'Standard'}</div>
                                                    </td>
                                                    <td style={{ padding: '18px 25px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '850', color: log.color, background: `${log.color}15`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>
                                                            <log.icon size={12} /> {log.typeLabel}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '18px 25px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                                                        {log.remarks ? <div style={{ color: 'white', marginBottom: '3px' }}>{log.remarks}</div> : null}
                                                        {log.borderName ? <div style={{ color: '#fbbf24', fontSize: '11px', fontWeight: '800' }}>{log.borderName}</div> : null}
                                                        {log.category ? <div style={{ color: '#10b981', fontSize: '11px', fontWeight: '800' }}>{log.category}</div> : null}
                                                        {(!log.remarks && !log.borderName && !log.category) ? '-' : ''}
                                                    </td>
                                                    <td style={{ padding: '18px 25px', fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>
                                                        {log.paymentMode || 'Cash'}
                                                    </td>
                                                    <td style={{ padding: '18px 25px', textAlign: 'right', fontSize: '15px', fontWeight: '900', color: '#10b981' }}>
                                                        ₹{Number(log.amount).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            {(log.receiptPhoto || log.billPhoto) && (
                                                                <button onClick={() => setViewingImage(getImageUrl(log.receiptPhoto || log.billPhoto))} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Invoice">
                                                                    <Image size={14} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => { 
                                                                    setSelectedVehicleId(log.vehicleId); 
                                                                    setActiveUtility(log.type); 
                                                                    setTimeout(() => {
                                                                        // Force editing state after modal opens
                                                                        const event = new CustomEvent('edit-utility-item', { detail: log });
                                                                        window.dispatchEvent(event);
                                                                    }, 100);
                                                                }} 
                                                                style={{ background: 'rgba(251, 191, 36, 0.08)', color: '#fbbf24', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteRecord(log.type === 'fastag' ? `vehicles/${log.vehicleId}/fastag-recharge` : 'border-tax', log._id)} 
                                                                style={{ background: 'rgba(244, 63, 94, 0.08)', color: '#f43f5e', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'fleet' && (
                        <motion.div key="fleet-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
                            
                            {/* Search bar & balance filter */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search vehicle number..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        className="utility-select-glow"
                                        style={{ width: '100%', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', borderRadius: '14px', height: '48px', paddingLeft: '45px', fontSize: '14px' }} 
                                    />
                                </div>
                                <button 
                                    onClick={() => setLowBalanceOnly(prev => !prev)}
                                    style={{
                                        height: '48px', padding: '0 20px', borderRadius: '14px',
                                        background: lowBalanceOnly ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: lowBalanceOnly ? '#f43f5e' : 'rgba(255,255,255,0.5)',
                                        border: `1px solid ${lowBalanceOnly ? '#f43f5e' : 'rgba(255,255,255,0.08)'}`,
                                        fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s',
                                        display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase'
                                    }}
                                >
                                    <ShieldAlert size={14} /> Low Balance Fastag ({globalStats.lowBalanceCount})
                                </button>
                            </div>

                            {/* Fleet Overview Grid */}
                            <div className="premium-panel-utility" style={{ overflow: 'hidden', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '28px' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Fastag Balance</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Fastag (Month)</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Border (Month)</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total (Month)</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                                            ) : filteredVehicles.map(v => {
                                                const act = getVehicleActivity(v._id);
                                                const hasLowBalance = (v.fastagBalance || 0) < 500;
                                                return (
                                                    <tr key={v._id}
                                                        onClick={() => { setDetailVehicleId(v._id); setViewMode('detail'); setActiveUtility('fastag'); }}
                                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                                        className="utility-row"
                                                    >
                                                        <td style={{ padding: '18px 25px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="rgba(255,255,255,0.4)" /></div>
                                                                <div>
                                                                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{v.carNumber}</div>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>{v.model}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                                                            <span style={{ fontWeight: '800', fontSize: '14px', color: hasLowBalance ? '#f43f5e' : '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {hasLowBalance && <ShieldAlert size={12} />} ₹{Number(v.fastagBalance || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'right', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
                                                            ₹{act.fastag.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'right', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
                                                            ₹{act.border.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'right', fontWeight: '950', fontSize: '15px', color: '#10b981' }}>
                                                            ₹{act.total.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: theme.primary || '#fbbf24', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}>
                                                                VIEW <ArrowRight size={14} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'detail' && (
                        <motion.div key="detail-screen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                            
                            <nav style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => setViewMode('fleet')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '12px' }} className="glass-card-hover-effect">
                                    <ChevronLeft size={16} /> BACK TO FLEET
                                </button>
                            </nav>

                            <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', padding: '35px', marginBottom: '40px' }} className="premium-panel-utility">
                                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: `linear-gradient(135deg, ${theme.primary || '#fbbf24'}, ${theme.secondary || theme.primary || '#f59e0b'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 25px rgba(0,0,0,0.3)' }}><Car size={35} color="black" /></div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '950', letterSpacing: '-0.5px' }}>{detailVehicle?.carNumber}</h2>
                                            <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>{detailVehicle?.model}</span>
                                                <span style={{ fontSize: '13px', color: (detailVehicle?.fastagBalance || 0) < 500 ? '#f43f5e' : '#10b981', fontWeight: '800' }}>Fastag Balance: ₹{(detailVehicle?.fastagBalance || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedVehicleId(detailVehicleId)}
                                        className="btn-primary"
                                        style={{ height: '48px', padding: '0 25px', borderRadius: '12px', fontWeight: '900', gap: '8px', border: 'none', background: theme.primary || '#fbbf24', color: 'black', cursor: 'pointer' }}
                                    >
                                        <Plus size={18} /> ADD NEW LOG
                                    </button>
                                </header>

                                {/* Detailed vehicle metrics */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                                    {detailVehicle && (
                                        <>
                                            <DetailStat 
                                                label="Fastag Paid" 
                                                val={getVehicleActivity(detailVehicleId).fastag} 
                                                icon={CreditCard} col="#38bdf8" 
                                                desc={`${detailVehicle.fastagHistory?.length || 0} Total Logs`}
                                            />
                                            <DetailStat 
                                                label="Border Tax" 
                                                val={getVehicleActivity(detailVehicleId).border} 
                                                icon={Shield} col="#fbbf24" 
                                                desc={`${allBorderEntries.filter(e => (e.vehicle?._id === detailVehicleId || e.vehicle === detailVehicleId)).length} Total Logs`}
                                            />
                                            <DetailStat 
                                                label="Total Current" 
                                                val={getVehicleActivity(detailVehicleId).total} 
                                                icon={TrendingUp} col="#a855f7" isDark 
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Custom Sub-tabs */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '18px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {[
                                        { id: 'fastag', label: 'Fastag Logs', icon: CreditCard, color: '#38bdf8' },
                                        { id: 'border', label: 'Border Permits', icon: Shield, color: '#fbbf24' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveUtility(t.id)}
                                            style={{
                                                padding: '12px 22px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                                background: activeUtility === t.id ? `${t.color}15` : 'transparent',
                                                color: activeUtility === t.id ? t.color : 'rgba(255,255,255,0.4)',
                                                fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', textTransform: 'uppercase'
                                            }}
                                        >
                                            <t.icon size={14} /> {t.label}
                                        </button>
                                    ))}
                                </div>

                                {detailVehicle && (
                                    <ManagerHub
                                        key={activeUtility}
                                        type={activeUtility}
                                        color="#fbbf24"
                                        act={getVehicleActivity(detailVehicleId)}
                                        drivers={drivers}
                                        getImageUrl={getImageUrl}
                                        hideForm={true}
                                        onAdd={(vId, data, file) => activeUtility === 'fastag' ? handleRecharge(vId, data, file) : handleAddTax(vId, data, file)}
                                        onUpdate={(id, data) => handleUpdateRecord(activeUtility === 'fastag' ? `vehicles/${detailVehicleId}/fastag-recharge` : 'border-tax', id, data)}
                                        onDelete={id => handleDeleteRecord(activeUtility === 'fastag' ? `vehicles/${detailVehicleId}/fastag-recharge` : 'border-tax', id)}
                                        setViewingImage={setViewingImage}
                                        submitting={submitting}
                                        vehicle={detailVehicle}
                                        companyId={selectedCompany?._id}
                                        selectedMonth={selectedMonth}
                                        selectedYear={selectedYear}
                                        bankAccounts={bankAccounts}
                                        bookings={bookings}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick Add Form Modal */}
            <AnimatePresence>
                {selectedVehicleId && (selectedVehicleId === 'new' || vehicles.find(v => v._id === selectedVehicleId)) && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="modal-content-wrapper" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', background: '#020617', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}
                        >
                            <div style={{ padding: '30px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                <h3 style={{ margin: 0, fontWeight: '950', fontSize: '22px', letterSpacing: '-0.5px' }}>
                                    {selectedVehicleId === 'new' ? 'Quick Utility Entry' : 'Manual Utility Entry'}
                                </h3>
                                <button
                                    onClick={() => setSelectedVehicleId(null)}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '14px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                    className="table-row-hover"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                                {/* Tabbed Navigation */}
                                <div style={{ display: 'flex', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content', margin: '0 auto 30px auto' }}>
                                    {[
                                        { id: 'fastag', label: 'Fastag', icon: CreditCard },
                                        { id: 'border', label: 'Border Tax', icon: Shield }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveUtility(tab.id)}
                                            style={{
                                                padding: '14px 25px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                                background: (activeUtility || 'fastag') === tab.id ? '#fbbf24' : 'transparent',
                                                color: (activeUtility || 'fastag') === tab.id ? '#000' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                fontWeight: '1000', fontSize: '13px', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <tab.icon size={18} /> {tab.label.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <ManagerHub
                                    key={activeUtility || 'fastag'}
                                    type={activeUtility || 'fastag'} color="#fbbf24"
                                    act={selectedVehicleId === 'new' ? { items: { fastag: [], border: [] } } : getVehicleActivity(selectedVehicleId)}
                                    drivers={drivers} getImageUrl={getImageUrl}
                                    onAdd={(vId, data, file) => (activeUtility || 'fastag') === 'fastag' ? handleRecharge(vId, data, file) : handleAddTax(vId, data, file)}
                                    onUpdate={(id, data) => handleUpdateRecord((activeUtility || 'fastag') === 'fastag' ? `vehicles/${selectedVehicleId}/fastag-recharge` : 'border-tax', id, data)}
                                    onDelete={id => handleDeleteRecord((activeUtility || 'fastag') === 'fastag' ? `vehicles/${selectedVehicleId}/fastag-recharge` : 'border-tax', id)}
                                    setViewingImage={setViewingImage} submitting={submitting} vehicle={vehicles.find(v => v._id === selectedVehicleId)} allVehicles={vehicles} companyId={selectedCompany?._id}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    bankAccounts={bankAccounts}
                                    bookings={bookings}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>{viewingImage && (<div style={{ position: 'fixed', inset: 0, zIndex: 2005, background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setViewingImage(null)}><motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={viewingImage} style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '20px' }} /></div>)}</AnimatePresence>
        </div>
    );
};

const DetailStat = ({ label, val, icon: Icon, col, isDark, desc }) => (
    <div className="glass-card" style={{ padding: '25px', background: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${col}15`, color: col, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon size={22} /></div>
        <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: '1000', color: isDark ? col : '#fff' }}>₹{val.toLocaleString()}</div>
            {desc && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '700', marginTop: '2px' }}>{desc}</div>}
        </div>
    </div>
);

const SummaryStat = ({ label, val, col, icon: Icon, isDark, desc }) => (
    <div className="glass-card" style={{ 
        padding: '24px', 
        background: isDark ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))' : 'rgba(15, 23, 42, 0.6)', 
        border: '1px solid rgba(255, 255, 255, 0.06)', 
        borderRadius: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark ? '0 10px 30px rgba(168, 85, 247, 0.1)' : 'none'
    }}>
        <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '16px', 
            background: `${col}15`, 
            color: col, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            boxShadow: `0 0 20px ${col}20`
        }}><Icon size={24} /></div>
        <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
            <div style={{ fontSize: '26px', fontWeight: '1000', color: isDark ? col : '#fff', letterSpacing: '-0.5px' }}>₹{val.toLocaleString()}</div>
            {desc && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '700', marginTop: '2px' }}>{desc}</div>}
        </div>
    </div>
);

const ManagerHub = ({ type, color, act, drivers, onAdd, onUpdate, onDelete, setViewingImage, submitting, vehicle, getImageUrl, companyId, selectedMonth, selectedYear, hideForm = false, allVehicles = [], bankAccounts = [], bookings = [] }) => {
    const { selectedCompany } = useCompany();
    const [form, setForm] = useState({
        amount: '',
        remarks: '',
        borderName: '',
        date: '',
        billDate: '',
        validTill: '',
        driverId: '',
        category: 'General Servicing',
        vehicleId: vehicle?._id || '',
        paymentSource: 'Office',
        paymentMode: 'UPI',
        paidBy: 'Company',
        bankAccountId: '',
        bookingId: '',
        bookingRef: '',
        guestName: ''
    });
    const [file, setFile] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    const fromDateRef = useRef(null);
    const validTillRef = useRef(null);

    const openDatePicker = (ref) => {
        if (!ref || !ref.current) return;
        try {
            if (typeof ref.current.showPicker === 'function') {
                ref.current.showPicker();
            } else {
                ref.current.focus();
            }
        } catch (err) {
            ref.current?.focus();
        }
    };

    // List of logs depending on active utility type
    const hist = type === 'fastag' ? act.items.fastag : (act.items.border || []);

    useEffect(() => {
        if (vehicle) setForm(prev => ({ ...prev, vehicleId: vehicle._id }));
    }, [vehicle]);

    // Handle incoming edit event from main screen
    useEffect(() => {
        const handleEditEvent = (e) => {
            const log = e.detail;
            setEditingItem(log);
        };
        window.addEventListener('edit-utility-item', handleEditEvent);
        return () => window.removeEventListener('edit-utility-item', handleEditEvent);
    }, []);

    // Sync form values on editing starting/stopping or utility tab switching
    useEffect(() => {
        if (editingItem) {
            const isGuest = editingItem.paidBy === 'Guest' || editingItem.paymentSource === 'Guest';
            setForm({
                amount: editingItem.amount || '',
                remarks: editingItem.remarks || '',
                borderName: editingItem.borderName || '',
                date: toISTDateString(editingItem.date || editingItem.billDate || ''),
                billDate: toISTDateString(editingItem.billDate || editingItem.date || ''),
                validTill: toISTDateString(editingItem.validTill || ''),
                driverId: editingItem.driver?._id || editingItem.driver || '',
                paymentMode: editingItem.method || editingItem.paymentMode || 'UPI',
                vehicleId: vehicle?._id || editingItem.vehicle?._id || editingItem.vehicle || editingItem.vehicleId || '',
                paymentSource: isGuest ? 'Guest' : 'Office',
                paidBy: isGuest ? 'Guest' : 'Company',
                bankAccountId: editingItem.bankAccount?._id || editingItem.bankAccount || editingItem.bankAccountId || '',
                bookingId: editingItem.bookingId || '',
                bookingRef: editingItem.bookingRef || editingItem.booking?._id || '',
                guestName: editingItem.guestName || ''
            });
        } else {
            // Default date inside active month cycle
            const istNow = nowIST();
            const isCurrentMonth = (istNow.getUTCMonth() + 1) === selectedMonth && istNow.getUTCFullYear() === selectedYear;
            const defaultDate = isCurrentMonth ? todayIST() : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            
            setForm({ 
                amount: '', 
                remarks: '', 
                borderName: '', 
                date: defaultDate, 
                billDate: defaultDate, 
                validTill: '',
                driverId: '', 
                vehicleId: vehicle?._id || '', 
                paymentSource: 'Office', 
                paymentMode: 'UPI',
                paidBy: 'Company',
                bankAccountId: '',
                bookingId: '',
                bookingRef: '',
                guestName: ''
            });
            setFile(null);
        }
    }, [editingItem, type, vehicle, selectedMonth, selectedYear]);

    const handleSave = async () => {
        const targetVehicleId = vehicle?._id || form.vehicleId;
        if (!targetVehicleId) return alert('Please select a vehicle');
        if (!form.amount) return alert('Amount is required');

        const finalDate = form.date || form.billDate || todayIST();

        try {
            let success = false;
            if (type === 'fastag') {
                const formData = new FormData();
                formData.append('amount', form.amount);
                formData.append('method', form.paymentMode || 'UPI');
                formData.append('remarks', form.remarks || '');
                formData.append('date', finalDate);
                formData.append('paidBy', form.paidBy || 'Company');
                formData.append('paymentSource', form.paidBy === 'Guest' ? 'Guest' : 'Office');
                if (form.bankAccountId) formData.append('bankAccountId', form.bankAccountId);
                if (form.bookingId) formData.append('bookingId', form.bookingId);
                if (form.bookingRef) formData.append('bookingRef', form.bookingRef);
                if (form.guestName) formData.append('guestName', form.guestName);
                if (file) formData.append('receiptPhoto', file);
                if (companyId) formData.append('companyId', companyId);

                if (editingItem) {
                    success = await onUpdate(editingItem._id, formData);
                } else {
                    success = await onAdd(targetVehicleId, formData);
                }
            } else {
                const fd = new FormData();
                Object.keys(form).forEach(k => {
                    if (form[k] !== undefined && form[k] !== null && !['date', 'billDate', 'vehicleId'].includes(k)) {
                        fd.append(k, form[k]);
                    }
                });
                fd.append('date', finalDate);
                fd.append('billDate', finalDate);
                if (companyId) fd.append('companyId', companyId);
                fd.append('vehicleId', targetVehicleId);
                fd.append('paidBy', form.paidBy || 'Company');
                fd.append('paymentSource', form.paidBy === 'Guest' ? 'Guest' : 'Office');

                if (file) fd.append(type === 'border' ? 'receiptPhoto' : 'billPhoto', file);

                if (editingItem) {
                    success = await onUpdate(editingItem._id, fd);
                } else {
                    success = await onAdd(targetVehicleId, fd);
                }
            }

            if (success) {
                const istNow = nowIST();
                const isCurrentMonth = (istNow.getUTCMonth() + 1) === selectedMonth && istNow.getUTCFullYear() === selectedYear;
                const defaultDate = isCurrentMonth ? todayIST() : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                
                setForm({
                    amount: '',
                    remarks: '',
                    borderName: '',
                    date: defaultDate,
                    billDate: defaultDate,
                    validTill: '',
                    driverId: '',
                    vehicleId: vehicle?._id || '',
                    paymentSource: 'Office',
                    paymentMode: 'UPI',
                    paidBy: 'Company',
                    bankAccountId: '',
                    bookingId: '',
                    bookingRef: '',
                    guestName: ''
                });
                setFile(null);
                if (editingItem) setEditingItem(null);
            }
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    return (
        <div className="manager-hub-container" style={{ color: '#fff', height: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
                {/* Form Side */}
                <div style={{ padding: '20px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${color}15`, color: color, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Plus size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '950', letterSpacing: '-0.5px' }}>
                                {editingItem ? 'Edit' : 'New'} {type === 'fastag' ? 'Recharge' : 'Border Permit'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                Fill out the details below to log the utility entry.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {!vehicle && (
                            <div className="premium-input-container">
                                <label>Select Vehicle</label>
                                <SearchableSelect 
                                    options={allVehicles.map(v => ({ value: v._id, label: `${v.carNumber} (${v.model})` }))}
                                    value={form.vehicleId}
                                    onChange={(val) => setForm({ ...form, vehicleId: val })}
                                    placeholder="Search Vehicle..."
                                />
                            </div>
                        )}

                        <div className="premium-input-container">
                            <label>Amount (₹)</label>
                            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={{ fontSize: '20px', fontWeight: '800', color }} />
                        </div>

                        {/* Paid By: By Company vs By Guest */}
                        <div className="premium-input-container">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CreditCard size={12} /> Paid By / Expense Source
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, paidBy: 'Company', paymentSource: 'Office', paymentMode: form.paymentMode || 'UPI', bookingId: '', bookingRef: '', guestName: '' })}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: form.paidBy === 'Company' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                        background: form.paidBy === 'Company' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: form.paidBy === 'Company' ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Building2 size={14} /> 🏢 By Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, paidBy: 'Guest', paymentSource: 'Guest', paymentMode: 'Cash by Guest', bankAccountId: '' })}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: form.paidBy === 'Guest' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                        background: form.paidBy === 'Guest' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: form.paidBy === 'Guest' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <UserCheck size={14} /> 👤 By Guest
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Section: Bank Account vs Cash in Hand selection when By Company */}
                        {form.paidBy === 'Company' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Payment Account / Method
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, paymentMode: 'Cash', bankAccountId: '' })}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: (form.paymentMode === 'Cash' || (!form.bankAccountId && form.paymentMode !== 'UPI' && form.paymentMode !== 'Bank Transfer')) ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                            background: (form.paymentMode === 'Cash' || (!form.bankAccountId && form.paymentMode !== 'UPI' && form.paymentMode !== 'Bank Transfer')) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: (form.paymentMode === 'Cash' || (!form.bankAccountId && form.paymentMode !== 'UPI' && form.paymentMode !== 'Bank Transfer')) ? '#10b981' : 'rgba(255,255,255,0.6)',
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
                                        onClick={() => setForm({ ...form, paymentMode: form.paymentMode === 'Cash' ? 'UPI' : (form.paymentMode || 'UPI'), bankAccountId: form.bankAccountId || (bankAccounts[0]?._id || '') })}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: (form.paymentMode !== 'Cash' && (form.bankAccountId || form.paymentMode === 'UPI' || form.paymentMode === 'Bank Transfer')) ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                            background: (form.paymentMode !== 'Cash' && (form.bankAccountId || form.paymentMode === 'UPI' || form.paymentMode === 'Bank Transfer')) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: (form.paymentMode !== 'Cash' && (form.bankAccountId || form.paymentMode === 'UPI' || form.paymentMode === 'Bank Transfer')) ? '#38bdf8' : 'rgba(255,255,255,0.6)',
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
                                {form.paymentMode === 'Cash' ? (
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
                                        {Number(form.amount) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(16, 185, 129, 0.2)', paddingTop: '6px' }}>
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Cash Balance After:</span>
                                                <span style={{
                                                    fontSize: '14px',
                                                    fontWeight: '950',
                                                    color: ((selectedCompany?.cashBalance || 0) - Number(form.amount)) < 0 ? '#f43f5e' : '#10b981'
                                                }}>
                                                    ₹{((selectedCompany?.cashBalance || 0) - Number(form.amount)).toLocaleString('en-IN')}
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
                                        value={form.bankAccountId}
                                        amount={form.amount}
                                        onChange={(bId) => setForm({ ...form, bankAccountId: bId })}
                                    />
                                )}
                            </div>
                        )}

                        {/* Dynamic Section: Tour Booking selection when By Guest */}
                        {form.paidBy === 'Guest' && (
                            <SmartGuestBookingSelector
                                bookings={bookings}
                                selectedDate={form.date || form.billDate}
                                selectedDriverId={form.driverId}
                                selectedVehicleId={vehicle?._id || form.vehicleId}
                                value={{
                                    bookingRef: form.bookingRef,
                                    bookingId: form.bookingId,
                                    guestName: form.guestName
                                }}
                                amount={form.amount}
                                onChange={({ bookingRef, bookingId, guestName }) => setForm({
                                    ...form,
                                    bookingRef,
                                    bookingId,
                                    guestName
                                })}
                            />
                        )}

                        <div style={type === 'border' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } : {}}>
                            <div
                                className="premium-input-container"
                                onClick={() => openDatePicker(fromDateRef)}
                                style={{ cursor: 'pointer' }}
                            >
                                <label>{type === 'border' ? 'From Date' : 'Date'}</label>
                                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: (form.date || form.billDate) ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                        {(() => {
                                            const dStr = form.date || form.billDate;
                                            if (!dStr) return 'DD/MM/YYYY';
                                            const parts = dStr.split('-');
                                            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                            return dStr;
                                        })()}
                                    </div>
                                    <input
                                        ref={fromDateRef}
                                        type="date"
                                        value={form.date || form.billDate || ''}
                                        onChange={e => setForm({ ...form, date: e.target.value, billDate: e.target.value })}
                                        onClick={e => {
                                            e.stopPropagation();
                                            openDatePicker(fromDateRef);
                                        }}
                                        style={{
                                            opacity: 0,
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer',
                                            zIndex: 2,
                                            colorScheme: 'dark'
                                        }}
                                    />
                                    <Calendar size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: color, pointerEvents: 'none', opacity: 0.85, zIndex: 1 }} />
                                </div>
                            </div>
                            
                            {type === 'border' && (
                                <div
                                    className="premium-input-container"
                                    onClick={() => openDatePicker(validTillRef)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ margin: 0 }}>Valid Till</label>
                                        {form.validTill && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setForm({ ...form, validTill: '' });
                                                }}
                                                title="Clear Valid Till Date"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '6px',
                                                    color: '#f87171',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    padding: '1px 6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}
                                            >
                                                <X size={10} /> Clear
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '600', color: form.validTill ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                            {(() => {
                                                const dStr = form.validTill;
                                                if (!dStr) return 'DD/MM/YYYY';
                                                const parts = dStr.split('-');
                                                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                return dStr;
                                            })()}
                                        </div>
                                        <input
                                            ref={validTillRef}
                                            type="date"
                                            value={form.validTill || ''}
                                            onChange={e => setForm({ ...form, validTill: e.target.value })}
                                            onClick={e => {
                                                e.stopPropagation();
                                                openDatePicker(validTillRef);
                                            }}
                                            style={{
                                                opacity: 0,
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                cursor: 'pointer',
                                                zIndex: 2,
                                                colorScheme: 'dark'
                                            }}
                                        />
                                        <Calendar size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: color, pointerEvents: 'none', opacity: 0.85, zIndex: 1 }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {type === 'border' && (
                            <div className="premium-input-container">
                                <label>Border Name</label>
                                <input type="text" value={form.borderName} onChange={e => setForm({ ...form, borderName: e.target.value })} placeholder="e.g. Delhi-Haryana" />
                            </div>
                        )}


                        <div className="premium-input-container">
                            <label>Remarks / Notes</label>
                            <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Add specific details..." style={{ height: '60px', resize: 'none' }} />
                        </div>

                        <div>
                            <ImageUploader file={file} onChange={setFile} label="Attach Receipt / Bill" color={color} />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                            <button 
                                onClick={handleSave} 
                                disabled={submitting}
                                style={{ flex: 1, background: color, color: '#000', padding: '16px', borderRadius: '16px', fontWeight: '900', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: `0 8px 25px ${color}30`, transition: 'all 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                            >
                                {submitting ? <RefreshCw size={18} className="spin" /> : editingItem ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                                {submitting ? 'PROCESSING...' : editingItem ? 'UPDATE RECORD' : 'SAVE ENTRY'}
                            </button>
                            
                            {editingItem && (
                                <button 
                                    onClick={() => setEditingItem(null)}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '16px 24px', borderRadius: '16px', fontWeight: '800', fontSize: '13px', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                                >
                                    CANCEL
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarUtility;

