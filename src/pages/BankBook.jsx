import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Landmark, Plus, Search, Calendar, ArrowDownLeft, ArrowUpRight, 
    Wallet, CreditCard, Building2, CheckCircle, X, ExternalLink,
    Filter, RefreshCw, Trash2, Eye, Download, Image as ImageIcon
} from 'lucide-react';
import axios from '../api/axios';
import { useCompany } from '../context/CompanyContext';
import ImageUploader from '../components/common/ImageUploader';
import { todayIST } from '../utils/istUtils';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const BankBook = () => {
    const { selectedCompany } = useCompany();
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('all');
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [periodType, setPeriodType] = useState('monthly'); // 'daily' or 'monthly'
    const [filterDate, setFilterDate] = useState(todayIST());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [bankFormData, setBankFormData] = useState({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        ifsc: '',
        branch: '',
        upiId: '',
        openingBalance: ''
    });
    const [submittingBank, setSubmittingBank] = useState(false);

    const [showAddTxModal, setShowAddTxModal] = useState(false);
    const [txFormData, setTxFormData] = useState({
        bankAccountId: '',
        type: 'IN',
        amount: '',
        category: 'Advance Payment',
        paymentMode: 'UPI / QR Code',
        reference: '',
        description: '',
        date: todayIST()
    });
    const [txScreenshotFile, setTxScreenshotFile] = useState(null);
    const [submittingTx, setSubmittingTx] = useState(false);

    // Receipt preview modal

    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    // NEW FEATURES STATE
    const [showEditTxModal, setShowEditTxModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [editTxFormData, setEditTxFormData] = useState({ amount: '', date: '', description: '', category: '', paymentMode: '', reference: '' });
    const [submittingEditTx, setSubmittingEditTx] = useState(false);

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [txToDelete, setTxToDelete] = useState(null);


    // Fetch Bank Accounts
    const fetchBankAccounts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/banks/company/${selectedCompany._id}`);
            setBankAccounts(data || []);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    // Fetch Transactions
    const fetchTransactions = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            let url = `/api/banks/transactions/company/${selectedCompany._id}?bankAccountId=${selectedBankId}`;
            if (periodType === 'daily') {
                url += `&date=${filterDate}`;
            } else {
                url += `&month=${filterMonth}&year=${filterYear}`;
            }
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setTransactions(data.transactions || []);
            setStats(data.stats || { totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchBankAccounts();
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchTransactions();
        }
    }, [selectedCompany, selectedBankId, periodType, filterDate, filterMonth, filterYear, searchTerm]);

    // Create Bank Account
    const handleCreateBank = async (e) => {
        e.preventDefault();
        if (!bankFormData.bankName) {
            alert('Bank Name is required');
            return;
        }
        setSubmittingBank(true);
        try {
            const { data } = await axios.post('/api/banks', {
                ...bankFormData,
                company: selectedCompany._id
            });
            alert(`Bank account for "${data.bankName}" created successfully!`);
            setShowAddBankModal(false);
            setBankFormData({
                bankName: '',
                accountNumber: '',
                accountHolder: '',
                ifsc: '',
                branch: '',
                upiId: '',
                openingBalance: ''
            });
            await fetchBankAccounts();
            setSelectedBankId(data._id);
        } catch (err) {
            console.error('Error creating bank account:', err);
            alert(err.response?.data?.message || 'Failed to create bank account');
        } finally {
            setSubmittingBank(false);
        }
    };

    // Create Transaction
    const handleCreateTx = async (e) => {
        e.preventDefault();
        const targetBankId = txFormData.bankAccountId || (bankAccounts.length > 0 ? bankAccounts[0]._id : '');
        if (!targetBankId) {
            alert('Please select or create a bank account first');
            return;
        }
        if (!txFormData.amount || Number(txFormData.amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setSubmittingTx(true);
        try {
            let screenshotUrl = '';
            if (txScreenshotFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', txScreenshotFile);
                const uploadRes = await axios.post('/api/admin/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                screenshotUrl = uploadRes.data?.url || '';
            }

            await axios.post('/api/banks/transactions', {
                company: selectedCompany._id,
                bankAccountId: targetBankId,
                type: txFormData.type,
                amount: Number(txFormData.amount),
                category: txFormData.category,
                paymentMode: txFormData.paymentMode,
                reference: txFormData.reference,
                description: txFormData.description,
                paymentScreenshot: screenshotUrl,
                date: txFormData.date || todayIST()
            });

            setShowAddTxModal(false);
            setTxFormData({
                bankAccountId: '',
                type: 'IN',
                amount: '',
                category: 'Advance Payment',
                paymentMode: 'UPI / QR Code',
                reference: '',
                description: '',
                date: todayIST()
            });
            setTxScreenshotFile(null);
            await fetchBankAccounts();
            await fetchTransactions();
        } catch (err) {
            console.error('Error recording transaction:', err);
            alert(err.response?.data?.message || 'Failed to record transaction');
        } finally {
            setSubmittingTx(false);
        }
    };

    // Edit Transaction Setup
    const openEditTxModal = (tx) => {
        setEditingTx(tx);
        setEditTxFormData({
            amount: tx.amount || '',
            date: tx.date ? tx.date.substring(0, 10) : '',
            description: tx.description || '',
            category: tx.category || '',
            paymentMode: tx.paymentMode || '',
            reference: tx.reference || ''
        });
        setShowEditTxModal(true);
    };

    const submitEditTx = async (e) => {
        e.preventDefault();
        setSubmittingEditTx(true);
        try {
            await axios.put(`/api/banks/transactions/${editingTx._id}`, editTxFormData);
            setShowEditTxModal(false);
            setEditingTx(null);
            await fetchBankAccounts();
            await fetchTransactions();
        } catch (err) {
            console.error('Error editing tx:', err);
            alert('Failed to edit transaction');
        } finally {
            setSubmittingEditTx(false);
        }
    };

    // Delete Transaction Logic
    const handleDeleteClick = (tx) => {
        if (tx.bookingRef) {
            setTxToDelete(tx);
            setShowRevertModal(true);
        } else {
            if (window.confirm('Are you sure you want to delete this bank transaction? This will reverse its balance impact.')) {
                executeDeleteTx(tx._id, false);
            }
        }
    };

    const executeDeleteTx = async (id, revertBooking) => {
        try {
            await axios.delete(`/api/banks/transactions/${id}${revertBooking ? '?revertBooking=true' : ''}`);
            setShowRevertModal(false);
            setTxToDelete(null);
            await fetchBankAccounts();
            await fetchTransactions();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            alert(err.response?.data?.message || 'Failed to delete transaction');
        }
    };

    const darkInputStyle = {
        width: '100%',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        color: 'white',
        fontSize: '13px',
        outline: 'none'
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', color: 'white' }}>
            {/* Page Header */}
            <header style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ padding: '12px', background: '#3b82f6', borderRadius: '16px', color: '#fff' }}>
                            <Landmark size={28} />
                        </div>
                        Bank Book & Multi-Account Ledger
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>
                        Manage company bank accounts (HDFC, IDFC, etc.), track credits & debits, and verify sales payment receipts.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowAddBankModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'white',
                            fontWeight: '700',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <Building2 size={16} /> + Add Bank Account
                    </button>
                    <button
                        onClick={() => {
                            if (bankAccounts.length === 0) {
                                alert('Please create at least one Bank Account first!');
                                setShowAddBankModal(true);
                                return;
                            }
                            setTxFormData(prev => ({
                                ...prev,
                                bankAccountId: selectedBankId !== 'all' ? selectedBankId : bankAccounts[0]._id
                            }));
                            setShowAddTxModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#22c55e',
                            color: '#000',
                            fontWeight: '800',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <Plus size={18} /> + Record Bank Entry
                    </button>
                </div>
            </header>

            {/* Bank Accounts Tabs */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
                <button
                    onClick={() => setSelectedBankId('all')}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '14px',
                        border: selectedBankId === 'all' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                        background: selectedBankId === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minWidth: '170px',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Consolidated</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', margin: '4px 0' }}>All Bank Accounts</div>
                    <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '700' }}>
                        {bankAccounts.length} Active Accounts
                    </div>
                </button>

                {bankAccounts.map(b => (
                    <button
                        key={b._id}
                        onClick={() => setSelectedBankId(b._id)}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '14px',
                            border: selectedBankId === b._id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                            background: selectedBankId === b._id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                            color: 'white',
                            cursor: 'pointer',
                            textAlign: 'left',
                            minWidth: '200px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                {b.accountNumber ? `A/C: •••• ${b.accountNumber.slice(-4)}` : 'Bank A/C'}
                            </span>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '800', margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.bankName}
                        </div>
                        <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: '800' }}>
                            ₹{(b.currentBalance || 0).toLocaleString('en-IN')}
                        </div>
                    </button>
                ))}
            </div>

            {/* Stats KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <div className="premium-glass" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL RECEIVED (CREDIT)</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowDownLeft size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#4ade80' }}>
                        +₹{(stats.totalIn || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Inflows for selected period
                    </div>
                </div>

                <div className="premium-glass" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL PAID (DEBIT)</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#f87171' }}>
                        -₹{(stats.totalOut || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Outflows for selected period
                    </div>
                </div>

                <div className="premium-glass" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>NET PERIOD FLOW</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: stats.periodBalance >= 0 ? '#60a5fa' : '#fb923c' }}>
                        ₹{(stats.periodBalance || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Inflow minus Outflow
                    </div>
                </div>

                <div className="premium-glass" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>CLOSING BALANCE</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#c084fc' }}>
                        ₹{(stats.currentBalance || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        {selectedBankId === 'all' ? 'All active accounts combined' : 'Selected bank balance'}
                    </div>
                </div>
            </div>

            {/* Controls Bar: Daily / Monthly & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Period Switch */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                            onClick={() => setPeriodType('monthly')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '9px',
                                border: 'none',
                                background: periodType === 'monthly' ? '#3b82f6' : 'transparent',
                                color: periodType === 'monthly' ? '#fff' : 'rgba(255,255,255,0.7)',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Monthly View
                        </button>
                        <button
                            onClick={() => setPeriodType('daily')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '9px',
                                border: 'none',
                                background: periodType === 'daily' ? '#3b82f6' : 'transparent',
                                color: periodType === 'daily' ? '#fff' : 'rgba(255,255,255,0.7)',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Daily View
                        </button>
                    </div>

                    {periodType === 'monthly' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={filterMonth}
                                onChange={e => setFilterMonth(Number(e.target.value))}
                                className="premium-compact-input"
                                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', color: 'white', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                {MONTH_NAMES.map((m, idx) => (
                                    <option key={m} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={filterYear}
                                onChange={e => setFilterYear(Number(e.target.value))}
                                className="premium-compact-input"
                                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', color: 'white', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                                <option value={2027}>2027</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                onClick={e => e.target.showPicker?.()}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: 'white',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Search size={16} color="rgba(255,255,255,0.5)" />
                    <input
                        type="text"
                        placeholder="Search UTR, remark, category..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px 10px', outline: 'none', width: '220px', fontSize: '13px' }}
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="premium-glass" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Bank Account</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Particulars / Description</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Mode & Category</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>UTR / Ref</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Receipt</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Credit (In)</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Debit (Out)</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                    Loading bank entries...
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                    No bank transactions found for this period. Click "+ Record Bank Entry" to log a credit or debit.
                                </td>
                            </tr>
                        ) : (
                            transactions.map(tx => {
                                const isIn = tx.type === 'IN';
                                return (
                                    <tr key={tx._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '16px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700' }}>
                                            {tx.bankAccount?.bankName || tx.bankName || 'Bank'}
                                            {tx.bankAccount?.accountNumber && (
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                    •••• {tx.bankAccount.accountNumber.slice(-4)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                background: isIn ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: isIn ? '#4ade80' : '#f87171'
                                            }}>
                                                {isIn ? 'CREDIT (IN)' : 'DEBIT (OUT)'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                                            <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>
                                                {tx.description}
                                            </div>
                                            {tx.bookingRef && (
                                                <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', letterSpacing: '0.3px' }}>
                                                        {tx.bookingRef.bookingId}
                                                    </span>
                                                    {tx.bookingRef.clientCode && (
                                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                                            Client Code: <span style={{ color: '#e2e8f0', fontWeight: '800' }}>{tx.bookingRef.clientCode}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                            <div>{tx.category || 'General'}</div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{tx.paymentMode}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                                            {tx.reference || '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            {tx.paymentScreenshot ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewImageUrl(tx.paymentScreenshot)}
                                                    style={{
                                                        background: 'rgba(34, 197, 94, 0.1)',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                                        color: '#4ade80',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <ImageIcon size={12} /> View Receipt
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>No Receipt</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '800', textAlign: 'right', color: '#4ade80' }}>
                                            {isIn ? `₹${(tx.amount || 0).toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '800', textAlign: 'right', color: '#f87171' }}>
                                            {!isIn ? `₹${(tx.amount || 0).toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => openEditTxModal(tx)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.7)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Edit Entry"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(tx)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Delete Entry"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Add Bank Account */}
            <AnimatePresence>
                {showAddBankModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '26px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={22} color="#60a5fa" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Create Bank Account</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddBankModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateBank} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Bank Name (e.g. HDFC Bank, IDFC First Bank) *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HDFC Bank Ltd"
                                        value={bankFormData.bankName}
                                        onChange={e => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Account Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 50200012345678"
                                            value={bankFormData.accountNumber}
                                            onChange={e => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Account Holder Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Yatree Destination"
                                            value={bankFormData.accountHolder}
                                            onChange={e => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>IFSC Code</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. HDFC0001234"
                                            value={bankFormData.ifsc}
                                            onChange={e => setBankFormData({ ...bankFormData, ifsc: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Branch Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Jaipur Main Branch"
                                            value={bankFormData.branch}
                                            onChange={e => setBankFormData({ ...bankFormData, branch: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>UPI ID (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. yatree@hdfcbank"
                                            value={bankFormData.upiId}
                                            onChange={e => setBankFormData({ ...bankFormData, upiId: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Opening Balance (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 50000"
                                            value={bankFormData.openingBalance}
                                            onChange={e => setBankFormData({ ...bankFormData, openingBalance: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddBankModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingBank} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: submittingBank ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingBank ? 'Creating...' : 'Save Bank Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Record Bank Transaction */}
            <AnimatePresence>
                {showAddTxModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', background: '#0f172a', padding: '26px', border: '1px solid rgba(34, 197, 94, 0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Wallet size={22} color="#22c55e" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Record Bank Transaction</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddTxModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateTx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Type Toggle: IN vs OUT */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTxFormData({ ...txFormData, type: 'IN' })}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: txFormData.type === 'IN' ? '#22c55e' : 'rgba(255,255,255,0.05)',
                                            color: txFormData.type === 'IN' ? '#000' : 'rgba(255,255,255,0.7)',
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ArrowDownLeft size={16} /> Credit (Money In)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTxFormData({ ...txFormData, type: 'OUT' })}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: txFormData.type === 'OUT' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                            color: txFormData.type === 'OUT' ? '#fff' : 'rgba(255,255,255,0.7)',
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ArrowUpRight size={16} /> Debit (Money Out)
                                    </button>
                                </div>

                                {/* Bank Account Select */}
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Bank Account *</label>
                                    <select
                                        value={txFormData.bankAccountId}
                                        onChange={e => setTxFormData({ ...txFormData, bankAccountId: e.target.value })}
                                        className="premium-compact-input"
                                        style={{ width: '100%', height: '40px', background: 'rgba(0,0,0,0.35)', color: 'white', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                                        required
                                    >
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.bankName} {b.accountNumber ? `(•••• ${b.accountNumber.slice(-4)})` : ''} - Bal: ₹{(b.currentBalance || 0).toLocaleString('en-IN')}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Amount (₹) *</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 5000"
                                            value={txFormData.amount}
                                            onChange={e => setTxFormData({ ...txFormData, amount: e.target.value })}
                                            style={{ ...darkInputStyle, fontWeight: 'bold', fontSize: '15px' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date *</label>
                                        <input
                                            type="date"
                                            value={txFormData.date}
                                            onChange={e => setTxFormData({ ...txFormData, date: e.target.value })}
                                            onClick={e => e.target.showPicker?.()}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Category</label>
                                        <select
                                            value={txFormData.category}
                                            onChange={e => setTxFormData({ ...txFormData, category: e.target.value })}
                                            className="premium-compact-input"
                                            style={{ width: '100%', height: '40px', background: 'rgba(0,0,0,0.35)', color: 'white', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <option value="Advance Payment">Advance Payment</option>
                                            <option value="Full Settlement">Full Settlement</option>
                                            <option value="Fuel & Toll Expense">Fuel & Toll Expense</option>
                                            <option value="Driver Salary">Driver Salary</option>
                                            <option value="Fleet Maintenance">Fleet Maintenance</option>
                                            <option value="Office & Admin">Office & Admin</option>
                                            <option value="Tax & GST">Tax & GST</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Payment Mode</label>
                                        <select
                                            value={txFormData.paymentMode}
                                            onChange={e => setTxFormData({ ...txFormData, paymentMode: e.target.value })}
                                            className="premium-compact-input"
                                            style={{ width: '100%', height: '40px', background: 'rgba(0,0,0,0.35)', color: 'white', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <option value="UPI / QR Code">UPI / QR Code</option>
                                            <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                            <option value="IMPS">IMPS</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Cash Deposit">Cash Deposit</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Transaction Reference / UTR Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. UTR1234567890"
                                        value={txFormData.reference}
                                        onChange={e => setTxFormData({ ...txFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Particulars / Description *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Advance for Jaipur tour booking"
                                        value={txFormData.description}
                                        onChange={e => setTxFormData({ ...txFormData, description: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    />
                                </div>

                                {/* Payment Receipt Screenshot */}
                                <div>
                                    <ImageUploader
                                        file={txScreenshotFile}
                                        onChange={setTxScreenshotFile}
                                        label="Payment Screenshot / Receipt"
                                        color="#22c55e"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddTxModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingTx} style={{ flex: 1, padding: '12px', background: txFormData.type === 'IN' ? '#22c55e' : '#ef4444', color: txFormData.type === 'IN' ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: submittingTx ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingTx ? 'Saving Entry...' : 'Save Bank Entry'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Preview Screenshot / Receipt */}
            <AnimatePresence>
                {/* Edit Transaction Modal */}
            {showEditTxModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#0B1121', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>Edit Transaction</h2>
                        <form onSubmit={submitEditTx} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>AMOUNT</label>
                                    <input type="number" required style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.amount} onChange={e => setEditTxFormData({ ...editTxFormData, amount: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>DATE</label>
                                    <input type="date" required style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.date} onChange={e => setEditTxFormData({ ...editTxFormData, date: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>DESCRIPTION</label>
                                <input type="text" style={{ background: '#131C31', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }} value={editTxFormData.description} onChange={e => setEditTxFormData({ ...editTxFormData, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={() => setShowEditTxModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submittingEditTx} style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none', cursor: submittingEditTx ? 'not-allowed' : 'pointer', opacity: submittingEditTx ? 0.7 : 1 }}>
                                    {submittingEditTx ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revert Booking Modal */}
            {showRevertModal && txToDelete && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#0B1121', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>Delete Booking Payment</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                            This payment is linked to a Confirmed Booking (<strong>{txToDelete.bookingRef?.clientName}</strong>). When you delete this payment, what would you like to do with the Booking?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={() => executeDeleteTx(txToDelete._id, false)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Keep Booking Confirmed</span>
                                <span style={{ fontSize: '13px', opacity: 0.8 }}>Just remove this payment, leave booking intact.</span>
                            </button>
                            <button onClick={() => executeDeleteTx(txToDelete._id, true)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Revert to Open Lead</span>
                                <span style={{ fontSize: '13px', opacity: 0.8 }}>Delete this booking and move it back to Open Leads.</span>
                            </button>
                            <button onClick={() => { setShowRevertModal(false); setTxToDelete(null); }} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewImageUrl && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200000 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '90vw', maxHeight: '90vh', background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Payment Receipt / Screenshot</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <a
                                        href={previewImageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <ExternalLink size={14} /> Open Full
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImageUrl(null)}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                            <img
                                src={previewImageUrl}
                                alt="Receipt Preview"
                                style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', display: 'block', margin: '0 auto' }}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BankBook;
