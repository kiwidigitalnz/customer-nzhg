
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';

const PackingSpecDetailsPage = () => {
  return (
    <MainLayout requireAuth>
      <PackingSpecDetails />
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
