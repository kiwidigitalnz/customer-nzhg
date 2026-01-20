import React from 'react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import rmpLogo from '@/assets/logos/rmp-logo.png';
import sqfLogo from '@/assets/logos/sqf-logo.png';
import umfLogo from '@/assets/logos/umf-logo.png';
import halalLogo from '@/assets/logos/halal-logo.png';
import organicLogo from '@/assets/logos/organic-logo.png';
import kosherLogo from '@/assets/logos/kosher-logo.png';
import nzMadeLogo from '@/assets/logos/nz-made-logo.png';
import asurequalityLogo from '@/assets/logos/asurequality-logo.png';

const certifications = [
  { 
    name: 'RMP Certified', 
    logo: rmpLogo,
    description: 'Risk Management Programme – A mandatory food safety program under NZ law, verified by the Ministry for Primary Industries (MPI) for all honey processing and export operations.'
  },
  { 
    name: 'SQF Certified', 
    logo: sqfLogo,
    description: 'Safe Quality Food – A globally recognized food safety and quality certification meeting rigorous international retail and supply chain standards.'
  },
  { 
    name: 'UMF Certified', 
    logo: umfLogo,
    description: 'Unique Manuka Factor – The gold standard for Manuka honey, independently verifying potency (MGO), authenticity (Leptosperin), and freshness.'
  },
  { 
    name: 'Halal Certified', 
    logo: halalLogo,
    description: 'Halal Certification – Ensures products are permissible under Islamic dietary laws, essential for export to Middle Eastern and Southeast Asian markets.'
  },
  { 
    name: 'Organic Certified', 
    logo: organicLogo,
    description: 'BioGro Organic – Verified organic production without synthetic chemicals or antibiotics, following strict land management and beekeeping standards.'
  },
  { 
    name: 'Kosher Certified', 
    logo: kosherLogo,
    description: 'Kosher Certification – Meets Jewish dietary requirements, verified by rabbinical authorities for international market access.'
  },
  { 
    name: 'NZ Made', 
    logo: nzMadeLogo,
    description: 'Buy NZ Made – Proudly New Zealand made and packed, guaranteeing authentic origin from our pristine environment.'
  },
  { 
    name: 'AsureQuality', 
    logo: asurequalityLogo,
    description: 'AsureQuality Certified – Independent NZ auditing and verification services ensuring food safety, traceability, and quality standards.'
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const CertificationSection: React.FC = () => {
  return (
    <div className="relative py-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-honey-cream/50 via-white to-honey-cream/30"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-honey-gold/10 border border-honey-gold/20 text-honey-dark font-medium text-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-honey-gold"></span>
            QUALITY ASSURANCE
          </span>
          <h2 className="text-2xl md:text-3xl font-playfair font-bold text-honey-dark mb-3">
            Certified Excellence
          </h2>
          <p className="text-honey-dark/60 font-open max-w-xl mx-auto">
            We maintain the highest quality standards and certifications in the industry
          </p>
        </motion.div>
        
        {/* Certification Grid */}
        <TooltipProvider delayDuration={200}>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-6 max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative bg-white rounded-2xl p-4 shadow-sm border border-honey-light/50 hover:shadow-lg hover:border-honey-gold/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      {/* Logo Container */}
                      <div className="aspect-square flex items-center justify-center p-2 mb-3">
                        <img
                          src={cert.logo}
                          alt={cert.name}
                          className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      {/* Label */}
                      <p className="text-center text-xs font-medium text-honey-dark/70 group-hover:text-honey-dark transition-colors leading-tight">
                        {cert.name}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="max-w-xs bg-honey-dark text-white border-honey-dark p-4 rounded-xl shadow-xl"
                  >
                    <p className="font-semibold text-honey-gold mb-1">{cert.name}</p>
                    <p className="text-sm text-white/90 leading-relaxed">{cert.description}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </motion.div>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default CertificationSection;
