import { useAuthStore } from '../store/authStore';
import AdvertiserReview from '../components/advertiser/AdvertiserReview';
import { Navigate } from 'react-router-dom';

export default function Review() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'advertiser') return <Navigate to="/dashboard" />;
  return <AdvertiserReview />;
}