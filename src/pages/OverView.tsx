import { useAuthStore } from '../store/authStore';
import AdvertiserOverview from '../components/advertiser/AdvertiserOverview';
import EarnerOverview from '../components/earner/EarnerOverview';

export default function Overview() {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'advertiser' ? <AdvertiserOverview /> : <EarnerOverview />;
}