import { forwardRef } from 'react';
import { Mail } from 'lucide-react';
import Input, { InputProps } from './Input';

const EmailInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="email"
        icon={<Mail className="w-5 h-5" />}
        autoComplete="email"
        {...props}
      />
    );
  }
);

EmailInput.displayName = 'EmailInput';

export default EmailInput;
