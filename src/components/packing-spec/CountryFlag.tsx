
import React from 'react';
import { Badge } from '@/components/ui/badge';

// Map of country codes for common countries
const COUNTRY_CODES: Record<string, string> = {
  'Australia': 'au',
  'New Zealand': 'nz',
  'China': 'cn',
  'United States': 'us',
  'USA': 'us',
  'UK': 'gb',
  'United Kingdom': 'gb',
  'Canada': 'ca',
  'Japan': 'jp',
  'South Korea': 'kr',
  'Korea': 'kr',
  'Singapore': 'sg',
  'Malaysia': 'my',
  'India': 'in',
  'Indonesia': 'id',
  'Thailand': 'th',
  'Vietnam': 'vn',
  'Philippines': 'ph',
  'Germany': 'de',
  'France': 'fr',
  'Italy': 'it',
  'Spain': 'es',
  'Netherlands': 'nl',
  'Belgium': 'be',
  'Switzerland': 'ch',
  'Sweden': 'se',
  'Norway': 'no',
  'Denmark': 'dk',
  'Finland': 'fi',
  'Russia': 'ru',
  'Brazil': 'br',
  'Mexico': 'mx',
  'South Africa': 'za',
  'UAE': 'ae',
  'United Arab Emirates': 'ae',
  'Saudi Arabia': 'sa',
  'Taiwan': 'tw',
  'Hong Kong': 'hk',
};

interface CountryFlagProps {
  country: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | null;
  bgColor?: string;
}

const CountryFlag: React.FC<CountryFlagProps> = ({ 
  country, 
  variant = 'outline',
  bgColor = 'bg-blue-50'
}) => {
  if (!country) return null;
  
  const countryCode = COUNTRY_CODES[country.trim()] || '';
  
  return (
    <Badge 
      variant={variant} 
      className={`${bgColor} text-sm font-medium flex items-center gap-1.5`}
    >
      {countryCode && (
        <span className="inline-block w-4 h-3 relative">
          <img 
            src={`https://flagcdn.com/w20/${countryCode}.png`} 
            alt={`${country} flag`}
            className="absolute top-0 left-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </span>
      )}
      {country.trim()}
    </Badge>
  );
};

interface CountryFlagsListProps {
  countries: string | string[];
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | null;
  bgColor?: string;
}

export const CountryFlagsList: React.FC<CountryFlagsListProps> = ({ 
  countries, 
  variant = 'outline',
  bgColor = 'bg-blue-50'
}) => {
  if (!countries) return null;
  
  const countriesArray = Array.isArray(countries) 
    ? countries 
    : countries.split(/[\/,;]\s*/);
  
  return (
    <div className="flex flex-wrap gap-2">
      {countriesArray.map((country, index) => (
        <CountryFlag 
          key={index} 
          country={country.trim()} 
          variant={variant}
          bgColor={bgColor}
        />
      ))}
    </div>
  );
};

export default CountryFlag;
