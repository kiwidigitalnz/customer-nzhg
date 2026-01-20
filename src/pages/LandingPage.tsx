import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart, AlertTriangle, ArrowUpRight, Hexagon, Award, Leaf, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import heroHoney from '@/assets/hero-honey.jpg';
import honeycomb from '@/assets/honeycomb.jpg';
import nzLandscape from '@/assets/nz-landscape.jpg';
import honeyPour from '@/assets/honey-pour.jpg';

interface LandingPageProps {
  podioAuthError?: string | null;
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.15 } },
  viewport: { once: true }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }
};

const scaleInDelayed1 = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.15 }
};

const scaleInDelayed2 = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.3 }
};

const LandingPage: React.FC<LandingPageProps> = ({ podioAuthError }) => {
  return (
    <MainLayout>
      {/* Display error banner if there's a Podio auth error */}
      {podioAuthError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700">
              <span className="font-medium">Connection Error:</span> {podioAuthError}
            </p>
          </div>
        </div>
      )}
      
      {/* Hero Section - Enhanced Contrast */}
      <div className="min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background Image with stronger overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroHoney})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div 
            className="max-w-3xl space-y-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              className="flex"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
                <img 
                  src="/nzhg-logo.png" 
                  alt="NZ Honey Group" 
                  className="h-16 md:h-20"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/240x80/D19E43/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
            </motion.div>
            <motion.div 
              className="w-20 h-1 bg-honey-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl hero-heading font-bold text-white leading-tight tracking-tight drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Leading New Zealand's <span className="text-honey-gold drop-shadow-md">Honey</span> Packing Industry
            </motion.h1>
            <motion.p 
              className="text-xl text-white/95 font-open max-w-2xl drop-shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Your gateway to streamlined product approvals, specifications, and quality management through our intuitive customer portal.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Button asChild size="lg" className="bg-honey-gold hover:bg-honey-amber text-white font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border-2 border-honey-gold/50">
                <Link to="/login" className="gap-2">
                  Sign In <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/15 backdrop-blur-sm border-2 border-white/50 text-white hover:bg-white/25 hover:text-white font-semibold shadow-lg">
                <a href="#features" className="gap-2">
                  Discover Features <ArrowUpRight className="h-5 w-5" />
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section - With Images */}
      <div id="features" className="bg-white py-20 relative">
        <div className="melita-container relative z-10">
          <motion.div 
            className="text-center mb-16 max-w-3xl mx-auto"
            {...fadeInUp}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">WHY CHOOSE US</span>
            <div className="melita-accent-bar mx-auto"></div>
            <h2 className="melita-heading mb-4 text-center">Premium Honey Management</h2>
            <p className="melita-subheading mx-auto">
              Our portal brings together everything you need to manage your honey products with ease and precision
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            {...staggerContainer}
          >
            {/* Feature Card 1 */}
            <motion.div className="feature-card group overflow-hidden" {...scaleIn}>
              <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
                <img 
                  src={honeycomb} 
                  alt="Quality Honeycomb" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="feature-card-icon">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-playfair font-semibold mb-3 text-honey-dark">Product Specifications</h3>
              <p className="text-honey-dark/70 font-open">
                Access and review all your product specifications in one secure location. Download detailed reports and stay informed.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-honey-gold font-medium hover:text-honey-dark">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
            
            {/* Feature Card 2 */}
            <motion.div className="feature-card group overflow-hidden" {...scaleInDelayed1}>
              <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
                <img 
                  src={nzLandscape} 
                  alt="New Zealand Landscape" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="feature-card-icon">
                <Beaker className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-playfair font-semibold mb-3 text-honey-dark">Quality Approvals</h3>
              <p className="text-honey-dark/70 font-open">
                Approve honey specifications and packaging details with an intuitive interface. Provide feedback directly to our team.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-honey-gold font-medium hover:text-honey-dark">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
            
            {/* Feature Card 3 */}
            <motion.div className="feature-card group overflow-hidden" {...scaleInDelayed2}>
              <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
                <img 
                  src={honeyPour} 
                  alt="Premium Honey" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="feature-card-icon">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-playfair font-semibold mb-3 text-honey-dark">Progress Tracking</h3>
              <p className="text-honey-dark/70 font-open">
                Monitor the status of your honey products throughout the approval process with real-time updates and notifications.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-honey-gold font-medium hover:text-honey-dark">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Product Values Section - With Background Image */}
      <div className="relative py-20 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: `url(${nzLandscape})` }}
        >
          <div className="absolute inset-0 bg-honey-cream/95"></div>
        </div>
        
        <div className="melita-container relative z-10">
          <motion.div 
            className="text-center mb-12 max-w-3xl mx-auto"
            {...fadeInUp}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">OUR VALUES</span>
            <div className="melita-accent-bar mx-auto"></div>
            <h2 className="melita-heading mb-4 text-center">The Purest Honey Standards</h2>
            <p className="melita-subheading mx-auto">
              We maintain the highest quality standards throughout our production process
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto"
            {...staggerContainer}
          >
            <motion.div 
              className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
              {...scaleIn}
            >
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Quality Certified</h3>
              <p className="text-honey-dark/70 font-open">Premium honey products that meet international quality standards</p>
            </motion.div>
            
            <motion.div 
              className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
              {...scaleInDelayed1}
            >
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Sustainably Sourced</h3>
              <p className="text-honey-dark/70 font-open">Responsibly harvested honey that protects our bees and environment</p>
            </motion.div>
            
            <motion.div 
              className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
              {...scaleInDelayed2}
            >
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Pure Taste</h3>
              <p className="text-honey-dark/70 font-open">Authentic flavors preserved through careful processing methods</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Testimonial Section - With Image */}
      <div className="bg-white py-14">
        <div className="melita-container">
          <motion.div 
            className="flex flex-col items-center text-center mb-10"
            {...fadeInUp}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">TESTIMONIALS</span>
            <div className="melita-accent-bar"></div>
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-honey-dark mb-2 tracking-tight">What Our Clients Say</h2>
            <p className="text-lg text-honey-dark/70 max-w-2xl font-open">Trusted by honey producers and exporters worldwide</p>
          </motion.div>
          
          {/* Testimonial Card */}
          <motion.div 
            className="max-w-3xl mx-auto testimonial-card"
            {...scaleIn}
          >
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-4 testimonial-image p-4 flex items-center justify-center">
                <img 
                  src={honeyPour}
                  alt="Premium Honey Production"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-center">
                <div className="mb-4">
                  {/* Star rating */}
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0L14.6942 8.2918H23.4127L16.3593 13.4164L19.0534 21.7082L12 16.5836L4.94658 21.7082L7.64074 13.4164L0.587322 8.2918H9.30583L12 0Z" fill="#D19E43" />
                      </svg>
                    ))}
                  </div>
                </div>
                <blockquote className="text-lg italic text-honey-dark/80 mb-4 font-open">"The customer portal has revolutionized how we manage our honey product approvals. It's intuitive, comprehensive, and has saved us countless hours."</blockquote>
                <div>
                  <p className="font-semibold text-honey-dark font-playfair">Sarah Thompson</p>
                  <p className="text-honey-dark/70 font-open text-sm">Export Manager, Canterbury Honey Co.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CTA Section - With Background Image */}
      <motion.div 
        className="relative py-20 overflow-hidden"
        {...fadeInUp}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${honeycomb})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-honey-gold/95 via-honey-amber/90 to-honey-gold/95"></div>
        </div>
        
        <div className="melita-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4 tracking-tight">Ready to Manage Your Products?</h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6 font-open">
              Sign in to access your personalized customer portal and start managing your honey product approvals today.
            </p>
            <Button asChild size="lg" className="bg-white hover:bg-honey-cream text-honey-dark font-medium text-lg px-8 py-5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 rounded-lg">
              <Link to="/login" className="gap-2">
                Access Customer Portal <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
};

export default LandingPage;
