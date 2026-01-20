import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, LogIn, LogOut, LayoutDashboard, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const BurgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Fixed Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 w-12 h-12 rounded-xl bg-white/90 backdrop-blur-md border border-honey-gold/20 shadow-lg flex items-center justify-center hover:bg-honey-light transition-all duration-300"
        aria-label="Toggle menu"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-honey-dark" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6 text-honey-dark" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-md shadow-2xl z-40 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 pt-20 border-b border-honey-light">
                <img 
                  src="/nzhg-logo.png" 
                  alt="NZ Honey Group" 
                  className="h-10"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/120x40/D19E43/FFFFFF?text=NZHG';
                  }}
                />
              </div>

              {/* User Info (if logged in) */}
              {isAuthenticated && user && (
                <div className="p-6 bg-honey-light/30 border-b border-honey-light">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-honey-gold to-honey-amber flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-honey-dark font-raleway">{user.name}</p>
                      <p className="text-sm text-honey-dark/60 font-open">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 p-6 space-y-2 font-open">
                <button
                  onClick={() => handleNavigation('/')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-honey-dark hover:bg-honey-light/50 transition-colors"
                >
                  <Home className="h-5 w-5 text-honey-gold" />
                  <span className="font-medium">Home</span>
                </button>

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => handleNavigation('/dashboard')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-honey-dark hover:bg-honey-light/50 transition-colors"
                    >
                      <LayoutDashboard className="h-5 w-5 text-honey-gold" />
                      <span className="font-medium">Dashboard</span>
                    </button>
                  </>
                ) : null}

                <a
                  href="mailto:support@nzhg.com"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-honey-dark hover:bg-honey-light/50 transition-colors"
                >
                  <Mail className="h-5 w-5 text-honey-gold" />
                  <span className="font-medium">Contact Support</span>
                </a>
              </nav>

              {/* Action Buttons */}
              <div className="p-6 border-t border-honey-light">
                {isAuthenticated ? (
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleNavigation('/login')}
                    className="w-full gap-2 bg-gradient-to-r from-honey-gold to-honey-amber text-white hover:opacity-90"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BurgerMenu;
