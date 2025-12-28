import React, { forwardRef } from 'react';
import Input, { InputProps } from './Input';

interface NumberInputProps extends Omit<InputProps, 'type'> {
  allowDecimal?: boolean;
  min?: number;
  max?: number;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ allowDecimal = false, min, max, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Allow empty value
      if (value === '') {
        onChange?.(e);
        return;
      }

      // Validate numeric input
      const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

      if (regex.test(value)) {
        const numValue = parseFloat(value);

        // Check min/max constraints
        if (min !== undefined && numValue < min) return;
        if (max !== undefined && numValue > max) return;

        onChange?.(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        onChange={handleChange}
        min={min}
        max={max}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';

export default NumberInput;
