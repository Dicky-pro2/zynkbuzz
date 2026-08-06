import { useAuthStore } from '../store/authStore';
import AdvertiserTasks from '../components/advertiser/AdvertiserTasks';
import EarnerTasks from '../components/earner/EarnerTasks';

export default function Tasks() {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'advertiser' ? <AdvertiserTasks /> : <EarnerTasks />;
}