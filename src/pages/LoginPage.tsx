import LoginForm from '../components/LoginForm';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const LoginPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <MainLayout>
      <BurgerMenu />
      <div className="min-h-[90vh] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -top-32 -right-32 w-96 h-96 bg-honey-gold/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-32 -left-32 w-96 h-96 bg-honey-amber/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-md mx-auto">
            {/* Back to home link */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-honey-dark/70 hover:text-honey-dark transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </motion.div>
            
            {/* Single Card with Logo and Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-xl shadow-honey-dark/10 border border-honey-gold/20"
            >
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img 
                  src="/nzhg-logo.png" 
                  alt="NZ Honey Group" 
                  className="h-14"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/240x80/D19E43/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
              
              {/* Login Form */}
              <LoginForm />
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
