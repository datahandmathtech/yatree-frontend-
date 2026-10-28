import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import BankSelector from '../components/common/BankSelector';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Wrench,
    Plus,
    Search,
    Trash2,
    Calendar,
    FileText,
    MapPin,
    Clock,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Settings,
    User,
    Droplets,
    Zap,
    Layers,
    ArrowRight,
    ArrowUpRight,
    History,
    FileSpreadsheet,
    Filter,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Upload,
    Car,
    X,
    Store,
    CheckCircle,
    IndianRupee,
    Eye,
    ShieldAlert,
    Check,
    BookOpen,
    Edit,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST, nowIST, formatDateTimeIST } from '../utils/istUtils';
import ImageUploader from '../components/common/ImageUploader';
import SearchableSelect from '../components/common/SearchableSelect';

const isOperationalUtilityRecord = (r) => {
    if (!r) return false;
    const source = String(r.source || '').toLowerCase();
    if (source === 'car utility' || source === 'driver app' || source === 'driver' || source === 'utility') return true;

    const mType = String(r.maintenanceType || '').toLowerCase();
    if (mType.includes('driver service') || mType.includes('car service') || mType.includes('car utility') || mType.includes('utility')) return true;

    const cat = String(r.category || '').toLowerCase();
    const desc = String(r.description || '').toLowerCase();

    // Mechanical workshop keywords: NEVER an operational driver service
    const isMechanical = /engine|clutch|gear|suspension|brake|timing belt|radiator|alternator|overhaul|periodic service|general servicing|oil filter|air filter|fuel filter/i.test(cat + ' ' + desc);
    if (isMechanical) return false;

    const utilityRegex = /wash|washing|cleaning|tissue|water|mask|sanitizer|kapda|punc|puncture|puncher|parking|challan|penalty|other misc/i;
    return utilityRegex.test(cat) || utilityRegex.test(desc) || utilityRegex.test(mType);
};

const MAINTENANCE_CATEGORIES = [
    'Regular Service',
    'Engine / Mechanical',
    'Suspension',
    'Steering',
    'Fuel',
    'Exhaust',
    'Clutch / Transmission',
    'Brake System',
    'Tyres & Wheels',
    'Electrical & Battery',
    'Sensors & Electronics',
    'AC & Cooling',
    'Body & Interior',
    'Emergency Repairs',
    'Misc. Repairs'
];

const NEXT_SERVICE_TYPES = [
    'Regular Service',
    'Tyres / Wheels',
    'Engine / Mechanical',
    'AC / Cooling',
    'Suspension',
    'Electrical',
    'Other'
];

