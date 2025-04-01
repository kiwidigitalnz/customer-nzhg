import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart, AlertTriangle, ArrowUpRight, Hexagon, Award, Leaf, Coffee } from 'lucide-react';

interface LandingPageProps {
  podioAuthError?: string | null; // Make this prop optional
}

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
      
      {/* Hero Section - Melita Honey inspired */}
      <div className="relative overflow-hidden min-h-[90vh] flex items-center bg-honey-light border-b border-honey-amber/20">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-honey-gold/5 rounded-full mix-blend-multiply blur-3xl opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-honey-amber/5 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          
          {/* Enhanced hexagon pattern elements - made more subtle */}
          <div className="absolute opacity-3">
            {Array(10).fill(0).map((_, i) => (
              <Hexagon 
                key={i} 
                className="absolute text-honey-amber/10" 
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.2,
                  transform: `scale(${0.5 + Math.random() * 1.5}) rotate(${Math.random() * 90}deg)`,
                }}
                size={30 + Math.random() * 50}
              />
            ))}
          </div>
          
          {/* Decorative grid pattern - made more subtle */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block">
                <img 
                  src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" 
                  alt="NZ Honey Group" 
                  className="h-20 mb-6"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/240x80/D19E43/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
              <div className="melita-accent-bar"></div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl hero-heading font-bold text-honey-dark leading-tight tracking-tight">
                Leading New Zealand's <span className="text-gradient-primary">Honey</span> Packing Industry
              </h1>
              <p className="text-xl text-honey-dark/80 font-open max-w-xl">
                Your gateway to streamlined product approvals, specifications, and quality management through our intuitive customer portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="melita-btn-primary">
                  <Link to="/login" className="gap-2">
                    Sign In <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="melita-btn-secondary">
                  <a href="#features" className="gap-2">
                    Discover Features <ArrowUpRight className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="relative p-4">
                {/* Multiple layered card effect */}
                <div className="absolute inset-0 bg-white/50 rounded-3xl border border-honey-amber/10 backdrop-blur-sm transform -rotate-6 scale-105 shadow-md"></div>
                <div className="absolute inset-0 bg-white/50 rounded-3xl border border-honey-amber/10 backdrop-blur-sm transform rotate-3 scale-105 shadow-md"></div>
                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-honey-amber/20 p-6 shadow-lg transform rotate-1 overflow-hidden">
                  <img 
                    src="https://dl.dropbox.com/scl/fi/9yxbc0w3oyrfyevnulbrt/Honey-Filling-Machine.jpg?rlkey=1vzgtypdp5lbgscwi5cmgs1cy" 
                    alt="Honey Filling Machine" 
                    className="w-full h-auto rounded-xl object-cover shadow-md transition-all duration-700 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://placehold.co/800x600/D19E43/FFFFFF?text=Premium+Honey';
                    }}
                  />
                  <div className="absolute bottom-12 right-12 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-md max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-honey-gold" />
                      <p className="font-medium text-honey-dark">Quality Assurance</p>
                    </div>
                    <p className="text-sm text-honey-dark/70">Monitor every aspect of your honey production with our comprehensive quality management system.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - Melita Honey inspired */}
      <div id="features" className="bg-white py-20 relative">
        <div className="melita-container relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">WHY CHOOSE US</span>
            <div className="melita-accent-bar mx-auto"></div>
            <h2 className="melita-heading mb-4 text-center">Premium Honey Management</h2>
            <p className="melita-subheading mx-auto">
              Our portal brings together everything you need to manage your honey products with ease and precision
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature Card 1 */}
            <div className="feature-card group">
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
            </div>
            
            {/* Feature Card 2 */}
            <div className="feature-card group">
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
            </div>
            
            {/* Feature Card 3 */}
            <div className="feature-card group">
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
            </div>
          </div>
        </div>
      </div>

      {/* Product Values Section - New Melita-inspired section */}
      <div className="bg-honey-cream py-16">
        <div className="melita-container">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">OUR VALUES</span>
            <div className="melita-accent-bar mx-auto"></div>
            <h2 className="melita-heading mb-4 text-center">The Purest Honey Standards</h2>
            <p className="melita-subheading mx-auto">
              We maintain the highest quality standards throughout our production process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Quality Certified</h3>
              <p className="text-honey-dark/70 font-open">Premium honey products that meet international quality standards</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Sustainably Sourced</h3>
              <p className="text-honey-dark/70 font-open">Responsibly harvested honey that protects our bees and environment</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-honey-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="h-8 w-8 text-honey-gold" />
              </div>
              <h3 className="text-lg font-playfair font-semibold mb-2 text-honey-dark">Pure Taste</h3>
              <p className="text-honey-dark/70 font-open">Authentic flavors preserved through careful processing methods</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Section - Smaller and more subtle */}
      <div className="bg-white py-14">
        <div className="melita-container">
          <div className="flex flex-col items-center text-center mb-10">
            <span className="inline-block px-4 py-2 rounded-full bg-honey-light text-honey-dark font-medium text-sm mb-4">TESTIMONIALS</span>
            <div className="melita-accent-bar"></div>
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-honey-dark mb-2 tracking-tight">What Our Clients Say</h2>
            <p className="text-lg text-honey-dark/70 max-w-2xl font-open">Trusted by honey producers and exporters worldwide</p>
          </div>
          
          {/* Testimonial Card - Made smaller and more subtle */}
          <div className="max-w-3xl mx-auto testimonial-card">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-4 testimonial-image p-4 flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1556157382-97eda2f9671e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                  alt="Honey Production Facility"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/600x800/D19E43/FFFFFF?text=Honey+Production';
                  }}
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
          </div>
        </div>
      </div>

      {/* CTA Section - Melita Honey inspired */}
      <div className="relative py-16 overflow-hidden bg-honey-gradient">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-white/10 rounded-full mix-blend-multiply blur-3xl opacity-30"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full mix-blend-multiply blur-3xl opacity-30"></div>
        </div>
        
        <div className="melita-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4 tracking-tight">Ready to Manage Your Products?</h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-6 font-open">
              Sign in to access your personalized customer portal and start managing your honey product approvals today.
            </p>
            <Button asChild size="lg" className="bg-white hover:bg-honey-cream text-honey-dark font-medium text-lg px-8 py-5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 rounded-lg">
              <Link to="/login" className="gap-2">
                Access Customer Portal <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LandingPage;
