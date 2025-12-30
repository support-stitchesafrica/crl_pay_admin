import { forwardRef, useState } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  format: string;
}

const countries: Country[] = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', format: '### ### ####' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233', format: '## ### ####' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254', format: '### ######' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27', format: '## ### ####' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', format: '(###) ###-####' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', format: '#### ######' },
];

export interface PhoneInputProps {
  label?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, name, value, onChange, placeholder, required, disabled, error }, ref) => {
    const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setIsDropdownOpen(false);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Combine country code with phone number for the value
      const phoneNumber = e.target.value;
      const fullNumber = phoneNumber ? `${selectedCountry.dialCode} ${phoneNumber}` : '';

      onChange({
        ...e,
        target: {
          ...e.target,
          name,
          value: fullNumber,
        },
      });
    };

    // Extract just the phone number part (without country code) for display
    const displayValue = value ? value.replace(selectedCountry.dialCode, '').trim() : '';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Country Selector Inside Input */}
          <div className="absolute inset-y-0 left-0 flex items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled}
                className="h-full pl-3 pr-2 flex items-center gap-1.5 hover:bg-gray-50
                         disabled:cursor-not-allowed transition-colors border-r border-gray-300"
              >
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-300
                                rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center
                                 gap-3 transition-colors ${selectedCountry.code === country.code ? 'bg-blue-50' : ''}`}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{country.name}</div>
                        </div>
                        <div className="text-sm text-gray-500">{country.dialCode}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Phone Number Input */}
          <input
            ref={ref}
            id={name}
            name={name}
            type="tel"
            value={displayValue}
            onChange={handlePhoneChange}
            placeholder={placeholder || selectedCountry.format.replace(/#/g, '0').substring(0, 15)}
            required={required}
            disabled={disabled}
            className={`
              w-full pl-32 pr-10 py-2.5 border rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-colors text-sm
              ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
            `}
          />

          {/* Phone Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Phone className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
