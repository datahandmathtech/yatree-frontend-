import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Plus, Edit, Trash2, FileText, CheckCircle, X, Download, Briefcase,
    Calendar, Car, IndianRupee, MapPin, Search, Filter, AlertTriangle,
    Clock, Phone, ShieldCheck, Share2, HelpCircle, User, Users,
    Globe, Building2, Repeat, CircleDot, XCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    TrendingUp, TrendingDown, BarChart2, BarChart3, Info, CheckSquare, Square, CreditCard,
    Landmark, UploadCloud, Camera, Eye, EyeOff, Image as ImageIcon, MessageSquare,
    ExternalLink, RefreshCw, MessageCircle, Calculator, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import ImageUploader from '../components/common/ImageUploader';
import { formatDateIST, todayIST, toISTDateString, getFinancialYear, getAvailableFinancialYears, getSidebarMonthOptions } from '../utils/istUtils';

const LEAD_SOURCES = [
    'Website', 'Google Ads', 'Repeat Guest', 'Hotel', 'Referral',
    'Agent', 'Walk-in', 'Corporate', 'Social Media', 'Justdial', 'Other'
];

const GST_MODES = ['GST Inclusive', 'GST Extra', 'No GST', 'RCM'];

const LEAD_STATUSES = ['New', 'Follow-up', 'Quoted', 'Negotiation', 'Confirmed', 'Lost', 'Cancelled'];

