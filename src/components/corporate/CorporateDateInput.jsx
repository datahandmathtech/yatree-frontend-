import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * CorporateDateInput
 * High-performance date picker input with LogKaro dynamic theme support.
 * Automatically opens the native calendar popup when clicked anywhere on the input or on the calendar icon.
 */
const CorporateDateInput = ({
    value,
    onChange,
    label,
    name,
    required = false,
    min,
    max,
    disabled = false,
    placeholder = 'Select date',
    style = {},
    inputStyle = {},
    iconSize = 16,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = ''
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
            // Fallback for older browsers or environments
            inputRef.current?.focus();
        }
    };

    const pad = size === 'sm' ? '6px 10px' : size === 'lg' ? '11px 14px' : '8px 12px';
    const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '14px' : '13px';

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', width: '100%', ...style }} className={className}>
            {label && (
                <label style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#cbd5e1',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span>{label}</span>
                    {required && <span style={{ color: '#f87171' }}>*</span>}
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
                {/* Clickable Calendar Icon trigger */}
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleOpenCalendar}
                    disabled={disabled}
                    title="Open calendar"
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
                    <Calendar size={iconSize} />
                </button>

                {/* HTML5 Date Input */}
                <input
                    ref={inputRef}
                    type="date"
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    required={required}
                    min={min}
                    max={max}
                    disabled={disabled}
                    placeholder={placeholder}
                    onClick={handleOpenCalendar}
                    onFocus={handleOpenCalendar}
                    style={{
                        flex: 1,
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize,
                        fontWeight: '700',
                        padding: pad,
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

export default CorporateDateInput;
