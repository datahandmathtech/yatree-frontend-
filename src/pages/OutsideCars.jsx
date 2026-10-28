import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Plus, Search, Trash2, Car, X, Save, ChevronLeft, ChevronRight, Calendar, Edit, MapPin, Briefcase, Layers, ShoppingCart, TrendingUp, FileText, Store, IndianRupee, Eye, CheckCircle2, Download, Filter, Scale, ArrowUpRight, ArrowDownRight, BookOpen, CreditCard, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import BankSelector from '../components/common/BankSelector';
import { todayIST, toISTDateString, firstDayOfMonthIST, formatDateIST, nowIST } from '../utils/istUtils';

const normalizePlate = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const OutsideCars = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [companyVehicles, setCompanyVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12 or 'All'
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState('All'); 
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [ownerFilter, setOwnerFilter] = useState('All');
    const [propertyFilter, setPropertyFilter] = useState('All');
    const [transactionFilter, setTransactionFilter] = useState('Buy');
    const [viewMode, setViewMode] = useState('monthly'); 
    const [mainView, setMainView] = useState('duties'); // 'duties' | 'vendorLedger'
    const [selectedVendorForLedger, setSelectedVendorForLedger] = useState(null);
    const [vendorLedgerMonth, setVendorLedgerMonth] = useState('All');
    const [vendorSearchTerm, setVendorSearchTerm] = useState('');
    const [ledgerDutySearch, setLedgerDutySearch] = useState('');
    const [ledgerVehicleFilter, setLedgerVehicleFilter] = useState('All');
    const [ledgerTxTypeFilter, setLedgerTxTypeFilter] = useState('All'); // 'All' | 'Buy' | 'Sell' | 'Payment' | 'Receipt'

    // Vendor Payments State
    const [vendorPayments, setVendorPayments] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentEditMode, setPaymentEditMode] = useState(false);
    const [paymentSelectedId, setPaymentSelectedId] = useState(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({
        vendorName: '',
        paymentType: 'Paid',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash',
        bankAccountId: '',
        paidBy: 'Company',
        referenceNumber: '',
        notes: ''
    });
    const location = useLocation();

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('vendor') || params.get('owner');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setSelectedMonth(Number(monthParam)); // Match 1-indexed state
        if (yearParam) setSelectedYear(Number(yearParam));
        if (dayParam) setSelectedDay(dayParam);
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setShowModal(false);
        setEditMode(false);
        const now = new Date();
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
        setSelectedDay('All');
        setFormData({
            carNumber: '',
            model: '',
            property: '',
            dutyType: '',
            ownerName: '',
            dutyAmount: '',
            dropLocation: '',
            transactionType: 'Buy',
            date: ''
        });
    }, [location.pathname, location.key]);

    useEffect(() => {
        if (viewMode === 'monthly') {
            if (selectedMonth === 'All') {
                const start = `${selectedYear}-04-01`;
                const end = `${selectedYear + 1}-03-31`;
                setFromDate(start);
                setToDate(end);
            } else {
                const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
                if (selectedDay === 'All') {
                    const start = toISTDateString(new Date(calendarYear, selectedMonth - 1, 1));
                    const end = toISTDateString(new Date(calendarYear, selectedMonth, 0));
                    setFromDate(start);
                    setToDate(end);
                } else {
                    const d = toISTDateString(new Date(calendarYear, selectedMonth - 1, parseInt(selectedDay)));
                    setFromDate(d);
                    setToDate(d);
                }
            }
        }
    }, [selectedMonth, selectedYear, selectedDay, viewMode]);

    // Modal & Editing State
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [propSuggestions, setPropSuggestions] = useState([]);
    const [showPropSuggestions, setShowPropSuggestions] = useState(false);
    const [catSuggestions, setCatSuggestions] = useState([]);
    const [showCatSuggestions, setShowCatSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        carNumber: '',
        model: '',
        property: '',
        dutyType: '',
        ownerName: '',
        dutyAmount: '',
        dropLocation: '',
        transactionType: 'Buy',
        workBasis: 'Fix Basis',
        date: ''
    });

    useEffect(() => {
        if (selectedCompany) {
            fetchOutsideVehicles();
            fetchBankAccounts();
        }
    }, [selectedCompany]);

    const fetchBankAccounts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const banksRes = await axios.get(`/api/banks/company/${selectedCompany._id}`).catch(() => axios.get(`/api/admin/bank-accounts/${selectedCompany._id}`)).catch(() => ({ data: [] }));
            setBankAccounts(Array.isArray(banksRes.data) ? banksRes.data : (banksRes.data?.bankAccounts || []));
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const fetchOutsideVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: `Bearer ${userInfo?.token}` };

            // Fetch company vehicles, outside vehicles, and vendor payments concurrently in parallel
            const [compRes, outRes, payRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`, { headers }),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=outside&includeBlocked=true`, { headers }),
                axios.get(`/api/admin/vendor-payments/${selectedCompany._id}`, { headers }).catch(err => {
                    console.error('Error fetching vendor payments:', err);
                    return { data: { payments: [] } };
                })
            ]);

            const compVehs = compRes.data?.vehicles?.filter(v => !v.isOutsideCar && !v.eventId) || [];
            setCompanyVehicles(compVehs);
            const fleetPlates = new Set(compVehs.map(v => normalizePlate(v.carNumber)).filter(Boolean));

            const rawOutVehs = outRes.data?.vehicles?.filter(v => v.isOutsideCar) || [];
            const outVehs = rawOutVehs.filter(v => {
                const plate = normalizePlate(v.carNumber?.split('#')[0] || '');
                return !fleetPlates.has(plate);
            });
            setVehicles(outVehs);
            setVendorPayments(payRes.data?.payments || []);
        } catch (err) {
            console.error('Error fetching outside vehicles:', err);
        } finally {
            setLoading(false);
        }
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
            if (filtered.length === 0) {
                alert("No data available to export.");
                return;
            }

            // Load assets
            const logo = await loadImage(selectedCompany?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(selectedCompany?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER
            doc.setFillColor(15, 23, 42); // Navy Dark
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 10, 30, 30);
            } else {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'D');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('LOGO', 24, 26, { align: 'center' });
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(14, 165, 233);
            doc.text(selectedCompany?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('OUTSIDE FLEET REPORT', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(9);
            doc.text(`PERIOD: ${fromDate} TO ${toDate}`, pageWidth - 15, 30, { align: 'right' });

            // 2. SUMMARY STATS
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORT SUMMARY', 15, 65);
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            const totalAmount = filtered.reduce((sum, v) => sum + (Number((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount) || 0), 0);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Total Duties: ${filtered.length}`, 15, 76);
            doc.text(`Total Payable: Rs. ${totalAmount.toLocaleString('en-IN')}`, 15, 84);
            doc.text(`Vendor: ${ownerFilter}`, 15, 92);

            // 3. TABLE
            const body = filtered.map(v => [
                formatDateIST(v.carNumber?.split('#')[1] || v.createdAt),
                v.ownerName,
                `${v.model} - ${v.carNumber?.split('#')[0]}`,
                v.guestName || v.property || 'Direct',
                v.dutyType || 'Standard',
                `Rs. ${Number(((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount) || 0).toLocaleString('en-IN')}`
            ]);

            autoTable(doc, {
                head: [['DATE', 'VENDOR', 'VEHICLE', 'PROPERTY', 'DUTY TYPE', 'AMOUNT']],
                body: body,
                startY: 100,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 4. SIGNATURE
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 100) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text((selectedCompany?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text('Operations Controller', sigX - 2, footerY + 17);
            doc.text(selectedCompany?.name || 'LogKaro', sigX - 2, footerY + 21);

            doc.save(`Outside_Fleet_Report_${fromDate}_to_${toDate}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error exporting PDF: " + error.message);
        }
    };

    const handleOwnerChange = (val) => {
        setOwnerFilter(val);
        setPropertyFilter('All'); // Reset property when owner changes
    };

    const handleOpenLogDuty = () => {
        setEditMode(false);
        setSelectedId(null);

        // Intelligence: Default the form date to the viewed month
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        let defaultDate = todayIST();
        if (selectedMonth === 'All') {
            defaultDate = todayIST();
        } else if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            const dayToUse = selectedDay === 'All' ? 1 : parseInt(selectedDay);
            defaultDate = toISTDateString(new Date(calendarYear, selectedMonth - 1, dayToUse));
        } else if (selectedDay !== 'All' && parseInt(selectedDay) !== now.getDate()) {
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            defaultDate = toISTDateString(new Date(calendarYear, selectedMonth - 1, parseInt(selectedDay)));
        }

        setFormData({
            carNumber: '',
            model: '',
            property: propertyFilter !== 'All' ? propertyFilter : '',
            dutyType: '',
            ownerName: ownerFilter !== 'All' ? ownerFilter : '',
            dutyAmount: '',
            dropLocation: '',
            transactionType: 'Buy',
            date: defaultDate,
            isDuplicateToday: false
        });
        setShowModal(true);
    };

    const handleCarNumberChange = (val) => {
        const upVal = val.toUpperCase();
        setFormData(prev => ({ ...prev, carNumber: upVal }));
        
        if (upVal.length > 1) {
            const matches = [...vehicles, ...companyVehicles].filter(v => {
                const plate = (v.carNumber?.split('#')[0] || v.carNumber || '').toUpperCase();
                return plate.includes(upVal);
            });
            
            // Remove duplicates (by plate number)
            const uniqueMatches = [];
            const seen = new Set();
            matches.forEach(m => {
                const plate = m.carNumber?.split('#')[0] || m.carNumber;
                if (plate && !seen.has(plate)) {
                    seen.add(plate);
                    uniqueMatches.push(m);
                }
            });

            setSuggestions(uniqueMatches.slice(0, 8)); // Limit to 8 suggestions
            setShowSuggestions(true);

            // Exact match auto-fill
            const exactMatch = uniqueMatches.find(m => ((m.carNumber?.split('#')[0] || m.carNumber || '').toUpperCase() === upVal));
            if (exactMatch) {
                setFormData(prev => ({
                    ...prev,
                    model: exactMatch.model || prev.model,
                    ownerName: exactMatch.ownerName || prev.ownerName
                }));
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (v) => {
        const plate = v.carNumber?.split('#')[0] || v.carNumber;
        setFormData(prev => ({
            ...prev,
            carNumber: plate,
            model: v.model || prev.model,
            ownerName: v.ownerName || prev.ownerName
        }));
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this duty entry?')) return;
        try {
            await axios.delete(`/api/admin/vehicles/${id}`, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchOutsideVehicles();
        } catch (err) { alert('Error deleting'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (!selectedCompany?._id) return alert("Select a company first!");

            let internalCarNumber = `${formData.carNumber}#${formData.date}`;

            // Add a unique suffix for new entries or when carNumber/date changes in edit mode to avoid collisions
            if (!editMode) {
                internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
            } else if (selectedId) {
                const originalVehicle = vehicles.find(v => v._id === selectedId);
                const oldParts = originalVehicle?.carNumber?.split('#') || [];
                // If the plate and date are the same as before, keep the old unique suffix
                if (formData.carNumber === oldParts[0] && formData.date === oldParts[1] && oldParts[2]) {
                    internalCarNumber += `#${oldParts[2]}`;
                } else {
                    // Plate or date changed, generate new suffix to be safe
                    internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                }
            }

            let payload = {
                carNumber: internalCarNumber,
                model: formData.model?.trim(),
                property: formData.property?.trim(),
                dutyType: formData.dutyType?.trim() || '',
                ownerName: formData.ownerName?.trim(),
                dutyAmount: Number(formData.dutyAmount) || 0,
                dropLocation: formData.dropLocation?.trim() || '',
                companyId: selectedCompany._id,
                isOutsideCar: true,
                status: 'active',
                transactionType: formData.transactionType || 'Buy',
                workBasis: formData.workBasis || 'Fix Basis',
                createdAt: formData.date
            };

            if (editMode && selectedId) {
                await axios.put(`/api/admin/vehicles/${selectedId}`, payload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            } else {
                // Always create a new entry for outside cars now (no merging)
                const data = new FormData();
                Object.keys(payload).forEach(key => data.append(key, payload[key]));
                data.append('permitType', 'Contract');
                data.append('carType', 'Other');
                await axios.post('/api/admin/vehicles', data, {
                    headers: {
                        Authorization: `Bearer ${userInfo.token}`
                    }
                });
            }

            setShowModal(false);
            setEditMode(false);
            setSelectedId(null);
            setFormData({ ...formData, carNumber: '', dutyAmount: '', dropLocation: '', dutyType: '' });
            fetchOutsideVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing duty');
        }
    };

    const handleEdit = (vehicle) => {
        setFormData({
            carNumber: vehicle.carNumber?.split('#')[0] || '',
            model: vehicle.model,
            property: vehicle.property || '',
            dutyType: vehicle.dutyType,
            ownerName: vehicle.ownerName,
            dutyAmount: vehicle.dutyAmount,
            dropLocation: vehicle.dropLocation,
            transactionType: vehicle.transactionType || 'Buy',
            workBasis: vehicle.workBasis || 'Fix Basis',
            date: vehicle.carNumber?.split('#')[1] || toISTDateString(vehicle.createdAt)
        });
        setSelectedId(vehicle._id);
        setEditMode(true);
        setShowModal(true);
    };

    // ── VENDOR PAYMENT HANDLERS ──
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCompany?._id) return;
        if (!paymentFormData.vendorName?.trim() || !paymentFormData.amount) {
            alert('Please provide vendor name and a valid amount.');
            return;
        }
        setPaymentSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: `Bearer ${userInfo?.token}` };
            const payload = {
                companyId: selectedCompany._id,
                vendorName: paymentFormData.vendorName.trim(),
                paymentType: paymentFormData.paymentType,
                amount: Number(paymentFormData.amount),
                date: paymentFormData.date,
                paymentMode: paymentFormData.paymentMode,
                bankAccountId: (paymentFormData.paymentMode !== 'Cash' && paymentFormData.paymentMode !== 'Others') ? (paymentFormData.bankAccountId || null) : null,
                paidBy: paymentFormData.paymentMode === 'Others' ? 'Others' : 'Company',
                referenceNumber: paymentFormData.referenceNumber?.trim() || '',
                notes: paymentFormData.notes?.trim() || ''
            };

            if (paymentEditMode && paymentSelectedId) {
                await axios.put(`/api/admin/vendor-payments/${paymentSelectedId}`, payload, { headers });
            } else {
                await axios.post('/api/admin/vendor-payments', payload, { headers });
            }

            setShowPaymentModal(false);
            setPaymentEditMode(false);
            setPaymentSelectedId(null);
            setPaymentFormData({
                vendorName: '',
                paymentType: 'Paid',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                paymentMode: 'Cash',
                bankAccountId: '',
                paidBy: 'Company',
                referenceNumber: '',
                notes: ''
            });
            await fetchOutsideVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing payment');
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const handleEditPayment = (payment) => {
        const raw = payment.rawPayment || payment;
        setPaymentFormData({
            vendorName: raw.vendorName || selectedVendorForLedger?.vendorName || '',
            paymentType: raw.paymentType || 'Paid',
            amount: raw.amount || raw.effectiveAmount || '',
            date: toISTDateString(raw.date || raw.effectiveDate),
            paymentMode: raw.paymentMode || 'Cash',
            bankAccountId: raw.bankAccount?._id || raw.bankAccount || '',
            paidBy: raw.paidBy || (raw.paymentMode === 'Others' ? 'Others' : 'Company'),
            referenceNumber: raw.referenceNumber || '',
            notes: raw.notes || ''
        });
        setPaymentSelectedId(raw._id);
        setPaymentEditMode(true);
        setShowPaymentModal(true);
    };

    const openNewPaymentModal = (vendorName = '', defaultType = 'Paid') => {
        setPaymentFormData({
            vendorName: vendorName || '',
            paymentType: defaultType,
            amount: '',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Cash',
            bankAccountId: bankAccounts[0]?._id || '',
            paidBy: 'Company',
            referenceNumber: '',
            notes: ''
        });
        setPaymentEditMode(false);
        setPaymentSelectedId(null);
        setShowPaymentModal(true);
    };

    const handleDeletePayment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payment record? This will adjust the ledger balance.')) {
            return;
        }
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: `Bearer ${userInfo?.token}` };
            await axios.delete(`/api/admin/vendor-payments/${id}`, { headers });
            await fetchOutsideVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting payment');
        }
    };

    const uniqueVendorsList = useMemo(() => {
        const set = new Set();
        vehicles.forEach(v => {
            if (v.ownerName?.trim()) set.add(v.ownerName.trim());
        });
        vendorPayments.forEach(p => {
            if (p.vendorName?.trim()) set.add(p.vendorName.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [vehicles, vendorPayments]);

    const fleetPlateSet = useMemo(() => {
        return new Set((companyVehicles || []).map(v => normalizePlate(v.carNumber)).filter(Boolean));
    }, [companyVehicles]);

    const validOutsideVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const cleanCarNumber = normalizePlate(v.carNumber?.split('#')[0] || '');
            return !fleetPlateSet.has(cleanCarNumber);
        });
    }, [vehicles, fleetPlateSet]);

    const filtered = validOutsideVehicles.filter(v => {
        const cleanCarNumber = v.carNumber?.split('#')[0] || '';
        const matchesSearch = cleanCarNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.property?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOwner = ownerFilter === 'All' || v.ownerName?.trim() === ownerFilter?.trim();
        const currentProperty = v.property?.trim().toLowerCase().replace(/\s+/g, ' ');
        const filterProperty = propertyFilter === 'All' ? 'All' : propertyFilter.trim().toLowerCase().replace(/\s+/g, ' ');
        const matchesProperty = propertyFilter === 'All' || currentProperty === filterProperty;

        // Date Range Logic
        const dutyTagDateStr = v.carNumber?.split('#')[1];
        if (!dutyTagDateStr) return false;

        const matchesDate = dutyTagDateStr >= fromDate && dutyTagDateStr <= toDate;
        const matchesTransaction = (v.transactionType || 'Buy') === transactionFilter;
        const matchesTab = activeTab === 'All' || v.workBasis === activeTab;

        return matchesSearch && matchesOwner && matchesProperty && matchesDate && matchesTransaction && matchesTab;
    }).sort((a, b) => {
        const dateA = a.carNumber?.split('#')[1] || '';
        const dateB = b.carNumber?.split('#')[1] || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const totalPayable = filtered.reduce((sum, v) => sum + (v ? (Number((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount) || 0) : 0), 0);
    const totalDutiesCount = filtered.reduce((sum, v) => sum + (v?.dutyType ? v.dutyType.split(' + ').filter(Boolean).length : 0), 0);

    // ── VENDOR AGGREGATES FOR OUTSIDE VENDOR LEDGER (DUTIES + PAYMENTS) ──
    const vendorAggregates = useMemo(() => {
        const vMap = {};

        const getOrCreateVendor = (rawOwner) => {
            const trimmed = (rawOwner || 'Unknown Vendor').trim();
            const ownerKey = trimmed.toLowerCase();
            if (!vMap[ownerKey]) {
                vMap[ownerKey] = {
                    vendorName: trimmed,
                    totalDuties: 0,
                    totalAmount: 0,
                    totalDena: 0, // Buy duties (Total Payable incurred)
                    totalLena: 0, // Sell duties (Total Receivable incurred)
                    totalPaid: 0, // Paid to vendor (reduces payable debt)
                    totalReceived: 0, // Received from vendor (reduces receivable debt)
                    vehicles: new Set(),
                    latestDate: null,
                    duties: []
                };
            }
            return vMap[ownerKey];
        };

        // 1. Process Duties
        validOutsideVehicles.forEach(v => {
            const vnd = getOrCreateVendor(v.ownerName);
            const isBuy = (v.transactionType || 'Buy') === 'Buy';
            const amt = Number((isBuy && v.buyAmount) ? v.buyAmount : v.dutyAmount) || 0;
            const denaAmt = isBuy ? amt : 0;
            const lenaAmt = !isBuy ? amt : 0;

            vnd.totalDuties += 1;
            vnd.totalAmount += amt;
            vnd.totalDena += denaAmt;
            vnd.totalLena += lenaAmt;

            const rawPlate = v.carNumber?.split('#')[0];
            if (rawPlate && !fleetPlateSet.has(normalizePlate(rawPlate))) {
                vnd.vehicles.add(rawPlate);
            }

            const dutyDate = v.carNumber?.split('#')[1] || toISTDateString(v.createdAt);
            if (!vnd.latestDate || dutyDate > vnd.latestDate) {
                vnd.latestDate = dutyDate;
            }
            vnd.duties.push({
                ...v,
                isPayment: false,
                effectiveDate: dutyDate,
                effectiveAmount: amt,
                isBuy,
                denaAmount: denaAmt,
                lenaAmount: lenaAmt
            });
        });

        // 2. Process Vendor Payments
        vendorPayments.forEach(p => {
            const vnd = getOrCreateVendor(p.vendorName);
            const amt = Number(p.amount) || 0;
            const isPaid = p.paymentType === 'Paid';
            if (isPaid) {
                vnd.totalPaid += amt;
            } else {
                vnd.totalReceived += amt;
            }

            const payDate = toISTDateString(p.date || p.createdAt);
            if (!vnd.latestDate || payDate > vnd.latestDate) {
                vnd.latestDate = payDate;
            }

            vnd.duties.push({
                _id: p._id,
                isPayment: true,
                paymentType: p.paymentType,
                effectiveDate: payDate,
                effectiveAmount: amt,
                paymentMode: p.paymentMode,
                referenceNumber: p.referenceNumber,
                notes: p.notes,
                rawPayment: p
            });
        });

        return Object.values(vMap).map(vnd => {
            const mBreakdown = {};
            // Sort chronologically (oldest to newest) to calculate cumulative running balance
            const chronologicalEntries = [...vnd.duties].sort((a, b) => (a.effectiveDate || '').localeCompare(b.effectiveDate || ''));
            let runningBal = 0;
            const entriesWithBalance = chronologicalEntries.map(e => {
                if (e.isPayment) {
                    if (e.paymentType === 'Paid') {
                        // Payment out to vendor reduces what we owe
                        runningBal -= e.effectiveAmount;
                    } else {
                        // Payment in from vendor reduces what they owe
                        runningBal += e.effectiveAmount;
                    }
                } else {
                    if (e.isBuy) {
                        runningBal += e.effectiveAmount; // We owe vendor
                    } else {
                        runningBal -= e.effectiveAmount; // Vendor owes us
                    }
                }
                return {
                    ...e,
                    runningBalance: runningBal
                };
            });

            entriesWithBalance.forEach(e => {
                const mKey = (e.effectiveDate || '').substring(0, 7) || 'Unknown';
                if (!mBreakdown[mKey]) {
                    mBreakdown[mKey] = { month: mKey, count: 0, amount: 0, denaAmount: 0, lenaAmount: 0, paidAmount: 0, receivedAmount: 0 };
                }
                mBreakdown[mKey].count += 1;
                mBreakdown[mKey].amount += e.effectiveAmount;
                if (e.isPayment) {
                    if (e.paymentType === 'Paid') {
                        mBreakdown[mKey].paidAmount += e.effectiveAmount;
                    } else {
                        mBreakdown[mKey].receivedAmount += e.effectiveAmount;
                    }
                } else {
                    mBreakdown[mKey].denaAmount += e.denaAmount;
                    mBreakdown[mKey].lenaAmount += e.lenaAmount;
                }
            });

            const duePayable = vnd.totalDena - vnd.totalPaid;
            const dueReceivable = vnd.totalLena - vnd.totalReceived;
            const netBalance = duePayable - dueReceivable;

            return {
                ...vnd,
                duePayable,
                dueReceivable,
                netBalance, // > 0: Payable (we owe), < 0: Receivable (they owe), === 0: Settled
                vehicles: Array.from(vnd.vehicles),
                // Return newest first for display in ledger
                duties: [...entriesWithBalance].reverse(),
                monthlyBreakdown: Object.values(mBreakdown).sort((a, b) => b.month.localeCompare(a.month))
            };
        }).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance) || b.totalAmount - a.totalAmount);
    }, [validOutsideVehicles, vendorPayments, fleetPlateSet]);

    // Keep selectedVendorForLedger updated when vendorAggregates changes
    useEffect(() => {
        if (selectedVendorForLedger) {
            const updated = vendorAggregates.find(v => v.vendorName?.toLowerCase() === selectedVendorForLedger.vendorName?.toLowerCase());
            if (updated) {
                setSelectedVendorForLedger(updated);
            }
        }
    }, [vendorAggregates]);

    const filteredVendorAggregates = useMemo(() => {
        if (!vendorSearchTerm) return vendorAggregates;
        const q = vendorSearchTerm.toLowerCase().trim();
        return vendorAggregates.filter(vnd => 
            vnd.vendorName.toLowerCase().includes(q) ||
            vnd.vehicles.some(plate => plate.toLowerCase().includes(q))
        );
    }, [vendorAggregates, vendorSearchTerm]);

    const overallMarketKhataSummary = useMemo(() => {
        let totalDena = 0;
        let totalPaid = 0;
        let totalLena = 0;
        let totalReceived = 0;
        let totalDuties = 0;
        filteredVendorAggregates.forEach(v => {
            totalDena += v.totalDena || 0;
            totalPaid += v.totalPaid || 0;
            totalLena += v.totalLena || 0;
            totalReceived += v.totalReceived || 0;
            totalDuties += v.totalDuties || 0;
        });
        const duePayable = totalDena - totalPaid;
        const dueReceivable = totalLena - totalReceived;
        const netDifference = duePayable - dueReceivable;
        return {
            totalDena,
            totalPaid,
            duePayable,
            totalLena,
            totalReceived,
            dueReceivable,
            netDifference,
            totalDuties,
            totalVendors: filteredVendorAggregates.length
        };
    }, [filteredVendorAggregates]);

    const filteredVendorDuties = useMemo(() => {
        if (!selectedVendorForLedger) return [];
        let list = selectedVendorForLedger.duties || [];
        if (vendorLedgerMonth !== 'All') {
            list = list.filter(d => (d.effectiveDate || '').startsWith(vendorLedgerMonth));
        }
        if (ledgerTxTypeFilter === 'Buy') {
            list = list.filter(d => !d.isPayment && d.isBuy);
        } else if (ledgerTxTypeFilter === 'Sell') {
            list = list.filter(d => !d.isPayment && !d.isBuy);
        } else if (ledgerTxTypeFilter === 'Payment') {
            list = list.filter(d => d.isPayment && d.paymentType === 'Paid');
        } else if (ledgerTxTypeFilter === 'Receipt') {
            list = list.filter(d => d.isPayment && d.paymentType === 'Received');
        }
        if (ledgerVehicleFilter && ledgerVehicleFilter !== 'All') {
            const cleanTarget = ledgerVehicleFilter.toUpperCase().trim();
            list = list.filter(d => !d.isPayment && (d.carNumber || '').toUpperCase().includes(cleanTarget));
        }
        if (ledgerDutySearch && ledgerDutySearch.trim()) {
            const q = ledgerDutySearch.toLowerCase().trim();
            list = list.filter(d => {
                if (d.isPayment) {
                    return (
                        (d.paymentMode || '').toLowerCase().includes(q) ||
                        (d.referenceNumber || '').toLowerCase().includes(q) ||
                        (d.notes || '').toLowerCase().includes(q) ||
                        String(d.effectiveAmount || '').includes(q)
                    );
                }
                return (
                    (d.carNumber || '').toLowerCase().includes(q) ||
                    (d.guestName || '').toLowerCase().includes(q) ||
                    (d.property || '').toLowerCase().includes(q) ||
                    (d.dutyType || '').toLowerCase().includes(q) ||
                    (d.dropLocation || '').toLowerCase().includes(q) ||
                    (d.model || '').toLowerCase().includes(q) ||
                    String(d.effectiveAmount || '').includes(q)
                );
            });
        }
        return list;
    }, [selectedVendorForLedger, vendorLedgerMonth, ledgerTxTypeFilter, ledgerVehicleFilter, ledgerDutySearch]);

    const activeMonthDenaTotal = useMemo(() => {
        return filteredVendorDuties.filter(d => !d.isPayment && d.isBuy).reduce((s, d) => s + (d.denaAmount || 0), 0);
    }, [filteredVendorDuties]);

    const activeMonthPaidTotal = useMemo(() => {
        return filteredVendorDuties.filter(d => d.isPayment && d.paymentType === 'Paid').reduce((s, d) => s + (d.effectiveAmount || 0), 0);
    }, [filteredVendorDuties]);

    const activeMonthLenaTotal = useMemo(() => {
        return filteredVendorDuties.filter(d => !d.isPayment && !d.isBuy).reduce((s, d) => s + (d.lenaAmount || 0), 0);
    }, [filteredVendorDuties]);

    const activeMonthReceivedTotal = useMemo(() => {
        return filteredVendorDuties.filter(d => d.isPayment && d.paymentType === 'Received').reduce((s, d) => s + (d.effectiveAmount || 0), 0);
    }, [filteredVendorDuties]);

    const activeMonthNetBalance = (activeMonthDenaTotal - activeMonthPaidTotal) - (activeMonthLenaTotal - activeMonthReceivedTotal);

    const activeMonthTotal = useMemo(() => {
        return filteredVendorDuties.reduce((s, d) => s + (d.effectiveAmount || 0), 0);
    }, [filteredVendorDuties]);

    const exportVendorLedgerCSV = () => {
        if (!selectedVendorForLedger || filteredVendorDuties.length === 0) return;
        const headers = ["Entry Date", "Entry Type", "Particulars / Vehicle", "Model / Payment Mode", "Details / Reference", "Duty Type", "Drop Point", "Payable Incurred (Buy INR)", "Paid Out (INR)", "Receivable Incurred (Sell INR)", "Received In (INR)", "Running Balance (INR)"];
        const rows = filteredVendorDuties.map(d => {
            if (d.isPayment) {
                return [
                    d.effectiveDate ? formatDateIST(d.effectiveDate) : '',
                    d.paymentType === 'Paid' ? 'Payment (Paid Out)' : 'Receipt (Received In)',
                    `"Payment - ${d.paymentMode || 'Bank'}"`,
                    `"${(d.paymentMode || '').replace(/"/g, '""')}"`,
                    `"${(d.referenceNumber || d.notes || '').replace(/"/g, '""')}"`,
                    'Settlement',
                    '',
                    0,
                    d.paymentType === 'Paid' ? d.effectiveAmount : 0,
                    0,
                    d.paymentType === 'Received' ? d.effectiveAmount : 0,
                    d.runningBalance || 0
                ];
            }
            return [
                d.effectiveDate ? formatDateIST(d.effectiveDate) : '',
                d.isBuy ? 'Duty (Buy)' : 'Duty (Sell)',
                `"${(d.carNumber?.split('#')[0] || '').replace(/"/g, '""')}"`,
                `"${(d.model || '').replace(/"/g, '""')}"`,
                `"${(d.guestName || d.property || '').replace(/"/g, '""')}"`,
                `"${(d.dutyType || '').replace(/"/g, '""')}"`,
                `"${(d.dropLocation || '').replace(/"/g, '""')}"`,
                d.isBuy ? (d.denaAmount || 0) : 0,
                0,
                !d.isBuy ? (d.lenaAmount || 0) : 0,
                0,
                d.runningBalance || 0
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedVendorForLedger.vendorName}_Ledger_${vendorLedgerMonth === 'All' ? 'All_Time' : vendorLedgerMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatMonthYear = (ymStr) => {
        if (!ymStr || ymStr === 'All') return 'All Months';
        const [y, m] = ymStr.split('-');
        if (!m) return ymStr;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(m, 10) - 1] || m} ${y}`;
    };

        const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const handlePrevMonth = () => {
        if (selectedMonth === 'All') {
            setSelectedYear(prev => prev - 1);
            return;
        }
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
        setSelectedDay('All');
    };

    const handleNextMonth = () => {
        if (selectedMonth === 'All') {
            setSelectedYear(prev => prev + 1);
            return;
        }
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
        setSelectedDay('All');
    };

    const handleJumpToCurrentMonth = () => {
        const now = new Date();
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
        setSelectedDay('All');
    };

    // ── DYNAMIC FILTERS ──
    const ownerBalances = vehicles.reduce((acc, v) => {
        const owner = v.ownerName?.trim();
        const dutyDate = v.carNumber?.split('#')[1];
        if (owner && dutyDate >= fromDate && dutyDate <= toDate && (v.transactionType || 'Buy') === transactionFilter) {
            acc[owner] = (acc[owner] || 0) + (Number((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount) || 0);
        }
        return acc;
    }, {});

    const uniqueOwners = Object.keys(ownerBalances).sort();

    const uniqueProperties = Object.values(vehicles
        .filter(v => {
            const ownerMatch = ownerFilter === 'All' || v.ownerName?.trim() === ownerFilter?.trim();
            const dutyDate = v.carNumber?.split('#')[1];
            const dateMatch = dutyDate >= fromDate && dutyDate <= toDate;
            const transMatch = (v.transactionType || 'Buy') === transactionFilter;
            return ownerMatch && dateMatch && transMatch;
        })
        .reduce((acc, v) => {
            const prop = v.property?.trim();
            if (prop) {
                const key = prop.toLowerCase().replace(/\s+/g, ' ');
                if (!acc[key]) acc[key] = prop;
            }
            return acc;
        }, {})).sort();

    const carNumberSuggestions = [...new Set(vehicles.map(v => v.carNumber?.split('#')[0]).filter(Boolean))];

    const getDynamicSuggestions = () => {
        if (!formData.date) return { types: [], locations: [] };

        const fDate = new Date(formData.date);
        const day = fDate.getDate();
        const formDateObj = new Date(formData.date);
        const targetYearMonth = `${formDateObj.getFullYear()}-${String(formDateObj.getMonth() + 1).padStart(2, '0')}`;

        if (day === 1) return { types: [], locations: [], properties: [] };

        const sameMonthData = vehicles.filter(v => {
            const parts = v.carNumber?.split('#');
            if (!parts || !parts[1]) return false;
            // Date is stored as YYYY-MM-DD
            const vYearMonth = parts[1].substring(0, 7);
            return vYearMonth === targetYearMonth;
        });

        return {
            types: [...new Set(sameMonthData.map(v => v.dutyType).filter(Boolean))],
            locations: [...new Set(sameMonthData.map(v => v.dropLocation).filter(Boolean))],
            properties: [...new Set(sameMonthData.map(v => v.property).filter(Boolean))]
        };
    };

    const dynamicSuggestions = getDynamicSuggestions();
    const dutyTypeSuggestions = dynamicSuggestions.types;
    const dropLocationSuggestions = dynamicSuggestions.locations;
    const propertySuggestions = dynamicSuggestions.properties || [];

    const formatDateDisplay = (dateStr) => {
        return formatDateIST(dateStr);
    };

    return (
        <div key={location.key} className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title="Outside Fleet Command" description="Manage external vehicles and freelancer drivers for specific duties." />

            <style>{`
                /* ===== MODAL BASE (GLOBAL OVERLAYS) ===== */
                .modal-overlay { 
                    position: fixed; inset: 0; 
                    background: rgba(0,0,0,0.85); 
                    backdrop-filter: blur(14px); 
                    z-index: 2000; 
                    display: flex; justify-content: center; align-items: center; 
                    padding: clamp(10px, 3vw, 20px); 
                }
                @media (min-width: 1024px) {
                    .modal-overlay { padding-left: calc(280px + clamp(10px, 3vw, 20px)); }
                }
                .bg-buy { 
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(20, 83, 45, 0.2) 100%) !important; 
                    color: #4ade80 !important; 
                    border: 1px solid rgba(34, 197, 94, 0.25) !important;
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
                }
                .bg-sell { 
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.2) 100%) !important; 
                    color: #f87171 !important; 
                    border: 1px solid rgba(239, 68, 68, 0.25) !important;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                }
                .badge-ext { 
                    padding: 3px 10px; 
                    border-radius: 8px; 
                    font-size: 9px; 
                    font-weight: 950; 
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .stat-circle-svg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    transform: rotate(-90deg);
                }
                .stat-circle-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.03);
                    stroke-width: 4;
                }
                .stat-circle-progress {
                    fill: none;
                    stroke-width: 4;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 1s ease-out;
                }
                .payout-glow { filter: drop-shadow(0 0 4px ${theme.primary}); }
                .logs-glow { filter: drop-shadow(0 0 4px #10b981); }
                .table-row-hover:hover { background: rgba(255, 255, 255, 0.02); }
                .action-btn-hover:hover { background: rgba(255, 255, 255, 0.08) !important; color: ${theme.primary} !important; }
                .action-btn-hover-del:hover { background: rgba(244, 63, 94, 0.15) !important; }
            `}</style>

            {/* ─── PREMIUM DYNAMIC HEADER ─── */}
            <header style={{ padding: 'clamp(20px, 4vw, 40px) 0', position: 'relative' }}>
                <div className="flex-resp" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: 'clamp(20px, 4vw, 32px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 20px)' }}>
                        <div style={{
                            width: 'clamp(48px, 10vw, 64px)', height: 'clamp(48px, 10vw, 64px)',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            borderRadius: 'clamp(12px, 3vw, 20px)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.05)', position: 'relative', flexShrink: 0
                        }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `radial-gradient(circle at 30% 30%, ${theme.primary}33, transparent 70%)` }}></div>
                            <Car size={28} color={theme.primary} style={{ filter: `drop-shadow(0 0 10px ${theme.primary}66)` }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }}></motion.div>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Vendor Command</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: '950', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                                Outside <span className="theme-gradient-text">Fleet</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex-resp" style={{ gap: '16px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap' }}>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{
                                width: 'clamp(70px, 12vw, 100px)', height: 'clamp(70px, 12vw, 100px)', borderRadius: '50%',
                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(251, 191, 36, 0.1)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative'
                            }}>
                                <svg className="stat-circle-svg" viewBox="0 0 100 100">
                                    <circle className="stat-circle-bg" cx="50" cy="50" r="45" />
                                    <motion.circle className="stat-circle-progress payout-glow" cx="50" cy="50" r="45" stroke={theme.primary} initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                                </svg>
                                <span style={{ fontSize: '7px', fontWeight: '950', color: theme.primary, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', position: 'relative', zIndex: 1 }}>Payout</span>
                                <span style={{ color: 'white', fontSize: 'clamp(10px, 2.5vw, 14px)', fontWeight: '950', position: 'relative', zIndex: 1 }}>₹{totalPayable.toLocaleString()}</span>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} style={{
                                width: 'clamp(70px, 12vw, 100px)', height: 'clamp(70px, 12vw, 100px)', borderRadius: '50%',
                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16, 185, 129, 0.1)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative'
                            }}>
                                <svg className="stat-circle-svg" viewBox="0 0 100 100">
                                    <circle className="stat-circle-bg" cx="50" cy="50" r="45" />
                                    <motion.circle className="stat-circle-progress logs-glow" cx="50" cy="50" r="45" stroke="#10b981" initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }} animate={{ strokeDashoffset: -200 }} transition={{ duration: 1.8, ease: "easeOut" }} />
                                </svg>
                                <span style={{ fontSize: '7px', fontWeight: '950', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', position: 'relative', zIndex: 1 }}>Vehicles</span>
                                <span style={{ color: 'white', fontSize: 'clamp(12px, 3vw, 16px)', fontWeight: '950', position: 'relative', zIndex: 1 }}>{totalDutiesCount}</span>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ─── CLEAN PREMIUM INTEGRATED CONTROL BAR ─── */}
                        {/* ─ ─ ─  MAIN VIEW SWITCHER (DUTIES VS VENDOR LEDGER) ─ ─ ─  */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button 
                        onClick={() => setMainView('duties')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px', border: 'none',
                            background: mainView === 'duties' ? theme.primary : 'transparent',
                            color: mainView === 'duties' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <Car size={15} /> Daily Duties ({filtered.length})
                    </button>
                    <button 
                        onClick={() => setMainView('vendorLedger')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px', border: 'none',
                            background: mainView === 'vendorLedger' ? theme.primary : 'transparent',
                            color: mainView === 'vendorLedger' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <Store size={15} /> Vendor Ledger ({vendorAggregates.length})
                    </button>
                </div>

                {mainView === 'duties' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleOpenLogDuty} style={{ height: '42px', padding: '0 20px', background: theme.primary, color: 'black', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} strokeWidth={3} /> <span className="hide-mobile">Add Duty</span>
                        </button>
                        <button onClick={handleExportPDF} style={{ height: '42px', width: '42px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <FileText size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ─ ─ ─  VIEW 1: DAILY DUTIES LIST ─ ─ ─  */}
            {mainView === 'duties' && (
                <>
<div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 16px)', marginBottom: 'clamp(24px, 4vw, 32px)', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '24px' }}>
                <div className="flex-resp" style={{ gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ position: 'relative', flex: '2', minWidth: '200px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, opacity: 0.4, zIndex: 1 }} />
                        <input type="text" placeholder="Search vehicle, owner, or property..." className="premium-compact-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '48px', height: '52px', width: '100%' }} />
                    </div>
                    <div className="flex-resp" style={{ gap: '8px', flex: '3', minWidth: '300px' }}>
                        <select value={ownerFilter} onChange={e => handleOwnerChange(e.target.value)} className="premium-compact-input" style={{ height: '52px', flex: 1 }}>
                            <option value="All">All Vendors</option>
                            {uniqueOwners.map(o => (
                                <option key={o} value={o}>
                                    {o} (₹{(ownerBalances[o] || 0).toLocaleString()})
                                </option>
                            ))}
                        </select>
                        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="premium-compact-input" style={{ height: '52px', flex: 1 }}>
                            <option value="All">All Properties</option>
                            {uniqueProperties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-resp" style={{ gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                            {['All', 'Fix Basis', 'Daily Basis'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                    background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.3)',
                                    transition: 'all 0.2s'
                                }}>
                                    {tab === 'All' ? 'All Cars' : tab}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                            {['Buy', 'Sell'].map(t => (
                                <button key={t} onClick={() => setTransactionFilter(t)} style={{
                                    padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                    background: transactionFilter === t ? (t === 'Buy' ? '#22c55e20' : '#ef444420') : 'transparent',
                                    color: transactionFilter === t ? (t === 'Buy' ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.3)',
                                    transition: '0.3s'
                                }}>{t}</button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button 
                                type="button"
                                onClick={handlePrevMonth}
                                title="Previous Month"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
                                <Calendar size={15} color={theme.primary} />
                                <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', minWidth: '120px', textAlign: 'center' }}>
                                    {selectedMonth === 'All' ? `FY ${selectedYear}-${selectedYear + 1}` : `${fullMonthNames[selectedMonth - 1]} ${selectedMonth <= 3 ? selectedYear + 1 : selectedYear}`}
                                </span>
                            </div>

                            <button 
                                type="button"
                                onClick={handleNextMonth}
                                title="Next Month"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedMonth === 'All') {
                                        handleJumpToCurrentMonth();
                                    } else {
                                        setSelectedMonth('All');
                                        setSelectedDay('All');
                                    }
                                }}
                                style={{
                                    padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: selectedMonth === 'All' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                                    color: selectedMonth === 'All' ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                    fontSize: '11px', fontWeight: '800'
                                }}
                            >
                                {selectedMonth === 'All' ? 'Monthly View' : 'Full Year'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── TABLE VIEW (Desktop) ─── */}
            <div className="hide-mobile table-responsive-wrapper" style={{ background: 'rgba(15, 23, 42, 0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle / Vendor</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Property / Duty</th>
                            <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                            <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '800' }}>LOADING DATA...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '800' }}>NO RECORDS FOUND</td></tr>
                        ) : filtered.map((v, idx) => (
                            <motion.tr key={v._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{formatDateIST(v.carNumber?.split('#')[1] || v.createdAt)}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{new Date(v.carNumber?.split('#')[1] || v.createdAt).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Car size={18} color="#38bdf8" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{v.carNumber?.split('#')[0]} <span className={`badge-ext ${v.transactionType === 'Buy' ? 'bg-buy' : 'bg-sell'}`} style={{ fontSize: '7px' }}>{v.transactionType}</span></div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.ownerName} ({v.model})</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{v.guestName || v.property || 'Direct'}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>{v.dutyType} {v.dropLocation && <>→ {v.dropLocation}</>}</div>
                                    {v.remarks && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontStyle: 'italic' }}>{v.remarks}</div>}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>₹{((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount)?.toLocaleString()}</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleEdit(v)} className="action-btn-hover" style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(v._id)} className="action-btn-hover-del" style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ─── CARD VIEW (Mobile) ─── */}
            <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map((v, idx) => (
                    <motion.div key={v._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="#38bdf8" /></div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{v.carNumber?.split('#')[0]}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.ownerName}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '1000', color: '#10b981' }}>₹{((v.transactionType === 'Buy' && v.buyAmount) ? v.buyAmount : v.dutyAmount)?.toLocaleString()}</div>
                                <span className={`badge-ext ${v.transactionType === 'Buy' ? 'bg-buy' : 'bg-sell'}`} style={{ fontSize: '6px', padding: '2px 6px' }}>{v.transactionType}</span>
                            </div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>PROPERTY</span>
                                <span style={{ fontSize: '11px', color: 'white', fontWeight: '900' }}>{v.guestName || v.property || 'Direct'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>DATE</span>
                                <span style={{ fontSize: '11px', color: theme.primary, fontWeight: '900' }}>{formatDateIST(v.carNumber?.split('#')[1] || v.createdAt)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{v.dutyType}</span>
                                {v.remarks && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: '2px' }}>{v.remarks}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEdit(v)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}><Edit size={14} /></button>
                                <button onClick={() => handleDelete(v._id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', border: 'none', color: '#f43f5e' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ─── MODAL ─── */}
                            </>
            )}

            {/* ─ ─ ─  VIEW 2: VENDOR LEDGER (HORIZONTAL ROWS) ─ ─ ─  */}
            {mainView === 'vendorLedger' && (
                <div>
                    {/* Vendor Search Bar & Summary Stats */}
                    <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)', marginBottom: 'clamp(20px, 3vw, 24px)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', opacity: 0.6, zIndex: 1 }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search vendor name or car plate number..." 
                                        className="premium-compact-input" 
                                        value={vendorSearchTerm} 
                                        onChange={e => setVendorSearchTerm(e.target.value)} 
                                        style={{ paddingLeft: '48px', height: '48px', width: '100%', fontSize: '13px' }} 
                                    />
                                    {vendorSearchTerm && (
                                        <button 
                                            type="button" 
                                            onClick={() => setVendorSearchTerm('')}
                                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openNewPaymentModal()}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '0 20px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        fontSize: '13px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Plus size={16} />
                                    <span>Record Payment</span>
                                </button>
                            </div>

                            {/* Overall Market Summary Cards: Payable, Receivable, Net Balance */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                {/* Card 1: Vendors Count */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Store size={20} color="#fbbf24" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>Outside Vendors</div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: 'white' }}>{overallMarketKhataSummary.totalVendors}</div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{overallMarketKhataSummary.totalDuties} Total Duties</div>
                                    </div>
                                </div>

                                {/* Card 2: Total Payable (Buy) */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.03) 100%)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowUpRight size={22} color="#f87171" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>Total Payable (Buy)</div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: '#f87171' }}>₹{overallMarketKhataSummary.duePayable.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                            Duties: ₹{overallMarketKhataSummary.totalDena.toLocaleString('en-IN')}{overallMarketKhataSummary.totalPaid > 0 ? ` • Paid: ₹${overallMarketKhataSummary.totalPaid.toLocaleString('en-IN')}` : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Total Receivable (Sell) */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.03) 100%)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowDownRight size={22} color="#4ade80" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#86efac', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>Total Receivable (Sell)</div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: '#4ade80' }}>₹{overallMarketKhataSummary.dueReceivable.toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                            Duties: ₹{overallMarketKhataSummary.totalLena.toLocaleString('en-IN')}{overallMarketKhataSummary.totalReceived > 0 ? ` • Rec: ₹${overallMarketKhataSummary.totalReceived.toLocaleString('en-IN')}` : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: Net Market Balance */}
                                <div style={{ 
                                    background: overallMarketKhataSummary.netDifference > 0 
                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.04) 100%)' 
                                        : overallMarketKhataSummary.netDifference < 0 
                                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(21, 128, 61, 0.04) 100%)' 
                                            : 'rgba(255,255,255,0.03)',
                                    border: overallMarketKhataSummary.netDifference > 0 
                                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                                        : overallMarketKhataSummary.netDifference < 0 
                                            ? '1px solid rgba(34, 197, 94, 0.35)' 
                                            : '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '16px', 
                                    padding: '12px 18px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '14px' 
                                }}>
                                    <div style={{ 
                                        width: '42px', 
                                        height: '42px', 
                                        borderRadius: '12px', 
                                        background: overallMarketKhataSummary.netDifference > 0 ? 'rgba(239, 68, 68, 0.2)' : overallMarketKhataSummary.netDifference < 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)', 
                                        border: overallMarketKhataSummary.netDifference > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : overallMarketKhataSummary.netDifference < 0 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.1)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        <Scale size={22} color={overallMarketKhataSummary.netDifference > 0 ? '#f87171' : overallMarketKhataSummary.netDifference < 0 ? '#4ade80' : '#94a3b8'} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.6px' }}>Net Market Balance</div>
                                        <div style={{ fontSize: '20px', fontWeight: '1000', color: overallMarketKhataSummary.netDifference > 0 ? '#f87171' : overallMarketKhataSummary.netDifference < 0 ? '#4ade80' : '#ffffff' }}>
                                            ₹{Math.abs(overallMarketKhataSummary.netDifference).toLocaleString('en-IN')}
                                        </div>
                                        <div style={{ 
                                            fontSize: '10px', 
                                            fontWeight: '800', 
                                            color: overallMarketKhataSummary.netDifference > 0 ? '#fca5a5' : overallMarketKhataSummary.netDifference < 0 ? '#86efac' : '#94a3b8' 
                                        }}>
                                            {overallMarketKhataSummary.netDifference > 0 ? '● NET PAYABLE (We Owe)' : overallMarketKhataSummary.netDifference < 0 ? '● NET RECEIVABLE (They Owe)' : '● BALANCED'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sleek Horizontal Table Rows View */}
                    <div className="hide-mobile" style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '18px 24px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Vendor / Provider</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '11px', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>🔴 Payable (Buy)</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '11px', color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>🟢 Receivable (Sell)</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>⚖️ Net Balance</th>
                                    <th style={{ padding: '18px 24px', textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVendorAggregates.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: '800' }}>
                                            No vendor ledgers found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVendorAggregates.map((vnd, idx) => (
                                        <motion.tr 
                                            key={vnd.vendorName || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="table-row-hover"
                                            onClick={() => { setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                        >
                                            {/* Vendor Name + Duties & Activity Subtext */}
                                            <td style={{ padding: '18px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(217, 119, 6, 0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.25)', flexShrink: 0 }}>
                                                        <Store size={20} color="#fbbf24" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: '950', color: 'white' }}>{vnd.vendorName}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', marginTop: '3px' }}>
                                                            <span style={{ color: '#38bdf8', fontWeight: '800' }}>{vnd.totalDuties} duties</span>
                                                            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                                                            <span>{vnd.vehicles.length} vehicle(s)</span>
                                                            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                                                            <span>{vnd.monthlyBreakdown?.length || 1} active month(s)</span>
                                                            {vnd.latestDate && (
                                                                <>
                                                                    <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                                                                    <span>Last: {formatDateIST(vnd.latestDate)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Payable (Buy) */}
                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <div style={{ fontSize: '16px', fontWeight: '950', color: vnd.duePayable > 0 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>
                                                    {vnd.duePayable > 0 ? `₹${vnd.duePayable.toLocaleString('en-IN')}` : (vnd.totalDena > 0 ? '₹0' : '—')}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', marginTop: '2px' }}>
                                                    Duties: ₹{vnd.totalDena.toLocaleString('en-IN')}
                                                    {vnd.totalPaid > 0 && <span style={{ color: '#38bdf8', marginLeft: '4px' }}>• Paid: ₹{vnd.totalPaid.toLocaleString('en-IN')}</span>}
                                                </div>
                                            </td>

                                            {/* Receivable (Sell) */}
                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <div style={{ fontSize: '16px', fontWeight: '950', color: vnd.dueReceivable > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                                                    {vnd.dueReceivable > 0 ? `₹${vnd.dueReceivable.toLocaleString('en-IN')}` : (vnd.totalLena > 0 ? '₹0' : '—')}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', marginTop: '2px' }}>
                                                    Duties: ₹{vnd.totalLena.toLocaleString('en-IN')}
                                                    {vnd.totalReceived > 0 && <span style={{ color: '#34d399', marginLeft: '4px' }}>• Rec: ₹{vnd.totalReceived.toLocaleString('en-IN')}</span>}
                                                </div>
                                            </td>

                                            {/* Net Balance */}
                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                                    <span style={{ 
                                                        fontSize: '17px', 
                                                        fontWeight: '1000', 
                                                        color: vnd.netBalance > 0 ? '#f87171' : vnd.netBalance < 0 ? '#4ade80' : '#ffffff' 
                                                    }}>
                                                        ₹{Math.abs(vnd.netBalance).toLocaleString('en-IN')}
                                                    </span>
                                                    <span style={{ 
                                                        fontSize: '9.5px', 
                                                        fontWeight: '800', 
                                                        padding: '2.5px 8px', 
                                                        borderRadius: '6px', 
                                                        background: vnd.netBalance > 0 ? 'rgba(239, 68, 68, 0.15)' : vnd.netBalance < 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: vnd.netBalance > 0 ? '#fca5a5' : vnd.netBalance < 0 ? '#86efac' : '#94a3b8',
                                                        border: vnd.netBalance > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : vnd.netBalance < 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        {vnd.netBalance > 0 ? '● PAYABLE' : vnd.netBalance < 0 ? '● RECEIVABLE' : '✓ BALANCED'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Action Button */}
                                            <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openNewPaymentModal(vnd.vendorName, vnd.netBalance > 0 ? 'Paid' : 'Received');
                                                        }}
                                                        style={{
                                                            padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.35)',
                                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                                                            color: '#34d399', fontWeight: '900', fontSize: '12px', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                                                        }}
                                                        title={`Record payment for ${vnd.vendorName}`}
                                                    >
                                                        <Plus size={13} /> Pay / Settle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVendorForLedger(vnd);
                                                            setVendorLedgerMonth('All');
                                                        }}
                                                        style={{
                                                            padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)',
                                                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
                                                            color: '#fbbf24', fontWeight: '900', fontSize: '12px', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.15)'
                                                        }}
                                                    >
                                                        <BookOpen size={14} /> View Ledger
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View for Outside Vendors */}
                    <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredVendorAggregates.map((vnd, idx) => (
                            <motion.div
                                key={vnd.vendorName || idx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => { setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', cursor: 'pointer' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                            <Store size={20} color="#fbbf24" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: '950', color: 'white' }}>{vnd.vendorName}</div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{vnd.totalDuties} duties • {vnd.vehicles.length} vehicle(s)</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '1000', color: vnd.netBalance > 0 ? '#f87171' : vnd.netBalance < 0 ? '#4ade80' : 'white' }}>
                                            ₹{Math.abs(vnd.netBalance).toLocaleString('en-IN')}
                                        </div>
                                        <span style={{ fontSize: '9px', fontWeight: '800', color: vnd.netBalance > 0 ? '#fca5a5' : vnd.netBalance < 0 ? '#86efac' : '#94a3b8' }}>
                                            {vnd.netBalance > 0 ? 'PAYABLE' : vnd.netBalance < 0 ? 'RECEIVABLE' : 'BALANCED'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: '700', display: 'block' }}>🔴 Due Payable</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#f87171' }}>₹{(vnd.duePayable || 0).toLocaleString('en-IN')}</span>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '2px' }}>Duties: ₹{vnd.totalDena.toLocaleString('en-IN')} • Paid: ₹{(vnd.totalPaid || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#86efac', fontWeight: '700', display: 'block' }}>🟢 Due Receivable</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#4ade80' }}>₹{(vnd.dueReceivable || 0).toLocaleString('en-IN')}</span>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '2px' }}>Duties: ₹{vnd.totalLena.toLocaleString('en-IN')} • Rec: ₹{(vnd.totalReceived || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                        Last: {vnd.latestDate ? formatDateIST(vnd.latestDate) : '—'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openNewPaymentModal(vnd.vendorName, vnd.netBalance > 0 ? 'Paid' : 'Received');
                                            }}
                                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: '900', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Plus size={12} /> Pay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setSelectedVendorForLedger(vnd); setVendorLedgerMonth('All'); }}
                                            style={{ padding: '6px 14px', borderRadius: '8px', background: '#fbbf24', color: '#0f172a', border: 'none', fontWeight: '900', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            <BookOpen size={12} /> View Ledger
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─ ─ ─  PREMIUM VENDOR LEDGER MODAL ─ ─ ─  */}
            <AnimatePresence>
                {selectedVendorForLedger && (
                    <div className="modal-overlay" style={{ zIndex: 2100 }}>
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                            transition={{ duration: 0.2 }}
                            style={{ 
                                maxWidth: '1240px', 
                                width: '96%', 
                                maxHeight: '90vh', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                padding: 0, 
                                overflow: 'hidden',
                                background: 'linear-gradient(180deg, #0d1527 0%, #070b14 100%)',
                                borderRadius: '22px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 30px 90px -15px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            }}
                        >
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
                                        onClick={() => setSelectedVendorForLedger(null)}
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
                                        title="Back to All Vendors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px' }}>
                                            Vendor Ledger
                                        </div>
                                        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '950', margin: '2px 0 0', letterSpacing: '-0.3px' }}>
                                            {selectedVendorForLedger.vendorName}
                                        </h2>
                                    </div>
                                </div>

                                {/* Right: Filter Period (Month Dropdown) + Record Payment + Export CSV + Close */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    {/* Filter Period Label & Dropdown */}
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
                                            <option value="All">All Months ({selectedVendorForLedger.duties.length})</option>
                                            {selectedVendorForLedger.monthlyBreakdown?.map(mb => (
                                                <option key={mb.month} value={mb.month}>
                                                    {formatMonthYear(mb.month)} ({mb.count})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Primary Record Payment Button (matches Emjay Brewery) */}
                                    <button 
                                        type="button"
                                        onClick={() => openNewPaymentModal(selectedVendorForLedger.vendorName, selectedVendorForLedger.netBalance > 0 ? 'Paid' : 'Received')}
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
                                        title={`Record payment or settlement for ${selectedVendorForLedger.vendorName}`}
                                    >
                                        <Plus size={14} />
                                        <span>RECORD PAYMENT</span>
                                    </button>

                                    {/* Export CSV Button */}
                                    <button 
                                        type="button"
                                        onClick={exportVendorLedgerCSV}
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

                                    {/* Close Modal Button */}
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedVendorForLedger(null)} 
                                        className="glass-card-hover-effect"
                                        style={{ 
                                            background: 'rgba(255,255,255,0.05)', 
                                            border: '1px solid rgba(255,255,255,0.1)', 
                                            color: 'rgba(255,255,255,0.6)', 
                                            cursor: 'pointer', 
                                            borderRadius: '8px', 
                                            width: '36px', 
                                            height: '36px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center'
                                        }}
                                        title="Close"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* 3 Top Summary Cards */}
                            <div style={{ padding: '20px 28px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', flexShrink: 0 }}>
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
                                        ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForLedger.totalDena + selectedVendorForLedger.totalLena) : (activeMonthDenaTotal + activeMonthLenaTotal)).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                        {filteredVendorDuties.filter(d => !d.isPayment).length} transactions
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
                                        ₹{(vendorLedgerMonth === 'All' ? (selectedVendorForLedger.totalPaid + selectedVendorForLedger.totalReceived) : (activeMonthPaidTotal + activeMonthReceivedTotal)).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                        {filteredVendorDuties.filter(d => d.isPayment).length} payments
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
                                        color: (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 ? '#f87171' : (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) < 0 ? '#34d399' : 'white'
                                    }}>
                                        ₹{Math.abs(vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '4px' }}>
                                        {(vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 ? 'Payable to vendor' : (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) < 0 ? 'Receivable from vendor' : 'Account Settled'}
                                    </div>
                                </div>
                            </div>

                            {/* Total Outstanding Banner */}
                            <div style={{
                                margin: '16px 28px 0',
                                padding: '16px 22px',
                                borderRadius: '12px',
                                background: (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 
                                    ? 'rgba(239, 68, 68, 0.08)' 
                                    : (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) < 0 
                                        ? 'rgba(34, 197, 94, 0.08)' 
                                        : 'rgba(255,255,255,0.03)',
                                border: (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 
                                    ? '1px solid rgba(239, 68, 68, 0.25)' 
                                    : (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) < 0 
                                        ? '1px solid rgba(34, 197, 94, 0.25)' 
                                        : '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <div>
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 ? '#f87171' : '#34d399', 
                                        fontWeight: '900', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.6px' 
                                    }}>
                                        Total Outstanding
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontWeight: '600' }}>
                                        Net standing balance for this vendor
                                    </div>
                                </div>
                                <div style={{ 
                                    fontSize: '26px', 
                                    fontWeight: '1000', 
                                    color: (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) > 0 ? '#f87171' : (vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance) < 0 ? '#34d399' : 'white' 
                                }}>
                                    ₹{Math.abs(vendorLedgerMonth === 'All' ? selectedVendorForLedger.netBalance : activeMonthNetBalance).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Transaction Ledger Section Header */}
                            <div style={{ 
                                padding: '20px 28px 10px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <h3 style={{ 
                                    fontSize: '11px', 
                                    fontWeight: '900', 
                                    color: 'rgba(255,255,255,0.5)', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.8px', 
                                    margin: 0 
                                }}>
                                    Transaction Ledger
                                </h3>
                                <div style={{ position: 'relative', width: '240px' }}>
                                    <Search size={13} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        value={ledgerDutySearch}
                                        onChange={(e) => setLedgerDutySearch(e.target.value)}
                                        placeholder="Search narration, ref, car..."
                                        style={{
                                            width: '100%',
                                            height: '32px',
                                            padding: '4px 10px 4px 28px',
                                            background: '#070c18',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '11.5px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {ledgerDutySearch && (
                                        <button 
                                            type="button" 
                                            onClick={() => setLedgerDutySearch('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Duties Table with Sticky Header */}
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 28px 20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0a101d' }}>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', width: '13%' }}>Date</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', width: '41%' }}>Narration</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '11px', color: '#34d399', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', width: '15%' }}>Paid Amount</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '11px', color: '#f87171', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', width: '15%' }}>Bill Amount</th>
                                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', width: '16%' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVendorDuties.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: '700' }}>
                                                        No entries found for this vendor in the selected period.
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredVendorDuties.map((d, dIdx) => (
                                                <tr 
                                                    key={d._id || dIdx} 
                                                    className="table-row-hover"
                                                    style={{ 
                                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                        background: d.isPayment ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                                                        transition: '0.15s'
                                                    }}
                                                >
                                                    {/* Date */}
                                                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                        {formatDateIST(d.effectiveDate)}
                                                    </td>

                                                    {/* Narration */}
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {d.isPayment ? (
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span style={{ 
                                                                        fontSize: '12px', 
                                                                        fontWeight: '800', 
                                                                        color: d.paymentType === 'Paid' ? '#34d399' : '#38bdf8' 
                                                                    }}>
                                                                        Payment {d.paymentType === 'Paid' ? 'Paid' : 'Received'} via {d.paymentMode || 'Cash'}
                                                                    </span>
                                                                    {d.referenceNumber && (
                                                                        <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                            Ref: {d.referenceNumber}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {d.notes && (
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                        {d.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span style={{ 
                                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                        fontSize: '12px', 
                                                                        fontWeight: '800', 
                                                                        color: 'white' 
                                                                    }}>
                                                                        {d.carNumber?.split('#')[0]}
                                                                    </span>
                                                                    {d.model && (
                                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                                                                            ({d.model})
                                                                        </span>
                                                                    )}
                                                                    <span style={{ 
                                                                        fontSize: '10px', 
                                                                        padding: '2px 6px', 
                                                                        borderRadius: '4px',
                                                                        background: d.isBuy ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                                                        color: d.isBuy ? '#f87171' : '#34d399',
                                                                        border: d.isBuy ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                                                                        fontWeight: '800'
                                                                    }}>
                                                                        {d.isBuy ? 'Duty Payable' : 'Duty Receivable'}
                                                                    </span>
                                                                </div>
                                                                {(d.property || d.guestName || d.dutyType || d.dropLocation) && (
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                                                                        {[d.property, d.guestName, d.dutyType, d.dropLocation].filter(Boolean).join(' • ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Paid Amount */}
                                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                        {d.isPayment ? (
                                                            <span style={{ color: '#34d399', fontWeight: '900', fontSize: '14px' }}>
                                                                ₹{d.effectiveAmount.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                                                                ₹0
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Bill Amount */}
                                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                        {d.isPayment ? (
                                                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                                                                —
                                                            </span>
                                                        ) : (
                                                            <span style={{ 
                                                                color: d.isBuy ? '#f87171' : '#34d399', 
                                                                fontWeight: '900', 
                                                                fontSize: '14px' 
                                                            }}>
                                                                ₹{(d.denaAmount || d.lenaAmount || d.effectiveAmount).toLocaleString('en-IN')}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions: Edit & Delete for both payments and duties */}
                                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                            {d.isPayment ? (
                                                                <>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleEditPayment(d)} 
                                                                        className="glass-card-hover-effect"
                                                                        style={{ 
                                                                            width: '30px', 
                                                                            height: '30px', 
                                                                            borderRadius: '6px', 
                                                                            background: 'rgba(255, 255, 255, 0.05)', 
                                                                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                                                                            color: 'rgba(255,255,255,0.75)', 
                                                                            cursor: 'pointer', 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            justifyContent: 'center',
                                                                            transition: '0.15s'
                                                                        }}
                                                                        title="Edit Payment (Date, Month, Amount, Mode)"
                                                                    >
                                                                        <Edit size={13} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleDeletePayment(d._id)} 
                                                                        className="glass-card-hover-effect"
                                                                        style={{ 
                                                                            width: '30px', 
                                                                            height: '30px', 
                                                                            borderRadius: '6px', 
                                                                            background: 'rgba(244, 63, 94, 0.1)', 
                                                                            border: '1px solid rgba(244, 63, 94, 0.2)', 
                                                                            color: '#f43f5e', 
                                                                            cursor: 'pointer', 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            justifyContent: 'center',
                                                                            transition: '0.15s'
                                                                        }}
                                                                        title="Delete Payment"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleEdit(d)} 
                                                                        className="glass-card-hover-effect"
                                                                        style={{ 
                                                                            width: '30px', 
                                                                            height: '30px', 
                                                                            borderRadius: '6px', 
                                                                            background: 'rgba(255, 255, 255, 0.05)', 
                                                                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                                                                            color: 'rgba(255,255,255,0.75)', 
                                                                            cursor: 'pointer', 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            justifyContent: 'center',
                                                                            transition: '0.15s'
                                                                        }}
                                                                        title="Edit Duty Entry"
                                                                    >
                                                                        <Edit size={13} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleDelete(d._id)} 
                                                                        className="glass-card-hover-effect"
                                                                        style={{ 
                                                                            width: '30px', 
                                                                            height: '30px', 
                                                                            borderRadius: '6px', 
                                                                            background: 'rgba(244, 63, 94, 0.1)', 
                                                                            border: '1px solid rgba(244, 63, 94, 0.2)', 
                                                                            color: '#f43f5e', 
                                                                            cursor: 'pointer', 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            justifyContent: 'center',
                                                                            transition: '0.15s'
                                                                        }}
                                                                        title="Delete Duty Entry"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

<AnimatePresence>
                {showModal && (
                    <div className="modal-overlay" style={{ zIndex: 2200 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content-wrapper" style={{ maxWidth: '700px', width: '95%', padding: 0 }}>
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '950', margin: 0 }}>{editMode ? 'Edit Entry' : 'Add Duty Entry'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>Fill details for the outside fleet duty.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Assignment Date *</label>
                                        <input type="date" className="premium-compact-input" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ height: '52px', colorScheme: 'dark' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Client Property *</label>
                                        <input type="text" className="premium-compact-input" list="propList" required value={formData.property} onChange={e => setFormData({ ...formData, property: e.target.value })} placeholder="Property Name" style={{ height: '52px' }} />
                                        <datalist id="propList">{propertySuggestions.map(p => <option key={p} value={p} />)}</datalist>
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Vehicle Plate *</label>
                                        <input 
                                            type="text" 
                                            className="premium-compact-input" 
                                            required 
                                            value={formData.carNumber} 
                                            onChange={e => handleCarNumberChange(e.target.value)} 
                                            onFocus={() => {
                                                if (!formData.carNumber) {
                                                    const uniqueMatches = [];
                                                    const seen = new Set();
                                                    [...vehicles, ...companyVehicles].forEach(m => {
                                                        const plate = m.carNumber?.split('#')[0] || m.carNumber;
                                                        if (plate && !seen.has(plate)) {
                                                            seen.add(plate);
                                                            uniqueMatches.push(m);
                                                        }
                                                    });
                                                    setSuggestions(uniqueMatches.slice(0, 15));
                                                    setShowSuggestions(uniqueMatches.length > 0);
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            placeholder="RJ-XX-XX-XXXX" 
                                            style={{ height: '52px', textTransform: 'uppercase' }} 
                                        />
                                        <AnimatePresence>
                                            {showSuggestions && suggestions.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', borderRadius: '12px', zIndex: 100, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                    {suggestions.map((s, i) => <div key={i} onClick={() => selectSuggestion(s)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '13px' }}>{s.carNumber?.split('#')[0] || s.carNumber} {s.ownerName ? `(${s.ownerName})` : '(Company Car)'}</div>)}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Model *</label>
                                        <input type="text" className="premium-compact-input" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Innova" style={{ height: '52px' }} />
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Vendor / Owner *</label>
                                        <input type="text" className="premium-compact-input" required value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Vendor Name" style={{ height: '52px' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Transaction Type</label>
                                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', gap: '4px', height: '52px' }}>
                                            {['Buy', 'Sell'].map(t => (
                                                <button key={t} type="button" onClick={() => setFormData({ ...formData, transactionType: t })} style={{
                                                    flex: 1, borderRadius: '8px', border: 'none', cursor: 'pointer', transition: '0.3s',
                                                    background: formData.transactionType === t ? (t === 'Buy' ? '#22c55e' : '#ef4444') : 'transparent',
                                                    color: formData.transactionType === t ? 'black' : 'rgba(255,255,255,0.3)',
                                                    fontWeight: '900', fontSize: '12px'
                                                }}>{t}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ gap: '20px', marginBottom: '32px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Service Type</label>
                                        <input type="text" className="premium-compact-input" list="typeList" value={formData.dutyType} onChange={e => setFormData({ ...formData, dutyType: e.target.value })} placeholder="e.g. Local Duty" style={{ height: '52px' }} />
                                        <datalist id="typeList">{dutyTypeSuggestions.map(t => <option key={t} value={t} />)}</datalist>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Work Basis *</label>
                                        <select className="premium-compact-input" required value={formData.workBasis} onChange={e => setFormData({ ...formData, workBasis: e.target.value })} style={{ height: '52px' }}>
                                            <option value="Fix Basis" style={{ background: '#0f172a' }}>Fix Basis</option>
                                            <option value="Daily Basis" style={{ background: '#0f172a' }}>Daily Basis</option>
                                        </select>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Payout Amount (₹) *</label>
                                        <input type="number" className="premium-compact-input" required value={formData.dutyAmount} onChange={e => setFormData({ ...formData, dutyAmount: e.target.value })} placeholder="0.00" style={{ height: '52px', fontSize: '18px', fontWeight: '950', color: '#10b981' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 2, height: '56px', borderRadius: '16px', background: theme.primary, border: 'none', color: 'black', fontWeight: '1000', fontSize: '16px', cursor: 'pointer', boxShadow: `0 10px 20px ${theme.primary}30` }}>{editMode ? 'Update' : 'Submit'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─ ─ ─  RECORD VENDOR PAYMENT MODAL ─ ─ ─  */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="modal-overlay" style={{ zIndex: 2200 }}>
                        <motion.div 
                            initial={{ scale: 0.92, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.92, opacity: 0, y: 20 }} 
                            transition={{ duration: 0.2 }}
                            className="modal-content-wrapper" 
                            style={{ 
                                maxWidth: '640px', 
                                width: '95%', 
                                padding: 0, 
                                background: 'linear-gradient(180deg, #0e172a 0%, #080d1a 100%)', 
                                border: '1px solid rgba(255,255,255,0.12)', 
                                borderRadius: '22px', 
                                overflow: 'hidden',
                                boxShadow: '0 25px 80px rgba(0,0,0,0.85)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ 
                                padding: '22px 28px', 
                                borderBottom: '1px solid rgba(255,255,255,0.08)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '42px', 
                                        height: '42px', 
                                        borderRadius: '12px', 
                                        background: paymentFormData.paymentType === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)', 
                                        border: paymentFormData.paymentType === 'Paid' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: paymentFormData.paymentType === 'Paid' ? '#34d399' : '#38bdf8'
                                    }}>
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '950', margin: 0 }}>
                                            {paymentEditMode ? 'Edit Payment Record' : 'Record Vendor Payment'}
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '700', margin: '3px 0 0' }}>
                                            {paymentFormData.paymentType === 'Paid' 
                                                ? 'Record payment made to vendor (reduces what you owe them)'
                                                : 'Record payment received from vendor (reduces what they owe you)'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)} 
                                    style={{ 
                                        background: 'rgba(255,255,255,0.06)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '10px',
                                        color: 'rgba(255,255,255,0.5)', 
                                        cursor: 'pointer',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Payment Form */}
                            <form onSubmit={handlePaymentSubmit} style={{ padding: '24px 28px' }}>
                                {/* Payment Direction Toggle */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                        Payment Direction *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFormData({ ...paymentFormData, paymentType: 'Paid' })}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: paymentFormData.paymentType === 'Paid' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                                background: paymentFormData.paymentType === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: paymentFormData.paymentType === 'Paid' ? '#34d399' : 'rgba(255,255,255,0.6)',
                                                fontWeight: '900',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: '0.2s'
                                            }}
                                        >
                                            <span>💸 Paid to Vendor</span>
                                            <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', opacity: 0.85 }}>Outflow</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFormData({ ...paymentFormData, paymentType: 'Received' })}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: paymentFormData.paymentType === 'Received' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                                                background: paymentFormData.paymentType === 'Received' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: paymentFormData.paymentType === 'Received' ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                fontWeight: '900',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: '0.2s'
                                            }}
                                        >
                                            <span>💰 Received from Vendor</span>
                                            <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', opacity: 0.85 }}>Inflow</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Vendor Name & Date */}
                                <div className="form-grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Vendor Name *</label>
                                        <input
                                            type="text"
                                            className="premium-compact-input"
                                            list="vendorDataList"
                                            required
                                            value={paymentFormData.vendorName}
                                            onChange={e => setPaymentFormData({ ...paymentFormData, vendorName: e.target.value })}
                                            placeholder="Select or enter vendor name"
                                            style={{ height: '48px', fontSize: '13px' }}
                                        />
                                        <datalist id="vendorDataList">
                                            {uniqueVendorsList.map(v => <option key={v} value={v} />)}
                                        </datalist>
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Payment Date *</label>
                                        <input
                                            type="date"
                                            className="premium-compact-input"
                                            required
                                            value={paymentFormData.date}
                                            onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                            style={{ height: '48px', colorScheme: 'dark', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                {/* Amount & Reference */}
                                <div className="form-grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Amount (₹) *</label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            className="premium-compact-input"
                                            required
                                            value={paymentFormData.amount}
                                            onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                            placeholder="0.00"
                                            style={{ 
                                                height: '48px', 
                                                fontSize: '18px', 
                                                fontWeight: '950', 
                                                color: paymentFormData.paymentType === 'Paid' ? '#34d399' : '#38bdf8' 
                                            }}
                                        />
                                    </div>
                                    <div className="premium-input-group">
                                        <label className="premium-label">Reference / UTR / Cheque No.</label>
                                        <input
                                            type="text"
                                            className="premium-compact-input"
                                            value={paymentFormData.referenceNumber}
                                            onChange={e => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                                            placeholder="e.g. UTR294829482 / Cheque #102934"
                                            style={{ height: '48px', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                {/* Payment Method (Cash, Bank / UPI, Others) */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                        Payment Method *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentFormData({ ...paymentFormData, paymentMode: 'Cash', bankAccountId: '', paidBy: 'Company' })}
                                            style={{
                                                padding: '10px 8px',
                                                borderRadius: '12px',
                                                border: (paymentFormData.paymentMode === 'Cash') ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                background: (paymentFormData.paymentMode === 'Cash') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: (paymentFormData.paymentMode === 'Cash') ? '#10b981' : 'rgba(255,255,255,0.6)',
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
                                            onClick={() => setPaymentFormData({ ...paymentFormData, paymentMode: 'Bank Transfer', bankAccountId: paymentFormData.bankAccountId || (bankAccounts[0]?._id || ''), paidBy: 'Company' })}
                                            style={{
                                                padding: '10px 8px',
                                                borderRadius: '12px',
                                                border: (paymentFormData.paymentMode !== 'Cash' && paymentFormData.paymentMode !== 'Others') ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                                background: (paymentFormData.paymentMode !== 'Cash' && paymentFormData.paymentMode !== 'Others') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: (paymentFormData.paymentMode !== 'Cash' && paymentFormData.paymentMode !== 'Others') ? '#38bdf8' : 'rgba(255,255,255,0.6)',
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
                                            onClick={() => setPaymentFormData({ ...paymentFormData, paymentMode: 'Others', bankAccountId: '', paidBy: 'Others' })}
                                            style={{
                                                padding: '10px 8px',
                                                borderRadius: '12px',
                                                border: (paymentFormData.paymentMode === 'Others') ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                                                background: (paymentFormData.paymentMode === 'Others') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: (paymentFormData.paymentMode === 'Others') ? '#c084fc' : 'rgba(255,255,255,0.6)',
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

                                    {/* Dynamic Payment Mode Info / BankSelector */}
                                    {paymentFormData.paymentMode === 'Others' ? (
                                        <div style={{
                                            background: 'rgba(168, 85, 247, 0.08)',
                                            border: '1px solid rgba(168, 85, 247, 0.25)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            fontSize: '12px',
                                            color: '#c084fc',
                                            fontWeight: '700'
                                        }}>
                                            💼 Paid / Received via Personal or Third-Party Account (Does NOT affect company Cash or Bank balance)
                                        </div>
                                    ) : paymentFormData.paymentMode === 'Cash' ? (
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
                                            <span>💵 {paymentFormData.paymentType === 'Paid' ? 'Deducted from' : 'Added to'} Office Cash in Hand (Cash Book)</span>
                                            <span style={{ color: paymentFormData.paymentType === 'Paid' ? '#f87171' : '#34d399', fontWeight: '900' }}>
                                                {paymentFormData.paymentType === 'Paid' ? '-' : '+'}₹{(Number(paymentFormData.amount) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <BankSelector
                                            bankAccounts={bankAccounts}
                                            value={paymentFormData.bankAccountId}
                                            amount={Number(paymentFormData.amount) || 0}
                                            onChange={(bId) => setPaymentFormData({ ...paymentFormData, bankAccountId: bId, paymentMode: 'Bank Transfer' })}
                                        />
                                    )}
                                </div>

                                {/* Notes / Remarks */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="premium-label">Notes / Remarks</label>
                                    <input
                                        type="text"
                                        className="premium-compact-input"
                                        value={paymentFormData.notes}
                                        onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                        placeholder="e.g. Cleared bill for October duties"
                                        style={{ height: '48px', fontSize: '13px', width: '100%' }}
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPaymentModal(false)} 
                                        style={{ 
                                            flex: 1, 
                                            height: '50px', 
                                            borderRadius: '14px', 
                                            background: 'rgba(255,255,255,0.05)', 
                                            border: '1px solid rgba(255,255,255,0.1)', 
                                            color: 'white', 
                                            fontWeight: '800', 
                                            fontSize: '13px',
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={paymentSubmitting}
                                        style={{ 
                                            flex: 2, 
                                            height: '50px', 
                                            borderRadius: '14px', 
                                            background: paymentFormData.paymentType === 'Paid' 
                                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                                            border: 'none', 
                                            color: 'white', 
                                            fontWeight: '1000', 
                                            fontSize: '14px', 
                                            cursor: paymentSubmitting ? 'not-allowed' : 'pointer', 
                                            boxShadow: paymentFormData.paymentType === 'Paid' ? '0 8px 24px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(2, 132, 199, 0.35)',
                                            opacity: paymentSubmitting ? 0.7 : 1
                                        }}
                                    >
                                        {paymentSubmitting ? 'Saving...' : (paymentEditMode ? 'Update Payment' : 'Save Payment Record')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OutsideCars;

