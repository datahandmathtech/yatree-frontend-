import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Plus, Edit, Trash2, FileText, CheckCircle, X, Download, Briefcase,
    Calendar, Car, IndianRupee, MapPin, Search, Filter, AlertTriangle,
    Clock, Phone, ShieldCheck, Share2, HelpCircle, User, Users,
    Globe, Building2, Repeat, CircleDot, XCircle, ChevronLeft, ChevronRight, ChevronDown,
    TrendingUp, BarChart2, BarChart3, Info, CheckSquare, Square, CreditCard,
    Landmark, UploadCloud, Camera, Eye, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import ImageUploader from '../components/common/ImageUploader';

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


const SIDEBAR_MONTH_OPTIONS = [
    { label: 'April 2026', tab: 'Apr', monthIdx: 3, year: 2026, days: 30 },
    { label: 'May 2026', tab: 'May', monthIdx: 4, year: 2026, days: 31 },
    { label: 'June 2026', tab: 'Jun', monthIdx: 5, year: 2026, days: 30 },
    { label: 'July 2026', tab: 'Jul', monthIdx: 6, year: 2026, days: 31 },
    { label: 'August 2026', tab: 'Aug', monthIdx: 7, year: 2026, days: 31 },
    { label: 'September 2026', tab: 'Sep', monthIdx: 8, year: 2026, days: 30 },
    { label: 'October 2026', tab: 'Oct', monthIdx: 9, year: 2026, days: 31 },
    { label: 'November 2026', tab: 'Nov', monthIdx: 10, year: 2026, days: 30 },
    { label: 'December 2026', tab: 'Dec', monthIdx: 11, year: 2026, days: 31 },
    { label: 'January 2027', tab: 'Jan', monthIdx: 0, year: 2027, days: 31 },
    { label: 'February 2027', tab: 'Feb', monthIdx: 1, year: 2027, days: 28 },
    { label: 'March 2027', tab: 'Mar', monthIdx: 2, year: 2027, days: 31 }
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
    const [uploading, setUploading] = React.useState(false);
    const lastRemark = lead.remarksHistory?.[lead.remarksHistory.length - 1];

    const handleSave = async (attachmentUrl = null) => {
        if (!text.trim() && !attachmentUrl) return;
        try {
            await axios.post(`/api/leads/${lead._id}/remarks`, { text: text || 'File Attached', attachmentUrl });
            setText('');
            fetchLeads();
        } catch (e) {
            alert('Failed to save remark');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await axios.post('/api/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            await handleSave(data.url);
        } catch (e) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '240px' }} onClick={e => e.stopPropagation()}>
            {lastRemark ? (
                <div style={{ borderLeft: '2px solid rgba(59, 130, 246, 0.5)', paddingLeft: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'white', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lastRemark.text}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{new Date(lastRemark.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        {lastRemark.attachmentUrl && (
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    let url = lastRemark.attachmentUrl;
                                    if (url.includes('taxi-fleet-crm/documents')) {
                                        const parts = url.split('taxi-fleet-crm/documents/');
                                        url = 'https://res.cloudinary.com/doaymwjki/image/upload/v1/taxi-fleet-crm/documents/' + parts[1];
                                    } else if (!url.startsWith('http')) {
                                        url = `http://127.0.0.1:5005${url}`;
                                    }
                                    setViewingImage(url);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', cursor: 'pointer' }}
                             >
                                <Eye size={10} /> View
                             </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '4px' }}>No remarks yet</div>
            )}
            
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s ease' }}>
                <input 
                      type="text" 
                      value={text} 
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      placeholder="Type remark & press Enter..." 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '11px', outline: 'none' }}
                  />
                
                {uploading ? (
                    <span style={{ fontSize: '10px', color: '#38bdf8', padding: '4px' }}>Wait...</span>
                ) : (
                    <>
                        <label style={{ cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.6)', padding: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} title="Attach Photo/Camera">
                            <Camera size={14} />
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        
                        <label style={{ cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.6)', padding: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} title="Attach Document">
                            <FileText size={14} />
                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    </>
                )}
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
    const [statusFilter, setStatusFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [salesPersonFilter, setSalesPersonFilter] = useState('All');

    // Hover tooltip state
    const [hoveredLeadId, setHoveredLeadId] = useState(null);
    // Right Analytics Sidebar state (Closed by default as requested)
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const selectedSidebarMonth = useMemo(() => {
        if (monthFilter === 'All') {
            const currentMonthIdx = new Date().getMonth();
            const opt = SIDEBAR_MONTH_OPTIONS.find(o => o.monthIdx === currentMonthIdx);
            return opt ? opt.label : 'September 2026';
        } else {
            const opt = SIDEBAR_MONTH_OPTIONS.find(o => o.tab === monthFilter);
            return opt ? opt.label : 'September 2026';
        }
    }, [monthFilter]);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [sidebarLeads, setSidebarLeads] = useState([]);
    const [loadingSidebarLeads, setLoadingSidebarLeads] = useState(false);
    const searchDebounceRef = useRef(null);

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
        carType: 'Innova Crysta',
        numberOfCars: 1,
        gstMode: 'GST Inclusive',
        gstRate: 5,
        status: 'New',
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
        }
    }, [selectedCompany, statusFilter, monthFilter]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            let url = `/api/leads/${selectedCompany._id}?status=${statusFilter}`;
            if (monthFilter && monthFilter !== 'All') {
                url += `&month=${monthFilter}`;
            }
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setLeads(data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSidebarLeads = async (monthTab) => {
        if (!selectedCompany?._id) return;
        try {
            setLoadingSidebarLeads(true);
            let url = `/api/leads/${selectedCompany._id}?status=All`;
            if (monthTab && monthTab !== 'All') {
                url += `&month=${monthTab}`;
            }
            const { data } = await axios.get(url);
            setSidebarLeads(data || []);
        } catch (err) {
            console.error('Error fetching sidebar leads:', err);
        } finally {
            setLoadingSidebarLeads(false);
        }
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            const activeOption = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5];
            fetchSidebarLeads(activeOption.tab);
        }
    }, [selectedCompany, selectedSidebarMonth]);

    useEffect(() => {
        if (!selectedCompany?._id) return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchLeads();
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLeads();
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

    // Auto-populate itinerary days when travel dates change
    const handleTravelDateChange = (field, value) => {
        setFormData(prev => {
            let sDate = field === 'travelStartDate' ? value : prev.travelStartDate;
            let eDate = field === 'travelEndDate' ? value : prev.travelEndDate;

            if (field === 'travelStartDate' && (!eDate || eDate < value)) {
                eDate = value;
            } else if (field === 'travelEndDate' && (!sDate || value < sDate)) {
                sDate = value;
            }

            const updated = {
                ...prev,
                [field]: value,
                travelStartDate: sDate,
                travelEndDate: eDate
            };

            if (sDate && eDate) {
                const daysCount = getDaysDifference(sDate, eDate);
                const newItinerary = [];

                for (let i = 0; i < daysCount; i++) {
                    const dateStr = addDaysToDateString(sDate, i);

                    // Keep existing day info if already entered
                    const existingDay = prev.itinerary[i];
                    const isApg = existingDay ? existingDay.isApg : false;
                    const rate = existingDay ? (Number(existingDay.rate) || 0) : 0;
                    const qty = existingDay ? (Number(existingDay.quantity || existingDay.vehicleCount) || updated.numberOfCars || 1) : (updated.numberOfCars || 1);

                    newItinerary.push({
                        dayNo: i + 1,
                        date: dateStr,
                        time: existingDay?.time || (isApg ? 'APG' : (i === 0 ? '09:00 AM' : '10:00 AM')),
                        isApg: isApg,
                        duty: existingDay?.duty || (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                        description: existingDay?.description || existingDay?.duty || (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                        vehicleType: existingDay?.vehicleType || updated.carType || 'Innova Crysta',
                        vehicleCount: qty,
                        quantity: qty,
                        rate: rate,
                        amount: existingDay ? (Number(existingDay.amount) || (qty * rate)) : (qty * rate)
                    });
                }

                const total = newItinerary.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                updated.itinerary = newItinerary;
                updated.totalAmount = total;
            }
            return updated;
        });
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
        setFormData(prev => ({ ...prev, itinerary: updated, totalAmount: total }));
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
            itinerary: updated,
            travelEndDate: nextDate || prev.travelEndDate
        }));
    };

    const removeItineraryDay = (index) => {
        const updated = formData.itinerary
            .filter((_, i) => i !== index)
            .map((d, i) => ({ ...d, dayNo: i + 1 }));
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const lastDay = updated[updated.length - 1];
        const newEndDate = lastDay?.date ? toLocalDateString(lastDay.date) : formData.travelStartDate;
        setFormData(prev => ({
            ...prev,
            itinerary: updated,
            travelEndDate: newEndDate,
            totalAmount: total
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
            setPreviewClientCode(lead.clientCode || lead.leadId || '');
            const sDate = toLocalDateString(lead.travelStartDate);
            const eDate = toLocalDateString(lead.travelEndDate);
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
                carType: lead.carType || 'Innova Crysta',
                numberOfCars: lead.numberOfCars || 1,
                gstMode: lead.gstMode || 'GST Inclusive',
                gstRate: lead.gstRate || 5,
                status: lead.status || 'New',
                notes: lead.notes || '',
                specialRemarks: lead.specialRemarks || '',
                inclusions: {
                    driverAllowance: lead.inclusions?.driverAllowance !== false,
                    nightAllowance: lead.inclusions?.nightAllowance !== false,
                    tollParking: lead.inclusions?.tollParking !== false,
                    gstIncluded: lead.inclusions?.gstIncluded !== false,
                    manualRemarks: lead.inclusions?.manualRemarks || ''
                },
                itinerary: (lead.itinerary || []).map((d, i) => {
                    return {
                        dayNo: d.dayNo || i + 1,
                        date: toLocalDateString(d.date),
                        time: d.time || '09:00 AM',
                        isApg: d.isApg || d.time === 'APG',
                        duty: d.duty || d.description || 'Standard Duty',
                        description: d.duty || d.description || 'Standard Duty',
                        vehicleType: d.vehicleType || lead.carType || 'Innova Crysta',
                        vehicleCount: d.vehicleCount || lead.numberOfCars || 1,
                        quantity: d.quantity || d.vehicleCount || lead.numberOfCars || 1,
                        rate: d.rate !== undefined ? d.rate : 0,
                        amount: d.amount !== undefined ? d.amount : 0
                    };
                }),
                extraCharges: lead.extraCharges || [],
                totalAmount: lead.totalAmount || 0
            });
        } else {
            setEditingLead(null);
            const today = toLocalDateString(new Date());
            fetchNextClientCodePreview(today);

            const initialItinerary = [
                {
                    dayNo: 1,
                    date: today,
                    time: '09:00 AM',
                    isApg: false,
                    duty: 'Airport Pickup & Local Sightseeing',
                    description: 'Airport Pickup & Local Sightseeing',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                }
            ];

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
                carType: 'Innova Crysta',
                numberOfCars: 1,
                gstMode: 'GST Inclusive',
                gstRate: 5,
                status: 'New',
                notes: '',
                specialRemarks: '',
                inclusions: {
                    driverAllowance: true,
                    nightAllowance: true,
                    tollParking: true,
                    gstIncluded: true,
                    manualRemarks: localStorage.getItem('last_manual_inclusion_remarks') || ''
                },
                itinerary: initialItinerary,
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

            const payload = {
                ...formData,
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
        doc.text(`Travel Dates: ${sDate} to ${eDate} (${diffDays} Days)`, 120, 50);

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

    // Filter leads on client side: Confirmed leads move to Confirmed Bookings page, so exclude from this active leads grid
    const filteredLeads = useMemo(() => {
        return (leads || []).filter(lead => {
            // Confirmed leads are moved to Confirmed Bookings page, so do not display them in Sales Leads table!
            if (lead.status === 'Confirmed' || lead.bookingId) {
                return false;
            }

            if (sourceFilter !== 'All' && lead.source !== sourceFilter) return false;
            if (salesPersonFilter !== 'All' && lead.salesPerson !== salesPersonFilter) return false;

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
    }, [leads, sourceFilter, salesPersonFilter, searchTerm]);

    // Unique sales persons
    const salesPersonsList = useMemo(() => {
        const set = new Set();
        leads.forEach(l => { if (l.salesPerson) set.add(l.salesPerson); });
        return Array.from(set);
    }, [leads]);

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

    // Calculate Right Sidebar daily breakdown and totals
    const sidebarStats = useMemo(() => {
        const activeOption = SIDEBAR_MONTH_OPTIONS.find(o => o.label === selectedSidebarMonth) || SIDEBAR_MONTH_OPTIONS[5]; // default September
        const { monthIdx, year, days } = activeOption;

        // Use dedicated sidebarLeads fetched independently for this month, or fallback to leads
        const sourceList = (sidebarLeads && sidebarLeads.length > 0) ? sidebarLeads : leads;

        // Filter real leads that overlap with this month and year
        const monthRealLeads = (sourceList || []).filter(l => {
            if (l.status === 'Lost' || l.status === 'Cancelled' || l.status === 'Confirmed' || l.bookingId) return false;
            const pStart = parseLeadDateInfo(l.travelStartDate || l.leadDate || l.createdAt);
            if (!pStart) return false;
            
            const startD = new Date(pStart.year, pStart.monthIdx, pStart.day);
            const pEnd = parseLeadDateInfo(l.travelEndDate);
            const endD = pEnd ? new Date(pEnd.year, pEnd.monthIdx, pEnd.day) : startD;
            
            const monthStart = new Date(year, monthIdx, 1);
            const monthEnd = new Date(year, monthIdx, days);
            
            return startD <= monthEnd && endD >= monthStart;
        });

        // If real leads exist for this month, calculate directly from them
        if (monthRealLeads.length > 0) {
            const dailyList = [];
            
            let totalLeads = monthRealLeads.length;
            let totalLeadsAmt = monthRealLeads.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);
            
            const convs = monthRealLeads.filter(l => l.status === 'Confirmed' || l.status === 'Converted' || l.bookingId);
            let totalConversions = convs.length;
            let totalConversionsAmt = convs.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);

            for (let day = 1; day <= days; day++) {
                const dayLeads = monthRealLeads.filter(l => {
                    // Check if this 'day' falls within the lead's travel dates
                    const pStart = parseLeadDateInfo(l.travelStartDate || l.leadDate || l.createdAt);
                    if (!pStart) return false;
                    
                    // If no end date, just check the start date
                    if (!l.travelEndDate) {
                        return pStart.year === year && pStart.monthIdx === monthIdx && pStart.day === day;
                    }
                    
                    // If there's an end date, check the range
                    const startD = new Date(pStart.year, pStart.monthIdx, pStart.day);
                    const pEnd = parseLeadDateInfo(l.travelEndDate);
                    const endD = pEnd ? new Date(pEnd.year, pEnd.monthIdx, pEnd.day) : startD;
                    
                    const currentD = new Date(year, monthIdx, day);
                    return currentD >= startD && currentD <= endD;
                });

                const leadsCount = dayLeads.length;
                const leadsAmt = dayLeads.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);
                const convLeads = dayLeads.filter(l => l.status === 'Confirmed' || l.status === 'Converted' || l.bookingId);
                const convCount = convLeads.length;
                const convAmt = convLeads.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);

                // Removed incorrect daily accumulation to avoid double counting

                dailyList.push({ day, leadsCount, leadsAmt, convCount, convAmt, leads: dayLeads });
            }

            const today = new Date().getDate();
            dailyList.sort((a, b) => {
                if (a.day === today) return -1;
                if (b.day === today) return 1;
                return a.day - b.day;
            });
            return {
                totalLeads,
                totalLeadsAmt,
                totalConversions,
                totalConversionsAmt,
                dailyList
            };
        }

        

        // Generic empty month
        const dailyList = [];
        for (let day = 1; day <= days; day++) {
            dailyList.push({ day, leadsCount: 0, leadsAmt: 0, convCount: 0, convAmt: 0, leads: [] });
        }
        const today = new Date().getDate();
        dailyList.sort((a, b) => {
            if (a.day === today) return -1;
            if (b.day === today) return 1;
            return a.day - b.day;
        });
        return {
            totalLeads: 0,
            totalLeadsAmt: 0,
            totalConversions: 0,
            totalConversionsAmt: 0,
            dailyList
        };
    }, [sidebarLeads, leads, selectedSidebarMonth]);

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

            {/* 2. FY Badge & Month Tabs Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '16px'
            }}>
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: '#fbbf24',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: '900',
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap'
                }}>
                    FY 26-27
                </div>

                {MONTH_TABS.map(m => {
                    const isActive = monthFilter === m;
                    return (
                        <button
                            key={m}
                            onClick={() => {
                                setMonthFilter(m);
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '20px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: isActive ? '800' : '600',
                                cursor: 'pointer',
                                background: isActive ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                                color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {m}
                        </button>
                    );
                })}
            </div>

            {/* Main Content Layout: Table & Pagination */}
            <div style={{ width: '100%', position: 'relative' }}>
                {/* Full Width Table Content */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

                    {/* 3. Filter Bar: Search + Sales Person Dropdown + Source Dropdown */}
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
                        <form onSubmit={(e) => { e.preventDefault(); fetchLeads(); }} style={{ flex: '1 1 320px', display: 'flex', gap: '8px' }}>
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

            {/* 4. Leads Table Matching Reference Design */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '14px' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Lead Created ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Client Code ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Source ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Travel Month ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Price ↕
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
                                <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div className="loader" style={{ margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Loading leads...</div>
                                </td>
                            </tr>
                        ) : paginatedLeads.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
                                    No leads found for this filter. Click <strong>+ Create a Lead</strong> to get started!
                                </td>
                            </tr>
                        ) : paginatedLeads.map((lead) => {
                            const travelInfo = formatTravelMonth(lead.travelStartDate, lead.travelEndDate);

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

                                    {/* 3. Source */}
                                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>
                                        {renderSourceIcon(lead.source)}
                                    </td>

                                    {/* 4. Travel Month */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>
                                            {travelInfo.month}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                            Days: {travelInfo.days}
                                        </div>
                                    </td>

                                    {/* 5. Price */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>
                                            ₹{(lead.totalAmount || 0).toLocaleString('en-IN')}
                                        </div>
                                    </td>

                                    
                                    {/* 6. Status */}
                                    <td style={{ padding: '16px 20px', maxWidth: '240px', verticalAlign: 'middle' }}>
                                        <InlineRemarkEditor lead={lead} fetchLeads={fetchLeads} setViewingImage={setViewingImage} customRemarks={customRemarks} setCustomRemarks={setCustomRemarks} selectedCompany={selectedCompany} />
                                    </td>

                                    {/* 7. Actions */}
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {/* Record Advance / Confirm action */}
                                            {lead.status !== 'Confirmed' ? (
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
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        fontWeight: '800',
                                                        fontSize: '11.5px',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <CheckCircle size={13} /> Confirm / Record Advance
                                                </button>
                                            ) : (
                                                <a
                                                    href="/admin/bookings"
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
                                                        textDecoration: 'none'
                                                    }}
                                                    title="View in Confirmed Bookings"
                                                >
                                                    <CheckCircle size={12} /> Confirmed (View ➔)
                                                </a>
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
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%', paddingRight: '15px' }}>
    <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#fbbf24" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.3px' }}>
                Daily Lead Breakdown
            </h3>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
            Tally-style analytics
        </div>
    </div>
    <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '700' }}>Total Leads</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>{sidebarStats.totalLeads}</div>
        </div>
        
    </div>
</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowRightSidebar(false)}
                                    style={{
                                        width: '34px',
                                        height: '34px',
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
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Drawer Body (Scrollable) */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                                {/* Day-wise Scrollable Table */}
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                    {sidebarStats.dailyList.map(item => {
                                        const isExpanded = expandedBreakdownDay === item.day;
                                        const hasLeads = (item.leads && item.leads.length > 0) || item.leadsCount > 0;

                                        return (
                                            <div key={item.day} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                {/* Day Row */}
                                                <div
                                                    onClick={() => {
                                                        setExpandedBreakdownDay(isExpanded ? null : item.day);
                                                    }}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '60px 1fr',
                                                        padding: '10px 8px',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        background: isExpanded ? 'rgba(251, 191, 36, 0.08)' : (new Date().getDate() === item.day && selectedSidebarMonth === new Date().toLocaleString('en-US', { month: 'short' }) + ' ' + new Date().getFullYear() ? 'rgba(34, 197, 94, 0.2)' : (hasLeads ? 'rgba(255, 255, 255, 0.015)' : 'transparent')),
                                                        borderLeft: isExpanded ? '3px solid #fbbf24' : '3px solid transparent',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!isExpanded) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (!isExpanded) e.currentTarget.style.background = hasLeads ? 'rgba(255, 255, 255, 0.015)' : 'transparent';
                                                    }}
                                                    title={hasLeads ? `Click to view ${item.leadsCount} lead entries for Day ${item.day}` : `Day ${item.day}`}
                                                >
                                                    {/* Day Number + Expand Indicator */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontWeight: '800', fontSize: '13px', color: isExpanded ? '#fbbf24' : '#f8fafc' }}>
                                                            {item.day}
                                                        </span>
                                                        {hasLeads && (
                                                            <span style={{ fontSize: '9px', color: isExpanded ? '#fbbf24' : 'rgba(255,255,255,0.4)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                                                                ▼
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Leads */}
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: '800', fontSize: '13px', color: item.leadsCount > 0 ? 'white' : 'rgba(255,255,255,0.3)' }}>
                                                            {item.leadsCount}
                                                        </div>
                                                        <div style={{ fontSize: '11px', fontWeight: '600', color: item.leadsCount > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                                                            ₹{item.leadsAmt.toLocaleString('en-IN')}
                                                        </div>
                                                    </div>

                                                    
                                                </div>

                                                {/* Expanded Day Details (Showing multiple entries) */}
                                                {isExpanded && (
                                                    <div style={{
                                                        background: 'rgba(0, 0, 0, 0.45)',
                                                        padding: '10px 10px 14px 10px',
                                                        borderTop: '1px solid rgba(251, 191, 36, 0.15)',
                                                        borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '8px',
                                                            paddingBottom: '4px',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                                                        }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                Day {item.day} Breakdown · {item.leads?.length || item.leadsCount} {item.leads?.length === 1 ? 'Entry' : 'Entries'}
                                                            </span>
                                                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)' }}>
                                                                {selectedSidebarMonth}
                                                            </span>
                                                        </div>

                                                        {item.leads && item.leads.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {item.leads.map((lead, idx) => (
                                                                    <div
                                                                        key={lead._id || lead.leadId || idx}
                                                                        onClick={() => setPreviewTourLead(lead)}
                                                                        title="Click to view full details"
                                                                        style={{
                                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                            borderRadius: '8px',
                                                                            padding: '12px',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            marginBottom: '8px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24' }}>
                                                                                Code: {lead.clientCode || lead.leadId || 'N/A'}
                                                                            </div>
                                                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Details 👁️</span>
                                                                        </div>
                                                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#4ade80' }}>
                                                                            ₹{(Number(lead.totalAmount) || 0).toLocaleString('en-IN')}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                padding: '12px',
                                                                textAlign: 'center',
                                                                fontSize: '11.5px',
                                                                color: 'rgba(255, 255, 255, 0.45)',
                                                                background: 'rgba(255, 255, 255, 0.02)',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {item.leadsCount > 0 ? (
                                                                    <span>No detailed lead records stored for baseline mockup data.</span>
                                                                ) : (
                                                                    <span>No lead entries recorded on Day {item.day}.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            
                        </motion.aside>
                    </>
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
                                                            totalAmount: total
                                                        };
                                                    });
                                                }}
                                                style={darkInputStyle}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 3: DAY-WISE ITINERARY & PRICING    */}
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
                                            3
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Day-wise Itinerary & Pricing
                                        </span>
                                    </div>

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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '30px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
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
                                    <span style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>₹{(convertingLead.totalAmount || 0).toLocaleString('en-IN')}</span>
                                </div>

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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '24px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
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
