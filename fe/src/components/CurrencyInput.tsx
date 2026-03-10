import React, { useState, useEffect } from 'react';
import { parseAmountInput } from '../utils/formatters';
import { useTranslation } from 'react-i18next';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = '0',
  className = 'w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition',
}: CurrencyInputProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'id-ID';

  const [display, setDisplay] = useState(() => 
    value ? new Intl.NumberFormat(locale).format(value) : ''
  );

  useEffect(() => {
    // Synchronize if value is reset from outside
    if (value === 0 && display !== '') {
      setDisplay('');
    } else if (value !== 0) {
      const parsed = parseAmountInput(display);
      if (parsed.numeric !== value) {
        setDisplay(new Intl.NumberFormat(locale).format(value));
      }
    }
  }, [value, locale]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAmountInput(e.target.value);
    setDisplay(parsed.display);
    onChange(parsed.numeric);
  };

  return (
    <div>
      {label && <label className="text-xs text-dark-muted font-medium mb-2 block">{label}</label>}
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
