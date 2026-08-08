const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'EventManagement.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add VEHICLE_SUB_CATEGORIES at the top
const constantsReplacement = `const renderTime = (t) => {`;
const constantsAddition = `const VEHICLE_SUB_CATEGORIES = {
    Sedan: ['Compact Sedan', 'Luxury Sedan'],
    SUV: ['Ertiga', 'Innova', 'Crysta', 'Fortuner'],
    Tempo: ['12 Seater', '17 Seater', 'Urbania 12 Seater', 'Urbania 17 Seater'],
    Bus: ['21 Seater', '27 Seater', '35 Seater', '41 Seater', '45 Seater', '52 Seater', 'Volvo']
};

const renderTime = (t) => {`;
if (content.includes(constantsReplacement) && !content.includes('VEHICLE_SUB_CATEGORIES')) {
    content = content.replace(constantsReplacement, constantsAddition);
}

// 2. Add State Variables
const stateTarget = `    const [multiRateCardsData, setMultiRateCardsData] = useState({});`;
const stateAddition = `    const [multiRateCardsData, setMultiRateCardsData] = useState({});
    const [showPDFCustomizerModal, setShowPDFCustomizerModal] = useState(false);
    const [pdfCustomizerData, setPdfCustomizerData] = useState({ includeCategories: [], customColumns: [] });
    const [selectedSubTypes, setSelectedSubTypes] = useState({});`;
if (content.includes(stateTarget) && !content.includes('showPDFCustomizerModal')) {
    content = content.replace(stateTarget, stateAddition);
}

// 3. Modify handleSaveRateCard
const saveRateCardTarget = `                const promises = selectedVehicleTypes.map(type => {
                    const data = multiRateCardsData[type];
                    const payload = {
                        serviceName: rateCardFormData.serviceName,
                        vehicleType: type,
                        baseRate: data.baseRate,
                        baseKms: data.baseKms,
                        baseHours: data.baseHours,
                        extraKmRate: data.extraKmRate,
                        extraHourRate: data.extraHourRate,
                        driverAllowance: data.driverAllowance
                    };
                    return axios.post(\`/api/admin/events/\${selectedEventForRates._id}/ratecard\`, payload, config);
                });
                await Promise.all(promises);`;

const saveRateCardReplacement = `                const promises = [];
                selectedVehicleTypes.forEach(type => {
                    const subTypes = selectedSubTypes[type] || [type];
                    subTypes.forEach(subType => {
                        const data = multiRateCardsData[subType];
                        if (data) {
                            const payload = {
                                serviceName: rateCardFormData.serviceName,
                                vehicleType: type,
                                vehicleModel: subType !== type ? subType : '',
                                baseRate: data.baseRate,
                                baseKms: data.baseKms,
                                baseHours: data.baseHours,
                                extraKmRate: data.extraKmRate,
                                extraHourRate: data.extraHourRate,
                                driverAllowance: data.driverAllowance
                            };
                            promises.push(axios.post(\`/api/admin/events/\${selectedEventForRates._id}/ratecard\`, payload, config));
                        }
                    });
                });
                await Promise.all(promises);`;

if (content.includes(saveRateCardTarget)) {
    content = content.replace(saveRateCardTarget, saveRateCardReplacement);
}

// 4. Modify The Rate Form (Checkbox generation and rate inputs)
const formTarget = `                                {!rateCardFormData._id && selectedVehicleTypes.map(type => (
                                    <div key={type} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px', marginTop: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                        <h4 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                            Pricing for {type === 'Tempo' ? 'Tempo Traveller' : type}
                                        </h4>
                                        <div className="form-grid-3">
                                            <div className="input-group">
                                                <label className="label-text">Base Rate (₹) *</label>
                                                <input required type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.baseRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], baseRate: e.target.value } })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Base Limit KMs</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.baseKms || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], baseKms: e.target.value } })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Base Limit Hours</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.baseHours || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], baseHours: e.target.value } })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Extra Rate / KM (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.extraKmRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], extraKmRate: e.target.value } })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Extra Rate / Hr (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.extraHourRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], extraHourRate: e.target.value } })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Driver Allowance (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[type]?.driverAllowance || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [type]: { ...multiRateCardsData[type], driverAllowance: e.target.value } })} />
                                            </div>
                                        </div>
                                    </div>
                                ))}`;

