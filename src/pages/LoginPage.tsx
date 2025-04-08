
import LoginForm from '../components/LoginForm';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-full max-w-md mb-8">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" 
              alt="NZ Honey Group" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/240x80/F0F8FF/0078D7?text=NZ+Honey+Group';
              }}
            />
            <h1 className="text-2xl font-bold text-center text-blue-800">Customer Portal</h1>
            <p className="text-center text-gray-600 mt-2">
              Log in to access your packing specifications and more
            </p>
          </div>
          
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
