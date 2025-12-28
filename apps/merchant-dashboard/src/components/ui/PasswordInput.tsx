import { forwardRef, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Input, { InputProps } from './Input';

const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'icon'>>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          icon={<Lock className="w-5 h-5" />}
          autoComplete="current-password"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[38px] transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
