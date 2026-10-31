import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Camera,
    MapPin,
    CheckCircle,
    LogOut,
    Car,
    AlertTriangle,
    User as UserIcon,
    RefreshCw,
    X,
    Plus,
    Trash2,
    Droplets,
    Clock,
    Wrench,
    ChevronLeft,
    ChevronRight,
    Wallet,
    LayoutDashboard,
    Download,
    Smartphone,
    ClipboardList,
    ArrowRight,
    Lock,
    ShieldCheck,
    Calendar,
    Phone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../context/LanguageContext';
import SEO from '../components/SEO';
import {
    todayIST,
    toISTDateString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';


const CameraModal = ({ side, onCapture, onClose }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: side === 'selfie' ? 'user' : 'environment',
                    width: { ideal: 800 },
                    height: { ideal: 600 }
                }
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError(t('cameraError'));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log("Track stopped:", track.label);
            });
            streamRef.current = null;
        }
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const file = new File([blob], `${side}.jpg`, { type: 'image/jpeg' });
                onCapture(file, canvas.toDataURL('image/jpeg', 0.6));
                stopCamera();
                onClose();
            }, 'image/jpeg', 0.6);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card">
                <div className="modal-header">
                    <h3 className="modal-title">
                        {side === 'selfie' ? t('modalTakeSelfie') :
                            side === 'km' ? t('modalCaptureKm') :
                                side === 'car' ? t('modalTakeCarSelfie') :
                                    side === 'fuel' ? t('modalFuelSlip') :
                                        side === 'parking' ? t('modalParkingSlip') :
                                            side === 'other' ? t('modalOtherSlip') : t('modalCapturePhoto')}
                    </h3>
                    <button
                        onClick={() => {
                            stopCamera();
                            onClose();
                        }}
                        className="modal-close-btn"
                    >
                        <X size={20} />
                    </button>
                </div>
                {error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#f43f5e' }}>{error}</div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!error && (
                    <button onClick={capture} className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '16px' }}>
                        <Camera size={20} style={{ display: 'inline', marginRight: '8px' }} />
                        {t('capture')}
                    </button>
                )}
            </div>
        </div>
    );
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// High-contrast color themes matching Master Fleet Calendar
const PACKAGE_PALETTE = [
    { name: 'Royal Blue', bg: '#2563eb', border: '#1d4ed8', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bfdbfe', text: '#ffffff', glow: 'rgba(37, 99, 235, 0.35)' },
    { name: 'Emerald', bg: '#059669', border: '#047857', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#a7f3d0', text: '#ffffff', glow: 'rgba(5, 150, 105, 0.35)' },
    { name: 'Deep Purple', bg: '#7c3aed', border: '#6d28d9', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#ddd6fe', text: '#ffffff', glow: 'rgba(124, 58, 237, 0.35)' },
    { name: 'Teal', bg: '#0d9488', border: '#0f766e', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#99f6e4', text: '#ffffff', glow: 'rgba(13, 148, 136, 0.35)' },
    { name: 'Magenta Fuchsia', bg: '#c026d3', border: '#a21caf', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#f5d0fe', text: '#ffffff', glow: 'rgba(192, 38, 211, 0.35)' },
    { name: 'Cerulean Cyan', bg: '#0284c7', border: '#0369a1', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bae6fd', text: '#ffffff', glow: 'rgba(2, 132, 199, 0.35)' },
    { name: 'Indigo', bg: '#4f46e5', border: '#4338ca', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#c7d2fe', text: '#ffffff', glow: 'rgba(79, 70, 229, 0.35)' },
    { name: 'Plum Wine', bg: '#9d174d', border: '#831843', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#fbcfe8', text: '#ffffff', glow: 'rgba(157, 23, 77, 0.35)' },
    { name: 'Forest Green', bg: '#15803d', border: '#166534', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#bbf7d0', text: '#ffffff', glow: 'rgba(21, 128, 61, 0.35)' },
    { name: 'Dark Slate', bg: '#334155', border: '#1e293b', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#cbd5e1', text: '#ffffff', glow: 'rgba(51, 65, 85, 0.35)' },
    { name: 'Electric Violet', bg: '#6366f1', border: '#4f46e5', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0e7ff', text: '#ffffff', glow: 'rgba(99, 102, 241, 0.35)' },
    { name: 'Deep Ocean', bg: '#0369a1', border: '#075985', badgeBg: 'rgba(0,0,0,0.35)', badgeText: '#e0f2fe', text: '#ffffff', glow: 'rgba(3, 105, 161, 0.35)' }
];

const getThemeForRide = (ride) => {
    if (!ride) return PACKAGE_PALETTE[0];
    const key = String(ride.bookingId || ride.clientName || ride._id || 'tour');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % PACKAGE_PALETTE.length;
    return PACKAGE_PALETTE[idx];
};

const DriverPortal = () => {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [km, setKm] = useState('');

    // Photo states
    const [selfie, setSelfie] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [kmPhoto, setKmPhoto] = useState(null);
    const [kmPreview, setKmPreview] = useState(null);
    const [carSelfie, setCarSelfie] = useState(null);
    const [carPreview, setCarPreview] = useState(null);

    // Question states (for Punch-Out)
    const [fuelFilled, setFuelFilled] = useState(false);
    const [fuelEntries, setFuelEntries] = useState([{ amount: '', km: '', fuelType: 'Diesel', slip: null, preview: null }]);
    // Use quantity in expenseEntries for fuel
    const [expenseEntries, setExpenseEntries] = useState([{ type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null }]);
    const [parkingPaid, setParkingPaid] = useState(false);
    const [parkingEntries, setParkingEntries] = useState([{ amount: '', slip: null, preview: null }]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [outsideTripOccurred, setOutsideTripOccurred] = useState(false);
    const [outsideTripTypes, setOutsideTripTypes] = useState([]);

    // New Fields for Report
    const [tollParkingAmount, setTollParkingAmount] = useState('');
    const [allowanceTA, setAllowanceTA] = useState(false);
    const [nightStay, setNightStay] = useState(false);
    const [otherRemarks, setOtherRemarks] = useState('');
    const [remarks, setRemarks] = useState('');
    const [specialPay, setSpecialPay] = useState('');
    const [specialPayRemark, setSpecialPayRemark] = useState('');

    // Camera Modal states
    const [activeCamera, setActiveCamera] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPunchOutForm, setShowPunchOutForm] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });

    // PWA & Native Mobile App Installation
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalledApp, setIsInstalledApp] = useState(false);
    const [showIosInstallModal, setShowIosInstallModal] = useState(false);

    // Mid-Trip Expense states
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseModalType, setExpenseModalType] = useState(null); // 'fuel', 'parking', 'other'

    // Ledger & Rides Tabs
    const [activeTab, setActiveTab] = useState('home'); // 'home', 'rides', 'ledger'
    const [ledgerData, setLedgerData] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerMonth, setLedgerMonth] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1); // 1-12
    const [ledgerYear, setLedgerYear] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear());

    // Upcoming Rides State (Month Wise Calendar)
    const [upcomingRides, setUpcomingRides] = useState([]);
    const [ridesLoading, setRidesLoading] = useState(false);
    const [rideSearchQuery, setRideSearchQuery] = useState('');
    const [ridesMonth, setRidesMonth] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1); // 1-12
    const [ridesYear, setRidesYear] = useState(new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear());
    const [selectedDutyModal, setSelectedDutyModal] = useState(null);

    // Active Company & Dynamic Multi-Tenant Settings (ALWAYS up-to-date with dashboardData)
    const activeCompany = dashboardData?.driver?.company || user?.company;
    const driverAppSettings = activeCompany?.driverAppSettings || {};
    const operationalSettings = activeCompany?.operationalSettings || {};
    const salarySettings = activeCompany?.salarySettings || {};

    const pCount = driverAppSettings?.photoUploadCount ?? 3;
    const showMeterReading = driverAppSettings?.dutyForm?.showMeterReading !== false;
    const showDutyDetails = driverAppSettings?.dutyForm?.showDutyDetails !== false;

    // Outside City logic: If dutyForm.showOutsideCityQuestion === false OR both dayAllowance and nightAllowance are disabled, HIDE Outside City!
    const isDaOrNightAllowed = !(salarySettings?.dayAllowance?.enabled === false && salarySettings?.nightAllowance?.enabled === false);
    const showOutsideCity = driverAppSettings?.dutyForm?.showOutsideCityQuestion !== false && isDaOrNightAllowed;

    // Navigation Tabs Controls (from SuperAdmin)
    const showUpcomingRidesTab = driverAppSettings?.tabs?.showUpcomingRides !== false;
    const showSalaryLedgerTab = driverAppSettings?.tabs?.showSalaryLedger !== false;

    // If a tab is turned OFF, automatically switch driver to 'home'
    useEffect(() => {
        if (activeTab === 'rides' && !showUpcomingRidesTab) {
            setActiveTab('home');
        }
        if (activeTab === 'ledger' && !showSalaryLedgerTab) {
            setActiveTab('home');
        }
    }, [activeTab, showUpcomingRidesTab, showSalaryLedgerTab]);

    const parkingCanEnterAmt = driverAppSettings?.parking?.driverCanEnterAmount !== false && operationalSettings?.parking?.driverCanEnterAmount !== false;
    const fuelSettings = driverAppSettings?.fuel || {};

    useEffect(() => {
        fetchDashboard();
    }, []);

    // ── Driver PWA Manifest & App Install Setup ──
    useEffect(() => {
        let manifestLink = document.querySelector("link[rel='manifest']");
        if (manifestLink) {
            manifestLink.setAttribute('href', '/driver-manifest.json?v=2');
        } else {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = '/driver-manifest.json?v=2';
            document.head.appendChild(manifestLink);
        }

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            setIsInstalledApp(true);
        }

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    // ── Screen WakeLock on Duty (Keeps phone screen on while driving) ──
    useEffect(() => {
        let wakeLockObj = null;
        const requestWakeLock = async () => {
            try {
                const att = dashboardData?.todayAttendance;
                if ('wakeLock' in navigator && att?.punchIn?.time && !att?.punchOut?.time) {
                    wakeLockObj = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                // Ignore wakeLock failures silently
            }
        };
        requestWakeLock();
        return () => {
            if (wakeLockObj) wakeLockObj.release().catch(() => {});
        };
    }, [dashboardData?.todayAttendance?.punchIn?.time, dashboardData?.todayAttendance?.punchOut?.time]);

    const handleInstallClick = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                setInstallPrompt(null);
                setIsInstalledApp(true);
            }
        } else {
            const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
            if (isIos) {
                setShowIosInstallModal(true);
            } else {
                alert('📱 App Install karne ke liye: Chrome browser ke 3 dots (⋮) par click karein aur "Install App" ya "Add to Home screen" chunein.');
            }
        }
    };

    useEffect(() => {
        if (activeTab === 'ledger') {
            fetchLedger(ledgerMonth, ledgerYear);
        } else if (activeTab === 'rides') {
            fetchUpcomingRides(ridesMonth, ridesYear);
        }
    }, [activeTab, ledgerMonth, ledgerYear, ridesMonth, ridesYear]);

    const fetchLedger = async (m, y) => {
        setLedgerLoading(true);
        try {
            const { data } = await axios.get(`/api/driver/ledger?month=${m}&year=${y}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setLedgerData(data);
        } catch (err) {
            console.error('Error fetching ledger', err);
        } finally {
            setLedgerLoading(false);
        }
    };

    const fetchUpcomingRides = async (m = ridesMonth, y = ridesYear) => {
        setRidesLoading(true);
        try {
            const monthParam = `${y}-${String(m).padStart(2, '0')}`;
            const { data } = await axios.get(`/api/driver/upcoming-rides?month=${monthParam}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (data && Array.isArray(data.rides)) {
                const todayStr = todayIST();
                const currentAndUpcoming = data.rides.filter(r => r.isToday || (r.dateStr && r.dateStr >= todayStr));
                setUpcomingRides(currentAndUpcoming);
            }
        } catch (err) {
            console.error('Error fetching upcoming rides', err);
        } finally {
            setRidesLoading(false);
        }
    };

    const handlePrevRidesMonth = () => {
        if (ridesMonth === 1) {
            setRidesMonth(12);
            setRidesYear(y => y - 1);
        } else {
            setRidesMonth(m => m - 1);
        }
    };

    const handleNextRidesMonth = () => {
        if (ridesMonth === 12) {
            setRidesMonth(1);
            setRidesYear(y => y + 1);
        } else {
            setRidesMonth(m => m + 1);
        }
    };

    const handleTodayRidesMonth = () => {
        const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        setRidesMonth(istNow.getUTCMonth() + 1);
        setRidesYear(istNow.getUTCFullYear());
    };

    const fetchDashboard = async () => {
        try {
            const { data } = await axios.get('/api/driver/dashboard', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setDashboardData(data);
            if (data?.driver?.company) {
                try {
                    const stored = localStorage.getItem('userInfo');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.company = data.driver.company;
                        localStorage.setItem('userInfo', JSON.stringify(parsed));
                    }
                } catch (e) {}
            }
            if (data?.upcomingRides && Array.isArray(data.upcomingRides)) {
                const todayStr = todayIST();
                const currentAndUpcoming = data.upcomingRides.filter(r => r.isToday || (r.dateStr && r.dateStr >= todayStr));
                setUpcomingRides(currentAndUpcoming);
            }
        } catch (err) {
            console.error('Error fetching dashboard', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter strictly Current (Today) and Aane Wali (Upcoming / Future) rides
    const activeUpcomingRides = useMemo(() => {
        const todayStr = todayIST();
        return (upcomingRides || []).filter(ride => {
            return ride.isToday || (ride.dateStr && ride.dateStr >= todayStr);
        });
    }, [upcomingRides]);

    const filteredUpcomingRides = useMemo(() => {
        if (!rideSearchQuery.trim()) return activeUpcomingRides;
        const q = rideSearchQuery.toLowerCase();
        return activeUpcomingRides.filter(ride => (
            (ride.clientName && ride.clientName.toLowerCase().includes(q)) ||
            (ride.duty && ride.duty.toLowerCase().includes(q)) ||
            (ride.pickupPoint && ride.pickupPoint.toLowerCase().includes(q)) ||
            (ride.hotel && ride.hotel.toLowerCase().includes(q)) ||
            (ride.vehicleNumber && ride.vehicleNumber.toLowerCase().includes(q)) ||
            (ride.carType && ride.carType.toLowerCase().includes(q)) ||
            (ride.dateStr && ride.dateStr.includes(q)) ||
            (ride.bookingId && ride.bookingId.toLowerCase().includes(q))
        ));
    }, [activeUpcomingRides, rideSearchQuery]);

    // Generate Excel-like date rows for the selected month (matches Master Calendar matrix format from user image)
    const excelRosterRows = useMemo(() => {
        const todayStr = todayIST(); // 'YYYY-MM-DD'
        const todayDayNum = parseInt(todayStr.slice(8, 10), 10) || 1;
        const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        const curMo = istNow.getUTCMonth() + 1;
        const curYr = istNow.getUTCFullYear();
        const isCurrentMonth = (ridesYear === curYr && ridesMonth === curMo);
        const isPastMonth = (ridesYear < curYr) || (ridesYear === curYr && ridesMonth < curMo);

        if (isPastMonth) return [];

        const totalDays = new Date(ridesYear, ridesMonth, 0).getDate();
        const startDay = isCurrentMonth ? todayDayNum : 1;

        const rows = [];
        for (let d = startDay; d <= totalDays; d++) {
            const dateObj = new Date(ridesYear, ridesMonth - 1, d);
            const dateStr = `${ridesYear}-${String(ridesMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const isToday = dateStr === todayStr;

            // Find duties matching this date from activeUpcomingRides
            const matchingDuties = (activeUpcomingRides || []).filter(r => r.dateStr === dateStr);

            if (matchingDuties.length === 0) {
                rows.push({
                    rowId: `empty-${dateStr}`,
                    dayNum: d,
                    dateStr,
                    formattedDate: `${String(d).padStart(2, '0')}-${monthShort}`,
                    weekday,
                    isToday,
                    duty: null
                });
            } else {
                matchingDuties.forEach((duty, subIdx) => {
                    rows.push({
                        rowId: `${duty._id || dateStr}-${subIdx}`,
                        dayNum: d,
                        dateStr,
                        formattedDate: `${String(d).padStart(2, '0')}-${monthShort}`,
                        weekday,
                        isToday,
                        duty,
                        dutyIndex: subIdx,
                        totalDutiesOnDate: matchingDuties.length
                    });
                });
            }
        }

        // Apply search query if present
        if (!rideSearchQuery.trim()) return rows;
        const q = rideSearchQuery.toLowerCase();
        return rows.filter(r => {
            if (!r.duty) return false;
            const d = r.duty;
            return (
                (d.clientName && d.clientName.toLowerCase().includes(q)) ||
                (d.duty && d.duty.toLowerCase().includes(q)) ||
                (d.hotel && d.hotel.toLowerCase().includes(q)) ||
                (d.pickupPoint && d.pickupPoint.toLowerCase().includes(q)) ||
                (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(q)) ||
                (d.carType && d.carType.toLowerCase().includes(q)) ||
                (r.dateStr && r.dateStr.includes(q)) ||
                (d.bookingId && d.bookingId.toLowerCase().includes(q))
            );
        });
    }, [ridesYear, ridesMonth, activeUpcomingRides, rideSearchQuery]);


    const handlePasswordUpdate = async () => {
        if (!passwordData.oldPassword || !passwordData.newPassword) {
            setMessage({ type: 'error', text: 'All password fields are required' });
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.put('/api/driver/update-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswordData({ oldPassword: '', newPassword: '' });
            setShowPasswordSection(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePunch = async (type) => {
        if (showMeterReading && !km) {
            setMessage({ type: 'error', text: t('mandatoryFields') });
            return;
        }
        if (pCount >= 3) {
            if (!selfie || !kmPhoto || !carSelfie) {
                setMessage({ type: 'error', text: t('mandatoryFields') });
                return;
            }
        } else if (pCount === 2) {
            if (!selfie || !kmPhoto) {
                setMessage({ type: 'error', text: t('mandatoryFields') });
                return;
            }
        } else if (pCount === 1) {
            if (!kmPhoto) {
                setMessage({ type: 'error', text: t('mandatoryFields') });
                return;
            }
        }

        if (type === 'punch-in' && !selectedVehicleId) {
            setMessage({ type: 'error', text: t('selectCar') });
            return;
        }

        if (type === 'punch-out') {
            if (fuelFilled) {
                const invalid = fuelEntries.some(e => !e.amount || !e.slip || !e.km);
                if (invalid) {
                    setMessage({ type: 'error', text: t('fuelValidation') });
                    return;
                }
            }
            if (parkingPaid) {
                const invalid = parkingEntries.some(e => {
                    if (!parkingCanEnterAmt) return !e.slip;
                    return !e.amount || !e.slip;
                });
                if (invalid) {
                    setMessage({ type: 'error', text: t('parkingValidation') });
                    return;
                }
            }
        }

        setIsSubmitting(true);

        const compressImage = async (file) => {
            return file; // Bypass compression as CameraModal already returns low-res, 0.6 quality JPEG. Prevents web worker hang.
        };

        let longitude = 0;
        let latitude = 0;
        let address = 'Location Disabled (Permission Denied)';

        try {
            const pos = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error("Geolocation timeout manually triggered"));
                }, 4000);

                navigator.geolocation.getCurrentPosition(
                    (p) => { clearTimeout(timer); resolve(p); },
                    (e) => { clearTimeout(timer); reject(e); },
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 4000 }
                );
            });
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            address = `Tracked: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        } catch (err) {
            console.warn('Location acquisition failed or timed out:', err);
        }

        const [compressedSelfie, compressedKmPhoto, compressedCarSelfie] = await Promise.all([
            selfie ? compressImage(selfie) : null,
            kmPhoto ? compressImage(kmPhoto) : null,
            carSelfie ? compressImage(carSelfie) : null
        ]);

        const formData = new FormData();
        formData.append('km', km);
        if (compressedSelfie) formData.append('selfie', compressedSelfie);
        if (compressedKmPhoto) formData.append('kmPhoto', compressedKmPhoto);
        if (compressedCarSelfie) formData.append('carSelfie', compressedCarSelfie);
        formData.append('dutyCount', '1');
        formData.append('specialPay', '0');
        formData.append('specialPayRemark', '');
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('address', address);

        if (type === 'punch-in') {
            formData.append('vehicleId', selectedVehicleId);
        }

        if (type === 'punch-out') {
            formData.append('remarks', remarks);
            formData.append('otherRemarks', otherRemarks);
            formData.append('fuelFilled', fuelFilled);
            if (fuelFilled) {
                const fuelSlipsPromises = fuelEntries.map(entry => compressImage(entry.slip));
                const compFuelSlips = await Promise.all(fuelSlipsPromises);
                fuelEntries.forEach((entry, idx) => {
                    formData.append('fuelAmounts', entry.amount);
                    formData.append('fuelKMs', entry.km);
                    formData.append('fuelTypes', entry.fuelType);
                    formData.append('fuelSlips', compFuelSlips[idx]);
                });
            }
            formData.append('parkingPaid', parkingPaid);
            if (parkingPaid) {
                const parkingSlipsPromises = parkingEntries.map(entry => compressImage(entry.slip));
                const compParkingSlips = await Promise.all(parkingSlipsPromises);
                parkingEntries.forEach((entry, idx) => {
                    formData.append('parkingAmounts', entry.amount);
                    formData.append('parkingSlips', compParkingSlips[idx]);
                });
            }
            formData.append('outsideTripOccurred', outsideTripOccurred);
            if (outsideTripOccurred) {
                formData.append('outsideTripType', outsideTripTypes.join(','));
            }
        }

        try {
            await axios.post(`/api/driver/${type}`, formData, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage({ type: 'success', text: t(type === 'punch-in' ? 'punchInSuccess' : 'punchOutSuccess') });

            // Reset all states
            setKm('');
            setSelfie(null);
            setSelfiePreview(null);
            setKmPhoto(null);
            setKmPreview(null);
            setCarSelfie(null);
            setCarPreview(null);
            setFuelFilled(false);
            setFuelEntries([{ amount: '', km: '', slip: null, preview: null }]);
            setParkingPaid(false);
            setParkingEntries([{ amount: '', slip: null, preview: null }]);
            setActiveIndex(0);
            setOutsideTripOccurred(false);
            setRemarks('');
            setOtherRemarks('');
            setShowPunchOutForm(false);
            setSelectedVehicleId('');
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestNewTrip = async () => {
        setIsSubmitting(true);
        try {
            await axios.post('/api/driver/request-trip', {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: t('requestSent') });
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: t('requestFailed') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAirCheck = async () => {
        try {
            await axios.post('/api/driver/air-check', {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert('Tire air check recorded successfully! Admin has been notified.');
        } catch (err) {
            alert(err.response?.data?.message || 'Error recording air check');
        }
    };

    const handleSubmitExpense = async () => {
        // Filter active entries (parking in slip-only mode is valid if slip is uploaded)
        const activeEntries = expenseEntries.filter(e => {
            if (e.type === 'parking' && !parkingCanEnterAmt) {
                return !!e.slip;
            }
            return (e.amount && Number(e.amount) > 0) || (e.type === 'parking' && e.slip);
        });

        if (activeEntries.length === 0) {
            setMessage({ type: 'error', text: t('mandatoryFields') });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();

        activeEntries.forEach((entry, index) => {
            formData.append('types', entry.type);
            formData.append('amounts', entry.amount);
            formData.append('kms', entry.km || 0);
            formData.append('fuelTypes', entry.fuelType || '');
            formData.append('fuelQuantities', entry.quantity || 0);
            formData.append('fuelRates', entry.rate || 0);
            formData.append('paymentSources', entry.paymentSource || 'Office');
            if (entry.slip) {
                // Important: Use the index from the activeEntries array
                formData.append(`slip_${index}`, entry.slip);
            }
        });

        try {
            await axios.post('/api/driver/add-expense', formData, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ type: 'success', text: t('expenseSubmitted') });
            setShowExpenseModal(false);
            setExpenseEntries([]);
            setActiveIndex(0);
            fetchDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
        } finally {
            setIsSubmitting(false);
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
            if (!ledgerData) {
                alert("No ledger data available to download.");
                return;
            }

            // Load assets
            const logo = await loadImage(user.company?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(user.company?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const monthName = new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'long' });
            const periodLabel = `${monthName} ${ledgerYear}`;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER (LUXURY STYLE)
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
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text((user.company?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(14, 165, 233); // Blue accent
            doc.text(user.company?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('SALARY SLIP', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(`STATEMENT PERIOD`, pageWidth - 15, 30, { align: 'right' });
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text(periodLabel.toUpperCase(), pageWidth - 15, 36, { align: 'right' });

            // 2. INFORMATION SECTION
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EMPLOYEE INFORMATION', 15, 65);
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('NAME', 15, 76);
            doc.text('MOBILE', 15, 84);
            doc.text('DESIGNATION', 15, 92);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(user.name?.toUpperCase() || 'N/A', 45, 76);
            doc.text(user.mobile || 'N/A', 45, 84);
            doc.text('PROFESSIONAL DRIVER', 45, 92);

            // Summary Box (Right Side)
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 40, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT OVERVIEW', pageWidth / 2 + 5, 68);

            const totalEarned = ledgerData.summary?.totalEarned || 0;
            const totalEMI = Number(ledgerData.summary?.totalEMI) || 0;
            const netPayable = ledgerData.summary?.netPayable || (totalEarned - (ledgerData.summary?.pendingAdvance || 0) - totalEMI);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Gross Earnings:', pageWidth / 2 + 5, 74);
            doc.text('Advances Deducted:', pageWidth / 2 + 5, 78);
            doc.text('EMI Deduction (Loan):', pageWidth / 2 + 5, 82);

            doc.setTextColor(15, 23, 42);
            doc.text(`Rs. ${totalEarned.toLocaleString('en-IN')}`, pageWidth - 20, 74, { align: 'right' });
            doc.setTextColor(244, 63, 94);
            doc.text(`- Rs. ${(ledgerData.summary?.pendingAdvance || 0).toLocaleString('en-IN')}`, pageWidth - 20, 78, { align: 'right' });
            doc.text(`- Rs. ${totalEMI.toLocaleString('en-IN')}`, pageWidth - 20, 82, { align: 'right' });

            doc.setDrawColor(203, 213, 225);
            doc.line(pageWidth / 2 + 5, 86, pageWidth - 20, 86);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129); // Green for net payable
            doc.text('NET PAYABLE:', pageWidth / 2 + 5, 95);
            doc.text(`Rs. ${netPayable.toLocaleString('en-IN')}`, pageWidth - 20, 95, { align: 'right' });

            // 3. DUTY LOGS TABLE
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('DUTY & TRIP DETAILS', 15, 115);

            const dutyRows = (ledgerData.history || []).map(att => [
                toISTDateString(att.date),
                att.vehicle || 'N/A',
                `Rs. ${att.dailyWage || 0}`,
                `Rs. ${att.sameDayReturn || 0}`,
                `Rs. ${att.nightStay || 0}`,
                `Rs. ${att.parking || 0}`,
                `Rs. ${(att.dailyWage || 0) + (att.sameDayReturn || 0) + (att.nightStay || 0) + (att.parking || 0)}`
            ]);

            autoTable(doc, {
                head: [['DATE', 'VEHICLE NO.', 'WAGE', 'SAME DAY', 'NIGHT STAY', 'PARKING', 'TOTAL']],
                body: dutyRows,
                startY: 120,
                theme: 'grid',
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle'
                },
                bodyStyles: {
                    fontSize: 8,
                    halign: 'center',
                    textColor: [51, 65, 85]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 }
            });

            // 4. ADVANCES TABLE
            let nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 15;
            if (nextY > pageHeight - 80) { doc.addPage(); nextY = 20; }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('ADVANCES', 15, nextY);

            const advRows = (ledgerData.advances || []).map(adv => {
                const status = (adv.status || '').toLowerCase();
                const displayStatus = status === 'pending' ? 'PAID' : (status === 'recovered' ? 'SETTLED' : (adv.status || '').toUpperCase());
                return [
                    formatDateIST(adv.date),
                    (adv.remark || '').toUpperCase(),
                    `Rs. ${adv.amount}`,
                    displayStatus
                ];
            });

            autoTable(doc, {
                head: [['DATE', 'PARTICULARS', 'AMOUNT (Rs.)', 'STATUS']],
                body: advRows,
                startY: nextY + 5,
                theme: 'striped',
                headStyles: {
                    fillColor: [244, 63, 94],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 8,
                    halign: 'center',
                    textColor: [51, 65, 85]
                },
                margin: { left: 15, right: 15 }
            });

            // 5. SPECIAL PAYOUTS (ALLOWANCES) TABLE 
            let allowanceY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : nextY) + 15;
            if (allowanceY > pageHeight - 80) { doc.addPage(); allowanceY = 20; }

            const specialPayouts = (ledgerData.allowances || []);
            if (specialPayouts.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('SPECIAL PAYOUTS (BONUS)', 15, allowanceY);

                const allowanceRows = specialPayouts.map(a => [
                    formatDateIST(a.date),
                    (a.remark || 'SPECIAL ALLOWANCE').toUpperCase(),
                    `Rs. ${a.amount}`,
                    (a.type || 'Other').toUpperCase()
                ]);

                autoTable(doc, {
                    head: [['DATE', 'REMARK', 'AMOUNT (Rs.)', 'TYPE']],
                    body: allowanceRows,
                    startY: allowanceY + 5,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
            }

            // 6. LOANS TABLE
            let loanY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : allowanceY) + 15;
            if (loanY > pageHeight - 80) { doc.addPage(); loanY = 20; }
            doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('LOANS & EMI PROGRESS', 15, loanY);

            const loanRows = (ledgerData.loans || []).map(loan => {
                const sDate = new Date(loan.startDate);
                const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                const selVal = (parseInt(ledgerYear) * 12) + parseInt(ledgerMonth);
                const monthIdx = (selVal - sVal) + 1;

                const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);
                const isCompleted = loan.status === 'Completed';

                let progress = '';
                if (isCompleted) {
                    progress = 'Completed';
                } else if (monthIdx <= 0) {
                    progress = 'Upcoming';
                } else if (monthIdx > tenure) {
                    progress = `Extended (Month ${monthIdx} of ${tenure})`;
                } else {
                    progress = `Month ${monthIdx} of ${tenure}`;
                }

                return [
                    formatDateIST(loan.startDate),
                    `Rs. ${loan.totalAmount?.toLocaleString()}`,
                    `Rs. ${loan.monthlyEMI?.toLocaleString()}`,
                    `Rs. ${loan.remainingAmount?.toLocaleString()}`,
                    progress,
                    loan.status?.toUpperCase()
                ];
            });

            if (loanRows.length > 0) {
                autoTable(doc, {
                    head: [['LOAN DATE', 'TOTAL AMOUNT', 'EMI AMOUNT', 'REMAINING', 'EMI PROGRESS', 'STATUS']],
                    body: loanRows,
                    startY: loanY + 5,
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241], fontSize: 8, halign: 'center' },
                    bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                    margin: { left: 15, right: 15 }
                });
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                doc.text('No active or historical loans recorded for this driver.', 15, loanY + 10);
            }

            // 6. FOOTER & SIGNATURE SECTION
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : loanY) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            // Disclaimer & Note
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('Note: This is an electronically generated statement. Any discrepancies must be reported to the accounts department within 48 hours for rectification.', 15, footerY, { maxWidth: pageWidth - 100 });

            // Signature Placement
            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }

            // Signature Line
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);

            // Signatory Details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((user.company?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Founder & Director', sigX - 2, footerY + 17);
            doc.text(`${user.company?.name || 'LogKaro'}`, sigX - 2, footerY + 21);


            // Generated at bottom
            doc.setFontSize(7);
            doc.setTextColor(203, 213, 225);
            doc.text(`Generated on: ${formatDateTimeIST(new Date())}`, 15, pageHeight - 10);

            const fileName = `Salary_Slip_${user.name?.replace(/\s+/g, '_')}_${monthName}_${ledgerYear}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to generate PDF: " + error.message);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;

    const todayAttendance = dashboardData?.todayAttendance;
    const isPunchedIn = !!todayAttendance?.punchIn?.time;
    const isPunchedOut = !!todayAttendance?.punchOut?.time;
    const tripStatus = dashboardData?.driver?.tripStatus;
    const showPunchIn = tripStatus === 'approved';
    const showPunchOut = tripStatus === 'active';

    return (
        <div className="driver-mobile-wrapper">
            <style>{`
                .driver-mobile-wrapper {
                    min-height: 100vh;
                    background: #090d16;
                    padding: 12px 12px 48px;
                    max-width: 520px;
                    margin: 0 auto;
                    width: 100%;
                    box-sizing: border-box;
                    color: white;
                }
                .driver-header {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .driver-header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }
                .driver-profile-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }
                .driver-logo-box {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .driver-name-text {
                    font-size: 15px;
                    font-weight: 900;
                    color: white;
                    letter-spacing: -0.3px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0;
                }
                .driver-company-sub {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--primary);
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .driver-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .driver-actions-bar {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    overflow-x: auto;
                    padding-bottom: 2px;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .driver-actions-bar::-webkit-scrollbar {
                    display: none;
                }
                .driver-action-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border-radius: 10px;
                    font-size: 11.5px;
                    font-weight: 800;
                    white-space: nowrap;
                    border: none;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: transform 0.15s ease;
                }
                .driver-action-pill:active {
                    transform: scale(0.96);
                }
                .driver-tracker-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .driver-tracker-box {
                    padding: 12px 14px;
                    border-radius: 14px;
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                    transition: all 0.2s ease;
                }
                .driver-nav-tabs {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
                    gap: 6px;
                    margin-bottom: 18px;
                    background: rgba(255, 255, 255, 0.04);
                    padding: 5px;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .driver-nav-tab-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 9px 4px;
                    border-radius: 10px;
                    border: none;
                    cursor: pointer;
                    font-weight: 800;
                    font-size: 11px;
                    line-height: 1.2;
                    text-align: center;
                    transition: all 0.25s ease;
                    color: rgba(255, 255, 255, 0.65);
                    background: transparent;
                }
                .driver-nav-tab-btn.active {
                    color: white;
                }
                .driver-on-duty-card {
                    padding: 24px 16px;
                    border-radius: 20px;
                    text-align: center;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                .driver-submit-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%);
                    padding: 15px 20px;
                    box-shadow: 0 6px 20px rgba(244, 63, 94, 0.35);
                    font-size: 14.5px;
                    font-weight: 800;
                    border-radius: 14px;
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                @media (min-width: 480px) {
                    .driver-nav-tab-btn {
                        flex-direction: row;
                        gap: 7px;
                        font-size: 12.5px;
                        padding: 11px 12px;
                    }
                }
            `}</style>

            <SEO title="Driver Portal" />
            <div className="driver-portal-inner">
                <div className="driver-portal-content">
                    {/* ── Driver Portal Mobile Header ── */}
                    <header className="driver-header">
                        <div className="driver-header-top">
                            <div className="driver-profile-info">
                                <div className="driver-logo-box">
                                    <img
                                        src={user.company?.logo || "/logos/logo.png"}
                                        alt={user.company?.name || "LogKaro"}
                                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                    />
                                </div>
                                <div>
                                    <div className="driver-company-sub">
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                                        {user.company?.name || "LogKaro"}
                                    </div>
                                    <h1 className="driver-name-text">{user.name}</h1>
                                </div>
                            </div>

                            <div className="driver-header-actions">
                                {/* Language Switcher Pill */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    padding: '3px',
                                    display: 'flex',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        style={{
                                            padding: '5px 9px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            background: language === 'en' ? 'var(--primary)' : 'transparent',
                                            color: language === 'en' ? '#090d16' : 'rgba(255,255,255,0.7)',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >EN</button>
                                    <button
                                        onClick={() => setLanguage('hi')}
                                        style={{
                                            padding: '5px 9px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            background: language === 'hi' ? 'var(--primary)' : 'transparent',
                                            color: language === 'hi' ? '#090d16' : 'rgba(255,255,255,0.7)',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >हिन्दी</button>
                                </div>

                                {/* Native App Install Button */}
                                {!isInstalledApp && (
                                    <button
                                        onClick={handleInstallClick}
                                        title={language === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install Driver App'}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            padding: '5px 10px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <Smartphone size={13} /> {language === 'hi' ? 'ऐप इंस्टॉल' : 'Install App'}
                                    </button>
                                )}

                                {/* Security Password Change */}
                                <button
                                    onClick={() => setShowPasswordSection(true)}
                                    title={t('security') || 'Security'}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Lock size={15} color="var(--primary)" />
                                </button>

                                {/* Logout Button */}
                                <button
                                    onClick={logout}
                                    title={t('logout')}
                                    style={{
                                        background: 'rgba(244,63,94,0.12)',
                                        color: '#f43f5e',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(244,63,94,0.3)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <LogOut size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Quick Action Pill Bar (Fuel, Parking, Air Check) */}
                        {showPunchOut && (
                            <div className="driver-actions-bar">
                                {todayAttendance?.pendingExpenses?.length > 0 && (
                                    <div style={{
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        color: 'var(--primary)',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                        flexShrink: 0
                                    }}>
                                        <Clock size={13} /> {todayAttendance.pendingExpenses.length}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        const newFuelEntry = { type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null };
                                        setExpenseEntries([newFuelEntry]);
                                        setExpenseModalType('fuel');
                                        setShowExpenseModal(true);
                                    }}
                                    className="driver-action-pill"
                                    style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)', color: '#090d16' }}
                                >
                                    <Droplets size={15} /> {t('logFuel')}
                                </button>
                                <button
                                    onClick={() => {
                                        setExpenseEntries([{ type: 'parking', amount: '', quantity: '', km: '', fuelType: '', slip: null, preview: null }]);
                                        setExpenseModalType('parking');
                                        setShowExpenseModal(true);
                                    }}
                                    className="driver-action-pill"
                                    style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}
                                >
                                    <Car size={15} /> {t('parking')}
                                </button>
                                <button
                                    onClick={handleAirCheck}
                                    className="driver-action-pill"
                                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)' }}
                                >
                                    <CheckCircle size={15} /> Air Check
                                </button>
                                {!showPunchOutForm && (
                                    <button
                                        onClick={() => setShowPunchOutForm(true)}
                                        className="driver-action-pill"
                                        style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.35)' }}
                                    >
                                        <LogOut size={15} /> {t('punchOut')}
                                    </button>
                                )}
                            </div>
                        )}
                    </header>

                    {/* ── Status Tracker (Punch-In / Punch-Out Times) Side-By-Side ── */}
                    <div className="driver-tracker-grid">
                        {/* Punch In */}
                        <div
                            className="driver-tracker-box"
                            style={{
                                background: isPunchedIn ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'rgba(255,255,255,0.03)',
                                border: isPunchedIn ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255,255,255,0.06)'
                            }}
                        >
                            {isPunchedIn && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    boxShadow: '0 0 10px #10b981'
                                }}></div>
                            )}
                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                                {t('punchIn')}
                            </p>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: isPunchedIn ? '#10b981' : 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '-0.5px' }}>
                                {isPunchedIn ? formatTimeIST(todayAttendance.punchIn.time) : '--:--'}
                            </p>
                        </div>

                        {/* Punch Out */}
                        <div
                            onClick={() => {
                                if (showPunchOut && !showPunchOutForm) {
                                    setActiveTab('home');
                                    setShowPunchOutForm(true);
                                }
                            }}
                            className="driver-tracker-box"
                            style={{
                                background: isPunchedOut ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.05) 100%)' : 'rgba(255,255,255,0.03)',
                                border: isPunchedOut ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid rgba(255,255,255,0.06)',
                                cursor: (showPunchOut && !showPunchOutForm) ? 'pointer' : 'default'
                            }}
                        >
                            {isPunchedOut && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#f43f5e',
                                    boxShadow: '0 0 10px #f43f5e'
                                }}></div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                                    {t('punchOut')}
                                </p>
                                {showPunchOut && !showPunchOutForm && <ArrowRight size={13} color="#f43f5e" />}
                            </div>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: isPunchedOut ? '#f43f5e' : 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '-0.5px' }}>
                                {isPunchedOut ? formatTimeIST(todayAttendance.punchOut.time) : '--:--'}
                            </p>
                        </div>
                    </div>

                    {/* ── Responsive Mobile Tab Navigation ── */}
                    <div className="driver-nav-tabs">
                        <button
                            onClick={() => setActiveTab('home')}
                            className={`driver-nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
                            style={{
                                background: activeTab === 'home' ? 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)' : 'transparent',
                                color: activeTab === 'home' ? 'white' : 'rgba(255,255,255,0.6)',
                                boxShadow: activeTab === 'home' ? '0 4px 12px rgba(14,165,233,0.3)' : 'none'
                            }}
                        >
                            <LayoutDashboard size={18} />
                            <span>{t('today')}</span>
                        </button>

                        {showUpcomingRidesTab && (
                            <button
                                onClick={() => {
                                    setActiveTab('rides');
                                    fetchUpcomingRides();
                                }}
                                className={`driver-nav-tab-btn ${activeTab === 'rides' ? 'active' : ''}`}
                                style={{
                                    background: activeTab === 'rides' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                                    color: activeTab === 'rides' ? 'white' : 'rgba(255,255,255,0.6)',
                                    boxShadow: activeTab === 'rides' ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
                                }}
                            >
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Calendar size={18} />
                                    {upcomingRides.length > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-10px',
                                            background: '#f43f5e',
                                            color: 'white',
                                            borderRadius: '10px',
                                            padding: '0 5px',
                                            fontSize: '9px',
                                            fontWeight: '900',
                                            lineHeight: '14px'
                                        }}>
                                            {upcomingRides.length}
                                        </span>
                                    )}
                                </div>
                                <span>{t('upcomingRides')}</span>
                            </button>
                        )}

                        {showSalaryLedgerTab && (
                            <button
                                onClick={() => setActiveTab('ledger')}
                                className={`driver-nav-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                                style={{
                                    background: activeTab === 'ledger' ? 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)' : 'transparent',
                                    color: activeTab === 'ledger' ? 'white' : 'rgba(255,255,255,0.6)',
                                    boxShadow: activeTab === 'ledger' ? '0 4px 12px rgba(14,165,233,0.3)' : 'none'
                                }}
                            >
                                <Wallet size={18} />
                                <span>{t('ledger')}</span>
                            </button>
                        )}
                    </div>

                    {activeTab === 'home' && (
                        <>
                            {/* Assigned Duty Preview Card */}
                            {upcomingRides.length > 0 && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: upcomingRides[0].isToday ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: upcomingRides[0].isToday ? '#34d399' : '#fbbf24'
                                        }}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: upcomingRides[0].isToday ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                                                    color: upcomingRides[0].isToday ? '#34d399' : '#fbbf24',
                                                    border: upcomingRides[0].isToday ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    fontWeight: '900'
                                                }}>
                                                    {upcomingRides[0].isToday ? '● TODAY’S DUTY' : '📅 NEXT DUTY'}
                                                </span>
                                                <strong style={{ color: 'white', fontSize: '13.5px' }}>
                                                    {upcomingRides[0].dateFormatted} • {upcomingRides[0].time}
                                                </strong>
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12.5px', marginTop: '3px' }}>
                                                Guest: <strong style={{ color: '#38bdf8' }}>{upcomingRides[0].clientName}</strong> • Tour: <strong style={{ color: '#fbbf24' }}>{upcomingRides[0].duty}</strong>
                                                {upcomingRides[0].vehicleNumber && ` • Cab: ${upcomingRides[0].vehicleNumber}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {upcomingRides[0].mobileNumber && (
                                            <a
                                                href={`tel:${upcomingRides[0].mobileNumber}`}
                                                style={{
                                                    padding: '7px 12px',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    borderRadius: '9px',
                                                    fontWeight: '800',
                                                    fontSize: '11.5px',
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                <Phone size={13} /> {t('callGuest')}
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab('rides');
                                                fetchUpcomingRides();
                                            }}
                                            style={{
                                                padding: '7px 12px',
                                                background: 'rgba(255,255,255,0.08)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                color: 'white',
                                                borderRadius: '9px',
                                                fontWeight: '800',
                                                fontSize: '11.5px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {t('viewAllUpcoming')} ({upcomingRides.length}) <ArrowRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(!dashboardData?.vehicle && !showPunchIn && tripStatus !== 'completed' && tripStatus !== 'pending_approval') ? (
                                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                                    <AlertTriangle size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
                                    <h2 style={{ color: 'white', marginBottom: '8px' }}>{t('noVehicle')}</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>{t('startDutyMessage')}</p>
                                </div>
                            ) : (
                                <div className="form-section-wrapper">
                                    {/* Vehicle Info removed as per user request */}

                                    {/* Security Modal */}
                                    {showPasswordSection && (
                                        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div className="modal-content glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ padding: '10px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '12px' }}>
                                                            <Lock size={20} color="var(--primary)" />
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white' }}>{t('security') || 'Security Settings'}</h3>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setShowPasswordSection(false);
                                                            setMessage({ type: '', text: '' });
                                                        }}
                                                        className="modal-close-btn"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div style={{ display: 'grid', gap: '16px' }}>
                                                    <div className="input-wrapper-full">
                                                        <label className="input-label" style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, letterSpacing: '0.5px' }}>CURRENT PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            className="input-field"
                                                            placeholder="Enter current password"
                                                            value={passwordData.oldPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                            style={{ background: 'rgba(0,0,0,0.2)' }}
                                                        />
                                                    </div>
                                                    <div className="input-wrapper-full">
                                                        <label className="input-label" style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, letterSpacing: '0.5px' }}>NEW PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            className="input-field"
                                                            placeholder="Enter new password"
                                                            value={passwordData.newPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                            style={{ background: 'rgba(0,0,0,0.2)' }}
                                                        />
                                                    </div>

                                                    {message.text && (
                                                        <div style={{
                                                            padding: '12px',
                                                            borderRadius: '12px',
                                                            fontSize: '13px',
                                                            fontWeight: '700',
                                                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                            color: message.type === 'success' ? '#10b981' : '#f43f5e',
                                                            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 129, 0.2)'}`
                                                        }}>
                                                            {message.text}
                                                        </div>
                                                    )}

                                                    <button
                                                        className="btn-primary"
                                                        disabled={isSubmitting}
                                                        onClick={handlePasswordUpdate}
                                                        style={{ height: '52px', borderRadius: '14px', fontSize: '14px', fontWeight: '1000', letterSpacing: '1px', marginTop: '10px' }}
                                                    >
                                                        {isSubmitting ? 'UPDATING...' : 'CONFIRM CHANGE'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                    {tripStatus === 'completed' && (
                                        <div className="glass-card" style={{
                                            padding: 'clamp(32px, 8vw, 48px)',
                                            textAlign: 'center',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.15)',
                                            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(16, 185, 129, 0.2)',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <CheckCircle size={40} color="#10b981" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t('dutyCompleted')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '28px', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: '600' }}>{t('offDutyMessage')}</p>
                                            <button onClick={handleRequestNewTrip} disabled={isSubmitting} className="btn-primary" style={{
                                                width: '100%',
                                                maxWidth: '320px',
                                                margin: '0 auto',
                                                display: 'block',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                padding: '16px 24px',
                                                fontSize: '15px',
                                                fontWeight: '800',
                                                borderRadius: '14px',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                                                border: 'none'
                                            }}>
                                                {isSubmitting ? t('processing') : t('startNewDuty')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Waiting for Approval Screen */}
                                    {tripStatus === 'pending_approval' && (
                                        <div className="glass-card" style={{
                                            padding: 'clamp(32px, 8vw, 48px)',
                                            textAlign: 'center',
                                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.03) 100%)',
                                            border: '1px solid rgba(14, 165, 233, 0.15)',
                                            boxShadow: '0 8px 32px rgba(14, 165, 233, 0.15)'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(14, 165, 233, 0.2)',
                                                boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)'
                                            }}>
                                                <RefreshCw size={40} color="var(--primary)" className="spinner" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 24px)', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t('waitingAdmin')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: '600' }}>{t('reviewMessage')}</p>
                                        </div>
                                    )}

                                    {/* On Duty Screen (Optimized for Mobile Visibility) */}
                                    {showPunchOut && !showPunchOutForm && (
                                        <div className="driver-on-duty-card">
                                            <div style={{
                                                position: 'absolute',
                                                top: '-40px',
                                                right: '-40px',
                                                width: '120px',
                                                height: '120px',
                                                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                                                pointerEvents: 'none'
                                            }}></div>
                                            <div style={{
                                                width: '54px',
                                                height: '54px',
                                                margin: '0 auto 10px',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(16, 185, 129, 0.3)',
                                                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                                                position: 'relative'
                                            }}>
                                                <Car size={26} color="#10b981" />
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '4px', fontWeight: '900', letterSpacing: '-0.3px', position: 'relative' }}>{t('onDuty')}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '14px', fontSize: '12px', fontWeight: '600', position: 'relative' }}>{t('driveSafely')}</p>
                                            <button
                                                onClick={() => setShowPunchOutForm(true)}
                                                className="driver-submit-btn"
                                            >
                                                <LogOut size={16} /> {t('submitReports')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Main Form */}
                                    {(showPunchIn || (showPunchOut && showPunchOutForm)) && (
                                        <div className="glass-card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                                            <div className="modal-header" style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
                                                {showPunchOut && (
                                                    <button onClick={() => setShowPunchOutForm(false)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', padding: '6px', borderRadius: '8px' }}>
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                )}
                                                <div>
                                                    <h2 className="modal-title">{showPunchIn ? t('dutyPunchIn') : t('dutyPunchOut')}</h2>
                                                    <p className="section-subtitle">{showPunchIn ? t('start') : t('end')}</p>
                                                </div>
                                            </div>


                                            {/* Vehicle Selection (Punch-In only) */}
                                            {showPunchIn && (
                                                <div className="input-wrapper-full" style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                    <label className="input-label">{t('selectVehicle')}</label>
                                                    <select
                                                        className="input-field"
                                                        value={selectedVehicleId}
                                                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: '12px' }}
                                                    >
                                                        <option value="" style={{ background: '#0f172a', color: 'white' }}>{t('selectCar')}</option>
                                                        {dashboardData?.availableVehicles?.map(v => (
                                                            <option key={v._id} value={v._id} style={{ background: '#0f172a', color: 'white' }}>
                                                                {v.carNumber} ({v.model})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {showMeterReading && (
<div className="input-wrapper-full" style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                <label className="input-label">{t('currentKm')}</label>
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    placeholder={t('enterKm')}
                                                    value={km}
                                                    onChange={(e) => setKm(e.target.value)}
                                                />
                                            </div>
)}

                                            {/* Photo Captures (Dynamic based on SuperAdmin Tenant Setting) */}
                                            {(() => {
                                                if (pCount === 0) return null;
                                                return (
                                                    <div
                                                        className="photo-capture-grid"
                                                        style={{
                                                            marginBottom: 'clamp(20px, 5vw, 28px)',
                                                            display: 'grid',
                                                            gridTemplateColumns: pCount === 1 ? '1fr' : (pCount === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(90px, 1fr))'),
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        {/* Selfie: Required for 2 or 3 photos */}
                                                        {pCount >= 2 && (
                                                            <div>
                                                                <p className="input-label" style={{ marginBottom: '8px' }}>{t('driverSelfie')}</p>
                                                                {!selfiePreview ? (
                                                                    <div
                                                                        onClick={() => setActiveCamera('selfie')}
                                                                        className="photo-capture-button"
                                                                    >
                                                                        <Camera size={24} color="var(--primary)" />
                                                                        <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeSelfie')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="photo-preview-container">
                                                                        <img src={selfiePreview} alt="Selfie" className="photo-preview-image" />
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelfie(null);
                                                                                setSelfiePreview(null);
                                                                            }}
                                                                            className="photo-delete-button"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* KM Photo: Required for 1, 2, or 3 photos */}
                                                        {pCount >= 1 && (
                                                            <div>
                                                                <p className="input-label" style={{ marginBottom: '8px' }}>{t('kmPhoto')}</p>
                                                                {!kmPreview ? (
                                                                    <div
                                                                        onClick={() => setActiveCamera('km')}
                                                                        className="photo-capture-button"
                                                                    >
                                                                        <Camera size={24} color="var(--primary)" />
                                                                        <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeKmPhoto')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="photo-preview-container">
                                                                        <img src={kmPreview} alt="KM" className="photo-preview-image" />
                                                                        <button
                                                                            onClick={() => {
                                                                                setKmPhoto(null);
                                                                                setKmPreview(null);
                                                                            }}
                                                                            className="photo-delete-button"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Car Selfie: Required ONLY for 3 photos */}
                                                        {pCount >= 3 && (
                                                            <div>
                                                                <p className="input-label" style={{ marginBottom: '8px' }}>{t('carSelfie')}</p>
                                                                {!carPreview ? (
                                                                    <div
                                                                        onClick={() => setActiveCamera('car')}
                                                                        className="photo-capture-button"
                                                                    >
                                                                        <Camera size={24} color="var(--primary)" />
                                                                        <span style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'var(--text-muted)', fontWeight: '700' }}>{t('takeCarPhoto')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="photo-preview-container">
                                                                        <img src={carPreview} alt="Car" className="photo-preview-image" />
                                                                        <button
                                                                            onClick={() => {
                                                                                setCarSelfie(null);
                                                                                setCarPreview(null);
                                                                            }}
                                                                            className="photo-delete-button"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Outside Trip Question (Hidden if Outside City or DA/Night Allowance is disabled) */}
                                            {showPunchOut && showOutsideCity && (
                                                <div style={{ marginBottom: 'clamp(20px, 5vw, 28px)' }}>
                                                    <h3 className="section-title">{t('expenditureDetails')}</h3>
                                                    <div style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
                                                        <p className="input-label" style={{ marginBottom: '10px' }}>{t('outsideCityQuestion')}</p>
                                                        <div className="yes-no-button-group">
                                                            <button
                                                                onClick={() => setOutsideTripOccurred(true)}
                                                                className="yes-no-button"
                                                                style={{ background: outsideTripOccurred ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white' }}
                                                            >
                                                                {t('yes')}
                                                            </button>
                                                            <button
                                                                onClick={() => setOutsideTripOccurred(false)}
                                                                className="yes-no-button"
                                                                style={{ background: !outsideTripOccurred ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white' }}
                                                            >
                                                                {t('no')}
                                                            </button>
                                                        </div>

                                                        {outsideTripOccurred && (
                                                            <div className="checkbox-group" style={{ marginTop: '12px' }}>
                                                                {(dashboardData?.driver?.sameDayReturnBonus > 0) && (
                                                                    <div className="checkbox-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="checkbox-input"
                                                                            checked={outsideTripTypes.includes('Same Day')}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setOutsideTripTypes([...outsideTripTypes.filter(t => t !== 'Night Stay'), 'Same Day']);
                                                                                else setOutsideTripTypes(outsideTripTypes.filter(t => t !== 'Same Day'));
                                                                            }}
                                                                        />
                                                                        <label className="checkbox-label">{t('sameDay')} (+₹{dashboardData?.driver?.sameDayReturnBonus})</label>
                                                                    </div>
                                                                )}

                                                                {(dashboardData?.driver?.nightStayBonus > 0) && (
                                                                    <div className="checkbox-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="checkbox-input"
                                                                            checked={outsideTripTypes.includes('Night Stay')}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setOutsideTripTypes([...outsideTripTypes.filter(t => t !== 'Same Day'), 'Night Stay']);
                                                                                else setOutsideTripTypes(outsideTripTypes.filter(t => t !== 'Night Stay'));
                                                                            }}
                                                                        />
                                                                        <label className="checkbox-label">{t('nightStay')} (+₹{dashboardData?.driver?.nightStayBonus})</label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Remarks (Punch-Out only) */}
                                            {showPunchOut && showDutyDetails && (
                                                <div style={{ marginBottom: 'clamp(20px, 5vw, 28px)' }}>
                                                    <div className="input-wrapper-full" style={{ marginTop: '4px' }}>
                                                        <label className="input-label">Duty Details</label>
                                                        <textarea
                                                            className="input-field"
                                                            placeholder="Enter duty details..."
                                                            value={otherRemarks}
                                                            onChange={(e) => setOtherRemarks(e.target.value)}
                                                            style={{ fontSize: '14px', resize: 'vertical', minHeight: '60px' }}
                                                        />
                                                    </div>

                                                </div>
                                            )}


                                            {/* Message */}
                                            {message.text && (
                                                <div style={{ padding: '12px', background: message.type === 'error' ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: '10px', marginBottom: '16px' }}>
                                                    <p style={{ color: message.type === 'error' ? '#f43f5e' : '#10b981', fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '600', margin: 0 }}>{message.text}</p>
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <button
                                                onClick={() => {
                                                    if (showPunchIn && !selectedVehicleId) return setMessage({ type: 'error', text: 'Please select a vehicle' });
                                                    handlePunch(showPunchOut ? 'punch-out' : 'punch-in');
                                                }}
                                                disabled={isSubmitting}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '16px', fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '800' }}
                                            >
                                                {isSubmitting ? t('processing').toUpperCase() : (showPunchOut ? t('submitPunchOut').toUpperCase() : t('submitPunchIn').toUpperCase())}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mid-Trip Expense Modal */}
                            {showExpenseModal && (
                                <div className="modal-overlay">
                                    <div className="modal-content glass-card" style={{ maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div>
                                                <h3 className="modal-title">
                                                    {expenseModalType === 'fuel' ? t('logFuel') :
                                                        expenseModalType === 'parking' ? t('logParking') :
                                                            expenseModalType === 'special_pay' ? t('specialPay') :
                                                                t('driverSeva')}
                                                </h3>
                                                <p className="section-subtitle">{t('logExpense').toUpperCase()}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowExpenseModal(false);
                                                    setExpenseEntries([]);
                                                    setExpenseModalType(null);
                                                    setActiveIndex(0);
                                                }}
                                                className="modal-close-btn"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                                            {expenseEntries.length === 0 ? (
                                                <div style={{ padding: '30px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{t('noExpensesYet') || 'No expenses added yet'}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {expenseModalType === 'fuel' && (
                                                            <button
                                                                onClick={() => setExpenseEntries([{ type: 'fuel', amount: '', quantity: '', km: '', fuelType: 'Diesel', paymentSource: 'Office', slip: null, preview: null }])}
                                                                className="btn-primary"
                                                                style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <Droplets size={20} /> {t('logFuel')}
                                                            </button>
                                                        )}
                                                        {expenseModalType === 'parking' && (
                                                            <button
                                                                onClick={() => setExpenseEntries([{ type: 'parking', amount: '', quantity: '', km: '', fuelType: '', slip: null, preview: null }])}
                                                                className="btn-primary"
                                                                style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            >
                                                                <Car size={20} /> {t('logParking')}
                                                            </button>
                                                        )}
                                                        {expenseModalType === 'other' && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'wash', amount: '', quantity: '', km: '', fuelType: 'Wash', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <Droplets size={16} /> {t('carWash')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'puncture', amount: '', quantity: '', km: '', fuelType: 'Puncture', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <AlertTriangle size={16} /> {t('puncture')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'tissue', amount: '', quantity: '', km: '', fuelType: 'Tissue', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <ClipboardList size={16} /> {t('tissue')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'water', amount: '', quantity: '', km: '', fuelType: 'Water', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                                >
                                                                    <Droplets size={16} /> {t('waterBottle')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setExpenseEntries([{ type: 'other', amount: '', quantity: '', km: '', fuelType: 'Other', slip: null, preview: null }])}
                                                                    className="btn-primary"
                                                                    style={{ gridColumn: 'span 2', padding: '12px 24px', fontSize: '14px', borderRadius: '12px', background: '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                                                                >
                                                                    <Wrench size={20} /> {t('other')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {expenseEntries.map((entry, index) => (
                                                        <div key={index} className="entry-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: entry.type === 'fuel' ? 'rgba(14, 165, 233, 0.15)' : (entry.type === 'parking' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {entry.type === 'fuel' ? <Droplets size={16} color="var(--primary)" /> : (entry.type === 'parking' ? <Car size={16} color="var(--primary)" /> : <Wrench size={16} color="#f43f5e" />)}
                                                                    </div>
                                                                    <span style={{ fontWeight: '800', fontSize: '12px', color: 'white', textTransform: 'uppercase' }}>
                                                                        {entry.type === 'fuel' ? t('logFuel') : (entry.type === 'parking' ? t('logParking') : (t(entry.type) || t('driverSeva')))}
                                                                    </span>
                                                                </div>
                                                                <button onClick={() => setExpenseEntries(expenseEntries.filter((_, i) => i !== index))} style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '6px', borderRadius: '6px' }}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            {/* Parking Slip-Only Notice if Driver Amount Disabled */}
                                                            {entry.type === 'parking' && !parkingCanEnterAmt ? (
                                                                <div style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>
                                                                    <span>📸</span> Slip Only Mode: Please upload the parking ticket slip photo below. Office admin will enter and approve the amount.
                                                                </div>
                                                            ) : (
                                                                <div className="input-grid-2" style={{ marginBottom: '16px' }}>
                                                                    {/* Amount Field: Conditionally rendered for Fuel or Standard Parking/Other */}
                                                                    {(entry.type !== 'fuel' || (fuelSettings.showAmount !== false && operationalSettings.fuel?.showAmount !== false)) && (
                                                                        <div className="input-wrapper-full">
                                                                            <label className="input-label" style={{ fontSize: '10px' }}>{t('amount')}</label>
                                                                            <input
                                                                                type="number"
                                                                                className="input-field"
                                                                                placeholder="0.00"
                                                                                value={entry.amount}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...expenseEntries];
                                                                                    newEntries[index].amount = e.target.value;
                                                                                    setExpenseEntries(newEntries);
                                                                                }}
                                                                                style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {entry.type === 'fuel' && (fuelSettings.showLiters !== false && operationalSettings.fuel?.showLiters !== false) && (
                                                                        <>
                                                                            <div className="input-wrapper-full">
                                                                                <label className="input-label" style={{ fontSize: '10px' }}>{entry.fuelType === 'Electric' ? t('charging_units') : t('volume_optional')}</label>
                                                                                <input
                                                                                    type="number"
                                                                                    className="input-field"
                                                                                    placeholder={entry.fuelType === 'Electric' ? "kWh" : "L"}
                                                                                    value={entry.quantity || ''}
                                                                                    onChange={(e) => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        newEntries[index].quantity = e.target.value;

                                                                                        // Auto-calculate Rate if Amount and Liters are available
                                                                                        if (newEntries[index].amount && e.target.value) {
                                                                                            newEntries[index].rate = (Number(newEntries[index].amount) / Number(e.target.value)).toFixed(2);
                                                                                        }
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                                />
                                                                            </div>
                                                                            <div className="input-wrapper-full">
                                                                                <label className="input-label" style={{ fontSize: '10px' }}>{entry.fuelType === 'Electric' ? t('rate_per_kwh') : t('rate_per_l')} *</label>
                                                                                <input
                                                                                    type="number"
                                                                                    className="input-field"
                                                                                    placeholder={entry.fuelType === 'Electric' ? "₹/kWh" : "₹/L"}
                                                                                    value={entry.rate || ''}
                                                                                    onChange={(e) => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        newEntries[index].rate = e.target.value;

                                                                                        // Auto-calculate Liters if Amount and Rate are available
                                                                                        if (newEntries[index].amount && e.target.value) {
                                                                                            newEntries[index].quantity = (Number(newEntries[index].amount) / Number(e.target.value)).toFixed(2);
                                                                                        }
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {entry.type === 'fuel' && (fuelSettings.showKm !== false && operationalSettings.fuel?.showKm !== false) && (
                                                                        <div className="input-wrapper-full">
                                                                            <label className="input-label" style={{ fontSize: '10px' }}>{t('meterKm')} (Opt)</label>
                                                                            <input
                                                                                type="number"
                                                                                className="input-field"
                                                                                placeholder="KM"
                                                                                value={entry.km}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...expenseEntries];
                                                                                    newEntries[index].km = e.target.value;
                                                                                    setExpenseEntries(newEntries);
                                                                                }}
                                                                                style={{ padding: '10px', fontSize: '14px', height: '45px' }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {entry.type === 'fuel' && (fuelSettings.showFuelType !== false && operationalSettings.fuel?.showFuelType !== false) && (
                                                                <>
                                                                    <div className="input-wrapper-full" style={{ marginTop: '4px', marginBottom: '16px' }}>
                                                                        <label className="input-label" style={{ fontSize: '10px', marginBottom: '6px' }}>{t('fuelType')}</label>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                                                                            {['Diesel', 'Petrol', 'CNG', 'Electric'].map((type) => (
                                                                                <button
                                                                                    key={type}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        newEntries[index].fuelType = type;
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '8px 4px',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '800',
                                                                                        border: '1px solid',
                                                                                        borderColor: entry.fuelType === type ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                                                        background: entry.fuelType === type ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                        color: entry.fuelType === type ? 'var(--primary)' : 'var(--text-muted)',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    {t(type.toLowerCase())}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div className="input-wrapper-full" style={{ marginTop: '6px', marginBottom: '16px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                        <label className="input-label" style={{ fontSize: '11px', marginBottom: '8px', color: '#f8fafc', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            💳 {t('payment_source')}
                                                                        </label>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                            {[
                                                                                { key: 'Office', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)' },
                                                                                { key: 'Guest', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' }
                                                                            ].map(({ key: source, color, bg }) => {
                                                                                const isSelected = (entry.paymentSource || 'Office') === source;
                                                                                return (
                                                                                    <button
                                                                                        key={source}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newEntries = [...expenseEntries];
                                                                                            newEntries[index].paymentSource = source;
                                                                                            setExpenseEntries(newEntries);
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '10px 8px',
                                                                                            borderRadius: '10px',
                                                                                            fontSize: '12px',
                                                                                            fontWeight: '800',
                                                                                            border: isSelected ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.12)',
                                                                                            background: isSelected ? bg : 'rgba(255,255,255,0.02)',
                                                                                            color: isSelected ? color : 'var(--text-muted)',
                                                                                            transition: 'all 0.2s ease',
                                                                                            cursor: 'pointer'
                                                                                        }}
                                                                                    >
                                                                                        {t(source.toLowerCase())}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}

                                                            {entry.type === 'other' && (
                                                                <div className="input-wrapper-full" style={{ marginTop: '4px', marginBottom: '16px' }}>
                                                                    <label className="input-label" style={{ fontSize: '10px', marginBottom: '6px' }}>Service Type</label>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                                        {['Puncture', 'Car Wash', 'Tissue', 'Water', 'Other'].map((type) => {
                                                                            const isSelected = (entry.fuelType || '').split(',').includes(type);
                                                                            return (
                                                                                <button
                                                                                    key={type}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newEntries = [...expenseEntries];
                                                                                        let currentTypes = (entry.fuelType || '').split(',').filter(t => t !== '');
                                                                                        if (currentTypes.includes(type)) {
                                                                                            currentTypes = currentTypes.filter(t => t !== type);
                                                                                        } else {
                                                                                            currentTypes.push(type);
                                                                                        }
                                                                                        newEntries[index].fuelType = currentTypes.join(',');
                                                                                        setExpenseEntries(newEntries);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '8px 4px',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '800',
                                                                                        border: '1px solid',
                                                                                        borderColor: isSelected ? '#f43f5e' : 'rgba(255,255,255,0.1)',
                                                                                        background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                        color: isSelected ? '#f43f5e' : 'var(--text-muted)',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    {type}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}


                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                                <label className="input-label" style={{ fontSize: '10px' }}>{t('receipt')} ({t('optional')})</label>
                                                                {!entry.preview ? (
                                                                    <div
                                                                        onClick={() => {
                                                                            setActiveIndex(index);
                                                                            setActiveCamera('expense_slip');
                                                                        }}
                                                                        className="photo-capture-button"
                                                                        style={{ height: '80px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
                                                                    >
                                                                        <Camera size={24} color="var(--primary)" />
                                                                        <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>{t('captureSlip')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="photo-preview-container" style={{ height: '80px', borderRadius: '10px' }}>
                                                                        <img src={entry.preview} alt="Receipt" className="photo-preview-image" />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newEntries = [...expenseEntries];
                                                                                newEntries[index].slip = null;
                                                                                newEntries[index].preview = null;
                                                                                setExpenseEntries(newEntries);
                                                                            }}
                                                                            className="photo-delete-button"
                                                                            style={{ width: '24px', height: '24px', top: '5px', right: '5px' }}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}


                                                    <button
                                                        onClick={handleSubmitExpense}
                                                        disabled={isSubmitting}
                                                        className="btn-primary"
                                                        style={{ width: '100%', padding: '16px', fontWeight: '900', fontSize: '15px', borderRadius: '12px', marginTop: '10px', boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)' }}
                                                    >
                                                        {isSubmitting ? t('processing').toUpperCase() : t('submit').toUpperCase()}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Camera Modal - Moved to end to ensure it's always on top */}
                            {activeCamera && (
                                <CameraModal
                                    side={activeCamera === 'expense_slip' ? (expenseEntries[activeIndex]?.type === 'fuel' ? 'fuel' : (expenseEntries[activeIndex]?.type === 'parking' ? 'parking' : 'other')) : activeCamera}
                                    onCapture={(file, preview) => {
                                        if (activeCamera === 'selfie') {
                                            setSelfie(file);
                                            setSelfiePreview(preview);
                                        } else if (activeCamera === 'km') {
                                            setKmPhoto(file);
                                            setKmPreview(preview);
                                        } else if (activeCamera === 'car') {
                                            setCarSelfie(file);
                                            setCarPreview(preview);
                                        } else if (activeCamera === 'fuel') {
                                            const newEntries = [...fuelEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setFuelEntries(newEntries);
                                        } else if (activeCamera === 'parking') {
                                            const newEntries = [...parkingEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setParkingEntries(newEntries);
                                        } else if (activeCamera === 'expense_slip') {
                                            const newEntries = [...expenseEntries];
                                            newEntries[activeIndex].slip = file;
                                            newEntries[activeIndex].preview = preview;
                                            setExpenseEntries(newEntries);
                                        }
                                    }}
                                    onClose={() => setActiveCamera(null)}
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'ledger' && (
                        <div className="ledger-section">
                            {/* ── Month / Year Selector ── */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                                border: '1px solid rgba(14,165,233,0.25)',
                                borderRadius: '18px',
                                padding: '16px 20px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                {/* Prev Month */}
                                <button
                                    onClick={() => {
                                        if (ledgerMonth === 1) { setLedgerMonth(12); setLedgerYear(y => y - 1); }
                                        else setLedgerMonth(m => m - 1);
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: '700', flexShrink: 0 }}
                                >‹</button>

                                {/* Month + Year display */}
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(14,165,233,0.8)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>📅 Select Month</p>
                                    <p style={{ fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                                        {new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'long' })} {ledgerYear}
                                    </p>
                                </div>

                                {/* Next Month */}
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        if (ledgerYear > now.getFullYear() || (ledgerYear === now.getFullYear() && ledgerMonth >= now.getMonth() + 1)) return;
                                        if (ledgerMonth === 12) { setLedgerMonth(1); setLedgerYear(y => y + 1); }
                                        else setLedgerMonth(m => m + 1);
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: '700', flexShrink: 0, opacity: (ledgerYear === new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCFullYear() && ledgerMonth >= new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCMonth() + 1) ? 0.3 : 1 }}
                                >›</button>
                            </div>

                            {ledgerLoading ? (
                                <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                                    <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '13px', fontWeight: '600' }}>Loading data...</p>
                                </div>
                            ) : (
                                <div className="ledger-content">
                                    {/* Summary Cards */}
                                    <div className="ledger-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(16, 185, 129, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('totalEarned') || 'Earnings'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.totalEarned || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(245, 158, 11, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('workingDays') || 'Working Days'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{ledgerData?.summary?.workingDays || 0}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(244, 63, 94, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('pendingAdvance') || 'Advances'}</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.pendingAdvance || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(99, 102, 241, 0.8)', marginBottom: '4px', textTransform: 'uppercase' }}>EMI (Loan)</p>
                                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.totalEMI || 0).toLocaleString()}</h3>
                                        </div>
                                        <div className="glass-card" style={{ gridColumn: 'span 2', padding: '16px', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(14, 165, 233, 0.9)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('netPayable') || 'Net Salary (In-Hand)'}</p>
                                            <h3 style={{ fontSize: '26px', fontWeight: '900', color: 'white' }}>Rs. {(ledgerData?.summary?.netPayable || 0).toLocaleString()}</h3>
                                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Calculated after advances and loan deductions</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleExportPDF}
                                        className="btn-primary"
                                        style={{ width: '100%', marginBottom: '24px', padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                    >
                                        <Download size={20} /> {t('downloadPDF') || 'Download PDF Report'} — {new Date(ledgerYear, ledgerMonth - 1, 1).toLocaleString('default', { month: 'short' })} {ledgerYear}
                                    </button>

                                    {/* Duty History */}
                                    <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('dutyHistory')}</h4>
                                    {(!ledgerData?.history || ledgerData.history.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No duty records for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {ledgerData?.history?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{toISTDateString(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.vehicle}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#10b981', fontWeight: '900', fontSize: '15px' }}>Rs. {(item.dailyWage || 0) + (item.bonuses || 0) + (item.parking || 0)}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            Wage: {item.dailyWage || 0}
                                                            {item.sameDayReturn > 0 ? ` + SD: ${item.sameDayReturn}` : ''}
                                                            {item.nightStay > 0 ? ` + NS: ${item.nightStay}` : ''}
                                                            {item.specialPay > 0 ? ` + SP: ${item.specialPay}` : ''}
                                                            {item.parking > 0 ? ` + Parking: ${item.parking}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Advance History */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('advanceHistory')}</h4>
                                    {(!ledgerData?.advances || ledgerData.advances.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No advances for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.advances?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f43f5e' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.remark}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#f43f5e', fontWeight: '900', fontSize: '15px' }}>Rs. {item.amount}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            {(item.status || '').toLowerCase() === 'recovered' ? 'SETTLED' : 'PAID'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Special Payout History (Allowance) */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('specialPayoutHistory')}</h4>
                                    {(!ledgerData?.allowances || ledgerData.allowances.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No special payouts for this month</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.allowances?.map(item => (
                                                <div key={item._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #10b981' }}>
                                                    <div>
                                                        <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.date)}</p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.remark || item.type}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#10b981', fontWeight: '900', fontSize: '15px' }}>+ Rs. {item.amount}</p>
                                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                            {(item.type || 'BONUS').toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Loan History */}
                                    <h4 style={{ color: 'white', marginTop: '32px', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>{t('loanHistory') || 'Loan History'}</h4>
                                    {(!ledgerData?.loans || ledgerData.loans.length === 0) ? (
                                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No active loans records</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
                                            {ledgerData?.loans?.map(item => {
                                                const sDate = new Date(item.startDate);
                                                const sVal = (sDate.getFullYear() * 12) + (sDate.getMonth() + 1);
                                                const selVal = (parseInt(ledgerYear) * 12) + parseInt(ledgerMonth);
                                                const monthIdx = (selVal - sVal) + 1;
                                                const tenure = parseInt(item.tenureMonths, 10) || (item.monthlyEMI > 0 ? Math.round(item.totalAmount / item.monthlyEMI) : 1);
                                                const isCompleted = item.status === 'Completed' || monthIdx > tenure;

                                                return (
                                                    <div key={item._id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <div>
                                                                <p style={{ color: 'white', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{formatDateIST(item.startDate)}</p>
                                                                <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                                                                    {monthIdx > 0 && monthIdx <= tenure ? `Month ${monthIdx} of ${tenure}` : (isCompleted ? 'Loan Completed' : 'Loan Schedule')}
                                                                </p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '15px' }}>EMI: Rs. {item.monthlyEMI?.toLocaleString()}</p>
                                                                <span style={{
                                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900',
                                                                    background: item.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                                                                    color: item.status === 'Active' ? '#10b981' : 'rgba(255,255,255,0.4)'
                                                                }}>
                                                                    {item.status?.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', pt: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div>
                                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase' }}>Total Loan</p>
                                                                <p style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>Rs. {item.totalAmount?.toLocaleString()}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase' }}>Remaining</p>
                                                                <p style={{ color: '#f43f5e', fontSize: '13px', fontWeight: '900' }}>Rs. {item.remainingAmount?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================================================== */}
                    {/* UPCOMING RIDES TAB (Month Calendar & 3-Column Layout) */}
                    {/* ==================================================== */}
                    {activeTab === 'rides' && (
                        <div className="rides-section">
                            {/* Month Navigation & Control Center */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: 'clamp(16px, 3vw, 24px)',
                                marginBottom: '22px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
                            }}>
                                {/* Month Header Bar */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    marginBottom: '18px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    paddingBottom: '16px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: '#000',
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                MONTHLY ROSTER
                                            </span>
                                            <h2 style={{ color: 'white', margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={22} color="#fbbf24" />
                                                {t('myAssignedRides') || 'My Assigned Rides'}
                                            </h2>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12.5px', margin: '4px 0 0 0' }}>
                                            Date-wise duties and vehicle allocation from Live DRS & Bookings.
                                        </p>
                                    </div>

                                    {/* Month Selector Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            borderRadius: '12px',
                                            padding: '4px'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={handlePrevRidesMonth}
                                                title="Previous Month"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <ChevronLeft size={18} />
                                            </button>

                                            {/* Month & Year Selectors */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
                                                <select
                                                    value={ridesMonth}
                                                    onChange={(e) => setRidesMonth(Number(e.target.value))}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#fbbf24',
                                                        fontWeight: '900',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {MONTH_NAMES.map((name, idx) => (
                                                        <option key={name} value={idx + 1} style={{ background: '#0f172a', color: 'white' }}>
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={ridesYear}
                                                    onChange={(e) => setRidesYear(Number(e.target.value))}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: '800',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {[ridesYear - 1, ridesYear, ridesYear + 1].map(yr => (
                                                        <option key={yr} value={yr} style={{ background: '#0f172a', color: 'white' }}>
                                                            {yr}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleNextRidesMonth}
                                                title="Next Month"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleTodayRidesMonth}
                                            style={{
                                                padding: '8px 14px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: 'white',
                                                borderRadius: '10px',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Today
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => fetchUpcomingRides(ridesMonth, ridesYear)}
                                            disabled={ridesLoading}
                                            style={{
                                                padding: '8px 14px',
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                                color: '#10b981',
                                                borderRadius: '10px',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <RefreshCw size={14} className={ridesLoading ? 'animate-spin' : ''} />
                                            Refresh
                                        </button>
                                    </div>
                                </div>

                                {/* Filter Search Input */}
                                <div style={{ marginTop: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search by Guest Name, Hotel, Car Number (e.g. RJ-27), or Tour..."
                                        value={rideSearchQuery}
                                        onChange={(e) => setRideSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 14px',
                                            background: '#0a0f1d',
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Unified Roster Info Header (Single View) */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginBottom: '12px',
                                padding: '8px 14px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                        color: '#ffffff',
                                        padding: '3px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11.5px',
                                        fontWeight: '900',
                                        letterSpacing: '0.3px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        <Calendar size={13} /> {MONTH_NAMES[ridesMonth - 1]} {ridesYear}
                                    </span>
                                    <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '700' }}>
                                        Schedule & Duties <span style={{ color: '#38bdf8' }}>(Click any duty row to view full details)</span>
                                    </span>
                                </div>

                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                                    Total Days / Duties: <span style={{ color: '#fbbf24', fontWeight: '900' }}>{excelRosterRows.length}</span>
                                </div>
                            </div>

                            {/* Excel-Like Table (Matches Master Calendar Matrix from User Image) */}
                            {ridesLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '70px 20px' }}>
                                    <div className="spinner"></div>
                                </div>
                            ) : excelRosterRows.length === 0 ? (
                                <div className="glass-card" style={{ padding: '50px 24px', textAlign: 'center', borderRadius: '18px' }}>
                                    <Calendar size={52} color="#fbbf24" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
                                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                                        No Duties Found in {MONTH_NAMES[ridesMonth - 1]} {ridesYear}
                                    </h3>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 18px' }}>
                                        No duties match the selected view or search query.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleTodayRidesMonth}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#f59e0b',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Jump to Current Month
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    width: '100%',
                                    overflowX: 'auto',
                                    WebkitOverflowScrolling: 'touch',
                                    background: '#090f1d',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                                }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '12px',
                                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                                        minWidth: '760px',
                                        textAlign: 'left'
                                    }}>
                                        <thead>
                                            <tr style={{
                                                background: '#1e3a5f',
                                                color: '#ffffff',
                                                borderBottom: '2px solid #3b82f6',
                                                fontSize: '11.5px',
                                                fontWeight: '900',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase'
                                            }}>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    width: '92px',
                                                    minWidth: '92px',
                                                    borderRight: '1px solid rgba(255,255,255,0.12)',
                                                    position: 'sticky',
                                                    left: 0,
                                                    background: '#1e3a5f',
                                                    zIndex: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    📅 Date
                                                </th>
                                                <th style={{
                                                    padding: '10px 14px',
                                                    borderRight: '1px solid rgba(255,255,255,0.12)',
                                                    minWidth: '220px'
                                                }}>
                                                    👤 Guest Details & Tour (Master Calendar)
                                                </th>
                                                <th style={{
                                                    padding: '10px 14px',
                                                    borderRight: '1px solid rgba(255,255,255,0.12)',
                                                    minWidth: '180px'
                                                }}>
                                                    🚗 Car (Konsi Car Hai Driver Ke Pass)
                                                </th>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    borderRight: '1px solid rgba(255,255,255,0.12)',
                                                    minWidth: '160px'
                                                }}>
                                                    ⏰ Time & Hotel
                                                </th>
                                                <th style={{
                                                    padding: '10px 12px',
                                                    width: '140px',
                                                    textAlign: 'center'
                                                }}>
                                                    📞 Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {excelRosterRows.map((row, idx) => {
                                                const duty = row.duty;
                                                const theme = duty ? getThemeForRide(duty) : null;

                                                return (
                                                    <tr
                                                        key={row.rowId || idx}
                                                        onClick={() => {
                                                            if (duty) {
                                                                setSelectedDutyModal({
                                                                    ...duty,
                                                                    rowFormattedDate: row.formattedDate,
                                                                    weekday: row.weekday,
                                                                    isToday: row.isToday
                                                                });
                                                            }
                                                        }}
                                                        title={duty ? 'Click to view full duty details' : undefined}
                                                        style={{
                                                            background: row.isToday
                                                                ? 'rgba(16, 185, 129, 0.08)'
                                                                : (idx % 2 === 0 ? '#0d1527' : '#080d19'),
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                                            transition: 'background 0.15s ease',
                                                            cursor: duty ? 'pointer' : 'default'
                                                        }}
                                                    >
                                                        {/* --- 1. DATE CELL (Sticky Left) --- */}
                                                        <td style={{
                                                            padding: '7px 8px',
                                                            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                            position: 'sticky',
                                                            left: 0,
                                                            zIndex: 10,
                                                            background: row.isToday ? '#1a3650' : (idx % 2 === 0 ? '#0d1527' : '#080d19'),
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle'
                                                        }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                {row.isToday && (
                                                                    <span style={{
                                                                        fontSize: '8.5px',
                                                                        background: '#38bdf8',
                                                                        color: '#000000',
                                                                        padding: '1px 5px',
                                                                        borderRadius: '3px',
                                                                        fontWeight: '950',
                                                                        letterSpacing: '0.4px',
                                                                        marginBottom: '1px'
                                                                    }}>
                                                                        TODAY
                                                                    </span>
                                                                )}
                                                                <span style={{
                                                                    fontWeight: '900',
                                                                    color: row.isToday ? '#ffffff' : (row.weekday === 'Sun' ? '#f87171' : '#e2e8f0'),
                                                                    fontSize: '12px',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {row.formattedDate}
                                                                </span>
                                                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                                                                    {row.weekday}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* --- 2. GUEST DETAILS CELL (Exact Image 2 Master Calendar Theme) --- */}
                                                        {duty ? (
                                                            <td style={{
                                                                padding: '6px 8px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle',
                                                                background: theme.bg,
                                                                borderLeft: `4px solid ${theme.border}`,
                                                                color: '#ffffff'
                                                            }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    {/* Guest Name */}
                                                                    <span style={{
                                                                        fontSize: '12.5px',
                                                                        fontWeight: '950',
                                                                        color: '#ffffff',
                                                                        letterSpacing: '0.1px',
                                                                        textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                                                                    }}>
                                                                        {duty.clientName || 'Guest'}
                                                                    </span>

                                                                    {/* Duty Type in uppercase */}
                                                                    {duty.duty && (
                                                                        <span style={{
                                                                            fontSize: '9.5px',
                                                                            fontWeight: '900',
                                                                            letterSpacing: '0.4px',
                                                                            textTransform: 'uppercase',
                                                                            color: theme.badgeText || '#e0f2fe',
                                                                            lineHeight: 1.2
                                                                        }}>
                                                                            ● {duty.duty}
                                                                        </span>
                                                                    )}

                                                                    {/* Day Badge & Booking ID */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                        {duty.dayNo && (
                                                                            <span style={{
                                                                                fontSize: '8.5px',
                                                                                fontWeight: '950',
                                                                                background: 'rgba(0, 0, 0, 0.4)',
                                                                                color: '#ffffff',
                                                                                padding: '1px 5px',
                                                                                borderRadius: '3px',
                                                                                letterSpacing: '0.3px'
                                                                            }}>
                                                                                DAY {duty.dayNo}
                                                                            </span>
                                                                        )}
                                                                        {duty.bookingId && (
                                                                            <span style={{
                                                                                fontSize: '8.5px',
                                                                                fontWeight: '800',
                                                                                background: 'rgba(0, 0, 0, 0.25)',
                                                                                color: '#fef08a',
                                                                                padding: '1px 4px',
                                                                                borderRadius: '3px'
                                                                            }}>
                                                                                {duty.bookingId}
                                                                            </span>
                                                                        )}
                                                                        {duty.stayType === 'Night Hold' ? (
                                                                            <span style={{
                                                                                fontSize: '8.5px',
                                                                                fontWeight: '950',
                                                                                background: 'rgba(245, 158, 11, 0.35)',
                                                                                color: '#fef08a',
                                                                                border: '1px solid rgba(245, 158, 11, 0.5)',
                                                                                padding: '1px 5px',
                                                                                borderRadius: '3px',
                                                                                letterSpacing: '0.3px'
                                                                            }}>
                                                                                🌙 NIGHT HOLD
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{
                                                                                fontSize: '8.5px',
                                                                                fontWeight: '950',
                                                                                background: 'rgba(16, 185, 129, 0.25)',
                                                                                color: '#86efac',
                                                                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                                                                padding: '1px 5px',
                                                                                borderRadius: '3px',
                                                                                letterSpacing: '0.3px'
                                                                            }}>
                                                                                🔄 RETURN
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        ) : (
                                                            <td style={{
                                                                padding: '8px 10px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle',
                                                                background: '#eab308',
                                                                color: '#713f12',
                                                                fontWeight: '900',
                                                                fontSize: '11px',
                                                                textAlign: 'center',
                                                                letterSpacing: '0.3px'
                                                            }}>
                                                                Available / Rest Day
                                                            </td>
                                                        )}

                                                        {/* --- 3. CAR CELL (Konsi Car Hai Driver Ke Pass) --- */}
                                                        {duty ? (
                                                            <td style={{
                                                                padding: '7px 10px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle'
                                                            }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{
                                                                        fontSize: '12px',
                                                                        fontWeight: '950',
                                                                        color: '#38bdf8',
                                                                        background: 'rgba(56, 189, 248, 0.12)',
                                                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                        padding: '2px 7px',
                                                                        borderRadius: '5px',
                                                                        fontFamily: 'monospace',
                                                                        letterSpacing: '0.5px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        width: 'fit-content'
                                                                    }}>
                                                                        <Car size={12} color="#38bdf8" />
                                                                        <span>{duty.vehicleNumber || 'Assigned'}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {duty.carType && (
                                                                            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700' }}>
                                                                                {duty.carType}
                                                                            </span>
                                                                        )}
                                                                        <span style={{
                                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                                            color: '#34d399',
                                                                            fontSize: '9px',
                                                                            fontWeight: '800',
                                                                            padding: '1px 5px',
                                                                            borderRadius: '3px'
                                                                        }}>
                                                                            ● Assigned
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        ) : (
                                                            <td style={{
                                                                padding: '7px 10px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle',
                                                                color: '#64748b',
                                                                textAlign: 'center',
                                                                fontSize: '12px'
                                                            }}>
                                                                —
                                                            </td>
                                                        )}

                                                        {/* --- 4. TIME & HOTEL CELL --- */}
                                                        {duty ? (
                                                            <td style={{
                                                                padding: '7px 10px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle'
                                                            }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{
                                                                        fontSize: '11px',
                                                                        fontWeight: '800',
                                                                        color: '#38bdf8',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <Clock size={11} /> {duty.time || '10:00 AM'}
                                                                    </div>
                                                                    {(duty.hotel || duty.pickupPoint) && (
                                                                        <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <MapPin size={11} color="#fbbf24" style={{ flexShrink: 0 }} />
                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={duty.hotel || duty.pickupPoint}>
                                                                                {duty.hotel || duty.pickupPoint}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {duty.guestRemarks && (
                                                                        <div style={{
                                                                            fontSize: '10px',
                                                                            color: '#fef08a',
                                                                            fontStyle: 'italic',
                                                                            maxWidth: '170px',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }} title={duty.guestRemarks}>
                                                                            Note: {duty.guestRemarks}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        ) : (
                                                            <td style={{
                                                                padding: '7px 10px',
                                                                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                                                                verticalAlign: 'middle',
                                                                color: '#64748b',
                                                                textAlign: 'center',
                                                                fontSize: '12px'
                                                            }}>
                                                                —
                                                            </td>
                                                        )}

                                                        {/* --- 5. ACTION CELL (Call, WhatsApp & View Details) --- */}
                                                        {duty ? (
                                                            <td style={{
                                                                padding: '7px 8px',
                                                                verticalAlign: 'middle',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                    {duty.mobileNumber && (
                                                                        <>
                                                                            <a
                                                                                href={`tel:${duty.mobileNumber}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{
                                                                                    padding: '3px 7px',
                                                                                    background: '#10b981',
                                                                                    color: '#ffffff',
                                                                                    borderRadius: '5px',
                                                                                    fontWeight: '900',
                                                                                    fontSize: '10.5px',
                                                                                    textDecoration: 'none',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px'
                                                                                }}
                                                                                title={`Call ${duty.mobileNumber}`}
                                                                            >
                                                                                <Phone size={10} /> Call
                                                                            </a>
                                                                            <a
                                                                                href={`https://wa.me/91${duty.mobileNumber.replace(/\D/g, '').slice(-10)}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{
                                                                                    padding: '3px 7px',
                                                                                    background: 'rgba(37, 211, 102, 0.15)',
                                                                                    color: '#25D366',
                                                                                    border: '1px solid rgba(37, 211, 102, 0.35)',
                                                                                    borderRadius: '5px',
                                                                                    fontWeight: '900',
                                                                                    fontSize: '10.5px',
                                                                                    textDecoration: 'none',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px'
                                                                                }}
                                                                                title="WhatsApp Guest"
                                                                            >
                                                                                💬 WA
                                                                            </a>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedDutyModal({
                                                                                ...duty,
                                                                                rowFormattedDate: row.formattedDate,
                                                                                weekday: row.weekday,
                                                                                isToday: row.isToday
                                                                            });
                                                                        }}
                                                                        style={{
                                                                            padding: '3px 7px',
                                                                            background: 'rgba(56, 189, 248, 0.15)',
                                                                            color: '#38bdf8',
                                                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                                                            borderRadius: '5px',
                                                                            fontWeight: '900',
                                                                            fontSize: '10.5px',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '2px'
                                                                        }}
                                                                        title="View Duty Details"
                                                                    >
                                                                        👁️ View
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        ) : (
                                                            <td style={{
                                                                padding: '7px 8px',
                                                                verticalAlign: 'middle',
                                                                color: '#64748b',
                                                                textAlign: 'center',
                                                                fontSize: '12px'
                                                            }}>
                                                                —
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* --- DUTY DETAILS POPUP MODAL (Click to view full info) --- */}
            {selectedDutyModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.78)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                    onClick={() => setSelectedDutyModal(null)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(145deg, #111827 0%, #0d1527 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
                            width: '100%',
                            maxWidth: '540px',
                            overflow: 'hidden',
                            color: '#ffffff',
                            animation: 'fadeIn 0.2s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(56, 189, 248, 0.3)'
                                }}>
                                    <Car size={18} color="#38bdf8" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                                        Duty Details
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>📅 {selectedDutyModal.rowFormattedDate || selectedDutyModal.dateFormatted}</span>
                                        {selectedDutyModal.weekday && <span>• {selectedDutyModal.weekday}</span>}
                                        {selectedDutyModal.isToday && (
                                            <span style={{
                                                fontSize: '9px',
                                                background: '#38bdf8',
                                                color: '#000000',
                                                padding: '1px 5px',
                                                borderRadius: '3px',
                                                fontWeight: '950'
                                            }}>
                                                TODAY
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDutyModal(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
                            {/* Guest Details Card */}
                            <div style={{
                                padding: '14px 16px',
                                borderRadius: '14px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            background: '#3b82f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <UserIcon size={16} color="#ffffff" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: '950', color: '#ffffff' }}>
                                                {selectedDutyModal.clientName || 'Guest'}
                                            </div>
                                            {selectedDutyModal.bookingId && (
                                                <div style={{ fontSize: '11px', color: '#fef08a', fontWeight: '800' }}>
                                                    Booking ID: {selectedDutyModal.bookingId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedDutyModal.dayNo && (
                                        <span style={{
                                            fontSize: '10.5px',
                                            fontWeight: '950',
                                            background: '#f59e0b',
                                            color: '#000000',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            letterSpacing: '0.4px'
                                        }}>
                                            DAY {selectedDutyModal.dayNo}
                                        </span>
                                    )}
                                </div>

                                {selectedDutyModal.duty && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '8px 12px',
                                        background: 'rgba(59, 130, 246, 0.12)',
                                        borderLeft: '3px solid #3b82f6',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        color: '#bfdbfe',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px'
                                    }}>
                                        {selectedDutyModal.duty}
                                    </div>
                                )}
                            </div>

                            {/* Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px'
                            }}>
                                {/* Assigned Car */}
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)'
                                }}>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Car size={12} color="#38bdf8" /> ASSIGNED CAR
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '950',
                                        color: '#38bdf8',
                                        fontFamily: 'monospace',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {selectedDutyModal.vehicleNumber || 'Assigned'}
                                    </div>
                                    {selectedDutyModal.carType && (
                                        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '700', marginTop: '2px' }}>
                                            {selectedDutyModal.carType}
                                        </div>
                                    )}
                                </div>

                                {/* Reporting Time */}
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)'
                                }}>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} color="#fbbf24" /> REPORTING TIME
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '950', color: '#fbbf24' }}>
                                        {selectedDutyModal.time || '10:00 AM'}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
                                        IST Time
                                    </div>
                                </div>
                            </div>

                            {/* Guest Complete Tour Plan (Guest Ka True Plan) */}
                            {selectedDutyModal.tourPlan && selectedDutyModal.tourPlan.length > 0 && (
                                <div style={{
                                    padding: '14px',
                                    borderRadius: '14px',
                                    background: 'rgba(56, 189, 248, 0.05)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                        paddingBottom: '8px'
                                    }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            color: '#38bdf8',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            🗺️ Guest Complete Tour Plan ({selectedDutyModal.tourPlan.length} Days)
                                        </span>
                                        {selectedDutyModal.bookingId && (
                                            <span style={{ fontSize: '10px', color: '#fef08a', fontWeight: '800' }}>
                                                {selectedDutyModal.bookingId}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedDutyModal.tourPlan.map((tp, tpIdx) => {
                                            const isDutyDay = Boolean(
                                                tp.isCurrentDay ||
                                                (tp.dayNo && tp.dayNo === selectedDutyModal.dayNo) ||
                                                (tp.dateStr && tp.dateStr === selectedDutyModal.dateStr)
                                            );
                                            return (
                                                <div
                                                    key={tpIdx}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: '10px',
                                                        background: isDutyDay ? 'rgba(56, 189, 248, 0.14)' : 'rgba(0, 0, 0, 0.35)',
                                                        border: isDutyDay ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                            <span style={{
                                                                fontSize: '9.5px',
                                                                fontWeight: '950',
                                                                background: isDutyDay ? '#38bdf8' : '#334155',
                                                                color: isDutyDay ? '#000000' : '#ffffff',
                                                                padding: '2px 7px',
                                                                borderRadius: '4px',
                                                                letterSpacing: '0.3px'
                                                            }}>
                                                                DAY {tp.dayNo || tpIdx + 1}
                                                            </span>
                                                            <span style={{ fontSize: '11.5px', fontWeight: '800', color: isDutyDay ? '#ffffff' : '#cbd5e1' }}>
                                                                {tp.dateFormatted || tp.dateStr} {tp.weekday && `(${tp.weekday})`}
                                                            </span>
                                                        </div>
                                                        {isDutyDay && (
                                                            <span style={{
                                                                fontSize: '9px',
                                                                fontWeight: '950',
                                                                background: '#10b981',
                                                                color: '#000000',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                THIS DUTY
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{
                                                        fontSize: '13px',
                                                        fontWeight: '900',
                                                        color: isDutyDay ? '#ffffff' : '#e2e8f0',
                                                        marginTop: '2px',
                                                        lineHeight: 1.3
                                                    }}>
                                                        {tp.duty || tp.description || 'Tour Route'}
                                                    </div>

                                                    {(tp.pickupPoint || tp.time || tp.vehicleNumber) && (
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: '#94a3b8',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            flexWrap: 'wrap',
                                                            marginTop: '2px',
                                                            paddingTop: '4px',
                                                            borderTop: '1px dashed rgba(255, 255, 255, 0.08)'
                                                        }}>
                                                            {tp.time && <span>⏰ {tp.time}</span>}
                                                            {tp.pickupPoint && <span>📍 {tp.pickupPoint}</span>}
                                                            {tp.vehicleNumber && <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>🚗 {tp.vehicleNumber}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Drop Location */}
                            {selectedDutyModal.dropLocation && (
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)'
                                }}>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={12} color="#10b981" /> DROP LOCATION
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#ffffff', fontWeight: '800' }}>
                                        {selectedDutyModal.dropLocation}
                                    </div>
                                </div>
                            )}

                            {/* Hotel / Pickup Point */}
                            {(selectedDutyModal.hotel || selectedDutyModal.pickupPoint) && (
                                <div style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.07)'
                                }}>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={12} color="#f87171" /> HOTEL / PICKUP LOCATION
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '800', lineHeight: 1.4 }}>
                                        {selectedDutyModal.hotel || selectedDutyModal.pickupPoint}
                                    </div>
                                    {selectedDutyModal.pickupPoint && selectedDutyModal.hotel && selectedDutyModal.pickupPoint !== selectedDutyModal.hotel && (
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                                            Pickup: {selectedDutyModal.pickupPoint}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Remarks Note */}
                            {selectedDutyModal.guestRemarks && (
                                <div style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(251, 191, 36, 0.08)',
                                    border: '1px solid rgba(251, 191, 36, 0.25)'
                                }}>
                                    <div style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: '800', marginBottom: '4px' }}>
                                        ⚠️ SPECIAL REMARKS / NOTES
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#fef3c7', lineHeight: 1.4 }}>
                                        {selectedDutyModal.guestRemarks}
                                    </div>
                                </div>
                            )}

                            {/* Contact Section */}
                            <div style={{
                                padding: '14px',
                                borderRadius: '14px',
                                background: 'rgba(16, 185, 129, 0.06)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '10.5px', color: '#34d399', fontWeight: '800' }}>
                                        GUEST CONTACT
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: '950', color: '#ffffff', letterSpacing: '0.3px', marginTop: '2px' }}>
                                        {selectedDutyModal.mobileNumber || 'No Phone Number'}
                                    </div>
                                </div>
                                {selectedDutyModal.mobileNumber && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a
                                            href={`tel:${selectedDutyModal.mobileNumber}`}
                                            style={{
                                                padding: '7px 14px',
                                                background: '#10b981',
                                                color: '#ffffff',
                                                borderRadius: '8px',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <Phone size={13} /> Call
                                        </a>
                                        <a
                                            href={`https://wa.me/91${selectedDutyModal.mobileNumber.replace(/\D/g, '').slice(-10)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                padding: '7px 14px',
                                                background: '#25D366',
                                                color: '#ffffff',
                                                borderRadius: '8px',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            💬 WhatsApp
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                onClick={() => setSelectedDutyModal(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: '#ffffff',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverPortal;
