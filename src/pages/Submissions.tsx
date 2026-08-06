import { useAuthStore } from '../store/authStore';
import EarnerSubmissions from '../components/earner/EarnerSubmissions';
import { Navigate } from 'react-router-dom';

export default function Submissions() {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== 'earner') {
    return <Navigate to="/dashboard" />;
  }

  return <EarnerSubmissions />;
}