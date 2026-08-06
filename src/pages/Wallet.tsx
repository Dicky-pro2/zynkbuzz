import { useAuthStore } from '../store/authStore';
import WalletPage from '../components/shared/WalletPage';
import EarnerWallet from '../components/earner/EarnerWallet';

export default function Wallet() {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'advertiser' ? <WalletPage /> : <EarnerWallet />;
}