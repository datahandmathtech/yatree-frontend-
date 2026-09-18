const fs = require('fs');

let code = fs.readFileSync('src/pages/Leads.jsx', 'utf8');

// 1. Drawer Footer
const footerRegex = /\{\/\* Drawer Footer \*\/\}\s*<div style=\{\{[\s\S]*?justifyContent: 'space-between'[\s\S]*?\}\}>\s*<span style=\{\{[\s\S]*?\}\}>\s*\{selectedSidebarMonth\}\s*<\/span>\s*<button[\s\S]*?>\s*Close\s*<\/button>\s*<\/div>/;
if (footerRegex.test(code)) {
    code = code.replace(footerRegex, '');
    console.log('Footer removed');
} else { console.log('Footer regex failed'); }

// 2. Drawer Header & Monthly Summary Card
const headerRegex = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<BarChart3 size=\{18\} color="#fbbf24" \/>\s*<h3 style=\{\{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0\.3px' \}\}>\s*Daily Lead Breakdown\s*<\/h3>\s*<\/div>\s*<div style=\{\{ fontSize: '11px', color: 'rgba\(255, 255, 255, 0\.5\)', marginTop: '2px' \}\}>\s*Tally-style analytics & conversion matrix\s*<\/div>/;

const newHeader = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%', paddingRight: '15px' }}>
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
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#86efac', fontWeight: '700' }}>Total Conversions</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#4ade80' }}>{sidebarStats.convertedCount || sidebarStats.totalConversions}</div>
        </div>
    </div>
</div>`;

if (headerRegex.test(code)) {
    code = code.replace(headerRegex, newHeader);
    console.log('Header replaced');
} else { console.log('Header regex failed'); }

// Now carefully remove the Monthly Summary Card
const summaryCardRegex = /\{\/\* Monthly Summary Card \*\/\}\s*<div style=\{\{[\s\S]*?gridTemplateColumns: '1fr 1fr'[\s\S]*?\}\}>[\s\S]*?\{\/\* Day-wise Scrollable Table \*\/\}/;
if (summaryCardRegex.test(code)) {
    code = code.replace(summaryCardRegex, '{/* Day-wise Scrollable Table */}');
    console.log('Summary card removed');
} else { console.log('Summary card regex failed'); }

// 3. Highlight today's date in green
const bgRegex = /background: isExpanded \? 'rgba\(251, 191, 36, 0\.08\)' : \(hasLeads \? 'rgba\(255, 255, 255, 0\.015\)' : 'transparent'\),/;
const newBg = `background: isExpanded ? 'rgba(251, 191, 36, 0.08)' : (new Date().getDate() === item.day && selectedSidebarMonth === new Date().toLocaleString('en-US', { month: 'short' }) + ' ' + new Date().getFullYear() ? 'rgba(34, 197, 94, 0.2)' : (hasLeads ? 'rgba(255, 255, 255, 0.015)' : 'transparent')),`;
if (bgRegex.test(code)) {
    code = code.replace(bgRegex, newBg);
    console.log('Day highlight added');
}

// 4. Vehicles
const customSourcesRegex = /const \[customSources, setCustomSources\] = useState\(\[\]\);\s*useEffect\(\(\) => \{\s*if \(selectedCompany\?\._id\) \{\s*try \{\s*const saved = JSON\.parse\(localStorage\.getItem\('leadSources_' \+ selectedCompany\._id\)\);\s*if \(saved\) setCustomSources\(saved\);\s*\} catch\(e\) \{\}\s*\}\s*\}, \[selectedCompany\]\);\s*const ALL_SOURCES = \[\.\.\.new Set\(\[\.\.\.LEAD_SOURCES, \.\.\.customSources\]\)\];/;
const newStates = `const [customSources, setCustomSources] = useState([]);
    const [customVehicles, setCustomVehicles] = useState([]);
    useEffect(() => {
        if (selectedCompany?._id) {
            try {
                const saved = JSON.parse(localStorage.getItem('leadSources_' + selectedCompany._id));
                if (saved) setCustomSources(saved);
                const savedVehicles = JSON.parse(localStorage.getItem('leadVehicles_' + selectedCompany._id));
                if (savedVehicles) setCustomVehicles(savedVehicles);
            } catch(e) {}
        }
    }, [selectedCompany]);
    
    const ALL_SOURCES = [...new Set([...LEAD_SOURCES, ...customSources])];
    const ALL_VEHICLES = [...new Set([...VEHICLE_OPTIONS, ...customVehicles])];`;
if (customSourcesRegex.test(code)) code = code.replace(customSourcesRegex, newStates);

const vehicleSelectRegex = /<select\s*value=\{formData\.carType\}\s*onChange=\{e => \{\s*const newCar = e\.target\.value;\s*setFormData\(\{\s*\.\.\.formData,\s*carType: newCar,\s*itinerary: formData\.itinerary\.map\(item => \(\{ \.\.\.item, vehicleType: newCar \}\)\)\s*\}\);\s*\}\}\s*style=\{\{ \.\.\.darkInputStyle, cursor: 'pointer' \}\}\s*>\s*\{VEHICLE_OPTIONS\.map\(v => \(\s*<option key=\{v\} value=\{v\} style=\{\{ background: '#090f1d' \}\}>\{v\}<\/option>\s*\)\)\}\s*<\/select>/;
const newVehicleSelect = `<div style={{ display: 'flex', gap: '8px' }}>
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
</div>`;
if (vehicleSelectRegex.test(code)) code = code.replace(vehicleSelectRegex, newVehicleSelect);

code = code.replace(/\{VEHICLE_OPTIONS\.map/g, '{ALL_VEHICLES.map');

// 5. Fix handleOpenModal dates
const dateRegex = /itinerary: \(lead\.itinerary \|\| \[\]\)\.map\(\(d, i\) => \{\s*const rowDate = sDate \? addDaysToDateString\(sDate, i\) : toLocalDateString\(d\.date\);\s*return \{\s*dayNo: d\.dayNo \|\| i \+ 1,\s*date: rowDate \|\| toLocalDateString\(d\.date\),/;
const newDate = `itinerary: (lead.itinerary || []).map((d, i) => {
                    return {
                        dayNo: d.dayNo || i + 1,
                        date: toLocalDateString(d.date),`;
if (dateRegex.test(code)) code = code.replace(dateRegex, newDate);

// 6. Remove amount toggle
const toggleRegex = /\{\/\* Amount Toggle \*\/\}\s*<div style=\{\{\s*display: 'flex',\s*alignItems: 'center',\s*background: 'rgba\(255, 255, 255, 0\.06\)',\s*borderRadius: '8px',\s*padding: '3px',\s*border: '1px solid rgba\(255, 255, 255, 0\.12\)'\s*\}\}>\s*<button[\s\S]*?<\/button>\s*<button[\s\S]*?<\/button>\s*<\/div>/;
if (toggleRegex.test(code)) code = code.replace(toggleRegex, '');

fs.writeFileSync('src/pages/Leads.jsx', code);
