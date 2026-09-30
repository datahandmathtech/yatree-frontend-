import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Landmark, Plus, Search, Calendar, ArrowDownLeft, ArrowUpRight, 
    Wallet, CreditCard, Building2, CheckCircle, X, ExternalLink,
    Filter, RefreshCw, Trash2, Eye, Download, Image as ImageIcon,
    Banknote, ArrowRightLeft, ShieldCheck, FileText, ArrowLeftRight
} from 'lucide-react';
import axios from '../api/axios';
import { useCompany } from '../context/CompanyContext';
import ImageUploader from '../components/common/ImageUploader';
import { todayIST, formatDateIST } from '../utils/istUtils';
import SEO from '../components/SEO';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CASH_CATEGORIES = [
    'All',
    'General Cash',
    'Bank Deposit',
    'Bank Withdrawal',
    'Advance Payment',
    'Guest Cash Collection',
    'Driver Cash Settlement',
    'Driver Advance',
    'Fuel / Vehicle Utility',
    'Office Expense',
    'Staff Salary Cash',
    'Other Expense'
];

const resolveReceiptUrl = (url) => {
    if (!url) return '';
    if (typeof url !== 'string') return '';
    if (url.startsWith('/uploads/attendance/taxi-fleet-crm/')) {
        return url.replace('/uploads/attendance/taxi-fleet-crm/', 'https://res.cloudinary.com/doaymwjki/image/upload/taxi-fleet-crm/');
    }
    if (url.startsWith('/uploads/taxi-fleet-crm/')) {
        return url.replace('/uploads/taxi-fleet-crm/', 'https://res.cloudinary.com/doaymwjki/image/upload/taxi-fleet-crm/');
    }
    return url;
};

