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

    // Filters for Bank Book (Strictly 1-Day Book — No Carry-Forward)
    const [periodType, setPeriodType] = useState('daily');
    const [filterDate, setFilterDate] = useState(todayIST());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const shiftFilterDate = (deltaDays) => {
        if (!filterDate) return;
        const d = new Date(`${filterDate}T12:00:00`);
        if (isNaN(d.getTime())) return;
        d.setDate(d.getDate() + deltaDays);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFilterDate(`${yyyy}-${mm}-${dd}`);
    };

    // Bank Modals
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [editingBankId, setEditingBankId] = useState(null);
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

    // Guest / Client Ledger list for direct Bank & Cash entries
    const [guestOptions, setGuestOptions] = useState([]);
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [showGuestDropdown, setShowGuestDropdown] = useState(false);

    const [showAddTxModal, setShowAddTxModal] = useState(false);
    const [txFormData, setTxFormData] = useState({
        bankAccountId: '',
        type: 'IN',
        amount: '',
        category: 'Advance Payment',
        paymentMode: 'UPI / QR Code',
        reference: '',
        description: '',
        date: todayIST(),
        bookingRef: '',
        clientId: '',
        guestName: ''
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
        driverName: '',
        bookingRef: '',
        clientId: ''
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
    // DATA FETCHING: BANK BOOK & GUEST LEDGER LIST
    // ==========================================
    const fetchGuestLedgerOptions = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [bkgRes, clientRes] = await Promise.all([
                axios.get(`/api/bookings/${selectedCompany._id}`).catch(() => ({ data: [] })),
                axios.get(`/api/clients/${selectedCompany._id}`).catch(() => ({ data: [] }))
            ]);
            const bookingsData = Array.isArray(bkgRes.data) ? bkgRes.data : [];
            const clientsData = Array.isArray(clientRes.data) ? clientRes.data : [];

            const options = [];
            const seenBookingIds = new Set();

            bookingsData.forEach(b => {
                if (b.bookingStatus === 'Cancelled' || b.status === 'Cancelled') return;
                const guestName = (b.clientName || b.guestName || '').trim();
                if (!guestName) return;
                seenBookingIds.add(String(b._id));
                const clientId = typeof b.client === 'object' ? b.client?._id : b.client;
                const totalAmt = Number(b.totalAmount || b.packagePrice) || 0;
                const advAmt = Number(b.advancePaid) || 0;
                const balDue = b.balanceDue !== undefined ? Math.max(0, Number(b.balanceDue)) : Math.max(0, totalAmt - advAmt);
                options.push({
                    key: `bkg_${b._id}`,
                    bookingRef: b._id,
                    clientId: clientId || '',
                    guestName,
                    mobile: b.mobileNumber || '',
                    vehicleType: b.vehicleType || '',
                    tripDate: b.travelStartDate ? formatDateIST(b.travelStartDate) : '',
                    totalAmount: totalAmt,
                    balanceDue: balDue
                });
            });

            clientsData.forEach(c => {
                const name = (c.name || '').trim();
                if (!name) return;
                const alreadyInBookings = options.some(o => String(o.clientId) === String(c._id));
                if (!alreadyInBookings) {
                    options.push({
                        key: `cli_${c._id}`,
                        bookingRef: '',
                        clientId: c._id,
                        guestName: name,
                        mobile: c.mobile || '',
                        vehicleType: '',
                        tripDate: '',
                        totalAmount: Number(c.totalBilled) || 0,
                        balanceDue: Math.max(0, Number(c.balance) || 0)
                    });
                }
            });

            setGuestOptions(options);
        } catch (err) {
            console.error('Error fetching guest options for bank book:', err);
        }
    };

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
            fetchGuestLedgerOptions();
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
    const handleOpenAddBank = () => {
        setEditingBankId(null);
        setBankFormData({
            bankName: '',
            accountNumber: '',
            accountHolder: '',
            ifsc: '',
            branch: '',
            upiId: '',
            openingBalance: ''
        });
        setShowAddBankModal(true);
    };

    const handleOpenEditBank = (bank, e) => {
        if (e) e.stopPropagation();
        setEditingBankId(bank._id);
        setBankFormData({
            bankName: bank.bankName || '',
            accountNumber: bank.accountNumber || '',
            accountHolder: bank.accountHolder || '',
            ifsc: bank.ifsc || '',
            branch: bank.branch || '',
            upiId: bank.upiId || '',
            openingBalance: bank.openingBalance || ''
        });
        setShowAddBankModal(true);
    };

    const handleDeleteBank = async (bank, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete bank account "${bank.bankName}"?`)) return;
        try {
            await axios.delete(`/api/banks/${bank._id}`);
            if (selectedBankId === bank._id) {
                setSelectedBankId('all');
            }
            await fetchBankAccounts();
            await fetchBankTransactions();
        } catch (err) {
            console.error('Error deleting bank account:', err);
            alert(err.response?.data?.message || 'Failed to delete bank account');
        }
    };

    const handleCreateBank = async (e) => {
        e.preventDefault();
        if (!bankFormData.bankName) {
            alert('Bank Name is required');
            return;
        }
        setSubmittingBank(true);
        try {
            if (editingBankId) {
                const { data } = await axios.put(`/api/banks/${editingBankId}`, bankFormData);
                alert(`Bank account "${data.bankName}" updated successfully!`);
                setShowAddBankModal(false);
                setEditingBankId(null);
                await fetchBankAccounts();
                await fetchBankTransactions();
            } else {
                const { data } = await axios.post('/api/banks', {
                    ...bankFormData,
                    company: selectedCompany._id
                });
                alert(`Bank account for "${data.bankName}" created successfully!`);
                setShowAddBankModal(false);
                setSelectedBankId(data._id);
                await fetchBankAccounts();
            }
            setBankFormData({
                bankName: '',
                accountNumber: '',
                accountHolder: '',
                ifsc: '',
                branch: '',
                upiId: '',
                openingBalance: ''
            });
        } catch (err) {
            console.error('Error saving bank account:', err);
            alert(err.response?.data?.message || 'Failed to save bank account');
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
                description: txFormData.description || (txFormData.guestName ? `Mr. ${txFormData.guestName.replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '')}` : ''),
                paymentScreenshot: screenshotUrl,
                date: txFormData.date || todayIST(),
                bookingRef: txFormData.bookingRef || null,
                clientId: txFormData.clientId || null
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
                date: todayIST(),
                bookingRef: '',
                clientId: '',
                guestName: ''
            });
            setGuestSearchQuery('');
            setShowGuestDropdown(false);
            setTxScreenshotFile(null);
            await fetchBankAccounts();
            await fetchBankTransactions();
            await fetchGuestLedgerOptions();
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
                description: cashFormData.description || (cashFormData.guestName ? `Mr. ${cashFormData.guestName.replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '')}` : ''),
                guestName: cashFormData.guestName,
                driverName: cashFormData.driverName,
                bookingRef: cashFormData.bookingRef || null,
                clientId: cashFormData.clientId || null,
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
                driverName: '',
                bookingRef: '',
                clientId: ''
            });
            setGuestSearchQuery('');
            setShowGuestDropdown(false);
            setCashReceiptFile(null);
            await fetchCashTransactions();
            await fetchGuestLedgerOptions();
        } catch (err) {
            console.error('Error adding cash transaction:', err);
            alert(err.response?.data?.message || 'Failed to record cash transaction');
        } finally {
            setSubmittingCash(false);
        }
    };

    const formatParticulars = (tx) => {
        const rawDesc = String(tx?.description || '').trim();
        const cat = String(tx?.category || '').trim();

        // 1. Driver Advance -> "Mr. Bharat"
        const drvMatch = rawDesc.match(/Advance\s+(?:given\s+)?to\s+Driver\s+([^(—\-]+?)(?:\s*\(.*|\s*[-—].*)?$/i);
        if (drvMatch && drvMatch[1]) {
            const cleanDrv = drvMatch[1].trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '');
            return `Mr. ${cleanDrv}`;
        }
        if (cat === 'Driver Advance' && tx?.driverName) {
            const cleanDrv = String(tx.driverName).trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '');
            return `Mr. ${cleanDrv}`;
        }

        // 2. Vehicle Fuel / Fastag / Maintenance / Border Tax / Parking -> Car Number only (e.g. "RJ-27-TA-9053")
        const vehMatch = rawDesc.match(/for\s+Vehicle\s+([A-Z0-9\-]+)/i)
            || rawDesc.match(/\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{3,4})\b/i);
        if (vehMatch && vehMatch[1] && (
            /fuel|fastag|maintenance|service|repair|utility|border|parking|toll|vehicle/i.test(cat) ||
            /fuel|fastag|vehicle|approved from attendance/i.test(rawDesc)
        )) {
            return vehMatch[1].toUpperCase();
        }

        // 3. Guest / Booking Advance or Payment -> "Mr. <GuestName>"
        if (tx?.bookingRef?.clientName) {
            const cleanGuest = String(tx.bookingRef.clientName).trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '');
            return `Mr. ${cleanGuest}`;
        }
        if (tx?.clientRef?.name) {
            const cleanGuest = String(tx.clientRef.name).trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '');
            return `Mr. ${cleanGuest}`;
        }
        const guestMatch = rawDesc.match(/^(?:Advance|Payment)\s+Received\s*[-–:]\s*(.+?)(?:\s*\(Ref:.*)?$/i);
        if (guestMatch && guestMatch[1]) {
            const cleanGuest = guestMatch[1].trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?)\s*/i, '');
            return `Mr. ${cleanGuest}`;
        }

        return rawDesc || '-';
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
                                onClick={handleOpenAddBank}
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
                                        handleOpenAddBank();
                                        return;
                                    }
                                    setTxFormData(prev => ({
                                        ...prev,
                                        bankAccountId: selectedBankId !== 'all' ? selectedBankId : bankAccounts[0]._id
                                    }));
                                    setGuestSearchQuery('');
                                    setShowGuestDropdown(false);
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
                            <div
                                key={b._id}
                                onClick={() => setSelectedBankId(b._id)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '14px',
                                    border: selectedBankId === b._id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                                    background: selectedBankId === b._id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    minWidth: '220px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                        {b.accountNumber ? `A/C: •••• ${b.accountNumber.slice(-4)}` : 'Bank A/C'}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenEditBank(b, e)}
                                            title="Edit Bank Account"
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.18)',
                                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                                color: '#60a5fa',
                                                borderRadius: '6px',
                                                padding: '3px 6px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteBank(b, e)}
                                            title="Delete Bank Account"
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                color: '#f87171',
                                                borderRadius: '6px',
                                                padding: '3px 6px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {b.bankName}
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>
                                    {b.accountHolder || '1-Day Bank Book'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats KPI Grid — Strictly 1-Day Book (No Carry-Forward / No Closing Balance) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>AAJ KITNA AAYA (RECEIVED IN)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowDownLeft size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#4ade80' }}>
                                +₹{(bankStats.totalIn || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                1-Day Bank Credit (Inflow) • {formatDateIST(filterDate)}
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>AAJ KITNA GAYA (PAID OUT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#f87171' }}>
                                -₹{(bankStats.totalOut || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                1-Day Bank Debit (Outflow) • {formatDateIST(filterDate)}
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>1-DAY NET FLOW (IN - OUT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: bankStats.periodBalance >= 0 ? '#60a5fa' : '#fb923c' }}>
                                {bankStats.periodBalance > 0 ? '+' : ''}₹{(bankStats.periodBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                Selected Day Only • No Carry-Forward
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar: 1-Day Date Navigator & Search */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#60a5fa',
                                fontSize: '12px',
                                fontWeight: '800'
                            }}>
                                <Calendar size={14} /> 1-Day Bank Book
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button
                                    type="button"
                                    onClick={() => shiftFilterDate(-1)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                    title="Previous Day"
                                >
                                    ◀ Prev
                                </button>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={e => setFilterDate(e.target.value)}
                                    onClick={e => e.target.showPicker?.()}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'rgba(0,0,0,0.4)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        outline: 'none',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => shiftFilterDate(1)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                    title="Next Day"
                                >
                                    Next ▶
                                </button>
                                {filterDate !== todayIST() && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterDate(todayIST())}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#3b82f6',
                                            color: 'white',
                                            fontWeight: '800',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Today
                                    </button>
                                )}
                            </div>
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
                                                        {formatParticulars(tx)}
                                                    </div>
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

                    {/* Stats KPI Grid for Cash Book — Strictly 1-Day Book (No Carry-Forward) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>AAJ CASH KITNA AAYA (IN)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowDownLeft size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>
                                +₹{(cashStats.totalIn || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                1-Day Cash Received • {formatDateIST(filterDate)}
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>AAJ CASH KITNA GAYA (OUT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: '#f87171' }}>
                                -₹{(cashStats.totalOut || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                1-Day Cash Paid Out • {formatDateIST(filterDate)}
                            </div>
                        </div>

                        <div className="premium-glass" style={{ padding: '15px', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>1-DAY NET CASH FLOW (IN - OUT)</span>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: '900', color: cashStats.periodBalance >= 0 ? '#38bdf8' : '#fb923c' }}>
                                {cashStats.periodBalance > 0 ? '+' : ''}₹{(cashStats.periodBalance || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                Selected Day Only • No Carry-Forward
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar: 1-Day Date Navigator & Category & Search */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#10b981',
                                fontSize: '12px',
                                fontWeight: '800'
                            }}>
                                <Calendar size={14} /> 1-Day Cash Book
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button
                                    type="button"
                                    onClick={() => shiftFilterDate(-1)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                    title="Previous Day"
                                >
                                    ◀ Prev
                                </button>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={e => setFilterDate(e.target.value)}
                                    onClick={e => e.target.showPicker?.()}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'rgba(0,0,0,0.4)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        outline: 'none',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => shiftFilterDate(1)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                    title="Next Day"
                                >
                                    Next ▶
                                </button>
                                {filterDate !== todayIST() && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterDate(todayIST())}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#10b981',
                                            color: '#000',
                                            fontWeight: '800',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Today
                                    </button>
                                )}
                            </div>

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
                                                    <div style={{ fontWeight: '800', color: '#fff', fontSize: '14px' }}>
                                                        {formatParticulars(tx)}
                                                    </div>
                                                    {tx.bankAccount && (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                                                                🏦 {tx.bankAccount.bankName || tx.bankName}
                                                            </span>
                                                        </div>
                                                    )}
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

            {/* Modal: Add / Edit Bank Account */}
            <AnimatePresence>
                {showAddBankModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '26px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={22} color="#60a5fa" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>
                                        {editingBankId ? 'Edit Bank Account' : 'Create Bank Account'}
                                    </h3>
                                </div>
                                <button type="button" onClick={() => { setShowAddBankModal(false); setEditingBankId(null); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
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
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => { setShowAddBankModal(false); setEditingBankId(null); }} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={submittingBank} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: submittingBank ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {submittingBank ? 'Saving...' : editingBankId ? 'Update Bank Account' : 'Save Bank Account'}
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', background: '#0f172a', padding: '26px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
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
                                                {b.bankName} {b.accountNumber ? `(•••• ${b.accountNumber.slice(-4)})` : ''}
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

                                {/* Guest / Client Ledger Selector (Search by Guest Name) */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                                            👤 Guest / Client Ledger (Search by Guest Name)
                                        </label>
                                        {(txFormData.bookingRef || txFormData.clientId) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTxFormData({ ...txFormData, guestName: '', bookingRef: '', clientId: '' });
                                                    setGuestSearchQuery('');
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                                            >
                                                ✕ Clear Ledger Link
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search guest name or mobile to link Client Ledger..."
                                            value={guestSearchQuery}
                                            onFocus={() => setShowGuestDropdown(true)}
                                            onChange={e => {
                                                setGuestSearchQuery(e.target.value);
                                                setTxFormData({ ...txFormData, guestName: e.target.value, bookingRef: '', clientId: '' });
                                                setShowGuestDropdown(true);
                                            }}
                                            style={{ ...darkInputStyle, paddingLeft: '34px', borderColor: (txFormData.bookingRef || txFormData.clientId) ? 'rgba(16, 185, 129, 0.6)' : 'rgba(56, 189, 248, 0.35)' }}
                                        />
                                    </div>
                                    {(txFormData.bookingRef || txFormData.clientId) && (
                                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>
                                            ✓ Linked to Client Ledger: Mr. {String(txFormData.guestName || '').replace(/^(Mr\.?\s*|Mrs\.?\s*|Ms\.?\s*)/i, '').trim()} (Auto-syncs balance & payment ledger)
                                        </div>
                                    )}
                                    {showGuestDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '4px',
                                            maxHeight: '210px',
                                            overflowY: 'auto',
                                            background: '#090f1d',
                                            border: '1px solid rgba(56, 189, 248, 0.4)',
                                            borderRadius: '10px',
                                            zIndex: 50,
                                            boxShadow: '0 12px 30px rgba(0,0,0,0.7)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', color: '#94a3b8' }}>
                                                <span>SELECT GUEST LEDGER ({guestOptions.length} available)</span>
                                                <button type="button" onClick={() => setShowGuestDropdown(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>Close ✕</button>
                                            </div>
                                            {guestOptions
                                                .filter(g => {
                                                    const q = (guestSearchQuery || '').toLowerCase().trim();
                                                    if (!q) return true;
                                                    return (g.guestName || '').toLowerCase().includes(q) ||
                                                        (g.mobile || '').toLowerCase().includes(q) ||
                                                        (g.tripInfo || '').toLowerCase().includes(q);
                                                })
                                                .slice(0, 30)
                                                .map(g => {
                                                    const cleanName = String(g.guestName || '').replace(/^(Mr\.?\s*|Mrs\.?\s*|Ms\.?\s*)/i, '').trim();
                                                    return (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => {
                                                                setGuestSearchQuery(`Mr. ${cleanName}`);
                                                                setTxFormData({
                                                                    ...txFormData,
                                                                    guestName: cleanName,
                                                                    bookingRef: g.bookingId || '',
                                                                    clientId: g.clientId || '',
                                                                    category: txFormData.category || (txFormData.type === 'IN' ? 'Advance Payment' : txFormData.category),
                                                                    description: txFormData.description || `Mr. ${cleanName}`
                                                                });
                                                                setShowGuestDropdown(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                                                                    Mr. {cleanName}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                                    {g.mobile ? `📞 ${g.mobile}` : ''} {g.tripInfo ? `• ${g.tripInfo}` : ''}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                {g.balanceDue > 0 ? (
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '2px 7px', borderRadius: '6px' }}>
                                                                        Due: ₹{Number(g.balanceDue).toLocaleString('en-IN')}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>Ledger Active</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {guestOptions.filter(g => {
                                                const q = (guestSearchQuery || '').toLowerCase().trim();
                                                if (!q) return true;
                                                return (g.guestName || '').toLowerCase().includes(q) || (g.mobile || '').toLowerCase().includes(q);
                                            }).length === 0 && (
                                                <div style={{ padding: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                                    No matching guest ledger found. You can still record with custom guest name.
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                                {b.bankName} {b.accountNumber ? `(A/C •••• ${b.accountNumber.slice(-4)})` : ''}
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

                                {/* 1-Day Flow Summary */}
                                {Number(depositFormData.amount) > 0 && (
                                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>1-Day Cash Book (OUT):</span>
                                            <span style={{ fontWeight: '800', color: '#f87171' }}>
                                                -₹{Number(depositFormData.amount).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>1-Day Bank Book ({selectedDepositBank?.bankName || 'Bank'} IN):</span>
                                            <span style={{ fontWeight: '800', color: '#4ade80' }}>
                                                +₹{Number(depositFormData.amount).toLocaleString('en-IN')}
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
                                                {b.bankName} {b.accountNumber ? `(A/C •••• ${b.accountNumber.slice(-4)})` : ''}
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

                                {/* 1-Day Flow Summary */}
                                {Number(withdrawFormData.amount) > 0 && (
                                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>1-Day Bank Book ({selectedWithdrawBank?.bankName || 'Bank'} OUT):</span>
                                            <span style={{ fontWeight: '800', color: '#f87171' }}>
                                                -₹{Number(withdrawFormData.amount).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>1-Day Cash Book (IN):</span>
                                            <span style={{ fontWeight: '800', color: '#10b981' }}>
                                                +₹{Number(withdrawFormData.amount).toLocaleString('en-IN')}
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', background: '#0f172a', padding: '26px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
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

                                {/* Guest / Client Ledger Selector (Search by Guest Name) */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                                            👤 Guest / Client Ledger (Search by Guest Name)
                                        </label>
                                        {(cashFormData.bookingRef || cashFormData.clientId) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCashFormData({ ...cashFormData, guestName: '', bookingRef: '', clientId: '' });
                                                    setGuestSearchQuery('');
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                                            >
                                                ✕ Clear Ledger Link
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search guest name or mobile to link Client Ledger..."
                                            value={guestSearchQuery}
                                            onFocus={() => setShowGuestDropdown(true)}
                                            onChange={e => {
                                                setGuestSearchQuery(e.target.value);
                                                setCashFormData({ ...cashFormData, guestName: e.target.value, bookingRef: '', clientId: '' });
                                                setShowGuestDropdown(true);
                                            }}
                                            style={{ ...darkInputStyle, paddingLeft: '34px', borderColor: (cashFormData.bookingRef || cashFormData.clientId) ? 'rgba(16, 185, 129, 0.6)' : 'rgba(56, 189, 248, 0.35)' }}
                                        />
                                    </div>
                                    {(cashFormData.bookingRef || cashFormData.clientId) && (
                                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>
                                            ✓ Linked to Client Ledger: Mr. {String(cashFormData.guestName || '').replace(/^(Mr\.?\s*|Mrs\.?\s*|Ms\.?\s*)/i, '').trim()} (Auto-syncs balance & payment ledger)
                                        </div>
                                    )}
                                    {showGuestDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '4px',
                                            maxHeight: '210px',
                                            overflowY: 'auto',
                                            background: '#090f1d',
                                            border: '1px solid rgba(56, 189, 248, 0.4)',
                                            borderRadius: '10px',
                                            zIndex: 50,
                                            boxShadow: '0 12px 30px rgba(0,0,0,0.7)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', color: '#94a3b8' }}>
                                                <span>SELECT GUEST LEDGER ({guestOptions.length} available)</span>
                                                <button type="button" onClick={() => setShowGuestDropdown(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>Close ✕</button>
                                            </div>
                                            {guestOptions
                                                .filter(g => {
                                                    const q = (guestSearchQuery || '').toLowerCase().trim();
                                                    if (!q) return true;
                                                    return (g.guestName || '').toLowerCase().includes(q) ||
                                                        (g.mobile || '').toLowerCase().includes(q) ||
                                                        (g.tripInfo || '').toLowerCase().includes(q);
                                                })
                                                .slice(0, 30)
                                                .map(g => {
                                                    const cleanName = String(g.guestName || '').replace(/^(Mr\.?\s*|Mrs\.?\s*|Ms\.?\s*)/i, '').trim();
                                                    return (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => {
                                                                setGuestSearchQuery(`Mr. ${cleanName}`);
                                                                setCashFormData({
                                                                    ...cashFormData,
                                                                    guestName: cleanName,
                                                                    bookingRef: g.bookingId || '',
                                                                    clientId: g.clientId || '',
                                                                    category: cashFormData.category === 'General Cash' && cashFormData.type === 'IN' ? 'Advance Payment' : cashFormData.category,
                                                                    description: cashFormData.description || `Mr. ${cleanName}`
                                                                });
                                                                setShowGuestDropdown(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                                                                    Mr. {cleanName}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                                    {g.mobile ? `📞 ${g.mobile}` : ''} {g.tripInfo ? `• ${g.tripInfo}` : ''}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                {g.balanceDue > 0 ? (
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '2px 7px', borderRadius: '6px' }}>
                                                                        Due: ₹{Number(g.balanceDue).toLocaleString('en-IN')}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>Ledger Active</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {guestOptions.filter(g => {
                                                const q = (guestSearchQuery || '').toLowerCase().trim();
                                                if (!q) return true;
                                                return (g.guestName || '').toLowerCase().includes(q) || (g.mobile || '').toLowerCase().includes(q);
                                            }).length === 0 && (
                                                <div style={{ padding: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                                    No matching guest ledger found. You can still record with custom guest name.
                                                </div>
                                            )}
                                        </div>
                                    )}
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
