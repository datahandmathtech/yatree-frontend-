import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Calendar,
    Car,
    User,
    Droplets,
    Wrench,
    MapPin,
    Search,
    FileSpreadsheet,
    ChevronRight,
    ChevronLeft,
    ArrowUpDown,
    Info,
    History,
    Zap,
    Layers,
    CarFrontIcon,
    TrendingUp,
    TrendingDown,
    Wallet,
    DollarSign,
    Fuel
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import {
    todayIST,
    toISTDateString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';

const VehicleMonthlyDetails = () => {
    const location = useLocation();
    const { selectedCompany } = useCompany();
    const [month, setMonth] = useState(new Date().getMonth() < 3 ? 'All' : new Date().getMonth() + 1); // Default to 'All' if entering from previous year context or specific month
    const [year, setYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ totalSalary: 0, staffSalary: 0, freelancerSalary: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleFilter, setVehicleFilter] = useState('All');
    const [driverFilter, setDriverFilter] = useState('All');
    const [driverList, setDriverList] = useState([]);

    useEffect(() => {
        if (selectedCompany) {
            fetchData();
        }
    }, [selectedCompany, month, year]);

    useEffect(() => {
        // Auto-Reset when navigating to this page - FY Aware
        const now = new Date();
        const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
        setMonth(now.getMonth() + 1);
        setYear(fyYear);
        setSearchQuery('');
        setVehicleFilter('All');
        setDriverFilter('All');
        setSelectedVehicle(null);
    }, [location.pathname, location.key]);

    const shiftMonth = (amount) => {
        if (month === 'All') {
            setYear(prev => prev + amount);
            return;
        }
        let newMonth = month + amount;
        let newYear = year;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setMonth(newMonth);
        setYear(newYear);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data: res } = await axios.get(`/api/admin/vehicle-monthly-details/${selectedCompany._id}?month=${month}&year=${year}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const vData = res.vehicles || [];
            setData(vData);
            setSummary(res.summary || { totalSalary: 0, staffSalary: 0, freelancerSalary: 0 });

            // Extract unique drivers from all vehicles
            const allDriversList = new Set();
            vData.forEach(v => {
                v.drivers?.forEach(d => allDriversList.add(d));
            });
            setDriverList(Array.from(allDriversList).sort());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const sortedData = [...data].sort((a, b) => a.carNumber.localeCompare(b.carNumber));

    const filteredData = sortedData.filter(v => {
        const matchesSearch = v.carNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.model.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVehicle = vehicleFilter === 'All' || v.carNumber === vehicleFilter;
        const matchesDriver = driverFilter === 'All' || (v.drivers && v.drivers.includes(driverFilter));
        return matchesSearch && matchesVehicle && matchesDriver;
    }).map(v => {
        // If a specific driver is selected, adjust the displayed salary to only show that driver's salary
        if (driverFilter !== 'All' && v.driverBreakdown) {
            const specificDriverData = v.driverBreakdown.find(d => d.name === driverFilter);
            return {
                ...v,
                driverSalary: specificDriverData ? specificDriverData.salary : 0,
                drivers: [driverFilter] // Explicitly show only the selected driver
            };
        }
        return v;
    });

    // Summary Calculations
    const totalFuelAmount = filteredData.reduce((sum, v) => sum + (v.fuel?.totalAmount || 0), 0);
    const totalDriverSalary = filteredData.reduce((sum, v) => sum + (v.driverSalary || 0), 0);
    
    // Process "Other" maintenance and Combined Services + DRS Earnings / Net Profit
    const processedData = filteredData.map(v => {
        // Standardized Operational Service Regex
        const operationalRegex = /wash|washing|cleaning|tissue|water|mask|sanitizer|kapda|punc|puncture|puncher|parking/i;
        
        // 1. Separate Operational Services from the Maintenance list
        const maintRecs = (v.maintenance?.records || []);
        const mechanicalRecs = maintRecs.filter(r => {
            const search = `${r.type || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
            return !operationalRegex.test(search);
        });

        // 2. Identify "Misc. Repairs" (Other category within mechanical)
        const otherRecords = mechanicalRecs.filter(r => 
            (r.type || '').toLowerCase().includes('other') || 
            (r.category || '').toLowerCase().includes('other')
        );
        const otherAmount = otherRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

        // 3. Identification of "Mechanical Maintenance" (Mechanical minus Other)
        const baseMaintAmount = mechanicalRecs.reduce((sum, r) => sum + (r.amount || 0), 0) - otherAmount;

        // 4. Combined Operational Cost: (Services from driver app) + (Operational items from maintenance) + (BorderTax/Fastag/Parking)
        const maintOpsAmount = maintRecs.filter(r => {
            const search = `${r.type || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
            return operationalRegex.test(search);
        }).reduce((sum, r) => sum + (r.amount || 0), 0);

        const combinedServiceAmount = (v.services?.wash?.amount || 0) + 
                                    (v.services?.puncture?.amount || 0) + 
                                    (v.fastag?.totalAmount || 0) + 
                                    (v.borderTax?.totalAmount || 0) + 
                                    (v.parking?.totalAmount || 0) + 
                                    maintOpsAmount;

        const carEarnings = Number(v.totalEarnings || 0);
        const carTotalExpense = (v.driverSalary || 0) + (v.fuel?.totalAmount || 0) + (baseMaintAmount || 0) + (otherAmount || 0) + (combinedServiceAmount || 0);
        const carNetProfit = carEarnings - carTotalExpense;
        const profitMargin = carEarnings > 0 ? Number(((carNetProfit / carEarnings) * 100).toFixed(1)) : 0;

        return {
            ...v,
            otherAmount,
            baseMaintAmount,
            combinedServiceAmount,
            otherRecords,
            mechanicalRecs,
            carEarnings,
            carTotalExpense,
            carNetProfit,
            profitMargin
        };
    });

    const totalServiceAmount = processedData.reduce((sum, v) => sum + v.combinedServiceAmount, 0);
    const totalMaintAmount = processedData.reduce((sum, v) => sum + v.baseMaintAmount, 0);
    const totalMiscAmount = processedData.reduce((sum, v) => sum + v.otherAmount, 0);
    const totalFastagAmount = filteredData.reduce((sum, v) => sum + (v.fastag?.totalAmount || 0), 0);
    const totalBorderTaxAmount = filteredData.reduce((sum, v) => sum + (v.borderTax?.totalAmount || 0), 0);
    const totalParking = filteredData.reduce((sum, v) => sum + (v.parking?.totalAmount || 0), 0);

    // Fleet Totals: Earnings, Expenses & Net Profit
    const totalFleetEarnings = processedData.reduce((sum, v) => sum + (v.carEarnings || 0), 0);
    const grandTotalExpense = totalFuelAmount + totalDriverSalary + totalMaintAmount + totalMiscAmount + totalServiceAmount;
    const totalFleetNetProfit = totalFleetEarnings - grandTotalExpense;
    const fleetNetMargin = totalFleetEarnings > 0 ? Number(((totalFleetNetProfit / totalFleetEarnings) * 100).toFixed(1)) : 0;

    const downloadExcel = () => {
        const exportData = processedData.map(v => ({
            'Vehicle Number': v.carNumber,
            'Model': v.model,
            'Drivers': v.drivers?.join(', ') || 'Unassigned',
            'Trips Completed': v.dutyCount || 0,
            'Days Booked': v.bookedDays || 0,
            'Total Earnings / Sale (₹)': v.carEarnings || 0,
            'Total Distance (KM)': v.totalDistance || 0,
            'Fuel Volume (L)': (v.fuel?.totalQuantity || 0).toFixed(2),
            'Average KM/L': (v.fuel?.avgMileage || 0).toFixed(2),
            'Fuel Amount (₹)': v.fuel?.totalAmount || 0,
            'Misc. Repairs (₹)': v.otherAmount || 0,
            'Wash / Fastag / Tax / Parking (₹)': v.combinedServiceAmount,
            'Mechanical Maintenance (₹)': v.baseMaintAmount || 0,
            'Driver Salary (₹)': v.driverSalary || 0,
            'Total Month Expense (₹)': v.carTotalExpense,
            'Net Profit / Loss (₹)': v.carNetProfit,
            'Profit Margin (%)': `${v.profitMargin}%`
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Car Logs & PnL');
        XLSX.writeFile(wb, `Car_Logs_Profit_Loss_${month}_${year}.xlsx`);
    };

    const SummaryCard = ({ icon: Icon, label, value, color, subValue, displayOverride }) => (
        <div style={{
            background: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minWidth: '200px'
        }}>
            <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '22px', color: 'white', fontWeight: '950' }}>
                    {displayOverride ? displayOverride : `₹${(value || 0).toLocaleString()}`}
                </div>
                {subValue ? (
                    <div style={{ fontSize: '11px', color: color, fontWeight: '800', marginTop: '3px' }}>{subValue}</div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', marginTop: '3px' }}>Operational Expense</div>
                )}
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${color}18`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: color, border: `1px solid ${color}30`, flexShrink: 0 }}>
                <Icon size={20} />
            </div>
        </div>
    );

    return (
        <div style={{ padding: 'clamp(15px, 4vw, 40px)', background: 'radial-gradient(circle at top right, #1e293b, #0f172a)', minHeight: '100vh' }}>
            <SEO title="Car Logs" description="Track monthly fuel, maintenance and driver history for each vehicle." />
            <header style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, var(--primary), var(--primary))', borderRadius: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 25px rgba(14, 165, 233, 0.3)' }}>
                            <Calendar size={30} color="white" />
                        </div>
                        <div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: '950', margin: 0, letterSpacing: '-1.5px' }}>
                                Fleet <span style={{ color: 'var(--primary)' }}>Car Logs</span>
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, fontWeight: '600' }}>Driver history and operational cost breakdown</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => shiftMonth(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={18} /></button>
                            
                            <select 
                                value={month} 
                                onChange={(e) => setMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))} 
                                style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px 4px', fontWeight: '900', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="All" style={{ background: '#1e293b' }}>Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#1e293b' }}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>

                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '16px' }}></div>

                            <select 
                                value={year} 
                                onChange={(e) => setYear(Number(e.target.value))} 
                                style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px 4px', fontWeight: '900', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                            >
                                {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => (
                                    <option key={y} value={y} style={{ background: '#1e293b' }}>FY {y}-{y + 1}</option>
                                ))}
                            </select>

                            <button onClick={() => shiftMonth(1)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}><ChevronRight size={18} /></button>
                        </div>
                        <button onClick={downloadExcel} style={{ background: '#10b981', color: 'white', border: 'none', height: '45px', padding: '0 20px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}>
                            <FileSpreadsheet size={16} /> EXPORT EXCEL
                        </button>
                    </div>
                </div>

                {/* Primary PnL Executive Summary (Row 1: 3 cards) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    {/* Total Fleet Revenue */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '20px',
                        padding: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Total Fleet Revenue</div>
                            <div style={{ fontSize: '26px', color: 'white', fontWeight: '950' }}>₹{totalFleetEarnings.toLocaleString()}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', fontWeight: '700' }}>
                                {filteredData.reduce((sum, v) => sum + (v.dutyCount || 0), 0)} Completed Trips
                            </div>
                        </div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.3)', flexShrink: 0 }}>
                            <TrendingUp size={24} color="#10b981" />
                        </div>
                    </div>

                    {/* Total Operating Expenses */}
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '20px',
                        padding: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Total Fleet Expenses</div>
                            <div style={{ fontSize: '26px', color: 'white', fontWeight: '950' }}>₹{grandTotalExpense.toLocaleString()}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', fontWeight: '700' }}>
                                Fuel, Wages, Maintenance & Ops
                            </div>
                        </div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', flexShrink: 0 }}>
                            <TrendingDown size={24} color="#ef4444" />
                        </div>
                    </div>

                    {/* Fleet Net Profit / Loss */}
                    <div style={{
                        background: totalFleetNetProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${totalFleetNetProfit >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                        borderRadius: '20px',
                        padding: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: totalFleetNetProfit >= 0 ? '#34d399' : '#f87171', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                Fleet Net {totalFleetNetProfit >= 0 ? 'Profit' : 'Loss'}
                            </div>
                            <div style={{ fontSize: '26px', color: totalFleetNetProfit >= 0 ? '#34d399' : '#f87171', fontWeight: '950' }}>
                                {totalFleetNetProfit >= 0 ? `+₹${totalFleetNetProfit.toLocaleString()}` : `-₹${Math.abs(totalFleetNetProfit).toLocaleString()}`}
                            </div>
                            <div style={{ fontSize: '12px', color: totalFleetNetProfit >= 0 ? '#34d399' : '#f87171', marginTop: '4px', fontWeight: '800' }}>
                                {fleetNetMargin}% Net Margin
                            </div>
                        </div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: totalFleetNetProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${totalFleetNetProfit >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, flexShrink: 0 }}>
                            <Wallet size={24} color={totalFleetNetProfit >= 0 ? '#34d399' : '#f87171'} />
                        </div>
                    </div>
                </div>

                {/* Expense Breakdown Categories (Row 2: 4 cards) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                    <SummaryCard
                        icon={User}
                        label="Driver Salaries"
                        value={totalDriverSalary}
                        color="#a855f7"
                        subValue={`${[...new Set(processedData.flatMap(v => v.drivers || []))].length} Drivers`}
                    />
                    <SummaryCard
                        icon={Droplets}
                        label="Monthly Fuel"
                        value={totalFuelAmount}
                        color="#38bdf8"
                        subValue={`${filteredData.reduce((sum, v) => sum + (v.fuel?.totalQuantity || 0), 0).toFixed(1)}L Consumed`}
                    />
                    <SummaryCard
                        icon={Wrench}
                        label="Repairs & Maint."
                        value={totalMaintAmount + totalMiscAmount}
                        color="#f59e0b"
                        subValue="Mechanical & Repairs"
                    />
                    <SummaryCard
                        icon={Layers}
                        label="Wash / Tax / Fastag"
                        value={totalServiceAmount}
                        color="#818cf8"
                        subValue="Tolls, Taxes & Operations"
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
                        <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search vehicle number or model..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 15px 14px 45px',
                                background: 'rgba(30,30,40,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative', width: '220px' }}>
                        <Car style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={18} />
                        <select
                            value={vehicleFilter}
                            onChange={(e) => setVehicleFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 15px 14px 45px',
                                background: 'rgba(30,30,40,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                outline: 'none',
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#1e293b' }}>All Vehicles</option>
                            {[...new Set(data.map(v => v.carNumber))].sort().map(num => (
                                <option key={num} value={num} style={{ background: '#1e293b' }}>{num}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '0', background: 'rgba(30,30,40,0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(0,0,0,0.15)' }}>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                                <th style={{ padding: '20px 20px', color: '#10b981', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver Salary</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Fuel & Avg</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Maintenance</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Misc. Repairs</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Wash / Fastag / Tax</th>
                                <th style={{ padding: '20px 20px', color: '#f87171', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Expenses</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Profit / Loss</th>
                                <th style={{ padding: '20px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Audit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '100px', color: 'white', fontWeight: '800' }}>Aggregating monthly reports...</td></tr>
                            ) : processedData.length === 0 ? (
                                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '100px', color: 'rgba(255,255,255,0.2)', fontWeight: '800' }}>No records found for this period.</td></tr>
                            ) : (
                                processedData.map((v, idx) => (
                                    <motion.tr
                                        key={v.vehicleId || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                        whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        {/* Vehicle */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: 'white', fontWeight: '900', fontSize: '15px', letterSpacing: '-0.5px' }}>{v.carNumber}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '700' }}>{v.model || 'Commercial'}</div>
                                        </td>

                                        {/* Total Revenue */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={16} color="#10b981" />
                                                <div style={{ color: '#10b981', fontWeight: '950', fontSize: '16px' }}>
                                                    ₹{(v.carEarnings || 0).toLocaleString()}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '6px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '6px', fontWeight: '800' }}>
                                                    {v.dutyCount || 0} Trips
                                                </span>
                                                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', fontWeight: '800' }}>
                                                    {v.bookedDays || 0} Days
                                                </span>
                                            </div>
                                            {v.duties && v.duties.length > 0 ? (
                                                <div style={{ marginTop: '8px' }}>
                                                    <select
                                                        value=""
                                                        onChange={() => { }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '100%',
                                                            maxWidth: '190px',
                                                            padding: '5px 8px',
                                                            background: 'rgba(16, 185, 129, 0.08)',
                                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                                            borderRadius: '8px',
                                                            color: '#34d399',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            outline: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="" hidden>{v.duties.length} Trips Details</option>
                                                        {v.duties.map((d, i) => (
                                                            <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>
                                                                {formatDateIST(d.date)} - {d.clientName || 'Trip'} - ₹{(d.revenue || 0).toLocaleString()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: '700', marginTop: '6px' }}>No Trips Logged</div>
                                            )}
                                        </td>

                                        {/* Driver Salary */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: '#a855f7', fontWeight: '900', fontSize: '15px' }}>₹{(v.driverSalary || 0).toLocaleString()}</div>
                                            <div style={{ marginTop: '8px' }}>
                                                {v.drivers?.length > 0 ? (
                                                    <select
                                                        value=""
                                                        onChange={() => { }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '100%',
                                                            maxWidth: '170px',
                                                            padding: '5px 8px',
                                                            background: 'rgba(168, 85, 247, 0.08)',
                                                            border: '1px solid rgba(168, 85, 247, 0.2)',
                                                            borderRadius: '8px',
                                                            color: '#e9d5ff',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <option value="" hidden>{v.drivers.length} Driver{v.drivers.length > 1 ? 's' : ''}</option>
                                                        {v.driverBreakdown && v.driverBreakdown.length > 0 ? (
                                                            v.driverBreakdown.map((db, i) => (
                                                                <option key={i} value={db.name} style={{ background: '#0f172a', color: 'white' }}>
                                                                    {db.name} - ₹{db.salary.toLocaleString()}
                                                                </option>
                                                            ))
                                                        ) : (
                                                            v.drivers.map((d, i) => (
                                                                <option key={i} value={d} style={{ background: '#0f172a', color: 'white' }}>
                                                                    {d}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', fontWeight: '700' }}>Unassigned</span>}
                                            </div>
                                        </td>

                                        {/* Fuel & Avg */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '15px' }}>₹{(v.fuel?.totalAmount || 0).toLocaleString()}</div>
                                                <div style={{ color: '#10b981', fontSize: '10px', fontWeight: '900', background: 'rgba(16,185,129,0.12)', padding: '2px 5px', borderRadius: '5px', border: '1px solid rgba(16,185,129,0.1)' }}>{(v.fuel?.totalQuantity || 0).toFixed(1)} L</div>
                                            </div>
                                            <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>Avg: {(v.fuel?.avgMileage || 0).toFixed(2)} km/L</div>
                                            {v.fuel?.records?.length > 0 ? (
                                                <select value="" onChange={() => { }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '140px', padding: '5px 8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '11px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}>
                                                    <option value="" hidden>{v.fuel.records.length} Fills</option>
                                                    {v.fuel.records.map((f, i) => (
                                                        <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>
                                                            {formatDateIST(f.date)} - {f.quantity.toFixed(1)}L - ₹{f.amount.toLocaleString()}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', fontWeight: '700' }}>No Records</span>}
                                        </td>

                                        {/* Maintenance */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '15px' }}>₹{(v.baseMaintAmount || 0).toLocaleString()}</div>
                                            <div style={{ marginTop: '6px' }}>
                                                {v.mechanicalRecs?.filter(r => !(v.otherRecords || []).includes(r)).length > 0 ? (
                                                    <select value="" onChange={() => { }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '160px', padding: '5px 8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', color: '#fcd34d', fontSize: '11px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}>
                                                        <option value="" hidden>View Jobs</option>
                                                        {v.mechanicalRecs.filter(r => !(v.otherRecords || []).includes(r)).map((m, i) => (
                                                            <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>{formatDateIST(m.date)} - {m.category || 'Repair'} - ₹{m.amount.toLocaleString()}</option>
                                                        ))}
                                                    </select>
                                                ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', fontWeight: '700' }}>No Logs</span>}
                                            </div>
                                        </td>

                                        {/* Misc Repairs */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: '#ec4899', fontWeight: '900', fontSize: '15px' }}>₹{(v.otherAmount || 0).toLocaleString()}</div>
                                            <div style={{ marginTop: '6px' }}>
                                                {v.otherRecords?.length > 0 ? (
                                                    <select value="" onChange={() => { }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '160px', padding: '5px 8px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '8px', color: '#f9a8d4', fontSize: '11px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}>
                                                        <option value="" hidden>{v.otherRecords.length} Logs</option>
                                                        {v.otherRecords.map((p, i) => (
                                                            <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>
                                                                {formatDateIST(p.date || p.billDate)} - {p.category || 'Misc'} - ₹{p.amount.toLocaleString()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', fontWeight: '700' }}>No Logs</span>}
                                            </div>
                                        </td>

                                        {/* Wash / Fastag / Tax */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: '#818cf8', fontWeight: '900', fontSize: '15px' }}>₹{(v.combinedServiceAmount || 0).toLocaleString()}</div>
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                {((v.services?.wash?.amount || 0) > 0) && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', borderRadius: '4px', fontWeight: '800' }}>WASH</span>}
                                                {(v.fastag?.totalAmount > 0) && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '4px', fontWeight: '800' }}>FASTAG</span>}
                                                {(v.borderTax?.totalAmount > 0) && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontWeight: '800' }}>TAX</span>}
                                            </div>
                                            <select value="" onChange={() => { }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '160px', padding: '5px 8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', color: '#818cf8', fontSize: '11px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}>
                                                <option value="" hidden>Breakdown</option>
                                                <option value="wash" style={{ background: '#0f172a', color: 'white' }}>Wash/Ops: ₹{((v.services?.wash?.amount || 0) + (v.services?.puncture?.amount || 0) + (v.maintOpsAmount || 0)).toLocaleString()}</option>
                                                <option value="fastag" style={{ background: '#0f172a', color: 'white' }}>Fastag: ₹{(v.fastag?.totalAmount || 0).toLocaleString()}</option>
                                                <option value="tax" style={{ background: '#0f172a', color: 'white' }}>Border Tax: ₹{(v.borderTax?.totalAmount || 0).toLocaleString()}</option>
                                                <option value="parking" style={{ background: '#0f172a', color: 'white' }}>Parking: ₹{(v.parking?.totalAmount || 0).toLocaleString()}</option>
                                            </select>
                                        </td>

                                        {/* Total Operating Expenses */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{ color: '#f87171', fontWeight: '950', fontSize: '16px', letterSpacing: '-0.5px' }}>
                                                ₹{(v.carTotalExpense || 0).toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', marginTop: '4px' }}>
                                                All Ops & Wages
                                            </div>
                                        </td>

                                        {/* Net Profit / Loss */}
                                        <td style={{ padding: '18px 20px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '10px',
                                                background: v.carNetProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                border: `1px solid ${v.carNetProfit >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                                            }}>
                                                {v.carNetProfit >= 0 ? (
                                                    <TrendingUp size={14} color="#34d399" />
                                                ) : (
                                                    <TrendingDown size={14} color="#f87171" />
                                                )}
                                                <span style={{
                                                    color: v.carNetProfit >= 0 ? '#34d399' : '#f87171',
                                                    fontWeight: '950',
                                                    fontSize: '15px'
                                                }}>
                                                    {v.carNetProfit >= 0 ? '+' : ''}₹{v.carNetProfit.toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: v.carNetProfit >= 0 ? '#10b981' : '#f87171',
                                                fontWeight: '800',
                                                marginTop: '4px'
                                            }}>
                                                {v.profitMargin}% {v.carNetProfit >= 0 ? 'Margin' : 'Loss'}
                                            </div>
                                        </td>

                                        {/* Audit Button */}
                                        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => setSelectedVehicle(v)}
                                                style={{
                                                    background: 'rgba(14, 165, 233, 0.12)',
                                                    color: 'var(--primary)',
                                                    border: '1px solid rgba(14, 165, 233, 0.25)',
                                                    padding: '8px 14px',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '900',
                                                    transition: 'all 0.2s',
                                                    letterSpacing: '0.5px'
                                                }}
                                                className="btn-hover-glow"
                                            >
                                                VIEW AUDIT
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Repair & Earnings Details Audit Modal */}
            <AnimatePresence>
                {selectedVehicle && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ width: '100%', maxWidth: '1050px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '32px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', overflowX: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '52px', height: '52px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(14, 165, 233, 0.2)' }}><Car size={26} /></div>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '950', margin: 0, letterSpacing: '-0.5px' }}>
                                            {selectedVehicle.carNumber} <span style={{ color: 'var(--primary)' }}>PnL & Logs Audit</span>
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, fontWeight: '700' }}>
                                            {selectedVehicle.model || 'Commercial'} • {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedVehicle(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', padding: '10px 22px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>CLOSE</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                {/* 4 PnL Overview Cards */}
                                <div style={{ marginBottom: '35px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                    {/* Revenue Card */}
                                    <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '900', textTransform: 'uppercase' }}>Total Revenue</span>
                                            <TrendingUp size={18} color="#34d399" />
                                        </div>
                                        <div style={{ fontSize: '26px', color: '#10b981', fontWeight: '950' }}>₹{(selectedVehicle.carEarnings || 0).toLocaleString()}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '700' }}>{selectedVehicle.dutyCount || 0} Trips • {selectedVehicle.bookedDays || 0} Days Booked</div>
                                    </div>

                                    {/* Operating Expense Card */}
                                    <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '900', textTransform: 'uppercase' }}>Total Operating Expenses</span>
                                            <DollarSign size={18} color="#f87171" />
                                        </div>
                                        <div style={{ fontSize: '26px', color: '#f87171', fontWeight: '950' }}>₹{(selectedVehicle.carTotalExpense || 0).toLocaleString()}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '700' }}>Driver, Fuel, Maint, Ops</div>
                                    </div>

                                    {/* Net Profit Card */}
                                    <div style={{
                                        padding: '20px',
                                        background: selectedVehicle.carNetProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '20px',
                                        border: `1px solid ${selectedVehicle.carNetProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: selectedVehicle.carNetProfit >= 0 ? '#34d399' : '#f87171', fontWeight: '900', textTransform: 'uppercase' }}>Net Profit / Loss</span>
                                            {selectedVehicle.carNetProfit >= 0 ? <TrendingUp size={18} color="#34d399" /> : <TrendingDown size={18} color="#f87171" />}
                                        </div>
                                        <div style={{ fontSize: '26px', color: selectedVehicle.carNetProfit >= 0 ? '#34d399' : '#f87171', fontWeight: '950' }}>
                                            {selectedVehicle.carNetProfit >= 0 ? '+' : ''}₹{selectedVehicle.carNetProfit.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '12px', color: selectedVehicle.carNetProfit >= 0 ? '#34d399' : '#f87171', marginTop: '4px', fontWeight: '800' }}>
                                            {selectedVehicle.profitMargin}% Net Margin
                                        </div>
                                    </div>

                                    {/* Fuel & Mileage */}
                                    <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '900', textTransform: 'uppercase' }}>Fuel & Mileage</span>
                                            <Fuel size={18} color="#60a5fa" />
                                        </div>
                                        <div style={{ fontSize: '26px', color: 'white', fontWeight: '950' }}>₹{(selectedVehicle.fuel?.totalAmount || 0).toLocaleString()}</div>
                                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '800', marginTop: '4px' }}>
                                            {(selectedVehicle.fuel?.totalQuantity || 0).toFixed(1)}L • {(selectedVehicle.fuel?.avgMileage || 0).toFixed(2)} KM/L
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Breakdowns Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                                    {/* Column 1: Completed Trips & Revenue */}
                                    <div>
                                        <h3 style={{ fontSize: '13px', color: '#34d399', fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '4px', height: '14px', background: '#10b981', borderRadius: '2px' }}></div>
                                            Completed Trips & Revenue ({selectedVehicle.duties?.length || 0})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                                            {selectedVehicle.duties && selectedVehicle.duties.length > 0 ? (
                                                selectedVehicle.duties.map((d, i) => (
                                                    <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{d.clientName || 'Direct Booking'}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px' }}>
                                                                {formatDateIST(d.date)} {d.duty ? `• ${d.duty}` : ''} {d.driverName ? `• Driver: ${d.driverName}` : ''}
                                                            </div>
                                                        </div>
                                                        <div style={{ color: '#10b981', fontWeight: '950', fontSize: '15px' }}>
                                                            +₹{(d.revenue || 0).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No duties recorded for this car.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Column 2: Driver Contributions & Operations */}
                                    <div>
                                        <h3 style={{ fontSize: '13px', color: '#a855f7', fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '4px', height: '14px', background: '#a855f7', borderRadius: '2px' }}></div>
                                            Driver & Operations
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {selectedVehicle.driverBreakdown && selectedVehicle.driverBreakdown.length > 0 ? (
                                                selectedVehicle.driverBreakdown.map((db, i) => (
                                                    <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontWeight: '900' }}>{db.name.charAt(0)}</div>
                                                            <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>{db.name}</span>
                                                        </div>
                                                        <span style={{ color: '#a855f7', fontWeight: '900', fontSize: '14px' }}>₹{db.salary.toLocaleString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontStyle: 'italic', padding: '10px' }}>No driver wages recorded.</div>
                                            )}

                                            {/* Ops Summary */}
                                            <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.15)', marginTop: '10px' }}>
                                                <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Other Operational Costs</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>Wash & Puncture: <strong style={{ color: 'white' }}>₹{((selectedVehicle.services?.wash?.amount || 0) + (selectedVehicle.services?.puncture?.amount || 0)).toLocaleString()}</strong></div>
                                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>Fastag: <strong style={{ color: 'white' }}>₹{(selectedVehicle.fastag?.totalAmount || 0).toLocaleString()}</strong></div>
                                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>Border Tax: <strong style={{ color: 'white' }}>₹{(selectedVehicle.borderTax?.totalAmount || 0).toLocaleString()}</strong></div>
                                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>Parking: <strong style={{ color: 'white' }}>₹{(selectedVehicle.parking?.totalAmount || 0).toLocaleString()}</strong></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Maintenance & Repairs */}
                                    <div>
                                        <h3 style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '4px', height: '14px', background: '#f59e0b', borderRadius: '2px' }}></div>
                                            Maintenance & Repairs ({selectedVehicle.maintenance?.records?.length || 0})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                                            {!selectedVehicle.maintenance?.records || selectedVehicle.maintenance.records.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.2)', fontWeight: '800', fontSize: '12px' }}>No maintenance logs.</div>
                                            ) : (
                                                selectedVehicle.maintenance.records.map((r, i) => (
                                                    <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '12px', color: 'white', fontWeight: '800' }}>{r.category || 'General Repair'}</span>
                                                            <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '900' }}>₹{(r.amount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{formatDateIST(r.date)} {r.description ? `• ${r.description}` : ''}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .btn-hover-glow:hover {
                    background: rgba(255,255,255,0.1) !important;
                    box-shadow: 0 0 15px rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.2) !important;
                    transform: translateY(-2px);
                }
                .text-gradient-blue {
                    background: linear-gradient(135deg, var(--primary), var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default VehicleMonthlyDetails;