const formReplacement = `                                {!rateCardFormData._id && selectedVehicleTypes.map(type => {
                                    const subTypes = selectedSubTypes[type] || [type];
                                    return subTypes.map(subType => {
                                        const isPD = rateCardFormData.serviceName && rateCardFormData.serviceName.includes('P/D');
                                        return (
                                            <div key={subType} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px', marginTop: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                                <h4 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                    Pricing for {subType === 'Tempo' ? 'Tempo Traveller' : subType}
                                                </h4>
                                                <div className="form-grid-3">
                                                    <div className="input-group">
                                                        <label className="label-text">Base Rate (₹) *</label>
                                                        <input required type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.baseRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], baseRate: e.target.value } })} />
                                                    </div>
                                                    {!isPD && (
                                                        <>
                                                            <div className="input-group">
                                                                <label className="label-text">Base Limit KMs</label>
                                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.baseKms || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], baseKms: e.target.value } })} />
                                                            </div>
                                                            <div className="input-group">
                                                                <label className="label-text">Base Limit Hours</label>
                                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.baseHours || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], baseHours: e.target.value } })} />
                                                            </div>
                                                            <div className="input-group">
                                                                <label className="label-text">Extra Rate / KM (₹)</label>
                                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.extraKmRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], extraKmRate: e.target.value } })} />
                                                            </div>
                                                            <div className="input-group">
                                                                <label className="label-text">Extra Rate / Hr (₹)</label>
                                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.extraHourRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], extraHourRate: e.target.value } })} />
                                                            </div>
                                                            <div className="input-group">
                                                                <label className="label-text">Driver Allowance (₹)</label>
                                                                <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[subType]?.driverAllowance || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [subType]: { ...multiRateCardsData[subType], driverAllowance: e.target.value } })} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })}`;

if (content.includes(formTarget)) {
    content = content.replace(formTarget, formReplacement);
}

// 5. Hide the extra fields for P/D in EDIT mode too
const editFormTarget = `                                            <div className="input-group">
                                                <label className="label-text">Base Rate (₹) *</label>
                                                <input required type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseRate: e.target.value })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Base Limit KMs</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseKms} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseKms: e.target.value })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Base Limit Hours</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseHours} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseHours: e.target.value })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Extra Rate / KM (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraKmRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraKmRate: e.target.value })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Extra Rate / Hr (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraHourRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraHourRate: e.target.value })} />
                                            </div>
                                            <div className="input-group">
                                                <label className="label-text">Driver Allowance (₹)</label>
                                                <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.driverAllowance} onChange={(e) => setRateCardFormData({ ...rateCardFormData, driverAllowance: e.target.value })} />
                                            </div>`;

const editFormReplacement = `                                            <div className="input-group">
                                                <label className="label-text">Base Rate (₹) *</label>
                                                <input required type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseRate: e.target.value })} />
                                            </div>
                                            {!(rateCardFormData.serviceName && rateCardFormData.serviceName.includes('P/D')) && (
                                                <>
                                                    <div className="input-group">
                                                        <label className="label-text">Base Limit KMs</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseKms} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseKms: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Base Limit Hours</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseHours} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseHours: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Extra Rate / KM (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraKmRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraKmRate: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Extra Rate / Hr (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraHourRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraHourRate: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Driver Allowance (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.driverAllowance} onChange={(e) => setRateCardFormData({ ...rateCardFormData, driverAllowance: e.target.value })} />
                                                    </div>
                                                </>
                                            )}`;

if (content.includes(editFormTarget)) {
    content = content.replace(editFormTarget, editFormReplacement);
}

