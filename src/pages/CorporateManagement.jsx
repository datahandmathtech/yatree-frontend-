import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Briefcase, Calendar, FileText, CheckCircle2, Building, ShieldCheck,
    Layers, Plus, RefreshCw, Car, ChevronRight, BarChart3
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';

import CorporateContractsTab from '../components/corporate/CorporateContractsTab';
import CorporateRegisterTab from '../components/corporate/CorporateRegisterTab';
import CorporateDutySlipsTab from '../components/corporate/CorporateDutySlipsTab';
import CorporateStatementTab from '../components/corporate/CorporateStatementTab';

const CorporateManagement = ({ initialTab = 'contracts' }) => {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const primaryColor = theme?.primary || '#fbbf24';
    const secondaryColor = theme?.secondary || '#f59e0b';

    // Determine active tab from prop or route or URL search params
    const getTabFromLocation = () => {
        const path = location.pathname;
        if (path.includes('corporate-register')) return 'register';
        if (path.includes('corporate-duty-slips')) return 'duty-slips';
        if (path.includes('corporate-monthly-statement')) return 'statement';
        if (path.includes('corporate-contracts')) return 'contracts';

        const params = new URLSearchParams(location.search);
        const t = params.get('tab');
        if (t && ['contracts', 'register', 'duty-slips', 'statement'].includes(t)) {
            return t;
        }
        return initialTab;
    };

    const [activeTab, setActiveTab] = useState(getTabFromLocation());
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [loadingContracts, setLoadingContracts] = useState(false);

    const companyId = selectedCompany?._id || selectedCompany?.id;

    // Fetch contracts for company
    const fetchContracts = async () => {
        if (!companyId) return;
        setLoadingContracts(true);
        try {
            const res = await axios.get(`/api/corporate/contracts/${companyId}`);
            if (res.data?.success) {
                const list = res.data.data || [];
                setContracts(list);
                if (list.length > 0 && !selectedContract) {
                    setSelectedContract(list[0]);
                }
            }
        } catch (err) {
            console.error('Error loading contracts in corporate master:', err);
        } finally {
            setLoadingContracts(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, [companyId]);

    // Keep activeTab in sync with route navigation
    useEffect(() => {
        setActiveTab(getTabFromLocation());
    }, [location.pathname, location.search]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/admin/corporate?tab=${tabId}`);
    };

    const tabs = [
        {
            id: 'contracts',
            label: 'Contracts & Rate Cards',
            icon: Briefcase,
            badge: contracts.length > 0 ? `${contracts.length}` : null
        },
        {
            id: 'register',
            label: 'Daily Transport Register',
            icon: Calendar,
            badge: selectedContract ? `${selectedContract.contractedVehiclesCount || 20} Cars` : null
        },
        {
            id: 'duty-slips',
            label: 'On-call Requests / Duty Slips',
            icon: FileText
        },
        {
            id: 'statement',
            label: 'Monthly Bill Reconciliation',
            icon: BarChart3
        }
    ];

    return (
        <div style={{
            padding: '24px',
            color: '#ffffff',
            maxWidth: '1600px',
            margin: '0 auto',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            {/* Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #091325 0%, #0d1e3d 50%, #081120 100%)',
                border: `1px solid ${primaryColor}40`,
                borderRadius: '20px',
                padding: '24px 28px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '14px',
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 8px 20px ${primaryColor}40`
                    }}>
                        <Building size={28} color="#000000" />
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '950', letterSpacing: '-0.5px' }}>
                                Corporate Contract & Duty Management
                            </h1>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: `${primaryColor}20`,
                                color: primaryColor,
                                border: `1px solid ${primaryColor}50`
                            }}>
                                PHASE 1 ENTERPRISE
                            </span>
                        </div>

                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                            Staff transportation contracts (e.g. 20-vehicle daily deployment), on-call duty slips, meter logs, and verifiable monthly billing.
                        </p>
                    </div>
                </div>

                {/* Active Contract Quick Status Pill */}
                {selectedContract && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${primaryColor}30`,
                        padding: '10px 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                                CURRENT SELECTED CLIENT
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>
                                {selectedContract.clientName}
                            </div>
                        </div>

                        <div style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: `${primaryColor}20`,
                            color: primaryColor,
                            fontSize: '11px',
                            fontWeight: '800'
                        }}>
                            🚗 {selectedContract.contractedVehiclesCount || 20} Daily Cars
                        </div>
                    </div>
                )}
            </div>

            {/* TAB BAR NAVIGATION */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '14px',
                marginBottom: '24px',
                overflowX: 'auto'
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isActive ? primaryColor : 'rgba(255, 255, 255, 0.03)',
                                color: isActive ? '#000000' : '#94a3b8',
                                fontWeight: isActive ? '800' : '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? `0 4px 15px ${primaryColor}40` : 'none',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: isActive ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                                    color: isActive ? '#000000' : '#cbd5e1'
                                }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENTS */}
            <div>
                {activeTab === 'contracts' && (
                    <CorporateContractsTab
                        selectedCompany={selectedCompany}
                        contracts={contracts}
                        selectedContractId={selectedContract?._id}
                        onSelectContract={(c) => {
                            setSelectedContract(c);
                            // Switch to register tab for intuitive flow
                            handleTabChange('register');
                        }}
                    />
                )}

                {activeTab === 'register' && (
                    <CorporateRegisterTab
                        contract={selectedContract}
                        contracts={contracts}
                        onSelectContract={(c) => setSelectedContract(c)}
                    />
                )}

                {activeTab === 'duty-slips' && (
                    <CorporateDutySlipsTab
                        contract={selectedContract}
                        contracts={contracts}
                        onSelectContract={(c) => setSelectedContract(c)}
                    />
                )}

                {activeTab === 'statement' && (
                    <CorporateStatementTab
                        contract={selectedContract}
                        contracts={contracts}
                        onSelectContract={(c) => setSelectedContract(c)}
                    />
                )}
            </div>
        </div>
    );
};

export default CorporateManagement;
