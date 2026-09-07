import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    FileText, IndianRupee, Download, CheckCircle, Clock,
    AlertCircle, Search, Filter, Phone, MessageSquare, Plus,
    X, ArrowUpRight, ShieldCheck, Building2, Trash2, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';

export default function Invoices() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [invoices, setInvoices] = useState([]);
    const [kpiSummary, setKpiSummary] = useState({
        totalInvoices: 0,
        totalInvoicedAmount: 0,
        totalCollectedAmount: 0,
        totalPendingAmount: 0,
        totalGstCollected: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Status Update Form
    const [newStatus, setNewStatus] = useState('Paid');
    const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');
    const [paymentRef, setPaymentRef] = useState('');
    const [statusNotes, setStatusNotes] = useState('');

    // Create Direct Invoice Form
    const [createForm, setCreateForm] = useState({
        billTo: {
            name: '',
            companyName: '',
            mobile: '',
            email: '',
            address: '',
            gstin: '',
            placeOfSupply: 'Rajasthan (08)'
        },
        items: [
            { description: 'Passenger Motor Vehicle Rental & Chauffeur Services', sacCode: '996601', quantity: 1, rate: 0, amount: 0 }
        ],
        salesLedger: 'Taxi Sales',
        gstMode: 'GST Extra',
        gstRate: 5,
        isInterState: false,
        advanceAdjusted: 0,
        notes: ''
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchInvoices();
        }
    }, [selectedCompany, statusFilter]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            let url = `/api/invoices/${selectedCompany._id}?status=${statusFilter}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setInvoices(data.invoices || []);
            if (data.kpiSummary) {
                setKpiSummary(data.kpiSummary);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchInvoices();
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/invoices/${selectedInvoice._id}/status`, {
                status: newStatus,
                paymentMode,
                paymentReference: paymentRef,
                notes: statusNotes
            });
            setShowStatusModal(false);
            fetchInvoices();
        } catch (error) {
            console.error('Error updating status:', error);
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    // Item management for Create Modal
    const handleAddItem = () => {
        setCreateForm({
            ...createForm,
            items: [
                ...createForm.items,
                { description: 'Outstation Travel / Airport Transfer', sacCode: '996601', quantity: 1, rate: 0, amount: 0 }
            ]
        });
    };

    const handleRemoveItem = (index) => {
        if (createForm.items.length <= 1) return;
        const newItems = createForm.items.filter((_, i) => i !== index);
        setCreateForm({ ...createForm, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...createForm.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            const qty = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
            const rate = field === 'rate' ? Number(value) : Number(newItems[index].rate);
            newItems[index].amount = Math.round(qty * rate);
        }
        setCreateForm({ ...createForm, items: newItems });
    };

    // Computations for Create Modal
    const itemsSum = createForm.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const rateNum = Number(createForm.gstRate) || 0;
    let modalTaxable = 0;
    let modalTax = 0;
    let modalTotal = 0;

    if (createForm.gstMode === 'GST Extra') {
        modalTaxable = itemsSum;
        modalTax = Math.round((modalTaxable * rateNum) / 100);
        modalTotal = modalTaxable + modalTax;
    } else if (createForm.gstMode === 'GST Inclusive') {
        modalTotal = itemsSum;
        modalTaxable = Math.round(modalTotal / (1 + (rateNum / 100)));
        modalTax = modalTotal - modalTaxable;
    } else {
        modalTaxable = itemsSum;
        modalTax = 0;
        modalTotal = itemsSum;
    }
    const modalNetPayable = Math.max(0, modalTotal - (Number(createForm.advanceAdjusted) || 0));

    const handleCreateDirectInvoice = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                company: selectedCompany._id,
                billTo: createForm.billTo,
                items: createForm.items,
                salesLedger: createForm.salesLedger,
                gstMode: createForm.gstMode,
                gstRate: createForm.gstRate,
                isInterState: createForm.isInterState,
                advanceAdjusted: Number(createForm.advanceAdjusted) || 0,
                notes: createForm.notes,
                status: 'Issued'
            };

            const { data: newInvoice } = await axios.post('/api/invoices', payload);
            setShowCreateModal(false);
            fetchInvoices();
            // Automatically download branded Tax Invoice PDF
            generateTaxInvoicePDF(newInvoice, selectedCompany);
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert(error.response?.data?.message || 'Failed to create tax invoice');
        }
    };

    const shareOnWhatsApp = (inv) => {
        const clientName = inv.billTo?.name || 'Customer';
        const invNum = inv.invoiceNumber;
        const total = (inv.totalAmount || 0).toLocaleString('en-IN');
        const due = (inv.netPayable || 0).toLocaleString('en-IN');
        const text = encodeURIComponent(
            `Hello ${clientName},\n\n` +
            `Your GST Tax Invoice *${invNum}* has been generated by *${selectedCompany?.name || 'LogKaro Fleet'}*.\n\n` +
            `🔹 Total Invoice Value: ₹${total}\n` +
            `🔹 Advance Received: ₹${(inv.advanceAdjusted || 0).toLocaleString('en-IN')}\n` +
            `🔹 *Balance Due: ₹${due}*\n\n` +
            `Payment Mode: NEFT/RTGS/UPI (SAC: 996601)\n` +
            `Thank you for choosing our fleet services!`
        );
        window.open(`https://wa.me/${inv.billTo?.mobile?.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Paid':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid</span>;
            case 'Issued':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Issued</span>;
            case 'Draft':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Draft</span>;
            case 'Cancelled':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8">
            <SEO title="GST Tax Invoices - LogKaro" description="GST Tax Invoice Management & Billing" />

            {/* Top Bar Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-amber-400" />
                        GST Tax Invoices & Billing
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        SAC 996601 Compliant Passenger Transport Tax Invoices (PRD Section 14)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition duration-200"
                    >
                        <Plus className="w-4 h-4" />
                        Direct Tax Invoice
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invoiced</p>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mt-2">
                        ₹{(kpiSummary.totalInvoicedAmount || 0).toLocaleString('en-IN')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{kpiSummary.totalInvoices} Invoices Generated</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Collected / Settled</p>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-400 mt-2">
                        ₹{(kpiSummary.totalCollectedAmount || 0).toLocaleString('en-IN')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Advances + Full Receipts</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Balance Due</p>
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-rose-400 mt-2">
                        ₹{(kpiSummary.totalPendingAmount || 0).toLocaleString('en-IN')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Outstanding Receivables</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">GST Tax Amount</p>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-amber-400 mt-2">
                        ₹{(kpiSummary.totalGstCollected || 0).toLocaleString('en-IN')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">CGST + SGST / IGST</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6 backdrop-blur">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                        {['All', 'Issued', 'Paid', 'Draft', 'Cancelled'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                    statusFilter === tab
                                        ? 'bg-amber-400 text-slate-950 font-bold shadow'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by Invoice #, Guest, Mobile, GSTIN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
                {loading ? (
                    <div className="py-20 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mb-3"></div>
                        <p className="text-sm">Loading Tax Invoices...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-base font-semibold text-slate-400">No Invoices Found</p>
                        <p className="text-xs text-slate-500 mt-1">Generate invoices directly or from Confirmed Bookings.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Invoice # & Date</th>
                                    <th className="py-3.5 px-4">Billed To</th>
                                    <th className="py-3.5 px-4">Booking Ref</th>
                                    <th className="py-3.5 px-4 text-right">Taxable Val</th>
                                    <th className="py-3.5 px-4 text-right">GST Tax</th>
                                    <th className="py-3.5 px-4 text-right">Total (₹)</th>
                                    <th className="py-3.5 px-4 text-right">Advance Adj</th>
                                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {invoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-slate-850/40 transition">
                                        {/* Invoice # & Date */}
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-amber-400">{inv.invoiceNumber}</div>
                                            <div className="text-[11px] text-slate-500">
                                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}
                                            </div>
                                        </td>

                                        {/* Billed To */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-white">
                                                {inv.billTo?.companyName || inv.billTo?.name}
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                <span>{inv.billTo?.mobile}</span>
                                                {inv.billTo?.gstin && (
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400/90 font-mono">
                                                        GSTIN: {inv.billTo.gstin}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Booking Ref */}
                                        <td className="py-3 px-4">
                                            {inv.bookingId ? (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                                                    {inv.bookingId}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-[11px]">Direct Walk-In</span>
                                            )}
                                        </td>

                                        {/* Taxable */}
                                        <td className="py-3 px-4 text-right font-medium text-slate-300">
                                            ₹{(inv.taxableAmount || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* GST Tax */}
                                        <td className="py-3 px-4 text-right text-slate-400">
                                            ₹{(inv.totalTaxAmount || 0).toLocaleString('en-IN')}
                                            <span className="block text-[10px] text-slate-500">({inv.gstRate || 5}%)</span>
                                        </td>

                                        {/* Total */}
                                        <td className="py-3 px-4 text-right font-bold text-white">
                                            ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* Advance Adjusted */}
                                        <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                                            {inv.advanceAdjusted > 0 ? `(-) ₹${inv.advanceAdjusted.toLocaleString('en-IN')}` : '₹0'}
                                        </td>

                                        {/* Balance Due */}
                                        <td className="py-3 px-4 text-right">
                                            <span className={`font-bold ${inv.netPayable > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                ₹{(inv.netPayable || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 text-center">
                                            {getStatusBadge(inv.status)}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* PDF Download */}
                                                <button
                                                    onClick={() => generateTaxInvoicePDF(inv, selectedCompany)}
                                                    title="Download Branded GST Tax Invoice PDF"
                                                    className="p-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-slate-950 transition duration-150"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>

                                                {/* WhatsApp Share */}
                                                <button
                                                    onClick={() => shareOnWhatsApp(inv)}
                                                    title="Share on WhatsApp"
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition duration-150"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Update Status / Settle */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setNewStatus(inv.status === 'Issued' ? 'Paid' : inv.status);
                                                        setShowStatusModal(true);
                                                    }}
                                                    title="Change Status / Mark Paid"
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition duration-150"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Detail Modal */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setShowDetailModal(true);
                                                    }}
                                                    title="View Details"
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition duration-150"
                                                >
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Direct Invoice Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-amber-400" />
                                        Generate Direct GST Tax Invoice
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Sequential ID format: LK-INV-2026-XXXXX</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateDirectInvoice} className="space-y-4 mt-4">
                                {/* Bill To Information */}
                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                                        Receiver / Client Details (Billed To)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Guest / Contact Name *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Rahul Sharma"
                                                value={createForm.billTo.name}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, name: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Company / Organization</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Handmath Technologies"
                                                value={createForm.billTo.companyName}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, companyName: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Mobile Number *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 9876543210"
                                                value={createForm.billTo.mobile}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, mobile: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Email ID</label>
                                            <input
                                                type="email"
                                                placeholder="client@example.com"
                                                value={createForm.billTo.email}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, email: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">GSTIN Number</label>
                                            <input
                                                type="text"
                                                placeholder="08AAAAA0000A1Z5"
                                                value={createForm.billTo.gstin}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, gstin: e.target.value.toUpperCase() }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Place of Supply (State)</label>
                                            <input
                                                type="text"
                                                placeholder="Rajasthan (08)"
                                                value={createForm.billTo.placeOfSupply}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, placeOfSupply: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-3">
                                            <label className="text-[11px] text-slate-400 block mb-1">Billing Address</label>
                                            <input
                                                type="text"
                                                placeholder="Registered Office / Street Address"
                                                value={createForm.billTo.address}
                                                onChange={(e) => setCreateForm({
                                                    ...createForm,
                                                    billTo: { ...createForm.billTo, address: e.target.value }
                                                })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items Table */}
                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                            Service Line Items (SAC 996601)
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {createForm.items.map((item, idx) => (
                                            <div key={idx} className="flex flex-wrap items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                                <div className="flex-1 min-w-[200px]">
                                                    <input
                                                        type="text"
                                                        placeholder="Description of service..."
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <input
                                                        type="text"
                                                        placeholder="SAC"
                                                        value={item.sacCode}
                                                        onChange={(e) => handleItemChange(idx, 'sacCode', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-center text-slate-300 font-mono"
                                                    />
                                                </div>
                                                <div className="w-16">
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-center text-white"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        placeholder="Rate ₹"
                                                        value={item.rate || ''}
                                                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-right text-white"
                                                    />
                                                </div>
                                                <div className="w-24 text-right font-bold text-white text-xs px-2">
                                                    ₹{(item.amount || 0).toLocaleString('en-IN')}
                                                </div>
                                                {createForm.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* GST & Commercials */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                            Tax & Commercial Settings
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[11px] text-slate-400 block mb-1">GST Mode</label>
                                                <select
                                                    value={createForm.gstMode}
                                                    onChange={(e) => setCreateForm({ ...createForm, gstMode: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                                >
                                                    <option value="GST Extra">GST Extra (On Top)</option>
                                                    <option value="GST Inclusive">GST Inclusive</option>
                                                    <option value="No GST">No GST / Cash Memo</option>
                                                    <option value="RCM">RCM (Reverse Charge)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-400 block mb-1">GST Rate (%)</label>
                                                <select
                                                    value={createForm.gstRate}
                                                    onChange={(e) => setCreateForm({ ...createForm, gstRate: Number(e.target.value) })}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                                >
                                                    <option value={5}>5% (Standard Transport)</option>
                                                    <option value={12}>12% (With ITC)</option>
                                                    <option value={18}>18% (Corporate / Package)</option>
                                                    <option value={0}>0% (Exempt)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="checkbox"
                                                id="interstateCheck"
                                                checked={createForm.isInterState}
                                                onChange={(e) => setCreateForm({ ...createForm, isInterState: e.target.checked })}
                                                className="rounded bg-slate-900 border-slate-800 text-amber-500 focus:ring-0"
                                            />
                                            <label htmlFor="interstateCheck" className="text-xs text-slate-300">
                                                Inter-State Supply (Apply IGST instead of CGST+SGST)
                                            </label>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-slate-400 block mb-1">Less Advance Received / Adjusted (₹)</label>
                                            <input
                                                type="number"
                                                value={createForm.advanceAdjusted || ''}
                                                onChange={(e) => setCreateForm({ ...createForm, advanceAdjusted: e.target.value })}
                                                placeholder="0"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Summary Box */}
                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                                            Invoice Calculation Preview
                                        </h4>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-400">
                                                <span>Taxable Value:</span>
                                                <span className="font-semibold text-white">₹{modalTaxable.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Total GST ({createForm.gstRate}%):</span>
                                                <span className="font-semibold text-amber-400">₹{modalTax.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-1">
                                                <span>Invoice Grand Total:</span>
                                                <span className="text-white">₹{modalTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-400">
                                                <span>Less: Advance Adjusted:</span>
                                                <span>(-) ₹{(Number(createForm.advanceAdjusted) || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-amber-400 font-bold text-sm border-t border-slate-800 pt-2 bg-amber-400/10 px-2 py-1.5 rounded-lg">
                                                <span>Net Balance Due:</span>
                                                <span>₹{modalNetPayable.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full mt-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg transition duration-200 text-xs flex items-center justify-center gap-2"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            Issue GST Tax Invoice & Download PDF
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Status Update Modal */}
            <AnimatePresence>
                {showStatusModal && selectedInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <h3 className="text-base font-bold text-white">Update Invoice Status</h3>
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4 text-xs">
                                <div>
                                    <label className="text-slate-400 block mb-1">Invoice Number</label>
                                    <div className="font-bold text-amber-400 text-sm">{selectedInvoice.invoiceNumber}</div>
                                    <div className="text-slate-500 mt-0.5">Net Balance Due: ₹{(selectedInvoice.netPayable || 0).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                    <label className="text-slate-400 block mb-1">Target Status</label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                    >
                                        <option value="Paid">Paid (Full Settlement)</option>
                                        <option value="Issued">Issued</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {newStatus === 'Paid' && (
                                    <>
                                        <div>
                                            <label className="text-slate-400 block mb-1">Payment Mode</label>
                                            <select
                                                value={paymentMode}
                                                onChange={(e) => setPaymentMode(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                            >
                                                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT / IMPS</option>
                                                <option value="UPI / QR">UPI / QR</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-slate-400 block mb-1">Payment Reference / UTR</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. UTR12345678"
                                                value={paymentRef}
                                                onChange={(e) => setPaymentRef(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-slate-400 block mb-1">Remarks / Note</label>
                                    <input
                                        type="text"
                                        placeholder="Optional internal remark"
                                        value={statusNotes}
                                        onChange={(e) => setStatusNotes(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowStatusModal(false)}
                                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invoice Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 text-xs"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-amber-400" />
                                        Invoice {selectedInvoice.invoiceNumber}
                                    </h3>
                                    <p className="text-slate-400 text-[11px] mt-0.5">
                                        Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')} | Ref: {selectedInvoice.bookingId || 'Direct'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => generateTaxInvoicePDF(selectedInvoice, selectedCompany)}
                                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 mt-4">
                                {/* Bill To Box */}
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1">Billed To</p>
                                    <p className="font-bold text-white text-sm">{selectedInvoice.billTo?.companyName || selectedInvoice.billTo?.name}</p>
                                    <p className="text-slate-400">Mobile: {selectedInvoice.billTo?.mobile} {selectedInvoice.billTo?.email && `| Email: ${selectedInvoice.billTo.email}`}</p>
                                    {selectedInvoice.billTo?.gstin && <p className="text-amber-400 font-mono mt-0.5">GSTIN: {selectedInvoice.billTo.gstin}</p>}
                                    {selectedInvoice.billTo?.address && <p className="text-slate-500 mt-0.5">{selectedInvoice.billTo.address}</p>}
                                </div>

                                {/* Items List */}
                                <div className="border border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-950 text-slate-400">
                                            <tr>
                                                <th className="py-2 px-3">Service Description</th>
                                                <th className="py-2 px-3 text-center">SAC</th>
                                                <th className="py-2 px-3 text-center">Qty</th>
                                                <th className="py-2 px-3 text-right">Rate</th>
                                                <th className="py-2 px-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {selectedInvoice.items?.map((item, i) => (
                                                <tr key={i}>
                                                    <td className="py-2 px-3 text-white">{item.description}</td>
                                                    <td className="py-2 px-3 text-center font-mono text-slate-400">{item.sacCode}</td>
                                                    <td className="py-2 px-3 text-center text-slate-300">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right text-slate-300">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                                                    <td className="py-2 px-3 text-right font-bold text-white">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Commercial Summary */}
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase">Taxable Value</p>
                                        <p className="font-bold text-white mt-1">₹{(selectedInvoice.taxableAmount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase">GST ({selectedInvoice.gstRate || 5}%)</p>
                                        <p className="font-bold text-amber-400 mt-1">₹{(selectedInvoice.totalTaxAmount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase">Total Amount</p>
                                        <p className="font-bold text-white mt-1">₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase">Balance Due</p>
                                        <p className="font-bold text-rose-400 mt-1">₹{(selectedInvoice.netPayable || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
