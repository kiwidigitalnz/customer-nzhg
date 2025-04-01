
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart, AlertTriangle, ArrowUpRight, Hexagon } from 'lucide-react';

interface LandingPageProps {
  podioAuthError: string | null;
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
      
      {/* Hero Section - Enhanced with better design elements */}
      <div className="relative overflow-hidden min-h-[90vh] flex items-center bg-hero-gradient">
        {/* Dynamic background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400 rounded-full mix-blend-multiply blur-3xl opacity-20 transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-300 rounded-full mix-blend-multiply blur-3xl opacity-25 animate-blob animation-delay-4000"></div>
          
          {/* Enhanced hexagon pattern elements */}
          <div className="absolute opacity-10">
            {Array(20).fill(0).map((_, i) => (
              <Hexagon 
                key={i} 
                className="absolute text-white/30" 
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5,
                  transform: `scale(${0.5 + Math.random() * 2}) rotate(${Math.random() * 90}deg)`,
                }}
                size={40 + Math.random() * 60}
              />
            ))}
          </div>
          
          {/* Decorative grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
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
                    e.currentTarget.src = 'https://placehold.co/240x80/0078D7/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl hero-heading font-bold text-white leading-tight tracking-tight">
                Elevate Your <span className="text-gradient-honey relative">Honey</span> Products
              </h1>
              <p className="text-xl text-blue-50 font-inter max-w-xl">
                Your gateway to streamlined product approvals, specifications, and quality management through our intuitive customer portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="bg-honey-gradient hover:opacity-90 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                  <Link to="/login" className="gap-2">
                    Sign In <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
                  <a href="#features" className="gap-2">
                    Discover Features <ArrowUpRight className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="relative p-4">
                {/* Multiple layered card effect */}
                <div className="absolute inset-0 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm transform -rotate-6 scale-105 shadow-xl"></div>
                <div className="absolute inset-0 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm transform rotate-3 scale-105 shadow-xl"></div>
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl transform rotate-1 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1586190848861-99aa4a171e90?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                    alt="Honey Production" 
                    className="w-full h-auto rounded-xl object-cover shadow-md transition-all duration-700 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://placehold.co/800x600/FFB900/FFFFFF?text=Premium+Honey';
                    }}
                  />
                  <div className="absolute bottom-12 right-12 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-amber-600" />
                      <p className="font-medium text-gray-900">Quality Assurance</p>
                    </div>
                    <p className="text-sm text-gray-600">Monitor every aspect of your honey production with our comprehensive quality management system.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-800 to-transparent"></div>
        
        {/* Curved divider - updated with honey color tint */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="fill-white">
            <path d="M0,64L80,80C160,96,320,128,480,128C640,128,800,96,960,80C1120,64,1280,64,1360,64L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      {/* Features Section - More engaging with honey-inspired colors */}
      <div id="features" className="bg-white py-20 md:py-32 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-medium text-sm mb-4">WHY CHOOSE US</span>
            <h2 className="text-3xl md:text-5xl font-playfair font-bold text-gray-900 mb-4 tracking-tight">Streamlined Product Management</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-inter">
              Our portal brings together everything you need to manage your honey products with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature Card 1 */}
            <div className="bg-gradient-to-br from-white to-amber-50 p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:translate-y-[-8px] group">
              <div className="bg-amber-600 text-white p-4 rounded-xl w-fit mb-6 group-hover:bg-amber-700 transition-colors">
                <FileCheck className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-manrope font-semibold mb-3 text-gray-800">Product Specifications</h3>
              <p className="text-gray-600 font-inter">
                Access and review all your product packing specifications in one secure location. Download detailed reports and stay informed.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-amber-600 font-medium hover:text-amber-800">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            
            {/* Feature Card 2 */}
            <div className="bg-gradient-to-br from-white to-amber-50 p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:translate-y-[-8px] group">
              <div className="bg-amber-600 text-white p-4 rounded-xl w-fit mb-6 group-hover:bg-amber-700 transition-colors">
                <Beaker className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-manrope font-semibold mb-3 text-gray-800">Quality Approvals</h3>
              <p className="text-gray-600 font-inter">
                Approve honey specifications and packaging details with an intuitive interface. Provide feedback directly to our team.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-amber-600 font-medium hover:text-amber-800">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            
            {/* Feature Card 3 */}
            <div className="bg-gradient-to-br from-white to-amber-50 p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:translate-y-[-8px] group">
              <div className="bg-amber-600 text-white p-4 rounded-xl w-fit mb-6 group-hover:bg-amber-700 transition-colors">
                <LineChart className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-manrope font-semibold mb-3 text-gray-800">Progress Tracking</h3>
              <p className="text-gray-600 font-inter">
                Monitor the status of your honey products throughout the approval process with real-time updates and notifications.
              </p>
              <div className="pt-4 mt-auto">
                <Button asChild variant="link" className="p-0 text-amber-600 font-medium hover:text-amber-800">
                  <a href="#" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Section - Enhanced with honey-inspired colors */}
      <div className="bg-gradient-to-br from-amber-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-medium text-sm mb-4">TESTIMONIALS</span>
            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-2 tracking-tight">What Our Clients Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl font-inter">Trusted by honey producers and exporters worldwide</p>
          </div>
          
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5">
              <div className="md:col-span-2 bg-amber-600 p-8 flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1556157382-97eda2f9671e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="Honey Production Facility"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/600x800/FFA500/FFFFFF?text=Honey+Production';
                  }}
                />
              </div>
              <div className="md:col-span-3 p-8 md:p-12 flex flex-col justify-center">
                <div className="mb-6">
                  <svg width="120" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0L14.6942 8.2918H23.4127L16.3593 13.4164L19.0534 21.7082L12 16.5836L4.94658 21.7082L7.64074 13.4164L0.587322 8.2918H9.30583L12 0Z" fill="#F59E0B" />
                    <path d="M36 0L38.6942 8.2918H47.4127L40.3593 13.4164L43.0534 21.7082L36 16.5836L28.9466 21.7082L31.6407 13.4164L24.5873 8.2918H33.3058L36 0Z" fill="#F59E0B" />
                    <path d="M60 0L62.6942 8.2918H71.4127L64.3593 13.4164L67.0534 21.7082L60 16.5836L52.9466 21.7082L55.6407 13.4164L48.5873 8.2918H57.3058L60 0Z" fill="#F59E0B" />
                    <path d="M84 0L86.6942 8.2918H95.4127L88.3593 13.4164L91.0534 21.7082L84 16.5836L76.9466 21.7082L79.6407 13.4164L72.5873 8.2918H81.3058L84 0Z" fill="#F59E0B" />
                    <path d="M108 0L110.694 8.2918H119.413L112.359 13.4164L115.053 21.7082L108 16.5836L100.947 21.7082L103.641 13.4164L96.5873 8.2918H105.306L108 0Z" fill="#F59E0B" />
                  </svg>
                </div>
                <blockquote className="text-xl italic text-gray-700 mb-6 font-inter">"The customer portal has revolutionized how we manage our honey product approvals. It's intuitive, comprehensive, and has saved us countless hours in the approval process."</blockquote>
                <div>
                  <p className="font-semibold text-gray-900 font-manrope">Sarah Thompson</p>
                  <p className="text-gray-600 font-inter">Export Manager, Canterbury Honey Co.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Enhanced with honey gold gradients */}
      <div className="relative py-20 md:py-28 overflow-hidden bg-honey-gradient">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-amber-500 rounded-full mix-blend-multiply blur-3xl opacity-30"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-yellow-500 rounded-full mix-blend-multiply blur-3xl opacity-30"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-playfair font-bold text-white mb-6 tracking-tight">Ready to Manage Your Products?</h2>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto mb-8 font-inter">
              Sign in to access your personalized customer portal and start managing your honey product approvals today.
            </p>
            <Button asChild size="lg" className="bg-white hover:bg-gray-100 text-amber-700 font-semibold text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
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
