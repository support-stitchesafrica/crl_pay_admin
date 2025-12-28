import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import Input, { InputProps } from './Input';

const DateInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        icon={<Calendar className="w-5 h-5" />}
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';

export default DateInput;
