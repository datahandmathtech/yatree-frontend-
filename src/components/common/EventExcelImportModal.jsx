import React, { useState, useMemo, useEffect } from 'react';
import {
    X, UploadCloud, FileSpreadsheet, Check, Filter, Search, Trash2,
    Calendar, Clock, User, Phone, Car, Plane, Train, MapPin, IndianRupee,
    AlertCircle, Sparkles, CheckSquare, Square, ArrowDownToLine, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import axios from '../../api/axios';

// -------------------------------------------------------------
// HELPER UTILITIES FOR PARSING WEDDING / HOTEL TRANSPORT EXCELS
// -------------------------------------------------------------

function normalizeDateStr(raw, defaultYear = 2026) {
    if (!raw && raw !== 0) return '';
    if (raw instanceof Date) {
        const y = raw.getFullYear();
        const m = String(raw.getMonth() + 1).padStart(2, '0');
        const d = String(raw.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const str = String(raw).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
        return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    // "25th Nov.", "26th Nov", "25 Nov"
    const words = str.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i);
    if (words) {
        const day = String(words[1]).padStart(2, '0');
        const monthStr = words[2].toLowerCase().substring(0, 3);
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const month = months[monthStr] || '11';
        return `${defaultYear}-${month}-${day}`;
    }
    // Excel serial number (e.g. 46352)
    if (/^\d{4,6}$/.test(str)) {
        try {
            const d = new Date(Math.round((parseInt(str, 10) - 25569) * 86400 * 1000));
            return d.toISOString().split('T')[0];
        } catch (_) {}
    }
    return '';
}

function normalizeTimeStr(raw) {
    if (!raw && raw !== 0) return '09:00 AM';
    if (raw instanceof Date) {
        let hh = raw.getHours();
        const mm = String(raw.getMinutes()).padStart(2, '0');
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        return `${String(hh).padStart(2, '0')}:${mm} ${ampm}`;
    }
    if (typeof raw === 'number' || (!isNaN(raw) && Number(raw) >= 0 && Number(raw) < 1 && String(raw).trim() !== '')) {
        const totalSec = Math.round(Number(raw) * 86400);
        let hh = Math.floor(totalSec / 3600) % 24;
        const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        return `${String(hh).padStart(2, '0')}:${mm} ${ampm}`;
    }
    const str = String(raw).trim();
    if (/afternoon/i.test(str)) return '02:00 PM';
    if (/morning/i.test(str)) return '09:00 AM';
    if (/evening/i.test(str)) return '06:00 PM';
    if (/night/i.test(str)) return '09:00 PM';

    // 09:30:00 or 18:10 or 8:20
    const m = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
        let hh = parseInt(m[1], 10);
        const mm = m[2];
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        return `${String(hh).padStart(2, '0')}:${mm} ${ampm}`;
    }
    return str;
}

function normalizeVehicle(raw) {
    if (!raw) return { model: 'Sedan', count: 1 };
    const str = String(raw).trim();
    let count = 1;
    const countMatch = str.match(/^0?(\d+)/);
    if (countMatch) {
        count = parseInt(countMatch[1], 10);
    }

    let model = 'Sedan';
    if (/urbania|traveller/i.test(str)) {
        model = 'Urbania 12 Seater';
    } else if (/crysta|innova/i.test(str)) {
        model = 'Crysta';
    } else if (/ertiga/i.test(str)) {
        model = 'Ertiga';
    } else if (/sedan|dzire|etios/i.test(str)) {
        model = 'Sedan';
    } else if (/bus/i.test(str)) {
        model = 'Bus';
    }
    return { model, count };
}

function getDefaultFare(model, travelMode, dutyType) {
    const isLocal = /local/i.test(travelMode) || /local/i.test(dutyType);
    if (isLocal) {
        if (/urbania/i.test(model)) return 2500;
        if (/crysta/i.test(model)) return 1300;
        return 900;
    }
    // Airport / Station transfers
    if (/urbania/i.test(model)) return 3600;
    if (/crysta/i.test(model)) return 1650;
    if (/ertiga/i.test(model)) return 1400;
    if (/bus/i.test(model)) return 6500;
    return 1100; // Sedan default
}

export default function EventExcelImportModal({ event, allEvents = [], company, onClose, onSuccess }) {
    const [targetEvent, setTargetEvent] = useState(event);
    const [fileName, setFileName] = useState('');
    const [fileSheets, setFileSheets] = useState({});
    const [selectedSheets, setSelectedSheets] = useState([]);
    const [rawParsedDuties, setRawParsedDuties] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitProgress, setSubmitProgress] = useState(0);

    // -------------------------------------------------------------
    // THE 10 INTERACTIVE FILTERS
    // -------------------------------------------------------------
    // Filter 1: Sheet selection (managed via selectedSheets)
    // Filter 2: Side Filter
    const [filterSide, setFilterSide] = useState('All'); // 'All' | 'Bride' | 'Groom'
    // Filter 3: Movement Type Filter
    const [filterMovement, setFilterMovement] = useState('All'); // 'All' | 'Arrival' | 'Departure' | 'Local'
    // Filter 4: Date Filter
    const [filterDate, setFilterDate] = useState('All');
    // Filter 5: Vehicle Type Filter
    const [filterVehicle, setFilterVehicle] = useState('All');
    // Filter 6: Travel Mode Filter
    const [filterMode, setFilterMode] = useState('All');
    // Filter 7: Multi-Car Split Toggle
    const [splitMultiCar, setSplitMultiCar] = useState(true);
    // Filter 8: Fare Strategy
    const [fareStrategy, setFareStrategy] = useState('excel_or_default'); // 'excel_or_default' | 'ratecard' | 'flat_override'
    const [flatFareOverride, setFlatFareOverride] = useState('');
    // Filter 9: Default Hotel / Drop Property
    const [defaultHotel, setDefaultHotel] = useState(targetEvent?.location || 'Hotel');
    // Filter 10: Selected Duties / Row Checkboxes & Search
    const [selectedDutyKeys, setSelectedDutyKeys] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (event) {
            setTargetEvent(event);
            setDefaultHotel(event.location || 'Hotel');
        }
    }, [event]);

    // Extract Event Year
    const eventYear = useMemo(() => {
        if (targetEvent?.date) {
            try { return new Date(targetEvent.date).getFullYear(); } catch (_) {}
        }
        return 2026;
    }, [targetEvent]);

    // Handle File Drop / Select
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary', cellDates: false });
                const sheets = {};
                const sheetNames = workbook.SheetNames || [];

                sheetNames.forEach(sName => {
                    const sheet = workbook.Sheets[sName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (rows && rows.length > 0) {
                        sheets[sName] = rows;
                    }
                });

                setFileSheets(sheets);
                // By default select all sheets that have actual content
                const validSheets = Object.keys(sheets).filter(k => sheets[k].length > 1);
                setSelectedSheets(validSheets);
                processAllSheets(sheets, validSheets);
            } catch (err) {
                console.error('Error parsing excel:', err);
                alert('Failed to read Excel file: ' + err.message);
            } finally {
                setIsParsing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Parse all selected sheets into unified duty objects
    const processAllSheets = (sheetsObj = fileSheets, activeSheetNames = selectedSheets) => {
        const dutiesList = [];
        let keyCounter = 1;

        activeSheetNames.forEach(sheetName => {
            const rows = sheetsObj[sheetName] || [];
            if (!rows || rows.length < 2) return;

            // Detect if this sheet contains Side-by-side Dispatch tables (e.g. GROOM ARRIVALS & GROOM DEPARTURES)
            let isDispatchLayout = false;
            let dispatchArrivalHeaderIdx = -1;
            let dispatchDepartHeaderIdx = -1;

            for (let r = 0; r < Math.min(rows.length, 10); r++) {
                const rowStr = (rows[r] || []).join(' ').toLowerCase();
                if (rowStr.includes('arrivals') || rowStr.includes('departures')) {
                    isDispatchLayout = true;
                    dispatchArrivalHeaderIdx = r;
                    break;
                }
            }

            if (isDispatchLayout && dispatchArrivalHeaderIdx !== -1) {
                // Parse Side-by-Side Dispatch format
                parseDispatchTable(rows, sheetName, dutiesList, keyCounter);
            } else {
                // Parse Standard Guest List format
                parseGuestListTable(rows, sheetName, dutiesList, keyCounter);
            }
        });

        setRawParsedDuties(dutiesList);
        // Default select all duties
        const allKeys = new Set(dutiesList.map(d => d.uniqueKey));
        setSelectedDutyKeys(allKeys);
    };

    // Parser for Side-by-Side Dispatch Tables (GROOM ARRIVALS / GROOM DEPARTURES / BRIDE ARRIVALS / BRIDE DEPARTURES)
    const parseDispatchTable = (rows, sheetName, dutiesList, keyCounter) => {
        let currentLeftSection = '';
        let currentRightSection = '';
        let headerRowIndex = -1;

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r] || [];
            const rStr = row.join(' ').toLowerCase();

            if (rStr.includes('arrivals') || rStr.includes('departures')) {
                // Identify sections from title row
                row.forEach((cell, cIdx) => {
                    const cStr = String(cell || '').trim().toUpperCase();
                    if (cStr.includes('ARRIVALS')) {
                        if (cIdx < 7) currentLeftSection = cStr;
                        else currentRightSection = cStr;
                    }
                    if (cStr.includes('DEPARTURES')) {
                        if (cIdx < 7) currentLeftSection = cStr;
                        else currentRightSection = cStr;
                    }
                });
                headerRowIndex = r + 1; // Header is immediately next row
                continue;
            }

            // Skip summary, empty, or header rows
            if (r <= headerRowIndex || !row || row.length === 0) continue;
            if (rStr.includes('total') || rStr.includes('room allocation') || rStr.includes('departure (')) continue;

            const defaultSide = /bride/i.test(sheetName) ? 'Bride' : /groom/i.test(sheetName) ? 'Groom' : 'General';

            // Left side columns (0 to 6): Date, Side, Pax, Flight/Train No., Time, Vehicle, Fare
            const leftDateRaw = row[0];
            const leftDate = normalizeDateStr(leftDateRaw, eventYear);
            if (leftDate) {
                const leftSide = String(row[1] || defaultSide).trim();
                const leftPax = parseInt(row[2], 10) || 1;
                const leftFlight = String(row[3] || '').trim();
                const leftTime = normalizeTimeStr(row[4]);
                const leftVehRaw = String(row[5] || 'Sedan').trim();
                const leftFare = Number(row[6]) || 0;
                const { model, count } = normalizeVehicle(leftVehRaw);

                const isPickup = /arrival/i.test(currentLeftSection) || !/depart/i.test(currentLeftSection);
                const isTrain = /12\d{3}|train/i.test(leftFlight);
                const isLocal = /local|chunda|chamanpura|palace/i.test(leftFlight);

                let dutyType = isPickup ? (isTrain ? 'Station Pickup' : isLocal ? 'Local Pickup' : 'Airport Pickup') : (isTrain ? 'Station Drop' : isLocal ? 'Local Drop' : 'Airport Drop');

                const countToGenerate = splitMultiCar ? count : 1;
                for (let k = 0; k < countToGenerate; k++) {
                    dutiesList.push({
                        uniqueKey: `dispatch_L_${sheetName}_${r}_${k}_${keyCounter++}`,
                        sheetName,
                        side: /bride/i.test(leftSide) ? 'Bride' : /groom/i.test(leftSide) ? 'Groom' : defaultSide,
                        movementType: isPickup ? 'Arrival' : 'Departure',
                        dutyType,
                        travelMode: isTrain ? 'Train' : isLocal ? 'Local' : 'Flight',
                        flightTrainNo: leftFlight,
                        guestName: leftFlight ? `${leftSide} Guest(s) - ${leftFlight}` : `${leftSide} Guests`,
                        phone: '',
                        date: leftDate,
                        time: leftTime,
                        pax: leftPax,
                        model,
                        carCount: 1,
                        dutyAmount: leftFare || getDefaultFare(model, isLocal ? 'Local' : 'Flight', dutyType),
                        pickupPoint: isPickup ? (isTrain ? 'Railway Station' : isLocal ? leftFlight : 'Udaipur Airport') : defaultHotel,
                        dropLocation: isPickup ? defaultHotel : (isTrain ? 'Railway Station' : isLocal ? leftFlight : 'Udaipur Airport'),
                        remarks: `[${sheetName}] ${leftSide} Side | Flight/Train: ${leftFlight} | Pax: ${leftPax}`
                    });
                }
            }

            // Right side columns (8 to 15): Date, Side, Pax, Flight/Train No, Time, Vehicle, Fare, Guest(s)
            const rightDateRaw = row[8];
            const rightDate = normalizeDateStr(rightDateRaw, eventYear);
            if (rightDate) {
                const rightSide = String(row[9] || defaultSide).trim();
                const rightPax = parseInt(row[10], 10) || 1;
                const rightFlight = String(row[11] || '').trim();
                const rightTime = normalizeTimeStr(row[12]);
                const rightVehRaw = String(row[13] || 'Sedan').trim();
                const rightFare = Number(row[14]) || 0;
                const rightGuest = String(row[15] || '').trim();
                const { model, count } = normalizeVehicle(rightVehRaw);

                const isPickup = /arrival/i.test(currentRightSection);
                const isTrain = /12\d{3}|train/i.test(rightFlight);
                const isLocal = /local|chunda|chamanpura|palace/i.test(rightFlight);

                let dutyType = isPickup ? (isTrain ? 'Station Pickup' : isLocal ? 'Local Pickup' : 'Airport Pickup') : (isTrain ? 'Station Drop' : isLocal ? 'Local Drop' : 'Airport Drop');

                const countToGenerate = splitMultiCar ? count : 1;
                for (let k = 0; k < countToGenerate; k++) {
                    dutiesList.push({
                        uniqueKey: `dispatch_R_${sheetName}_${r}_${k}_${keyCounter++}`,
                        sheetName,
                        side: /bride/i.test(rightSide) ? 'Bride' : /groom/i.test(rightSide) ? 'Groom' : defaultSide,
                        movementType: isPickup ? 'Arrival' : 'Departure',
                        dutyType,
                        travelMode: isTrain ? 'Train' : isLocal ? 'Local' : 'Flight',
                        flightTrainNo: rightFlight,
                        guestName: rightGuest || `${rightSide} Guest - ${rightFlight}`,
                        phone: '',
                        date: rightDate,
                        time: rightTime,
                        pax: rightPax,
                        model,
                        carCount: 1,
                        dutyAmount: rightFare || getDefaultFare(model, isLocal ? 'Local' : 'Flight', dutyType),
                        pickupPoint: isPickup ? (isTrain ? 'Railway Station' : isLocal ? rightFlight : 'Udaipur Airport') : defaultHotel,
                        dropLocation: isPickup ? defaultHotel : (isTrain ? 'Railway Station' : isLocal ? rightFlight : 'Udaipur Airport'),
                        remarks: `[${sheetName}] ${rightSide} Side | Guest: ${rightGuest} | Flight/Train: ${rightFlight}`
                    });
                }
            }
        }
    };

    // Parser for Standard Guest List format (Arrival Date/Time & Departure Date/Time per row)
    const parseGuestListTable = (rows, sheetName, dutiesList, keyCounter) => {
        // Find header row by looking for "First Name" or "Arrival Date"
        let headerIdx = -1;
        let colMap = {};

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
            const row = rows[r] || [];
            const rLow = row.map(c => String(c || '').toLowerCase().trim());
            if (rLow.includes('first name') || rLow.includes('arrival date') || rLow.includes('phone number')) {
                headerIdx = r;
                rLow.forEach((c, idx) => {
                    if (c.includes('salutation') || c === '') if (idx === 0) colMap.salutation = idx;
                    if (c === 'first name') colMap.firstName = idx;
                    if (c === 'last name') colMap.lastName = idx;
                    if (c === 'guest 2' || c === 'guest 3') colMap.otherGuests = idx;
                    if (c.includes('phone')) colMap.phone = idx;
                    if (c.includes('party')) colMap.party = idx;
                    if (c === 'pax') colMap.pax = idx;
                    if (c === 'arrival date') colMap.arrivalDate = idx;
                    if (c === 'arrival time') colMap.arrivalTime = idx;
                    if (c === 'travel mode' && !colMap.arrivalMode) colMap.arrivalMode = idx;
                    if (c === 'details' && !colMap.arrivalDetails) colMap.arrivalDetails = idx;
                    if (c.includes('arrival car')) colMap.arrivalCar = idx;
                    if (c === 'departure date') colMap.departureDate = idx;
                    if (c === 'departure time') colMap.departureTime = idx;
                    if (c === 'mode' || (c === 'travel mode' && colMap.arrivalMode !== undefined)) colMap.departureMode = idx;
                    if (c === 'details' && colMap.arrivalDetails !== undefined) colMap.departureDetails = idx;
                    if (c.includes('departure car')) colMap.departureCar = idx;
                    if (c.includes('note') || c.includes('comment')) colMap.note = idx;
                });
                break;
            }
        }

        if (headerIdx === -1) {
            // Fallback column index guess
            colMap = {
                salutation: 0, firstName: 1, lastName: 2, phone: 6, pax: 11,
                arrivalDate: 13, arrivalTime: 14, arrivalMode: 15, arrivalDetails: 16, arrivalCar: 17,
                departureDate: 18, departureTime: 19, departureMode: 20, departureDetails: 21, departureCar: 22, note: 23
            };
            headerIdx = 0;
        }

        const defaultSide = /bride/i.test(sheetName) ? 'Bride' : /groom/i.test(sheetName) ? 'Groom' : 'General';

        for (let r = headerIdx + 1; r < rows.length; r++) {
            const row = rows[r] || [];
            if (!row || row.length === 0) continue;

            const salutation = String(row[colMap.salutation] || '').trim();
            const firstName = String(row[colMap.firstName] || '').trim();
            const lastName = String(row[colMap.lastName] || '').trim();
            const phone = String(row[colMap.phone] || '').trim();
            const party = String(row[colMap.party] || '').trim();
            const paxRaw = String(row[colMap.pax] || '1').trim();
            const pax = parseInt(paxRaw, 10) || 1;
            const note = String(row[colMap.note] || '').trim();

            if (!firstName && !lastName && !row[colMap.arrivalDate] && !row[colMap.departureDate]) continue;

            const fullName = [salutation, firstName, lastName].filter(Boolean).join(' ');
            const side = party ? (/gupta|groom/i.test(party) ? 'Groom' : 'Bride') : defaultSide;

            // 1. ARRIVAL DUTY
            const arrDateRaw = row[colMap.arrivalDate];
            const arrDate = normalizeDateStr(arrDateRaw, eventYear);
            const arrCarRaw = String(row[colMap.arrivalCar] || '').trim();
            const arrDetails = String(row[colMap.arrivalDetails] || '').trim();
            const arrMode = String(row[colMap.arrivalMode] || '').trim();
            const arrTime = normalizeTimeStr(row[colMap.arrivalTime]);

            if (arrDate && (arrCarRaw || arrDetails || arrMode)) {
                const { model, count } = normalizeVehicle(arrCarRaw);
                const isTrain = /train|12\d{3}/i.test(arrMode) || /12\d{3}/i.test(arrDetails);
                const isLocal = /local|chunda|chamanpura|palace/i.test(arrMode) || /chunda|chamanpura|palace/i.test(arrDetails);
                const isCar = /by car/i.test(arrMode);

                let dutyType = isTrain ? 'Station Pickup' : isLocal ? 'Local Pickup' : isCar ? 'Self / Car' : 'Airport Pickup';
                const pickupPoint = isTrain ? 'Railway Station' : isLocal ? (arrDetails || 'Local') : 'Udaipur Airport';

                const countToGenerate = splitMultiCar ? count : 1;
                for (let k = 0; k < countToGenerate; k++) {
                    dutiesList.push({
                        uniqueKey: `guest_arr_${sheetName}_${r}_${k}_${keyCounter++}`,
                        sheetName,
                        side,
                        movementType: 'Arrival',
                        dutyType,
                        travelMode: isTrain ? 'Train' : isLocal ? 'Local' : isCar ? 'Car' : 'Flight',
                        flightTrainNo: arrDetails,
                        guestName: fullName || 'Event Guest',
                        phone,
                        date: arrDate,
                        time: arrTime,
                        pax,
                        model,
                        carCount: 1,
                        dutyAmount: getDefaultFare(model, isLocal ? 'Local' : 'Flight', dutyType),
                        pickupPoint,
                        dropLocation: defaultHotel,
                        remarks: `[${side} Side] ${fullName} | Flight/Train: ${arrDetails} | Note: ${note}`
                    });
                }
            }

            // 2. DEPARTURE DUTY
            const depDateRaw = row[colMap.departureDate];
            const depDate = normalizeDateStr(depDateRaw, eventYear);
            const depCarRaw = String(row[colMap.departureCar] || '').trim();
            const depDetails = String(row[colMap.departureDetails] || '').trim();
            const depMode = String(row[colMap.departureMode] || '').trim();
            const depTime = normalizeTimeStr(row[colMap.departureTime]);

            if (depDate && (depCarRaw || depDetails || depMode)) {
                const { model, count } = normalizeVehicle(depCarRaw);
                const isTrain = /train|12\d{3}/i.test(depMode) || /12\d{3}/i.test(depDetails);
                const isLocal = /local|chunda|chamanpura|palace/i.test(depMode) || /chunda|chamanpura|palace/i.test(depDetails);
                const isCar = /by car/i.test(depMode);

                let dutyType = isTrain ? 'Station Drop' : isLocal ? 'Local Drop' : isCar ? 'Self / Car' : 'Airport Drop';
                const dropLocation = isTrain ? 'Railway Station' : isLocal ? (depDetails || 'Local') : 'Udaipur Airport';

                const countToGenerate = splitMultiCar ? count : 1;
                for (let k = 0; k < countToGenerate; k++) {
                    dutiesList.push({
                        uniqueKey: `guest_dep_${sheetName}_${r}_${k}_${keyCounter++}`,
                        sheetName,
                        side,
                        movementType: 'Departure',
                        dutyType,
                        travelMode: isTrain ? 'Train' : isLocal ? 'Local' : isCar ? 'Car' : 'Flight',
                        flightTrainNo: depDetails,
                        guestName: fullName || 'Event Guest',
                        phone,
                        date: depDate,
                        time: depTime,
                        pax,
                        model,
                        carCount: 1,
                        dutyAmount: getDefaultFare(model, isLocal ? 'Local' : 'Flight', dutyType),
                        pickupPoint: defaultHotel,
                        dropLocation,
                        remarks: `[${side} Side] ${fullName} | Flight/Train: ${depDetails} | Note: ${note}`
                    });
                }
            }
        }
    };

    // Toggle a single sheet
    const toggleSheet = (sName) => {
        const next = selectedSheets.includes(sName)
            ? selectedSheets.filter(s => s !== sName)
            : [...selectedSheets, sName];
        setSelectedSheets(next);
        processAllSheets(fileSheets, next);
    };

    // Available dates extracted
    const availableDates = useMemo(() => {
        const dSet = new Set(rawParsedDuties.map(d => d.date).filter(Boolean));
        return Array.from(dSet).sort();
    }, [rawParsedDuties]);

    // Filtered duties
    const filteredDuties = useMemo(() => {
        return rawParsedDuties.filter(d => {
            // Side
            if (filterSide !== 'All' && d.side !== filterSide) return false;
            // Movement
            if (filterMovement !== 'All' && d.movementType !== filterMovement) return false;
            // Date
            if (filterDate !== 'All' && d.date !== filterDate) return false;
            // Vehicle
            if (filterVehicle !== 'All' && !d.model.toLowerCase().includes(filterVehicle.toLowerCase())) return false;
            // Mode
            if (filterMode !== 'All' && d.travelMode !== filterMode) return false;
            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const mGuest = (d.guestName || '').toLowerCase().includes(q);
                const mFlight = (d.flightTrainNo || '').toLowerCase().includes(q);
                const mPhone = (d.phone || '').toLowerCase().includes(q);
                const mVeh = (d.model || '').toLowerCase().includes(q);
                if (!mGuest && !mFlight && !mPhone && !mVeh) return false;
            }
            return true;
        });
    }, [rawParsedDuties, filterSide, filterMovement, filterDate, filterVehicle, filterMode, searchQuery]);

    // Metrics for Selected Duties
    const metrics = useMemo(() => {
        const activeList = filteredDuties.filter(d => selectedDutyKeys.has(d.uniqueKey));
        const totalRev = activeList.reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0);
        const totalPax = activeList.reduce((sum, d) => sum + (Number(d.pax) || 1), 0);

        const vCounts = {};
        activeList.forEach(d => {
            vCounts[d.model] = (vCounts[d.model] || 0) + 1;
        });

        const sideCounts = { Bride: 0, Groom: 0, General: 0 };
        activeList.forEach(d => {
            sideCounts[d.side] = (sideCounts[d.side] || 0) + 1;
        });

        return {
            totalDuties: activeList.length,
            totalPax,
            totalRev,
            vCounts,
            sideCounts
        };
    }, [filteredDuties, selectedDutyKeys]);

    // Toggle single duty selection
    const toggleDutySelect = (key) => {
        const next = new Set(selectedDutyKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSelectedDutyKeys(next);
    };

    // Toggle all filtered duties
    const toggleSelectAllFiltered = () => {
        const allFilteredSelected = filteredDuties.every(d => selectedDutyKeys.has(d.uniqueKey));
        const next = new Set(selectedDutyKeys);
        if (allFilteredSelected) {
            filteredDuties.forEach(d => next.delete(d.uniqueKey));
        } else {
            filteredDuties.forEach(d => next.add(d.uniqueKey));
        }
        setSelectedDutyKeys(next);
    };

    // Remove single duty from list
    const removeDutyFromList = (key) => {
        setRawParsedDuties(prev => prev.filter(d => d.uniqueKey !== key));
        setSelectedDutyKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    // Execute Bulk Import to Event & Live DRS
    const handleExecuteImport = async () => {
        const dutiesToImport = filteredDuties.filter(d => selectedDutyKeys.has(d.uniqueKey));
        if (dutiesToImport.length === 0) {
            alert('Please select at least 1 duty to import.');
            return;
        }

        if (!targetEvent?._id) {
            alert('Please select a target event first.');
            return;
        }

        if (!window.confirm(`Are you sure you want to import ${dutiesToImport.length} duties into "${targetEvent.name}" and sync them to Live DRS?`)) {
            return;
        }

        setIsSubmitting(true);
        setSubmitProgress(10);

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            // Apply Fare strategy overrides if needed
            const finalDuties = dutiesToImport.map(d => {
                let amount = Number(d.dutyAmount) || 0;
                if (fareStrategy === 'flat_override' && flatFareOverride) {
                    amount = Number(flatFareOverride) || amount;
                } else if (fareStrategy === 'ratecard' && targetEvent?.rateCard?.length > 0) {
                    const matchedRate = targetEvent.rateCard.find(r => r.vehicleModel?.toLowerCase() === d.model.toLowerCase() || r.vehicleType?.toLowerCase() === d.model.toLowerCase());
                    if (matchedRate) amount = matchedRate.baseRate;
                }
                return {
                    ...d,
                    dutyAmount: amount,
                    property: d.pickupPoint || defaultHotel,
                    dropLocation: d.dropLocation || defaultHotel
                };
            });

            setSubmitProgress(20);
            
            // Send in chunks of 150 duties for instant processing, live progress and zero timeouts
            const CHUNK_SIZE = 150;
            let totalImported = 0;

            for (let i = 0; i < finalDuties.length; i += CHUNK_SIZE) {
                const chunk = finalDuties.slice(i, i + CHUNK_SIZE);
                const chunkRes = await axios.post(`/api/admin/events/${targetEvent._id}/bulk-import-duties`, {
                    duties: chunk
                }, {
                    ...config,
                    timeout: 120000
                });
                totalImported += (chunkRes.data?.count || chunk.length);
                const pct = Math.round(20 + ((i + chunk.length) / finalDuties.length) * 75);
                setSubmitProgress(Math.min(95, pct));
            }

            setSubmitProgress(100);
            alert(`🎉 Success! ${totalImported} event duties imported and synced to Live DRS!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Import error:', err);
            alert('Error during bulk import: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '16px' }}>
            <motion.div initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 25, opacity: 0 }} style={{ width: '100%', maxWidth: '1240px', maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: '#0b1120', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)', overflow: 'hidden' }}>

                {/* MODAL HEADER */}
                <div style={{ padding: '18px 24px', background: 'linear-gradient(90deg, rgba(251,191,36,0.1), rgba(168,85,247,0.1))', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 4px 15px rgba(251,191,36,0.4)' }}>
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '800' }}>Event Excel Smart Importer</h2>
                                <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', padding: '2px 8px', borderRadius: '12px' }}>
                                    Live DRS Sync
                                </span>
                            </div>
                            <div style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>Target Event:</span>
                                {allEvents.length > 1 ? (
                                    <select
                                        value={targetEvent?._id || ''}
                                        onChange={(e) => {
                                            const picked = allEvents.find(ev => String(ev._id) === e.target.value);
                                            if (picked) {
                                                setTargetEvent(picked);
                                                if (picked.location) setDefaultHotel(picked.location);
                                            }
                                        }}
                                        style={{
                                            background: '#0f172a',
                                            color: '#fbbf24',
                                            border: '1px solid rgba(251,191,36,0.45)',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '12.5px',
                                            fontWeight: '700',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {allEvents.map(ev => (
                                            <option key={ev._id} value={ev._id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                                                {ev.name} ({ev.client || 'No Client'} • {ev.date ? new Date(ev.date).toLocaleDateString('en-IN') : ''})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <strong style={{ color: '#f8fafc' }}>{targetEvent?.name}</strong>
                                )}
                                <span>• Auto-extract Bride & Groom arrivals/departures with multi-sheet filtering</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* MODAL BODY (SCROLLABLE) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {/* UPLOAD DROPZONE IF NO FILE */}
                    {!fileName && (
                        <div style={{ padding: '40px 20px', border: '2px dashed rgba(251,191,36,0.4)', borderRadius: '16px', background: 'rgba(251,191,36,0.03)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', cursor: 'pointer', position: 'relative' }}>
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                <UploadCloud size={32} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '700' }}>Drop Hotel Excel or Click to Browse</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Supports .xlsx, .xls, .csv files with Bride Side, Groom Side, Arrivals & Departures sheets</p>
                            </div>
                            <span style={{ padding: '8px 18px', borderRadius: '10px', background: '#fbbf24', color: '#000', fontWeight: '800', fontSize: '12px' }}>Choose Excel File</span>
                        </div>
                    )}

                    {fileName && (
                        <>
                            {/* ACTIVE FILE & SHEET SELECTOR (FILTER 1) */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileSpreadsheet size={16} color="#fbbf24" />
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>File: {fileName}</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>({rawParsedDuties.length} total duties extracted)</span>
                                    </div>
                                    <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Change File
                                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>

                                {/* Multi-Sheet Select Pills */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Sheets in Excel:</span>
                                    {Object.keys(fileSheets).map(sName => {
                                        const isSelected = selectedSheets.includes(sName);
                                        const rowCount = fileSheets[sName]?.length || 0;
                                        return (
                                            <button
                                                key={sName}
                                                type="button"
                                                onClick={() => toggleSheet(sName)}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                                    background: isSelected ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.03)',
                                                    color: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                                                    fontSize: '11.5px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {isSelected ? <Check size={12} /> : null}
                                                <span>{sName}</span>
                                                <span style={{ fontSize: '10px', opacity: 0.6 }}>({rowCount} rows)</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 10-FILTER MASTER CONTROL BAR */}
                            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '13px', fontWeight: '800' }}>
                                        <Filter size={15} /> 10-Point Import Filters & Controls
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={toggleSelectAllFiltered}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            {filteredDuties.every(d => selectedDutyKeys.has(d.uniqueKey)) ? <CheckSquare size={13} color="#22c55e" /> : <Square size={13} />}
                                            Select / Deselect Filtered ({filteredDuties.length})
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                                    {/* Filter 2: Side */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Side / Party</label>
                                        <select value={filterSide} onChange={e => setFilterSide(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="All">All Sides (Bride + Groom)</option>
                                            <option value="Bride">👰 Bride Side</option>
                                            <option value="Groom">🤵 Groom Side</option>
                                        </select>
                                    </div>

                                    {/* Filter 3: Movement Type */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Movement Type</label>
                                        <select value={filterMovement} onChange={e => setFilterMovement(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="All">All Movements (Arrival + Depart)</option>
                                            <option value="Arrival">🛬 Arrivals (Pickups)</option>
                                            <option value="Departure">🛫 Departures (Drops)</option>
                                        </select>
                                    </div>

                                    {/* Filter 4: Date Filter */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Date</label>
                                        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="All">All Dates ({availableDates.length})</option>
                                            {availableDates.map(dStr => (
                                                <option key={dStr} value={dStr}>{dStr}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Filter 5: Vehicle Type */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Vehicle Category</label>
                                        <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="All">All Vehicle Types</option>
                                            <option value="Sedan">Sedan (Dzire / Etios)</option>
                                            <option value="Crysta">Innova Crysta</option>
                                            <option value="Urbania">Urbania / Traveller</option>
                                            <option value="Ertiga">Ertiga</option>
                                        </select>
                                    </div>

                                    {/* Filter 6: Travel Mode */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Travel Mode</label>
                                        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="All">All Modes (Flight + Train + Local)</option>
                                            <option value="Flight">✈️ By Flight</option>
                                            <option value="Train">🚆 By Train</option>
                                            <option value="Local">🚗 Local Pickup</option>
                                            <option value="Car">🚙 Self / By Car</option>
                                        </select>
                                    </div>

                                    {/* Filter 7: Multi-Car Split Toggle */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Multi-Car Handling</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextVal = !splitMultiCar;
                                                setSplitMultiCar(nextVal);
                                                // Re-process with nextVal
                                                setTimeout(() => processAllSheets(fileSheets, selectedSheets), 50);
                                            }}
                                            style={{
                                                width: '100%',
                                                height: '36px',
                                                borderRadius: '8px',
                                                border: splitMultiCar ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                                                background: splitMultiCar ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.4)',
                                                color: splitMultiCar ? '#4ade80' : 'rgba(255,255,255,0.7)',
                                                fontSize: '11.5px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {splitMultiCar ? <Check size={14} /> : null}
                                            {splitMultiCar ? 'Split "2 Sedan" into 2 Duties' : 'Keep as 1 Multi-Car Duty'}
                                        </button>
                                    </div>

                                    {/* Filter 8: Fare / Pricing Strategy */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Fare / Pricing Option</label>
                                        <select value={fareStrategy} onChange={e => setFareStrategy(e.target.value)} style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px' }}>
                                            <option value="excel_or_default">Excel Fare (Fallback Default)</option>
                                            <option value="ratecard">Event Rate Card</option>
                                            <option value="flat_override">Custom Flat Fare (₹)</option>
                                        </select>
                                    </div>

                                    {/* Filter 9: Default Hotel Destination */}
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Default Hotel / Property</label>
                                        <input
                                            type="text"
                                            value={defaultHotel}
                                            onChange={e => setDefaultHotel(e.target.value)}
                                            placeholder="e.g. Hotel Chunda Haveli"
                                            style={{ width: '100%', height: '36px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '0 10px', fontSize: '12px' }}
                                        />
                                    </div>
                                </div>

                                {/* Filter 10: Instant Search & Date Filter Pills */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Quick Date:</span>
                                        <button
                                            type="button"
                                            onClick={() => setFilterDate('All')}
                                            style={{ padding: '3px 8px', borderRadius: '6px', border: filterDate === 'All' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)', background: filterDate === 'All' ? '#fbbf24' : 'transparent', color: filterDate === 'All' ? '#000' : 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            All
                                        </button>
                                        {availableDates.map(dStr => {
                                            const isAct = filterDate === dStr;
                                            const dayCount = rawParsedDuties.filter(d => d.date === dStr).length;
                                            return (
                                                <button
                                                    key={dStr}
                                                    type="button"
                                                    onClick={() => setFilterDate(dStr)}
                                                    style={{ padding: '3px 8px', borderRadius: '6px', border: isAct ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)', background: isAct ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.02)', color: isAct ? '#fbbf24' : 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    {dStr.slice(5)} ({dayCount})
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Search input */}
                                    <div style={{ position: 'relative', width: '240px' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'rgba(255,255,255,0.4)' }} />
                                        <input
                                            type="text"
                                            placeholder="Search guest or flight..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            style={{ width: '100%', height: '34px', paddingLeft: '32px', paddingRight: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '11.5px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LIVE PREVIEW TABLE */}
                            <div style={{ background: 'rgba(10, 16, 30, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>
                                        Preview Duties to Import ({filteredDuties.length} filtered, {metrics.totalDuties} selected)
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '700' }}>
                                        <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            👰 Bride: {metrics.sideCounts.Bride}
                                        </span>
                                        <span style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            🤵 Groom: {metrics.sideCounts.Groom}
                                        </span>
                                        <span style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            Total Rev: ₹{metrics.totalRev.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '10.5px' }}>
                                                <th style={{ padding: '10px 14px', width: '36px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={filteredDuties.length > 0 && filteredDuties.every(d => selectedDutyKeys.has(d.uniqueKey))}
                                                        onChange={toggleSelectAllFiltered}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </th>
                                                <th style={{ padding: '10px 14px' }}>Date & Time</th>
                                                <th style={{ padding: '10px 14px' }}>Side & Duty</th>
                                                <th style={{ padding: '10px 14px' }}>Guest Details</th>
                                                <th style={{ padding: '10px 14px' }}>Flight / Route</th>
                                                <th style={{ padding: '10px 14px' }}>Vehicle</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Fare (₹)</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center', width: '40px' }}>Del</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredDuties.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                                        No duties match your selected filters. Try adjusting side, date, or vehicle filters.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDuties.map(d => {
                                                    const isChecked = selectedDutyKeys.has(d.uniqueKey);
                                                    const isBride = d.side === 'Bride';
                                                    const isArrival = d.movementType === 'Arrival';
                                                    return (
                                                        <tr
                                                            key={d.uniqueKey}
                                                            style={{
                                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                                background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                                opacity: isChecked ? 1 : 0.45,
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleDutySelect(d.uniqueKey)}
                                                                    style={{ cursor: 'pointer' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                                <div style={{ color: 'white', fontWeight: '700' }}>{d.date}</div>
                                                                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>{d.time}</div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: isBride ? 'rgba(244,114,182,0.2)' : 'rgba(56,189,248,0.2)', color: isBride ? '#f472b6' : '#38bdf8', border: isBride ? '1px solid rgba(244,114,182,0.4)' : '1px solid rgba(56,189,248,0.4)' }}>
                                                                        {d.side}
                                                                    </span>
                                                                    <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: isArrival ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: isArrival ? '#4ade80' : '#f87171' }}>
                                                                        {isArrival ? '🛬 Pickup' : '🛫 Drop'}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                                    {d.dutyType}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ color: 'white', fontWeight: '700' }}>{d.guestName}</div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                                                    {d.pax} Pax {d.phone ? `• 📞 ${d.phone}` : ''}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ color: '#38bdf8', fontWeight: '800' }}>{d.flightTrainNo || '—'}</div>
                                                                <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                                                                    {d.pickupPoint} ➔ {d.dropLocation}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                                                    🚗 {d.model}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '900', color: '#34d399' }}>
                                                                ₹{(d.dutyAmount || 0).toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeDutyFromList(d.uniqueKey)}
                                                                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                                                                    title="Remove from import"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* MODAL FOOTER */}
                <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        {fileName && (
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                                Selected for Import: <strong style={{ color: '#fbbf24' }}>{metrics.totalDuties} duties</strong> • Total Est. Rev: <strong style={{ color: '#34d399' }}>₹{metrics.totalRev.toLocaleString('en-IN')}</strong>
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={!fileName || metrics.totalDuties === 0 || isSubmitting}
                        style={{
                            padding: '12px 28px',
                            borderRadius: '12px',
                            background: (!fileName || metrics.totalDuties === 0 || isSubmitting) ? 'rgba(251,191,36,0.3)' : 'linear-gradient(135deg, #fbbf24, #d97706)',
                            color: '#000',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '900',
                            cursor: (!fileName || metrics.totalDuties === 0 || isSubmitting) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 20px rgba(251,191,36,0.35)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowDownToLine size={16} />
                        {isSubmitting ? `Importing & Syncing to DRS (${submitProgress}%)...` : `Import ${metrics.totalDuties} Duties to Event & Live DRS`}
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
