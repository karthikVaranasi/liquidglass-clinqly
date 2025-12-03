import React, { useRef, useState, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const hasCalledOnComplete = useRef(false);

  useEffect(() => {
    // Reset the flag when value changes (user is typing new code)
    if (value.length < length) {
      hasCalledOnComplete.current = false;
    }
    
    // Only call onComplete once when value reaches full length
    if (value.length === length && onComplete && !hasCalledOnComplete.current) {
      hasCalledOnComplete.current = true;
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, newValue: string) => {
    if (disabled) return;

    // Only allow digits
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    const newOTP = value.split('');
    newOTP[index] = newValue;
    const updatedOTP = newOTP.join('').slice(0, length);
    onChange(updatedOTP);

    // Auto-focus next input
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (digits.length > 0) {
      onChange(digits);
      const nextIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          disabled={disabled}
          className={`
            w-12 h-12 text-center text-xl font-semibold
            border-2 rounded-lg transition-all
            focus:outline-none focus:ring-2 focus:ring-[#098289] focus:border-[#098289]
            ${error 
              ? 'border-red-500 bg-red-50' 
              : focusedIndex === index
              ? 'border-[#098289] bg-white'
              : 'border-gray-300 bg-white'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-text'}
          `}
        />
      ))}
    </div>
  );
};

export default OTPInput;

