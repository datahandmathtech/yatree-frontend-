import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * CorporateMonthInput
 * HTML5 month picker with LogKaro theme and showPicker() support.
 * Value format: YYYY-MM (e.g. 2026-10)
 */
const CorporateMonthInput = ({
    value,
    onChange,
    label,
    name,
    disabled = false,
    style = {},
    inputStyle = {}
}) => {
    const { theme } = useTheme();
    const primaryColor = theme?.primary || '#fbbf24';
    const inputRef = useRef(null);

    const handleOpenCalendar = (e) => {
        e?.stopPropagation?.();
        if (disabled) return;
        try {
            if (inputRef.current) {
                if (typeof inputRef.current.showPicker === 'function') {
                    inputRef.current.showPicker();
                } else {
                    inputRef.current.focus();
                }
            }
        } catch (err) {
            inputRef.current?.focus();
        }
    };

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', ...style }}>
            {label && (
                <label style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {label}
                </label>
            )}

            <div
                onClick={handleOpenCalendar}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.borderColor = primaryColor;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${primaryColor}40`;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                    }
                }}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleOpenCalendar}
                    disabled={disabled}
                    title="Open calendar to select month"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: primaryColor,
                        padding: '0 0 0 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        outline: 'none'
                    }}
                >
                    <Calendar size={16} />
                </button>

                <input
                    ref={inputRef}
                    type="month"
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    disabled={disabled}
                    onClick={handleOpenCalendar}
                    onFocus={handleOpenCalendar}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: '700',
                        padding: '7px 10px',
                        outline: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        colorScheme: 'dark',
                        ...inputStyle
                    }}
                />
            </div>
        </div>
    );
};

export default CorporateMonthInput;
