import React, { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Calendar, Car, Phone, Mail, FileText, Check, AlertCircle,
    Edit3, Trash2, ChevronRight, Layers, Tag, UserCheck, Shield
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCompany } from '../../context/CompanyContext';
import CorporateDateInput from './CorporateDateInput';
import axios from '../../api/axios';

const CorporateContractsTab = ({ selectedCompany: propCompany, onSelectContract, selectedContractId }) => {
    const { theme } = useTheme();
    const { selectedCompany: contextCompany } = useCompany();
    const selectedCompany = propCompany || contextCompany;
    const companyId = selectedCompany?._id || selectedCompany?.id || localStorage.getItem('companyId');

    const primaryColor = theme?.primary || '#fbbf24';
    const secondaryColor = theme?.secondary || '#f59e0b';
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        clientName: '',
        clientCode: '',
        contactPersonName: '',
        contactPersonPhone: '',
        contactPersonEmail: '',
        contactPersonDesignation: '',
        billingAddress: '',
        gstin: '',
        contractStartDate: new Date().toISOString().split('T')[0],
        contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        billingCycle: '1st to End of Month',
        contractedVehiclesCount: '',
        rateType: 'PerVehiclePerDay',
        regularAmount: '',
        includedHoursPerDay: '',
        includedKmPerDay: '',
        extraKmRate: '',
        extraHourRate: '',
        billingDaysPerMonth: '',
        status: 'Active',
        termsAndConditions: '',
        remarks: ''
    });

    const fetchContracts = async () => {
        if (!companyId) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`/api/corporate/contracts/${companyId}`);
            if (res.data?.success) {
                setContracts(res.data.data || []);
                // Auto-select first contract if none selected
                if (!selectedContractId && res.data.data.length > 0 && onSelectContract) {
                    onSelectContract(res.data.data[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching contracts:', err);
            setError(err.response?.data?.message || 'Failed to load corporate contracts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, [companyId]);

    const handleOpenCreate = () => {
        setEditingContract(null);
        setFormData({
            clientName: '',
            clientCode: '',
            contactPersonName: '',
            contactPersonPhone: '',
            contactPersonEmail: '',
            contactPersonDesignation: '',
            billingAddress: '',
            gstin: '',
            contractStartDate: new Date().toISOString().split('T')[0],
            contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            billingCycle: '1st to End of Month',
            contractedVehiclesCount: '',
            rateType: 'PerVehiclePerDay',
            regularAmount: '',
            includedHoursPerDay: '',
            includedKmPerDay: '',
            extraKmRate: '',
            extraHourRate: '',
            billingDaysPerMonth: '',
            status: 'Active',
            termsAndConditions: '',
            remarks: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (contract) => {
        setEditingContract(contract);
        setFormData({
            clientName: contract.clientName || '',
            clientCode: contract.clientCode || '',
            contactPersonName: contract.contactPerson?.name || '',
            contactPersonPhone: contract.contactPerson?.phone || '',
            contactPersonEmail: contract.contactPerson?.email || '',
            contactPersonDesignation: contract.contactPerson?.designation || '',
            billingAddress: contract.billingAddress || '',
            gstin: contract.gstin || '',
            contractStartDate: contract.contractStartDate ? new Date(contract.contractStartDate).toISOString().split('T')[0] : '',
            contractEndDate: contract.contractEndDate ? new Date(contract.contractEndDate).toISOString().split('T')[0] : '',
            billingCycle: contract.billingCycle || '1st to End of Month',
            contractedVehiclesCount: contract.contractedVehiclesCount ?? '',
            rateType: contract.regularRateConfig?.rateType || 'PerVehiclePerDay',
            regularAmount: contract.regularRateConfig?.amount ?? '',
            includedHoursPerDay: contract.regularRateConfig?.includedHoursPerDay ?? '',
            includedKmPerDay: contract.regularRateConfig?.includedKmPerDay ?? '',
            extraKmRate: contract.regularRateConfig?.extraKmRate ?? '',
            extraHourRate: contract.regularRateConfig?.extraHourRate ?? '',
            billingDaysPerMonth: contract.regularRateConfig?.billingDaysPerMonth ?? '',
            status: contract.status || 'Active',
            termsAndConditions: contract.termsAndConditions || '',
            remarks: contract.remarks || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                clientName: formData.clientName,
                clientCode: formData.clientCode,
                contactPerson: {
                    name: formData.contactPersonName,
                    phone: formData.contactPersonPhone,
                    email: formData.contactPersonEmail,
                    designation: formData.contactPersonDesignation
                },
                billingAddress: formData.billingAddress,
                gstin: formData.gstin,
                contractStartDate: formData.contractStartDate,
                contractEndDate: formData.contractEndDate,
                billingCycle: formData.billingCycle,
                contractedVehiclesCount: Number(formData.contractedVehiclesCount) || 0,
                regularRateConfig: {
                    rateType: formData.rateType || 'PerVehiclePerDay',
                    amount: Number(formData.regularAmount) || 0,
                    includedHoursPerDay: Number(formData.includedHoursPerDay) || 0,
                    includedKmPerDay: Number(formData.includedKmPerDay) || 0,
                    extraKmRate: Number(formData.extraKmRate) || 0,
                    extraHourRate: Number(formData.extraHourRate) || 0,
                    billingDaysPerMonth: Number(formData.billingDaysPerMonth) || 26
                },
                status: formData.status,
                termsAndConditions: formData.termsAndConditions,
                remarks: formData.remarks
            };

            if (editingContract) {
                await axios.put(`/api/corporate/contracts/single/${editingContract._id}`, payload);
            } else {
                await axios.post(`/api/corporate/contracts/${companyId}`, payload);
            }

            setShowModal(false);
            fetchContracts();
        } catch (err) {
            console.error('Error saving contract:', err);
            alert(err.response?.data?.message || 'Error saving corporate contract');
        }
    };

    const handleDelete = async (contractId, clientName) => {
        if (!window.confirm(`Are you sure you want to delete contract for ${clientName}?`)) return;
        try {
            await axios.delete(`/api/corporate/contracts/single/${contractId}`);
            fetchContracts();
        } catch (err) {
            console.error('Error deleting contract:', err);
            alert(err.response?.data?.message || 'Error deleting contract');
        }
    };

    return (
        <div>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
                        Corporate Client Contracts & Rate Cards
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Manage corporate tenders, contracted 20-vehicle fleets, agreed tariff, and on-call rate packages.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreate}
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        color: '#000000',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: `0 4px 15px ${primaryColor}40`
                    }}
                >
                    <Plus size={16} color="#000000" />
                    <span>Create Corporate Contract</span>
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Contracts List / Cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading corporate contracts...
                </div>
            ) : contracts.length === 0 ? (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '50px 20px',
                    textAlign: 'center'
                }}>
                    <Briefcase size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '16px' }}>No Corporate Contracts Yet</h4>
                    <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px' }}>
                        Create your first staff transportation contract to start tracking daily 20-vehicle deployment and on-call duty slips.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        style={{
                            background: primaryColor,
                            color: '#000000',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        + Create 1-Year Staff Contract
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                    {contracts.map(contract => {
                        const isSelected = selectedContractId === contract._id;
                        const reg = contract.regularRateConfig || {};
                        const sDate = contract.contractStartDate ? new Date(contract.contractStartDate).toLocaleDateString('en-GB') : '';
                        const eDate = contract.contractEndDate ? new Date(contract.contractEndDate).toLocaleDateString('en-GB') : '';

                        return (
                            <div
                                key={contract._id}
                                onClick={() => onSelectContract && onSelectContract(contract)}
                                style={{
                                    background: isSelected ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'rgba(255, 255, 255, 0.03)',
                                    border: isSelected ? `2px solid ${primaryColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    boxShadow: isSelected ? `0 10px 30px ${primaryColor}25` : 'none'
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: primaryColor, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {contract.clientCode || 'CORP'}
                                        </div>
                                        <h4 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>
                                            {contract.clientName}
                                        </h4>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: contract.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: contract.status === 'Active' ? '#4ade80' : '#f87171',
                                            border: `1px solid ${contract.status === 'Active' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                                        }}>
                                            {contract.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Key Contract Metrics Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>CONTRACTED FLEET</div>
                                        <div style={{ fontSize: '14px', fontWeight: '900', color: primaryColor }}>
                                            🚗 {contract.contractedVehiclesCount != null ? contract.contractedVehiclesCount : 0} Vehicles / Day
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>TENDER TARIFF</div>
                                        <div style={{ fontSize: '14px', fontWeight: '900', color: primaryColor }}>
                                            ₹{Number(reg.amount || 0).toLocaleString('en-IN')} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>/ day</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contract Dates & Inclusions */}
                                <div style={{ fontSize: '11.5px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={13} color="#94a3b8" />
                                        <span>{sDate} to {eDate} ({contract.billingCycle})</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Layers size={13} color="#94a3b8" />
                                        <span>Daily Inclusions: {reg.includedHoursPerDay ? `${reg.includedHoursPerDay} Hrs` : 'N/A'} / {reg.includedKmPerDay ? `${reg.includedKmPerDay} KM` : 'N/A'}</span>
                                    </div>

                                    {contract.contactPerson?.name && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <UserCheck size={13} color="#94a3b8" />
                                            <span>Contact: {contract.contactPerson.name} {contract.contactPerson.phone && `(${contract.contactPerson.phone})`}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Tag size={13} color="#94a3b8" />
                                        <span>On-call Rate Card: {contract.rateCard?.length || 6} duty types agreed</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelectContract) onSelectContract(contract);
                                        }}
                                        style={{
                                            background: isSelected ? primaryColor : `${primaryColor}20`,
                                            color: isSelected ? '#000000' : primaryColor,
                                            border: 'none',
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span>{isSelected ? 'Active Selection' : 'Manage Register & Duties'}</span>
                                        <ChevronRight size={14} />
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(contract);
                                            }}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: 'none',
                                                color: '#ffffff',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                            title="Edit Contract & Rates"
                                        >
                                            <Edit3 size={14} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(contract._id, contract.clientName);
                                            }}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: 'none',
                                                color: '#f87171',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                            title="Delete Contract"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE / EDIT CONTRACT MODAL */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '750px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
                                {editingContract ? 'Edit Corporate Contract & Rates' : 'Create New Corporate Contract (Tender)'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Client & Code */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                                        Corporate Client Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Tata Consultancy Services (TCS)"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                                        Client / Contract Code
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CORP-TCS-01"
                                        value={formData.clientCode}
                                        onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            {/* Contact Person & GSTIN */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="Rajesh Verma"
                                        value={formData.contactPersonName}
                                        onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Phone / Mobile</label>
                                    <input
                                        type="text"
                                        placeholder="+91 98765 43210"
                                        value={formData.contactPersonPhone}
                                        onChange={(e) => setFormData({ ...formData, contactPersonPhone: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>GSTIN</label>
                                    <input
                                        type="text"
                                        placeholder="08AAACL1234F1Z9"
                                        value={formData.gstin}
                                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            {/* Contract Dates & Vehicles Count */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <CorporateDateInput
                                        label="Start Date"
                                        required
                                        name="contractStartDate"
                                        value={formData.contractStartDate}
                                        onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <CorporateDateInput
                                        label="End Date"
                                        required
                                        name="contractEndDate"
                                        value={formData.contractEndDate}
                                        onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: primaryColor, display: 'block', marginBottom: '4px' }}>Daily Contracted Vehicles *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="e.g. 20"
                                        value={formData.contractedVehiclesCount}
                                        onChange={(e) => setFormData({ ...formData, contractedVehiclesCount: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${primaryColor}60`, borderRadius: '8px', color: primaryColor, fontSize: '14px', fontWeight: '800' }}
                                    />
                                </div>
                            </div>

                            {/* Regular Staff Deployment Tariff */}
                            <div style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}30`, padding: '14px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: primaryColor, marginBottom: '10px', textTransform: 'uppercase' }}>
                                    Regular Deployment Tariff & Inclusions {formData.contractedVehiclesCount ? `(${formData.contractedVehiclesCount} Vehicles)` : ''}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Agreed Day Rate (₹/day) *</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 2500"
                                            value={formData.regularAmount}
                                            onChange={(e) => setFormData({ ...formData, regularAmount: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px', fontWeight: '800' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Included Hours / Day</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 12"
                                            value={formData.includedHoursPerDay}
                                            onChange={(e) => setFormData({ ...formData, includedHoursPerDay: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Included KM / Day</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 100"
                                            value={formData.includedKmPerDay}
                                            onChange={(e) => setFormData({ ...formData, includedKmPerDay: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Extra KM Rate (₹/KM)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 14"
                                            value={formData.extraKmRate}
                                            onChange={(e) => setFormData({ ...formData, extraKmRate: e.target.value })}
                                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Address */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                                <textarea
                                    rows="2"
                                    placeholder="Complete corporate office address for billing..."
                                    value={formData.billingAddress}
                                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', background: primaryColor, border: 'none', color: '#000000', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    {editingContract ? 'Update Contract' : 'Create Contract'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorporateContractsTab;