const BankBook = ({ initialTab = 'bank' }) => {
    const { selectedCompany } = useCompany();
    const [activeTab, setActiveTab] = useState(initialTab); // 'bank' or 'cash'

    // ==========================================
    // 1. BANK BOOK STATE
    // ==========================================
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('all');
    const [transactions, setTransactions] = useState([]);
    const [bankStats, setBankStats] = useState({ totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
    const [bankLoading, setBankLoading] = useState(true);

    // Filters for Bank Book
    const [periodType, setPeriodType] = useState('monthly'); // 'daily' or 'monthly'
    const [filterDate, setFilterDate] = useState(todayIST());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Bank Modals
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

    const [showEditTxModal, setShowEditTxModal] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [editTxFormData, setEditTxFormData] = useState({ amount: '', date: '', description: '', category: '', paymentMode: '', reference: '' });
    const [submittingEditTx, setSubmittingEditTx] = useState(false);

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [txToDelete, setTxToDelete] = useState(null);

    // Image preview modal
    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    // ==========================================
    // 2. CASH BOOK STATE
    // ==========================================
    const [cashTransactions, setCashTransactions] = useState([]);
    const [cashStats, setCashStats] = useState({ totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
    const [cashLoading, setCashLoading] = useState(true);
    const [cashCategoryFilter, setCashCategoryFilter] = useState('All');

    // Cash Modals
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositFormData, setDepositFormData] = useState({
        bankAccountId: '',
        amount: '',
        date: todayIST(),
        reference: '',
        description: ''
    });
    const [depositReceiptFile, setDepositReceiptFile] = useState(null);
    const [submittingDeposit, setSubmittingDeposit] = useState(false);

    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawFormData, setWithdrawFormData] = useState({
        bankAccountId: '',
        amount: '',
        date: todayIST(),
        reference: '',
        description: ''
    });
    const [withdrawReceiptFile, setWithdrawReceiptFile] = useState(null);
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

    const [showAddCashModal, setShowAddCashModal] = useState(false);
    const [cashFormData, setCashFormData] = useState({
        type: 'IN',
        amount: '',
        category: 'General Cash',
        date: todayIST(),
        reference: '',
        description: '',
        guestName: '',
        driverName: ''
    });
    const [cashReceiptFile, setCashReceiptFile] = useState(null);
    const [submittingCash, setSubmittingCash] = useState(false);

    const [showEditCashModal, setShowEditCashModal] = useState(false);
    const [editingCashTx, setEditingCashTx] = useState(null);
    const [editCashFormData, setEditCashFormData] = useState({ amount: '', date: '', description: '', category: '', reference: '' });
    const [submittingEditCash, setSubmittingEditCash] = useState(false);

    // Sync tab when initialTab prop changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // ==========================================
    // DATA FETCHING: BANK BOOK
    // ==========================================
    const fetchBankAccounts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/banks/company/${selectedCompany._id}`);
            setBankAccounts(data || []);
            if (data?.length > 0 && !depositFormData.bankAccountId) {
                setDepositFormData(prev => ({ ...prev, bankAccountId: data[0]._id }));
            }
            if (data?.length > 0 && !withdrawFormData.bankAccountId) {
                setWithdrawFormData(prev => ({ ...prev, bankAccountId: data[0]._id }));
            }
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const fetchBankTransactions = async () => {
        if (!selectedCompany?._id) return;
        setBankLoading(true);
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
            setBankStats(data.stats || { totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
        } catch (err) {
            console.error('Error fetching bank transactions:', err);
        } finally {
            setBankLoading(false);
        }
    };

    // ==========================================
    // DATA FETCHING: CASH BOOK
    // ==========================================
    const fetchCashTransactions = async () => {
        if (!selectedCompany?._id) return;
        setCashLoading(true);
        try {
            let url = `/api/cash/company/${selectedCompany._id}`;
            const params = [];
            if (periodType === 'daily') {
                params.push(`date=${filterDate}`);
            } else {
                params.push(`month=${filterMonth}&year=${filterYear}`);
            }
            if (cashCategoryFilter && cashCategoryFilter !== 'All') {
                params.push(`category=${encodeURIComponent(cashCategoryFilter)}`);
            }
            if (searchTerm) {
                params.push(`search=${encodeURIComponent(searchTerm)}`);
            }
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const { data } = await axios.get(url);
            setCashTransactions(data.transactions || []);
            setCashStats(data.stats || { totalIn: 0, totalOut: 0, periodBalance: 0, currentBalance: 0 });
        } catch (err) {
            console.error('Error fetching cash transactions:', err);
        } finally {
            setCashLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchBankAccounts();
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedCompany?._id) {
            if (activeTab === 'bank') {
                fetchBankTransactions();
            } else {
                fetchCashTransactions();
            }
        }
    }, [selectedCompany, activeTab, selectedBankId, periodType, filterDate, filterMonth, filterYear, searchTerm, cashCategoryFilter]);

    // ==========================================
    // HANDLERS: BANK BOOK
    // ==========================================
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
            await fetchBankTransactions();
        } catch (err) {
            console.error('Error recording transaction:', err);
            alert(err.response?.data?.message || 'Failed to record transaction');
        } finally {
            setSubmittingTx(false);
        }
    };

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
            await fetchBankTransactions();
        } catch (err) {
            console.error('Error editing tx:', err);
            alert('Failed to edit transaction');
        } finally {
            setSubmittingEditTx(false);
        }
    };

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
            await fetchBankTransactions();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            alert(err.response?.data?.message || 'Failed to delete transaction');
        }
    };

    // ==========================================
    // HANDLERS: CASH BOOK
    // ==========================================
    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        if (!depositFormData.bankAccountId) {
            alert('Please select a target Bank Account');
            return;
        }
        if (!depositFormData.amount || Number(depositFormData.amount) <= 0) {
            alert('Please enter a valid deposit amount');
            return;
        }

        setSubmittingDeposit(true);
        try {
            let receiptPhotoUrl = '';
            if (depositReceiptFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', depositReceiptFile);
                const uploadRes = await axios.post('/api/admin/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                receiptPhotoUrl = uploadRes.data?.url || '';
            }

            const { data } = await axios.post('/api/cash/deposit-to-bank', {
                company: selectedCompany._id,
                bankAccountId: depositFormData.bankAccountId,
                amount: Number(depositFormData.amount),
                date: depositFormData.date || todayIST(),
                reference: depositFormData.reference,
                description: depositFormData.description,
                receiptPhoto: receiptPhotoUrl
            });

            alert(data.message || 'Cash deposited into bank successfully!');
            setShowDepositModal(false);
            setDepositFormData({
                bankAccountId: bankAccounts[0]?._id || '',
                amount: '',
                date: todayIST(),
                reference: '',
                description: ''
            });
            setDepositReceiptFile(null);
            await fetchBankAccounts();
            await fetchCashTransactions();
        } catch (err) {
            console.error('Error depositing cash:', err);
            alert(err.response?.data?.message || 'Failed to deposit cash into bank');
        } finally {
            setSubmittingDeposit(false);
        }
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (!withdrawFormData.bankAccountId) {
            alert('Please select a source Bank Account');
            return;
        }
        if (!withdrawFormData.amount || Number(withdrawFormData.amount) <= 0) {
            alert('Please enter a valid withdrawal amount');
            return;
        }

        setSubmittingWithdraw(true);
        try {
            let receiptPhotoUrl = '';
            if (withdrawReceiptFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', withdrawReceiptFile);
                const uploadRes = await axios.post('/api/admin/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                receiptPhotoUrl = uploadRes.data?.url || '';
            }

            const { data } = await axios.post('/api/cash/withdraw-from-bank', {
                company: selectedCompany._id,
                bankAccountId: withdrawFormData.bankAccountId,
                amount: Number(withdrawFormData.amount),
                date: withdrawFormData.date || todayIST(),
                reference: withdrawFormData.reference,
                description: withdrawFormData.description,
                receiptPhoto: receiptPhotoUrl
            });

            alert(data.message || 'Cash withdrawn from bank successfully!');
            setShowWithdrawModal(false);
            setWithdrawFormData({
                bankAccountId: bankAccounts[0]?._id || '',
                amount: '',
                date: todayIST(),
                reference: '',
                description: ''
            });
            setWithdrawReceiptFile(null);
            await fetchBankAccounts();
            await fetchCashTransactions();
        } catch (err) {
            console.error('Error withdrawing cash:', err);
            alert(err.response?.data?.message || 'Failed to withdraw cash from bank');
        } finally {
            setSubmittingWithdraw(false);
        }
    };

    const handleAddCashSubmit = async (e) => {
        e.preventDefault();
        if (!cashFormData.amount || Number(cashFormData.amount) <= 0) {
            alert('Please enter a valid cash amount');
            return;
        }

        setSubmittingCash(true);
        try {
            let receiptPhotoUrl = '';
            if (cashReceiptFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', cashReceiptFile);
                const uploadRes = await axios.post('/api/admin/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                receiptPhotoUrl = uploadRes.data?.url || '';
            }

            await axios.post('/api/cash/transactions', {
                company: selectedCompany._id,
                type: cashFormData.type,
                amount: Number(cashFormData.amount),
                category: cashFormData.category,
                date: cashFormData.date || todayIST(),
                reference: cashFormData.reference,
                description: cashFormData.description,
                guestName: cashFormData.guestName,
                driverName: cashFormData.driverName,
                receiptPhoto: receiptPhotoUrl
            });

            setShowAddCashModal(false);
            setCashFormData({
                type: 'IN',
                amount: '',
                category: 'General Cash',
                date: todayIST(),
                reference: '',
                description: '',
                guestName: '',
                driverName: ''
            });
            setCashReceiptFile(null);
            await fetchCashTransactions();
        } catch (err) {
            console.error('Error adding cash transaction:', err);
            alert(err.response?.data?.message || 'Failed to record cash transaction');
        } finally {
            setSubmittingCash(false);
        }
    };

    const openEditCashModal = (tx) => {
        setEditingCashTx(tx);
        setEditCashFormData({
            amount: tx.amount || '',
            date: tx.date ? tx.date.substring(0, 10) : todayIST(),
            description: tx.description || '',
            category: tx.category || 'General Cash',
            reference: tx.reference || ''
        });
        setShowEditCashModal(true);
    };

    const submitEditCash = async (e) => {
        e.preventDefault();
        setSubmittingEditCash(true);
        try {
            await axios.put(`/api/cash/transactions/${editingCashTx._id}`, editCashFormData);
            setShowEditCashModal(false);
            setEditingCashTx(null);
            await fetchCashTransactions();
        } catch (err) {
            console.error('Error editing cash tx:', err);
            alert('Failed to edit cash transaction');
        } finally {
            setSubmittingEditCash(false);
        }
    };

    const handleDeleteCashClick = async (tx) => {
        if (window.confirm(`Are you sure you want to delete this cash entry (${tx.type === 'IN' ? '+' : '-'}₹${tx.amount})? This will revert its impact on Company Cash Balance.`)) {
            try {
                await axios.delete(`/api/cash/transactions/${tx._id}`);
                await fetchCashTransactions();
                if (tx.bankAccount) {
                    await fetchBankAccounts();
                }
            } catch (err) {
                console.error('Error deleting cash transaction:', err);
                alert(err.response?.data?.message || 'Failed to delete cash transaction');
            }
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

    const selectedDepositBank = bankAccounts.find(b => b._id === depositFormData.bankAccountId) || bankAccounts[0];
    const selectedWithdrawBank = bankAccounts.find(b => b._id === withdrawFormData.bankAccountId) || bankAccounts[0];

    return (
        <div style={{ padding: '15px', maxWidth: '1600px', margin: '0 auto', color: 'white' }}>
            <SEO title={activeTab === 'bank' ? 'Bank Book & Ledger' : 'Cash Book & Cash Ledger'} description="Track multi-bank accounts and cash in hand ledger." />

            {/* TOP NAVIGATION TABS: BANK BOOK vs CASH BOOK */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '15px',
                background: 'rgba(0,0,0,0.4)',
                padding: '6px',
                borderRadius: '16px',
                width: 'fit-content',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 22px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'bank' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'bank' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'bank' ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                >
                    <Landmark size={18} />
                    <span>🏦 Bank Book / Ledger</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('cash')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 22px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'cash' ? '#10b981' : 'transparent',
                        color: activeTab === 'cash' ? '#000000' : 'rgba(255,255,255,0.6)',
                        fontWeight: '900',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'cash' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                >
                    <Banknote size={18} />
                    <span>💵 Cash Book / Cash Ledger</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: BANK BOOK                                                          */}
            {/* ========================================================================= */}
            {activeTab === 'bank' && (
                <div>
                    {/* Header */}
                    <header style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h1 style={{ fontSize: '30px', fontWeight: '900', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '10px', background: '#3b82f6', borderRadius: '14px', color: '#fff' }}>
                                    <Landmark size={26} />
                                </div>
                                Bank Book & Multi-Account Ledger
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '14px' }}>
                                Manage company bank accounts (HDFC, IDFC, ICICI, etc.), track credits & debits, and verify sales payment receipts.
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

                    {/* Bank Accounts Sub-tabs */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '15px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL RECEIVED (CREDIT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowDownLeft size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#4ade80' }}>
                                +₹{(bankStats.totalIn || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Inflows for selected period
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL PAID (DEBIT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#f87171' }}>
                                -₹{(bankStats.totalOut || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Outflows for selected period
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>NET PERIOD FLOW</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: bankStats.periodBalance >= 0 ? '#60a5fa' : '#fb923c' }}>
                                ₹{(bankStats.periodBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Inflow minus Outflow
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>CLOSING BALANCE</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#c084fc' }}>
                                ₹{(bankStats.currentBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                {selectedBankId === 'all' ? 'All active accounts combined' : 'Selected bank balance'}
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar: Daily / Monthly & Search */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                    {/* Bank Transactions Table */}
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
                                {bankLoading ? (
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
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: CASH BOOK / CASH IN HAND LEDGER                                    */}
            {/* ========================================================================= */}
            {activeTab === 'cash' && (
                <div>
                    {/* Header */}
                    <header style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h1 style={{ fontSize: '30px', fontWeight: '900', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '10px', background: '#10b981', borderRadius: '14px', color: '#000' }}>
                                    <Banknote size={26} />
                                </div>
                                Cash Book & Cash in Hand Ledger
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '14px' }}>
                                Real-time cash tracking: physical cash in hand, collections from guests/drivers, daily cash expenditures, and bank deposits.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (bankAccounts.length === 0) {
                                        alert('Please create at least one Bank Account first before depositing cash into bank!');
                                        setShowAddBankModal(true);
                                        return;
                                    }
                                    setDepositFormData(prev => ({
                                        ...prev,
                                        bankAccountId: bankAccounts[0]._id,
                                        date: todayIST()
                                    }));
                                    setShowDepositModal(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    color: '#38bdf8',
                                    fontWeight: '800',
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                <ArrowRightLeft size={16} /> 🏦 Deposit Cash to Bank
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (bankAccounts.length === 0) {
                                        alert('Please create at least one Bank Account first before withdrawing cash!');
                                        setShowAddBankModal(true);
                                        return;
                                    }
                                    setWithdrawFormData(prev => ({
                                        ...prev,
                                        bankAccountId: bankAccounts[0]._id,
                                        date: todayIST()
                                    }));
                                    setShowWithdrawModal(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    color: '#fbbf24',
                                    fontWeight: '800',
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                <ArrowLeftRight size={16} /> 🏧 Withdraw Cash from Bank
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setCashFormData({
                                        type: 'IN',
                                        amount: '',
                                        category: 'General Cash',
                                        date: todayIST(),
                                        reference: '',
                                        description: '',
                                        guestName: '',
                                        driverName: ''
                                    });
                                    setShowAddCashModal(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#10b981',
                                    color: '#000',
                                    fontWeight: '900',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <Plus size={18} /> + Record Cash Entry
                            </button>
                        </div>
                    </header>

                    {/* Stats KPI Grid for Cash Book */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL CASH RECEIVED (IN)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowDownLeft size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>
                                +₹{(cashStats.totalIn || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Cash inflows for selected period
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>TOTAL CASH PAID (OUT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#f87171' }}>
                                -₹{(cashStats.totalOut || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Cash outflows & bank deposits
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>NET PERIOD CASH FLOW</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: cashStats.periodBalance >= 0 ? '#38bdf8' : '#fb923c' }}>
                                ₹{(cashStats.periodBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                Net Cash Movement
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.4)', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '900', letterSpacing: '0.5px' }}>💵 CASH IN HAND BALANCE</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: '950', color: '#fbbf24' }}>
                                ₹{(cashStats.currentBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Physical cash available in office / company
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar: Daily / Monthly & Search & Category */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <button
                                    onClick={() => setPeriodType('monthly')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '9px',
                                        border: 'none',
                                        background: periodType === 'monthly' ? '#10b981' : 'transparent',
                                        color: periodType === 'monthly' ? '#000' : 'rgba(255,255,255,0.7)',
                                        fontWeight: '800',
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
                                        background: periodType === 'daily' ? '#10b981' : 'transparent',
                                        color: periodType === 'daily' ? '#000' : 'rgba(255,255,255,0.7)',
                                        fontWeight: '800',
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

                            {/* Category Filter */}
                            <select
                                value={cashCategoryFilter}
                                onChange={e => setCashCategoryFilter(e.target.value)}
                                style={{
                                    padding: '8px 14px',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: 'white',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                }}
                            >
                                {CASH_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat} style={{ background: '#090f1d' }}>Category: {cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Search size={16} color="rgba(255,255,255,0.5)" />
                            <input
                                type="text"
                                placeholder="Search cash remarks, ref, guest, driver..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px 10px', outline: 'none', width: '240px', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* Cash Transactions Table */}
                    <div className="premium-glass" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Category</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Particulars / Description</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Voucher / Slip Ref</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Receipt</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Cash Received (IN)</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Cash Paid (OUT)</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashLoading ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                            Loading cash entries...
                                        </td>
                                    </tr>
                                ) : cashTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                            No cash transactions recorded for this period. Click "+ Record Cash Entry" or "Deposit Cash to Bank" to log cash movement.
                                        </td>
                                    </tr>
                                ) : (
                                    cashTransactions.map(tx => {
                                        const isIn = tx.type === 'IN';
                                        return (
                                            <tr key={tx._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ padding: '16px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '900',
                                                        background: isIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: isIn ? '#10b981' : '#f87171',
                                                        border: `1px solid ${isIn ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                                    }}>
                                                        {isIn ? 'CASH IN' : 'CASH OUT'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: tx.category === 'Bank Deposit' ? 'rgba(56, 189, 248, 0.15)' : tx.category === 'Bank Withdrawal' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: tx.category === 'Bank Deposit' ? '#38bdf8' : tx.category === 'Bank Withdrawal' ? '#fbbf24' : 'rgba(255,255,255,0.85)',
                                                        border: `1px solid ${tx.category === 'Bank Deposit' ? 'rgba(56, 189, 248, 0.3)' : tx.category === 'Bank Withdrawal' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.1)'}`
                                                    }}>
                                                        {tx.category || 'General Cash'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                                                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>
                                                        {tx.description || '-'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                                        {tx.bankAccount && (
                                                            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                                                                🏦 {tx.bankAccount.bankName || tx.bankName}
                                                            </span>
                                                        )}
                                                        {tx.guestName && (
                                                            <span style={{ fontSize: '11px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px' }}>
                                                                👤 Guest: {tx.guestName}
                                                            </span>
                                                        )}
                                                        {tx.driverName && (
                                                            <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px' }}>
                                                                🚖 Driver: {tx.driverName}
                                                            </span>
                                                        )}
                                                        {tx.bookingRef && (
                                                            <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>
                                                                Booking: {tx.bookingRef.clientCode || tx.bookingRef.bookingId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                                                    {tx.reference || '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                    {tx.receiptPhoto ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewImageUrl(tx.receiptPhoto)}
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                                color: '#10b981',
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
                                                            <ImageIcon size={12} /> View Photo
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>No Photo</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '800', textAlign: 'right', color: '#10b981' }}>
                                                    {isIn ? `+₹${(tx.amount || 0).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '800', textAlign: 'right', color: '#f87171' }}>
                                                    {!isIn ? `-₹${(tx.amount || 0).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditCashModal(tx)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'rgba(255,255,255,0.7)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px'
                                                        }}
                                                        title="Edit Cash Entry"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCashClick(tx)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'rgba(255,255,255,0.3)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px'
                                                        }}
                                                        title="Delete Cash Entry"
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
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODALS: BANK & CASH BOOK                                                  */}
            {/* ========================================================================= */}

            {/* Modal: Add Bank Account */}
            <AnimatePresence>
                {showAddBankModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
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
                                            placeholder="e.g. Yatree Travels Pvt Ltd"
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
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>UPI ID (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. company@hdfcbank"
                                            value={bankFormData.upiId}
                                            onChange={e => setBankFormData({ ...bankFormData, upiId: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Opening Balance (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={bankFormData.openingBalance}
                                        onChange={e => setBankFormData({ ...bankFormData, openingBalance: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddBankModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingBank} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: submittingBank ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingBank ? 'Saving...' : 'Save Bank Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Add Bank Transaction */}
            <AnimatePresence>
                {showAddTxModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '500px', background: '#0f172a', padding: '26px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Landmark size={22} color="#4ade80" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Record Bank Entry</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddTxModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateTx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Select Bank Account *</label>
                                    <select
                                        value={txFormData.bankAccountId}
                                        onChange={e => setTxFormData({ ...txFormData, bankAccountId: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    >
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id} style={{ background: '#090f1d' }}>
                                                {b.bankName} {b.accountNumber ? `(•••• ${b.accountNumber.slice(-4)})` : ''} - Bal: ₹{(b.currentBalance || 0).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Entry Type</label>
                                        <select
                                            value={txFormData.type}
                                            onChange={e => setTxFormData({ ...txFormData, type: e.target.value })}
                                            style={darkInputStyle}
                                        >
                                            <option value="IN" style={{ background: '#090f1d' }}>🟢 CREDIT (Money IN)</option>
                                            <option value="OUT" style={{ background: '#090f1d' }}>🔴 DEBIT (Money OUT)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Amount (₹) *</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={txFormData.amount}
                                            onChange={e => setTxFormData({ ...txFormData, amount: e.target.value })}
                                            style={{ ...darkInputStyle, fontWeight: '800', color: txFormData.type === 'IN' ? '#4ade80' : '#f87171' }}
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Payment Mode</label>
                                        <select
                                            value={txFormData.paymentMode}
                                            onChange={e => setTxFormData({ ...txFormData, paymentMode: e.target.value })}
                                            style={darkInputStyle}
                                        >
                                            <option value="UPI / QR Code" style={{ background: '#090f1d' }}>UPI / QR Code</option>
                                            <option value="Bank Transfer / NEFT" style={{ background: '#090f1d' }}>NEFT / RTGS / IMPS</option>
                                            <option value="Cheque" style={{ background: '#090f1d' }}>Cheque</option>
                                            <option value="Cash" style={{ background: '#090f1d' }}>Cash Deposit</option>
                                            <option value="Other" style={{ background: '#090f1d' }}>Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date</label>
                                        <input
                                            type="date"
                                            value={txFormData.date}
                                            onChange={e => setTxFormData({ ...txFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Advance Payment, Final Tour Settlement, Office Expense..."
                                        value={txFormData.category}
                                        onChange={e => setTxFormData({ ...txFormData, category: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Transaction Ref / UTR / Cheque No</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. UTR12345678"
                                        value={txFormData.reference}
                                        onChange={e => setTxFormData({ ...txFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Particulars / Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Notes about this transaction..."
                                        value={txFormData.description}
                                        onChange={e => setTxFormData({ ...txFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>
                                <div>
                                    <ImageUploader
                                        file={txScreenshotFile}
                                        onChange={setTxScreenshotFile}
                                        label="Bank Slip / Receipt Screenshot (Optional)"
                                        color="#22c55e"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddTxModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingTx} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', cursor: submittingTx ? 'not-allowed' : 'pointer', fontWeight: '900' }}>
                                        {submittingTx ? 'Recording...' : 'Record Transaction'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Deposit Cash into Bank (Cash ➔ Bank Transfer) */}
            <AnimatePresence>
                {showDepositModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', background: '#0f172a', padding: '26px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '10px', color: '#38bdf8' }}>
                                        <ArrowRightLeft size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '900' }}>Deposit Cash into Bank</h3>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Cash in Hand ➔ Bank Account Transfer</span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowDepositModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Current Balances Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>Available Cash in Hand</div>
                                    <div style={{ fontSize: '17px', fontWeight: '950', color: '#fbbf24', marginTop: '2px' }}>₹{(cashStats.currentBalance || 0).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>Target Bank Balance</div>
                                    <div style={{ fontSize: '17px', fontWeight: '950', color: '#38bdf8', marginTop: '2px' }}>₹{(selectedDepositBank?.currentBalance || 0).toLocaleString()}</div>
                                </div>
                            </div>

                            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Target Bank Account *</label>
                                    <select
                                        value={depositFormData.bankAccountId}
                                        onChange={e => setDepositFormData({ ...depositFormData, bankAccountId: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    >
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id} style={{ background: '#090f1d' }}>
                                                {b.bankName} {b.accountNumber ? `(A/C •••• ${b.accountNumber.slice(-4)})` : ''} - Current: ₹{(b.currentBalance || 0).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Deposit Amount (₹) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 20000"
                                            value={depositFormData.amount}
                                            onChange={e => setDepositFormData({ ...depositFormData, amount: e.target.value })}
                                            style={{ ...darkInputStyle, fontSize: '16px', fontWeight: '800', color: '#38bdf8' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Deposit Date *</label>
                                        <input
                                            type="date"
                                            value={depositFormData.date}
                                            onChange={e => setDepositFormData({ ...depositFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Live Balance Impact */}
                                {Number(depositFormData.amount) > 0 && (
                                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Cash in Hand:</span>
                                            <span style={{ fontWeight: '800', color: '#fbbf24' }}>
                                                ₹{(cashStats.currentBalance || 0).toLocaleString()} ➔ ₹{((cashStats.currentBalance || 0) - Number(depositFormData.amount)).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{selectedDepositBank?.bankName || 'Bank'} A/C:</span>
                                            <span style={{ fontWeight: '800', color: '#38bdf8' }}>
                                                ₹{(selectedDepositBank?.currentBalance || 0).toLocaleString()} ➔ ₹{((selectedDepositBank?.currentBalance || 0) + Number(depositFormData.amount)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Bank Deposit Slip No / Reference</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SLIP-8849 / CDM-REF"
                                        value={depositFormData.reference}
                                        onChange={e => setDepositFormData({ ...depositFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description / Remarks</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Deposited tour cash collection into HDFC Bank account..."
                                        value={depositFormData.description}
                                        onChange={e => setDepositFormData({ ...depositFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>

                                <div>
                                    <ImageUploader
                                        file={depositReceiptFile}
                                        onChange={setDepositReceiptFile}
                                        label="Bank Deposit Slip / Stamped Challan Photo"
                                        color="#38bdf8"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowDepositModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingDeposit} style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '8px', cursor: submittingDeposit ? 'not-allowed' : 'pointer', fontWeight: '900' }}>
                                        {submittingDeposit ? 'Processing Deposit...' : 'Confirm Deposit to Bank'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Withdraw Cash from Bank (Bank ➔ Cash Transfer) */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', background: '#0f172a', padding: '26px', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ padding: '8px', background: 'rgba(251, 191, 36, 0.15)', borderRadius: '10px', color: '#fbbf24' }}>
                                        <ArrowLeftRight size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '900' }}>Withdraw Cash from Bank</h3>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Bank Account ➔ Cash in Hand Transfer</span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowWithdrawModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Source Bank Account *</label>
                                    <select
                                        value={withdrawFormData.bankAccountId}
                                        onChange={e => setWithdrawFormData({ ...withdrawFormData, bankAccountId: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    >
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id} style={{ background: '#090f1d' }}>
                                                {b.bankName} {b.accountNumber ? `(A/C •••• ${b.accountNumber.slice(-4)})` : ''} - Available: ₹{(b.currentBalance || 0).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Withdrawal Amount (₹) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 15000"
                                            value={withdrawFormData.amount}
                                            onChange={e => setWithdrawFormData({ ...withdrawFormData, amount: e.target.value })}
                                            style={{ ...darkInputStyle, fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Withdrawal Date *</label>
                                        <input
                                            type="date"
                                            value={withdrawFormData.date}
                                            onChange={e => setWithdrawFormData({ ...withdrawFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Live Balance Impact */}
                                {Number(withdrawFormData.amount) > 0 && (
                                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{selectedWithdrawBank?.bankName || 'Bank'} A/C:</span>
                                            <span style={{ fontWeight: '800', color: '#f87171' }}>
                                                ₹{(selectedWithdrawBank?.currentBalance || 0).toLocaleString()} ➔ ₹{((selectedWithdrawBank?.currentBalance || 0) - Number(withdrawFormData.amount)).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Cash in Hand:</span>
                                            <span style={{ fontWeight: '800', color: '#10b981' }}>
                                                ₹{(cashStats.currentBalance || 0).toLocaleString()} ➔ ₹{((cashStats.currentBalance || 0) + Number(withdrawFormData.amount)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Cheque No / Self Withdrawal Ref / ATM</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CHEQUE-102948 / ATM-WDL"
                                        value={withdrawFormData.reference}
                                        onChange={e => setWithdrawFormData({ ...withdrawFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description / Remarks</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Cash self-withdrawal for driver advances and office petty cash..."
                                        value={withdrawFormData.description}
                                        onChange={e => setWithdrawFormData({ ...withdrawFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>

                                <div>
                                    <ImageUploader
                                        file={withdrawReceiptFile}
                                        onChange={setWithdrawReceiptFile}
                                        label="ATM Slip / Cheque Leaf Photo (Optional)"
                                        color="#fbbf24"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingWithdraw} style={{ flex: 1, padding: '12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', cursor: submittingWithdraw ? 'not-allowed' : 'pointer', fontWeight: '900' }}>
                                        {submittingWithdraw ? 'Processing Withdrawal...' : 'Confirm Withdrawal to Cash'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Add General Cash Entry (Cash IN / Cash OUT) */}
            <AnimatePresence>
                {showAddCashModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', background: '#0f172a', padding: '26px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: '#10b981' }}>
                                        <Banknote size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Record Cash Entry</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddCashModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Cash Flow Type *</label>
                                        <select
                                            value={cashFormData.type}
                                            onChange={e => setCashFormData({ ...cashFormData, type: e.target.value })}
                                            style={{ ...darkInputStyle, fontWeight: '800' }}
                                        >
                                            <option value="IN" style={{ background: '#090f1d', color: '#10b981' }}>🟢 CASH IN (Receipt)</option>
                                            <option value="OUT" style={{ background: '#090f1d', color: '#f87171' }}>🔴 CASH OUT (Payment)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Amount (₹) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="0"
                                            value={cashFormData.amount}
                                            onChange={e => setCashFormData({ ...cashFormData, amount: e.target.value })}
                                            style={{ ...darkInputStyle, fontSize: '16px', fontWeight: '800', color: cashFormData.type === 'IN' ? '#10b981' : '#f87171' }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Category</label>
                                        <select
                                            value={cashFormData.category}
                                            onChange={e => setCashFormData({ ...cashFormData, category: e.target.value })}
                                            style={darkInputStyle}
                                        >
                                            <option value="General Cash" style={{ background: '#090f1d' }}>General Cash</option>
                                            <option value="Guest Cash Collection" style={{ background: '#090f1d' }}>Guest Cash Collection</option>
                                            <option value="Advance Payment" style={{ background: '#090f1d' }}>Advance Payment</option>
                                            <option value="Driver Cash Settlement" style={{ background: '#090f1d' }}>Driver Cash Settlement</option>
                                            <option value="Driver Advance" style={{ background: '#090f1d' }}>Driver Advance</option>
                                            <option value="Fuel / Vehicle Utility" style={{ background: '#090f1d' }}>Fuel / Utility Expense</option>
                                            <option value="Office Expense" style={{ background: '#090f1d' }}>Office Expense</option>
                                            <option value="Staff Salary Cash" style={{ background: '#090f1d' }}>Staff Salary Cash</option>
                                            <option value="Other Expense" style={{ background: '#090f1d' }}>Other Expense</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date *</label>
                                        <input
                                            type="date"
                                            value={cashFormData.date}
                                            onChange={e => setCashFormData({ ...cashFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Guest Name (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Ramesh Sharma"
                                            value={cashFormData.guestName}
                                            onChange={e => setCashFormData({ ...cashFormData, guestName: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Driver Name (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Sanjay Kumar"
                                            value={cashFormData.driverName}
                                            onChange={e => setCashFormData({ ...cashFormData, driverName: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Voucher / Receipt No (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. VCH-00492"
                                        value={cashFormData.reference}
                                        onChange={e => setCashFormData({ ...cashFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description / Remarks</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Details of cash payment or collection..."
                                        value={cashFormData.description}
                                        onChange={e => setCashFormData({ ...cashFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>

                                <div>
                                    <ImageUploader
                                        file={cashReceiptFile}
                                        onChange={setCashReceiptFile}
                                        label="Cash Receipt / Voucher Bill Photo"
                                        color="#10b981"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddCashModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingCash} style={{ flex: 1, padding: '12px', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', cursor: submittingCash ? 'not-allowed' : 'pointer', fontWeight: '900' }}>
                                        {submittingCash ? 'Recording...' : 'Record Cash Entry'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Edit Cash Transaction */}
            <AnimatePresence>
                {showEditCashModal && editingCashTx && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '26px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Edit Cash Transaction</h3>
                                <button type="button" onClick={() => setShowEditCashModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={submitEditCash} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={editCashFormData.amount}
                                        onChange={e => setEditCashFormData({ ...editCashFormData, amount: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date</label>
                                        <input
                                            type="date"
                                            value={editCashFormData.date}
                                            onChange={e => setEditCashFormData({ ...editCashFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Category</label>
                                        <input
                                            type="text"
                                            value={editCashFormData.category}
                                            onChange={e => setEditCashFormData({ ...editCashFormData, category: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Voucher / Slip Reference</label>
                                    <input
                                        type="text"
                                        value={editCashFormData.reference}
                                        onChange={e => setEditCashFormData({ ...editCashFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description</label>
                                    <textarea
                                        rows={2}
                                        value={editCashFormData.description}
                                        onChange={e => setEditCashFormData({ ...editCashFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowEditCashModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingEditCash} style={{ flex: 1, padding: '12px', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', cursor: submittingEditCash ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingEditCash ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Edit Bank Transaction */}
            <AnimatePresence>
                {showEditTxModal && editingTx && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '26px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Edit Bank Transaction</h3>
                                <button type="button" onClick={() => setShowEditTxModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={submitEditTx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={editTxFormData.amount}
                                        onChange={e => setEditTxFormData({ ...editTxFormData, amount: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Date</label>
                                        <input
                                            type="date"
                                            value={editTxFormData.date}
                                            onChange={e => setEditTxFormData({ ...editTxFormData, date: e.target.value })}
                                            style={darkInputStyle}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Payment Mode</label>
                                        <input
                                            type="text"
                                            value={editTxFormData.paymentMode}
                                            onChange={e => setEditTxFormData({ ...editTxFormData, paymentMode: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Category</label>
                                    <input
                                        type="text"
                                        value={editTxFormData.category}
                                        onChange={e => setEditTxFormData({ ...editTxFormData, category: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>UTR / Reference No</label>
                                    <input
                                        type="text"
                                        value={editTxFormData.reference}
                                        onChange={e => setEditTxFormData({ ...editTxFormData, reference: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Description</label>
                                    <textarea
                                        rows={2}
                                        value={editTxFormData.description}
                                        onChange={e => setEditTxFormData({ ...editTxFormData, description: e.target.value })}
                                        style={{ ...darkInputStyle, resize: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowEditTxModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingEditTx} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: submittingEditTx ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingEditTx ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Delete/Revert Confirmation for Linked Booking Entry */}
            <AnimatePresence>
                {showRevertModal && txToDelete && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '26px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                                    <Trash2 size={24} />
                                </div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Delete Linked Transaction</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '6px', lineHeight: '1.5' }}>
                                    This entry is linked to confirmed booking <strong>{txToDelete.bookingRef?.bookingId || 'Tour'}</strong> (Amount: ₹{txToDelete.amount?.toLocaleString()}).
                                    Would you like to also revert the advance on the booking?
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => executeDeleteTx(txToDelete._id, true)}
                                    style={{
                                        padding: '12px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '13px'
                                    }}
                                >
                                    Delete & Revert Booking Advance
                                </button>
                                <button
                                    type="button"
                                    onClick={() => executeDeleteTx(txToDelete._id, false)}
                                    style={{
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '13px'
                                    }}
                                >
                                    Delete Bank Entry Only (Keep Booking)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowRevertModal(false); setTxToDelete(null); }}
                                    style={{
                                        padding: '10px',
                                        background: 'transparent',
                                        color: 'rgba(255,255,255,0.5)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Receipt Image Preview */}
            <AnimatePresence>
                {previewImageUrl && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200000, padding: '20px' }}>
                        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'absolute', top: '-18px', right: '-18px', display: 'flex', gap: '8px', zIndex: 10 }}>
                                <a
                                    href={resolveReceiptUrl(previewImageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#38bdf8',
                                        color: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                        transition: 'transform 0.2s'
                                    }}
                                    title="Open Full Image in New Tab"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewImageUrl(null)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                        transition: 'transform 0.2s'
                                    }}
                                    title="Close Preview"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <img
                                src={resolveReceiptUrl(previewImageUrl)}
                                alt="Payment Receipt"
                                onError={(e) => {
                                    if (!e.target.dataset.triedJpg && !e.target.src.endsWith('.jpg') && !e.target.src.endsWith('.png')) {
                                        e.target.dataset.triedJpg = 'true';
                                        e.target.src = e.target.src + '.jpg';
                                    }
                                }}
                                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 25px 50px rgba(0,0,0,0.8)', background: '#0b1120' }}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BankBook;
