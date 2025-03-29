
import Dashboard from '../components/Dashboard';
import MainLayout from '../components/MainLayout';

const DashboardPage = () => {
  return (
    <MainLayout requireAuth>
      <Dashboard />
    </MainLayout>
  );
};

export default DashboardPage;