const MONTH_TABS = ['All', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const VEHICLE_OPTIONS = [
    'Innova Crysta',
    'Ertiga',
    'Swift Dzire',
    'Tempo Traveller (12 Seater)',
    'Tempo Traveller (17 Seater)',
    'Toyota Fortuner',
    'Sedan',
    'SUV',
    'Luxury Car',
    'Bus'
];

const FUEL_TYPES = [
    { type: 'Diesel', label: 'Diesel', icon: '⛽', rateUnit: '₹/L', avgUnit: 'km/l' },
    { type: 'Petrol', label: 'Petrol', icon: '⛽', rateUnit: '₹/L', avgUnit: 'km/l' },
    { type: 'CNG', label: 'CNG', icon: '🍃', rateUnit: '₹/kg', avgUnit: 'km/kg' },
    { type: 'EV', label: 'Electric (EV)', icon: '⚡', rateUnit: '₹/unit', avgUnit: 'km/unit' }
];



// Robust local date helpers without UTC offset shifts
const toLocalDateString = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
        return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatTourDate = (dateVal) => {
    if (!dateVal) return '--';
    const cleanStr = toLocalDateString(dateVal);
    if (!cleanStr) return '--';
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return cleanStr;
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d} ${monthName} ${y}`;
};

const addDaysToDateString = (dateStr, days) => {
    if (!dateStr) return '';
    const cleanStr = toLocalDateString(dateStr);
    const parts = cleanStr.split('-').map(Number);
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

const getDaysDifference = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const s = new Date(sy, sm - 1, sd);
    const e = new Date(ey, em - 1, ed);
    const diffTime = e.getTime() - s.getTime();
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
};


const InlineRemarkEditor = ({ lead, fetchLeads, setViewingImage, customRemarks, setCustomRemarks, selectedCompany }) => {
    const [text, setText] = React.useState('');
    const [isHovered, setIsHovered] = React.useState(false);
    const lastRemark = lead.remarksHistory?.[lead.remarksHistory.length - 1];

    const handleSave = async () => {
        if (!text.trim()) return;
        try {
            await axios.post(`/api/leads/${lead._id}/remarks`, { text: text.trim(), attachmentUrl: null });
            setText('');
            fetchLeads();
        } catch (e) {
            alert('Failed to save remark');
        }
    };

    return (
        <div style={{ width: '100%', minWidth: '220px', position: 'relative' }}>
            {lastRemark ? (
                <div 
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ 
                        borderLeft: '2px solid rgba(59, 130, 246, 0.5)', 
                        paddingLeft: '8px', 
                        marginBottom: '6px',
                        cursor: lead.remarksHistory.length > 1 ? 'pointer' : 'default',
                        position: 'relative'
                    }}
                >
                    <div style={{ fontSize: '12px', color: 'white', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lastRemark.text}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{new Date(lastRemark.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        {lead.remarksHistory.length > 1 && (
                            <span style={{ fontSize: '9px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '10px', fontWeight: '800' }}>
                                +{lead.remarksHistory.length - 1} More
                            </span>
                        )}
                    </div>

                    {/* History Dropdown / Tooltip */}
                    {isHovered && lead.remarksHistory.length > 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            marginTop: '8px',
                            background: '#0a0f1d',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '8px',
                            padding: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                            zIndex: 100,
                            minWidth: '240px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#60a5fa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remark History</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {[...lead.remarksHistory].reverse().map((rmk, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px', borderLeft: idx === 0 ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginBottom: '2px' }}>{rmk.text}</div>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{new Date(rmk.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '6px' }}>No remarks yet</div>
            )}
            
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', transition: 'all 0.2s ease' }}>
                <input 
                      type="text" 
                      value={text} 
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      placeholder="Type remark & press Enter..." 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '11px', outline: 'none', padding: '6px 0' }}
                  />
                  <button 
                      onClick={handleSave} 
                      disabled={!text.trim()}
                      style={{ 
                          background: text.trim() ? '#fbbf24' : 'rgba(255,255,255,0.1)', 
                          color: text.trim() ? '#000' : 'rgba(255,255,255,0.3)', 
                          border: 'none', 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          cursor: text.trim() ? 'pointer' : 'default',
                          transition: 'all 0.2s'
                      }}>
                      Save
                  </button>
            </div>
        </div>
    );
};

export default function Leads() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState('All');
    const [fyLeadMonthFilter, setFyLeadMonthFilter] = useState('All'); // FY Month filter (Daily Breakdown Lead Arrival Month)
    const [sourceFilter, setSourceFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [salesPersonFilter, setSalesPersonFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Confirmed' | 'Cancelled' | 'Lost' | 'Open'
    const [sortField, setSortField] = useState('clientCode'); // 'clientCode' | 'date' | 'price'
    const [sortOrder, setSortOrder] = useState('desc'); // default 'desc' so current/newest leads (e.g. 10/70, 10/69...) appear at the top!
    const [dateFilterType, setDateFilterType] = useState('lead'); // 'lead' = Enquiry / Lead Created (10/xx), 'travel' = Tour Travel Date

    // Hover tooltip state
    const [hoveredLeadId, setHoveredLeadId] = useState(null);
    // Right Analytics Sidebar state (Closed by default as requested)
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const [customSidebarMonth, setCustomSidebarMonth] = useState(null);
    const [expandedDailyDay, setExpandedDailyDay] = useState(null);
    const [hoveredDailyDay, setHoveredDailyDay] = useState(null);
    const [selectedFy, setSelectedFy] = useState('FY 26-27');
    const [showFyDropdown, setShowFyDropdown] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [sidebarLeads, setSidebarLeads] = useState([]);
    const [loadingSidebarLeads, setLoadingSidebarLeads] = useState(false);
    const searchDebounceRef = useRef(null);

    const fyOptions = useMemo(() => getAvailableFinancialYears(sidebarLeads.length > 0 ? sidebarLeads : leads), [sidebarLeads, leads]);
    const SIDEBAR_MONTH_OPTIONS = useMemo(() => getSidebarMonthOptions(selectedFy), [selectedFy]);

    const selectedSidebarMonth = useMemo(() => {
        if (customSidebarMonth) return customSidebarMonth;
        if (monthFilter === 'All') {
            const currentMonthIdx = new Date().getMonth();
            const opt = SIDEBAR_MONTH_OPTIONS.find(o => o.monthIdx === currentMonthIdx);
            return opt ? opt.label : (SIDEBAR_MONTH_OPTIONS[5]?.label || 'April 2026');
        } else {
            const opt = SIDEBAR_MONTH_OPTIONS.find(o => o.tab === monthFilter);
            return opt ? opt.label : (SIDEBAR_MONTH_OPTIONS[5]?.label || 'April 2026');
        }
    }, [monthFilter, customSidebarMonth, SIDEBAR_MONTH_OPTIONS]);

    // Monthly Bookings Overview states
    const navigate = useNavigate();
    const [companyBookings, setCompanyBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [showBookingsModal, setShowBookingsModal] = useState(false);
    const [bookingsModalTab, setBookingsModalTab] = useState('All');
    const [bookingsModalSearch, setBookingsModalSearch] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 500;

    // Create / Edit Modal
    
    const [customSources, setCustomSources] = useState([]);
    const [customVehicles, setCustomVehicles] = useState([]);
    const [customRemarks, setCustomRemarks] = useState([]);
    useEffect(() => {
        if (selectedCompany?._id) {
            try {
                const saved = JSON.parse(localStorage.getItem('leadSources_' + selectedCompany._id));
                if (saved) setCustomSources(saved);
                const savedVehicles = JSON.parse(localStorage.getItem('leadVehicles_' + selectedCompany._id));
                if (savedVehicles) setCustomVehicles(savedVehicles);
                const savedRemarks = JSON.parse(localStorage.getItem('leadRemarks_' + selectedCompany._id));
                if (savedRemarks) setCustomRemarks(savedRemarks);
            } catch(e) {}
        }
    }, [selectedCompany]);
    
    const ALL_SOURCES = [...new Set([...LEAD_SOURCES, ...customSources])];
    const ALL_VEHICLES = [...new Set([...VEHICLE_OPTIONS, ...customVehicles])];

    const [showModal, setShowModal] = useState(false);
    const [showDetailedItinerary, setShowDetailedItinerary] = useState(false);
    const [remarksModalLead, setRemarksModalLead] = useState(null);
    const [expandedRemarks, setExpandedRemarks] = useState({});
    const [editingLead, setEditingLead] = useState(null);
    const [previewClientCode, setPreviewClientCode] = useState('');

    // Convert to Booking Modal
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertingLead, setConvertingLead] = useState(null);
    const [advancePayment, setAdvancePayment] = useState('');
    const [advancePaymentDate, setAdvancePaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('UPI / QR Code');
    const [paymentRef, setPaymentRef] = useState('');
    const [adminOverride, setAdminOverride] = useState(false);
    const [adminOverrideReason, setAdminOverrideReason] = useState('');

    // Bank Accounts State (for Confirm Modal and Quotation PDF)
    const [companyBanks, setCompanyBanks] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [paymentScreenshotFile, setPaymentScreenshotFile] = useState(null);
    const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

    // Travel Agent States
    const [travelAgents, setTravelAgents] = useState([]);
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [newAgentData, setNewAgentData] = useState({
        agencyName: '',
        contactPerson: '',
        mobile: '',
        email: '',
        city: '',
        gstNumber: ''
    });
    const [savingAgent, setSavingAgent] = useState(false);

    // Duplicate Phone Check State
    const [phoneCheckResult, setPhoneCheckResult] = useState(null);
    const phoneDebounceRef = useRef(null);

    // Tour Itinerary & Quotation Preview State (Image & PDF)
    const [previewTourLead, setPreviewTourLead] = useState(null);
    const [showPriceInPreview, setShowPriceInPreview] = useState(true);
    const [downloadOptionModal, setDownloadOptionModal] = useState(null); // { type: 'pdf' | 'image', lead }
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const tourCardRef = useRef(null);

    // Daily Breakdown Expanded Day
    const [expandedBreakdownDay, setExpandedBreakdownDay] = useState(null);

    // Vehicle Matrix State (Multi-Option Direct Operating Expenses & Live Margin Analysis)
    const createNewMatrixItem = (idx = 0, carName = 'Innova Crysta') => ({
        id: 'vm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title: `Option ${idx + 1}: ${carName}`,
        carType: carName,
        fuelType: 'Diesel',
        totalKmRun: '',
        vehicleAverage: '',
        fuelRate: '',
        driverSalary: '',
        nightHold: '',
        tollAndParking: '',
        gstAmount: '',
        targetPerDay: '2500',
        packageValue: '',
        simSalePrice: ''
    });

    const [vehicleMatrices, setVehicleMatrices] = useState([createNewMatrixItem(0, 'Innova Crysta')]);
    const [activeMatrixIndex, setActiveMatrixIndex] = useState(0);

    const updateActiveMatrix = (field, value) => {
        setVehicleMatrices(prev => {
            const copy = [...prev];
            const idx = (activeMatrixIndex >= 0 && activeMatrixIndex < copy.length) ? activeMatrixIndex : 0;
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const addMatrixOption = (carName = 'Sedan') => {
        setVehicleMatrices(prev => {
            const nextIdx = prev.length;
            const newOption = createNewMatrixItem(nextIdx, carName);
            if (prev.length > 0 && prev[0].totalKmRun) {
                newOption.totalKmRun = prev[0].totalKmRun;
            }
            if (prev.length > 0 && prev[0].driverSalary) {
                newOption.driverSalary = prev[0].driverSalary;
            }
            if (prev.length > 0 && prev[0].nightHold) {
                newOption.nightHold = prev[0].nightHold;
            }
            if (prev.length > 0 && prev[0].tollAndParking) {
                newOption.tollAndParking = prev[0].tollAndParking;
            }
            return [...prev, newOption];
        });
        setActiveMatrixIndex(vehicleMatrices.length);
    };

    const removeMatrixOption = (indexToRemove) => {
        if (vehicleMatrices.length <= 1) return;
        setVehicleMatrices(prev => prev.filter((_, i) => i !== indexToRemove));
        setActiveMatrixIndex(prev => Math.max(0, prev >= indexToRemove ? prev - 1 : prev));
    };

    const [formData, setFormData] = useState({
        bookingReference: 'Direct',
        travelAgent: '',
        travelAgentName: '',
        travelAgentMobile: '',
        clientName: '',
        mobileNumber: '',
        alternateMobile: '',
        email: '',
        gstin: '',
        source: 'Website',
        reference: '',
        salesPerson: '',
        leadDate: '',
        travelStartDate: '',
        travelEndDate: '',
        isBreakTour: false,
        excludedDates: [],
        carType: 'Innova Crysta',
        numberOfCars: 1,
        gstMode: 'GST Inclusive',
        gstRate: 5,
        status: 'New',
        priority: 'Unassigned',
        notes: '',
        specialRemarks: '',
        inclusions: {
            driverAllowance: true,
            nightAllowance: true,
            tollParking: true,
            gstIncluded: true,
            manualRemarks: localStorage.getItem('last_manual_inclusion_remarks') || ''
        },
        itinerary: [],
        extraCharges: [],
        totalAmount: 0
    });

    // Generate all dates in range [travelStartDate, travelEndDate]
    const allTourDates = useMemo(() => {
        if (!formData.travelStartDate || !formData.travelEndDate) return [];
        const s = toLocalDateString(formData.travelStartDate);
        const e = toLocalDateString(formData.travelEndDate);
        if (!s || !e || e < s) return s ? [s] : [];
        const count = Math.min(90, getDaysDifference(s, e));
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(addDaysToDateString(s, i));
        }
        return arr;
    }, [formData.travelStartDate, formData.travelEndDate]);

    const validExcludedDates = useMemo(() => {
        const set = new Set(allTourDates);
        return (formData.excludedDates || []).filter(d => set.has(d));
    }, [formData.excludedDates, allTourDates]);

    const totalStayDays = Math.max(1, allTourDates.length || formData.itinerary?.length || 1);
    const activeCarDays = Math.max(1, totalStayDays - validExcludedDates.length);

    // Vehicle Matrix Math Calculations (derived from active selected option)
    const activeMatrix = vehicleMatrices[activeMatrixIndex] || vehicleMatrices[0] || {};
    const matrixFuelType = activeMatrix.fuelType || 'Diesel';
    const matrixTotalKmRun = activeMatrix.totalKmRun !== undefined ? activeMatrix.totalKmRun : '';
    const matrixVehicleAverage = activeMatrix.vehicleAverage !== undefined ? activeMatrix.vehicleAverage : '';
    const matrixFuelRate = activeMatrix.fuelRate !== undefined ? activeMatrix.fuelRate : '';
    const matrixDriverSalary = activeMatrix.driverSalary !== undefined ? activeMatrix.driverSalary : '';
    const matrixNightHold = activeMatrix.nightHold !== undefined ? activeMatrix.nightHold : '';
    const matrixTollAndParking = activeMatrix.tollAndParking !== undefined ? activeMatrix.tollAndParking : '';
    const matrixGstAmount = activeMatrix.gstAmount !== undefined ? activeMatrix.gstAmount : '';
    const matrixTargetPerDay = activeMatrix.targetPerDay !== undefined ? activeMatrix.targetPerDay : '2500';
    const matrixSimSalePrice = activeMatrix.simSalePrice !== undefined ? activeMatrix.simSalePrice : '';

    const currentFuelConfig = FUEL_TYPES.find(f => f.type === matrixFuelType) || FUEL_TYPES[0];
    const matrixKmVal = parseFloat(matrixTotalKmRun) || 0;
    const matrixAvgVal = parseFloat(matrixVehicleAverage) || 0;
    const matrixRateVal = parseFloat(matrixFuelRate) || 0;
    const matrixFuelCost = matrixAvgVal > 0 ? (matrixKmVal / matrixAvgVal) * matrixRateVal : 0;

    const matrixDriverSalaryVal = parseFloat(matrixDriverSalary) || 0;
    const matrixNightHoldVal = parseFloat(matrixNightHold) || 0;
    const matrixTollVal = parseFloat(matrixTollAndParking) || 0;
    const matrixGstVal = parseFloat(matrixGstAmount) || 0;
    const matrixPackageVal = parseFloat(activeMatrix.packageValue) || parseFloat(formData.totalAmount) || 0;

    const matrixDaysVal = activeCarDays;
    const matrixTargetPerDayVal = parseFloat(matrixTargetPerDay) || 0;

    const matrixTotalCost = matrixFuelCost + matrixDriverSalaryVal + matrixNightHoldVal + matrixTollVal + matrixGstVal;
    const matrixTotalProfit = matrixPackageVal - matrixTotalCost;
    const matrixPerDayProfit = matrixDaysVal > 0 ? (matrixTotalProfit / matrixDaysVal) : 0;
    const matrixDiffFromTarget = matrixPerDayProfit - matrixTargetPerDayVal;

    const matrixSimPriceVal = parseFloat(matrixSimSalePrice) || 0;
    const matrixSimProfit = matrixSimPriceVal > 0 ? (matrixSimPriceVal - matrixTotalCost) : 0;
    const matrixSimPerDay = matrixDaysVal > 0 ? (matrixSimProfit / matrixDaysVal) : 0;

    const handleAutoMatrixGST = () => {
        const pkg = parseFloat(activeMatrix.packageValue) || parseFloat(formData.totalAmount) || 0;
        if (pkg > 0) {
            const autoGst = Math.round(pkg - (pkg / 1.05));
            updateActiveMatrix('gstAmount', String(autoGst));
        }
    };

    const applySimPriceToQuotation = (price) => {
        const val = Math.max(0, parseFloat(price) || 0);
        updateActiveMatrix('packageValue', val);
        setFormData(prev => ({
            ...prev,
            totalAmount: val
        }));
    };

    const fetchTravelAgents = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/clients/company/${selectedCompany._id}`);
            const agents = (data || []).filter(c => c.clientType === 'Travel Agent');
            setTravelAgents(agents);
        } catch (err) {
            console.error('Error fetching travel agents:', err);
        }
    };

    const fetchCompanyBanks = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/banks/company/${selectedCompany._id}`);
            setCompanyBanks(data || []);
            if (data?.length > 0 && !selectedBankId) {
                setSelectedBankId(data[0]._id);
            }
        } catch (err) {
            console.error('Error fetching company banks:', err);
        }
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchLeads();
            fetchTravelAgents();
            fetchCompanyBanks();
            fetchAllCompanyBookings();
        }
    }, [selectedCompany?._id]);

    const fetchLeads = async () => {
        if (!selectedCompany?._id) return;
        try {
            if (leads.length === 0) setLoading(true);
            const url = `/api/leads/${selectedCompany._id}?status=All`;
            const { data } = await axios.get(url);
            const list = data || [];
            setLeads(list);
            setSidebarLeads(list);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSidebarLeads = async () => {
        // fetchLeads already loads all leads (?status=All) and updates sidebarLeads
        if (leads.length > 0) {
            setSidebarLeads(leads);
            return;
        }
        await fetchLeads();
    };

    const fetchAllCompanyBookings = async () => {
        if (!selectedCompany?._id) return;
        try {
            setLoadingBookings(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}`);
            setCompanyBookings(data || []);
        } catch (err) {
            console.error("Error fetching company bookings:", err);
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
    };

    // Duplicate Phone Checker
    const handleMobileChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, mobileNumber: val }));

        if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);

        if (val.trim().length >= 8 && selectedCompany?._id) {
            phoneDebounceRef.current = setTimeout(async () => {
                try {
                    const { data } = await axios.get(`/api/leads/check-phone/${selectedCompany._id}?phone=${val.trim()}`);
                    setPhoneCheckResult(data);
                } catch (err) {
                    console.error('Phone duplicate check error:', err);
                }
            }, 500);
        } else {
            setPhoneCheckResult(null);
        }
    };

    // Fetch next client code preview when modal opens or leadDate changes
    const fetchNextClientCodePreview = async (dateVal) => {
        if (!selectedCompany?._id) return;
        try {
            const dateParam = toLocalDateString(dateVal || new Date());
            const { data } = await axios.get(`/api/leads/next-client-code/${selectedCompany._id}?date=${dateParam}`);
            if (data?.clientCode) {
                setPreviewClientCode(data.clientCode);
            }
        } catch (err) {
            console.error('Error fetching client code preview:', err);
        }
    };

    // Update travel dates without auto-generating day-wise itinerary
    const handleTravelDateChange = (field, value) => {
        setFormData(prev => {
            let sDate = field === 'travelStartDate' ? value : prev.travelStartDate;
            let eDate = field === 'travelEndDate' ? value : prev.travelEndDate;

            if (field === 'travelStartDate' && (!eDate || eDate < value)) {
                eDate = value;
            } else if (field === 'travelEndDate' && (!sDate || value < sDate)) {
                sDate = value;
            }

            const todayStr = toLocalDateString(new Date());
            const willBeFuture = (eDate && eDate >= todayStr) || (sDate && sDate >= todayStr);
            return {
                ...prev,
                [field]: value,
                travelStartDate: sDate,
                travelEndDate: eDate,
                status: (prev.status === 'Cancelled' && prev.priority !== 'Lost' && willBeFuture) ? 'New' : prev.status
            };
        });
    };

    // Toggle a specific date as Break Day (No Car Used) vs Active Car Day
    const toggleBreakTourDate = (dateStr) => {
        setFormData(prev => {
            const currentExcluded = Array.isArray(prev.excludedDates) ? [...prev.excludedDates] : [];
            const isExcluded = currentExcluded.includes(dateStr);
            let nextExcluded;
            if (isExcluded) {
                nextExcluded = currentExcluded.filter(d => d !== dateStr);
            } else {
                // Prevent excluding all dates (must have at least 1 active car day)
                const activeCountAfter = allTourDates.filter(d => !currentExcluded.includes(d) && d !== dateStr).length;
                if (activeCountAfter < 1) {
                    alert('At least 1 active car usage day is required in the tour!');
                    return prev;
                }
                nextExcluded = [...currentExcluded, dateStr].sort();
            }

            // If itinerary already has items, keep itinerary synced with active dates
            let nextItinerary = prev.itinerary || [];
            if (nextItinerary.length > 0) {
                if (!isExcluded) {
                    // Date was just marked as Break (No Car) -> remove that date from itinerary
                    nextItinerary = nextItinerary
                        .filter(item => toLocalDateString(item.date) !== dateStr)
                        .map((item, idx) => ({ ...item, dayNo: idx + 1 }));
                } else {
                    // Date was re-activated -> insert into itinerary in chronological order if not present
                    const exists = nextItinerary.some(item => toLocalDateString(item.date) === dateStr);
                    if (!exists) {
                        const newRow = {
                            dayNo: 1,
                            date: dateStr,
                            time: '09:00 AM',
                            isApg: false,
                            pickupPoint: '',
                            duty: 'City Tour / Transfer',
                            description: 'City Tour / Transfer',
                            vehicleType: prev.carType || 'Innova Crysta',
                            vehicleCount: prev.numberOfCars || 1,
                            quantity: prev.numberOfCars || 1,
                            rate: 0,
                            amount: 0
                        };
                        nextItinerary = [...nextItinerary, newRow]
                            .sort((a, b) => toLocalDateString(a.date).localeCompare(toLocalDateString(b.date)))
                            .map((item, idx) => ({ ...item, dayNo: idx + 1 }));
                    }
                }
            }

            return {
                ...prev,
                isBreakTour: nextExcluded.length > 0 ? true : prev.isBreakTour,
                excludedDates: nextExcluded,
                itinerary: nextItinerary
            };
        });
    };

    const syncActiveDatesToItinerary = () => {
        const activeDatesList = allTourDates.filter(d => !validExcludedDates.includes(d));
        if (activeDatesList.length === 0) return;
        setFormData(prev => {
            const existingByDate = {};
            (prev.itinerary || []).forEach(item => {
                const dStr = toLocalDateString(item.date);
                if (dStr) existingByDate[dStr] = item;
            });
            const nextItin = activeDatesList.map((dStr, idx) => {
                const ex = existingByDate[dStr];
                if (ex) {
                    return { ...ex, dayNo: idx + 1, date: dStr };
                }
                return {
                    dayNo: idx + 1,
                    date: dStr,
                    time: idx === 0 ? '09:00 AM' : '10:00 AM',
                    isApg: false,
                    pickupPoint: '',
                    duty: idx === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                    description: idx === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                    vehicleType: prev.carType || 'Innova Crysta',
                    vehicleCount: prev.numberOfCars || 1,
                    quantity: prev.numberOfCars || 1,
                    rate: 0,
                    amount: 0
                };
            });
            return {
                ...prev,
                itinerary: nextItin
            };
        });
        setShowDetailedItinerary(true);
    };

    // Itinerary Row Field Handlers
    const handleItineraryRowChange = (index, field, value) => {
        const updated = [...formData.itinerary];
        const row = { ...updated[index] };

        if (field === 'isApg') {
            row.isApg = value;
            if (value) {
                row.time = 'APG';
            } else if (row.time === 'APG') {
                row.time = '09:00 AM';
            }
        } else if (field === 'rate' || field === 'quantity') {
            const qty = field === 'quantity'
                ? (value === '' ? '' : Math.max(1, parseInt(value) || 1))
                : (row.quantity === '' ? 1 : (Number(row.quantity || row.vehicleCount) || 1));
            const rate = field === 'rate'
                ? (value === '' ? '' : Math.max(0, parseFloat(value) || 0))
                : (row.rate === '' ? 0 : (Number(row.rate) || 0));
            row.rate = rate;
            row.quantity = qty;
            row.vehicleCount = qty === '' ? 1 : qty;
            const numericQty = qty === '' ? 1 : Number(qty);
            const numericRate = rate === '' ? 0 : Number(rate);
            row.amount = numericQty * numericRate;
        } else if (field === 'amount') {
            row.amount = value === '' ? '' : (Number(value) || 0);
        } else if (field === 'duty') {
            row.duty = value;
            row.description = value;
        } else {
            row[field] = value;
        }

        updated[index] = row;
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setFormData(prev => ({
            ...prev,
            itinerary: updated,
            totalAmount: total > 0 ? total : prev.totalAmount
        }));
    };

    const addAnotherDay = () => {
        let nextDate = '';
        const len = formData.itinerary.length;
        if (len > 0 && formData.itinerary[len - 1].date) {
            nextDate = addDaysToDateString(toLocalDateString(formData.itinerary[len - 1].date), 1);
        } else if (formData.travelStartDate) {
            nextDate = addDaysToDateString(formData.travelStartDate, len);
        } else {
            nextDate = toLocalDateString(new Date());
        }

        const newDay = {
            dayNo: len + 1,
            date: nextDate,
            time: '09:00 AM',
            isApg: false,
            pickupPoint: '',
            duty: 'City Tour / Transfer',
            description: 'City Tour / Transfer',
            vehicleType: formData.carType || 'Innova Crysta',
            vehicleCount: formData.numberOfCars || 1,
            quantity: formData.numberOfCars || 1,
            rate: 0,
            amount: 0
        };

        const updated = [...formData.itinerary, newDay];
        setFormData(prev => ({
            ...prev,
            itinerary: updated
        }));
    };

    const removeItineraryDay = (index) => {
        const updated = formData.itinerary
            .filter((_, i) => i !== index)
            .map((d, i) => ({ ...d, dayNo: i + 1 }));
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setFormData(prev => ({
            ...prev,
            itinerary: updated,
            totalAmount: total > 0 ? total : prev.totalAmount
        }));
    };

    // Toggle Inclusions
    const handleInclusionToggle = (key) => {
        setFormData(prev => ({
            ...prev,
            inclusions: {
                ...prev.inclusions,
                [key]: !prev.inclusions[key]
            }
        }));
    };

    // Open Modal
    const handleOpenModal = (lead = null) => {
        setPhoneCheckResult(null);
        if (lead) {
            setEditingLead(lead);
            const hasCustomItin = Array.isArray(lead.itinerary) && lead.itinerary.length > 0 && lead.itinerary.some(day => (Number(day.rate) > 0 || Number(day.amount) > 0 || (day.route && day.route.trim())));
            setShowDetailedItinerary(hasCustomItin);
            setPreviewClientCode(lead.clientCode || lead.leadId || '');
            const sDate = toLocalDateString(lead.travelStartDate);
            const eDate = toLocalDateString(lead.travelEndDate);
            const todayStr = toLocalDateString(new Date());
            const isConfirmedLead = (lead.status === 'Confirmed' || lead.status === 'Converted' || !!lead.bookingId || Number(lead.advancePayment) > 0) && lead.status !== 'Cancelled' && lead.status !== 'Lost' && lead.priority !== 'Lost';
            const endOrStart = eDate || sDate;
            const isAutoLost = lead.status === 'Lost' || lead.priority === 'Lost' || lead.status === 'Cancelled' || (!isConfirmedLead && endOrStart && endOrStart < todayStr);
            const savedExcluded = Array.isArray(lead.excludedDates) ? lead.excludedDates : [];
            setFormData({
                bookingReference: lead.bookingReference || 'Direct',
                travelAgent: lead.travelAgent || '',
                travelAgentName: lead.travelAgentName || '',
                travelAgentMobile: lead.travelAgentMobile || '',
                clientName: lead.clientName || '',
                mobileNumber: lead.mobileNumber || '',
                alternateMobile: lead.alternateMobile || '',
                email: lead.email || '',
                gstin: lead.gstin || '',
                source: lead.source || 'Website',
                reference: lead.reference || '',
                salesPerson: lead.salesPerson || '',
                leadDate: toLocalDateString(lead.leadDate) || toLocalDateString(new Date()),
                travelStartDate: sDate,
                travelEndDate: eDate,
                isBreakTour: Boolean(lead.isBreakTour) || savedExcluded.length > 0,
                excludedDates: savedExcluded,
                carType: lead.carType || 'Innova Crysta',
                numberOfCars: lead.numberOfCars || 1,
                gstMode: lead.gstMode || 'GST Inclusive',
                gstRate: lead.gstRate || 5,
                status: isAutoLost ? 'Lost' : (lead.status || 'New'),
                priority: isAutoLost ? 'Lost' : (lead.priority || 'Unassigned'),
                notes: lead.notes || '',
                specialRemarks: lead.specialRemarks || '',
                inclusions: {
                    driverAllowance: lead.inclusions?.driverAllowance !== false,
                    nightAllowance: lead.inclusions?.nightAllowance !== false,
                    tollParking: lead.inclusions?.tollParking !== false,
                    gstIncluded: lead.inclusions?.gstIncluded !== false,
                    manualRemarks: lead.inclusions?.manualRemarks || ''
                },
                itinerary: (() => {
                    const mapped = (lead.itinerary || []).map((d, i) => {
                        const q = d.quantity || d.vehicleCount || lead.numberOfCars || 1;
                        const r = d.rate !== undefined ? d.rate : 0;
                        const a = d.amount !== undefined ? d.amount : (q * r);
                        return {
                            dayNo: d.dayNo || i + 1,
                            date: toLocalDateString(d.date),
                            time: d.time || '09:00 AM',
                            isApg: d.isApg || d.time === 'APG',
                            duty: d.duty || d.description || 'Standard Duty',
                            description: d.duty || d.description || 'Standard Duty',
                            vehicleType: d.vehicleType || lead.carType || 'Innova Crysta',
                            vehicleCount: q,
                            quantity: q,
                            rate: r,
                            amount: a
                        };
                    });
                    return mapped;
                })(),
                extraCharges: lead.extraCharges || [],
                totalAmount: (() => {
                    const mapped = (lead.itinerary || []).map((d, i) => {
                        const q = d.quantity || d.vehicleCount || lead.numberOfCars || 1;
                        const r = d.rate !== undefined ? d.rate : 0;
                        return d.amount !== undefined ? Number(d.amount) : (q * r);
                    });
                    const sum = mapped.reduce((a, b) => a + (Number(b) || 0), 0);
                    return sum > 0 ? sum : (lead.totalAmount || 0);
                })()
            });

            // Populate Vehicle Matrix state from lead
            if (lead.vehicleMatrices && Array.isArray(lead.vehicleMatrices) && lead.vehicleMatrices.length > 0) {
                setVehicleMatrices(lead.vehicleMatrices);
            } else if (lead.vehicleMatrix && (lead.vehicleMatrix.totalKmRun || lead.vehicleMatrix.fuelCost)) {
                setVehicleMatrices([{
                    ...lead.vehicleMatrix,
                    id: 'vm_1',
                    title: `Option 1: ${lead.carType || 'Vehicle'}`,
                    carType: lead.carType || 'Innova Crysta'
                }]);
            } else {
                setVehicleMatrices([createNewMatrixItem(0, lead.carType || 'Innova Crysta')]);
            }
            setActiveMatrixIndex(0);
        } else {
            setEditingLead(null);
            setShowDetailedItinerary(false);
            const today = toLocalDateString(new Date());
            fetchNextClientCodePreview(today);

            // Reset Vehicle Matrix state for new lead
            setVehicleMatrices([createNewMatrixItem(0, 'Innova Crysta')]);
            setActiveMatrixIndex(0);

            setFormData({
                bookingReference: 'Direct',
                travelAgent: '',
                travelAgentName: '',
                travelAgentMobile: '',
                clientName: '',
                mobileNumber: '',
                alternateMobile: '',
                email: '',
                gstin: '',
                source: 'Website',
                reference: '',
                salesPerson: '',
                leadDate: today,
                travelStartDate: today,
                travelEndDate: today,
                isBreakTour: false,
                excludedDates: [],
                carType: 'Innova Crysta',
                numberOfCars: 1,
                gstMode: 'GST Inclusive',
                gstRate: 5,
                status: 'New',
                priority: 'Unassigned',
                notes: '',
                specialRemarks: '',
                inclusions: {
                    driverAllowance: true,
                    nightAllowance: true,
                    tollParking: true,
                    gstIncluded: true,
                    manualRemarks: localStorage.getItem('last_manual_inclusion_remarks') || ''
                },
                itinerary: [],
                extraCharges: [],
                totalAmount: 0
            });
        }
        setShowModal(true);
    };

    // Save Lead Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const isAgent = formData.source === 'Agent' || formData.bookingReference === 'Travel Agent';
            const finalClientName = formData.clientName?.trim() || (isAgent ? (formData.travelAgentName ? `${formData.travelAgentName} (Guest)` : 'Guest (TBA)') : '');
            const finalMobileNumber = formData.mobileNumber?.trim() || (isAgent ? (formData.travelAgentMobile || 'TBA') : '');

            const finalVehicleMatrix = {
                fuelType: matrixFuelType,
                totalKmRun: parseFloat(matrixTotalKmRun) || 0,
                vehicleAverage: parseFloat(matrixVehicleAverage) || 0,
                fuelRate: parseFloat(matrixFuelRate) || 0,
                fuelCost: Math.round(matrixFuelCost),
                driverSalary: matrixDriverSalaryVal,
                nightHold: matrixNightHoldVal,
                tollAndParking: matrixTollVal,
                gstType: '5% Included',
                gstAmount: matrixGstVal,
                packageValue: matrixPackageVal,
                targetPerDay: matrixTargetPerDayVal,
                totalCost: Math.round(matrixTotalCost),
                totalProfit: Math.round(matrixTotalProfit),
                perDayProfit: Math.round(matrixPerDayProfit)
            };

            const finalVehicleMatrices = vehicleMatrices.map((m, idx) => {
                const mKm = parseFloat(m.totalKmRun) || 0;
                const mAvg = parseFloat(m.vehicleAverage) || 0;
                const mRate = parseFloat(m.fuelRate) || 0;
                const mFuelCost = mAvg > 0 ? (mKm / mAvg) * mRate : 0;
                const mDrv = parseFloat(m.driverSalary) || 0;
                const mNight = parseFloat(m.nightHold) || 0;
                const mToll = parseFloat(m.tollAndParking) || 0;
                const mGst = parseFloat(m.gstAmount) || 0;
                const mPkg = parseFloat(m.packageValue) || (idx === activeMatrixIndex ? matrixPackageVal : (parseFloat(formData.totalAmount) || 0));
                const mTotCost = mFuelCost + mDrv + mNight + mToll + mGst;
                const mProfit = mPkg - mTotCost;
                return {
                    ...m,
                    fuelCost: Math.round(mFuelCost),
                    totalCost: Math.round(mTotCost),
                    totalProfit: Math.round(mProfit),
                    perDayProfit: matrixDaysVal > 0 ? Math.round(mProfit / matrixDaysVal) : 0
                };
            });

            const finalStatus = formData.priority === 'Lost'
                ? 'Lost'
                : (editingLead && editingLead.status === 'Lost' && formData.priority !== 'Lost' ? 'New' : formData.status);

            const payload = {
                ...formData,
                isBreakTour: validExcludedDates.length > 0,
                excludedDates: validExcludedDates,
                activeDaysCount: activeCarDays,
                status: finalStatus,
                vehicleMatrix: finalVehicleMatrix,
                vehicleMatrices: finalVehicleMatrices,
                clientName: finalClientName,
                mobileNumber: finalMobileNumber,
                bookingReference: isAgent ? 'Travel Agent' : formData.bookingReference,
                travelAgent: (isAgent && formData.travelAgent) ? formData.travelAgent : null,
                salesUser: formData.salesUser || null,
                bookingRef: formData.bookingRef || null,
                company: selectedCompany._id
            };

            if (editingLead) {
                await axios.put(`/api/leads/single/${editingLead._id}`, payload);
            } else {
                await axios.post('/api/leads', payload);
            }

            setShowModal(false);
            fetchLeads();
            const activeOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
            fetchSidebarLeads(activeOpt.tab);
        } catch (error) {
            console.error('Error saving lead:', error);
            alert(error.response?.data?.message || 'Error saving lead');
        }
    };

    const handleReopenLead = async (lead) => {
        try {
            await axios.put(`/api/leads/single/${lead._id}`, {
                status: 'New',
                priority: lead.priority === 'Lost' ? 'Unassigned' : (lead.priority || 'Unassigned'),
                notes: `${lead.notes ? lead.notes + ' | ' : ''}Reopened to Active enquiries`
            });
            fetchLeads();
            const activeOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
            fetchSidebarLeads(activeOpt.tab);
        } catch (err) {
            console.error('Error reopening lead:', err);
            alert('Failed to reopen lead: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this lead? Any associated bookings and schedules will also be removed.')) {
            try {
                await axios.delete(`/api/leads/single/${id}`);
                fetchLeads();
                const activeOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
                fetchSidebarLeads(activeOpt.tab);
            } catch (error) {
                console.error('Error deleting lead:', error);
                alert(error.response?.data?.message || 'Failed to delete lead');
            }
        }
    };

    // Save New Travel Agent inline
    const handleSaveNewAgent = async (e) => {
        e.preventDefault();
        if (!newAgentData.agencyName && !newAgentData.contactPerson) {
            alert('Please enter Agency Name or Contact Person');
            return;
        }
        try {
            setSavingAgent(true);
            const { data } = await axios.post('/api/clients', {
                company: selectedCompany._id,
                name: newAgentData.agencyName || newAgentData.contactPerson,
                agencyName: newAgentData.agencyName,
                contactPerson: newAgentData.contactPerson,
                mobile: newAgentData.mobile || `AGENT-${Date.now().toString().slice(-6)}`,
                email: newAgentData.email,
                city: newAgentData.city,
                gstNumber: newAgentData.gstNumber,
                clientType: 'Travel Agent'
            });

            await fetchTravelAgents();
            setFormData(prev => ({
                ...prev,
                bookingReference: 'Travel Agent',
                source: 'Agent',
                travelAgent: data._id,
                travelAgentName: data.agencyName || data.name,
                travelAgentMobile: data.mobile || ''
            }));
            setShowAddAgentModal(false);
            setNewAgentData({
                agencyName: '',
                contactPerson: '',
                mobile: '',
                email: '',
                city: '',
                gstNumber: ''
            });
            alert(`Travel Agent "${data.agencyName || data.name}" enlisted successfully!`);
        } catch (err) {
            console.error('Error adding travel agent:', err);
            alert(err.response?.data?.message || 'Failed to enlist travel agent');
        } finally {
            setSavingAgent(false);
        }
    };

    // Standardized Corporate Quotation PDF (With Amount OR Without Amount)
    const generateQuotationPDF = (lead, { withAmount = true } = {}) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || 210;

        // Top branded accent banner
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, pageWidth, 5, 'F');

        // Header - Company Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text(selectedCompany?.name || 'YatreeDestination', 14, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const companyPhone = selectedCompany?.whatsappNumber || selectedCompany?.phone || '911234512345';
        const companyEmail = selectedCompany?.email || 'N/A';
        const companyGst = selectedCompany?.gstNumber ? `  |  GSTIN: ${selectedCompany.gstNumber}` : '';
        doc.text(`Contact: ${companyPhone}  |  Email: ${companyEmail}${companyGst}`, 14, 24);

        // Header - Quotation Badge (Top Right)
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(pageWidth - 85, 10, 71, 22, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(245, 158, 11);
        doc.text(withAmount ? 'TRAVEL QUOTATION / ITINERARY' : 'TOUR ITINERARY SCHEDULE', pageWidth - 50, 16, { align: 'center' });
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Client Code: ${lead.clientCode || lead.leadId || 'N/A'}`, pageWidth - 50, 22.5, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const quoteDate = lead.leadDate ? new Date(lead.leadDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
        doc.text(`Date: ${quoteDate}`, pageWidth - 50, 28, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 34, pageWidth - 14, 34);

        // Client & Booking Information Card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 37, pageWidth - 28, 22, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 37, pageWidth - 28, 22, 2, 2, 'S');

        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`Guest Name: ${lead.clientName || 'Guest (TBA)'}`, 18, 44);
        if (lead.bookingReference === 'Travel Agent' && lead.travelAgentName) {
            doc.setTextColor(2, 132, 199);
            const agMob = lead.travelAgentMobile ? ` (${lead.travelAgentMobile})` : '';
            doc.text(`Travel Agent: ${lead.travelAgentName}${agMob}`, 18, 50);
            doc.setTextColor(15, 23, 42);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Contact: ${lead.mobileNumber || 'TBA'}`, 18, 50);
            doc.setTextColor(15, 23, 42);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`Vehicle: ${lead.numberOfCars}x ${lead.carType}`, 120, 44);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const sDate = lead.travelStartDate ? new Date(lead.travelStartDate).toLocaleDateString('en-IN') : '';
        const eDate = lead.travelEndDate ? new Date(lead.travelEndDate).toLocaleDateString('en-IN') : '';
        const diffDays = getDaysDifference(toLocalDateString(lead.travelStartDate), toLocalDateString(lead.travelEndDate));
        const exclCount = Array.isArray(lead.excludedDates) ? lead.excludedDates.length : 0;
        const activeDaysPdf = exclCount > 0 ? Math.max(1, diffDays - exclCount) : diffDays;
        const durationLabelPdf = exclCount > 0 ? `${activeDaysPdf} Car Days / ${diffDays}d Stay` : `${diffDays} Days`;
        doc.text(`Travel Dates: ${sDate} to ${eDate} (${durationLabelPdf})`, 120, 50);

        // Day-wise Itinerary Table
        const tableColumn = withAmount
            ? ["Day", "Date", "Reporting", "Pickup Point", "Duty / Route Description", "Vehicle", "Amount (Rs)"]
            : ["Day", "Date", "Reporting", "Pickup Point", "Duty / Route Description", "Vehicle"];

        const tableRows = (lead.itinerary || []).map((day, idx) => {
            const row = [
                `Day ${day.dayNo || idx + 1}`,
                day.date ? new Date(day.date).toLocaleDateString('en-IN') : 'TBA',
                day.isApg ? 'APG' : (day.time || '09:00 AM'),
                day.pickupPoint || 'Hotel / City',
                day.duty || day.description || 'Sightseeing / Transfer',
                day.vehicleType || lead.carType || 'Sedan'
            ];
            if (withAmount) {
                row.push(`Rs. ${(day.amount || 0).toLocaleString('en-IN')}`);
            }
            return row;
        });

        const columnStyles = withAmount ? {
            0: { cellWidth: 16, fontStyle: 'bold' },
            1: { cellWidth: 22 },
            2: { cellWidth: 18 },
            3: { cellWidth: 26 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 24 },
            6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        } : {
            0: { cellWidth: 18, fontStyle: 'bold' },
            1: { cellWidth: 25 },
            2: { cellWidth: 22 },
            3: { cellWidth: 32 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 30 }
        };

        autoTable(doc, {
            startY: 63,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
            columnStyles,
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        let finalY = (doc.lastAutoTable?.finalY || 63) + 8;

        if (withAmount) {
            // Total Package Fare with exact GST rate display
            const isGstExtra = lead.gstMode === 'GST Extra';
            const ratePercent = lead.gstRate || 5;
            const baseAmount = lead.totalAmount || 0;
            const gstVal = Math.round((baseAmount * ratePercent) / 100);
            const netPayable = isGstExtra ? (baseAmount + gstVal) : baseAmount;

            // Total Box
            doc.setFillColor(254, 243, 199);
            doc.setDrawColor(245, 158, 11);
            doc.roundedRect(pageWidth - 95, finalY, 81, isGstExtra ? 24 : 16, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 53, 15);
            if (isGstExtra) {
                doc.text(`Base Fare: Rs. ${baseAmount.toLocaleString('en-IN')}`, pageWidth - 90, finalY + 6);
                doc.text(`GST @ ${ratePercent}% Extra: Rs. ${gstVal.toLocaleString('en-IN')}`, pageWidth - 90, finalY + 12);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(`Total Payable: Rs. ${netPayable.toLocaleString('en-IN')}`, pageWidth - 90, finalY + 19);
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(`Total Package Fare (${lead.gstMode || 'GST Inclusive'}):`, pageWidth - 90, finalY + 7);
                doc.text(`Rs. ${baseAmount.toLocaleString('en-IN')}`, pageWidth - 90, finalY + 13);
            }

            // Remarks on the left
            if (lead.specialRemarks) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('Special Remarks / Guest Request:', 14, finalY + 5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(lead.specialRemarks, 14, finalY + 11, { maxWidth: 90 });
            }

            finalY = Math.max(finalY + (isGstExtra ? 28 : 20), finalY + 22);

            // Bank Details for Advance Transfer (Standardized)
            if (companyBanks && companyBanks.length > 0) {
                const primaryBank = companyBanks[0];
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('BANK DETAILS FOR ADVANCE TRANSFER:', 18, finalY + 6);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(`Bank: ${primaryBank.bankName}  |  A/C: ${primaryBank.accountNumber || 'N/A'}  |  IFSC: ${primaryBank.ifsc || 'N/A'}${primaryBank.upiId ? `  |  UPI ID: ${primaryBank.upiId}` : ''}`, 18, finalY + 11);
                finalY += 20;
            }
        } else {
            // Without Amount - print Special Remarks if any
            if (lead.specialRemarks) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('Special Remarks / Guest Request:', 14, finalY + 2);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(lead.specialRemarks, 14, finalY + 7, { maxWidth: pageWidth - 28 });
                finalY += 16;
            }
        }

        // Inclusions & Terms
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const incList = [];
        if (lead.inclusions?.driverAllowance !== false) incList.push('Driver Allowance');
        if (lead.inclusions?.nightAllowance !== false) incList.push('Night Allowance');
        if (lead.inclusions?.tollParking !== false) incList.push('Toll & Parking');
        if (lead.inclusions?.gstIncluded) incList.push('GST');
        const incText = incList.length > 0 ? incList.join(', ') + ' included.' : 'As per itinerary.';
        doc.text(`• Inclusions: ${incText}`, 14, finalY);
        if (lead.inclusions?.manualRemarks) {
            doc.text(`• Remarks: ${lead.inclusions.manualRemarks}`, 14, finalY + 4);
            doc.text('• Exclusions: Monument entrance fees, camera charges, personal expenses, or any route deviation not specified.', 14, finalY + 8);
            doc.text('• Note: AC will remain turned off in hill sections or parked/stationary vehicle.', 14, finalY + 12);
        } else {
            doc.text('• Exclusions: Monument entrance fees, camera charges, personal expenses, or any route deviation not specified.', 14, finalY + 4);
            doc.text('• Note: AC will remain turned off in hill sections or parked/stationary vehicle.', 14, finalY + 8);
        }

        const docSuffix = withAmount ? 'Quotation' : 'Itinerary';
        doc.save(`${(lead.clientName || 'Guest').replace(/\s+/g, '_')}_${lead.clientCode ? lead.clientCode.replace('/', '-') : docSuffix}.pdf`);
    };

    // Download Tour Itinerary Card as crisp High-Resolution Image for WhatsApp sharing
    const handleDownloadTourImage = async (withPrice = showPriceInPreview) => {
        if (!tourCardRef.current || !previewTourLead) return;
        try {
            setIsGeneratingImage(true);
            setShowPriceInPreview(withPrice);
            // Give DOM time to update with/without amounts
            await new Promise(resolve => setTimeout(resolve, 80));

            const element = tourCardRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#090f1d'
            });

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const safeCode = (previewTourLead.clientCode ? previewTourLead.clientCode.replace('/', '-') : 'Tour');
            const safeName = (previewTourLead.clientName || 'Guest').replace(/\s+/g, '_');
            link.download = `${safeCode}_${safeName}_${withPrice ? 'Quotation' : 'Itinerary'}.png`;
            link.href = image;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownloadOptionModal(null);
        } catch (err) {
            console.error('Error generating itinerary image:', err);
            alert('Failed to generate image. Please try again.');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // Convert Lead to Booking
    const handleConvertSubmit = async (e) => {
        e.preventDefault();
        try {
            const adv = Number(advancePayment) || 0;
            if (adv <= 0 && !adminOverride) {
                alert('Please enter advance received or check admin override checkbox');
                return;
            }

            let screenshotUrl = '';
            if (paymentScreenshotFile) {
                setIsUploadingScreenshot(true);
                const uploadFormData = new FormData();
                uploadFormData.append('file', paymentScreenshotFile);
                const uploadRes = await axios.post('/api/admin/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                screenshotUrl = uploadRes.data?.url || '';
                setIsUploadingScreenshot(false);
            }

            const { data } = await axios.post(`/api/leads/${convertingLead._id}/convert`, {
                advancePayment: adv,
                advancePaymentDate,
                paymentMode,
                paymentReference: paymentRef,
                bankAccountId: selectedBankId || null,
                paymentScreenshot: screenshotUrl,
                adminOverrideReason: adminOverride ? adminOverrideReason : ''
            });

            const codeToShow = convertingLead.clientCode || data.clientCode || data.booking?.clientCode || 'N/A';
            const bkgIdToShow = data.booking?.bookingId || data.bookingId;
            alert(`Booking confirmed successfully!\nClient Code: ${codeToShow}\nBooking ID: ${bkgIdToShow}\n\nThis lead has been converted and moved to Confirmed Bookings.`);
            
            setShowConvertModal(false);
            setPaymentScreenshotFile(null);
            fetchLeads();
            fetchCompanyBanks();
            const activeOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
            fetchSidebarLeads(activeOpt.tab);
        } catch (error) {
            console.error('Error converting lead to booking:', error);
            setIsUploadingScreenshot(false);
            alert(error.response?.data?.message || 'Failed to convert lead to booking');
        }
    };

    // Helper to safely parse lead date to year, month index, and day
    const parseLeadDateInfo = (rawDate) => {
        if (!rawDate) return null;
        if (typeof rawDate === 'string' && rawDate.length >= 10) {
            const parts = rawDate.slice(0, 10).split('-');
            if (parts.length === 3) {
                const yr = parseInt(parts[0], 10);
                const mo = parseInt(parts[1], 10) - 1;
                const dy = parseInt(parts[2], 10);
                if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
                    return { year: yr, monthIdx: mo, day: dy };
                }
            }
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return null;
        return {
            year: d.getFullYear(),
            monthIdx: d.getMonth(),
            day: d.getDate()
        };
    };

    // Helper: check if lead is confirmed / advance arrived
    const isLeadConfirmed = (lead) => {
        if (!lead) return false;
        if (lead.status === 'Cancelled' || lead.status === 'Lost' || lead.priority === 'Lost') return false;
        return lead.status === 'Confirmed' || lead.status === 'Completed' || lead.status === 'Converted' || !!lead.bookingId || Number(lead.advancePayment) > 0;
    };

    // Helper: check if a confirmed lead's ride date has completed (travelEndDate < today)
    const isLeadRideCompleted = (lead) => {
        if (!lead || !isLeadConfirmed(lead)) return false;
        if (lead.status === 'Completed') return true;
        const todayStr = toLocalDateString(new Date());
        const eDateStr = toLocalDateString(lead.travelEndDate || lead.travelStartDate);
        return !!(eDateStr && eDateStr < todayStr);
    };

    // Helper: check if lead is Lost (Cancelled, manually set to Lost, or unconfirmed with past travel date)
    const isLeadLost = (lead) => {
        if (!lead) return false;
        if (lead.priority === 'Lost' || lead.status === 'Lost' || lead.status === 'Cancelled') return true;
        if (isLeadConfirmed(lead)) return false;
        const todayStr = toLocalDateString(new Date());
        const eDateStr = toLocalDateString(lead.travelEndDate || lead.travelStartDate);
        if (eDateStr && eDateStr < todayStr) return true;
        return false;
    };

    // FY Month Lead Arrival Counts (working 100% according to Daily Breakdown logic)
    const fyMonthLeadCounts = useMemo(() => {
        const sourceList = (leads && leads.length > 0) ? leads : sidebarLeads;
        const validLeads = sourceList || [];
        const byMonth = {};
        let totalFyLeads = 0;

        SIDEBAR_MONTH_OPTIONS.forEach(opt => {
            const count = validLeads.filter(l => {
                const d = parseLeadDateInfo(l.leadDate || l.createdAt);
                return d && d.year === opt.year && d.monthIdx === opt.monthIdx;
            }).length;
            byMonth[opt.label] = count;
            totalFyLeads += count;
        });

        return { byMonth, totalFyLeads };
    }, [leads, sidebarLeads, SIDEBAR_MONTH_OPTIONS]);

    // Base leads for the selected period:
    // - If fyLeadMonthFilter !== 'All': filters by Lead Arrival Month (Daily Breakdown logic: leadDate || createdAt)
    // - Else if monthFilter !== 'All': strictly filters by Travel Month (travelStartDate || leadDate || createdAt)
    // - Else: filters by selectedFy
    const basePeriodLeads = useMemo(() => {
        return (leads || []).filter(lead => {
            if (fyLeadMonthFilter && fyLeadMonthFilter !== 'All') {
                const activeFyOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === fyLeadMonthFilter);
                if (activeFyOpt) {
                    const d = parseLeadDateInfo(lead.leadDate || lead.createdAt);
                    return !!(d && d.year === activeFyOpt.year && d.monthIdx === activeFyOpt.monthIdx);
                }
            }

            if (monthFilter && monthFilter !== 'All') {
                const activeTabOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.tab === monthFilter);
                const d = parseLeadDateInfo(lead.travelStartDate || lead.leadDate || lead.createdAt);
                if (!d || !activeTabOpt) return false;
                if (selectedFy && selectedFy !== 'All FY') {
                    return d.year === activeTabOpt.year && d.monthIdx === activeTabOpt.monthIdx;
                }
                return d.monthIdx === activeTabOpt.monthIdx;
            }

            if (selectedFy && selectedFy !== 'All FY') {
                const itemFy = getFinancialYear(lead.travelStartDate || lead.travelEndDate || lead.leadDate || lead.createdAt);
                if (itemFy && itemFy !== selectedFy) return false;
            }

            return true;
        });
    }, [leads, fyLeadMonthFilter, monthFilter, selectedFy, SIDEBAR_MONTH_OPTIONS]);

    // Calculate month-wise breakdown across All, Confirmed, Cancelled, Lost, and Open
    const statusCounts = useMemo(() => {
        let totalCount = 0;
        let totalAmt = 0;
        let confirmedCount = 0;
        let confirmedAmt = 0;
        let cancelledCount = 0;
        let cancelledAmt = 0;
        let lostCount = 0;
        let lostAmt = 0;
        let openCount = 0;
        let openAmt = 0;

        (basePeriodLeads || []).forEach(lead => {
            const amt = Number(lead.totalAmount) || 0;
            totalCount += 1;
            totalAmt += amt;

            if (isLeadConfirmed(lead)) {
                confirmedCount += 1;
                confirmedAmt += amt;
            } else if (isLeadLost(lead)) {
                lostCount += 1;
                lostAmt += amt;
                if (lead.status === 'Cancelled') {
                    cancelledCount += 1;
                    cancelledAmt += amt;
                }
            } else {
                openCount += 1;
                openAmt += amt;
            }
        });

        return {
            total: { count: totalCount, amount: totalAmt },
            confirmed: { count: confirmedCount, amount: confirmedAmt },
            cancelled: { count: cancelledCount, amount: cancelledAmt },
            lost: { count: lostCount, amount: lostAmt },
            open: { count: openCount, amount: openAmt }
        };
    }, [basePeriodLeads]);

    // Priority / Interest Level counts and total values (including Lost and Sold leads)
    const priorityCounts = useMemo(() => {
        let allCount = 0;
        let allAmount = 0;
        let hot = 0;
        let hotAmount = 0;
        let warm = 0;
        let warmAmount = 0;
        let cold = 0;
        let coldAmount = 0;
        let lost = 0;
        let lostAmount = 0;
        let sold = 0;
        let soldAmount = 0;

        (basePeriodLeads || []).forEach(lead => {
            if (sourceFilter !== 'All' && lead.source !== sourceFilter) return;
            if (salesPersonFilter !== 'All' && lead.salesPerson !== salesPersonFilter) return;

            if (searchTerm && searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const matches =
                    (lead.clientName || '').toLowerCase().includes(q) ||
                    (lead.travelAgentName || '').toLowerCase().includes(q) ||
                    (lead.mobileNumber || '').toLowerCase().includes(q) ||
                    (lead.travelAgentMobile || '').toLowerCase().includes(q) ||
                    (lead.clientCode || lead.leadId || '').toLowerCase().includes(q) ||
                    (lead.source || '').toLowerCase().includes(q) ||
                    (lead.salesPerson || '').toLowerCase().includes(q);
                if (!matches) return;
            }

            const amt = Number(lead.totalAmount) || 0;
            allCount += 1;
            allAmount += amt;

            const lostLead = isLeadLost(lead);
            const confirmedLead = isLeadConfirmed(lead);

            if (confirmedLead) {
                sold += 1;
                soldAmount += amt;
            } else if (lostLead) {
                lost += 1;
                lostAmount += amt;
            } else {
                // Only upcoming unconfirmed leads without advance count in Hot / Warm / Cold
                if (lead.priority === 'Hot') {
                    hot += 1;
                    hotAmount += amt;
                } else if (lead.priority === 'Warm') {
                    warm += 1;
                    warmAmount += amt;
                } else if (lead.priority === 'Cold') {
                    cold += 1;
                    coldAmount += amt;
                }
            }
        });

        return {
            All: allCount,
            allAmount,
            Hot: hot,
            hotAmount,
            Warm: warm,
            warmAmount,
            Cold: cold,
            coldAmount,
            Lost: lost,
            lostAmount,
            Sold: sold,
            soldAmount
        };
    }, [basePeriodLeads, sourceFilter, salesPersonFilter, searchTerm]);

    // All leads for the selected period are shown, filterable by status/priority and sorted sequentially
    const filteredLeads = useMemo(() => {
        const filtered = (basePeriodLeads || []).filter(lead => {
            const lostLead = isLeadLost(lead);
            const confirmedLead = isLeadConfirmed(lead);

            // Status Filter
            if (statusFilter === 'Confirmed') {
                if (!confirmedLead) return false;
            } else if (statusFilter === 'Cancelled') {
                if (lead.status !== 'Cancelled') return false;
            } else if (statusFilter === 'Lost') {
                if (!lostLead) return false;
            } else if (statusFilter === 'Open') {
                if (confirmedLead || lostLead) return false;
            }

            if (sourceFilter !== 'All' && lead.source !== sourceFilter) return false;
            if (salesPersonFilter !== 'All' && lead.salesPerson !== salesPersonFilter) return false;

            // Priority / Interest Level Filter:
            // - All Levels: shows ALL leads (Lost, Confirmed/Sold, Upcoming Open)
            // - Sold: shows all Confirmed & Completed rides for the selected month
            // - Lost: shows all Lost leads (Cancelled + Past travel date without advance + Manually marked Lost)
            // - Hot / Warm / Cold: shows ONLY upcoming leads without advance (!lostLead && !confirmedLead)
            if (priorityFilter === 'Sold') {
                if (!confirmedLead) return false;
            } else if (priorityFilter === 'Lost') {
                if (!lostLead) return false;
            } else if (priorityFilter !== 'All') {
                const leadPriority = lead.priority || 'Unassigned';
                if (lostLead || confirmedLead || leadPriority !== priorityFilter) return false;
            }

            // Instant Live Search by Name / Phone / Agent / Code / Salesperson
            if (searchTerm && searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const cName = (lead.clientName || '').toLowerCase();
                const aName = (lead.travelAgentName || '').toLowerCase();
                const phone = (lead.mobileNumber || '').toLowerCase();
                const aPhone = (lead.travelAgentMobile || '').toLowerCase();
                const code = (lead.clientCode || lead.leadId || '').toLowerCase();
                const src = (lead.source || '').toLowerCase();
                const sp = (lead.salesPerson || '').toLowerCase();

                const matches = cName.includes(q) ||
                    aName.includes(q) ||
                    phone.includes(q) ||
                    aPhone.includes(q) ||
                    code.includes(q) ||
                    src.includes(q) ||
                    sp.includes(q);

                if (!matches) return false;
            }

            return true;
        });

        // Sequential sorting by Lead ID / Client Code (e.g. 10/01, 10/02... 10/66) or chosen sort field
        filtered.sort((a, b) => {
            if (sortField === 'clientCode') {
                const parseCode = (c) => {
                    if (!c) return 0;
                    const m = String(c).trim().match(/^(\d+)\/(\d+)$/);
                    if (m) {
                        return parseInt(m[1], 10) * 100000 + parseInt(m[2], 10);
                    }
                    const nums = String(c).match(/\d+/g);
                    if (nums) return parseInt(nums.join(''), 10);
                    return 0;
                };
                const valA = parseCode(a.clientCode || a.leadId);
                const valB = parseCode(b.clientCode || b.leadId);
                if (valA !== valB) {
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                }
                return sortOrder === 'asc'
                    ? String(a.clientCode || a.leadId || '').localeCompare(String(b.clientCode || b.leadId || ''))
                    : String(b.clientCode || b.leadId || '').localeCompare(String(a.clientCode || a.leadId || ''));
            }

            if (sortField === 'date') {
                const dateA = new Date(a.leadDate || a.createdAt).getTime() || 0;
                const dateB = new Date(b.leadDate || b.createdAt).getTime() || 0;
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (sortField === 'price') {
                const priceA = Number(a.totalAmount) || 0;
                const priceB = Number(b.totalAmount) || 0;
                return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
            }

            return 0;
        });

        return filtered;
    }, [basePeriodLeads, statusFilter, sourceFilter, salesPersonFilter, searchTerm, priorityFilter, sortField, sortOrder]);

    // Unique sales persons
    const salesPersonsList = useMemo(() => {
        const set = new Set();
        leads.forEach(l => { if (l.salesPerson) set.add(l.salesPerson); });
        return Array.from(set);
    }, [leads]);

    // Pre-index companyBookings by _id, bookingId, and clientCode for O(1) lookup
    const bookingLookupMap = useMemo(() => {
        const map = new Map();
        (companyBookings || []).forEach(b => {
            if (b._id) map.set(String(b._id), b);
            if (b.bookingId) map.set(String(b.bookingId), b);
            if (b.clientCode) map.set(String(b.clientCode), b);
        });
        return map;
    }, [companyBookings]);

    // Calculate Right Sidebar daily breakdown and totals in a single pass O(N)
    const sidebarStats = useMemo(() => {
        const activeOption = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
        const { monthIdx, year, days } = activeOption;
        const sourceList = (sidebarLeads && sidebarLeads.length > 0) ? sidebarLeads : leads;

        let totalLeads = 0;
        let totalLeadsAmt = 0;
        let totalConversions = 0;
        let totalConversionsAmt = 0;
        const dailyList = [];

        const allLeadsInMonth = sourceList || [];
        const dayLeadsByDay = Array.from({ length: days + 1 }, () => []);
        const convLeadsByDay = Array.from({ length: days + 1 }, () => []);

        for (let i = 0; i < allLeadsInMonth.length; i++) {
            const l = allLeadsInMonth[i];
            const dLead = parseLeadDateInfo(l.leadDate || l.createdAt);
            if (dLead && dLead.year === year && dLead.monthIdx === monthIdx && dLead.day >= 1 && dLead.day <= days) {
                dayLeadsByDay[dLead.day].push(l);
            }

            if (l.status !== 'Cancelled' && l.status !== 'Lost' && l.priority !== 'Lost' && (l.status === 'Confirmed' || l.status === 'Converted')) {
                const matchedBkg = (l.bookingId && bookingLookupMap.get(String(l.bookingId))) || (l.clientCode && bookingLookupMap.get(String(l.clientCode)));
                const convDateRaw = l.advanceDate || matchedBkg?.advanceDate || matchedBkg?.bookingDate || matchedBkg?.createdAt || l.leadDate || l.createdAt;
                const dConv = parseLeadDateInfo(convDateRaw);
                if (dConv && dConv.year === year && dConv.monthIdx === monthIdx && dConv.day >= 1 && dConv.day <= days) {
                    convLeadsByDay[dConv.day].push(l);
                }
            }
        }

        // Also ensure direct bookings from companyBookings are included as conversions if not already linked
        const countedBookingCodes = new Set();
        for (let d = 1; d <= days; d++) {
            convLeadsByDay[d].forEach(item => {
                if (item.bookingId) countedBookingCodes.add(String(item.bookingId));
                if (item.clientCode) countedBookingCodes.add(String(item.clientCode));
            });
        }

        if (Array.isArray(companyBookings)) {
            for (let i = 0; i < companyBookings.length; i++) {
                const b = companyBookings[i];
                if (!b || b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Lost') continue;
                const bCode = String(b.bookingId || b.clientCode || '');
                if (bCode && countedBookingCodes.has(bCode)) continue;

                const convDateRaw = b.advanceDate || b.bookingDate || b.travelStartDate || b.createdAt;
                const dConv = parseLeadDateInfo(convDateRaw);
                if (dConv && dConv.year === year && dConv.monthIdx === monthIdx && dConv.day >= 1 && dConv.day <= days) {
                    const adaptedLead = {
                        _id: b._id,
                        leadId: b.bookingId || b.clientCode,
                        clientCode: b.clientCode || b.bookingId,
                        bookingId: b.bookingId || b.clientCode,
                        clientName: b.clientName || 'Guest (TBA)',
                        mobileNumber: b.mobileNumber || '',
                        totalAmount: Number(b.totalAmount) || Number(b.packagePrice) || 0,
                        advanceAmount: Number(b.advancePaid) || 0,
                        advanceDate: convDateRaw,
                        status: 'Confirmed',
                        source: b.source || 'Live DRS Direct Booking',
                        isDirectBooking: true
                    };
                    convLeadsByDay[dConv.day].push(adaptedLead);
                    if (bCode) countedBookingCodes.add(bCode);
                }
            }
        }

        const now = new Date();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIdx;
        const today = now.getDate();

        for (let day = 1; day <= days; day++) {
            const dayLeads = dayLeadsByDay[day];
            const convLeads = convLeadsByDay[day];

            const leadsCount = dayLeads.length;
            const leadsAmt = dayLeads.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);
            const convCount = convLeads.length;
            const convAmt = convLeads.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);

            totalLeads += leadsCount;
            totalLeadsAmt += leadsAmt;
            totalConversions += convCount;
            totalConversionsAmt += convAmt;

            const isToday = isCurrentMonth && day === today;

            dailyList.push({ day, leadsCount, leadsAmt, convCount, convAmt, leads: dayLeads, convLeads: convLeads, isToday });
        }

        dailyList.sort((a, b) => {
            if (isCurrentMonth) {
                if (a.day === today) return -1;
                if (b.day === today) return 1;
            }
            return a.day - b.day;
        });

        return {
            totalLeads,
            totalLeadsAmt,
            totalConversions,
            totalConversionsAmt,
            dailyList
        };
    }, [sidebarLeads, leads, companyBookings, bookingLookupMap, selectedSidebarMonth, SIDEBAR_MONTH_OPTIONS]);

    // KPI Summary Calculations
    const kpiData = useMemo(() => {
        let totalQuote = 0;

        filteredLeads.forEach(l => {
            const amt = Number(l.totalAmount) || 0;
            totalQuote += amt;
        });

        return {
            totalQuote,
            totalLeadsCount: filteredLeads.length
        };
    }, [filteredLeads]);

    // Helper to calculate trip relative timing badge (English only)
    const getTripTimingBadge = (bkg) => {
        if (bkg.bookingStatus === 'Cancelled' || bkg.bookingStatus === 'Lost') {
            return { label: '❌ Cancelled / Lost', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = bkg.travelStartDate ? new Date(bkg.travelStartDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = (bkg.travelEndDate || bkg.travelStartDate) ? new Date(bkg.travelEndDate || bkg.travelStartDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (bkg.bookingStatus === 'Completed' || (end && end < today)) {
            return { label: '🏁 Trip Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
        }
        if (start && end && today >= start && today <= end) {
            return { label: '🚗 Ongoing / Live', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)' };
        }
        if (start && today < start) {
            const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
            const diffText = diffDays === 1 ? 'Starts Tomorrow' : `In ${diffDays} days`;
            return { label: `⏳ ${diffText}`, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' };
        }
        return { label: '🏁 Trip Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    };

    // Calculate Monthly Bookings, Upcoming, Ongoing, Completed & Cancelled Stats for this month
    const monthlyBookingStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Confirmed leads of this month/period
        const confirmedMonthLeads = (basePeriodLeads || []).filter(l => isLeadConfirmed(l));

        const list = confirmedMonthLeads.map(l => {
            const matchedBkg = (l.bookingId && bookingLookupMap.get(String(l.bookingId))) || (l.clientCode && bookingLookupMap.get(String(l.clientCode)));
            const effEndRaw = l.travelEndDate || matchedBkg?.travelEndDate || l.travelStartDate || matchedBkg?.travelStartDate;
            const effEnd = effEndRaw ? new Date(effEndRaw) : null;
            if (effEnd) effEnd.setHours(23, 59, 59, 999);
            const isComp = matchedBkg?.bookingStatus === 'Completed' || l.status === 'Completed' || !!(effEnd && effEnd < today);
            return {
                _id: matchedBkg?._id || l._id,
                bookingId: matchedBkg?.bookingId || l.bookingId || l.clientCode || l.leadId || 'BKG',
                clientCode: l.clientCode || matchedBkg?.clientCode,
                clientName: l.clientName || matchedBkg?.clientName,
                mobileNumber: l.mobileNumber || matchedBkg?.mobileNumber,
                travelStartDate: l.travelStartDate || matchedBkg?.travelStartDate,
                travelEndDate: l.travelEndDate || matchedBkg?.travelEndDate,
                vehicleType: l.carType || matchedBkg?.vehicleType,
                numberOfCars: l.numberOfCars || matchedBkg?.numberOfCars || 1,
                totalAmount: Number(l.totalAmount || matchedBkg?.totalAmount) || 0,
                advancePaid: Number(matchedBkg?.advancePaid || l.advancePayment) || 0,
                bookingStatus: isComp ? 'Completed' : 'Confirmed',
                isLead: !matchedBkg
            };
        });

        const cancelledLeads = (basePeriodLeads || []).filter(l => l.status === 'Cancelled' || l.status === 'Lost' || l.priority === 'Lost');
        const formattedCancelledLeads = cancelledLeads.map(l => ({
            _id: l._id,
            bookingId: l.leadId || l.clientCode || 'LEAD',
            clientCode: l.clientCode,
            clientName: l.clientName,
            mobileNumber: l.mobileNumber,
            travelStartDate: l.travelStartDate,
            travelEndDate: l.travelEndDate,
            vehicleType: l.carType || l.vehicleType,
            numberOfCars: l.numberOfCars || 1,
            totalAmount: Number(l.totalAmount) || 0,
            advancePaid: Number(l.advancePayment) || 0,
            bookingStatus: (l.priority === 'Lost' || l.status === 'Lost') ? 'Lost' : (l.status || 'Cancelled'),
            isLead: true
        }));

        const upcomingList = [];
        const ongoingList = [];
        const completedList = [];

        list.forEach(b => {
            const start = b.travelStartDate ? new Date(b.travelStartDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            const end = (b.travelEndDate || b.travelStartDate) ? new Date(b.travelEndDate || b.travelStartDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            if (end && end < today) {
                completedList.push(b);
            } else if (start && end && today >= start && today <= end) {
                ongoingList.push(b);
            } else if (start && start > today) {
                upcomingList.push(b);
            } else {
                upcomingList.push(b);
            }
        });

        const total = list.length;
        const totalAmount = list.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);

        return {
            total,
            totalAmount,
            upcoming: upcomingList.length,
            upcomingAmount: upcomingList.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
            ongoing: ongoingList.length,
            ongoingAmount: ongoingList.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
            completed: completedList.length,
            completedAmount: completedList.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
            cancelled: formattedCancelledLeads.length,
            cancelledAmount: formattedCancelledLeads.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
            allList: list,
            upcomingList,
            ongoingList,
            completedList,
            cancelledList: formattedCancelledLeads
        };
    }, [companyBookings, basePeriodLeads]);

    const displayedModalBookings = useMemo(() => {
        let baseList = [];
        if (bookingsModalTab === 'All') baseList = monthlyBookingStats.allList;
        else if (bookingsModalTab === 'Upcoming') baseList = monthlyBookingStats.upcomingList;
        else if (bookingsModalTab === 'Ongoing') baseList = monthlyBookingStats.ongoingList;
        else if (bookingsModalTab === 'Completed') baseList = monthlyBookingStats.completedList;
        else if (bookingsModalTab === 'Cancelled') baseList = monthlyBookingStats.cancelledList;
        else baseList = monthlyBookingStats.allList;

        if (!bookingsModalSearch.trim()) return baseList;
        const term = bookingsModalSearch.toLowerCase().trim();
        return baseList.filter(b => {
            return (
                (b.clientName && b.clientName.toLowerCase().includes(term)) ||
                (b.bookingId && b.bookingId.toLowerCase().includes(term)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(term)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(term)) ||
                (b.clientCode && b.clientCode.toLowerCase().includes(term))
            );
        });
    }, [bookingsModalTab, bookingsModalSearch, monthlyBookingStats]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLeads.slice(start, start + itemsPerPage);
    }, [filteredLeads, currentPage]);

    // Formatters
    const formatCreatedDate = (dateVal) => {
        if (!dateVal) return 'N/A';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTravelMonth = (startDate, endDate) => {
        if (!startDate) return { month: 'TBA', days: 1 };
        const s = new Date(startDate);
        const mStr = isNaN(s.getTime()) ? 'TBA' : s.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        let days = 1;
        if (endDate) {
            const e = new Date(endDate);
            if (!isNaN(e.getTime()) && !isNaN(s.getTime())) {
                const diffTime = Math.abs(e - s);
                days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
            }
        }
        return { month: mStr, days };
    };

    const renderSourceIcon = (source) => {
        const s = (source || '').toLowerCase();
        if (s.includes('google')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                    <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '13px' }}>G</span> Google Ads
                </span>
            );
        }
        if (s.includes('referral')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                    <Share2 size={13} color="#38bdf8" /> Referral
                </span>
            );
        }
        if (s.includes('hotel')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#facc15' }}>
                    <Building2 size={13} color="#facc15" /> Hotel
                </span>
            );
        }
        if (s.includes('repeat')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                    <Repeat size={13} color="#4ade80" /> Repeat Guest
                </span>
            );
        }
        if (s.includes('website')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#818cf8' }}>
                    <Globe size={13} color="#818cf8" /> Website
                </span>
            );
        }
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}>
                <Briefcase size={13} color="var(--primary)" /> {source || 'Direct'}
            </span>
        );
    };

    const renderStatusPill = (status) => {
        switch (status) {
            case 'Confirmed':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        <CheckCircle size={12} /> Confirmed
                    </span>
                );
            case 'Open':
            case 'New':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                        <CircleDot size={12} /> {status === 'New' ? 'Open' : status}
                    </span>
                );
            case 'Converted':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(20, 184, 166, 0.15)',
                        color: '#2dd4bf',
                        border: '1px solid rgba(20, 184, 166, 0.3)'
                    }}>
                        <BarChart2 size={12} /> Converted
                    </span>
                );
            case 'Dead':
            case 'Lost':
            case 'Cancelled':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <XCircle size={12} /> {status === 'Cancelled' || status === 'Lost' ? 'Dead' : status}
                    </span>
                );
            default:
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        <Clock size={12} /> {status}
                    </span>
                );
        }
    };

    // Dark sleek input styles matching the reference image
    const darkInputStyle = {
        background: '#0a101d',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        color: '#f1f5f9',
        colorScheme: 'dark',
        padding: '10px 14px',
        fontSize: '13px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.65)',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        display: 'block',
        marginBottom: '6px'
    };

    return (
        <div className="container-fluid" style={{ padding: '24px', minHeight: '100vh', background: 'transparent' }}>
            <SEO title="Open - Leads & Quotes" description="Manage taxi fleet sales leads, client codes, quotes and conversions." />

            {/* 1. Header with 'Sales God' Title & KPI Summary Cards */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '20px'
            }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <BarChart3 size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                            Sales God
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>
                            Enterprise Lead Management & Quotation Engine
                        </p>
                    </div>
                </div>

                {/* Right side KPIs + Create Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    {/* Monthly Bookings Overview Button */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowBookingsModal(true)}
                        title={`View Bookings for ${selectedSidebarMonth}`}
                        style={{
                            height: '42px',
                            padding: '0 16px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s',
                            fontSize: '13px',
                            fontWeight: '800'
                        }}
                    >
                        <Calendar size={18} />
                        <span>{monthFilter === 'All' ? 'Monthly' : monthFilter} Bookings</span>
                        <span style={{
                            background: 'rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '900',
                            marginLeft: '2px'
                        }}>
                            {monthlyBookingStats.total}
                        </span>
                    </motion.button>

                    {/* Total Quote Card */}
                    <div style={{
                        background: 'rgba(30, 58, 138, 0.35)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '14px',
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: '170px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa'
                        }}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Total Quote</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>₹{kpiData.totalQuote.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '10px', color: '#93c5fd' }}>Across {kpiData.totalLeadsCount} leads</div>
                        </div>
                    </div>

                    {/* Tally-Style Daily Breakdown Drawer Button */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowRightSidebar(!showRightSidebar)}
                        title={showRightSidebar ? "Close Daily Breakdown" : "Open Daily Breakdown (Tally Sidebar)"}
                        style={{
                            height: '42px',
                            padding: '0 16px',
                            borderRadius: '12px',
                            background: showRightSidebar ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: showRightSidebar ? '1px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.35)',
                            color: '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s',
                            fontSize: '13px',
                            fontWeight: '800'
                        }}
                    >
                        <BarChart3 size={18} />
                        <span>Daily Breakdown</span>
                    </motion.button>

                    {/* + Create a Lead Button */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOpenModal()}
                        style={{
                            background: '#fbbf24',
                            color: '#000',
                            border: 'none',
                            borderRadius: '30px',
                            padding: '12px 22px',
                            fontSize: '14px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 18px rgba(251, 191, 36, 0.35)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} /> Create a Lead
                    </motion.button>
                </div>
            </header>

            {/* 2. FY Selector & Month Tabs Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    maxWidth: '100%'
                }}>
                    {/* FY Dropdown */}
                    <div style={{ position: 'relative', zIndex: 110, flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => setShowFyDropdown(!showFyDropdown)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span>{selectedFy}</span>
                            <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.6)', transform: showFyDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {showFyDropdown && (
                            <>
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                                    onClick={() => setShowFyDropdown(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    background: '#0f172a',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px',
                                    zIndex: 1000,
                                    minWidth: '120px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                                    overflow: 'hidden'
                                }}>
                                    {fyOptions.map(fy => (
                                        <div
                                            key={fy}
                                            onClick={() => {
                                                setSelectedFy(fy);
                                                setFyLeadMonthFilter('All');
                                                setCustomSidebarMonth(null);
                                                setShowFyDropdown(false);
                                            }}
                                            style={{
                                                padding: '9px 14px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                color: selectedFy === fy ? '#fbbf24' : 'rgba(255,255,255,0.8)',
                                                background: selectedFy === fy ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedFy !== fy) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedFy !== fy) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {fy}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Month Pills Container (Strictly filters by Travel Month) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none'
                    }}>
                        {MONTH_TABS.map(m => {
                            const isActive = monthFilter === m && fyLeadMonthFilter === 'All';
                            return (
                                <button
                                    key={m}
                                    onClick={() => {
                                        setCustomSidebarMonth(null);
                                        setFyLeadMonthFilter('All');
                                        setMonthFilter(m);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        background: isActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.03)',
                                        color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                                        fontWeight: isActive ? '800' : '600',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>


                </div>
            </div>

            {/* Main Content Layout: Table & Pagination */}
            <div style={{ width: '100%', position: 'relative' }}>
                {/* Full Width Table Content */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>



                    {/* 3. Filter Bar: Search + FY Month (Daily Breakdown) + Sales Person Dropdown + Source Dropdown */}
                    <div className="glass-card" style={{
                        padding: '14px 18px',
                        marginBottom: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        {/* Instant Live Search Input */}
                        <form onSubmit={(e) => { e.preventDefault(); fetchLeads(); }} style={{ flex: '1 1 280px', display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type="text"
                                    placeholder="Type client or agent name, phone, code to search..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        ...darkInputStyle,
                                        paddingLeft: '40px',
                                        paddingRight: searchTerm ? '38px' : '14px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '10px'
                                    }}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCurrentPage(1);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Clear Search"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                            <button type="submit" className="primary-btn" style={{ padding: '0 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
                                Search
                            </button>
                        </form>

                {/* Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* FY Month Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Calendar size={14} color="#fbbf24" />
                        <select
                            value={fyLeadMonthFilter}
                            onChange={e => {
                                const val = e.target.value;
                                setFyLeadMonthFilter(val);
                                if (val !== 'All') {
                                    setMonthFilter('All');
                                    setCustomSidebarMonth(val);
                                } else {
                                    setCustomSidebarMonth(null);
                                }
                                setCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter by FY Month</option>
                            {SIDEBAR_MONTH_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.label} style={{ background: '#0f172a' }}>
                                    {opt.label} ({fyMonthLeadCounts.byMonth[opt.label] || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sales Person Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Users size={14} color="#38bdf8" />
                        <select
                            value={salesPersonFilter}
                            onChange={e => {
                                setSalesPersonFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter by Sales Person</option>
                            {salesPersonsList.map(sp => (
                                <option key={sp} value={sp} style={{ background: '#0f172a' }}>{sp}</option>
                            ))}
                        </select>
                    </div>

                    {/* Source Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Filter size={14} color="var(--primary)" />
                        <select
                            value={sourceFilter}
                            onChange={e => {
                                setSourceFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter by Source</option>
                            {ALL_SOURCES.map(src => (
                                <option key={src} value={src} style={{ background: '#0f172a' }}>{src}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Priority / Interest Level Filter Boxes with Count & Value */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', padding: '0 4px' }}>
                {[
                    { key: 'All', label: 'All Levels', count: priorityCounts.All, amount: priorityCounts.allAmount, color: '#38bdf8', activeBg: 'rgba(56, 189, 248, 0.14)' },
                    { key: 'Hot', label: '🔥 Hot', count: priorityCounts.Hot, amount: priorityCounts.hotAmount, color: '#fbbf24', activeBg: 'rgba(251, 191, 36, 0.14)' },
                    { key: 'Warm', label: '☀️ Warm', count: priorityCounts.Warm, amount: priorityCounts.warmAmount, color: '#38bdf8', activeBg: 'rgba(56, 189, 248, 0.14)' },
                    { key: 'Cold', label: '❄️ Cold', count: priorityCounts.Cold, amount: priorityCounts.coldAmount, color: '#94a3b8', activeBg: 'rgba(148, 163, 184, 0.14)' },
                    { key: 'Lost', label: '❌ Lost', count: priorityCounts.Lost, amount: priorityCounts.lostAmount, color: '#f87171', activeBg: 'rgba(239, 68, 68, 0.14)' },
                    { key: 'Sold', label: '✅ Sold', count: priorityCounts.Sold, amount: priorityCounts.soldAmount, color: '#34d399', activeBg: 'rgba(16, 185, 129, 0.14)' }
                ].map(box => {
                    const isActive = priorityFilter === box.key;
                    return (
                        <button
                            key={box.key}
                            onClick={() => { setPriorityFilter(box.key); setCurrentPage(1); }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: isActive ? `1px solid ${box.color}` : '1px solid rgba(255,255,255,0.1)',
                                background: isActive ? box.activeBg : 'rgba(255,255,255,0.04)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: '11.5px', fontWeight: '800', color: isActive ? box.color : '#ffffff' }}>
                                {box.label} ({box.count})
                            </span>
                            <span style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: '800',
                                background: 'rgba(0,0,0,0.35)',
                                color: box.color,
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                ₹{Number(box.amount || 0).toLocaleString('en-IN')}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 4. Leads Table Matching Reference Design */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '14px' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th 
                                onClick={() => {
                                    if (sortField === 'date') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    else { setSortField('date'); setSortOrder('desc'); }
                                }}
                                style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: sortField === 'date' ? '#38bdf8' : 'rgba(255,255,255,0.7)', letterSpacing: '0.3px', cursor: 'pointer', userSelect: 'none' }}
                                title="Click to sort by date"
                            >
                                Lead Created {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                                onClick={() => {
                                    if (sortField === 'clientCode') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    else { setSortField('clientCode'); setSortOrder('desc'); }
                                }}
                                style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: sortField === 'clientCode' ? '#38bdf8' : 'rgba(255,255,255,0.7)', letterSpacing: '0.3px', cursor: 'pointer', userSelect: 'none' }}
                                title="Click to sort sequentially by Lead ID / Code"
                            >
                                Lead ID / Code {sortField === 'clientCode' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Status ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Source ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Travel Dates ↕
                            </th>
                            <th 
                                onClick={() => {
                                    if (sortField === 'price') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    else { setSortField('price'); setSortOrder('desc'); }
                                }}
                                style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: sortField === 'price' ? '#38bdf8' : 'rgba(255,255,255,0.7)', letterSpacing: '0.3px', cursor: 'pointer', userSelect: 'none' }}
                                title="Click to sort by price"
                            >
                                Price {sortField === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Last Remark ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div className="loader" style={{ margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Loading leads...</div>
                                </td>
                            </tr>
                        ) : paginatedLeads.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
                                    No leads found for this filter. Click <strong>+ Create a Lead</strong> to get started!
                                </td>
                            </tr>
                        ) : paginatedLeads.map((lead) => {
                            const travelInfo = formatTravelMonth(lead.travelStartDate, lead.travelEndDate);
                            const leadLost = isLeadLost(lead);
                            const leadConfirmed = isLeadConfirmed(lead);
                            const leadRideCompleted = isLeadRideCompleted(lead);

                            return (
                                <tr key={lead._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }}>
                                    {/* 1. Lead Created */}
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                                        {formatCreatedDate(lead.leadDate || lead.createdAt)}
                                    </td>

                                    {/* 2. Client Code (MM/SS with Tooltip) */}
                                    <td style={{ padding: '16px 20px', position: 'relative' }}>
                                        <div
                                            style={{ position: 'relative', display: 'inline-block' }}
                                            onMouseEnter={() => setHoveredLeadId(lead._id)}
                                            onMouseLeave={() => setHoveredLeadId(null)}
                                        >
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#38bdf8',
                                                fontWeight: '900',
                                                fontSize: '15px',
                                                cursor: 'pointer'
                                            }}>
                                                <User size={15} color="#38bdf8" />
                                                <span>{lead.clientCode || lead.leadId || 'N/A'}</span>
                                            </div>
                                            {((lead.priority && lead.priority !== 'Unassigned') || leadLost) && (
                                                <div style={{ marginTop: '4px', display: 'flex' }}>
                                                    <div style={{ fontSize: '9px', fontWeight: '800', display: 'inline-block', padding: '2px 6px', borderRadius: '10px', background: leadLost ? 'rgba(239, 68, 68, 0.15)' : lead.priority === 'Hot' ? 'rgba(251, 191, 36, 0.15)' : lead.priority === 'Warm' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: leadLost ? '#f87171' : lead.priority === 'Hot' ? '#fbbf24' : lead.priority === 'Warm' ? '#38bdf8' : '#94a3b8', border: leadLost ? '1px solid rgba(239, 68, 68, 0.35)' : lead.priority === 'Hot' ? '1px solid rgba(251, 191, 36, 0.3)' : lead.priority === 'Warm' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)' }}>
                                                        {leadLost ? '❌ Lost' : lead.priority === 'Hot' ? '🔥 High' : lead.priority === 'Warm' ? '☀️ Avg' : '❄️ Low'}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hover Tooltip matching Image 1 */}
                                            {hoveredLeadId === lead._id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '110%',
                                                    left: '0',
                                                    background: '#0a0f1d',
                                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                                    zIndex: 100,
                                                    minWidth: '150px'
                                                }}>
                                                    <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <User size={11} color="#38bdf8" /> {lead.clientName}
                                                    </div>
                                                    <div style={{ color: '#38bdf8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                        <Phone size={11} /> {lead.mobileNumber}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* 3. Status Badge */}
                                    <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                        {leadRideCompleted ? (
                                            <span style={{
                                                background: 'rgba(56, 189, 248, 0.15)',
                                                color: '#38bdf8',
                                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <CheckCircle size={13} color="#38bdf8" /> Completed
                                            </span>
                                        ) : leadConfirmed ? (
                                            <span style={{
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <CheckCircle size={13} color="#10b981" /> Confirmed
                                            </span>
                                        ) : lead.status === 'Cancelled' ? (
                                            <span style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <XCircle size={13} color="#ef4444" /> Cancelled
                                            </span>
                                        ) : leadLost ? (
                                            <span style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#f87171',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <XCircle size={13} color="#f87171" /> Lost
                                            </span>
                                        ) : (
                                            <span style={{
                                                background: 'rgba(251, 191, 36, 0.15)',
                                                color: '#fbbf24',
                                                border: '1px solid rgba(251, 191, 36, 0.35)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <CircleDot size={13} color="#fbbf24" /> {lead.status || 'Open'}
                                            </span>
                                        )}
                                    </td>

                                    {/* 4. Source */}
                                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>
                                        {renderSourceIcon(lead.source)}
                                    </td>

                                    {/* 5. Travel Dates */}
                                    <td style={{ padding: '16px 20px' }}>
                                        {lead.travelStartDate ? (() => {
                                            const totalStay = getDaysDifference(toLocalDateString(lead.travelStartDate), toLocalDateString(lead.travelEndDate || lead.travelStartDate));
                                            const exclDates = Array.isArray(lead.excludedDates) ? lead.excludedDates : [];
                                            const activeDays = exclDates.length > 0 ? Math.max(1, totalStay - exclDates.length) : totalStay;
                                            return (
                                                <div>
                                                    <div style={{ fontSize: '13px', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                        <Calendar size={13} color="#fbbf24" />
                                                        <span>
                                                            {formatTourDate(lead.travelStartDate)}
                                                            {lead.travelEndDate && toLocalDateString(lead.travelEndDate) !== toLocalDateString(lead.travelStartDate) && (
                                                                ` ➔ ${formatTourDate(lead.travelEndDate)}`
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                        {exclDates.length > 0 ? (
                                                            <>
                                                                <span style={{ color: '#34d399', fontWeight: '800' }}>🚗 {activeDays} Car Days</span>
                                                                <span>•</span>
                                                                <span>{totalStay}d Stay</span>
                                                                <span
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                        color: '#f87171',
                                                                        padding: '1px 6px',
                                                                        borderRadius: '5px',
                                                                        fontSize: '10px',
                                                                        fontWeight: '800'
                                                                    }}
                                                                    title={`Break / No Car Dates: ${exclDates.map(d => formatTourDate(d)).join(', ')}`}
                                                                >
                                                                    ⏸️ {exclDates.length} Break Day{exclDates.length > 1 ? 's' : ''}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span>{totalStay} Days Tour • {travelInfo.month}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>TBA</span>
                                        )}
                                    </td>

                                    {/* 6. Price */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>
                                            ₹{(lead.totalAmount || 0).toLocaleString('en-IN')}
                                        </div>
                                    </td>

                                    {/* 7. Last Remark */}
                                    <td style={{ padding: '16px 20px', maxWidth: '240px', verticalAlign: 'middle' }}>
                                        <InlineRemarkEditor lead={lead} fetchLeads={fetchLeads} setViewingImage={setViewingImage} customRemarks={customRemarks} setCustomRemarks={setCustomRemarks} selectedCompany={selectedCompany} />
                                    </td>

                                    {/* 8. Actions */}
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {/* Record Advance / Confirm action */}
                                            {leadRideCompleted ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const q = (searchTerm && searchTerm.trim()) ? searchTerm.trim() : (lead.clientCode || lead.bookingCode || lead.bookingId || '');
                                                        const d = new Date(lead.travelStartDate || lead.createdAt || 0);
                                                        const mList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                        const m = !isNaN(d.getTime()) ? mList[d.getMonth()] : 'All Months';
                                                        const fy = getFinancialYear(lead.travelStartDate || lead.travelEndDate || lead.createdAt) || selectedFy || 'FY 26-27';
                                                        const code = lead.clientCode || lead.bookingCode || lead.bookingId || '';
                                                        navigate(`/admin/completed-bookings?search=${encodeURIComponent(q)}&month=${encodeURIComponent(m)}&fy=${encodeURIComponent(fy)}&code=${encodeURIComponent(code)}`);
                                                    }}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                        color: '#38bdf8',
                                                        border: '1px solid rgba(56, 189, 248, 0.35)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Trip Completed - View in Completed Bookings"
                                                >
                                                    <CheckCircle size={12} /> Completed (View ➔)
                                                </button>
                                            ) : leadConfirmed ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const q = (searchTerm && searchTerm.trim()) ? searchTerm.trim() : (lead.clientCode || lead.bookingCode || lead.bookingId || '');
                                                        const d = new Date(lead.travelStartDate || lead.createdAt || 0);
                                                        const mList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                        const m = !isNaN(d.getTime()) ? mList[d.getMonth()] : 'All Months';
                                                        const fy = getFinancialYear(lead.travelStartDate || lead.travelEndDate || lead.createdAt) || selectedFy || 'FY 26-27';
                                                        const code = lead.clientCode || lead.bookingCode || lead.bookingId || '';
                                                        navigate(`/admin/bookings?search=${encodeURIComponent(q)}&month=${encodeURIComponent(m)}&fy=${encodeURIComponent(fy)}&code=${encodeURIComponent(code)}`);
                                                    }}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        background: 'rgba(34, 197, 94, 0.15)',
                                                        color: '#4ade80',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="View in Confirmed Bookings"
                                                >
                                                    <CheckCircle size={12} /> Confirmed (View ➔)
                                                </button>
                                             ) : (lead.status === 'Cancelled' || lead.status === 'Lost' || lead.priority === 'Lost') ? (
                                                <div style={{ display: 'inline-flex', gap: '5px' }}>
                                                    <button
                                                        onClick={() => handleReopenLead(lead)}
                                                        title="Restore Lead to Open / Active enquiries"
                                                        style={{
                                                            background: 'rgba(56, 189, 248, 0.15)',
                                                            color: '#38bdf8',
                                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: '800',
                                                            fontSize: '10.5px',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <RefreshCw size={11} /> Re-Open
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setConvertingLead(lead);
                                                            setAdvancePayment('');
                                                            setPaymentRef('');
                                                            setAdminOverride(false);
                                                            setShowConvertModal(true);
                                                        }}
                                                        title="Re-open & Confirm Booking"
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: '800',
                                                            fontSize: '10.5px',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <CheckCircle size={12} /> Re-Confirm
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setConvertingLead(lead);
                                                        setAdvancePayment('');
                                                        setPaymentRef('');
                                                        setAdminOverride(false);
                                                        setShowConvertModal(true);
                                                    }}
                                                    title="Record Advance & Confirm Booking (Moves to Confirmed Bookings)"
                                                    style={{
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        color: '#4ade80',
                                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                                        padding: '5px 8px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: '800',
                                                        fontSize: '10.5px',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <CheckCircle size={12} /> Confirm Lead
                                                </button>
                                            )}

                                            {/* Preview Tour & Quotation (Eye icon) */}
                                            <button
                                                onClick={() => setPreviewTourLead(lead)}
                                                title="View Tour Itinerary (Preview & Image Download)"
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.18)',
                                                    color: '#60a5fa',
                                                    border: '1px solid rgba(59, 130, 246, 0.35)',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <Eye size={14} />
                                            </button>

                                            {/* Edit */}
                                            <button
                                                onClick={() => handleOpenModal(lead)}
                                                title="Edit Lead"
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: 'none',
                                                    color: '#f1f5f9',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Edit size={14} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(lead._id)}
                                                title="Delete Lead"
                                                style={{
                                                    background: 'rgba(239,68,68,0.12)',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 5. Pagination Bar matching Reference Design */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 4px',
                marginTop: '10px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px'
            }}>
                <div>
                    Showing {paginatedLeads.length} of {filteredLeads.length} leads
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: currentPage === 1 ? 0.4 : 1
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: 'none',
                                background: currentPage === p ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                                color: currentPage === p ? '#000' : 'white',
                                fontWeight: currentPage === p ? '800' : '600',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: currentPage === totalPages ? 0.4 : 1
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

                </div>
            </div>

            {/* ========================================================================= */}
            {/* Tally-Style Full-Height Right Drawer for Daily Breakdown (Overlaid)       */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {showRightSidebar && (
                    <>
                        {/* Dark Backdrop Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setShowRightSidebar(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.72)',
                                backdropFilter: 'blur(3px)',
                                zIndex: 200000
                            }}
                        />

                        {/* Full Screen Height Drawer from Right */}
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: '420px',
                                maxWidth: '92vw',
                                height: '100vh',
                                background: '#070d19',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                                boxShadow: '-12px 0 45px rgba(0, 0, 0, 0.9)',
                                zIndex: 200001,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Drawer Top Header */}
                            <div style={{
                                padding: '18px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                position: 'relative'
                            }}>
                                <div
                                    onClick={() => setShowMonthDropdown(prev => !prev)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        background: showMonthDropdown ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.2s',
                                        userSelect: 'none'
                                    }}
                                    title="Click to select month"
                                >
                                    <div style={{ padding: '6px', background: 'rgba(251, 191, 36, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={18} color="#fbbf24" />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'white', letterSpacing: '0.3px' }}>
                                        {selectedSidebarMonth}
                                    </h3>
                                    <ChevronDown
                                        size={16}
                                        color="#94a3b8"
                                        style={{
                                            transform: showMonthDropdown ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s'
                                        }}
                                    />
                                </div>

                                {/* Month Dropdown Menu */}
                                {showMonthDropdown && (
                                    <>
                                        <div
                                            style={{
                                                position: 'fixed',
                                                inset: 0,
                                                zIndex: 200002
                                            }}
                                            onClick={() => setShowMonthDropdown(false)}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '68px',
                                                left: '20px',
                                                background: '#0d1527',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                borderRadius: '12px',
                                                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9)',
                                                zIndex: 200003,
                                                width: '210px',
                                                maxHeight: '320px',
                                                overflowY: 'auto',
                                                padding: '6px'
                                            }}
                                        >
                                            {SIDEBAR_MONTH_OPTIONS.map((opt) => {
                                                const isSelected = selectedSidebarMonth === opt.label;
                                                return (
                                                    <button
                                                        key={opt.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomSidebarMonth(opt.label);
                                                            setMonthFilter(opt.tab);
                                                            setShowMonthDropdown(false);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            padding: '9px 12px',
                                                            borderRadius: '8px',
                                                            background: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                                            color: isSelected ? '#fbbf24' : '#e2e8f0',
                                                            border: 'none',
                                                            fontSize: '13px',
                                                            fontWeight: isSelected ? '800' : '500',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span>{opt.label}</span>
                                                        {isSelected && (
                                                            <span
                                                                style={{
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    background: '#fbbf24'
                                                                }}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowRightSidebar(false)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    title="Close Drawer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Summary Box */}
                            <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                                <div style={{
                                    border: '1px solid rgba(251, 191, 36, 0.4)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(251, 191, 36, 0.02)'
                                }}>
                                    <div style={{ flex: 1, paddingRight: '15px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px' }}>Total Leads</div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: '1' }}>{sidebarStats.totalLeads}</div>
                                        <div style={{ fontSize: '15px', color: '#f8fafc', marginTop: '6px', fontWeight: '600' }}>₹{sidebarStats.totalLeadsAmt.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ flex: 1, paddingLeft: '20px' }}>
                                        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px' }}>Total Conversions</div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: '1' }}>{sidebarStats.totalConversions}</div>
                                        <div style={{ fontSize: '15px', color: '#f8fafc', marginTop: '6px', fontWeight: '600' }}>₹{sidebarStats.totalConversionsAmt.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div style={{
                                padding: '0 20px 12px 20px',
                                display: 'grid',
                                gridTemplateColumns: '64px 1fr 1fr 24px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                gap: '10px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Date</div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Leads</div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Conversion</div>
                                <div></div>
                            </div>

                            {/* Drawer Body (Scrollable Table) */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                                    {sidebarStats.dailyList.map(item => {
                                        const isExpanded = expandedDailyDay === item.day;
                                        const isHovered = hoveredDailyDay === item.day;
                                        const hasLeads = item.leadsCount > 0 || item.convCount > 0;
                                        const isToday = item.isToday;

                                        return (
                                            <div
                                                key={item.day}
                                                onMouseEnter={() => setHoveredDailyDay(item.day)}
                                                onMouseLeave={() => setHoveredDailyDay(null)}
                                                style={{
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                                    position: 'relative',
                                                    transition: 'background 0.2s',
                                                    background: isExpanded
                                                        ? 'rgba(251, 191, 36, 0.08)'
                                                        : isHovered && hasLeads
                                                        ? 'rgba(255, 255, 255, 0.04)'
                                                        : 'transparent',
                                                    borderRadius: isExpanded ? '10px' : '0'
                                                }}
                                            >
                                                {/* Row Summary Bar (Clickable) */}
                                                <div
                                                    onClick={() => {
                                                        if (hasLeads || item.convCount > 0) {
                                                            setExpandedDailyDay(prev => prev === item.day ? null : item.day);
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '64px 1fr 1fr 24px',
                                                        padding: '12px 6px',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        cursor: (hasLeads || item.convCount > 0) ? 'pointer' : 'default',
                                                        userSelect: 'none'
                                                    }}
                                                    title={hasLeads ? `Click to view ${item.leadsCount} lead${item.leadsCount > 1 ? 's' : ''}` : ''}
                                                >
                                                    {/* Date */}
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '15px', color: isToday ? '#fbbf24' : 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>{item.day}</span>
                                                            {isToday && (
                                                                <span style={{
                                                                    fontSize: '8.5px',
                                                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                                    color: '#000',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: '900',
                                                                    letterSpacing: '0.4px',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    Today
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Leads */}
                                                    <div>
                                                        <div style={{ fontSize: '15px', color: hasLeads ? (isToday ? '#fbbf24' : 'white') : 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '2px' }}>
                                                            {item.leadsCount}
                                                        </div>
                                                        <div style={{ fontSize: '12.5px', color: hasLeads ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                                                            ₹{item.leadsAmt.toLocaleString('en-IN')}
                                                        </div>
                                                    </div>

                                                    {/* Conversions */}
                                                    <div>
                                                        <div style={{ fontSize: '15px', color: item.convCount > 0 ? '#34d399' : 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '2px' }}>
                                                            {item.convCount}
                                                        </div>
                                                        <div style={{ fontSize: '12.5px', color: item.convCount > 0 ? '#34d399' : 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                                                            ₹{item.convAmt.toLocaleString('en-IN')}
                                                        </div>
                                                    </div>

                                                    {/* Chevron */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        {hasLeads && (
                                                            <ChevronDown
                                                                size={16}
                                                                style={{
                                                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.2s',
                                                                    color: isExpanded ? '#fbbf24' : 'rgba(255,255,255,0.4)'
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Hover Popover (Left of Drawer) */}
                                                {isHovered && !isExpanded && hasLeads && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            right: '100%',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            marginRight: '14px',
                                                            width: '320px',
                                                            background: '#091122',
                                                            border: '1px solid rgba(251, 191, 36, 0.5)',
                                                            boxShadow: '0 16px 40px rgba(0,0,0,0.85), 0 0 20px rgba(251, 191, 36, 0.15)',
                                                            borderRadius: '12px',
                                                            padding: '12px 14px',
                                                            zIndex: 200020,
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24' }}>
                                                                📅 Day {item.day} Leads ({item.leadsCount})
                                                            </span>
                                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>
                                                                Total: ₹{item.leadsAmt.toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'hidden' }}>
                                                            {item.leads.slice(0, 6).map((ld, lIdx) => (
                                                                <div
                                                                    key={ld._id || lIdx}
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        gap: '8px',
                                                                        padding: '5px 8px',
                                                                        background: 'rgba(255,255,255,0.03)',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: '800',
                                                                            color: '#fbbf24',
                                                                            background: 'rgba(251, 191, 36, 0.15)',
                                                                            padding: '1px 6px',
                                                                            borderRadius: '4px',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            #{ld.clientCode || ld.leadId || 'N/A'}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: '12px',
                                                                            color: 'white',
                                                                            fontWeight: '600',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis'
                                                                        }}>
                                                                            {ld.clientName || 'Guest'}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#34d399', whiteSpace: 'nowrap' }}>
                                                                        ₹{(Number(ld.totalAmount) || 0).toLocaleString('en-IN')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {item.leads.length > 6 && (
                                                                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', marginTop: '2px' }}>
                                                                    +{item.leads.length - 6} more leads (Click row to see all)
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '10.5px', color: '#fbbf24', textAlign: 'center', fontWeight: '600' }}>
                                                            👆 Click row to expand & keep open
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Click-to-Expand Accordion Body */}
                                                {isExpanded && (
                                                    <div
                                                        style={{
                                                            padding: '12px 14px',
                                                            marginBottom: '10px',
                                                            background: 'rgba(11, 19, 36, 0.95)',
                                                            border: '1px solid rgba(251, 191, 36, 0.35)',
                                                            borderRadius: '10px',
                                                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
                                                        }}
                                                    >
                                                        {/* Header inside accordion */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                            <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>📋 Leads on Day {item.day} ({item.leadsCount})</span>
                                                            </div>
                                                            <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#38bdf8' }}>
                                                                Total: ₹{item.leadsAmt.toLocaleString('en-IN')}
                                                            </span>
                                                        </div>

                                                        {/* Leads List */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                                                            {item.leads.map((ld, lIdx) => {
                                                                const isConfirmed = ld.status === 'Confirmed' || ld.status === 'Converted' || ld.bookingId;
                                                                const isCancelled = ld.status === 'Cancelled' || ld.status === 'Lost';

                                                                return (
                                                                    <div
                                                                        key={ld._id || lIdx}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (ld.clientCode || ld.leadId) {
                                                                                setSearchTerm(ld.clientCode || ld.leadId);
                                                                            }
                                                                        }}
                                                                        title="Click to search in main leads list"
                                                                        style={{
                                                                            background: 'rgba(255, 255, 255, 0.04)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                            borderRadius: '8px',
                                                                            padding: '8px 10px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '4px',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                                                <span style={{
                                                                                    fontSize: '11.5px',
                                                                                    fontWeight: '800',
                                                                                    color: '#fbbf24',
                                                                                    background: 'rgba(251, 191, 36, 0.15)',
                                                                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                                                                    padding: '2px 7px',
                                                                                    borderRadius: '5px'
                                                                                }}>
                                                                                    #{ld.clientCode || ld.leadId || 'N/A'}
                                                                                </span>
                                                                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                                                                                    {ld.clientName || 'Guest'}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#34d399' }}>
                                                                                ₹{(Number(ld.totalAmount) || 0).toLocaleString('en-IN')}
                                                                            </div>
                                                                        </div>

                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                                                            <div>
                                                                                {ld.mobileNumber && <span>📞 {ld.mobileNumber}</span>}
                                                                                {ld.source && <span style={{ marginLeft: ld.mobileNumber ? '6px' : '0' }}>• {ld.source}</span>}
                                                                                {ld.salesPerson && <span style={{ marginLeft: '6px' }}>• {ld.salesPerson}</span>}
                                                                            </div>
                                                                            <div>
                                                                                <span style={{
                                                                                    fontSize: '10px',
                                                                                    fontWeight: '800',
                                                                                    padding: '1px 6px',
                                                                                    borderRadius: '4px',
                                                                                    background: isConfirmed
                                                                                        ? 'rgba(34, 197, 94, 0.2)'
                                                                                        : isCancelled
                                                                                        ? 'rgba(239, 68, 68, 0.2)'
                                                                                        : 'rgba(56, 189, 248, 0.2)',
                                                                                    color: isConfirmed
                                                                                        ? '#4ade80'
                                                                                        : isCancelled
                                                                                        ? '#f87171'
                                                                                        : '#38bdf8',
                                                                                    border: isConfirmed
                                                                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                                                                        : isCancelled
                                                                                        ? '1px solid rgba(239, 68, 68, 0.3)'
                                                                                        : '1px solid rgba(56, 189, 248, 0.3)'
                                                                                }}>
                                                                                    {isConfirmed ? 'Confirmed' : isCancelled ? 'Cancelled' : (ld.status || 'Open')}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* If Conversions exist, also show Conversions sub-list */}
                                                        {item.convCount > 0 && (
                                                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                                <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#34d399', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>🎯 Conversions ({item.convCount})</span>
                                                                    <span>₹{item.convAmt.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    {item.convLeads.map((cld, cIdx) => (
                                                                        <div
                                                                            key={cld._id || cIdx}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (cld.clientCode || cld.leadId) {
                                                                                    setSearchTerm(cld.clientCode || cld.leadId);
                                                                                }
                                                                            }}
                                                                            title="Click to search in main leads list"
                                                                            style={{
                                                                                background: 'rgba(34, 197, 94, 0.08)',
                                                                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                                                                borderRadius: '6px',
                                                                                padding: '6px 8px',
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                fontSize: '11.5px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span style={{ fontWeight: '800', color: '#4ade80' }}>#{cld.clientCode || cld.leadId || 'N/A'}</span>
                                                                                <span style={{ color: 'white', fontWeight: '600' }}>{cld.clientName}</span>
                                                                            </div>
                                                                            <span style={{ fontWeight: '800', color: '#34d399' }}>₹{(Number(cld.totalAmount) || 0).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Extra padding at bottom for scroll visibility */}
                                    <div style={{ height: '40px' }}></div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ========================================================================= */}
            {/* 5B. MODAL: 1-Click Monthly Bookings Overview (User Requested Feature)       */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {showBookingsModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 200004,
                        padding: '16px'
                    }}>
                        <motion.div
                            initial={{ y: 25, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 25, opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                width: '96vw',
                                maxWidth: '1280px',
                                maxHeight: '92vh',
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#0b1324',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '20px',
                                boxShadow: '0 30px 70px rgba(0, 0, 0, 0.9)',
                                color: '#f8fafc',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '20px 26px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px',
                                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 19, 36, 0.6) 100%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#34d399'
                                    }}>
                                        <Calendar size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px' }}>
                                                Monthly Bookings Overview
                                            </h2>
                                            {/* Month selector inside modal */}
                                            <select
                                                value={selectedSidebarMonth}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomSidebarMonth(val);
                                                    const opt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === val);
                                                    if (opt) setMonthFilter(opt.tab);
                                                    else if (val === 'All Months') setMonthFilter('All');
                                                }}
                                                style={{
                                                    background: 'rgba(15, 23, 42, 0.8)',
                                                    border: '1px solid rgba(16, 185, 129, 0.5)',
                                                    borderRadius: '8px',
                                                    color: '#34d399',
                                                    fontSize: '12px',
                                                    fontWeight: '800',
                                                    padding: '4px 10px',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="All Months" style={{ background: '#0b1324', color: '#38bdf8', fontWeight: 'bold' }}>
                                                    All Months (FY 2026-27)
                                                </option>
                                                {SIDEBAR_MONTH_OPTIONS.map(opt => (
                                                    <option key={opt.label} value={opt.label} style={{ background: '#0b1324', color: '#fff' }}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                            Overview of upcoming rides, ongoing duties, completed trips, and cancelled bookings for {selectedSidebarMonth}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fetchAllCompanyBookings();
                                            const activeOpt = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[6];
                                            fetchSidebarLeads(activeOpt.tab);
                                        }}
                                        title="Refresh Bookings"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#cbd5e1',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <RefreshCw size={14} className={loadingBookings ? 'animate-spin' : ''} /> Refresh
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBookingsModal(false);
                                            navigate('/admin/bookings');
                                        }}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                            color: '#38bdf8',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>Manage in Bookings</span>
                                        <ExternalLink size={13} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowBookingsModal(false)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Top KPI Cards / Quick Tabs */}
                            <div style={{
                                padding: '16px 26px',
                                background: 'rgba(0, 0, 0, 0.25)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '12px'
                            }}>
                                {/* 1. All Bookings */}
                                <div
                                    onClick={() => setBookingsModalTab('All')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: bookingsModalTab === 'All' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                                        border: bookingsModalTab === 'All' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', color: bookingsModalTab === 'All' ? '#38bdf8' : 'rgba(255,255,255,0.6)', fontWeight: '800' }}>
                                        ALL BOOKINGS
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
                                            {monthlyBookingStats.total}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>
                                            ₹{monthlyBookingStats.totalAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        Total registered for {selectedSidebarMonth}
                                    </div>
                                </div>

                                {/* 2. Upcoming */}
                                <div
                                    onClick={() => setBookingsModalTab('Upcoming')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: bookingsModalTab === 'Upcoming' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: bookingsModalTab === 'Upcoming' ? '2px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.25)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800' }}>
                                        ⏳ UPCOMING RIDES
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
                                            {monthlyBookingStats.upcoming}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24' }}>
                                            ₹{monthlyBookingStats.upcomingAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#fde68a', marginTop: '2px' }}>
                                        Trips scheduled ahead
                                    </div>
                                </div>

                                {/* 3. Ongoing / Today */}
                                <div
                                    onClick={() => setBookingsModalTab('Ongoing')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: bookingsModalTab === 'Ongoing' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: bookingsModalTab === 'Ongoing' ? '2px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.25)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800' }}>
                                        🚗 ONGOING / TODAY
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
                                            {monthlyBookingStats.ongoing}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>
                                            ₹{monthlyBookingStats.ongoingAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#bae6fd', marginTop: '2px' }}>
                                        Trips running today
                                    </div>
                                </div>

                                {/* 4. Completed */}
                                <div
                                    onClick={() => setBookingsModalTab('Completed')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: bookingsModalTab === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: bookingsModalTab === 'Completed' ? '2px solid #34d399' : '1px solid rgba(16, 185, 129, 0.25)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '800' }}>
                                        🏁 COMPLETED TRIPS
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
                                            {monthlyBookingStats.completed}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#34d399' }}>
                                            ₹{monthlyBookingStats.completedAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#a7f3d0', marginTop: '2px' }}>
                                        Trip dates concluded
                                    </div>
                                </div>

                                {/* 5. Cancelled / Lost */}
                                <div
                                    onClick={() => setBookingsModalTab('Cancelled')}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: bookingsModalTab === 'Cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: bookingsModalTab === 'Cancelled' ? '2px solid #f87171' : '1px solid rgba(239, 68, 68, 0.25)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '800' }}>
                                        ❌ CANCELLED / LOST
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
                                            {monthlyBookingStats.cancelled}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#f87171' }}>
                                            ₹{monthlyBookingStats.cancelledAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#fecaca', marginTop: '2px' }}>
                                        Cancelled bookings & leads
                                    </div>
                                </div>
                            </div>

                            {/* Search & Filter Toolbar */}
                            <div style={{
                                padding: '12px 26px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '14px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                    <input
                                        type="text"
                                        value={bookingsModalSearch}
                                        onChange={(e) => setBookingsModalSearch(e.target.value)}
                                        placeholder="Search by client, phone, car, ID..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 36px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '12px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {bookingsModalSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setBookingsModalSearch('')}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255,255,255,0.5)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                                    Showing <strong style={{ color: '#fff' }}>{displayedModalBookings.length}</strong> items in <span style={{ color: '#fbbf24', fontWeight: '800' }}>{bookingsModalTab}</span>
                                </div>
                            </div>

                            {/* Bookings Table / List */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 26px 20px 26px' }}>
                                {loadingBookings ? (
                                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.5)' }}>
                                        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--primary)' }} />
                                        Loading bookings for {selectedSidebarMonth}...
                                    </div>
                                ) : displayedModalBookings.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
                                        <Calendar size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.3 }} />
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                                            No {bookingsModalTab === 'All' ? '' : bookingsModalTab} Bookings Found
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px' }}>
                                            No records match your selected month ({selectedSidebarMonth}) and filter tab.
                                        </p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255,255,255,0.4)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <th style={{ padding: '12px 10px' }}>Booking / Lead ID</th>
                                                <th style={{ padding: '12px 10px' }}>Guest Details</th>
                                                <th style={{ padding: '12px 10px' }}>Vehicle / Fleet</th>
                                                <th style={{ padding: '12px 10px' }}>Travel Dates & Timing</th>
                                                <th style={{ padding: '12px 10px' }}>Payment / Financials</th>
                                                <th style={{ padding: '12px 10px' }}>Status</th>
                                                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedModalBookings.map((b) => {
                                                const timingBadge = getTripTimingBadge(b);
                                                const sDateStr = b.travelStartDate ? new Date(b.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBA';
                                                const eDateStr = b.travelEndDate ? new Date(b.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : sDateStr;
                                                const totalAmt = Number(b.totalAmount) || 0;
                                                const advAmt = Number(b.advancePaid || b.advancePayment) || 0;
                                                const balAmt = Math.max(0, totalAmt - advAmt);

                                                return (
                                                    <tr key={b._id || b.bookingId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                                                        {/* ID & Date */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <div style={{ fontWeight: '800', color: '#fff', fontSize: '13px' }}>
                                                                {b.clientCode || b.bookingId || 'BKG'}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                {b.isLead ? (
                                                                    <span style={{ color: '#f87171', fontWeight: '700' }}>[Lost / Cancelled Lead]</span>
                                                                ) : (
                                                                    `#${b.bookingId || 'BKG'}`
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Client Details */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <div style={{ fontWeight: '700', color: '#f8fafc' }}>
                                                                {b.clientName || 'Guest (TBA)'}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                                                                <span>{b.mobileNumber || 'TBA'}</span>
                                                                {b.mobileNumber && b.mobileNumber.length >= 8 && (
                                                                    <a
                                                                        href={`https://wa.me/91${b.mobileNumber.replace(/\D/g, '').slice(-10)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title="WhatsApp Guest"
                                                                        style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center' }}
                                                                    >
                                                                        <MessageCircle size={12} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Vehicle */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <div style={{ fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Car size={13} color="var(--primary)" />
                                                                <span>{b.vehicleType || b.carType || 'Car'}</span>
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                {b.numberOfCars && b.numberOfCars > 1 ? `${b.numberOfCars} Cars` : '1 Vehicle'}
                                                            </div>
                                                        </td>

                                                        {/* Travel Dates & Relative Timing */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <div style={{ fontWeight: '700', color: '#fff', fontSize: '12px' }}>
                                                                {sDateStr} → {eDateStr}
                                                            </div>
                                                            <div style={{ marginTop: '4px' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '8px',
                                                                    fontSize: '10px',
                                                                    fontWeight: '800',
                                                                    background: timingBadge.bg,
                                                                    color: timingBadge.color
                                                                }}>
                                                                    {timingBadge.label}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Financials */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <div style={{ fontWeight: '900', color: '#fff', fontSize: '13px' }}>
                                                                ₹{totalAmt.toLocaleString('en-IN')}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', gap: '6px' }}>
                                                                <span style={{ color: '#4ade80' }}>Adv: ₹{advAmt.toLocaleString('en-IN')}</span>
                                                                {balAmt > 0 && <span style={{ color: '#fbbf24' }}>Due: ₹{balAmt.toLocaleString('en-IN')}</span>}
                                                            </div>
                                                        </td>

                                                        {/* Status */}
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '3px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                background: b.bookingStatus === 'Cancelled' ? 'rgba(239, 68, 68, 0.15)' : b.bookingStatus === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                                                color: b.bookingStatus === 'Cancelled' ? '#f87171' : b.bookingStatus === 'Completed' ? '#34d399' : '#38bdf8',
                                                                border: b.bookingStatus === 'Cancelled' ? '1px solid rgba(239, 68, 68, 0.3)' : b.bookingStatus === 'Completed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
                                                            }}>
                                                                {b.bookingStatus || 'Confirmed'}
                                                            </span>
                                                        </td>

                                                        {/* Action */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                                            {b.isLead ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowBookingsModal(false);
                                                                        handleOpenModal(b);
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                        color: '#fff',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    View Lead
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowBookingsModal(false);
                                                                        const targetPath = b.bookingStatus === 'Completed' ? '/admin/completed-bookings' : '/admin/bookings';
                                                                        navigate(`${targetPath}?search=${encodeURIComponent(b.bookingId || b.clientCode || '')}`);
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                        color: '#38bdf8',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <span>Open</span>
                                                                    <ExternalLink size={11} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================================= */}
            {/* 6. MODAL: Create / Edit Lead & Quotation (Exact Pixel Mockup Alignment)   */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 200005,
                        padding: '16px'
                    }}>
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            style={{
                                width: '96vw',
                                maxWidth: '1200px',
                                maxHeight: '94vh',
                                overflowY: 'auto',
                                background: '#090f1d',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '26px 30px',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                                color: '#f8fafc'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px',
                                marginBottom: '22px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                paddingBottom: '18px'
                            }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '800' }}>
                                    {editingLead ? 'Edit Lead & Quotation' : 'Create New Lead & Quotation'}
                                </h2>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* LEAD ID Badge */}
                                    <div style={{
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        background: 'rgba(56, 189, 248, 0.06)',
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            LEAD ID <Info size={10} color="#38bdf8" />
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>
                                            {previewClientCode || formData.clientCode || '01/01'}
                                        </div>
                                    </div>

                                    {/* DATE OF LEAD Box */}
                                    <div
                                        onClick={() => {
                                            try {
                                                const el = document.getElementById('leadDateInput');
                                                if (el && el.showPicker) el.showPicker();
                                                else el?.focus();
                                            } catch (err) {}
                                        }}
                                        style={{
                                            border: '1px solid rgba(251, 191, 36, 0.35)',
                                            background: 'rgba(251, 191, 36, 0.06)',
                                            borderRadius: '8px',
                                            padding: '6px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Click to select Date of Lead"
                                    >
                                        <div style={{ fontSize: '9px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.4px' }}>
                                            DATE OF LEAD
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                            <Calendar size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
                                            <input
                                                id="leadDateInput"
                                                type="date"
                                                value={toLocalDateString(formData.leadDate)}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, leadDate: val });
                                                    fetchNextClientCodePreview(val);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        if (e.target.showPicker) e.target.showPicker();
                                                    } catch (err) {}
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    colorScheme: 'dark',
                                                    width: '125px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        onClick={() => setShowModal(false)}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.8)',
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Duplicate Phone Warning Banner */}
                            {phoneCheckResult && phoneCheckResult.exists && (
                                <div style={{
                                    background: 'rgba(234, 179, 8, 0.1)',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '20px'
                                }}>
                                    <AlertTriangle size={18} color="#facc15" />
                                    <div style={{ fontSize: '12px', color: '#fef08a' }}>
                                        <strong>Existing Customer Detected:</strong> This phone number has {phoneCheckResult.count} previous lead(s)/booking(s) on file.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {/* ========================================== */}
                                {/* SECTION 1: CLIENT & SOURCE DETAILS        */}
                                {/* ========================================== */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#fbbf24',
                                            color: '#000',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '11px'
                                        }}>
                                            1
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Client & Source Details
                                        </span>
                                    </div>

                                    {/* Row 1: Booking Reference / Type */}
                                    <div style={{
                                        background: (formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        marginBottom: '14px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Booking Reference:
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            bookingReference: 'Direct',
                                                            travelAgent: '',
                                                            travelAgentName: '',
                                                            travelAgentMobile: '',
                                                            source: prev.source === 'Agent' ? 'Website' : prev.source
                                                        }))}
                                                        style={{
                                                            padding: '5px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            border: 'none',
                                                            background: !(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                                                            color: !(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? '#000' : 'rgba(255,255,255,0.7)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Direct Client
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            bookingReference: 'Travel Agent',
                                                            source: 'Agent'
                                                        }))}
                                                        style={{
                                                            padding: '5px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            border: 'none',
                                                            background: (formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                                                            color: (formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? '#000' : 'rgba(255,255,255,0.7)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Travel Agent
                                                    </button>
                                                </div>
                                            </div>

                                            {(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') && (
                                                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                                                    ⚡ Agent Booking Mode: Guest details optional
                                                </span>
                                            )}
                                        </div>

                                        {/* Dedicated Agent Details Dropbox */}
                                        {(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') && (
                                            <div style={{
                                                marginTop: '12px',
                                                paddingTop: '12px',
                                                borderTop: '1px dashed rgba(56, 189, 248, 0.3)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                                        Travel Agent Selection & Contact (Dropbox):
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                        Agent will reflect on DRS placard & company ledger
                                                    </span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) minmax(160px, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                                                    <select
                                                        value={formData.travelAgent}
                                                        onChange={e => {
                                                            const agId = e.target.value;
                                                            const agObj = travelAgents.find(a => a._id === agId);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                bookingReference: 'Travel Agent',
                                                                source: 'Agent',
                                                                travelAgent: agId,
                                                                travelAgentName: agObj ? (agObj.agencyName || agObj.name) : '',
                                                                travelAgentMobile: agObj ? (agObj.mobile || '') : prev.travelAgentMobile
                                                            }));
                                                        }}
                                                        style={{ ...darkInputStyle, cursor: 'pointer', padding: '8px 10px', fontSize: '12px' }}
                                                    >
                                                        <option value="">-- Select Travel Agent --</option>
                                                        {travelAgents.map(a => (
                                                            <option key={a._id} value={a._id} style={{ background: '#090f1d' }}>
                                                                {a.agencyName ? `${a.agencyName} (${a.name})` : a.name} - {a.mobile}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={formData.travelAgentMobile}
                                                        onChange={e => setFormData(prev => ({ ...prev, travelAgentMobile: e.target.value }))}
                                                        placeholder="Agent Mobile Number"
                                                        style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12px' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddAgentModal(true)}
                                                        style={{
                                                            padding: '8px 14px',
                                                            background: 'rgba(56, 189, 248, 0.2)',
                                                            border: '1px solid #38bdf8',
                                                            color: '#38bdf8',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        + Enlist Agent
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>
                                                {(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? 'Guest Name (Optional - Details later on)' : 'Guest / Client Name *'}
                                            </label>
                                            <input
                                                required={!(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent')}
                                                type="text"
                                                value={formData.clientName}
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                                style={darkInputStyle}
                                                placeholder={(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? "Optional (e.g. Rahul / Placard TBA)" : "e.g. Rahul Sharma"}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>
                                                {(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? 'Guest Mobile (Optional - Details later on)' : 'Mobile Number *'}
                                            </label>
                                            <input
                                                required={!(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent')}
                                                type="text"
                                                value={formData.mobileNumber}
                                                onChange={handleMobileChange}
                                                style={darkInputStyle}
                                                placeholder={(formData.source === 'Agent' || formData.bookingReference === 'Travel Agent') ? "Optional (Guest details arrive later)" : "e.g. 9876543210"}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Enquiry Source</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    value={formData.source}
                                                    onChange={e => {
                                                        const newSource = e.target.value;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            source: newSource,
                                                            bookingReference: newSource === 'Agent' ? 'Travel Agent' : prev.bookingReference
                                                        }));
                                                    }}
                                                    style={{ ...darkInputStyle, cursor: 'pointer', flex: 1 }}
                                                >
                                                    {ALL_SOURCES.map(src => (
                                                        <option key={src} value={src} style={{ background: '#090f1d' }}>{src}</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={() => {
                                                    const src = prompt('Enter new source name:');
                                                    if (src && !ALL_SOURCES.includes(src)) {
                                                        const newSrcs = [...customSources, src];
                                                        setCustomSources(newSrcs);
                                                        localStorage.setItem('leadSources_' + selectedCompany?._id, JSON.stringify(newSrcs));
                                                        setFormData(prev => ({ ...prev, source: src }));
                                                    }
                                                }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}>+</button>
                                                {customSources.includes(formData.source) && (
                                                    <button type="button" onClick={() => {
                                                        if (window.confirm('Delete this custom source?')) {
                                                            const newSrcs = customSources.filter(s => s !== formData.source);
                                                            setCustomSources(newSrcs);
                                                            localStorage.setItem('leadSources_' + selectedCompany?._id, JSON.stringify(newSrcs));
                                                            setFormData(prev => ({ ...prev, source: 'Website' }));
                                                        }
                                                    }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={14}/></button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>GST Mode</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    value={formData.gstMode}
                                                    onChange={e => setFormData({ ...formData, gstMode: e.target.value })}
                                                    style={{ ...darkInputStyle, cursor: 'pointer', flex: 1 }}
                                                >
                                                    {GST_MODES.map(mode => <option key={mode} value={mode} style={{ background: '#090f1d' }}>{mode}</option>)}
                                                </select>
                                                {formData.gstMode === 'GST Extra' && (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, gstRate: 5 }))}
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                border: (formData.gstRate || 5) === 5 ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                                                background: (formData.gstRate || 5) === 5 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255,255,255,0.05)',
                                                                color: (formData.gstRate || 5) === 5 ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            5%
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, gstRate: 18 }))}
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                border: formData.gstRate === 18 ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                                                background: formData.gstRate === 18 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255,255,255,0.05)',
                                                                color: formData.gstRate === 18 ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            18%
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Client Interest Level</label>
                                            <select
                                                value={formData.priority || 'Unassigned'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        priority: val,
                                                        status: val === 'Lost' ? 'Lost' : ((prev.status === 'Lost' || prev.status === 'Cancelled') ? 'New' : prev.status)
                                                    }));
                                                }}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="Unassigned" style={{ background: '#090f1d' }}>Not Set</option>
                                                <option value="Hot" style={{ background: '#090f1d', color: '#fbbf24' }}>🔥 High (Hot)</option>
                                                <option value="Warm" style={{ background: '#090f1d', color: '#38bdf8' }}>☀️ Average (Warm)</option>
                                                <option value="Cold" style={{ background: '#090f1d', color: '#94a3b8' }}>❄️ Low (Cold)</option>
                                                <option value="Lost" style={{ background: '#090f1d', color: '#f87171' }}>❌ Lost</option>
                                            </select>
                                        </div>
                                        
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 2: TRAVEL & QUOTATION DETAILS     */}
                                {/* ========================================== */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#fbbf24',
                                            color: '#000',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '11px'
                                        }}>
                                            2
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Travel & Quotation Details
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Travel Start Date *</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    id="travelStartDateInput"
                                                    required
                                                    type="date"
                                                    value={toLocalDateString(formData.travelStartDate)}
                                                    onChange={e => handleTravelDateChange('travelStartDate', e.target.value)}
                                                    onClick={e => { try { if (e.target.showPicker) e.target.showPicker(); } catch(err){} }}
                                                    style={{
                                                        ...darkInputStyle,
                                                        cursor: 'pointer',
                                                        paddingRight: '38px',
                                                        fontSize: '13px',
                                                        fontWeight: '700'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => {
                                                        try {
                                                            const el = document.getElementById('travelStartDateInput');
                                                            if (el && el.showPicker) el.showPicker();
                                                            else el?.focus();
                                                        } catch(e) {}
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#fbbf24',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Open Calendar"
                                                >
                                                    <Calendar size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Travel End Date *</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    id="travelEndDateInput"
                                                    required
                                                    type="date"
                                                    value={toLocalDateString(formData.travelEndDate)}
                                                    onChange={e => handleTravelDateChange('travelEndDate', e.target.value)}
                                                    onClick={e => { try { if (e.target.showPicker) e.target.showPicker(); } catch(err){} }}
                                                    style={{
                                                        ...darkInputStyle,
                                                        cursor: 'pointer',
                                                        paddingRight: '38px',
                                                        fontSize: '13px',
                                                        fontWeight: '700'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => {
                                                        try {
                                                            const el = document.getElementById('travelEndDateInput');
                                                            if (el && el.showPicker) el.showPicker();
                                                            else el?.focus();
                                                        } catch(e) {}
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#fbbf24',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Open Calendar"
                                                >
                                                    <Calendar size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Vehicle Model *</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
    <select
        value={formData.carType}
        onChange={e => {
            const newCar = e.target.value;
            setFormData({
                ...formData,
                carType: newCar,
                itinerary: formData.itinerary.map(item => ({ ...item, vehicleType: newCar }))
            });
        }}
        style={{ ...darkInputStyle, cursor: 'pointer', flex: 1 }}
    >
        {ALL_VEHICLES.map(v => (
            <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
        ))}
    </select>
    <button type="button" onClick={() => {
        const v = prompt('Enter new vehicle model:');
        if (v && !ALL_VEHICLES.includes(v)) {
            const newVs = [...customVehicles, v];
            setCustomVehicles(newVs);
            localStorage.setItem('leadVehicles_' + selectedCompany?._id, JSON.stringify(newVs));
            setFormData(prev => ({
                ...prev,
                carType: v,
                itinerary: prev.itinerary.map(item => ({ ...item, vehicleType: v }))
            }));
        }
    }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}>+</button>
    {customVehicles.includes(formData.carType) && (
        <button type="button" onClick={() => {
            if (window.confirm('Delete this custom vehicle?')) {
                const newVs = customVehicles.filter(cv => cv !== formData.carType);
                setCustomVehicles(newVs);
                localStorage.setItem('leadVehicles_' + selectedCompany?._id, JSON.stringify(newVs));
                const defV = VEHICLE_OPTIONS[0];
                setFormData(prev => ({
                    ...prev,
                    carType: defV,
                    itinerary: prev.itinerary.map(item => ({ ...item, vehicleType: defV }))
                }));
            }
        }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} />
        </button>
    )}
</div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Number of Vehicles *</label>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                value={formData.numberOfCars}
                                                onChange={e => {
                                                    const cars = Math.max(1, parseInt(e.target.value) || 1);
                                                    setFormData(prev => {
                                                        const updatedItin = (prev.itinerary || []).map(day => {
                                                            const rate = Number(day.rate) || 0;
                                                            return {
                                                                ...day,
                                                                vehicleCount: cars,
                                                                quantity: cars,
                                                                amount: cars * rate
                                                            };
                                                        });
                                                        const total = updatedItin.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                                                        return {
                                                            ...prev,
                                                            numberOfCars: cars,
                                                            itinerary: updatedItin,
                                                            totalAmount: total > 0 ? total : prev.totalAmount
                                                        };
                                                    });
                                                }}
                                                style={darkInputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Quoted Package Total Fare (₹) *</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <span style={{ position: 'absolute', left: '12px', color: '#fbbf24', fontWeight: '900', fontSize: '15px' }}>₹</span>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    placeholder="e.g. 15000"
                                                    value={formData.totalAmount || ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            totalAmount: val
                                                        }));
                                                    }}
                                                    style={{
                                                        ...darkInputStyle,
                                                        paddingLeft: '28px',
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        color: '#fbbf24'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ========================================================= */}
                                    {/* BREAK TOUR / CAR USAGE SCHEDULE (SKIP CAR DAYS)           */}
                                    {/* ========================================================= */}
                                    {allTourDates.length > 0 && (
                                        <div style={{
                                            marginTop: '12px',
                                            background: (formData.isBreakTour || validExcludedDates.length > 0)
                                                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.9))'
                                                : 'rgba(255, 255, 255, 0.02)',
                                            border: (formData.isBreakTour || validExcludedDates.length > 0)
                                                ? '1px solid rgba(245, 158, 11, 0.4)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                const turningOff = prev.isBreakTour && (prev.excludedDates || []).length === 0;
                                                                if (prev.isBreakTour && (prev.excludedDates || []).length > 0) {
                                                                    // Turn off break tour and restore all dates
                                                                    return { ...prev, isBreakTour: false, excludedDates: [] };
                                                                }
                                                                return { ...prev, isBreakTour: !prev.isBreakTour };
                                                            });
                                                        }}
                                                        style={{
                                                            background: (formData.isBreakTour || validExcludedDates.length > 0)
                                                                ? 'rgba(245, 158, 11, 0.2)'
                                                                : 'rgba(255, 255, 255, 0.06)',
                                                            border: (formData.isBreakTour || validExcludedDates.length > 0)
                                                                ? '1.5px solid #fbbf24'
                                                                : '1px solid rgba(255, 255, 255, 0.15)',
                                                            color: (formData.isBreakTour || validExcludedDates.length > 0)
                                                                ? '#fbbf24'
                                                                : '#cbd5e1',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <span>{(formData.isBreakTour || validExcludedDates.length > 0) ? '✅' : '⏸️'}</span>
                                                        <span>Break Tour (Guest Skip Car Days)</span>
                                                    </button>

                                                    {/* Live Stay vs Car Usage Badges */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            background: 'rgba(148, 163, 184, 0.12)',
                                                            border: '1px solid rgba(148, 163, 184, 0.25)',
                                                            color: '#cbd5e1',
                                                            padding: '3px 9px',
                                                            borderRadius: '6px',
                                                            fontSize: '11.5px',
                                                            fontWeight: '700'
                                                        }}>
                                                            📅 Total Stay: <strong style={{ color: 'white' }}>{totalStayDays} Day{totalStayDays > 1 ? 's' : ''}</strong>
                                                        </span>
                                                        <span style={{
                                                            background: 'rgba(16, 185, 129, 0.14)',
                                                            border: '1px solid rgba(16, 185, 129, 0.35)',
                                                            color: '#34d399',
                                                            padding: '3px 9px',
                                                            borderRadius: '6px',
                                                            fontSize: '11.5px',
                                                            fontWeight: '800'
                                                        }}>
                                                            🚗 Car Used: <strong>{activeCarDays} Day{activeCarDays > 1 ? 's' : ''}</strong>
                                                        </span>
                                                        {validExcludedDates.length > 0 && (
                                                            <span style={{
                                                                background: 'rgba(239, 68, 68, 0.15)',
                                                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                color: '#f87171',
                                                                padding: '3px 9px',
                                                                borderRadius: '6px',
                                                                fontSize: '11.5px',
                                                                fontWeight: '800'
                                                            }}>
                                                                🚫 Break / No Car: <strong>{validExcludedDates.length} Day{validExcludedDates.length > 1 ? 's' : ''}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    {validExcludedDates.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, excludedDates: [] }))}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.12)',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                color: '#fca5a5',
                                                                padding: '5px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Reset All Days Active
                                                        </button>
                                                    )}
                                                    {(formData.isBreakTour || validExcludedDates.length > 0) && (
                                                        <button
                                                            type="button"
                                                            onClick={syncActiveDatesToItinerary}
                                                            style={{
                                                                background: 'rgba(59, 130, 246, 0.18)',
                                                                border: '1px solid rgba(59, 130, 246, 0.45)',
                                                                color: '#93c5fd',
                                                                padding: '5px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Generate or sync Day-wise Itinerary with only active car usage dates"
                                                        >
                                                            ⚡ Sync {activeCarDays} Active Days to Itinerary
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Interactive Date Pills when Break Tour is active */}
                                            {(formData.isBreakTour || validExcludedDates.length > 0) && (
                                                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                        <span>
                                                            💡 <strong>Click on any date</strong> below when guest is <strong style={{ color: '#f87171' }}>NOT using the car</strong> (Break Day):
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            <span style={{ color: '#34d399', fontWeight: '700' }}>● Green = Car Used</span> &nbsp;|&nbsp; <span style={{ color: '#f87171', fontWeight: '700' }}>● Red = Break (No Car)</span>
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', maxHeight: '150px', overflowY: 'auto', padding: '2px' }}>
                                                        {allTourDates.map((dStr, idx) => {
                                                            const isOff = validExcludedDates.includes(dStr);
                                                            const dObj = new Date(dStr + 'T00:00:00');
                                                            const dayLabel = dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                                            const weekDay = dObj.toLocaleDateString('en-IN', { weekday: 'short' });
                                                            return (
                                                                <button
                                                                    key={dStr}
                                                                    type="button"
                                                                    onClick={() => toggleBreakTourDate(dStr)}
                                                                    style={{
                                                                        background: isOff
                                                                            ? 'rgba(239, 68, 68, 0.16)'
                                                                            : 'rgba(16, 185, 129, 0.14)',
                                                                        border: isOff
                                                                            ? '1.5px solid rgba(239, 68, 68, 0.55)'
                                                                            : '1.5px solid rgba(16, 185, 129, 0.45)',
                                                                        color: isOff ? '#fca5a5' : '#6ee7b7',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '8px',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        minWidth: '74px',
                                                                        transition: 'all 0.15s ease',
                                                                        opacity: isOff ? 0.85 : 1
                                                                    }}
                                                                    title={isOff ? `${dayLabel}: Break Day (No Car) — Click to mark Car Used` : `${dayLabel}: Car Used — Click to mark Break / No Car`}
                                                                >
                                                                    <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.75, textTransform: 'uppercase' }}>
                                                                        {weekDay} • D{idx + 1}
                                                                    </span>
                                                                    <span style={{ fontSize: '12px', fontWeight: '900', margin: '1px 0', textDecoration: isOff ? 'line-through' : 'none' }}>
                                                                        {dayLabel}
                                                                    </span>
                                                                    <span style={{ fontSize: '9.5px', fontWeight: '800', color: isOff ? '#f87171' : '#34d399' }}>
                                                                        {isOff ? '🚫 No Car' : '🚗 Car Use'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ========================================================= */}
                                    {/* VEHICLE MATRIX (MULTI-OPTION PROFIT & OPERATING EXPENSES)  */}
                                    {/* ========================================================= */}
                                    <div style={{
                                        marginTop: '16px',
                                        background: '#090f1d',
                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                        borderRadius: '14px',
                                        padding: '16px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                                    }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '16px' }}>🚗</span>
                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                                    Vehicle Operating Matrix & Quotation Profit Margin
                                                </span>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                    {vehicleMatrices.length} Option{vehicleMatrices.length > 1 ? 's' : ''} Added
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span>
                                                    Active Car Usage: <strong style={{ color: '#fbbf24' }}>{matrixDaysVal} Day{matrixDaysVal > 1 ? 's' : ''}</strong>
                                                </span>
                                                {validExcludedDates.length > 0 && (
                                                    <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', padding: '2px 7px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '700' }}>
                                                        ⏸️ Break Tour ({totalStayDays} Stay - {validExcludedDates.length} Off)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Multi-Option Vehicle Tabs & "+ Add Matrix Option" Bar */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                            marginBottom: '16px',
                                            paddingBottom: '12px',
                                            borderBottom: '1px dashed rgba(255,255,255,0.08)'
                                        }}>
                                            {vehicleMatrices.map((m, idx) => {
                                                const isActive = activeMatrixIndex === idx;
                                                return (
                                                    <div
                                                        key={m.id || idx}
                                                        onClick={() => setActiveMatrixIndex(idx)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '7px 12px',
                                                            borderRadius: '10px',
                                                            background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.35))' : 'rgba(255, 255, 255, 0.03)',
                                                            border: isActive ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                                                            color: isActive ? '#93c5fd' : 'rgba(255, 255, 255, 0.65)',
                                                            fontWeight: isActive ? '800' : '600',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            boxShadow: isActive ? '0 4px 15px rgba(59, 130, 246, 0.25)' : 'none',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <span>🚗</span>
                                                        <span>{m.title || `Option ${idx + 1}: ${m.carType || 'Car'}`}</span>
                                                        {vehicleMatrices.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm(`Remove option "${m.title || m.carType}"?`)) {
                                                                        removeMatrixOption(idx);
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#f87171',
                                                                    cursor: 'pointer',
                                                                    padding: '0 2px',
                                                                    fontSize: '13px',
                                                                    fontWeight: '900',
                                                                    lineHeight: 1
                                                                }}
                                                                title="Delete this vehicle matrix option"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* + Add Option Button */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => addMatrixOption('Sedan')}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(245, 158, 11, 0.12)',
                                                        border: '1.5px dashed rgba(245, 158, 11, 0.5)',
                                                        color: '#fbbf24',
                                                        fontWeight: '800',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title="Add another Vehicle Operating Matrix (e.g. for Sedan, Ertiga, Innova, Tempo, etc.)"
                                                >
                                                    <Plus size={14} /> + Add Vehicle Matrix Option
                                                </button>

                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            addMatrixOption(e.target.value);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    style={{
                                                        background: '#0a101d',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        color: '#fbbf24',
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Quick add a specific car category"
                                                >
                                                    <option value="">+ Quick Add Car...</option>
                                                    <option value="Sedan">Sedan (Dzire/Etios)</option>
                                                    <option value="Ertiga">Ertiga (6+1)</option>
                                                    <option value="Innova Crysta">Innova Crysta</option>
                                                    <option value="Innova Hycross">Innova Hycross</option>
                                                    <option value="SUV">SUV (Fortuner/Endeavour)</option>
                                                    <option value="Tempo Traveller">Tempo Traveller (12-17)</option>
                                                    <option value="Mini Bus">Mini Bus (20-25)</option>
                                                    <option value="Coach Bus">Luxury Coach (40+)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Active Matrix Config Bar: Title & Quoted Fare Override */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                            gap: '12px',
                                            marginBottom: '16px',
                                            padding: '10px 14px',
                                            background: 'rgba(59, 130, 246, 0.06)',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(59, 130, 246, 0.2)'
                                        }}>
                                            <div>
                                                <label style={{ ...labelStyle, color: '#93c5fd' }}>Option Label / Vehicle Name</label>
                                                <input
                                                    type="text"
                                                    value={activeMatrix.title || ''}
                                                    onChange={e => updateActiveMatrix('title', e.target.value)}
                                                    placeholder="e.g. Option 1: Innova Crysta"
                                                    style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '12.5px', fontWeight: '700' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ ...labelStyle, color: '#93c5fd' }}>Car Category</label>
                                                <select
                                                    value={activeMatrix.carType || formData.carType}
                                                    onChange={e => {
                                                        const newCar = e.target.value;
                                                        updateActiveMatrix('carType', newCar);
                                                        if (!activeMatrix.title || activeMatrix.title.startsWith('Option')) {
                                                            updateActiveMatrix('title', `Option ${activeMatrixIndex + 1}: ${newCar}`);
                                                        }
                                                    }}
                                                    style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '12.5px', cursor: 'pointer' }}
                                                >
                                                    {ALL_VEHICLES.map(v => (
                                                        <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <label style={{ ...labelStyle, color: '#fbbf24' }}>Quoted Package Fare for this Car (₹)</label>
                                                    {formData.totalAmount > 0 && activeMatrix.packageValue && Number(activeMatrix.packageValue) !== Number(formData.totalAmount) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateActiveMatrix('packageValue', '')}
                                                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                                        >
                                                            Reset to Lead Fare
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="number"
                                                    value={activeMatrix.packageValue !== undefined && activeMatrix.packageValue !== '' ? activeMatrix.packageValue : (formData.totalAmount || '')}
                                                    onChange={e => updateActiveMatrix('packageValue', e.target.value)}
                                                    placeholder={String(formData.totalAmount || 'e.g. 35000')}
                                                    style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '13px', fontWeight: '800', color: '#fbbf24', borderColor: '#f59e0b' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Matrix Split: Left Inputs, Right Live Output */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px' }}>
                                            
                                            {/* Left: Operating Expenses Inputs */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                
                                                {/* Fuel Box */}
                                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            ⛽ Fuel Consumption ({matrixFuelType})
                                                        </span>
                                                        <span style={{ fontSize: '12.5px', color: '#f87171', fontWeight: '800' }}>
                                                            Cost: ₹{Math.round(matrixFuelCost).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>

                                                    {/* Fuel Type Selector Pills */}
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                                            {FUEL_TYPES.map(f => {
                                                                const isSelected = matrixFuelType === f.type;
                                                                return (
                                                                    <button
                                                                        key={f.type}
                                                                        type="button"
                                                                        onClick={() => updateActiveMatrix('fuelType', f.type)}
                                                                        style={{
                                                                            padding: '6px 4px',
                                                                            background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                                                                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                                                                            color: isSelected ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                                                                            borderRadius: '6px',
                                                                            fontSize: '11px',
                                                                            fontWeight: isSelected ? '800' : '500',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '4px',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        <span>{f.icon}</span>
                                                                        <span>{f.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                                                        <div>
                                                            <label style={labelStyle}>Total Km Run</label>
                                                            <input
                                                                type="number"
                                                                value={matrixTotalKmRun}
                                                                placeholder="e.g. 1400"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('totalKmRun', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ ...labelStyle, color: '#60a5fa' }}>
                                                                Average ({currentFuelConfig.avgUnit})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                value={matrixVehicleAverage}
                                                                placeholder={matrixFuelType === 'CNG' ? 'e.g. 24' : 'e.g. 12'}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('vehicleAverage', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px', borderColor: '#3b82f6' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={labelStyle}>
                                                                Rate ({currentFuelConfig.rateUnit})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={matrixFuelRate}
                                                                placeholder="e.g. 94"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('fuelRate', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px', borderColor: '#60a5fa' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                                        {matrixAvgVal > 0 && matrixRateVal > 0 ? (
                                                            `Formula: (${matrixKmVal} km ÷ ${matrixAvgVal} ${currentFuelConfig.avgUnit}) × ₹${matrixRateVal} = ₹${Math.round(matrixFuelCost).toLocaleString('en-IN')}`
                                                        ) : (
                                                            `Enter Total KM, vehicle average (${currentFuelConfig.avgUnit}), and pump rate (${currentFuelConfig.rateUnit}).`
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Trip Expenses Box */}
                                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
                                                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'white', display: 'block', marginBottom: '8px' }}>
                                                        🛠️ Duty & Trip Expenses (Kharcha)
                                                    </span>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                        <div>
                                                            <label style={labelStyle}>Driver Salary (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={matrixDriverSalary}
                                                                placeholder="e.g. 3500"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('driverSalary', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={labelStyle}>Night Hold (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={matrixNightHold}
                                                                placeholder="e.g. 2000"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('nightHold', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                        <div>
                                                            <label style={labelStyle}>Toll & Parking (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={matrixTollAndParking}
                                                                placeholder="e.g. 2000"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('tollAndParking', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <label style={labelStyle}>GST Amount (₹)</label>
                                                                {matrixPackageVal > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleAutoMatrixGST}
                                                                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                                                    >
                                                                        Auto 5% (₹{Math.round(matrixPackageVal - (matrixPackageVal / 1.05)).toLocaleString('en-IN')})
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={matrixGstAmount}
                                                                placeholder="e.g. 2000"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('gstAmount', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Target Benchmark Setting */}
                                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <label style={{ ...labelStyle, color: '#93c5fd', margin: 0 }}>Benchmark Target Per Day (₹)</label>
                                                            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                                Innova: 2500 | Ciaz: 1500 | Dzire: 1000 | TT: 3500
                                                            </div>
                                                        </div>
                                                        <div style={{ width: '130px' }}>
                                                            <input
                                                                type="number"
                                                                value={matrixTargetPerDay}
                                                                placeholder="e.g. 2500"
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('targetPerDay', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '7px 10px', textAlign: 'right', borderColor: '#3b82f6', fontWeight: 'bold' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Right: Live Calculation Statement & Target Comparison */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                
                                                {/* Main Statement Card */}
                                                <div style={{ background: '#070b16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Calculator size={15} color="#fbbf24" /> P&L Live Statement ({activeMatrix.title || activeMatrix.carType || 'Option'})
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                            {matrixDaysVal} Active Car Day{matrixDaysVal > 1 ? 's' : ''}{validExcludedDates.length > 0 ? ` (${totalStayDays}d Stay)` : ''}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Quoted Package Fare:</span>
                                                        <span style={{ color: '#fbbf24', fontWeight: '800' }}>₹{matrixPackageVal.toLocaleString('en-IN')}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fuel Consumption:</span>
                                                        <span style={{ color: '#f87171' }}>- ₹{Math.round(matrixFuelCost).toLocaleString('en-IN')}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Driver + Night + Toll:</span>
                                                        <span style={{ color: '#f87171' }}>- ₹{(matrixDriverSalaryVal + matrixNightHoldVal + matrixTollVal).toLocaleString('en-IN')}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>GST Value:</span>
                                                        <span style={{ color: '#f87171' }}>- ₹{matrixGstVal.toLocaleString('en-IN')}</span>
                                                    </div>

                                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '2px 0' }}></div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Total Cost:</span>
                                                        <span style={{ color: '#ef4444', fontWeight: '700' }}>₹{Math.round(matrixTotalCost).toLocaleString('en-IN')}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', background: matrixTotalProfit >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${matrixTotalProfit >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                                                        <span style={{ color: 'white', fontWeight: '800' }}>Net Profit:</span>
                                                        <span style={{ color: matrixTotalProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: '900' }}>
                                                            ₹{Math.round(matrixTotalProfit).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>

                                                    {/* Per Day Profit & Benchmark Match */}
                                                    <div style={{ marginTop: '4px', background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Per Day Profit:</span>
                                                            <span style={{ color: '#ffffff', fontWeight: '800' }}>₹{Math.round(matrixPerDayProfit).toLocaleString('en-IN')} / day</span>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Target ({activeMatrix.carType || formData.carType || 'Car'}):</span>
                                                            <span style={{ color: '#93c5fd', fontWeight: '600' }}>₹{matrixTargetPerDayVal.toLocaleString('en-IN')} / day</span>
                                                        </div>

                                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }}></div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)' }}>Profitability Status:</span>
                                                            <span style={{
                                                                fontSize: '12px',
                                                                fontWeight: '900',
                                                                padding: '3px 8px',
                                                                borderRadius: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: matrixDiffFromTarget >= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                                                color: matrixDiffFromTarget >= 0 ? '#4ade80' : '#f87171'
                                                            }}>
                                                                {matrixDiffFromTarget >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                                {matrixDiffFromTarget >= 0 ? '+' : '-'} ₹{Math.abs(Math.round(matrixDiffFromTarget)).toLocaleString('en-IN')} / day
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Sale Price Simulator */}
                                                <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Sparkles size={14} color="#60a5fa" />
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#93c5fd' }}>
                                                                Sale Price Simulator
                                                            </span>
                                                        </div>
                                                        {matrixSimPriceVal > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => applySimPriceToQuotation(matrixSimPriceVal)}
                                                                style={{
                                                                    background: 'rgba(59, 130, 246, 0.2)',
                                                                    border: '1px solid #3b82f6',
                                                                    color: '#93c5fd',
                                                                    borderRadius: '4px',
                                                                    padding: '2px 8px',
                                                                    fontSize: '10.5px',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Apply as Fare
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <input
                                                                type="number"
                                                                placeholder="Test Rate (e.g. 40000)"
                                                                value={matrixSimSalePrice}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => updateActiveMatrix('simSalePrice', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '7px 10px', fontSize: '12px' }}
                                                            />
                                                        </div>
                                                        {matrixSimPriceVal > 0 && (
                                                            <div style={{ fontSize: '11.5px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                <div style={{ color: matrixSimProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                                                    Profit: ₹{Math.round(matrixSimProfit).toLocaleString('en-IN')}
                                                                </div>
                                                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10.5px' }}>
                                                                    ₹{Math.round(matrixSimPerDay).toLocaleString('en-IN')} / day
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>

                                        </div>

                                        {/* Multi-Option Comparison Strip (When 2 or more options exist) */}
                                        {vehicleMatrices.length > 1 && (
                                            <div style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.08)'
                                            }}>
                                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#93c5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>📊</span> Side-by-Side Quotation Options Comparison ({vehicleMatrices.length} Options)
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: '10px' }}>
                                                    {vehicleMatrices.map((m, idx) => {
                                                        const mKm = parseFloat(m.totalKmRun) || 0;
                                                        const mAvg = parseFloat(m.vehicleAverage) || 0;
                                                        const mRate = parseFloat(m.fuelRate) || 0;
                                                        const mFuelCost = mAvg > 0 ? (mKm / mAvg) * mRate : 0;
                                                        const mDrv = parseFloat(m.driverSalary) || 0;
                                                        const mNight = parseFloat(m.nightHold) || 0;
                                                        const mToll = parseFloat(m.tollAndParking) || 0;
                                                        const mGst = parseFloat(m.gstAmount) || 0;
                                                        const mPkg = parseFloat(m.packageValue) || (idx === activeMatrixIndex ? matrixPackageVal : (parseFloat(formData.totalAmount) || 0));
                                                        const mCost = mFuelCost + mDrv + mNight + mToll + mGst;
                                                        const mProfit = mPkg - mCost;
                                                        const mPerDay = matrixDaysVal > 0 ? Math.round(mProfit / matrixDaysVal) : 0;
                                                        const isSelected = activeMatrixIndex === idx;

                                                        return (
                                                            <div
                                                                key={m.id || idx}
                                                                onClick={() => setActiveMatrixIndex(idx)}
                                                                style={{
                                                                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                                                    borderRadius: '10px',
                                                                    padding: '10px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#93c5fd' : 'white' }}>
                                                                        {m.title || `Option ${idx + 1}`}
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                        {m.carType || 'Car'}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fare:</span>
                                                                    <span style={{ color: '#fbbf24', fontWeight: '700' }}>₹{Math.round(mPkg).toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Cost:</span>
                                                                    <span style={{ color: '#f87171' }}>₹{Math.round(mCost).toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                                    <span style={{ color: 'white', fontWeight: '700' }}>Net Profit:</span>
                                                                    <span style={{ color: mProfit >= 0 ? '#4ade80' : '#f87171', fontWeight: '900' }}>
                                                                        ₹{Math.round(mProfit).toLocaleString('en-IN')} ({mPerDay >= 0 ? `+₹${mPerDay}` : `-₹${Math.abs(mPerDay)}`}/d)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 3: DAY-WISE ITINERARY & PRICING    */}
                                {/* ========================================== */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '14px',
                                    padding: '14px 16px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div
                                        onClick={() => setShowDetailedItinerary(prev => !prev)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            flexWrap: 'wrap',
                                            gap: '10px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                background: '#fbbf24',
                                                color: '#000',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '900',
                                                fontSize: '11px'
                                            }}>
                                                3
                                            </span>
                                            <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                                Day-wise Itinerary & Pricing (Optional)
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                background: showDetailedItinerary ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                                color: showDetailedItinerary ? '#fbbf24' : 'rgba(255, 255, 255, 0.55)',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: '700',
                                                border: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}>
                                                {showDetailedItinerary ? `${formData.itinerary?.length || 0} Days Visible` : 'Hidden (Click to Open)'}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDetailedItinerary(prev => !prev);
                                            }}
                                            style={{
                                                background: showDetailedItinerary ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                border: showDetailedItinerary ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                                color: showDetailedItinerary ? '#f87171' : '#fbbf24',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {showDetailedItinerary ? (
                                                <>
                                                    <ChevronUp size={15} /> Hide Itinerary & Pricing
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={15} /> + Add / Show Day-wise Itinerary & Pricing
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Collapsible Content */}
                                    {showDetailedItinerary && (
                                        <div style={{ marginTop: '14px' }}>
                                            {/* Day-wise Table */}
                                        <div style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            overflowX: 'auto'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
                                                <thead style={{ background: '#0a101d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '60px' }}>DAY</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '160px', minWidth: '160px' }}>DATE</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '110px' }}>TIME (Optional) ⓘ</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '55px' }}>APG ⓘ</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>ROUTE / ITINERARY</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '140px' }}>VEHICLE</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '70px' }}>QTY</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '800', color: '#f8fafc', textAlign: 'right', width: '140px', minWidth: '140px' }}>RATE (₹)</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '800', color: '#fbbf24', textAlign: 'right', width: '150px', minWidth: '150px' }}>AMOUNT (₹)</th>
                                                        <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '60px' }}>ACTION</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData.itinerary.map((day, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {/* DAY Badge */}
                                                            <td style={{ padding: '10px' }}>
                                                                <span style={{
                                                                    background: '#fbbf24',
                                                                    color: '#000',
                                                                    fontWeight: '900',
                                                                    fontSize: '11px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    display: 'inline-block'
                                                                }}>
                                                                    D{day.dayNo || idx + 1}
                                                                </span>
                                                            </td>

                                                            {/* DATE */}
                                                            <td style={{ padding: '10px', width: '160px', minWidth: '160px' }}>
                                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                    <input
                                                                        type="date"
                                                                        value={toLocalDateString(day.date)}
                                                                        onChange={e => handleItineraryRowChange(idx, 'date', e.target.value)}
                                                                        onClick={e => { try { if (e.target.showPicker) e.target.showPicker(); } catch(err){} }}
                                                                        style={{
                                                                            ...darkInputStyle,
                                                                            colorScheme: 'dark',
                                                                            padding: '7px 32px 7px 10px',
                                                                            fontSize: '13px',
                                                                            fontWeight: '600',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    />
                                                                    <Calendar
                                                                        size={15}
                                                                        color="#fbbf24"
                                                                        style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }}
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* TIME */}
                                                            <td style={{ padding: '10px', minWidth: '110px' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="09:00 AM"
                                                                    value={day.isApg ? 'APG' : (day.time || '')}
                                                                    disabled={day.isApg}
                                                                    onChange={e => handleItineraryRowChange(idx, 'time', e.target.value)}
                                                                    style={{
                                                                        ...darkInputStyle,
                                                                        padding: '6px 8px',
                                                                        fontSize: '12px',
                                                                        color: day.isApg ? '#fbbf24' : 'white',
                                                                        fontWeight: day.isApg ? '800' : 'normal'
                                                                    }}
                                                                />
                                                            </td>

                                                            {/* APG Checkbox */}
                                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!day.isApg}
                                                                    onChange={e => handleItineraryRowChange(idx, 'isApg', e.target.checked)}
                                                                    style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        accentColor: '#fbbf24',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                />
                                                            </td>

                                                            {/* ROUTE / ITINERARY */}
                                                            <td style={{ padding: '10px', minWidth: '220px' }}>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    placeholder="e.g. Airport Pickup & Local Sightseeing"
                                                                    value={day.duty || day.description || ''}
                                                                    onChange={e => handleItineraryRowChange(idx, 'duty', e.target.value)}
                                                                    style={{ ...darkInputStyle, padding: '6px 10px', fontSize: '12px' }}
                                                                />
                                                            </td>

                                                            {/* VEHICLE */}
                                                            <td style={{ padding: '10px', minWidth: '140px' }}>
                                                                <select
                                                                    value={day.vehicleType || formData.carType}
                                                                    onChange={e => handleItineraryRowChange(idx, 'vehicleType', e.target.value)}
                                                                    style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                                >
                                                                    {ALL_VEHICLES.map(v => (
                                                                        <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                                                    ))}
                                                                </select>
                                                            </td>

                                                            {/* QTY */}
                                                            <td style={{ padding: '10px', width: '70px', textAlign: 'center' }}>
                                                                <input
                                                                    required
                                                                    type="number"
                                                                    min="1"
                                                                    className="no-spinner"
                                                                    value={day.quantity !== undefined && day.quantity !== null && day.quantity !== '' ? day.quantity : (day.vehicleCount || 1)}
                                                                    onChange={e => handleItineraryRowChange(idx, 'quantity', e.target.value)}
                                                                    style={{
                                                                        ...darkInputStyle,
                                                                        padding: '6px 4px',
                                                                        fontSize: '13px',
                                                                        fontWeight: '700',
                                                                        color: '#ffffff',
                                                                        textAlign: 'center',
                                                                        width: '60px',
                                                                        margin: '0 auto',
                                                                        display: 'block'
                                                                    }}
                                                                />
                                                            </td>

                                                            {/* RATE (₹) */}
                                                            <td style={{ padding: '10px', width: '140px', minWidth: '140px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    className="no-spinner"
                                                                    value={day.rate !== undefined && day.rate !== null ? day.rate : 0}
                                                                    onChange={e => handleItineraryRowChange(idx, 'rate', e.target.value)}
                                                                    style={{
                                                                        ...darkInputStyle,
                                                                        padding: '8px 12px',
                                                                        fontSize: '14px',
                                                                        fontWeight: '700',
                                                                        textAlign: 'right',
                                                                        color: '#ffffff',
                                                                        width: '100%'
                                                                    }}
                                                                />
                                                            </td>

                                                            {/* AMOUNT (₹) */}
                                                            <td style={{ padding: '10px', width: '150px', minWidth: '150px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="no-spinner"
                                                                    value={day.amount !== undefined && day.amount !== null ? day.amount : 0}
                                                                    onChange={e => handleItineraryRowChange(idx, 'amount', e.target.value)}
                                                                    style={{
                                                                        ...darkInputStyle,
                                                                        padding: '8px 12px',
                                                                        fontSize: '15px',
                                                                        fontWeight: '900',
                                                                        textAlign: 'right',
                                                                        color: '#fbbf24',
                                                                        width: '100%'
                                                                    }}
                                                                />
                                                            </td>

                                                            {/* ACTION */}
                                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItineraryDay(idx)}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        padding: '4px'
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Bottom Sub-bar: + Add Another Day & Total */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: '12px',
                                            flexWrap: 'wrap',
                                            gap: '12px'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={addAnotherDay}
                                                style={{
                                                    background: 'rgba(245, 158, 11, 0.08)',
                                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                                    color: 'var(--primary)',
                                                    borderRadius: '8px',
                                                    padding: '8px 18px',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <Plus size={16} /> Add Another Day
                                            </button>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                background: '#0a101d',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                padding: '8px 20px'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                                                        Total Quoted Fare ({formData.gstMode === 'GST Extra' ? `${formData.gstRate || 5}% GST Extra` : formData.gstMode})
                                                    </span>
                                                    {formData.gstMode === 'GST Extra' && (
                                                        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                                                            (+ ₹{Math.round((formData.totalAmount * (formData.gstRate || 5)) / 100).toLocaleString('en-IN')} GST = ₹{Math.round(formData.totalAmount * (1 + (formData.gstRate || 5) / 100)).toLocaleString('en-IN')} Net)
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24' }}>
                                                    ₹{formData.totalAmount.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                                {/* ========================================== */}
                                {/* SECTION 4: REMARKS & INCLUSIONS (2-COL)   */}
                                {/* ========================================== */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                    {/* Left: Any Remark / Special Request of Guest */}
                                    <div style={{
                                        background: '#0a101d',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                                Any Remark / Special Request of Guest
                                            </span>
                                            <Info size={13} color="rgba(255,255,255,0.4)" />
                                        </div>

                                        <textarea
                                            maxLength={500}
                                            rows={4}
                                            placeholder="e.g. Have elderly travellers, need wheelchair assistance at airport. Prefer Non-AC for hill areas. Any other special request..."
                                            value={formData.specialRemarks}
                                            onChange={e => setFormData({ ...formData, specialRemarks: e.target.value })}
                                            style={{
                                                ...darkInputStyle,
                                                resize: 'none',
                                                lineHeight: '1.5',
                                                background: 'transparent',
                                                border: 'none',
                                                padding: 0
                                            }}
                                        />

                                        <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                            {(formData.specialRemarks || '').length}/500
                                        </div>
                                    </div>

                                    {/* Right: Trip Inclusion Remarks */}
                                    <div style={{
                                        background: '#0a101d',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                                Trip Inclusion Remarks
                                            </span>
                                            <Info size={13} color="rgba(255,255,255,0.4)" />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {[
                                                { key: 'driverAllowance', label: 'Driver allowance included' },
                                                { key: 'nightAllowance', label: 'Night allowance included' },
                                                { key: 'tollParking', label: 'Toll & parking charges included' },
                                                { key: 'gstIncluded', label: 'GST prices included' }
                                            ].map(({ key, label }) => (
                                                <label
                                                    key={key}
                                                    onClick={() => handleInclusionToggle(key)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        fontSize: '13px',
                                                        color: formData.inclusions?.[key] ? '#f1f5f9' : 'rgba(255,255,255,0.5)',
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        background: formData.inclusions?.[key] ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                                                        border: `1px solid ${formData.inclusions?.[key] ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#000',
                                                        fontSize: '12px',
                                                        fontWeight: '900'
                                                    }}>
                                                        {formData.inclusions?.[key] && '✓'}
                                                    </div>
                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Manual / Custom Inclusion Remarks (Auto-saved) */}
                                        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'rgba(255,255,255,0.75)' }}>
                                                    Manual / Custom Inclusions
                                                </label>
                                                <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '700' }}>
                                                    Auto-Saved
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={formData.inclusions?.manualRemarks || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        inclusions: {
                                                            ...(prev.inclusions || {}),
                                                            manualRemarks: val
                                                        }
                                                    }));
                                                    localStorage.setItem('last_manual_inclusion_remarks', val);
                                                }}
                                                placeholder="e.g. State border tax included. 250 KM/day limit. AC off on hills. Parking at client's cost..."
                                                style={{
                                                    width: '100%',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.12)',
                                                    borderRadius: '8px',
                                                    padding: '8px 10px',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit',
                                                    outline: 'none',
                                                    lineHeight: '1.4'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER ACTIONS                            */}
                                {/* ========================================== */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '16px',
                                    borderTop: '1px solid rgba(255,255,255,0.08)',
                                    flexWrap: 'wrap',
                                    gap: '14px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                                        <Info size={14} color="#38bdf8" />
                                        <span>Rates and amounts are indicative. You can modify them as per the discussion with the client.</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            style={{
                                                padding: '10px 22px',
                                                background: '#0a101d',
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            style={{
                                                padding: '10px 24px',
                                                background: '#fbbf24',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(251, 191, 36, 0.3)'
                                            }}
                                        >
                                            {editingLead ? 'Update Lead' : 'Save Lead'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Convert to Booking */}
            <AnimatePresence>
                {showConvertModal && convertingLead && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200005 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', padding: '20px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                                    <ShieldCheck size={26} />
                                </div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '900' }}>Confirm Booking</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                                    Convert <strong>{convertingLead.clientName}</strong> (Client Code: <strong>{convertingLead.clientCode || convertingLead.leadId}</strong>) into an official confirmed booking.
                                </p>
                            </div>

                            <form onSubmit={handleConvertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Total Package Amount:</span>
                                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#fbbf24' }}>₹{(convertingLead.totalAmount || 0).toLocaleString('en-IN')}</span>
                                </div>

                                {/* Tour Itinerary Schedule Breakdown */}
                                {convertingLead.itinerary && convertingLead.itinerary.length > 0 && (
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Calendar size={13} /> {convertingLead.itinerary.length} Day(s) Tour Itinerary
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                                                {formatTourDate(convertingLead.travelStartDate)} ➔ {formatTourDate(convertingLead.travelEndDate)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {convertingLead.itinerary.map((d, i) => (
                                                <div key={i} style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                                                    <span><strong style={{ color: '#fbbf24' }}>Day {d.dayNo || i + 1}:</strong> {d.duty || d.description || 'Duty'} <em style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>({d.vehicleType || convertingLead.carType})</em></span>
                                                    <span style={{ color: 'white', fontWeight: '800' }}>₹{(d.amount || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Advance Received (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 5000"
                                            value={advancePayment}
                                            onChange={e => setAdvancePayment(e.target.value)}
                                            style={{ ...darkInputStyle, fontSize: '16px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Received Date</label>
                                        <input
                                            type="date"
                                            value={advancePaymentDate}
                                            onChange={e => setAdvancePaymentDate(e.target.value)}
                                            style={{ ...darkInputStyle, fontSize: '16px', fontWeight: 'bold' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="UPI / QR Code">UPI / QR Code</option>
                                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                        <option value="Cash">Cash to Company</option>
                                        <option value="Driver Cash">Driver Cash in Hand</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>Transaction Ref / UTR (Optional)</label>
                                    <input type="text" placeholder="e.g. UTR12345678" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={darkInputStyle} />
                                </div>

                                {/* Receiving Bank Account */}
                                {(paymentMode === 'UPI / QR Code' || paymentMode === 'Bank Transfer / NEFT') && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                            Receiving Bank Account
                                        </label>
                                        <select
                                            value={selectedBankId}
                                            onChange={e => setSelectedBankId(e.target.value)}
                                            className="premium-compact-input"
                                            style={{ width: '100%', height: '40px' }}
                                        >
                                            <option value="">-- Select Bank Account --</option>
                                            {companyBanks.map(b => (
                                                <option key={b._id} value={b._id}>
                                                    {b.bankName} {b.accountNumber ? `(A/C: ${b.accountNumber.slice(-4)})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Payment Screenshot / Receipt */}
                                <div>
                                    <ImageUploader
                                        file={paymentScreenshotFile}
                                        onChange={setPaymentScreenshotFile}
                                        label="Payment Screenshot / Receipt (Sales Team)"
                                        color="#22c55e"
                                    />
                                </div>

                                {/* Admin Override if 0 advance */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={adminOverride} onChange={e => setAdminOverride(e.target.checked)} />
                                        <span>Confirm without advance (Admin Override)</span>
                                    </label>
                                    {adminOverride && (
                                        <input
                                            type="text"
                                            placeholder="Reason for zero advance (e.g. Corporate Client)..."
                                            value={adminOverrideReason}
                                            onChange={e => setAdminOverrideReason(e.target.value)}
                                            style={{ ...darkInputStyle, marginTop: '8px', fontSize: '12px' }}
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowConvertModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={isUploadingScreenshot} style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: isUploadingScreenshot ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {isUploadingScreenshot ? 'Uploading Receipt...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Enlist New Travel Agent Inline */}
            <AnimatePresence>
                {showAddAgentModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200010 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', padding: '24px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Briefcase size={20} color="#f59e0b" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Enlist Travel Agent</h3>
                                </div>
                                <button type="button" onClick={() => setShowAddAgentModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveNewAgent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Agency / Company Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Royal Tours & Travels"
                                        value={newAgentData.agencyName}
                                        onChange={e => setNewAgentData({ ...newAgentData, agencyName: e.target.value })}
                                        style={darkInputStyle}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Contact Person Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Ramesh Sharma"
                                        value={newAgentData.contactPerson}
                                        onChange={e => setNewAgentData({ ...newAgentData, contactPerson: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Phone / Mobile</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 9876543210"
                                            value={newAgentData.mobile}
                                            onChange={e => setNewAgentData({ ...newAgentData, mobile: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>City / Location</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Jaipur"
                                            value={newAgentData.city}
                                            onChange={e => setNewAgentData({ ...newAgentData, city: e.target.value })}
                                            style={darkInputStyle}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Email Address (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. agent@royaltours.com"
                                        value={newAgentData.email}
                                        onChange={e => setNewAgentData({ ...newAgentData, email: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>GSTIN (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 08AAAAA0000A1Z5"
                                        value={newAgentData.gstNumber}
                                        onChange={e => setNewAgentData({ ...newAgentData, gstNumber: e.target.value })}
                                        style={darkInputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowAddAgentModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={savingAgent} style={{ flex: 1, padding: '10px', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', cursor: savingAgent ? 'not-allowed' : 'pointer', fontWeight: '800' }}>
                                        {savingAgent ? 'Enlisting...' : 'Enlist Agent'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* 5. Tour Itinerary & Quotation Preview Modal (View Tour & Download as Image) */}
                {previewTourLead && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(3, 7, 18, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                width: '100%',
                                maxWidth: '900px',
                                maxHeight: '92vh',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Modal Header Bar */}
                            <div style={{
                                padding: '14px 20px',
                                background: '#050a14',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fbbf24'
                                    }}>
                                        <Eye size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>
                                            Tour Itinerary & Quotation
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            Client Code: <strong style={{ color: '#fbbf24' }}>{previewTourLead.clientCode || previewTourLead.leadId || 'N/A'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    

                                    <button
                                        type="button"
                                        onClick={() => setDownloadOptionModal({ type: 'image', lead: previewTourLead })}
                                        disabled={isGeneratingImage}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#fbbf24',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '12.5px',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: isGeneratingImage ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 2px 10px rgba(251, 191, 36, 0.35)',
                                            opacity: isGeneratingImage ? 0.7 : 1
                                        }}
                                        title="Download as high-resolution PNG image (with/without amount)"
                                    >
                                        <Download size={14} />
                                        <span>{isGeneratingImage ? 'Saving Image...' : 'Download as Image'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDownloadOptionModal({ type: 'pdf', lead: previewTourLead })}
                                        style={{
                                            padding: '8px 14px',
                                            background: 'rgba(255, 255, 255, 0.07)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            cursor: 'pointer'
                                        }}
                                        title="Download PDF document (with/without amount)"
                                    >
                                        <FileText size={13} />
                                        <span>PDF</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewTourLead(null)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Scrollable Body containing the downloadable Card */}
                            <div style={{
                                padding: '20px',
                                overflowY: 'auto',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                {/* The Capture Card */}
                                <div
                                    ref={tourCardRef}
                                    style={{
                                        width: '100%',
                                        maxWidth: '820px',
                                        background: '#090f1d',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        color: '#ffffff',
                                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                                    }}
                                >
                                    {/* Top Branded Accent Bar */}
                                    <div style={{ height: '5px', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />

                                    <div style={{ padding: '24px' }}>
                                        {/* Card Header: Company Details & Quotation Badge */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                            paddingBottom: '18px',
                                            marginBottom: '18px',
                                            flexWrap: 'wrap',
                                            gap: '14px'
                                        }}>
                                            <div>
                                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fbbf24', letterSpacing: '-0.5px' }}>
                                                    {selectedCompany?.name || 'YatreeDestination'}
                                                </h1>
                                                <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px', lineHeight: '1.5' }}>
                                                    <span>Contact: {selectedCompany?.whatsappNumber || selectedCompany?.phone || '+91 911234512345'}</span>
                                                    <span style={{ margin: '0 8px' }}>•</span>
                                                    <span>Email: {selectedCompany?.email || 'booking@yatree.com'}</span>
                                                    {selectedCompany?.gstNumber && (
                                                        <>
                                                            <span style={{ margin: '0 8px' }}>•</span>
                                                            <span>GSTIN: {selectedCompany.gstNumber}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Top Right Client Code Badge */}
                                            <div style={{
                                                background: 'rgba(251, 191, 36, 0.08)',
                                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                                borderRadius: '10px',
                                                padding: '8px 18px',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.5px' }}>
                                                    {showPriceInPreview ? 'TRAVEL QUOTATION / ITINERARY' : 'TOUR ITINERARY SCHEDULE'}
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                                                    Client Code: {previewTourLead.clientCode || previewTourLead.leadId || 'N/A'}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                                                    Date: {previewTourLead.leadDate ? new Date(previewTourLead.leadDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Guest & Trip Summary Box */}
                                        <div style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '10px',
                                            padding: '14px 18px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                            gap: '14px',
                                            marginBottom: '20px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '700', textTransform: 'uppercase' }}>
                                                    Guest Name
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginTop: '3px' }}>
                                                    {previewTourLead.clientName || 'Guest (TBA)'}
                                                </div>
                                                {previewTourLead.bookingReference === 'Travel Agent' && previewTourLead.travelAgentName ? (
                                                    <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px', fontWeight: '600' }}>
                                                        Agent: {previewTourLead.travelAgentName}{previewTourLead.travelAgentMobile ? ` (${previewTourLead.travelAgentMobile})` : ''}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                                                        {previewTourLead.mobileNumber || 'TBA'}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '700', textTransform: 'uppercase' }}>
                                                    Vehicle Assigned
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginTop: '3px' }}>
                                                    {previewTourLead.numberOfCars || 1}x {previewTourLead.carType || 'Sedan'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                                                    Source: {previewTourLead.source || 'Direct'}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '700', textTransform: 'uppercase' }}>
                                                    Travel Dates & Duration
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'white', marginTop: '3px' }}>
                                                    {previewTourLead.travelStartDate ? new Date(previewTourLead.travelStartDate).toLocaleDateString('en-IN') : 'TBA'} to {previewTourLead.travelEndDate ? new Date(previewTourLead.travelEndDate).toLocaleDateString('en-IN') : 'TBA'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px', fontWeight: '700' }}>
                                                    {getDaysDifference(toLocalDateString(previewTourLead.travelStartDate), toLocalDateString(previewTourLead.travelEndDate))} Days Tour
                                                </div>
                                            </div>
                                        </div>

                                        {/* Day-Wise Itinerary Table */}
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#fbbf24', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Day-Wise Tour Itinerary
                                            </div>
                                            <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#050a14', color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                            <th style={{ padding: '8px 12px', width: '55px' }}>Day</th>
                                                            <th style={{ padding: '8px 12px', width: '90px' }}>Date</th>
                                                            <th style={{ padding: '8px 12px', width: '80px' }}>Time</th>
                                                            <th style={{ padding: '8px 12px', width: '110px' }}>Pickup</th>
                                                            <th style={{ padding: '8px 12px' }}>Duty / Route Details</th>
                                                            <th style={{ padding: '8px 12px', width: '90px' }}>Vehicle</th>
                                                            {showPriceInPreview && (
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', width: '90px' }}>Amount</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(previewTourLead.itinerary || []).map((day, idx) => (
                                                            <tr key={idx} style={{
                                                                background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.04)',
                                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                            }}>
                                                                <td style={{ padding: '9px 12px', fontWeight: '800', color: '#fbbf24' }}>
                                                                    Day {day.dayNo || idx + 1}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                                                                    {day.date ? new Date(day.date).toLocaleDateString('en-IN') : 'TBA'}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600' }}>
                                                                    {day.isApg ? 'APG' : (day.time || '09:00 AM')}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                                                                    {day.pickupPoint || 'Hotel / City'}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', color: 'white', fontWeight: '600' }}>
                                                                    {day.duty || day.description || 'Sightseeing / Transfer'}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', color: 'rgba(255, 255, 255, 0.75)' }}>
                                                                    {day.vehicleType || previewTourLead.carType || 'Sedan'}
                                                                </td>
                                                                {showPriceInPreview && (
                                                                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '800', color: 'white' }}>
                                                                        ₹{(day.amount || 0).toLocaleString('en-IN')}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Bottom Grid: Inclusions, Special Remarks, Bank Info & Total Box */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '16px',
                                            marginBottom: '16px'
                                        }}>
                                            {/* Left: Inclusions, Remarks & Bank Account */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* Inclusions */}
                                                <div style={{
                                                    background: 'rgba(255, 255, 255, 0.025)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '8px',
                                                    padding: '12px'
                                                }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                        Trip Inclusions
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)' }}>
                                                        {previewTourLead.inclusions?.driverAllowance !== false && (
                                                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                                ✓ Driver Allowance
                                                            </span>
                                                        )}
                                                        {previewTourLead.inclusions?.nightAllowance !== false && (
                                                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                                ✓ Night Allowance
                                                            </span>
                                                        )}
                                                        {previewTourLead.inclusions?.tollParking !== false && (
                                                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                                ✓ Toll & Parking
                                                            </span>
                                                        )}
                                                        {previewTourLead.inclusions?.gstIncluded && (
                                                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                                ✓ GST Included
                                                            </span>
                                                        )}
                                                    </div>
                                                    {previewTourLead.inclusions?.manualRemarks && (
                                                        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#fef08a', lineHeight: '1.4', background: 'rgba(251, 191, 36, 0.05)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #fbbf24' }}>
                                                            <strong>Custom Inclusions:</strong> {previewTourLead.inclusions.manualRemarks}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Special Remarks if any */}
                                                {previewTourLead.specialRemarks && (
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.025)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '8px',
                                                        padding: '10px 12px',
                                                        fontSize: '11px',
                                                        color: 'rgba(255, 255, 255, 0.8)'
                                                    }}>
                                                        <strong style={{ color: 'white' }}>Guest Special Request:</strong> {previewTourLead.specialRemarks}
                                                    </div>
                                                )}

                                                {/* Bank Details for Advance */}
                                                {showPriceInPreview && companyBanks && companyBanks.length > 0 && (
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.025)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '8px',
                                                        padding: '10px 12px',
                                                        fontSize: '11px'
                                                    }}>
                                                        <div style={{ fontWeight: '800', color: '#38bdf8', marginBottom: '4px', textTransform: 'uppercase' }}>
                                                            Bank Details for Advance Payment
                                                        </div>
                                                        <div style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.5' }}>
                                                            <span><strong>Bank:</strong> {companyBanks[0].bankName}</span>
                                                            <span style={{ margin: '0 6px' }}>|</span>
                                                            <span><strong>A/C:</strong> {companyBanks[0].accountNumber || 'N/A'}</span>
                                                            <span style={{ margin: '0 6px' }}>|</span>
                                                            <span><strong>IFSC:</strong> {companyBanks[0].ifsc || 'N/A'}</span>
                                                            {companyBanks[0].upiId && (
                                                                <>
                                                                    <span style={{ margin: '0 6px' }}>|</span>
                                                                    <span><strong>UPI:</strong> {companyBanks[0].upiId}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Total Package Fare Box OR Clean Itinerary Note */}
                                            {showPriceInPreview ? (() => {
                                                const isExtra = previewTourLead.gstMode === 'GST Extra';
                                                const rPercent = previewTourLead.gstRate || 5;
                                                const bAmt = previewTourLead.totalAmount || 0;
                                                const gVal = Math.round((bAmt * rPercent) / 100);
                                                const nPayable = isExtra ? (bAmt + gVal) : bAmt;

                                                return (
                                                    <div style={{
                                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(217, 119, 6, 0.05))',
                                                        border: '1px solid rgba(251, 191, 36, 0.35)',
                                                        borderRadius: '10px',
                                                        padding: '16px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                Quotation Summary
                                                            </div>
                                                            {isExtra ? (
                                                                <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                        <span>Base Fare:</span>
                                                                        <span style={{ color: 'white', fontWeight: '700' }}>₹{bAmt.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span>GST ({rPercent}% Extra):</span>
                                                                        <span style={{ color: 'white', fontWeight: '700' }}>₹{gVal.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px' }}>
                                                                    Includes all specified duties, vehicle and {previewTourLead.gstMode || 'GST Inclusive'}.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                                            <div style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase' }}>
                                                                {isExtra ? 'Total Amount Payable' : 'Total Package Fare'}
                                                            </div>
                                                            <div style={{ fontSize: '26px', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                                                                ₹{nPayable.toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })() : (
                                                <div style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '10px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            Tour Program Overview
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '8px', lineHeight: '1.6' }}>
                                                            <div>• <strong>Assigned Fleet:</strong> {previewTourLead.numberOfCars || 1}x {previewTourLead.carType || 'Sedan'}</div>
                                                            <div>• <strong>Duration:</strong> {getDaysDifference(toLocalDateString(previewTourLead.travelStartDate), toLocalDateString(previewTourLead.travelEndDate))} Days Complete Tour</div>
                                                            <div>• <strong>Quality Guarantee:</strong> Clean commercial fleet with verified chauffeur</div>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                        <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '800' }}>✓ Official Route & Schedule Verified</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Terms & Conditions Footer */}
                                        <div style={{
                                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                            paddingTop: '12px',
                                            fontSize: '10px',
                                            color: 'rgba(255, 255, 255, 0.45)',
                                            lineHeight: '1.5'
                                        }}>
                                            <div>• AC will remain switched off during hill sections or when vehicle is parked.</div>
                                            <div>• Exclusions: Monument entry fees, camera tickets, activities, guide fees, or any unmentioned routes.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 6. Export Options Modal (With Amount vs Without Amount) */}
                {downloadOptionModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(3, 7, 18, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '460px',
                            background: '#0d1526',
                            border: '1px solid rgba(251, 191, 36, 0.35)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '17px', fontWeight: '900' }}>
                                    {downloadOptionModal.type === 'image' ? '🖼️ Download Image Options' : '📄 Download PDF Options'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setDownloadOptionModal(null)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'rgba(255,255,255,0.7)',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', marginBottom: '18px', lineHeight: '1.4' }}>
                                Select whether you want to display quotation prices or export itinerary without pricing figures for your client.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Option 1: With Amount */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (downloadOptionModal.type === 'image') {
                                            handleDownloadTourImage(true);
                                        } else {
                                            generateQuotationPDF(downloadOptionModal.lead || previewTourLead, { withAmount: true });
                                            setDownloadOptionModal(null);
                                        }
                                    }}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(251, 191, 36, 0.08)',
                                        border: '1px solid rgba(251, 191, 36, 0.35)',
                                        borderRadius: '12px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)'}
                                >
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>
                                            💰 With Amount (Full Quotation)
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                            Shows day-wise amount, base fare, GST & total payable price.
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '900' }}>➔</span>
                                </button>

                                {/* Option 2: Without Amount */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (downloadOptionModal.type === 'image') {
                                            handleDownloadTourImage(false);
                                        } else {
                                            generateQuotationPDF(downloadOptionModal.lead || previewTourLead, { withAmount: false });
                                            setDownloadOptionModal(null);
                                        }
                                    }}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '12px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                                >
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>
                                            📄 Without Amount (Itinerary Only)
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                            Hides all prices & amounts. Shows clean route itinerary only.
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '18px', color: 'white', fontWeight: '900' }}>➔</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        
            {/* Remarks Modal */}
            <AnimatePresence>
                {remarksModalLead && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                background: '#111827', width: '90%', maxWidth: '600px',
                                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                                overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh'
                            }}
                        >
                            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MessageSquare size={18} color="var(--primary)" />
                                    Lead Remarks & Conversation
                                </h3>
                                <button onClick={() => setRemarksModalLead(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {(!remarksModalLead.remarksHistory || remarksModalLead.remarksHistory.length === 0) ? (
                                    <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>No remarks yet.</div>
                                ) : (
                                    remarksModalLead.remarksHistory.map((rem, idx) => {
                                        return (
                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                                                    {new Date(rem.date).toLocaleString()}
                                                </div>
                                                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                                    {rem.text}
                                                </div>
                                                {rem.attachmentUrl && (
                                                    <a href={rem.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '6px 12px', background: 'rgba(251,191,36,0.1)', color: 'var(--primary)', textDecoration: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                                                        <ImageIcon size={14} /> View Attachment
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                                <textarea
                                    id="newRemarkText"
                                    placeholder="Type a new remark..."
                                    rows={3}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'white', marginBottom: '12px', resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <input type="file" id="newRemarkFile" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0) document.getElementById('newRemarkFileName').innerText = e.target.files[0].name; else document.getElementById('newRemarkFileName').innerText = ''; }} />
                                        <button onClick={() => document.getElementById('newRemarkFile').click()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                            <UploadCloud size={14} /> Attach File / Photo
                                        </button>
                                        <span id="newRemarkFileName" style={{ marginLeft: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}></span>
                                    </div>
                                    <button
                                        onClick={async (e) => {
                                            const btn = e.currentTarget;
                                            const text = document.getElementById('newRemarkText').value;
                                            const fileInput = document.getElementById('newRemarkFile');
                                            if (!text.trim()) return alert('Please enter a remark');
                                            
                                            btn.disabled = true;
                                            btn.innerText = 'Saving...';
                                            
                                            try {
                                                let attachmentUrl = null;
                                                if (fileInput.files.length > 0) {
                                                    const formData = new FormData();
                                                    formData.append('file', fileInput.files[0]);
                                                    const uploadRes = await axios.post('/api/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                                                    attachmentUrl = uploadRes.data.url;
                                                }
                                                await axios.post(`/api/leads/${remarksModalLead._id}/remarks`, { text, attachmentUrl });
                                                
                                                fetchLeads();
                                                const res = await axios.get(`/api/leads/single/${remarksModalLead._id}`);
                                                setRemarksModalLead(res.data);
                                                
                                                document.getElementById('newRemarkText').value = '';
                                                fileInput.value = '';
                                                document.getElementById('newRemarkFileName').innerText = '';
                                            } catch (err) {
                                                console.error(err);
                                                alert('Error adding remark');
                                            } finally {
                                                btn.disabled = false;
                                                btn.innerText = 'Save Remark';
                                            }
                                        }}
                                        style={{ background: 'var(--primary)', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Save Remark
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* FULL SCREEN IMAGE VIEWER MODAL */}
            <AnimatePresence>
                {viewingImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(5px)',
                            zIndex: 999999,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '40px'
                        }}
                        onClick={() => setViewingImage(null)}
                    >
                        <button 
                            onClick={() => setViewingImage(null)}
                            style={{ position: 'absolute', top: '20px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={viewingImage} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
</div>
    );
}
