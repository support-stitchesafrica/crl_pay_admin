import { forwardRef } from 'react';
import { Phone } from 'lucide-react';
import Input, { InputProps } from './Input';

const PhoneInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        icon={<Phone className="w-5 h-5" />}
        autoComplete="tel"
        placeholder="+234 800 000 0000"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
