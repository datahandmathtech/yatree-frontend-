import React, { useEffect } from 'react';
import { Building2, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

const BankSelector = ({
    bankAccounts = [],
    value = '',
    amount = '',
    onChange,
    label = "Deduct from Bank / Cash Account",
    placeholder = "Select Bank / Cash Account (Optional)",
    required = false
}) => {
    useEffect(() => {
        if (!value && bankAccounts && bankAccounts.length > 0 && onChange) {
            onChange(bankAccounts[0]._id);
        }
    }, [bankAccounts, value, onChange]);

    const selectedBank = bankAccounts.find(b => String(b._id) === String(value));
    const numAmount = Number(amount) || 0;
    const currentBal = Number(selectedBank?.currentBalance || 0);
    const postDeductBal = currentBal - numAmount;


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Building2 size={14} color="#38bdf8" /> {label}
            </label>

            {bankAccounts.length === 0 ? (
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertCircle size={16} />
                    <span>No active bank accounts found for this company. Please create one in Bank Accounts.</span>
                </div>
            ) : (
                <select
                    className="input-field"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    style={{
                        width: '100%',
                        height: '50px',
                        background: '#0f172a',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        padding: '0 14px',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    <option value="" style={{ background: '#0f172a', color: 'white' }}>{placeholder}</option>
                    {bankAccounts.map(b => (
                        <option key={b._id} value={b._id} style={{ background: '#0f172a', color: 'white' }}>
                            {b.bankName || b.accountName} {b.accountHolder ? `(${b.accountHolder})` : ''} - Balance: ₹{Number(b.currentBalance || 0).toLocaleString()}
                        </option>
                    ))}
                </select>
            )}

            {/* Deduction Preview */}
            {selectedBank && numAmount > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    fontSize: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: '800' }}>
                        <Sparkles size={14} />
                        <span>₹{numAmount.toLocaleString()} will deduct from {selectedBank.bankName}</span>
                    </div>
                    <div style={{ color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>₹{currentBal.toLocaleString()}</span>
                        <ArrowRight size={12} />
                        <span style={{ color: postDeductBal < 0 ? '#f87171' : '#38bdf8' }}>₹{postDeductBal.toLocaleString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankSelector;
