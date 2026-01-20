import React from 'react';
import rmpLogo from '@/assets/logos/rmp-logo.png';
import sqfLogo from '@/assets/logos/sqf-logo.png';
import umfLogo from '@/assets/logos/umf-logo.png';
import halalLogo from '@/assets/logos/halal-logo.png';
import organicLogo from '@/assets/logos/organic-logo.png';
import kosherLogo from '@/assets/logos/kosher-logo.png';
import nzMadeLogo from '@/assets/logos/nz-made-logo.png';
import asurequalityLogo from '@/assets/logos/asurequality-logo.png';

const certifications = [
  { name: 'RMP Certified', logo: rmpLogo },
  { name: 'SQF Certified', logo: sqfLogo },
  { name: 'UMF Certified', logo: umfLogo },
  { name: 'Halal Certified', logo: halalLogo },
  { name: 'Organic Certified', logo: organicLogo },
  { name: 'Kosher Certified', logo: kosherLogo },
  { name: 'NZ Made', logo: nzMadeLogo },
  { name: 'AsureQuality', logo: asurequalityLogo },
];

const CertificationTicker: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-honey-dark via-honey-dark/95 to-honey-dark py-8 overflow-hidden">
      <div className="container mx-auto px-4 mb-4">
        <p className="text-center text-white/60 text-sm font-open uppercase tracking-widest">
          Quality Standards & Certifications We Maintain
        </p>
      </div>
      
      {/* Ticker container */}
      <div className="relative">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-honey-dark to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-honey-dark to-transparent z-10 pointer-events-none"></div>
        
        {/* Scrolling container */}
        <div className="flex animate-ticker">
          {/* First set of logos */}
          {certifications.map((cert, index) => (
            <div
              key={`first-${index}`}
              className="flex-shrink-0 mx-8 flex flex-col items-center justify-center group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-105">
                <img
                  src={cert.logo}
                  alt={cert.name}
                  className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <span className="mt-2 text-white/50 text-xs font-open text-center group-hover:text-white/80 transition-colors">
                {cert.name}
              </span>
            </div>
          ))}
          
          {/* Duplicate set for seamless loop */}
          {certifications.map((cert, index) => (
            <div
              key={`second-${index}`}
              className="flex-shrink-0 mx-8 flex flex-col items-center justify-center group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 group-hover:scale-105">
                <img
                  src={cert.logo}
                  alt={cert.name}
                  className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <span className="mt-2 text-white/50 text-xs font-open text-center group-hover:text-white/80 transition-colors">
                {cert.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CertificationTicker;
