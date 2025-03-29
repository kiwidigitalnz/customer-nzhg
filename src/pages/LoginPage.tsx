
import LoginForm from '../components/LoginForm';
import MainLayout from '../components/MainLayout';

const LoginPage = () => {
  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-amber-50 to-white">
        <div className="w-full max-w-md mb-8">
          <div className="text-center mb-8">
            <img 
              src="/nz-honey-group-logo.png" 
              alt="NZ Honey Group" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/240x80/FFF6E5/FFB800?text=NZ+Honey+Group';
              }}
            />
            <h1 className="text-3xl font-bold text-amber-900">Customer Portal</h1>
            <p className="text-muted-foreground mt-2">
              Access your packing specifications and approvals
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
