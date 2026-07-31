import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { User, Car, IndianRupee, Users, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

import Drivers from './Drivers';
import Reports from './Reports';
import DriverSalaries from './DriverSalaries';
import DriverPerformance from './DriverPerformance';

const Chip = ({ label, value, color }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
        <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: '18px', fontWeight: '950', color: color }}>{value}</span>
    </div>
);

const DriversPanel = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'drivers';
    const [salaryStats, setSalaryStats] = React.useState({ sdr: 0, nights: 0 });

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const navItems = [
        { id: 'drivers', title: 'DRIVERS', icon: User },
        // { id: 'dutys', title: 'DUTYS', icon: Car },
        { id: 'settlement', title: 'Salaries', icon: IndianRupee },
        { id: 'performance', title: 'Performance', icon: AlertCircle }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'drivers':
                return <Drivers isSubComponent={true} />;
            case 'dutys':
                return <Reports isSubComponent={true} />;
            case 'settlement':
                return <DriverSalaries isSubComponent={true} onStatsUpdate={setSalaryStats} />;
            case 'performance':
                return <DriverPerformance />;
            default:
                return null;
        }
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="Drivers Dashboard" description="Access driver profiles, duty logs, and salary settlements." />

            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Drivers <span className="text-gradient-yellow">Hub</span>
                        </h1>
                    </div>
                </div>

                {activeTab === 'settlement' && (
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <Chip label="TOTAL SDR" value={salaryStats.sdr} color="#10b981" />
                        <Chip label="TOTAL NIGHTS" value={salaryStats.nights} color="var(--primary)" />
                    </div>
                )}
            </header>

            {/* Selection Bar (Tab Switcher) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                width: 'fit-content',
                gap: '4px',
                marginBottom: '40px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === item.id ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                            color: activeTab === item.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '800',
                            fontSize: '12px',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <item.icon size={16} />
                        {item.title}
                    </button>
                ))}
            </div>

            {/* Dynamic Content Area */}
            <div>
                {renderContent()}
            </div>
        </div>
    );
};


export default DriversPanel;