const Maintenance = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' }); // 'total' or category name
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(nowIST().getUTCMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(nowIST().getUTCFullYear());
    const [pendingExpenses, setPendingExpenses] = useState([]);
    const [filterGarage, setFilterGarage] = useState('All');
    const [selectedBillPhoto, setSelectedBillPhoto] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [viewMode, setViewMode] = useState('history'); // 'history' or 'super'
    const [aggData, setAggData] = useState([]);
    const [aggLoading, setAggLoading] = useState(false);
    const [aggSummary, setAggSummary] = useState(null);
    const [aggSearch, setAggSearch] = useState('');
    const [showDrillModal, setShowDrillModal] = useState(false);
    const [drillData, setDrillData] = useState({ vehicle: '', category: '', records: [] });
    const [expandedVehicle, setExpandedVehicle] = useState(null); // Added for Master Data Accordion
    const [showGarageSuggestions, setShowGarageSuggestions] = useState(false);
    const [allGarages, setAllGarages] = useState([]);

    // ── VENDOR DUES & LEDGER STATE ──
    const [vendorSummary, setVendorSummary] = useState({ totalAmount: 0, paidAmount: 0, dueAmount: 0, totalVendors: 0, dueVendorsCount: 0, paidVendorsCount: 0 });
    const [vendors, setVendors] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorFilterStatus, setVendorFilterStatus] = useState('due'); // 'due' | 'all' | 'paid'
    const [vendorSearch, setVendorSearch] = useState('');
    const [vendorTimeMode, setVendorTimeMode] = useState('allTime'); // 'allTime' | 'period'
    const [selectedVendorForDetails, setSelectedVendorForDetails] = useState(null);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleTarget, setSettleTarget] = useState(null); // { type: 'bill', bill } or { type: 'vendor', vendor }
    const [settleForm, setSettleForm] = useState({ paymentMode: 'Cash', bankAccountId: '', paidBy: 'Company', paymentDate: todayIST(), note: '' });
    const [settling, setSettling] = useState(false);
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('All'); // 'All' | 'Paid' | 'Due'
    const [vendorLedgerMonth, setVendorLedgerMonth] = useState('All'); // 'All' | 'YYYY-MM'
    const [vendorLedgerSearch, setVendorLedgerSearch] = useState('');

    // Memoize month-wise breakdown for instant vendor ledger rendering
    const vendorDetailMonthStats = useMemo(() => {
        if (!selectedVendorForDetails) return [];
        const allBills = selectedVendorForDetails.bills || [];
        const mStats = {};
        allBills.filter(b => !isOperationalUtilityRecord(b)).forEach(b => {
            if (b.billDate) {
                const d = new Date(b.billDate);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                if (!mStats[key]) mStats[key] = { key, label, total: 0, paid: 0, due: 0, count: 0 };
                const amt = Number(b.amount || 0);
                mStats[key].total += amt;
                mStats[key].count += 1;
                if (b.paymentStatus === 'Due') mStats[key].due += amt;
                else mStats[key].paid += amt;
            }
        });
        return Object.values(mStats).sort((a, b) => b.key.localeCompare(a.key));
    }, [selectedVendorForDetails]);

    // Memoize displayed bills for current vendor ledger filter
    const displayedVendorBills = useMemo(() => {
        if (!selectedVendorForDetails) return [];
        const allBills = selectedVendorForDetails.bills || [];
        return allBills.filter(bill => {
            if (isOperationalUtilityRecord(bill)) return false;
            if (vendorLedgerMonth !== 'All') {
                if (!bill.billDate) return false;
                const d = new Date(bill.billDate);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (key !== vendorLedgerMonth) return false;
            }
            if (vendorLedgerSearch) {
                const q = vendorLedgerSearch.toLowerCase();
                const vPlate = (bill.vehicle?.carNumber || '').toLowerCase();
                const mType = (bill.maintenanceType || '').toLowerCase();
                const cat = (bill.category || '').toLowerCase();
                const desc = (bill.description || '').toLowerCase();
                const bNum = (bill.billNumber || '').toLowerCase();
                if (!vPlate.includes(q) && !mType.includes(q) && !cat.includes(q) && !desc.includes(q) && !bNum.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [selectedVendorForDetails, vendorLedgerMonth, vendorLedgerSearch]);

    const activeMonthBilledTotal = useMemo(() => {
        return displayedVendorBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    }, [displayedVendorBills]);

    const activeMonthPaidTotal = useMemo(() => {
        return displayedVendorBills.reduce((s, b) => s + (b.paymentStatus === 'Paid' ? (Number(b.amount) || 0) : (Number(b.paidAmount) || 0)), 0);
    }, [displayedVendorBills]);

    const activeMonthDueTotal = useMemo(() => {
        return displayedVendorBills.reduce((s, b) => s + (b.paymentStatus === 'Due' ? Math.max(0, (Number(b.amount) || 0) - (Number(b.paidAmount) || 0)) : 0), 0);
    }, [displayedVendorBills]);

    const exportMaintenanceVendorLedgerCSV = () => {
        if (!selectedVendorForDetails || displayedVendorBills.length === 0) return;
        const headers = ["Date", "Vehicle Plate", "Service Type", "Category / Description", "Bill Number", "Payment Status", "Payment Mode", "Paid Amount (INR)", "Bill Amount (INR)"];
        const rows = displayedVendorBills.map(b => [
            b.billDate ? formatDateIST(b.billDate) : '',
            `"${(b.vehicle?.carNumber || '').replace(/"/g, '""')}"`,
            `"${(b.maintenanceType || '').replace(/"/g, '""')}"`,
            `"${(b.category || b.description || '').replace(/"/g, '""')}"`,
            `"${(b.billNumber || '').replace(/"/g, '""')}"`,
            b.paymentStatus || 'Paid',
            `"${(b.paymentMode || 'Cash').replace(/"/g, '""')}"`,
            b.paymentStatus === 'Paid' ? (b.amount || 0) : (b.paidAmount || 0),
            b.amount || 0
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedVendorForDetails.vendorName}_Ledger_${vendorLedgerMonth === 'All' ? 'All_Months' : vendorLedgerMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Keep selectedVendorForDetails in sync when vendors array updates
    useEffect(() => {
        if (selectedVendorForDetails && vendors.length > 0) {
            const updated = vendors.find(v => v.vendorName === selectedVendorForDetails.vendorName);
            if (updated) {
                setSelectedVendorForDetails(updated);
            }
        }
    }, [vendors]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    useEffect(() => {
        setSearchTerm('');
        setFilterType('All');
        setFilterGarage('All');
        setFilterVehicle('All');
        setActiveCategory('All');
        const istNow = nowIST();
        setSelectedMonth(istNow.getUTCMonth() + 1);
        setSelectedYear(istNow.getUTCFullYear());
        setShowModal(false);
        setEditingId(null);
        setFormData({
            vehicleId: '',
            driverId: '',
            maintenanceType: '',
            category: '',
            partsChanged: [],
            description: '',
            garageName: '',
            billNumber: '',
            billDate: '',
            amount: '',
            paymentMode: 'Cash',
            bankAccountId: '',
            paymentStatus: 'Paid',
            currentKm: '',
            nextServiceKm: '',
            status: 'Completed'
        });
    }, [location.pathname, location.key]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver') || params.get('vehicle');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const typeParam = params.get('type') || params.get('category');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setSelectedMonth(monthParam === 'All' ? 'All' : Number(monthParam));
        if (yearParam) setSelectedYear(Number(yearParam));
        if (typeParam) setFilterType(typeParam);
    }, [location.search]);

    // Bank Accounts state for Cash vs Bank payment
    const [bankAccounts, setBankAccounts] = useState([]);

    const fetchBankAccounts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const banksRes = await axios.get(`/api/banks/company/${selectedCompany._id}`).catch(() => axios.get(`/api/admin/bank-accounts/${selectedCompany._id}`)).catch(() => ({ data: [] }));
            setBankAccounts(Array.isArray(banksRes.data) ? banksRes.data : (banksRes.data?.bankAccounts || []));
        } catch (err) {
            console.error('Failed to fetch bank accounts in Maintenance', err);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        maintenanceType: 'Regular Service',
        category: '',
        partsChanged: [],
        description: '',
        garageName: '',
        billNumber: '',
        billDate: '',
        amount: '',
        paymentMode: 'Cash',
        bankAccountId: '',
        paymentStatus: 'Paid',
        paymentSource: 'Paid',
        currentKm: '',
        nextServiceKm: '',
        status: 'Completed'
    });
    const [billPhoto, setBillPhoto] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showNextService, setShowNextService] = useState(false);

    const maintenanceTypes = [
        'Regular Service',
        'Engine / Mechanical',
        'Suspension',
        'Steering',
        'Fuel',
        'AD Blue',
        'Exhaust',
        'Clutch / Transmission',
        'Brake',
        'Tyres / Wheels',
        'Electrical / Battery',
        'Sensors / Electronics',
        'AC / Cooling',
        'Body / Interior',
        'Emergency Repairs',
        'RTO / Compliance',
        'Other'
    ];

    const subCategories = {
        'Regular Service': ['Engine oil change', 'Oil filter', 'Air filter', 'Fuel filter', 'General servicing'],
        'Engine / Mechanical': ['Engine overhaul', 'Timing belt', 'Mountings', 'Valve adjustment', 'Gasket replacement'],
        'Suspension': ['Shock absorbers', 'Bushings', 'Struts', 'Springs', 'Link rods', 'Control arms'],
        'Steering': ['Power steering pump', 'Steering rack', 'Tie rod ends', 'Steering oil', 'Steering belt'],
        'Fuel': ['Fuel pump', 'Fuel lines', 'Fuel tank cleaning', 'Injectors'],
        'Exhaust': ['Silencer repair', 'Catalytic converter', 'Exhaust manifold', 'Muffler'],
        'Clutch / Transmission': ['Clutch plate', 'Pressure plate', 'Release bearing', 'Gear oil', 'Gearbox repair', 'CV joints'],
        'Tyres / Wheels': ['New tyre purchase', 'Tyre rotation', 'Alignment & Balancing', 'Wheel bearings'],
        'Brake': ['Brake pads', 'Brake shoe', 'Disc/Drum', 'Brake oil', 'Brake lines'],
        'Electrical / Battery': ['Battery replacement', 'Alternator', 'Starter motor', 'Wiring', 'Lights', 'Fuses'],
        'Sensors / Electronics': ['ECU repair', 'Oxygen sensor', 'ABS sensor', 'Parking sensors', 'Wiring harness'],
        'AC / Cooling': ['AC gas refill', 'Compressor repair', 'Radiator service', 'Coolant top-up', 'Thermostat'],
        'Body / Interior': ['Denting painting', 'Seat covers', 'Dashboard repair', 'Mirror/Glass', 'Wipers', 'Door locks'],
        'Emergency Repairs': ['Breakdown towing', 'On-road repair', 'Jump start', 'Accident repair'],
        'RTO / Compliance': ['Challan / Fine', 'Permit Renewal', 'Fitness Certificate (Passing)', 'Tax Payment', 'Insurance Premium', 'PUC / Pollution', 'RTO Agent Fee', 'Toll / Fastag', 'Other RTO Fees']
    };

    // Fetch common references once when selected company changes
    useEffect(() => {
        if (selectedCompany) {
            fetchPending();
            fetchVehicles();
            fetchDrivers();
            fetchAllGarages();
            fetchBankAccounts();
            fetchVendorSummary(); // Load vendor summary to show due badge in header
        }
    }, [selectedCompany]);

    // Fast mode-specific fetching on viewMode or filter change
    useEffect(() => {
        if (!selectedCompany) return;
        if (viewMode === 'super') {
            fetchAggregatedData();
        } else if (viewMode === 'vendor') {
            fetchVendorSummary();
        } else {
            fetchRecords();
        }
    }, [selectedCompany, selectedMonth, selectedYear, viewMode, vendorTimeMode]);

    const fetchVendorSummary = async () => {
        if (!selectedCompany?._id) return;
        setVendorLoading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            let url = `/api/admin/maintenance/vendor-summary/${selectedCompany._id}`;
            if (vendorTimeMode === 'allTime') {
                url += '?allTime=true';
            } else if (selectedMonth === 'All') {
                const fromDate = `${selectedYear}-04-01`;
                const toDate = `${selectedYear + 1}-03-31`;
                url += `?startDate=${fromDate}&endDate=${toDate}`;
            } else {
                const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
                url += `?month=${selectedMonth}&year=${calendarYear}`;
            }

            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            setVendorSummary(data.summary || { totalAmount: 0, paidAmount: 0, dueAmount: 0, totalVendors: 0, dueVendorsCount: 0, paidVendorsCount: 0 });
            setVendors(data.vendors || []);
        } catch (err) {
            console.error('Error fetching vendor summary:', err);
        } finally {
            setVendorLoading(false);
        }
    };

    const downloadVendorExcel = () => {
        const dataToExport = filteredVendors.map(v => ({
            'Vendor / Garage Name': v.vendorName,
            'Total Billed Amount (₹)': v.totalAmount || 0,
            'Total Paid Amount (₹)': v.paidAmount || 0,
            'Net Balance Due (₹)': v.dueAmount || 0,
            'Status': v.dueAmount > 0 ? `DUE (₹${v.dueAmount.toLocaleString()})` : 'FULLY PAID',
            'Total Bills Count': v.totalBills || 0,
            'Due Bills Count': v.dueBillsCount || 0,
            'Vehicles Serviced': (v.vehicles || []).join(', '),
            'Last Bill Date': v.latestDate ? formatDateIST(v.latestDate) : 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Vendor Due Summary');
        XLSX.writeFile(wb, `Vendor_Due_Report_${selectedCompany?.name || 'Company'}_${todayIST()}.xlsx`);
    };

    const openSettleModal = (target) => {
        setSettleTarget(target);
        const defaultAmount = target.type === 'vendor' 
            ? (target.vendor.dueAmount || 0) 
            : ((target.bill.dueAmount !== undefined ? target.bill.dueAmount : target.bill.amount) || 0);
        setSettleForm({
            paymentMode: 'Cash',
            bankAccountId: bankAccounts[0]?._id || '',
            paidBy: 'Company',
            paymentDate: todayIST(),
            amount: defaultAmount,
            note: ''
        });
        setShowSettleModal(true);
    };

    const handleSettlePayment = async (e) => {
        e.preventDefault();
        if (!settleTarget) return;

        const enteredAmount = Number(settleForm.amount);
        if (!enteredAmount || enteredAmount <= 0) {
            alert('Please enter a valid payment amount greater than 0.');
            return;
        }

        setSettling(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const isOthers = settleForm.paymentMode === 'Others' || settleForm.paymentMode === 'Other';
            const effectivePaidBy = isOthers ? 'Others' : 'Company';

            if (settleTarget.type === 'bill') {
                const bill = settleTarget.bill;
                await axios.post('/api/admin/maintenance/settle-vendor', {
                    companyId: selectedCompany._id,
                    billIds: [bill._id],
                    amount: enteredAmount,
                    paymentMode: settleForm.paymentMode,
                    bankAccountId: (!isOthers && settleForm.paymentMode !== 'Cash') ? settleForm.bankAccountId : null,
                    paidBy: effectivePaidBy,
                    paymentDate: settleForm.paymentDate
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            } else if (settleTarget.type === 'vendor') {
                const vendor = settleTarget.vendor;
                await axios.post('/api/admin/maintenance/settle-vendor', {
                    companyId: selectedCompany._id,
                    vendorName: vendor.vendorName,
                    amount: enteredAmount,
                    paymentMode: settleForm.paymentMode,
                    bankAccountId: (!isOthers && settleForm.paymentMode !== 'Cash') ? settleForm.bankAccountId : null,
                    paidBy: effectivePaidBy,
                    paymentDate: settleForm.paymentDate
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            }

            setShowSettleModal(false);
            setSettleTarget(null);
            fetchRecords();
            fetchVendorSummary();
            alert('Payment successfully settled and recorded!');
        } catch (err) {
            console.error('Error settling payment:', err);
            alert(err.response?.data?.message || 'Error settling payment');
        } finally {
            setSettling(false);
        }
    };

    const fetchAllGarages = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/maintenance/garages/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAllGarages(data || []);
        } catch (err) { console.error('Error fetching garages:', err); }
    };

    const fetchAggregatedData = async () => {
        if (!selectedCompany?._id) return;
        setAggLoading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            // Dedicated ultra-fast maintenance master fleet endpoint (<50ms)
            const { data: res } = await axios.get(`/api/admin/maintenance/master-fleet/${selectedCompany._id}?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            }).catch(() => axios.get(`/api/admin/vehicle-monthly-details/${selectedCompany._id}?month=All&year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            }));
            setAggData(res.vehicles || []);
            setAggSummary(res.summary || null);
        } catch (err) { console.error('Error fetching master fleet data:', err); }
        finally { setAggLoading(false); }
    };

    const fetchRecords = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            let url = '';
            if (selectedMonth === 'All') {
                // Full Financial Year: April 1st to March 31st
                const fromDate = `${selectedYear}-04-01`;
                const toDate = `${selectedYear + 1}-03-31`;
                url = `/api/admin/maintenance/${selectedCompany._id}?startDate=${fromDate}&endDate=${toDate}`;
            } else {
                // Financial Year Smart Mapping: Jan-Mar (1,2,3) are in the next calendar year
                const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
                url = `/api/admin/maintenance/${selectedCompany._id}?month=${selectedMonth}&year=${calendarYear}`;
            }

            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setRecords(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchPending = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/maintenance/pending/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setPendingExpenses(data || []);
        } catch (err) { console.error(err); }
    };

    const fetchVehicles = async (overrideDate = null) => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            let defaultDate = todayIST();
            if (selectedMonth && selectedMonth !== 'All' && !isNaN(Number(selectedMonth))) {
                const d = new Date(selectedYear, Number(selectedMonth), 0);
                if (!isNaN(d.getTime())) {
                    defaultDate = d.toISOString().split('T')[0];
                }
            }
            const targetDate = overrideDate || defaultDate;

            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet&toDate=${targetDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    const fetchDrivers = async (overrideDate = null) => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            let defaultDate = todayIST();
            if (selectedMonth && selectedMonth !== 'All' && !isNaN(Number(selectedMonth))) {
                const d = new Date(selectedYear, Number(selectedMonth), 0);
                if (!isNaN(d.getTime())) {
                    defaultDate = d.toISOString().split('T')[0];
                }
            }
            const targetDate = overrideDate || defaultDate;

            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&driverType=All&toDate=${targetDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(data.drivers || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (showModal && formData.billDate) {
            fetchDrivers(formData.billDate);
            fetchVehicles(formData.billDate);
        }
    }, [formData.billDate, showModal]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'partsChanged') {
                    fd.append(key, JSON.stringify(formData[key]));
                } else if (key === 'nextServiceKm' && (!showNextService || !formData[key])) {
                    // Skip if hidden or empty
                } else {
                    fd.append(key, formData[key]);
                }
            });
            if (formData.paymentMode === 'Others') {
                fd.set('paidBy', 'Others');
                fd.set('paymentSource', 'Others');
                fd.delete('bankAccountId');
            }
            fd.append('companyId', selectedCompany._id);
            if (billPhoto) fd.append('billPhoto', billPhoto);

            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            if (editingId) {
                await axios.put(`/api/admin/maintenance/${editingId}`, fd, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}`
                    }
                });
                alert('Maintenance record updated successfully');
            } else {
                await axios.post('/api/admin/maintenance', fd, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}`
                    }
                });
                alert('Maintenance record added successfully');
            }

            setShowModal(false);
            setShowNextService(false);
            resetForm();
            fetchRecords();
            fetchPending();
            fetchVendorSummary();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Error saving record');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            await axios.delete(`/api/admin/maintenance/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchRecords();
            fetchVendorSummary();
        } catch (err) { console.error(err); }
    };

    const resetForm = () => {
        setFormData({
            vehicleId: '',
            driverId: '',
            maintenanceType: '',
            category: '',
            partsChanged: [],
            description: '',
            garageName: '',
            billNumber: '',
            billDate: '',
            amount: '',
            paymentMode: 'Cash',
            bankAccountId: '',
            paymentStatus: 'Paid',
            paymentSource: 'Paid',
            currentKm: '',
            nextServiceKm: '',
            status: 'Completed'
        });
        setBillPhoto(null);
        setShowNextService(false);
        setEditingId(null);
    };


    const handleEdit = (record) => {
        const types = (record.maintenanceType || '').split(', ').filter(Boolean);
        const isEligibleForReminder = types.some(t => 
            t === 'Regular Service' || 
            (t === 'Tyres / Wheels' && (record.category || '').includes('Alignment & Balancing'))
        );
        setFormData({
            vehicleId: record.vehicle?._id || record.vehicle || '',
            driverId: record.driver?._id || record.driver || '',
            maintenanceType: record.maintenanceType || '',
            category: record.category || '',
            partsChanged: record.partsChanged || [],
            description: record.description || '',
            garageName: record.garageName || '',
            billNumber: record.billNumber || '',
            billDate: record.billDate ? nowIST(record.billDate).toISOString().split('T')[0] : '',
            amount: record.amount,
            paymentMode: (record.paymentMode === 'Others' || record.paymentMode === 'Other' || record.paymentSource === 'Others') ? 'Others' : (record.paymentMode || 'Cash'),
            bankAccountId: record.bankAccount?._id || record.bankAccount || '',
            paymentStatus: record.paymentStatus || 'Paid',
            paymentSource: (record.paymentMode === 'Others' || record.paymentMode === 'Other' || record.paymentSource === 'Others') ? 'Others' : (record.paymentSource || 'Paid'),
            currentKm: record.currentKm || '',
            nextServiceKm: record.nextServiceKm || '',
            status: record.status || 'Completed'
        });
        setEditingId(record._id);
        // Auto-show reminder if record has value OR if it's an eligible type
        setShowNextService(isEligibleForReminder && !!record.nextServiceKm);
        setShowModal(true);
    };

    const handleApprove = async (attendanceId, expenseId) => {
        if (!window.confirm('Are you sure you want to approve this expense? It will be officially added to your records.')) return;
        try {
            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status: 'approved' });
            fetchRecords();
            fetchPending();
        } catch (err) {
            console.error('Approval failed:', err);
            alert(err.response?.data?.message || 'Failed to approve expense');
        }
    };

    const handleReject = async (attendanceId, expenseId) => {
        if (!window.confirm('Reject this expense? It will be marked as rejected.')) return;
        try {
            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status: 'rejected' });
            fetchRecords();
            fetchPending();
        } catch (err) {
            console.error('Rejection failed:', err);
            alert(err.response?.data?.message || 'Failed to reject expense');
        }
    };

    const downloadExcel = () => {
        const dataToExport = filteredRecords.map(r => ({
            'Bill Date': r.billDate ? formatDateIST(r.billDate) : 'N/A',
            'Vehicle': r.vehicle?.carNumber || 'N/A',
            'Maintenance Type': r.maintenanceType,
            'Sub-Category': r.category || 'N/A',
            'Garage Name': r.garageName || r.vendorName || 'N/A',
            'Bill Number': r.billNumber || 'N/A',
            'Amount (₹)': r.amount || 0,
            'KM Reading': r.currentKm || 'N/A',
            'Payment Mode': r.paymentMode,
            'Description': r.description || 'N/A',
            'Next Service KM': r.nextServiceKm || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Logs');
        XLSX.writeFile(wb, `Maintenance_Report_${selectedCompany?.name}_${todayIST()}.xlsx`);
    };

    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) return resolve(null);
            let finalUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                finalUrl = `https://superadmin.yatreedestination.com/uploads/${url}`;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (finalUrl.startsWith('http')) {
                img.src = `/api/admin/proxy-image?url=${encodeURIComponent(finalUrl)}`;
            } else {
                img.src = finalUrl;
            }
        });
    };

    const handleExportPDF = async () => {
        try {
            if (!filteredRecords || filteredRecords.length === 0) {
                alert("No records to export.");
                return;
            }

            const logoUrl = selectedCompany?.logoUrl || '/logos/logo.png';
            const logo = await loadImage(logoUrl).catch(() => null);

            const sigUrl = selectedCompany?.ownerSignatureUrl || '/logos/signature.png';
            const signature = await loadImage(sigUrl).catch(() => null);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. Header (Premium Style)
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 45, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 6, 32, 32, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 8, 28, 28);
            } else {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.roundedRect(12, 6, 32, 32, 3, 3, 'D');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('LOGO', 24, 23, { align: 'center' });
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 50, 20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(14, 165, 233);
            doc.text('PREMIUM FLEET MAINTENANCE REPORT', 50, 28);
            doc.setTextColor(200, 200, 200);
            doc.text(selectedCompany?.address || '', 50, 35);

            // 2. Report Information & Filter Context
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORT INFORMATION', 15, 60);
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.8);
            doc.line(15, 63, 50, 63);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`PERIOD:`, 15, 72);
            doc.text(`GENERATED:`, 15, 78);
            doc.text(`FILTERED CAR:`, 15, 84);
            doc.text(`FILTERED GARAGE:`, 15, 90);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            const monthName = selectedMonth === 'All' ? 'Full Year' : new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' });
            doc.text(`${monthName.toUpperCase()} ${selectedYear}`, 50, 72);
            doc.text(formatDateTimeIST(new Date()), 50, 78);
            doc.text(filterVehicle === 'All' ? 'ALL VEHICLES' : filterVehicle, 50, 84);
            doc.text(filterGarage === 'All' ? 'ALL GARAGES' : filterGarage, 50, 90);

            // 3. Category Breakdown (The "Information Rich" part)
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2 - 5, 55, pageWidth / 2 - 10, 45, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('SPEND BREAKDOWN', pageWidth / 2 + 2, 63);

            // Calculate spend per active category
            const breakdown = maintenanceTypes.map(type => {
                const keywords = [type, ...(subCategories[type] || [])].map(s => s.toLowerCase().replace(' system', '').trim()).filter(Boolean);
                const amt = filteredRecords.filter(r => {
                    const searchStr = `${(r.maintenanceType || '').toLowerCase()} ${(r.category || '').toLowerCase()} ${(r.description || '').toLowerCase()}`;
                    return keywords.some(kw => searchStr.includes(kw.toLowerCase()));
                }).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                return { type, amt };
            }).filter(i => i.amt > 0).sort((a, b) => b.amt - a.amt).slice(0, 4);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            breakdown.forEach((item, idx) => {
                const yPos = 70 + (idx * 6);
                doc.text(item.type.toUpperCase(), pageWidth / 2 + 2, yPos);
                doc.setTextColor(15, 23, 42);
                doc.text(`Rs. ${item.amt.toLocaleString('en-IN')}`, pageWidth - 20, yPos, { align: 'right' });
                doc.setTextColor(100, 116, 139);
            });

            const totalSpend = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            doc.setDrawColor(226, 232, 240);
            doc.line(pageWidth / 2 + 2, 94, pageWidth - 20, 94);
            doc.setTextColor(16, 185, 129);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL SPEND:', pageWidth / 2 + 2, 99);
            doc.text(`Rs. ${totalSpend.toLocaleString('en-IN')}`, pageWidth - 20, 99, { align: 'right' });

            // 4. Main Maintenance Table
            const tableRows = filteredRecords.map(r => [
                r.billDate ? formatDateIST(r.billDate) : 'N/A',
                r.vehicle?.carNumber || 'N/A',
                r.maintenanceType || 'N/A',
                (r.garageName || r.vendorName || 'N/A').toUpperCase(),
                r.billNumber || 'N/A',
                `Rs. ${(Number(r.amount) || 0).toLocaleString('en-IN')}`,
                r.currentKm ? `${r.currentKm.toLocaleString()}` : 'N/A'
            ]);

            autoTable(doc, {
                head: [['DATE', 'CAR NO.', 'MAINTENANCE TYPE', 'GARAGE / VENDOR', 'BILL NO.', 'AMOUNT', 'KM']],
                body: tableRows,
                startY: 110,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center', fontStyle: 'bold' },
                bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                columnStyles: {
                    0: { cellWidth: 18 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 45 },
                    4: { cellWidth: 15 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 20 }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 5. Signature Section
            let currentY = doc.lastAutoTable.finalY + 30;
            if (currentY > pageHeight - 50) { doc.addPage(); currentY = 40; }

            doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'italic');
            doc.text('This is an official fleet maintenance statement. All expenses are verified by the fleet department.', 15, currentY);

            const sigX = pageWidth - 70;
            if (signature) doc.addImage(signature, 'PNG', sigX, currentY - 20, 50, 20);
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.5);
            doc.line(sigX - 5, currentY + 5, pageWidth - 15, currentY + 5);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text((selectedCompany?.ownerName || 'AUTHORIZED MANAGER').toUpperCase(), sigX, currentY + 12);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text('Authorized Signatory', sigX, currentY + 17);

            // 6. Page Numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setTextColor(203, 213, 225);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text(`Generated on: ${formatDateTimeIST(new Date())}`, 15, pageHeight - 10);
            }

            doc.save(`Maintenance_Report_${selectedCompany?.name || 'Fleet'}_${todayIST()}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error generating PDF: " + error.message);
        }
    };

    const [filterVehicle, setFilterVehicle] = useState('All');

    const uniqueGarages = [...new Set(records.map(r => r.garageName || r.vendorName).filter(Boolean))].sort();
    const uniqueVehicles = [...new Set(vehicles.map(v => v.carNumber).filter(Boolean))].sort();

    const baseFilteredRecords = (records || []).filter(r => {
        const matchesSearch = (r.vehicle?.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            r.maintenanceType?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            r.garageName?.toLowerCase()?.includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'All' || (r.maintenanceType && r.maintenanceType.split(', ').includes(filterType));
        const matchesGarage = filterGarage === 'All' || (r.garageName || r.vendorName) === filterGarage;
        const matchesVehicle = filterVehicle === 'All' || r.vehicle?.carNumber === filterVehicle;
        const matchesPaymentStatus = filterPaymentStatus === 'All' || (filterPaymentStatus === 'Due' ? r.paymentStatus === 'Due' : r.paymentStatus !== 'Due');

        return matchesSearch && matchesType && matchesGarage && matchesVehicle && matchesPaymentStatus && !isOperationalUtilityRecord(r);
    });

    const filteredRecords = baseFilteredRecords.filter(r => {
        if (activeCategory === 'All') return true;

        // Use the same keyword logic as Master Data for perfect synchronization
        const keywords = [
            activeCategory,
            ...(subCategories[activeCategory] || [])
        ].map(s => s.toLowerCase().replace(' system', '').trim()).filter(Boolean);

        const rType = (r.maintenanceType || '').toLowerCase();
        const rCat = (r.category || '').toLowerCase();
        const rDesc = (r.description || '').toLowerCase();
        const searchStr = `${rType} ${rCat} ${rDesc}`.toLowerCase();

        return keywords.some(kw => searchStr.includes(kw.toLowerCase()));
    });

    const categoryStats = maintenanceTypes.reduce((acc, type) => {
        const keywords = [
            type,
            ...(subCategories[type] || [])
        ].map(s => s.toLowerCase().replace(' system', '').trim()).filter(Boolean);

        acc[type] = baseFilteredRecords.filter(r => {
            const rType = (r.maintenanceType || '').toLowerCase();
            const rCat = (r.category || '').toLowerCase();
            const rDesc = (r.description || '').toLowerCase();
            const searchStr = `${rType} ${rCat} ${rDesc}`.toLowerCase();
            return keywords.some(kw => searchStr.includes(kw.toLowerCase()));
        }).length;
        return acc;
    }, {});

    const vehicleStats = uniqueVehicles.reduce((acc, plate) => {
        acc[plate] = (records || []).filter(r => {
            const matchesSearch = (r.vehicle?.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                r.maintenanceType?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                r.garageName?.toLowerCase()?.includes(searchTerm.toLowerCase()));
            const matchesType = filterType === 'All' || (r.maintenanceType && r.maintenanceType.split(', ').includes(filterType));
            const matchesGarage = filterGarage === 'All' || (r.garageName || r.vendorName) === filterGarage;

            if (!matchesSearch || !matchesType || !matchesGarage || isOperationalUtilityRecord(r)) return false;

            if (activeCategory !== 'All') {
                const keywords = [activeCategory, ...(subCategories[activeCategory] || [])].map(s => s.toLowerCase().replace(' system', '').trim()).filter(Boolean);
                const searchStr = `${(r.maintenanceType || '').toLowerCase()} ${(r.category || '').toLowerCase()} ${(r.description || '').toLowerCase()}`;
                if (!keywords.some(kw => searchStr.includes(kw.toLowerCase()))) return false;
            }

            return r.vehicle?.carNumber === plate;
        }).length;
        return acc;
    }, {});

    const garageStats = uniqueGarages.reduce((acc, g) => {
        acc[g] = (records || []).filter(r => {
            const matchesSearch = (r.vehicle?.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                r.maintenanceType?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                r.garageName?.toLowerCase()?.includes(searchTerm.toLowerCase()));
            const matchesType = filterType === 'All' || (r.maintenanceType && r.maintenanceType.split(', ').includes(filterType));
            const matchesVehicle = filterVehicle === 'All' || r.vehicle?.carNumber === filterVehicle;

            if (!matchesSearch || !matchesType || !matchesVehicle || isOperationalUtilityRecord(r)) return false;

            if (activeCategory !== 'All') {
                const keywords = [activeCategory, ...(subCategories[activeCategory] || [])].map(s => s.toLowerCase().replace(' system', '').trim()).filter(Boolean);
                const searchStr = `${(r.maintenanceType || '').toLowerCase()} ${(r.category || '').toLowerCase()} ${(r.description || '').toLowerCase()}`;
                if (!keywords.some(kw => searchStr.includes(kw.toLowerCase()))) return false;
            }

            return (r.garageName || r.vendorName) === g;
        }).length;
        return acc;
    }, {});

    const frequencyInSelectedPeriod = filteredRecords.length;

    const totalMaintenanceCost = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalPaidCost = filteredRecords.filter(r => r.paymentStatus !== 'Due').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalDueCost = filteredRecords.filter(r => r.paymentStatus === 'Due').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const dueRecordsCount = filteredRecords.filter(r => r.paymentStatus === 'Due').length;

    const filteredVendors = (vendors || []).filter(v => {
        const matchesSearch = !vendorSearch ||
            (v.vendorName || '').toLowerCase().includes(vendorSearch.toLowerCase()) ||
            (v.vehicles || []).some(plate => (plate || '').toLowerCase().includes(vendorSearch.toLowerCase()));

        if (!matchesSearch) return false;

        if (vendorFilterStatus === 'due') {
            return (v.dueAmount || 0) > 0;
        } else if (vendorFilterStatus === 'paid') {
            return (v.dueAmount || 0) === 0;
        }
        return true;
    });

    const filteredAggData = (aggData || [])
        .filter(v => {
            const matchesSearch = v.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.model?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVehicle = filterVehicle === 'All' || v.carNumber === filterVehicle;
            return matchesSearch && matchesVehicle;
        })
        .sort((a, b) => (a.carNumber || '').localeCompare(b.carNumber || ''))
        .map(v => {
            const allRecs = (v.maintenance?.records || v.maintenance?.recs || []).filter(r => !isOperationalUtilityRecord(r));

            const assignments = new Set();
            const cats = {};
            
            // Map our explicit types to keywords for better matching
            const categoryMap = {
                'Regular Service': ['regular', 'service', 'oil change', 'filter'],
                'Tyres / Wheels': ['tyre', 'wheel', 'alignment', 'balancing'],
                'Engine / Mechanical': ['engine', 'mechanical', 'gear', 'clutch', 'exhaust', 'fuel pump'],
                'AC / Cooling': ['ac ', 'cooling', 'compressor', 'radiator', 'gas refill'],
                'Suspension': ['suspension', 'shock', 'strut', 'bush'],
                'Electrical': ['electrical', 'battery', 'sensor', 'light', 'alternator', 'starter'],
                'Other': []
            };

            const explicitCats = NEXT_SERVICE_TYPES.filter(c => c !== 'Other');

            explicitCats.forEach(catName => {
                const keywords = categoryMap[catName] || [catName.toLowerCase()];

                const matched = allRecs.filter(r => {
                    if (assignments.has(r._id)) return false;
                    const searchStr = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
                    const isMatch = keywords.some(kw => searchStr.includes(kw.toLowerCase()));
                    return isMatch;
                });

                matched.forEach(r => assignments.add(r._id));
                cats[catName] = { amount: matched.reduce((s, r) => s + (r.amount || 0), 0), records: matched };
            });

            const otherRecs = allRecs.filter(r => !assignments.has(r._id));
            cats['Other'] = { amount: otherRecs.reduce((s, r) => s + (r.amount || 0), 0), records: otherRecs };

            const recalculatedTotal = NEXT_SERVICE_TYPES.reduce((s, cat) => s + (cats[cat]?.amount || 0), 0);

            return { ...v, cats, recalculatedTotal };
        })
        .sort((a, b) => {
            if (sortConfig.key === 'total') {
                const valA = a.recalculatedTotal || 0;
                const valB = b.recalculatedTotal || 0;
                return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
            } else {
                const valA = a.cats[sortConfig.key]?.amount || 0;
                const valB = b.cats[sortConfig.key]?.amount || 0;
                return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
            }
        });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Vehicle Maintenance" description="Track and manage your fleet's maintenance schedules and repair histories." />

            {/* Header Section */}
            <header className="mobile-stack" style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '20px 0 30px',
                gap: '20px',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '30px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: `0 10px 20px ${theme.primary}40`,
                        flexShrink: 0
                    }}>
                        <Wrench size={24} color="black" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Fleet Health</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '950', margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>
                            Car <span className="theme-gradient-text">Maintenance</span>
                        </h1>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Period Selectors Group */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '14px',
                        padding: '4px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        height: '44px'
                    }}>
                        {viewMode !== 'super' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                style={{
                                    background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '13px',
                                    padding: '0 12px', height: '100%', outline: 'none', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: '6px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>FY</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                style={{ background: 'transparent', border: 'none', color: theme.primary, fontWeight: '900', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                            >
                                {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>{y}-{String(y + 1).slice(-2)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* View Mode Segmented Control */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        height: '44px'
                    }}>
                        <button
                            onClick={() => setViewMode('history')}
                            style={{
                                padding: '0 16px', borderRadius: '10px', border: 'none',
                                background: viewMode === 'history' ? theme.primary : 'transparent',
                                color: viewMode === 'history' ? 'black' : 'rgba(255,255,255,0.4)',
                                fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <History size={14} /> History
                        </button>
                        <button
                            onClick={() => { setViewMode('vendor'); setSelectedVendorForDetails(null); }}
                            style={{
                                padding: '0 16px', borderRadius: '10px', border: 'none',
                                background: viewMode === 'vendor' ? theme.primary : 'transparent',
                                color: viewMode === 'vendor' ? 'black' : 'rgba(255,255,255,0.4)',
                                fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Store size={14} /> Vendor Ledger
                            {(vendorSummary?.dueAmount || 0) > 0 && (
                                <span style={{
                                    background: viewMode === 'vendor' ? '#0f172a' : '#f43f5e',
                                    color: viewMode === 'vendor' ? '#f43f5e' : 'white',
                                    fontSize: '10px',
                                    padding: '2px 7px',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    marginLeft: '4px'
                                }}>
                                    ₹{Math.round(vendorSummary.dueAmount / 1000)}k Due
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setViewMode('super'); setSelectedMonth('All'); }}
                            style={{
                                padding: '0 16px', borderRadius: '10px', border: 'none',
                                background: viewMode === 'super' ? theme.primary : 'transparent',
                                color: viewMode === 'super' ? 'black' : 'rgba(255,255,255,0.4)',
                                fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Zap size={14} /> Master
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleExportPDF}
                            style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            className="glass-card-hover-effect" title="Export PDF"
                        >
                            <FileText size={18} />
                        </button>
                        <button
                            onClick={downloadExcel}
                            style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            className="glass-card-hover-effect" title="Export Excel"
                        >
                            <FileSpreadsheet size={18} />
                        </button>
                        <button
                            onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
                            style={{ width: '44px', height: '44px', borderRadius: '12px', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary || theme.primary} 100%)`, border: 'none', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 8px 15px ${theme.primary}30`, transition: '0.2s' }}
                            className="glass-card-hover-effect" title="Add Record"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Pending Approvals Section */}
            {pendingExpenses.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 10px #f43f5e' }}></div>
                        Driver Approvals (Awaiting)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {pendingExpenses.map((entry) => (
                            <motion.div
                                key={entry._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ padding: '20px', borderLeft: '4px solid var(--primary)', background: 'rgba(251, 191, 36, 0.05)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {entry.slipPhoto ? (
                                            <img
                                                src={`/${entry.slipPhoto}`}
                                                onClick={() => setSelectedBillPhoto(entry.slipPhoto)}
                                                style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                        ) : (
                                            <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <FileText size={20} color="rgba(255,255,255,0.2)" />
                                            </div>
                                        )}
                                        <div>
                                            <p style={{ color: 'white', fontWeight: '800', fontSize: '16px', margin: 0 }}>₹{entry.amount}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0' }}>{entry.driver || 'Driver'} • {entry.carNumber}</p>
                                        </div>
                                    </div>
                                    <span style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', fontSize: '10px', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', textTransform: 'uppercase' }}>{entry.fuelType || 'Service'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                    <span>{entry.km} KM</span>
                                    <span>{formatDateTimeIST(entry.date)}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        onClick={() => handleApprove(entry.attendanceId, entry._id)}
                                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(entry.attendanceId, entry._id)}
                                        style={{ background: 'rgba(255,255,255,0.05)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}



            {/* 4 Summary & Filter Boxes (History view as requested) */}
            {viewMode === 'history' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)' }}>
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Total Spend (Filtered)</p>
                            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0 }}>
                                ₹{totalMaintenanceCost.toLocaleString()}
                            </h2>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#8b5cf6' }}>
                            <MapPin size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Garage Filter</p>
                            <select
                                value={filterGarage}
                                onChange={(e) => setFilterGarage(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', width: '100%', outline: 'none', cursor: 'pointer', textOverflow: 'ellipsis' }}
                            >
                                <option value="All" style={{ background: '#1e293b', color: 'white' }}>All Garages</option>
                                {uniqueGarages.map(g => <option key={g} value={g} style={{ background: '#1e293b', color: 'white' }}>{g} ({garageStats[g] || 0})</option>)}
                            </select>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${theme.primary}20`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: theme.primary }}>
                            <Car size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Car Filter</p>
                            <select
                                value={filterVehicle}
                                onChange={(e) => setFilterVehicle(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', width: '100%', outline: 'none', cursor: 'pointer', textOverflow: 'ellipsis' }}
                            >
                                <option value="All" style={{ background: '#1e293b', color: 'white' }}>All Cars</option>
                                {uniqueVehicles.filter(v => (vehicleStats[v] || 0) > 0).map(v => <option key={v} value={v} style={{ background: '#1e293b', color: 'white' }}>{v} ({vehicleStats[v]})</option>)}
                            </select>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#38bdf8' }}>
                            <Settings size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Category Filter</p>
                            <select
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', width: '100%', outline: 'none', cursor: 'pointer', textOverflow: 'ellipsis' }}
                            >
                                <option value="All" style={{ background: '#1e293b', color: 'white' }}>All Types</option>
                                {maintenanceTypes.filter(t => categoryStats[t] > 0).map(t => (
                                    <option key={t} value={t} style={{ background: '#1e293b', color: 'white' }}>{t} ({categoryStats[t]})</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Filter Toolbar (Visible in History view) */}
            {viewMode === 'history' && (
                <div className="glass-card" style={{
                    padding: '14px 20px',
                    borderRadius: '16px',
                    marginBottom: '25px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1 }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 300px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                            <input
                                type="text"
                                placeholder="Search vehicle, garage, repair description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px 9px 36px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {(searchTerm || filterGarage !== 'All' || filterVehicle !== 'All' || activeCategory !== 'All' || filterPaymentStatus !== 'All') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterGarage('All');
                                setFilterVehicle('All');
                                setActiveCategory('All');
                                setFilterPaymentStatus('All');
                            }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            )}



            {/* View Mode Switching Logic */}
            {viewMode === 'super' ? (
                <>
                    <div className="glass-card" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '25px 35px',
                        marginBottom: '30px',
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '24px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.primary, marginBottom: '6px' }}>
                                <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: theme.primary, boxShadow: `0 0 10px ${theme.primary}50` }}></div>
                                <span style={{ fontSize: '11px', fontWeight: '1000', textTransform: 'uppercase', letterSpacing: '2px' }}>Fleet Economics</span>
                            </div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: '950', letterSpacing: '-1px' }}>
                                Master Maintenance <span style={{ opacity: 0.3 }}>{selectedYear}-{String(selectedYear + 1).slice(-2)}</span>
                            </h2>
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>FLEET SIZE</div>
                                <div style={{ color: 'white', fontWeight: '1000', fontSize: '22px' }}>{filteredAggData.length}</div>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: theme.primary, fontWeight: '1000', textTransform: 'uppercase', marginBottom: '4px' }}>TOTAL COST</div>
                                <div style={{ color: '#10b981', fontWeight: '1000', fontSize: '22px', textShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                                    ₹{filteredAggData.reduce((s, v) => s + (v.recalculatedTotal || 0), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '0', background: 'rgba(30,30,40,0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginTop: '10px' }}>
                        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', minWidth: '1500px' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ textAlign: 'left', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)' }}>
                                        <th style={{ position: 'sticky', left: 0, zIndex: 11, background: '#1e293b', padding: '20px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>Vehicle</th>
                                        {NEXT_SERVICE_TYPES.map(cat => (
                                            <th key={cat} onClick={() => handleSort(cat)} style={{ cursor: 'pointer', padding: '20px 25px', color: sortConfig.key === cat ? 'var(--primary)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', minWidth: '150px' }}>
                                                {cat} {sortConfig.key === cat && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                            </th>
                                        ))}
                                        <th onClick={() => handleSort('total')} style={{ cursor: 'pointer', position: 'sticky', right: 0, zIndex: 11, background: '#1e293b', padding: '20px 25px', color: sortConfig.key === 'total' ? 'var(--primary)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                            Total Amount {sortConfig.key === 'total' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAggData.length === 0 ? (
                                        <tr><td colSpan={NEXT_SERVICE_TYPES.length + 2} style={{ textAlign: 'center', padding: '100px', color: 'rgba(255,255,255,0.2)', fontWeight: '800' }}>No fleet data identified for {selectedYear}.</td></tr>
                                    ) : (
                                        filteredAggData.map((v, idx) => {
                                            const Cell = ({ data, color = 'var(--primary)', label = 'Jobs' }) => (
                                                <td style={{ padding: '20px 25px' }}>
                                                    <div style={{ color: data?.amount > 0 ? 'white' : 'rgba(255,255,255,0.05)', fontWeight: '900', fontSize: '15px' }}>
                                                        {data?.amount > 0 ? `₹${data.amount.toLocaleString()}` : '₹0'}
                                                    </div>
                                                    <div style={{ marginTop: '8px' }}>
                                                        {data?.records?.length > 0 ? (
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    // Only for visual selection, no modal trigger
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    width: '100%',
                                                                    maxWidth: '120px',
                                                                    padding: '4px 8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '8px',
                                                                    color: 'rgba(255,255,255,0.6)',
                                                                    fontSize: '10px',
                                                                    fontWeight: '800',
                                                                    outline: 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <option value="" hidden>View {data.records.length} {label}</option>
                                                                {data.records.map((m, i) => (
                                                                    <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>
                                                                        {formatDateIST(m.billDate || m.date)} - ₹{(m.amount || 0).toLocaleString()}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            );

                                            return (
                                                <motion.tr
                                                    key={v.vehicleId || idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                                >
                                                    <td style={{ position: 'sticky', left: 0, zIndex: 5, background: '#0f172a', padding: '20px 25px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ color: 'white', fontWeight: '900', fontSize: '15px', letterSpacing: '-0.5px' }}>{v.carNumber}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '700' }}>{v.model || 'Fleet Unit'}</div>
                                                    </td>

                                                    {NEXT_SERVICE_TYPES.map(cat => (
                                                        <Cell key={cat} data={v.cats[cat]} label="Jobs" />
                                                    ))}

                                                    <td style={{ position: 'sticky', right: 0, zIndex: 5, background: '#0f172a', padding: '20px 25px', textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Maint. Total</div>
                                                        <div style={{ color: '#10b981', fontWeight: '950', fontSize: '18px', letterSpacing: '-0.5px' }}>
                                                            ₹{(v.recalculatedTotal || 0).toLocaleString()}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : viewMode === 'vendor' ? (
                selectedVendorForDetails ? (
                    /* ── CLEAN VENDOR LEDGER (MATCHES EMJAY BREWERY ERP) ── */
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(180deg, #0d1527 0%, #070b14 100%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.8)'
                    }}>
                        {/* Top Header Bar matching Emjay Brewery */}
                        <div style={{
                            padding: '16px 28px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(15, 23, 42, 0.95)',
                            gap: '16px',
                            flexShrink: 0,
                            flexWrap: 'wrap'
                        }}>
                            {/* Left: Back button + Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedVendorForDetails(null)}
                                    className="glass-card-hover-effect"
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: '0.15s'
                                    }}
                                    title="Back to All Garages"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px' }}>
                                        Vendor Ledger
                                    </div>
                                    <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '950', margin: '2px 0 0', letterSpacing: '-0.3px' }}>
                                        {selectedVendorForDetails.vendorName}
                                    </h2>
                                </div>
                            </div>

                            {/* Right: Filter Period (Month Dropdown) + Record Payment + Export CSV */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                {/* Filter Period Month Dropdown */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Filter Period
                                    </span>
                                    <select
                                        value={vendorLedgerMonth}
                                        onChange={(e) => setVendorLedgerMonth(e.target.value)}
                                        style={{
                                            height: '36px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            background: '#070c18',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="All">All Months ({(selectedVendorForDetails.bills || []).length})</option>
                                        {vendorDetailMonthStats.map(m => (
                                            <option key={m.key} value={m.key}>
                                                {m.label} ({m.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Primary Record Payment Button */}
                                <button 
                                    type="button"
                                    onClick={() => openSettleModal({ type: 'vendor', vendor: selectedVendorForDetails })}
                                    className="glass-card-hover-effect"
                                    style={{ 
                                        background: '#2563eb', 
                                        border: 'none', 
                                        color: '#ffffff', 
                                        padding: '9px 18px', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        fontWeight: '900', 
                                        cursor: 'pointer', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        height: '36px',
                                        letterSpacing: '0.4px',
                                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                                    }}
                                    title={`Record payment or settle dues for ${selectedVendorForDetails.vendorName}`}
                                >
                                    <Plus size={14} />
                                    <span>RECORD PAYMENT</span>
                                </button>

                                {/* Export CSV */}
                                <button 
                                    type="button"
                                    onClick={exportMaintenanceVendorLedgerCSV}
                                    className="glass-card-hover-effect"
                                    style={{ 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'rgba(255,255,255,0.8)', 
                                        padding: '8px 12px', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        fontWeight: '700', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        height: '36px'
                                    }}
                                    title="Export Ledger to Excel / CSV"
                                >
                                    <Download size={14} />
                                    <span>Export CSV</span>
                                </button>
                            </div>
                        </div>

                        {/* 3 Top Summary Cards */}
                        <div style={{ padding: '20px 28px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {/* Card 1: TOTAL BILLED */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                padding: '16px 20px'
                            }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>
                                    Total Billed
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '1000', color: 'white', marginTop: '4px' }}>
                                    ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.totalAmount || 0) : activeMonthBilledTotal).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                    {displayedVendorBills.length} maintenance entries
                                </div>
                            </div>

                            {/* Card 2: TOTAL PAID */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                padding: '16px 20px'
                            }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>
                                    Total Paid
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '1000', color: '#34d399', marginTop: '4px' }}>
                                    ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.paidAmount || 0) : activeMonthPaidTotal).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                    {displayedVendorBills.filter(b => b.paymentStatus === 'Paid' || (b.paidAmount || 0) > 0).length} settled
                                </div>
                            </div>

                            {/* Card 3: CURRENT BALANCE */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                padding: '16px 20px'
                            }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>
                                    Current Balance
                                </div>
                                <div style={{ 
                                    fontSize: '24px', 
                                    fontWeight: '1000', 
                                    marginTop: '4px',
                                    color: (vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0 ? '#f87171' : 'white'
                                }}>
                                    ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                    {(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0 ? 'Payable to garage' : 'Account Settled'}
                                </div>
                            </div>
                        </div>

                        {/* Total Outstanding Banner */}
                        <div style={{
                            margin: '16px 28px 0',
                            padding: '16px 22px',
                            borderRadius: '12px',
                            background: (vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0 
                                ? 'rgba(239, 68, 68, 0.08)' 
                                : 'rgba(16, 185, 129, 0.08)',
                            border: (vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0
                                ? '1px solid rgba(239, 68, 68, 0.25)' 
                                : '1px solid rgba(16, 185, 129, 0.25)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px',
                                    color: (vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0 ? '#fca5a5' : '#86efac'
                                }}>
                                    Total Outstanding
                                </div>
                                <div style={{
                                    fontSize: '26px',
                                    fontWeight: '1000',
                                    color: (vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0 ? '#f87171' : '#34d399',
                                    marginTop: '2px',
                                    letterSpacing: '-0.5px'
                                }}>
                                    ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: 'rgba(255,255,255,0.65)',
                                textAlign: 'right'
                            }}>
                                {(vendorLedgerMonth === 'All' ? (selectedVendorForDetails.dueAmount || 0) : activeMonthDueTotal) > 0
                                    ? 'Payable balance pending for garage settlements'
                                    : 'All maintenance bills are fully settled with this garage'}
                            </div>
                        </div>

                        {/* Section Header: TRANSACTION LEDGER + Search */}
                        <div style={{ 
                            padding: '20px 28px 12px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            gap: '12px', 
                            flexWrap: 'wrap'
                        }}>
                            <h3 style={{ 
                                color: 'white', 
                                fontSize: '13px', 
                                fontWeight: '900', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.8px', 
                                margin: 0 
                            }}>
                                Transaction Ledger
                            </h3>
                            <div style={{ position: 'relative', width: '280px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                                <input
                                    type="text"
                                    placeholder="Search vehicle, service, bill #..."
                                    value={vendorLedgerSearch}
                                    onChange={(e) => setVendorLedgerSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '34px',
                                        paddingLeft: '34px',
                                        paddingRight: '12px',
                                        background: 'rgba(15, 23, 42, 0.7)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* 5-Column Table matching Emjay Brewery Layout */}
                        <div className="table-responsive-wrapper" style={{ margin: '0 28px 28px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15, 23, 42, 0.5)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '41%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '16%' }} />
                                </colgroup>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <th style={{ padding: '12px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Date</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Narration</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Paid Amount</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Bill Amount</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedVendorBills.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '50px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontWeight: '700', fontSize: '13px' }}>
                                                No maintenance transactions found for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedVendorBills.map((bill, i) => {
                                            const isDue = bill.paymentStatus === 'Due';
                                            const paidAmt = bill.paymentStatus === 'Paid' ? (bill.amount || 0) : (bill.paidAmount || 0);
                                            return (
                                                <tr key={bill._id || i} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {/* Col 1: DATE */}
                                                    <td style={{ padding: '14px 18px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                        {bill.billDate ? formatDateIST(bill.billDate) : 'N/A'}
                                                    </td>

                                                    {/* Col 2: NARRATION */}
                                                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ color: 'white', fontWeight: '800', fontSize: '13px', letterSpacing: '0.3px' }}>
                                                                {bill.vehicle?.carNumber || 'Fleet Vehicle'}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: '800',
                                                                padding: '2px 8px',
                                                                borderRadius: '5px',
                                                                background: 'rgba(59, 130, 246, 0.12)',
                                                                color: '#60a5fa',
                                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.4px'
                                                            }}>
                                                                {bill.maintenanceType || 'Maintenance'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px', lineHeight: 1.4 }}>
                                                            {bill.category && <span>{bill.category}</span>}
                                                            {bill.description && <span>{bill.category ? ` • ` : ''}{bill.description}</span>}
                                                            {bill.billNumber && <span style={{ color: 'rgba(255,255,255,0.6)' }}> • Bill: #{bill.billNumber}</span>}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: isDue ? '#f87171' : '#34d399', fontWeight: '700', marginTop: '3px' }}>
                                                            {isDue ? 'Payment Pending' : `Settled via ${bill.paymentMode || 'Cash'}`}
                                                        </div>
                                                    </td>

                                                    {/* Col 3: PAID AMOUNT */}
                                                    <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                        <span style={{
                                                            color: paidAmt > 0 ? '#34d399' : 'rgba(255,255,255,0.3)',
                                                            fontWeight: '900',
                                                            fontSize: '13px'
                                                        }}>
                                                            ₹{Number(paidAmt).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>

                                                    {/* Col 4: BILL AMOUNT */}
                                                    <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                        <span style={{
                                                            color: 'white',
                                                            fontWeight: '900',
                                                            fontSize: '13px'
                                                        }}>
                                                            ₹{Number(bill.amount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>

                                                    {/* Col 5: ACTIONS */}
                                                    <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                                            {bill.billPhoto && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedBillPhoto(bill.billPhoto)}
                                                                    className="glass-card-hover-effect"
                                                                    style={{
                                                                        width: '30px',
                                                                        height: '30px',
                                                                        borderRadius: '7px',
                                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                                        color: 'rgba(255,255,255,0.7)',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        flexShrink: 0
                                                                    }}
                                                                    title="View Bill Photo"
                                                                >
                                                                    <FileText size={13} />
                                                                </button>
                                                            )}
                                                            {isDue && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openSettleModal({ type: 'bill', bill: { ...bill, garageName: selectedVendorForDetails.vendorName } })}
                                                                    className="glass-card-hover-effect"
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderRadius: '7px',
                                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                        color: '#f87171',
                                                                        cursor: 'pointer',
                                                                        fontSize: '11px',
                                                                        fontWeight: '800',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        whiteSpace: 'nowrap',
                                                                        flexShrink: 0
                                                                    }}
                                                                    title="Pay this bill"
                                                                >
                                                                    <IndianRupee size={11} /> Pay
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(bill)}
                                                                className="glass-card-hover-effect"
                                                                style={{
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    borderRadius: '7px',
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    color: 'rgba(255,255,255,0.85)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    flexShrink: 0
                                                                }}
                                                                title="Edit Entry (Date, Month, Amount, Mode, Vehicle)"
                                                            >
                                                                <Edit size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(bill._id)}
                                                                className="glass-card-hover-effect"
                                                                style={{
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    borderRadius: '7px',
                                                                    background: 'rgba(244, 63, 94, 0.12)',
                                                                    color: '#f43f5e',
                                                                    border: '1px solid rgba(244, 63, 94, 0.25)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    justifyContent: 'center',
                                                                    alignItems: 'center',
                                                                    flexShrink: 0
                                                                }}
                                                                title="Delete Entry"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ── MAIN VENDOR LEDGER LIST VIEW ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Clean Top KPI Cards (Calm, Elegant) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.6px' }}>Total Invoiced</p>
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: 0 }}>
                                    ₹{(vendorSummary.totalAmount || 0).toLocaleString()}
                                </h3>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                    {vendorSummary.totalVendors || vendors.length} garages tracked
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.6px' }}>Total Paid</p>
                                <h3 style={{ color: '#10b981', fontSize: '20px', fontWeight: '900', margin: 0 }}>
                                    ₹{(vendorSummary.paidAmount || 0).toLocaleString()}
                                </h3>
                                <div style={{ fontSize: '11px', color: 'rgba(16, 185, 129, 0.7)', marginTop: '2px' }}>
                                    {vendorSummary.paidVendorsCount || vendors.filter(v => (v.dueAmount || 0) === 0).length} garages settled
                                </div>
                            </div>

                            <div
                                className="glass-card"
                                onClick={() => setVendorFilterStatus('due')}
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: '14px',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    cursor: 'pointer'
                                }}
                            >
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.6px' }}>Net Outstanding Due</p>
                                <h3 style={{ color: (vendorSummary.dueAmount || 0) > 0 ? '#f43f5e' : 'white', fontSize: '20px', fontWeight: '900', margin: 0 }}>
                                    ₹{(vendorSummary.dueAmount || 0).toLocaleString()}
                                </h3>
                                <div style={{ fontSize: '11px', color: (vendorSummary.dueAmount || 0) > 0 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                    {(vendorSummary.dueVendorsCount || 0) > 0 ? `${vendorSummary.dueVendorsCount} garages pending` : 'Zero pending dues'}
                                </div>
                            </div>

                            <div
                                className="glass-card"
                                onClick={() => setVendorFilterStatus('all')}
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: '14px',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    cursor: 'pointer'
                                }}
                            >
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.6px' }}>Garages Tracked</p>
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: 0 }}>
                                    {vendorSummary.totalVendors || vendors.length}
                                </h3>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                    Active fleet vendors
                                </div>
                            </div>
                        </div>

                        {/* Filter Toolbar - Clean, No Emojis, No Loud Colors */}
                        <div className="glass-card" style={{
                            padding: '12px 18px',
                            borderRadius: '14px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            {/* Left: Mode toggle & Status pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    display: 'flex',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '2px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVendorTimeMode('allTime');
                                            fetchVendorSummary(true);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: vendorTimeMode === 'allTime' ? theme.primary : 'transparent',
                                            color: vendorTimeMode === 'allTime' ? 'black' : 'rgba(255,255,255,0.6)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        All-Time
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVendorTimeMode('period');
                                            fetchVendorSummary(false);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: vendorTimeMode === 'period' ? theme.primary : 'transparent',
                                            color: vendorTimeMode === 'period' ? 'black' : 'rgba(255,255,255,0.6)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Period
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setVendorFilterStatus('due')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: vendorFilterStatus === 'due' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                            background: vendorFilterStatus === 'due' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255,255,255,0.03)',
                                            color: vendorFilterStatus === 'due' ? '#f43f5e' : 'rgba(255,255,255,0.6)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Pending Due ({vendors.filter(v => (v.dueAmount || 0) > 0).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVendorFilterStatus('all')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: vendorFilterStatus === 'all' ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.06)',
                                            background: vendorFilterStatus === 'all' ? `${theme.primary}18` : 'rgba(255,255,255,0.03)',
                                            color: vendorFilterStatus === 'all' ? theme.primary : 'rgba(255,255,255,0.6)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        All Garages ({vendors.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVendorFilterStatus('paid')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: vendorFilterStatus === 'paid' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                            background: vendorFilterStatus === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                                            color: vendorFilterStatus === 'paid' ? '#10b981' : 'rgba(255,255,255,0.6)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Fully Settled ({vendors.filter(v => (v.dueAmount || 0) === 0).length})
                                    </button>
                                </div>
                            </div>

                            {/* Right: Search & Export */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px', justifyContent: 'flex-end' }}>
                                <div style={{ position: 'relative', minWidth: '160px', maxWidth: '280px', width: '100%' }}>
                                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search garage or car #..."
                                        value={vendorSearch}
                                        onChange={(e) => setVendorSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '7px 10px 7px 30px',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'white',
                                            fontSize: '12px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={downloadVendorExcel}
                                    className="glass-card-hover-effect"
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        color: '#10b981',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <FileSpreadsheet size={14} /> Export Dues
                                </button>
                            </div>
                        </div>

                        {/* Clean LogKaro HTML Table */}
                        {vendorLoading ? (
                            <div style={{ padding: '80px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                                <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>Loading garage balances...</p>
                            </div>
                        ) : filteredVendors.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Store size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '12px' }} />
                                <h3 style={{ color: 'white', fontSize: '15px' }}>No garages match your filter</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Try switching filters or clearing your search query.</p>
                            </div>
                        ) : (
                            <div className="table-responsive-wrapper" style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.45)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Garage / Vendor</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Vehicles Serviced</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Invoiced</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Paid</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Balance Due</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVendors.map((vendor, idx) => {
                                            const hasDue = (vendor.dueAmount || 0) > 0;
                                            return (
                                                <tr
                                                    key={vendor.vendorName || idx}
                                                    onClick={() => {
                                                        setVendorLedgerMonth('All');
                                                        setSelectedVendorForDetails(vendor);
                                                    }}
                                                    className="table-row-hover"
                                                    style={{
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {/* Garage Name */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(255, 255, 255, 0.04)',
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                flexShrink: 0
                                                            }}>
                                                                <Store size={15} />
                                                            </div>
                                                            <div>
                                                                <div style={{ color: 'white', fontSize: '14px', fontWeight: '800' }}>
                                                                    {vendor.vendorName}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                                                                    {vendor.totalBills} bills
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Vehicles Serviced */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                                            {(vendor.vehicles || []).slice(0, 3).map((c, ci) => (
                                                                <span key={ci} style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '700',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '5px',
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    color: 'rgba(255,255,255,0.75)',
                                                                    border: '1px solid rgba(255,255,255,0.07)'
                                                                }}>
                                                                    {c}
                                                                </span>
                                                            ))}
                                                            {(vendor.vehicles || []).length > 3 && (
                                                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.35)' }}>
                                                                    +{(vendor.vehicles || []).length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Total Invoiced */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <span style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>
                                                            ₹{(vendor.totalAmount || 0).toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Total Paid */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <span style={{ color: '#10b981', fontWeight: '800', fontSize: '13px' }}>
                                                            ₹{(vendor.paidAmount || 0).toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Balance Due */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <span style={{ color: hasDue ? '#f43f5e' : 'rgba(255,255,255,0.3)', fontWeight: hasDue ? '900' : '600', fontSize: '13px' }}>
                                                            ₹{(vendor.dueAmount || 0).toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                        {hasDue ? (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                padding: '3px 8px',
                                                                borderRadius: '6px',
                                                                fontWeight: '800',
                                                                background: 'rgba(244, 63, 94, 0.1)',
                                                                color: '#f43f5e',
                                                                border: '1px solid rgba(244, 63, 94, 0.2)'
                                                            }}>
                                                                Pending
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                padding: '3px 8px',
                                                                borderRadius: '6px',
                                                                fontWeight: '800',
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10b981',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                                            }}>
                                                                Settled
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setVendorLedgerMonth('All');
                                                                    setSelectedVendorForDetails(vendor);
                                                                }}
                                                                className="glass-card-hover-effect"
                                                                style={{
                                                                    padding: '5px 10px',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'white',
                                                                    fontSize: '11px',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <BookOpen size={11} /> Ledger
                                                            </button>
                                                            {hasDue && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openSettleModal({ type: 'vendor', vendor });
                                                                    }}
                                                                    className="glass-card-hover-effect"
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(244, 63, 94, 0.12)',
                                                                        border: '1px solid rgba(244, 63, 94, 0.25)',
                                                                        color: '#f43f5e',
                                                                        fontSize: '11px',
                                                                        fontWeight: '800',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <IndianRupee size={11} /> Pay
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            ) : (
                <>
                    <div className="table-responsive-wrapper hide-mobile" style={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
                        {loading ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                                <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Loading history...</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Date & Vehicle</th>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Service Details</th>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>KM Reading</th>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Garage / Vendor</th>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Cost & Pay</th>
                                        <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '100px', textAlign: 'center' }}>
                                                <Wrench size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                                                <h3 style={{ color: 'white' }}>No history found</h3>
                                            </td>
                                        </tr>
                                    ) : filteredRecords.map((record, idx) => (
                                        <motion.tr
                                            key={record._id || idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                        >
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>
                                                    {record.billDate ? formatDateIST(record.billDate) : 'N/A'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <Car size={12} style={{ color: 'var(--primary)' }} />
                                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>{record.vehicle?.carNumber || 'N/A'}</span>
                                                </div>
                                                {record.driver && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Driver: {record.driver.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                {(() => {
                                                    const currentTypes = (record.maintenanceType || '').split(', ').filter(Boolean);
                                                    const displayTypes = activeCategory === 'All'
                                                        ? currentTypes
                                                        : currentTypes.filter(t => t === activeCategory);

                                                    const currentCats = (record.category || '').split(', ').filter(Boolean);
                                                    const categoryList = subCategories[activeCategory] || [];
                                                    const displayCats = activeCategory === 'All'
                                                        ? currentCats.join(', ')
                                                        : currentCats.filter(c =>
                                                            categoryList.some(item => c.toLowerCase().includes(item.toLowerCase())) ||
                                                            c.toLowerCase().includes('labour') ||
                                                            c.toLowerCase().includes('labor')
                                                        ).join(', ') || record.category;

                                                    return (
                                                        <>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                {displayTypes.map((t, i) => (
                                                                    <span key={i} style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                                        color: '#818cf8',
                                                                        fontWeight: '800',
                                                                        textTransform: 'uppercase'
                                                                    }}>{t}</span>
                                                                ))}
                                                                {record.status === 'pending' && (
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                                        color: 'var(--primary)',
                                                                        fontWeight: '800',
                                                                        textTransform: 'uppercase'
                                                                    }}>PENDING APPROVAL</span>
                                                                )}
                                                                {record.source === 'Driver App' && (
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                                        color: '#10b981',
                                                                        fontWeight: '800',
                                                                        textTransform: 'uppercase'
                                                                    }}>DRIVER APP</span>
                                                                )}
                                                            </div>
                                                            {/* Sub-categories/description removed for a cleaner dashboard view as requested */}
                                                        </>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                {record.currentKm ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>{Number(record.currentKm).toLocaleString()}</div>
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kilometers</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>N/A</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{record.garageName || record.vendorName || 'Self/Local'}</div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                    Bill: {record.billNumber || 'N/A' || record.description}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px' }}>
                                                <div style={{ color: '#10b981', fontWeight: '800', fontSize: '16px' }}>₹{Number(record.amount || 0).toLocaleString()}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                                                        background: (record.paymentStatus === 'Due') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                        color: (record.paymentStatus === 'Due') ? '#f43f5e' : '#10b981',
                                                        fontWeight: '900', textTransform: 'uppercase',
                                                        border: `1px solid ${(record.paymentStatus === 'Due') ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`
                                                    }}>{record.paymentStatus || 'Paid'}</span>
                                                    {record.paymentStatus !== 'Due' && (
                                                        <span style={{
                                                            fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                                                            background: record.bankAccount ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                                            color: record.bankAccount ? '#60a5fa' : '#facc15',
                                                            fontWeight: '800',
                                                            border: `1px solid ${record.bankAccount ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                                                        }}>
                                                            {(() => {
                                                                if (record.bankAccount) {
                                                                    if (typeof record.bankAccount === 'object') {
                                                                        return `🏦 ${record.bankAccount.accountName || record.bankAccount.bankName || 'Bank'}`;
                                                                    }
                                                                    const found = bankAccounts?.find(b => b._id === record.bankAccount);
                                                                    return `🏦 ${found ? (found.accountName || found.bankName) : 'Bank'}`;
                                                                }
                                                                return '💵 Cash';
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {record.status === 'pending' ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleApprove(record.attendanceId, record._id)}
                                                                className="glass-card-hover-effect"
                                                                style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
                                                            >
                                                                APPROVE
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(record.attendanceId, record._id)}
                                                                className="glass-card-hover-effect"
                                                                style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
                                                            >
                                                                REJECT
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', alignItems: 'center' }}>
                                                        {record.paymentStatus === 'Due' && (
                                                            <button
                                                                onClick={() => openSettleModal({ type: 'bill', bill: record })}
                                                                className="glass-card-hover-effect"
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '10px',
                                                                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontSize: '11px',
                                                                    fontWeight: '900',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    boxShadow: '0 4px 10px rgba(244, 63, 94, 0.3)'
                                                                }}
                                                                title="Settle this due bill now"
                                                            >
                                                                <IndianRupee size={12} /> Pay Due
                                                            </button>
                                                        )}
                                                        {record.billPhoto && (
                                                            <button
                                                                onClick={() => setSelectedBillPhoto(record.billPhoto)}
                                                                className="glass-card-hover-effect"
                                                                style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                                title="View Bill"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleEdit(record)}
                                                            className="glass-card-hover-effect"
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                            title="Edit Entry"
                                                        >
                                                            <Wrench size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(record._id)}
                                                            className="glass-card-hover-effect"
                                                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                            title="Delete Entry"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>



                    {/* Mobile Card View */}
                    <div className="show-mobile">
                        <AnimatePresence>
                            {loading ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                                    <p style={{ color: 'var(--text-muted)', marginTop: '15px' }}>Loading...</p>
                                </div>
                            ) : filteredRecords.length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                    <Wrench size={32} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '15px' }} />
                                    <h3 style={{ color: 'white', fontSize: '16px' }}>No records found</h3>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {filteredRecords.map((record, idx) => (
                                        <motion.div
                                            key={record._id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass-card"
                                            style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                                                <div>
                                                    <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>
                                                        {record.billDate ? formatDateIST(record.billDate) : 'N/A'}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                        <Car size={12} style={{ color: 'var(--primary)' }} />
                                                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{record.vehicle?.carNumber || 'N/A'}</span>
                                                    </div>
                                                    {record.driver && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Driver: {record.driver.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#10b981', fontWeight: '800', fontSize: '16px' }}>₹{Number(record.amount || 0).toLocaleString()}</div>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                                                            background: (record.paymentStatus === 'Due') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                            color: (record.paymentStatus === 'Due') ? '#f43f5e' : '#10b981',
                                                            fontWeight: '900', textTransform: 'uppercase',
                                                            border: `1px solid ${(record.paymentStatus === 'Due') ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`
                                                        }}>{record.paymentStatus || 'Paid'}</span>
                                                        {record.paymentStatus !== 'Due' && (
                                                            <span style={{
                                                                fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                                                                background: record.bankAccount ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                                                color: record.bankAccount ? '#60a5fa' : '#facc15',
                                                                fontWeight: '800',
                                                                border: `1px solid ${record.bankAccount ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                                                            }}>
                                                                {(() => {
                                                                    if (record.bankAccount) {
                                                                        if (typeof record.bankAccount === 'object') {
                                                                            return `🏦 ${record.bankAccount.accountName || record.bankAccount.bankName || 'Bank'}`;
                                                                        }
                                                                        const found = bankAccounts?.find(b => b._id === record.bankAccount);
                                                                        return `🏦 ${found ? (found.accountName || found.bankName) : 'Bank'}`;
                                                                    }
                                                                    return '💵 Cash';
                                                                })()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        color: '#818cf8',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase'
                                                    }}>{record.maintenanceType}</span>
                                                    {record.currentKm && (
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            Reading: {Number(record.currentKm).toLocaleString()} KM
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Category/description removed for a cleaner dashboard view as requested */}
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                    Garage: <span style={{ color: 'white' }}>{record.garageName || record.vendorName || 'Self'}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {record.paymentStatus === 'Due' && (
                                                    <button
                                                        onClick={() => openSettleModal({ type: 'bill', bill: record })}
                                                        style={{ flex: '1 1 100%', padding: '10px', borderRadius: '8px', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: 'white', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '4px', boxShadow: '0 4px 10px rgba(244, 63, 94, 0.3)' }}
                                                    >
                                                        <IndianRupee size={13} /> Pay Due (₹{Number(record.amount || 0).toLocaleString()})
                                                    </button>
                                                )}
                                                {record.billPhoto && (
                                                    <button
                                                        onClick={() => setSelectedBillPhoto(record.billPhoto)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', border: '1px solid rgba(14, 165, 233, 0.2)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <FileText size={14} /> View Bill
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <Wrench size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record._id)}
                                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Add Record Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '850px', padding: 'clamp(20px, 5vw, 40px)' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: 0 }}>{editingId ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Log repairs, services, and part replacements.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>

                            <form onSubmit={handleCreate} style={{ padding: 'clamp(20px, 5vw, 30px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    {/* Maintenance Type Selection */}
                                    <div>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Maintenance Type (Multiple) *</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {maintenanceTypes.map(t => {
                                                const isSelected = formData.maintenanceType.split(', ').includes(t);
                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => {
                                                            let current = formData.maintenanceType ? formData.maintenanceType.split(', ').filter(Boolean) : [];
                                                            if (current.includes(t)) {
                                                                current = current.filter(x => x !== t);
                                                            } else {
                                                                current.push(t);
                                                            }
                                                            setFormData({ ...formData, maintenanceType: current.join(', ') });
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '100px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                                                            color: isSelected ? '#818cf8' : 'rgba(255,255,255,0.5)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Vehicle and Basic Info */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Vehicle *</label>
                                            <SearchableSelect
                                                options={(vehicles || []).map(v => ({ value: v._id, label: `${v.carNumber} (${v.model})` }))}
                                                value={formData.vehicleId}
                                                onChange={(vid) => {
                                                    const selectedVehicle = (vehicles || []).find(v => v._id === vid);
                                                    const autoDriverId = selectedVehicle?.currentDriver?._id || '';
                                                    setFormData({ ...formData, vehicleId: vid, driverId: autoDriverId });
                                                }}
                                                placeholder="Search Vehicle..."
                                                required={true}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Driver (Optional)</label>
                                            <select
                                                className="input-field"
                                                value={formData.driverId}
                                                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                                style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                            >
                                                <option value="" style={{ background: '#0f172a' }}>Select Driver</option>
                                                {(drivers || []).map(d => <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Current KM Reading *</label>
                                            <input
                                                type="number"
                                                className="input-field"
                                                placeholder="e.g. 45000"
                                                value={formData.currentKm}
                                                onChange={(e) => setFormData({ ...formData, currentKm: e.target.value })}
                                                required
                                                style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Sub-Categories */}
                                    <div>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                                            Select Sub-Categories (Multiple)
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {(() => {
                                                    const selectedTypes = formData.maintenanceType.split(', ').filter(Boolean);
                                                    const availableSubCats = [...new Set(selectedTypes.flatMap(t => subCategories[t] || []))];
                                                    return availableSubCats.map(cat => {
                                                        const isSelected = formData.category.split(', ').includes(cat);
                                                        return (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => {
                                                                    let current = formData.category ? formData.category.split(', ').filter(Boolean) : [];
                                                                    if (current.includes(cat)) {
                                                                        current = current.filter(c => c !== cat);
                                                                    } else {
                                                                        current.push(cat);
                                                                    }
                                                                    setFormData({ ...formData, category: current.join(', ') });
                                                                }}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    borderRadius: '100px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '700',
                                                                    border: isSelected ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
                                                                    background: isSelected ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                    color: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
                                                                    boxShadow: isSelected ? '0 0 15px rgba(251, 191, 36, 0.2)' : 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                {cat}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{ height: '40px', fontSize: '13px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, paddingLeft: 0 }}
                                                placeholder="Add custom or other items (comma separated)..."
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Maintenance Description</label>
                                        <textarea
                                            className="input-field"
                                            style={{ height: '80px', paddingTop: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                                            placeholder="Detailed notes about the work done..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    {/* Workshop & Billing */}
                                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Workshop & Billing</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Garage Name *</label>
                                                <input
                                                    required
                                                    className="input-field"
                                                    style={{ borderRadius: '10px' }}
                                                    placeholder="Type or select garage..."
                                                    value={formData.garageName}
                                                    onFocus={() => setShowGarageSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowGarageSuggestions(false), 200)}
                                                    onChange={(e) => setFormData({ ...formData, garageName: e.target.value })}
                                                />
                                                <AnimatePresence>
                                                    {showGarageSuggestions && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                left: 0,
                                                                right: 0,
                                                                zIndex: 100,
                                                                background: '#1e293b',
                                                                borderRadius: '12px',
                                                                marginTop: '5px',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                maxHeight: '200px',
                                                                overflowY: 'auto',
                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                                            }}
                                                            className="custom-scrollbar"
                                                        >
                                                            {(() => {
                                                                const search = (formData.garageName || '').toLowerCase();
                                                                const filtered = allGarages.filter(g => g.toLowerCase().includes(search));

                                                                if (filtered.length === 0) return (
                                                                    <div style={{ padding: '12px 15px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                                                                        No previous garages found. Type to add new.
                                                                    </div>
                                                                );

                                                                return filtered.map((g, i) => (
                                                                    <div
                                                                        key={i}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, garageName: g });
                                                                            setShowGarageSuggestions(false);
                                                                        }}
                                                                        style={{
                                                                            padding: '10px 15px',
                                                                            color: 'white',
                                                                            fontSize: '13px',
                                                                            cursor: 'pointer',
                                                                            borderBottom: i === filtered.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                                                            background: 'transparent',
                                                                            transition: 'background 0.2s'
                                                                        }}
                                                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                                    >
                                                                        {g}
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div>
                                                <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Bill Number</label>
                                                <input className="input-field" style={{ borderRadius: '10px' }} placeholder="INV-001" value={formData.billNumber} onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Bill Date *</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        id="maintenance-date-picker"
                                                        type="date"
                                                        className="input-field"
                                                        required
                                                        value={formData.billDate}
                                                        onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                                                        onClick={(e) => e.target.showPicker()}
                                                        style={{ borderRadius: '10px', height: '50px', width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 15px', cursor: 'pointer', outline: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Amount (₹) *</label>
                                                <input required type="number" className="input-field" style={{ borderRadius: '10px' }} placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                                            </div>

                                            <div>
                                                <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Payment Status</label>
                                                <select
                                                    className="input-field"
                                                    style={{
                                                        borderRadius: '10px',
                                                        color: formData.paymentStatus === 'Due' ? '#f43f5e' : '#10b981',
                                                        fontWeight: '800'
                                                    }}
                                                    value={formData.paymentStatus}
                                                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                                >
                                                    <option value="Paid" style={{ background: '#1e293b', color: '#10b981' }}>✅ Paid</option>
                                                    <option value="Due" style={{ background: '#1e293b', color: '#f43f5e' }}>⚠️ Due (Pending Payment)</option>
                                                </select>
                                            </div>

                                            {/* Office Payment Method: Cash vs Bank Account / UPI */}
                                            {formData.paymentStatus !== 'Due' && (
                                                <div style={{
                                                    gridColumn: '1 / -1',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    padding: '16px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '14px',
                                                    border: '1px solid rgba(255,255,255,0.06)'
                                                }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Office Payment Method / Account
                                                    </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, paymentMode: 'Cash', bankAccountId: '', paymentSource: 'Office' })}
                                                            style={{
                                                                padding: '10px 8px',
                                                                borderRadius: '10px',
                                                                border: (!formData.bankAccountId && formData.paymentMode === 'Cash') ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                                background: (!formData.bankAccountId && formData.paymentMode === 'Cash') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                color: (!formData.bankAccountId && formData.paymentMode === 'Cash') ? '#10b981' : 'rgba(255,255,255,0.6)',
                                                                fontWeight: '800',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            💵 Cash in Hand
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, paymentMode: 'Bank Transfer', bankAccountId: formData.bankAccountId || (bankAccounts[0]?._id || ''), paymentSource: 'Office' })}
                                                            style={{
                                                                padding: '10px 8px',
                                                                borderRadius: '10px',
                                                                border: (formData.bankAccountId || (formData.paymentMode !== 'Cash' && formData.paymentMode !== 'Others' && formData.paymentMode !== 'Other')) ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                                background: (formData.bankAccountId || (formData.paymentMode !== 'Cash' && formData.paymentMode !== 'Others' && formData.paymentMode !== 'Other')) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                color: (formData.bankAccountId || (formData.paymentMode !== 'Cash' && formData.paymentMode !== 'Others' && formData.paymentMode !== 'Other')) ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                                fontWeight: '800',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            🏦 Bank Account / UPI
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, paymentMode: 'Others', bankAccountId: '', paymentSource: 'Others' })}
                                                            style={{
                                                                padding: '10px 8px',
                                                                borderRadius: '10px',
                                                                border: (formData.paymentMode === 'Others' || formData.paymentMode === 'Other' || formData.paymentSource === 'Others') ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                                                                background: (formData.paymentMode === 'Others' || formData.paymentMode === 'Other' || formData.paymentSource === 'Others') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                color: (formData.paymentMode === 'Others' || formData.paymentMode === 'Other' || formData.paymentSource === 'Others') ? '#c084fc' : 'rgba(255,255,255,0.6)',
                                                                fontWeight: '800',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            💼 Others / Personal
                                                        </button>
                                                    </div>

                                                    {/* Conditional indicator: Others vs Cash vs Bank */}
                                                    {(formData.paymentMode === 'Others' || formData.paymentMode === 'Other' || formData.paymentSource === 'Others') ? (
                                                        <div style={{
                                                            background: 'rgba(168, 85, 247, 0.08)',
                                                            border: '1px solid rgba(168, 85, 247, 0.25)',
                                                            borderRadius: '12px',
                                                            padding: '12px 14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            fontSize: '12px',
                                                            color: '#c084fc',
                                                            fontWeight: '700'
                                                        }}>
                                                            <span>💼</span> Paid via Others / Personal Account (Does NOT deduct company cash or bank balance)
                                                        </div>
                                                    ) : (!formData.bankAccountId && (formData.paymentMode === 'Cash' || !formData.paymentMode)) ? (
                                                        <div style={{
                                                            background: 'rgba(16, 185, 129, 0.08)',
                                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                                            borderRadius: '12px',
                                                            padding: '10px 14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '8px'
                                                        }}>
                                                            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>💵</span> Deducted from Office Cash in Hand (Cash Book)
                                                            </div>
                                                            {Number(formData.amount) > 0 && (
                                                                <span style={{ fontSize: '13px', fontWeight: '900', color: '#f87171' }}>
                                                                    -₹{Number(formData.amount).toLocaleString('en-IN')}
                                                                </span>
                                                            )}
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
                                            <div>
                                                <ImageUploader file={billPhoto} onChange={setBillPhoto} label="Bill Photo" color="var(--primary)" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reminders & Actions */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
                                        {/* Next Service Reminder — only for Regular Service & Tyres & Wheels */}
                                        {(() => {
                                            const selectedTypes = formData.maintenanceType.split(', ').filter(Boolean);
                                            const showReminderSection = selectedTypes.some(t => 
                                                t === 'Regular Service' || 
                                                (t === 'Tyres / Wheels' && (formData.category || '').includes('Alignment & Balancing'))
                                            );
                                            if (!showReminderSection) return null;
                                            return (
                                                <div style={{ padding: '20px', background: showNextService ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '16px', border: showNextService ? '1px solid rgba(16, 185, 129, 0.1)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
                                                    <div
                                                        onClick={() => setShowNextService(!showNextService)}
                                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showNextService ? '15px' : '0' }}
                                                    >
                                                        <p style={{ color: showNextService ? '#10b981' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>Next Service Reminder (KM)</p>
                                                        <div style={{ width: '40px', height: '20px', background: showNextService ? '#10b981' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', transition: 'all 0.3s ease' }}>
                                                            <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: showNextService ? '22px' : '2px', transition: 'all 0.3s ease' }}></div>
                                                        </div>
                                                    </div>
                                                    {showNextService && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'grid', gap: '15px' }}>
                                                            <input type="number" className="input-field" style={{ borderRadius: '10px' }} placeholder="Next Service at KM (e.g. 50000)" value={formData.nextServiceKm} onChange={(e) => setFormData({ ...formData, nextServiceKm: e.target.value })} />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <div className="modal-form-grid" style={{ marginTop: '20px' }}>
                                            <button className="btn-primary" type="submit" disabled={submitting} style={{ height: '56px', fontWeight: '950' }}>
                                                {submitting ? 'Saving...' : (editingId ? 'Update Record' : 'Save Record')}
                                            </button>
                                            <button className="glass-card" type="button" onClick={() => setShowModal(false)} style={{ height: '56px', fontWeight: '800' }}>
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Bill Preview Modal */}
            <AnimatePresence>
                {selectedBillPhoto && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }} onClick={() => setSelectedBillPhoto(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: 'relative', maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', justifyContent: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={selectedBillPhoto} alt="Bill Receipt" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <button onClick={() => setSelectedBillPhoto(null)} style={{ position: 'absolute', top: '15px', right: '15px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
                                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Drill Down Breakdown Modal */}
            <AnimatePresence>
                {showDrillModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '800px',
                                maxHeight: '80vh',
                                padding: '40px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '30px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '20px 30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: `${theme.primary}15`, display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${theme.primary}30` }}>
                                        <History size={24} color={theme.primary} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '950', margin: 0, letterSpacing: '-0.5px' }}>
                                            {drillData.vehicle} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>/ {drillData.category}</span>
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>Detailed maintenance log for the selected period.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ padding: '8px 18px', borderRadius: '14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'right' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(16,185,129,0.6)', fontWeight: '900', textTransform: 'uppercase' }}>Total Spend</div>
                                        <div style={{ color: '#10b981', fontWeight: '1000', fontSize: '18px' }}>₹{drillData.records.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</div>
                                    </div>
                                    <div style={{ padding: '8px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '900', textTransform: 'uppercase' }}>Event Count</div>
                                        <div style={{ color: 'white', fontWeight: '1000', fontSize: '18px' }}>{drillData.records.length}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowDrillModal(false)}
                                        className="glass-card-hover-effect"
                                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '48px', height: '48px', borderRadius: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }} className="custom-scrollbar">
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#1e293b' }}>
                                        <tr>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                                            {drillData.vehicle === 'All Vehicles' && (
                                                <th style={{ padding: '15px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                                            )}
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Service Description</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Garage/Vendor</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {drillData.records.sort((a, b) => new Date(b.date || b.billDate) - new Date(a.date || a.billDate)).map((rec, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ padding: '18px 20px', color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: '13px' }}>
                                                    {formatDateIST(rec.date || rec.billDate)}
                                                </td>
                                                {drillData.vehicle === 'All Vehicles' && (
                                                    <td style={{ padding: '18px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                <Car size={16} color={theme.primary} />
                                                            </div>
                                                            <span style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{rec.carNumber || rec.vehicle?.carNumber}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td style={{ padding: '18px 20px' }}>
                                                    {(() => {
                                                        const currentCats = (rec.maintenanceType || '').split(', ').filter(Boolean);
                                                        const currentSubCats = (rec.category || '').split(', ').filter(Boolean);
                                                        const categoryList = subCategories[drillData.category] || [];

                                                        const displayMainCat = drillData.category === 'Yearly Total'
                                                            ? (rec.maintenanceType || 'General')
                                                            : drillData.category;

                                                        const displayDetailedCats = drillData.category === 'Yearly Total'
                                                            ? currentSubCats.join(', ')
                                                            : currentSubCats.filter(c =>
                                                                categoryList.some(item => c.toLowerCase().includes(item.toLowerCase())) ||
                                                                c.toLowerCase().includes('labour') ||
                                                                c.toLowerCase().includes('labor')
                                                            ).join(', ') || rec.category;

                                                        return (
                                                            <>
                                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{displayMainCat}</div>
                                                                {/* Detailed cats/description removed for a cleaner dashboard view as requested */}
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '18px 20px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: '12px' }}>
                                                    {rec.garageName || rec.vendorName || 'Self/Local'}
                                                </td>
                                                <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                                                    <div style={{ color: '#10b981', fontWeight: '950', fontSize: '15px' }}>₹{(rec.amount || 0).toLocaleString()}</div>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: '800' }}>APPROVED</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
                        {/* Quick Settle / Pay Due Modal */}
            <AnimatePresence>
                {showSettleModal && settleTarget && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 2100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '520px',
                                padding: 'clamp(24px, 4vw, 32px)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                borderRadius: '24px',
                                background: '#0b1120',
                                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7), 0 0 30px rgba(244, 63, 94, 0.15)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', marginBottom: '4px' }}>
                                        <IndianRupee size={18} />
                                        <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {settleTarget.type === 'vendor' ? 'Settle Vendor Outstanding' : 'Pay Pending Bill'}
                                        </span>
                                    </div>
                                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '950', margin: 0 }}>
                                        {settleTarget.type === 'vendor'
                                            ? settleTarget.vendor.vendorName
                                            : (settleTarget.bill.garageName || settleTarget.bill.vendorName || 'Vendor Bill')}
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '600', marginTop: '4px', margin: 0 }}>
                                        {settleTarget.type === 'vendor'
                                            ? `Settling ${settleTarget.vendor.dueBillsCount || 0} unpaid bill(s) for this garage`
                                            : `Bill #${settleTarget.bill.billNumber || 'N/A'} • ${settleTarget.bill.vehicle?.carNumber || 'Vehicle'}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowSettleModal(false); setSettleTarget(null); }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Settlement Summary Banner */}
                            {(() => {
                                const totalDue = (settleTarget.type === 'vendor' ? settleTarget.vendor.dueAmount : (settleTarget.bill.dueAmount !== undefined ? settleTarget.bill.dueAmount : settleTarget.bill.amount)) || 0;
                                const payingAmount = Number(settleForm.amount) || 0;
                                const remainingDue = Math.max(0, totalDue - payingAmount);

                                return (
                                    <>
                                        <div style={{
                                            padding: '16px 20px',
                                            borderRadius: '16px',
                                            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(225, 29, 72, 0.05) 100%)',
                                            border: '1px solid rgba(244, 63, 94, 0.3)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '18px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Total Outstanding Due
                                                </div>
                                                <div style={{ color: 'white', fontSize: '26px', fontWeight: '1000', marginTop: '2px', letterSpacing: '-0.5px' }}>
                                                    ₹{totalDue.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    background: '#f43f5e',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: '900',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    display: 'inline-block'
                                                }}>
                                                    NET DUE
                                                </span>
                                                {remainingDue > 0 && payingAmount > 0 && (
                                                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', marginTop: '4px' }}>
                                                        Remaining: ₹{remainingDue.toLocaleString('en-IN')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <form onSubmit={handleSettlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Editable Amount to Pay */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Amount to Pay (₹) *
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettleForm({ ...settleForm, amount: totalDue })}
                                                        style={{
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                                            color: '#34d399',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Pay Full (₹{totalDue.toLocaleString('en-IN')})
                                                    </button>
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: '900', fontSize: '18px' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={totalDue}
                                                        step="any"
                                                        required
                                                        value={settleForm.amount}
                                                        onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                                                        placeholder="Enter payment amount"
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 14px 12px 34px',
                                                            borderRadius: '12px',
                                                            background: '#070c18',
                                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                                            color: '#10b981',
                                                            fontSize: '18px',
                                                            fontWeight: '950',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                        Enter full amount or any partial amount.
                                                    </span>
                                                    {remainingDue > 0 && payingAmount > 0 && (
                                                        <span style={{ color: '#fbbf24', fontWeight: '800' }}>
                                                            Remaining Due: ₹{remainingDue.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                    {payingAmount >= totalDue && totalDue > 0 && (
                                                        <span style={{ color: '#34d399', fontWeight: '800' }}>
                                                            ✓ Settling 100% of bill
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Payment Mode (3 Options) */}
                                            <div>
                                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                                    Payment Method
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettleForm({ ...settleForm, paymentMode: 'Cash', bankAccountId: '', paidBy: 'Company' })}
                                                        style={{
                                                            padding: '10px 8px',
                                                            borderRadius: '12px',
                                                            border: (settleForm.paymentMode === 'Cash') ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                            background: (settleForm.paymentMode === 'Cash') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            color: (settleForm.paymentMode === 'Cash') ? '#10b981' : 'rgba(255,255,255,0.6)',
                                                            fontWeight: '800',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        💵 Cash
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettleForm({ ...settleForm, paymentMode: 'Bank Transfer', bankAccountId: settleForm.bankAccountId || (bankAccounts[0]?._id || ''), paidBy: 'Company' })}
                                                        style={{
                                                            padding: '10px 8px',
                                                            borderRadius: '12px',
                                                            border: (settleForm.paymentMode !== 'Cash' && settleForm.paymentMode !== 'Others') ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                            background: (settleForm.paymentMode !== 'Cash' && settleForm.paymentMode !== 'Others') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            color: (settleForm.paymentMode !== 'Cash' && settleForm.paymentMode !== 'Others') ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                            fontWeight: '800',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        🏦 Bank / UPI
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettleForm({ ...settleForm, paymentMode: 'Others', bankAccountId: '', paidBy: 'Others' })}
                                                        style={{
                                                            padding: '10px 8px',
                                                            borderRadius: '12px',
                                                            border: (settleForm.paymentMode === 'Others') ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                                                            background: (settleForm.paymentMode === 'Others') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            color: (settleForm.paymentMode === 'Others') ? '#c084fc' : 'rgba(255,255,255,0.6)',
                                                            fontWeight: '800',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        💼 Others
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Dynamic Payment Mode Explanations / Selectors */}
                                            {settleForm.paymentMode === 'Others' ? (
                                                <div style={{
                                                    background: 'rgba(168, 85, 247, 0.08)',
                                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                                    borderRadius: '12px',
                                                    padding: '12px 14px',
                                                    fontSize: '12px',
                                                    color: '#c084fc',
                                                    fontWeight: '700'
                                                }}>
                                                    💼 Paid via Others / Personal Account (Does NOT deduct company cash or bank balance)
                                                </div>
                                            ) : settleForm.paymentMode === 'Cash' ? (
                                                <div style={{
                                                    background: 'rgba(16, 185, 129, 0.08)',
                                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                                    borderRadius: '12px',
                                                    padding: '12px 14px',
                                                    fontSize: '12px',
                                                    color: '#10b981',
                                                    fontWeight: '800',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span>💵 Deducted from Office Cash in Hand (Cash Book)</span>
                                                    <span style={{ color: '#f87171', fontWeight: '900' }}>
                                                        -₹{(Number(settleForm.amount) || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <BankSelector
                                                    bankAccounts={bankAccounts}
                                                    value={settleForm.bankAccountId}
                                                    amount={Number(settleForm.amount) || 0}
                                                    onChange={(bId) => setSettleForm({ ...settleForm, bankAccountId: bId, paymentMode: 'Bank Transfer' })}
                                                />
                                            )}

                                            {/* Payment Date */}
                                            <div>
                                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                    Payment Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={settleForm.paymentDate}
                                                    onChange={(e) => setSettleForm({ ...settleForm, paymentDate: e.target.value })}
                                                    required
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        borderRadius: '10px',
                                                        background: '#0f172a',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>

                                            {/* Form Actions */}
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowSettleModal(false); setSettleTarget(null); }}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={settling}
                                                    style={{
                                                        flex: 2,
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        fontWeight: '900',
                                                        cursor: settling ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                                                        opacity: settling ? 0.7 : 1
                                                    }}
                                                >
                                                    {settling ? (
                                                        <>Processing...</>
                                                    ) : (
                                                        <>
                                                            <Check size={16} /> Confirm Payment & Settle
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Maintenance;

