const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'EventManagement.jsx');
let content = fs.readFileSync(filePath, 'utf8');
const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';

// 1. Remove old modal and states, inject new state
const oldStateStart = 'const [configuringVehicle, setConfiguringVehicle] = useState(null);';
const oldStateEnd = 'const [tempVehicleRate, setTempVehicleRate] = useState({ baseRate: \'\', baseKms: \'\', baseHours: \'\', extraKmRate: \'\', extraHourRate: \'\', driverAllowance: \'\' });';

if (content.includes(oldStateStart)) {
    content = content.replace(oldStateStart, 'const [pricingStep, setPricingStep] = useState(1);');
    content = content.replace(oldStateEnd, '');
    console.log('1. Replaced states with pricingStep.');
}

// Remove the old CONFIGURE VEHICLE PRICING MODAL
const modalStartStr = '{/* ═══ CONFIGURE VEHICLE PRICING MODAL ═══ */}';
const modalIdx = content.indexOf(modalStartStr);
if (modalIdx !== -1) {
    const nextAnimatePresenceIdx = content.indexOf('</AnimatePresence>', modalIdx);
    if (nextAnimatePresenceIdx !== -1) {
        content = content.slice(0, modalIdx) + content.slice(nextAnimatePresenceIdx + '</AnimatePresence>'.length);
        console.log('2. Removed old modal.');
    }
}

