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
      <div className="min-h-[90vh] flex items-center justify-center relative overflow-hidden bg-honey-dark">
        {/* Abstract gradient background */}
        <div className="absolute inset-0">
          {/* Primary gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-honey-dark via-honey-dark to-honey-amber/20"></div>
          
          {/* Animated orbs */}
          <motion.div 
            className="absolute top-1/4 -left-20 w-96 h-96 bg-honey-gold/30 rounded-full blur-3xl"
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-honey-amber/25 rounded-full blur-3xl"
            animate={{ 
              x: [0, -40, 0],
              y: [0, 30, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-honey-gold/15 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Subtle mesh overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--honey-gold) / 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, hsl(var(--honey-amber) / 0.1) 0%, transparent 50%)`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-md mx-auto">
            {/* Back to home link */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </motion.div>
            
            {/* Logo */}
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-honey-gold/30 to-honey-amber/20 rounded-xl blur-lg"></div>
                <img 
                  src="/nzhg-logo.png" 
                  alt="NZ Honey Group" 
                  className="relative h-16 drop-shadow-[0_0_15px_rgba(209,158,67,0.3)]"
                  style={{ filter: 'brightness(1.1)' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/240x80/D19E43/FFFFFF?text=NZ+Honey+Group';
                  }}
                />
              </div>
            </motion.div>
            
            {/* Login Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <LoginForm />
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