// 6. Sub Types Checkbox Group
const checkboxTarget = `                                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '10px 15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                                {['Sedan', 'SUV', 'Bus', 'Tempo'].map(type => (
                                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                                            checked={selectedVehicleTypes.includes(type)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedVehicleTypes([...selectedVehicleTypes, type]);
                                                                    setMultiRateCardsData({ ...multiRateCardsData, [type]: { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' } });
                                                                } else {
                                                                    setSelectedVehicleTypes(selectedVehicleTypes.filter(t => t !== type));
                                                                    const newData = { ...multiRateCardsData };
                                                                    delete newData[type];
                                                                    setMultiRateCardsData(newData);
                                                                }
                                                            }}
                                                        />
                                                        {type === 'Tempo' ? 'Tempo Traveller' : type}
                                                    </label>
                                                ))}
                                            </div>`;

const checkboxReplacement = `                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                    {['Sedan', 'SUV', 'Bus', 'Tempo'].map(type => (
                                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                                                checked={selectedVehicleTypes.includes(type)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedVehicleTypes([...selectedVehicleTypes, type]);
                                                                        if (VEHICLE_SUB_CATEGORIES[type]) {
                                                                            setSelectedSubTypes({ ...selectedSubTypes, [type]: VEHICLE_SUB_CATEGORIES[type] });
                                                                            const newMulti = { ...multiRateCardsData };
                                                                            VEHICLE_SUB_CATEGORIES[type].forEach(sub => {
                                                                                newMulti[sub] = { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' };
                                                                            });
                                                                            setMultiRateCardsData(newMulti);
                                                                        } else {
                                                                            setMultiRateCardsData({ ...multiRateCardsData, [type]: { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' } });
                                                                        }
                                                                    } else {
                                                                        setSelectedVehicleTypes(selectedVehicleTypes.filter(t => t !== type));
                                                                        const newData = { ...multiRateCardsData };
                                                                        if (VEHICLE_SUB_CATEGORIES[type]) {
                                                                            VEHICLE_SUB_CATEGORIES[type].forEach(sub => delete newData[sub]);
                                                                        } else {
                                                                            delete newData[type];
                                                                        }
                                                                        setMultiRateCardsData(newData);
                                                                        const newSub = { ...selectedSubTypes };
                                                                        delete newSub[type];
                                                                        setSelectedSubTypes(newSub);
                                                                    }
                                                                }}
                                                            />
                                                            {type === 'Tempo' ? 'Tempo Traveller' : type}
                                                        </label>
                                                    ))}
                                                </div>
                                                
                                                {/* Sub-categories */}
                                                {selectedVehicleTypes.map(type => {
                                                    if (!VEHICLE_SUB_CATEGORIES[type]) return null;
                                                    return (
                                                        <div key={\`sub-\${type}\`} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 'bold' }}>{type === 'Tempo' ? 'Tempo Traveller' : type} Options:</div>
                                                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                                {VEHICLE_SUB_CATEGORIES[type].map(sub => (
                                                                    <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', cursor: 'pointer', fontSize: '13px' }}>
                                                                        <input 
                                                                            type="checkbox"
                                                                            style={{ accentColor: 'var(--primary)' }}
                                                                            checked={selectedSubTypes[type]?.includes(sub) || false}
                                                                            onChange={(e) => {
                                                                                const currentSubs = selectedSubTypes[type] || [];
                                                                                if (e.target.checked) {
                                                                                    setSelectedSubTypes({ ...selectedSubTypes, [type]: [...currentSubs, sub] });
                                                                                    setMultiRateCardsData({ ...multiRateCardsData, [sub]: { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' } });
                                                                                } else {
                                                                                    setSelectedSubTypes({ ...selectedSubTypes, [type]: currentSubs.filter(s => s !== sub) });
                                                                                    const newData = { ...multiRateCardsData };
                                                                                    delete newData[sub];
                                                                                    setMultiRateCardsData(newData);
                                                                                }
                                                                            }}
                                                                        />
                                                                        {sub}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>`;

if (content.includes(checkboxTarget)) {
    content = content.replace(checkboxTarget, checkboxReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update Script Applied Successfully.');
