import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Search, Download, ExternalLink, Filter, Wallet, 
    IndianRupee, Calendar, FileText, ChevronRight, X, Plus,
    Briefcase, Building2, MapPin, Mail, Phone, UserCheck, Gift, Sparkles
} from 'lucide-react';
import axios from '../api/axios';
import { useCompany } from '../context/CompanyContext';

const ClientLedgers = () => {
    const { selectedCompany } = useCompany();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tabFilter, setTabFilter] = useState(tabParam === 'agents' ? 'agents' : 'all'); // 'all', 'agents', 'direct'

    useEffect(() => {
        if (tabParam === 'agents') {
            setTabFilter('agents');
        }
    }, [tabParam]);
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

    const fetchClients = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/clients/company/${selectedCompany._id}`);
            setClients(data || []);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, [selectedCompany]);

    const fetchLedger = async (clientId) => {
        setLedgerLoading(true);
        try {
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);
            setLedgerEntries(data || []);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleClientClick = (client) => {
        setSelectedClient(client);
        fetchLedger(client._id);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/clients/${selectedClient._id}/payment`, paymentData);
            setShowPaymentModal(false);
            setPaymentData({ amount: '', description: '', date: '' });
            fetchLedger(selectedClient._id);
            fetchClients(); // Update balance in main list
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
            await fetchClients();
            setSelectedClient(data);
            fetchLedger(data._id);
        } catch (err) {
            console.error('Error enlisting agent:', err);
            alert(err.response?.data?.message || 'Failed to enlist travel agent');
        } finally {
            setAddingAgent(false);
        }
    };

    const agentCount = clients.filter(c => c.clientType === 'Travel Agent').length;
    const directCount = clients.filter(c => c.clientType !== 'Travel Agent').length;

    const filteredClients = clients.filter(c => {
        if (tabFilter === 'agents' && c.clientType !== 'Travel Agent') return false;
        if (tabFilter === 'direct' && c.clientType === 'Travel Agent') return false;
        const q = searchTerm.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(q) || 
                          (c.agencyName || '').toLowerCase().includes(q) ||
                          (c.contactPerson || '').toLowerCase().includes(q);
        const mobileMatch = (c.mobile || '').includes(q);
        const cityMatch = (c.city || '').toLowerCase().includes(q);
        return nameMatch || mobileMatch || cityMatch;
    });

    return (
        <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', color: 'white' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ padding: '12px', background: 'var(--primary)', borderRadius: '16px', color: '#000' }}>
                            <Wallet size={28} />
                        </div>
                        Client & Travel Agent Ledgers
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>
                        Track separate accounts for Travel Agents and Direct Clients, manage statements, and record receipts.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Search size={18} color="rgba(255,255,255,0.5)" />
                        <input 
                            type="text" 
                            placeholder="Search name, agent, mobile..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', padding: '12px 10px', outline: 'none', width: '220px' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowAddAgentModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#f59e0b',
                            color: '#000',
                            fontWeight: '800',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} /> Enlist Travel Agent
                    </button>
                </div>
            </header>

            {/* Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <button
                    onClick={() => setTabFilter('all')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        background: tabFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: tabFilter === 'all' ? '#000' : 'rgba(255,255,255,0.8)',
                        fontWeight: '800',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    All Accounts ({clients.length})
                </button>
                <button
                    onClick={() => setTabFilter('agents')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        background: tabFilter === 'agents' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                        color: tabFilter === 'agents' ? '#000' : '#f59e0b',
                        fontWeight: '800',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Briefcase size={15} /> Travel Agents ({agentCount})
                </button>
                <button
                    onClick={() => setTabFilter('direct')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        background: tabFilter === 'direct' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        color: tabFilter === 'direct' ? '#fff' : '#60a5fa',
                        fontWeight: '800',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Users size={15} /> Direct Clients ({directCount})
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '400px 1fr' : '1fr', gap: '30px', transition: 'all 0.3s ease' }}>
                {/* Clients / Agents List */}
                <div className="premium-glass" style={{ padding: '20px', borderRadius: '24px', height: 'calc(100vh - 240px)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 10px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                            {tabFilter === 'agents' ? 'Enlisted Travel Agents' : tabFilter === 'direct' ? 'Direct Guests' : 'All Accounts'} ({filteredClients.length})
                        </h3>
                    </div>
                    
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading ledgers...</div>
                    ) : filteredClients.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                            No accounts found for selected filter.
                        </div>
                    ) : filteredClients.map(client => {
                        const isAgent = client.clientType === 'Travel Agent';
                        return (
                            <motion.div
                                key={client._id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleClientClick(client)}
                                style={{
                                    padding: '16px 20px',
                                    background: selectedClient?._id === client._id ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${selectedClient?._id === client._id ? 'var(--primary)' : isAgent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: '16px',
                                    marginBottom: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {client.agencyName || client.name}
                                        </h4>
                                        {isAgent && (
                                            <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Briefcase size={10} /> Agent
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                        {client.contactPerson && client.agencyName && <span>👤 {client.contactPerson}</span>}
                                        <span>📱 {client.mobile}</span>
                                        {client.city && <span>📍 {client.city}</span>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>Due Balance</div>
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
                            style={{ padding: '30px', borderRadius: '24px', height: 'calc(100vh - 240px)', overflowY: 'auto' }}
                        >
                            {/* Header Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <h2 style={{ fontSize: '26px', fontWeight: '900', margin: 0 }}>
                                            {selectedClient.agencyName || selectedClient.name}
                                        </h2>
                                        {selectedClient.clientType === 'Travel Agent' && (
                                            <span style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Briefcase size={12} /> Travel Agent
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                                        {selectedClient.contactPerson && <span>👤 Contact: {selectedClient.contactPerson}</span>}
                                        <span>📱 {selectedClient.mobile}</span>
                                        {selectedClient.email && <span>✉️ {selectedClient.email}</span>}
                                        {selectedClient.city && <span>📍 {selectedClient.city}</span>}
                                        {selectedClient.gstNumber && <span>🏢 GST: {selectedClient.gstNumber}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedClient(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Total Billed</div>
                                    <div style={{ fontSize: '22px', fontWeight: '800' }}>₹{(selectedClient.totalBilled || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Total Received</div>
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>₹{(selectedClient.totalPaid || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                    <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '6px' }}>Pending Balance</div>
                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#f87171' }}>₹{(selectedClient.balance || 0).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Diwali Gift & Annual Business Card (for Travel Agents) */}
                            {selectedClient.clientType === 'Travel Agent' && (() => {
                                const annualBusiness = selectedClient.totalBilled || 0;
                                const totalBookingsCount = ledgerEntries.filter(e => e.type === 'Bill').length;

                                let tier = {
                                    name: 'Bronze Partner',
                                    badge: '🥉 BRONZE TIER',
                                    color: '#cd7f32',
                                    bg: 'rgba(205, 127, 50, 0.12)',
                                    border: 'rgba(205, 127, 50, 0.35)',
                                    gift: 'Executive Sweet Box + Festive Diwali Hamper',
                                    nextTier: 'Silver Partner (₹50,000+)'
                                };
                                if (annualBusiness >= 500000) {
                                    tier = {
                                        name: 'Diamond VIP Partner',
                                        badge: '💎 DIAMOND VIP TIER',
                                        color: '#38bdf8',
                                        bg: 'rgba(56, 189, 248, 0.12)',
                                        border: 'rgba(56, 189, 248, 0.4)',
                                        gift: 'Pure Silver Coin (20g) + Luxury Dry Fruit Hamper + Corporate Trophy',
                                        nextTier: 'Top Elite Partner Reached!'
                                    };
                                } else if (annualBusiness >= 200000) {
                                    tier = {
                                        name: 'Gold Elite Partner',
                                        badge: '🥇 GOLD ELITE TIER',
                                        color: '#fbbf24',
                                        bg: 'rgba(251, 191, 36, 0.12)',
                                        border: 'rgba(251, 191, 36, 0.4)',
                                        gift: 'Silver Coin (10g) + Premium Sweets & Dry Fruits Hamper',
                                        nextTier: 'Diamond Partner (₹5,00,000+)'
                                    };
                                } else if (annualBusiness >= 50000) {
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
                                        padding: '20px',
                                        marginBottom: '25px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ background: tier.color, color: '#000', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Gift size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: tier.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                                        Annual Business & Diwali Gift Eligibility
                                                    </div>
                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                                                        {tier.badge} — <span style={{ color: tier.color }}>{tier.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Total Business Provided</div>
                                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>₹{annualBusiness.toLocaleString('en-IN')}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Total Bookings</div>
                                                    <div style={{ fontSize: '18px', fontWeight: '800', color: tier.color }}>{totalBookingsCount} Tours</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'rgba(0,0,0,0.25)',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            fontSize: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)' }}>
                                                <Sparkles size={15} style={{ color: tier.color, flexShrink: 0 }} />
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Statement of Account</h3>
                                <button onClick={() => setShowPaymentModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                                    <Plus size={16} /> Record Payment
                                </button>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '14px 18px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '14px 18px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Particulars</th>
                                            <th style={{ padding: '14px 18px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                                            <th style={{ padding: '14px 18px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Debit (Bill)</th>
                                            <th style={{ padding: '14px 18px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Credit (Paid)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerLoading ? (
                                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>
                                        ) : ledgerEntries.length === 0 ? (
                                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No transactions recorded for this account.</td></tr>
                                        ) : (
                                            ledgerEntries.map((entry) => (
                                                <tr key={entry._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px' }}>{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px' }}>
                                                        <div>{entry.description}</div>
                                                        {entry.type === 'Bill' && entry.taxableAmount && (
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                                                                Base: ₹{entry.taxableAmount} | GST: ₹{entry.gstAmount}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px' }}>
                                                        <span style={{ 
                                                            padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                                            background: entry.type === 'Bill' ? 'rgba(59, 130, 246, 0.2)' : 
                                                                        entry.type === 'Fuel' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                            color: entry.type === 'Bill' ? '#60a5fa' : 
                                                                   entry.type === 'Fuel' ? '#fbbf24' : '#34d399'
                                                        }}>
                                                            {entry.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>
                                                        {entry.type === 'Bill' ? `₹${(entry.amount || 0).toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '700', textAlign: 'right', color: '#4ade80' }}>
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
