import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Search, Download, ExternalLink, Filter, Wallet, 
    IndianRupee, Calendar, FileText, ChevronRight, X, Plus,
    Briefcase, Building2, MapPin, Mail, Phone, UserCheck, Gift, Sparkles,
    TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import axios from '../api/axios';
import { useCompany } from '../context/CompanyContext';

const MONTH_TABS = [
    'All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const ClientLedgers = () => {
    const { selectedCompany } = useCompany();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const isAgentView = tabParam === 'agents';

    const getInitialFY = () => {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        return (m >= 1 && m <= 3) ? y - 1 : y;
    };

    const [selectedYear, setSelectedYear] = useState(getInitialFY());
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedClient, setSelectedClient] = useState(null);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    
    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ amount: '', description: '', date: '' });

    // Enlist Travel Agent Modal
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [agentFormData, setAgentFormData] = useState({
        agencyName: '',
        contactPerson: '',
        mobile: '',
        email: '',
        city: '',
        gstNumber: ''
    });
    const [addingAgent, setAddingAgent] = useState(false);

    const fetchClients = async (year = selectedYear, month = selectedMonth) => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const clientTypeParam = isAgentView ? 'Travel Agent' : 'Direct';
            const { data } = await axios.get(
                `/api/clients/company/${selectedCompany._id}?year=${year}&month=${month}&clientType=${clientTypeParam}`
            );
            setClients(data || []);
            // Update selected client with refreshed period figures if open
            if (selectedClient?._id) {
                const updated = (data || []).find(c => c._id === selectedClient._id);
                if (updated) setSelectedClient(updated);
            }
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLedger = async (clientId, year = selectedYear, month = selectedMonth) => {
        setLedgerLoading(true);
        try {
            const { data } = await axios.get(
                `/api/clients/${clientId}/ledger?year=${year}&month=${month}`
            );
            setLedgerEntries(data || []);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLedgerLoading(false);
        }
    };

    useEffect(() => {
        fetchClients(selectedYear, selectedMonth);
    }, [selectedCompany, selectedYear, selectedMonth, isAgentView]);

    useEffect(() => {
        if (selectedClient?._id) {
            fetchLedger(selectedClient._id, selectedYear, selectedMonth);
        }
    }, [selectedYear, selectedMonth]);

    const handleClientClick = (client) => {
        setSelectedClient(client);
        fetchLedger(client._id, selectedYear, selectedMonth);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/clients/${selectedClient._id}/payment`, paymentData);
            setShowPaymentModal(false);
            setPaymentData({ amount: '', description: '', date: '' });
            fetchLedger(selectedClient._id, selectedYear, selectedMonth);
            fetchClients(selectedYear, selectedMonth);
        } catch (error) {
            alert('Error adding payment');
        }
    };

    const handleAddAgent = async (e) => {
        e.preventDefault();
        if (!agentFormData.agencyName && !agentFormData.contactPerson) {
            alert('Please provide an Agency Name or Contact Person');
            return;
        }
        setAddingAgent(true);
        try {
            const payload = {
                company: selectedCompany._id,
                clientType: 'Travel Agent',
                name: agentFormData.agencyName || agentFormData.contactPerson,
                agencyName: agentFormData.agencyName,
                contactPerson: agentFormData.contactPerson,
                mobile: agentFormData.mobile || `AGENT-${Date.now().toString().slice(-6)}`,
                email: agentFormData.email || '',
                city: agentFormData.city || '',
                gstNumber: agentFormData.gstNumber || ''
            };
            const { data } = await axios.post('/api/clients', payload);
            alert(`Travel Agent "${data.agencyName || data.name}" enlisted successfully!`);
            setShowAddAgentModal(false);
            setAgentFormData({
                agencyName: '',
                contactPerson: '',
                mobile: '',
                email: '',
                city: '',
                gstNumber: ''
            });
            await fetchClients(selectedYear, selectedMonth);
            setSelectedClient(data);
            fetchLedger(data._id, selectedYear, selectedMonth);
        } catch (err) {
            console.error('Error enlisting agent:', err);
            alert(err.response?.data?.message || 'Failed to enlist travel agent');
        } finally {
            setAddingAgent(false);
        }
    };

    const filteredClients = clients.filter(c => {
        const q = searchTerm.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(q) || 
                          (c.agencyName || '').toLowerCase().includes(q) ||
                          (c.contactPerson || '').toLowerCase().includes(q);
        const mobileMatch = (c.mobile || '').includes(q);
        const cityMatch = (c.city || '').toLowerCase().includes(q);
        return nameMatch || mobileMatch || cityMatch;
    });

    const fyDisplay = selectedYear === 'all' 
        ? 'All-Time' 
        : `FY ${selectedYear}-${String(Number(selectedYear) + 1).slice(-2)}`;

    const periodLabel = selectedMonth === 'All Months' ? fyDisplay : `${selectedMonth} ${fyDisplay}`;

    return (
        <div style={{ padding: '24px 30px', maxWidth: '1600px', margin: '0 auto', color: 'white' }}>
            {/* Header */}
            <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                        padding: '10px', 
                        background: isAgentView ? '#f59e0b' : 'var(--primary)', 
                        borderRadius: '14px', 
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {isAgentView ? <Briefcase size={26} /> : <Users size={26} />}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 4px 0' }}>
                            {isAgentView ? 'Travel Agents Directory & FY Business' : 'Client & Guest Ledgers'}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '13px' }}>
                            {isAgentView 
                                ? 'Track travel agency partners, turnover per Financial Year & Month, and statement ledgers.'
                                : 'Track statements, debit/credit transactions, and balances for direct guests.'}
                        </p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Financial Year Selector */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        background: 'rgba(245, 158, 11, 0.12)', 
                        padding: '0 12px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(245, 158, 11, 0.35)' 
                    }}>
                        <Calendar size={17} color="#f59e0b" style={{ marginRight: '6px' }} />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f59e0b',
                                fontWeight: '800',
                                fontSize: '13px',
                                padding: '10px 4px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={2026} style={{ background: '#1e293b', color: '#fff' }}>FY 2026-27 (01 Apr 26 - 31 Mar 27)</option>
                            <option value={2025} style={{ background: '#1e293b', color: '#fff' }}>FY 2025-26 (01 Apr 25 - 31 Mar 26)</option>
                            <option value={2024} style={{ background: '#1e293b', color: '#fff' }}>FY 2024-25 (01 Apr 24 - 31 Mar 25)</option>
                            <option value="all" style={{ background: '#1e293b', color: '#fff' }}>All Financial Years (All-Time)</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Search size={16} color="rgba(255,255,255,0.5)" />
                        <input 
                            type="text" 
                            placeholder={isAgentView ? "Search agency, contact, city..." : "Search name, mobile..."} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px 10px', outline: 'none', width: '210px', fontSize: '13px' }}
                        />
                    </div>

                    {/* Enlist Agent Button (when in agent view) */}
                    {isAgentView && (
                        <button
                            onClick={() => setShowAddAgentModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#f59e0b',
                                color: '#000',
                                fontWeight: '800',
                                padding: '11px 18px',
                                borderRadius: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            <Plus size={17} /> Enlist Travel Agent
                        </button>
                    )}
                </div>
            </header>

            {/* Month Tabs Bar (Matching the requested design) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '14px',
                marginBottom: '16px',
                scrollbarWidth: 'none'
            }}>
                {MONTH_TABS.map(m => {
                    const isActive = selectedMonth === m;
                    return (
                        <button
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                background: isActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.04)',
                                color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                                fontWeight: isActive ? '900' : '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {m}
                        </button>
                    );
                })}
            </div>

            {/* Main Content: Left List & Right Ledger Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '440px 1fr' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>
                {/* Accounts List */}
                <div className="premium-glass" style={{ padding: '20px', borderRadius: '24px', height: 'calc(100vh - 230px)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 6px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px', color: isAgentView ? '#f59e0b' : 'rgba(255,255,255,0.8)' }}>
                            {isAgentView ? 'Enlisted Travel Agents' : 'Direct Guests'} ({filteredClients.length})
                        </h3>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                            {periodLabel}
                        </span>
                    </div>
                    
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading accounts & FY data...</div>
                    ) : filteredClients.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                            No {isAgentView ? 'travel agents' : 'clients'} found for {periodLabel}.
                        </div>
                    ) : filteredClients.map(client => {
                        const isSelected = selectedClient?._id === client._id;
                        const displayName = isAgentView ? (client.agencyName || client.name) : client.name;
                        
                        return (
                            <motion.div
                                key={client._id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleClientClick(client)}
                                style={{
                                    padding: '16px 18px',
                                    background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isSelected ? '#f59e0b' : isAgentView ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: '16px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    {/* Prominent Agency Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <h4 style={{ 
                                            margin: 0, 
                                            fontSize: '15px', 
                                            fontWeight: '800', 
                                            color: isAgentView ? '#fef08a' : '#fff',
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>
                                            {displayName}
                                        </h4>
                                        {isAgentView && (
                                            <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', flexShrink: 0 }}>
                                                Agent
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Subtitle Contact & City */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                                        {client.contactPerson && <span>👤 {client.contactPerson}</span>}
                                        <span>📱 {client.mobile}</span>
                                        {client.city && <span>📍 {client.city}</span>}
                                    </div>

                                    {/* Period Business Chips */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ 
                                            fontSize: '11px', 
                                            fontWeight: '700', 
                                            background: 'rgba(245, 158, 11, 0.12)', 
                                            color: '#fbbf24', 
                                            padding: '2px 8px', 
                                            borderRadius: '6px',
                                            border: '1px solid rgba(245, 158, 11, 0.25)'
                                        }}>
                                            {periodLabel}: ₹{(client.fyBilled || 0).toLocaleString('en-IN')}
                                        </span>
                                        {client.fyTripsCount > 0 && (
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                • {client.fyTripsCount} Tours
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Due Balance Column */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>Due Balance</div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: (client.balance || 0) > 0 ? '#f87171' : '#4ade80' }}>
                                        ₹{(client.balance || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Selected Client / Agent Ledger */}
                <AnimatePresence>
                    {selectedClient && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="premium-glass"
                            style={{ padding: '30px', borderRadius: '24px', height: 'calc(100vh - 230px)', overflowY: 'auto' }}
                        >
                            {/* Header Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', paddingBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: selectedClient.clientType === 'Travel Agent' ? '#fef08a' : '#fff' }}>
                                            {selectedClient.agencyName || selectedClient.name}
                                        </h2>
                                        {selectedClient.clientType === 'Travel Agent' && (
                                            <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Briefcase size={12} /> Travel Agent
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                                        {selectedClient.contactPerson && <span>👤 Contact: <strong>{selectedClient.contactPerson}</strong></span>}
                                        <span>📱 {selectedClient.mobile}</span>
                                        {selectedClient.email && <span>✉️ {selectedClient.email}</span>}
                                        {selectedClient.city && <span>📍 {selectedClient.city}</span>}
                                        {selectedClient.gstNumber && <span>🏢 GST: {selectedClient.gstNumber}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedClient(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={17} />
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        {periodLabel} Business
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>₹{(selectedClient.fyBilled || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                        {selectedClient.fyTripsCount || 0} Tours in period
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        {periodLabel} Received
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#34d399' }}>₹{(selectedClient.fyPaid || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                        Collections in period
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(248, 113, 113, 0.08)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                    <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Net Account Balance
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#f87171' }}>₹{(selectedClient.balance || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                        Total Outstanding Due
                                    </div>
                                </div>
                            </div>

                            {/* Diwali Gift & Annual Business Card (for Travel Agents) */}
                            {selectedClient.clientType === 'Travel Agent' && (() => {
                                const annualTurnover = selectedClient.annualBilled || selectedClient.totalBilled || 0;
                                const annualBookings = selectedClient.annualTripsCount || ledgerEntries.filter(e => e.type === 'Bill').length;

                                let tier = {
                                    name: 'Bronze Partner',
                                    badge: '🥉 BRONZE TIER',
                                    color: '#cd7f32',
                                    bg: 'rgba(205, 127, 50, 0.12)',
                                    border: 'rgba(205, 127, 50, 0.35)',
                                    gift: 'Executive Sweet Box + Festive Diwali Hamper',
                                    nextTier: 'Silver Partner (₹50,000+)'
                                };
                                if (annualTurnover >= 500000) {
                                    tier = {
                                        name: 'Diamond VIP Partner',
                                        badge: '💎 DIAMOND VIP TIER',
                                        color: '#38bdf8',
                                        bg: 'rgba(56, 189, 248, 0.12)',
                                        border: 'rgba(56, 189, 248, 0.4)',
                                        gift: 'Pure Silver Coin (20g) + Luxury Dry Fruit Hamper + Corporate Trophy',
                                        nextTier: 'Top Elite Partner Reached!'
                                    };
                                } else if (annualTurnover >= 200000) {
                                    tier = {
                                        name: 'Gold Elite Partner',
                                        badge: '🥇 GOLD ELITE TIER',
                                        color: '#fbbf24',
                                        bg: 'rgba(251, 191, 36, 0.12)',
                                        border: 'rgba(251, 191, 36, 0.4)',
                                        gift: 'Silver Coin (10g) + Premium Sweets & Dry Fruits Hamper',
                                        nextTier: 'Diamond Partner (₹5,00,000+)'
                                    };
                                } else if (annualTurnover >= 50000) {
                                    tier = {
                                        name: 'Silver Partner',
                                        badge: '🥈 SILVER PARTNER TIER',
                                        color: '#cbd5e1',
                                        bg: 'rgba(203, 213, 225, 0.12)',
                                        border: 'rgba(203, 213, 225, 0.35)',
                                        gift: 'Signature Royal Dry Fruit Box + Corporate Gift Set',
                                        nextTier: 'Gold Partner (₹2,00,000+)'
                                    };
                                }

                                return (
                                    <div style={{
                                        background: tier.bg,
                                        border: `1px solid ${tier.border}`,
                                        borderRadius: '16px',
                                        padding: '18px 20px',
                                        marginBottom: '22px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ background: tier.color, color: '#000', padding: '7px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Gift size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: tier.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                                        {fyDisplay} Annual Business & Diwali Gift Status
                                                    </div>
                                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>
                                                        {tier.badge} — <span style={{ color: tier.color }}>{tier.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Full FY Turnover</div>
                                                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>₹{annualTurnover.toLocaleString('en-IN')}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Total FY Tours</div>
                                                    <div style={{ fontSize: '17px', fontWeight: '800', color: tier.color }}>{annualBookings} Tours</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'rgba(0,0,0,0.25)',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            fontSize: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)' }}>
                                                <Sparkles size={14} style={{ color: tier.color, flexShrink: 0 }} />
                                                <span><strong>Diwali Gift Allocation:</strong> {tier.gift}</span>
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                                                Next Milestone: {tier.nextTier}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Actions & Ledger Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Statement of Account</h3>
                                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', color: 'rgba(255,255,255,0.6)' }}>
                                        {periodLabel}
                                    </span>
                                </div>
                                <button onClick={() => setShowPaymentModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                                    <Plus size={15} /> Record Payment
                                </button>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Particulars</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Debit (Bill)</th>
                                            <th style={{ padding: '12px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Credit (Paid)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerLoading ? (
                                            <tr><td colSpan="5" style={{ padding: '36px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>
                                        ) : ledgerEntries.length === 0 ? (
                                            <tr><td colSpan="5" style={{ padding: '36px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No transactions recorded for {periodLabel}.</td></tr>
                                        ) : (
                                            ledgerEntries.map((entry) => (
                                                <tr key={entry._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                        <div>{entry.description}</div>
                                                        {entry.type === 'Bill' && entry.taxableAmount && (
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                Base: ₹{entry.taxableAmount} | GST: ₹{entry.gstAmount}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                        <span style={{ 
                                                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                                            background: entry.type === 'Bill' ? 'rgba(59, 130, 246, 0.2)' : 
                                                                        entry.type === 'Fuel' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                            color: entry.type === 'Bill' ? '#60a5fa' : 
                                                                   entry.type === 'Fuel' ? '#fbbf24' : '#34d399'
                                                        }}>
                                                            {entry.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>
                                                        {entry.type === 'Bill' ? `₹${(entry.amount || 0).toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', textAlign: 'right', color: '#4ade80' }}>
                                                        {entry.type !== 'Bill' ? `₹${(entry.amount || 0).toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="premium-glass" style={{ width: '400px', padding: '30px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Record Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Amount (₹)</label>
                                    <input required type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Date</label>
                                    <input required type="date" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} onClick={e=>e.target.showPicker()} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Description / Ref</label>
                                    <input required type="text" placeholder="e.g. Bank Transfer Ref: 123456" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '5px' }}>Save Payment</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Enlist Travel Agent Modal */}
            <AnimatePresence>
                {showAddAgentModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="premium-glass" style={{ width: '450px', padding: '30px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Briefcase size={22} color="#f59e0b" />
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Enlist Travel Agent</h3>
                                </div>
                                <button onClick={() => setShowAddAgentModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Agency / Company Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Skyline Travels Pvt Ltd"
                                        value={agentFormData.agencyName}
                                        onChange={e => setAgentFormData({ ...agentFormData, agencyName: e.target.value })}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Contact Person Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Amit Verma"
                                        value={agentFormData.contactPerson}
                                        onChange={e => setAgentFormData({ ...agentFormData, contactPerson: e.target.value })}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Mobile / Phone</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 9876543210"
                                            value={agentFormData.mobile}
                                            onChange={e => setAgentFormData({ ...agentFormData, mobile: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>City / Location</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Delhi"
                                            value={agentFormData.city}
                                            onChange={e => setAgentFormData({ ...agentFormData, city: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Email Address (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. bookings@skylinetravels.com"
                                        value={agentFormData.email}
                                        onChange={e => setAgentFormData({ ...agentFormData, email: e.target.value })}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>GSTIN (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 07AAAAA0000A1Z5"
                                        value={agentFormData.gstNumber}
                                        onChange={e => setAgentFormData({ ...agentFormData, gstNumber: e.target.value })}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }}
                                    />
                                </div>
                                <button type="submit" disabled={addingAgent} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: addingAgent ? 'not-allowed' : 'pointer', background: '#f59e0b', color: '#000', marginTop: '6px' }}>
                                    {addingAgent ? 'Enlisting...' : 'Enlist Agent'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientLedgers;
