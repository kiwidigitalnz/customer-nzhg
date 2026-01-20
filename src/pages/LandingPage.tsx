import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart, AlertTriangle, ArrowUpRight, Hexagon, Award, Leaf, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import heroHoney from '@/assets/hero-honey.jpg';
import honeycomb from '@/assets/honeycomb.jpg';
import nzLandscape from '@/assets/nz-landscape.jpg';
import honeyPour from '@/assets/honey-pour.jpg';
import productSpecs from '@/assets/product-specs.jpg';
import qualityApproval from '@/assets/quality-approval.jpg';
import progressTracking from '@/assets/progress-tracking.jpg';
import testimonialPerson from '@/assets/testimonial-person.jpg';
import testimonialMichael from '@/assets/testimonial-michael.jpg';
import testimonialEmma from '@/assets/testimonial-emma.jpg';
import BurgerMenu from '@/components/BurgerMenu';
import CertificationSection from '@/components/CertificationTicker';

const testimonials = [
  {
    id: 1,
    quote: "The customer portal has revolutionized how we manage our honey product approvals. It's intuitive, comprehensive, and has saved us countless hours.",
    name: "Sarah Thompson",
    role: "Export Manager, Canterbury Honey Co.",
    initials: "ST",
    image: testimonialPerson
  },
  {
    id: 2,
    quote: "Working with NZ Honey Group has been seamless. The real-time tracking and approval system gives us complete visibility over our product specifications.",
    name: "Michael Chen",
    role: "Operations Director, Pacific Honey Exports",
    initials: "MC",
    image: testimonialMichael
  },
  {
    id: 3,
    quote: "Outstanding quality control and documentation. Their portal makes compliance and certification management effortless for our international markets.",
    name: "Emma Richardson",
    role: "Quality Assurance Lead, Golden Hive Ltd",
    initials: "ER",
    image: testimonialEmma
  }
];

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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);

  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isPaused) {
      autoPlayInterval.current = setInterval(() => {
        nextTestimonial();
      }, 5000); // Change slide every 5 seconds
    }

    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [isPaused, nextTestimonial]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        nextTestimonial();
      } else {
        prevTestimonial();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <MainLayout>
      <BurgerMenu />
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
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-honey-gold/40 to-honey-amber/30 rounded-lg blur-lg"></div>
                <img 
                  src="/nzhg-logo.png" 
                  alt="NZ Honey Group" 
                  className="relative h-14 md:h-18 lg:h-20 drop-shadow-[0_0_15px_rgba(209,158,67,0.4)]"
                  style={{ filter: 'brightness(1.1) contrast(1.05)' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/240x80/D19E43/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
              <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-honey-gold/50 to-transparent"></div>
              <div className="hidden sm:flex flex-col">
                <span className="text-white/90 font-open text-sm tracking-widest uppercase">Customer Portal</span>
                <span className="text-honey-gold/80 font-open text-xs tracking-wider">Version 2.0</span>
              </div>
            </motion.div>
            <motion.div 
              className="w-20 h-1 bg-honey-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-raleway font-bold text-white leading-tight tracking-tight drop-shadow-lg"
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


      {/* Features Section - Modern Glass Design */}
      <div id="features" className="relative py-24 overflow-hidden">
        {/* Background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-honey-cream via-white to-honey-light/30"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-honey-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-honey-amber/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="melita-container relative z-10">
          <motion.div 
            className="text-center mb-16 max-w-3xl mx-auto"
            {...fadeInUp}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-honey-gold/10 border border-honey-gold/20 text-honey-dark font-medium text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-honey-gold animate-pulse"></span>
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-raleway font-bold text-honey-dark mb-6 tracking-tight">Premium Honey Management</h2>
            <p className="text-lg text-honey-dark/70 font-open max-w-2xl mx-auto">
              Our portal brings together everything you need to manage your honey products with ease and precision
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
            {...staggerContainer}
          >
            {/* Feature Card 1 */}
            <motion.div 
              className="group relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              {...scaleIn}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 z-10 pointer-events-none"></div>
              <div className="h-52 overflow-hidden">
                <img 
                  src={productSpecs} 
                  alt="Product Specifications" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="relative z-20 p-6 -mt-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-honey-gold to-honey-amber flex items-center justify-center shadow-lg mb-4">
                  <FileCheck className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-raleway font-bold mb-3 text-honey-dark">Product Specifications</h3>
                <p className="text-honey-dark/70 font-open text-sm leading-relaxed mb-4">
                  Access and review all your product specifications in one secure location. Download detailed reports and stay informed.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-honey-gold font-semibold text-sm group/link hover:gap-3 transition-all">
                  Learn More <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </a>
              </div>
            </motion.div>
            
            {/* Feature Card 2 */}
            <motion.div 
              className="group relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              {...scaleInDelayed1}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 z-10 pointer-events-none"></div>
              <div className="h-52 overflow-hidden">
                <img 
                  src={qualityApproval} 
                  alt="Quality Approval Lab" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="relative z-20 p-6 -mt-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-honey-gold to-honey-amber flex items-center justify-center shadow-lg mb-4">
                  <Beaker className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-raleway font-bold mb-3 text-honey-dark">Quality Approvals</h3>
                <p className="text-honey-dark/70 font-open text-sm leading-relaxed mb-4">
                  Approve honey specifications and packaging details with an intuitive interface. Provide feedback directly to our team.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-honey-gold font-semibold text-sm group/link hover:gap-3 transition-all">
                  Learn More <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </a>
              </div>
            </motion.div>
            
            {/* Feature Card 3 */}
            <motion.div 
              className="group relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              {...scaleInDelayed2}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 z-10 pointer-events-none"></div>
              <div className="h-52 overflow-hidden">
                <img 
                  src={progressTracking} 
                  alt="Progress Tracking Dashboard" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="relative z-20 p-6 -mt-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-honey-gold to-honey-amber flex items-center justify-center shadow-lg mb-4">
                  <LineChart className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-raleway font-bold mb-3 text-honey-dark">Progress Tracking</h3>
                <p className="text-honey-dark/70 font-open text-sm leading-relaxed mb-4">
                  Monitor the status of your honey products throughout the approval process with real-time updates and notifications.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-honey-gold font-semibold text-sm group/link hover:gap-3 transition-all">
                  Learn More <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </a>
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
              <h3 className="text-lg font-raleway font-semibold mb-2 text-honey-dark">Quality Certified</h3>
              <p className="text-honey-dark/70 font-open">Premium honey products that meet international quality standards</p>
            </motion.div>
            
            <motion.div 
              className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
              {...scaleInDelayed1}
            >
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-raleway font-semibold mb-2 text-honey-dark">Sustainably Sourced</h3>
              <p className="text-honey-dark/70 font-open">Responsibly harvested honey that protects our bees and environment</p>
            </motion.div>
            
            <motion.div 
              className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
              {...scaleInDelayed2}
            >
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-raleway font-semibold mb-2 text-honey-dark">Pure Taste</h3>
              <p className="text-honey-dark/70 font-open">Authentic flavors preserved through careful processing methods</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Certifications Section */}
      <CertificationSection />

      {/* Testimonial Section - Modern Glass Design */}
      <div className="relative py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-honey-cream/50 to-honey-light/30"></div>
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-honey-gold/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="melita-container relative z-10">
          <motion.div 
            className="text-center mb-12"
            {...fadeInUp}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-honey-gold/10 border border-honey-gold/20 text-honey-dark font-medium text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-honey-gold animate-pulse"></span>
              TESTIMONIALS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-raleway font-bold text-honey-dark mb-4 tracking-tight">What Our Clients Say</h2>
            <p className="text-lg text-honey-dark/70 max-w-2xl mx-auto font-open">Trusted by honey producers and exporters worldwide</p>
          </motion.div>
          
          {/* Testimonial Slider - Modern Glass Design */}
          <motion.div 
            className="max-w-4xl mx-auto"
            {...scaleIn}
          >
            <div 
              className="relative rounded-3xl overflow-hidden bg-white/70 backdrop-blur-md border border-white/50 shadow-2xl cursor-grab active:cursor-grabbing"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-honey-gold/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentTestimonial}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="grid grid-cols-1 md:grid-cols-12 relative z-10"
                >
                  {/* Image Section */}
                  <div className="md:col-span-5 relative">
                    <div className="aspect-square md:aspect-auto md:h-full overflow-hidden bg-gradient-to-br from-honey-gold/20 to-honey-amber/20">
                      <img 
                        src={testimonials[currentTestimonial].image}
                        alt={`${testimonials[currentTestimonial].name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">
                    {/* Star rating */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 0L14.6942 8.2918H23.4127L16.3593 13.4164L19.0534 21.7082L12 16.5836L4.94658 21.7082L7.64074 13.4164L0.587322 8.2918H9.30583L12 0Z" fill="#D19E43" />
                        </svg>
                      ))}
                    </div>
                    
                    <blockquote className="text-xl md:text-2xl text-honey-dark/80 mb-8 font-open leading-relaxed">
                      "{testimonials[currentTestimonial].quote}"
                    </blockquote>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-honey-gold to-honey-amber flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{testimonials[currentTestimonial].initials}</span>
                      </div>
                      <div>
                        <p className="font-bold text-honey-dark font-raleway text-lg">{testimonials[currentTestimonial].name}</p>
                        <p className="text-honey-dark/60 font-open">{testimonials[currentTestimonial].role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Navigation Controls - Below the card */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button 
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-honey-gold/20 flex items-center justify-center text-honey-dark hover:bg-honey-gold hover:text-white transition-all shadow-md hover:shadow-lg"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonial(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentTestimonial 
                        ? 'bg-honey-gold w-8' 
                        : 'bg-honey-gold/30 hover:bg-honey-gold/50 w-2'
                    }`}
                    aria-label={`Go to testimonial ${idx + 1}`}
                  />
                ))}
              </div>
              <button 
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-honey-gold/20 flex items-center justify-center text-honey-dark hover:bg-honey-gold hover:text-white transition-all shadow-md hover:shadow-lg"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
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
            <h2 className="text-3xl md:text-4xl font-raleway font-bold text-white mb-4 tracking-tight">Ready to Manage Your Products?</h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6 font-open">
              Sign in to access your personalized customer portal and start managing your honey product approvals today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-white hover:bg-honey-cream text-honey-dark font-medium text-lg px-8 py-5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 rounded-lg">
                <Link to="/login" className="gap-2">
                  Access Customer Portal <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <a 
                href="mailto:support@nzhg.com"
                className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors"
              >
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 rotate-45" />
                </span>
                support@nzhg.com
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
};

export default LandingPage;