// 2. Revert the chip onClick behavior
const chipRegex = /<button[\s\S]*?key=\{sub\}[\s\S]*?type="button"[\s\S]*?onClick=\{.*?\}[\s\S]*?style=\{.*?\}[\s\S]*?>[\s\S]*?\{isChecked[\s\S]*?<\/button>/m;
const newChipUI = `<button
                                                                            key={sub}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                let updated = [...selectedSubTypes];
                                                                                if (!isChecked) {
                                                                                    updated.push(key);
                                                                                    setMultiRateCardsData({
                                                                                        ...multiRateCardsData,
                                                                                        [key]: { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }
                                                                                    });
                                                                                } else {
                                                                                    updated = updated.filter(k => k !== key);
                                                                                    const newMultiData = { ...multiRateCardsData };
                                                                                    delete newMultiData[key];
                                                                                    setMultiRateCardsData(newMultiData);
                                                                                }
                                                                                setSelectedSubTypes(updated);
                                                                            }}
                                                                            style={{
                                                                                padding: '8px 16px',
                                                                                borderRadius: '100px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '700',
                                                                                border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                                                                background: isChecked ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                color: isChecked ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                boxShadow: isChecked ? '0 4px 12px rgba(251, 191, 36, 0.2)' : 'none'
                                                                            }}
                                                                        >
                                                                            {isChecked && <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}><Check size={10} strokeWidth={4} /></div>}
                                                                            {sub}
                                                                            {isChecked && multiRateCardsData[key]?.baseRate && <span style={{ marginLeft: '4px', background: 'var(--primary)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '900' }}>₹{multiRateCardsData[key].baseRate}</span>}
                                                                        </button>`;
if (chipRegex.test(content)) {
    content = content.replace(chipRegex, newChipUI.replace(/\n/g, lineEnding));
    console.log('3. Reverted chip onClick behavior.');
}

// 3. Wrap Step 1 UI and inject Step 2 UI + Next Buttons
const formBodyStart = '<div className="form-grid-2" style={{ gap: \'20px\' }}>';
const formButtonsStr = '<div style={{ marginTop: \'20px\', display: \'flex\', gap: \'10px\', justifyContent: \'flex-end\' }}>\r\n                                        <button type="button" onClick={() => { setIsRateFormOpen(false); setRateCardFormData({ serviceName: \'\', vehicleType: \'\', baseRate: \'\', baseKms: \'\', baseHours: \'\', extraKmRate: \'\', extraHourRate: \'\', driverAllowance: \'\' }); setSelectedSubTypes([]); setMultiRateCardsData({}); }} className="secondary-btn" style={{ height: \'40px\', background: \'rgba(255,255,255,0.05)\' }}>Cancel</button>\r\n                                        <button type="submit" className="primary-btn" style={{ height: \'40px\' }}>\r\n                                            <Save size={16} /> {rateCardFormData._id ? \'Update Rate\' : \'Save Rate\'}\r\n                                        </button>\r\n                                    </div>';

// Using flexible matching for the buttons
const buttonFindIdx = content.indexOf('<button type="button" onClick={() => { setIsRateFormOpen(false);');
if (content.includes(formBodyStart) && buttonFindIdx !== -1) {
    const wrapStart = '<div style={{ display: pricingStep === 1 ? \'block\' : \'none\' }}>\n' + formBodyStart;
    content = content.replace(formBodyStart, wrapStart);
    
    // Find where the buttons div starts
    let btnDivStart = content.lastIndexOf('<div', buttonFindIdx);
    let formEndTagIdx = content.indexOf('</motion.form>', buttonFindIdx);
    
    const step2AndButtons = `
                                    </div> {/* Close Step 1 Div */}

                                    <AnimatePresence>
                                        {pricingStep === 2 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></div>
                                                    Bulk Pricing Configuration
                                                </h3>
                                                <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'white', fontSize: '13px' }}>
                                                        <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                            <tr>
                                                                <th style={{ padding: '16px', fontWeight: '800', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Vehicle Model</th>
                                                                <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Base Rate (₹)*</th>
                                                                {!isPDService(rateCardFormData.serviceName) && (
                                                                    <>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Limit KMs</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Limit Hrs</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Extra /KM (₹)</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Extra /Hr (₹)</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Driver Allow.</th>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedSubTypes.map((key, index) => {
                                                                const [type, model] = key.split('|');
                                                                const isPD = isPDService(rateCardFormData.serviceName);
                                                                return (
                                                                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}>
                                                                        <td style={{ padding: '12px 16px', fontWeight: '700' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontSize: '14px' }}>{model}</span>
                                                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{type}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px' }}>
                                                                            <input autoFocus={index === 0} required type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseRate: e.target.value } })} style={{ width: '100%', minWidth: '100px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                        </td>
                                                                        {!isPD && (
                                                                            <>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseKms || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseKms: e.target.value } })} style={{ width: '100%', minWidth: '80px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseHours || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseHours: e.target.value } })} style={{ width: '100%', minWidth: '80px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.extraKmRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], extraKmRate: e.target.value } })} style={{ width: '100%', minWidth: '90px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.extraHourRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], extraHourRate: e.target.value } })} style={{ width: '100%', minWidth: '90px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.driverAllowance || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], driverAllowance: e.target.value } })} style={{ width: '100%', minWidth: '100px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {pricingStep === 1 ? (
                                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                            <button type="button" onClick={() => { setIsRateFormOpen(false); setPricingStep(1); setRateCardFormData({ serviceName: '', vehicleType: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); setSelectedSubTypes([]); setMultiRateCardsData({}); }} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                                            <button type="button" onClick={() => {
                                                if (!rateCardFormData.serviceName) { alert('Please enter Service Name'); return; }
                                                if (selectedSubTypes.length === 0) { alert('Please select at least one vehicle category'); return; }
                                                setPricingStep(2);
                                            }} className="primary-btn" style={{ height: '48px', padding: '0 32px', fontSize: '15px' }}>
                                                Next: Configure Pricing <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                            <button type="button" onClick={() => setPricingStep(1)} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Selection</button>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <button type="button" onClick={() => { setIsRateFormOpen(false); setPricingStep(1); setRateCardFormData({ serviceName: '', vehicleType: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); setSelectedSubTypes([]); setMultiRateCardsData({}); }} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                                                <button type="submit" className="primary-btn" style={{ height: '48px', padding: '0 32px', fontSize: '15px' }}>
                                                    <Save size={18} /> {rateCardFormData._id ? 'Update Rates' : 'Save All Rates'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
`;
    content = content.slice(0, btnDivStart) + step2AndButtons.replace(/\n/g, lineEnding) + content.slice(formEndTagIdx);
    console.log('4. Added Step 2 Table UI and Smart Buttons.');
}

// Ensure "setIsRateFormOpen(true);" also resets pricingStep to 1 everywhere
content = content.replace(/setIsRateFormOpen\(true\);/g, 'setIsRateFormOpen(true); setPricingStep(1);');

fs.writeFileSync(filePath, content, 'utf8');
console.log('EventManagement.jsx successfully updated to 2-Step Bulk Pricing Wizard!');
