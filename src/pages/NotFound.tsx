import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icons } from '../components/icons/Icons';
import { useAuthStore } from '../store/authStore';

export default function NotFound() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-violet/10 rounded-full blur-[100px] -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -bottom-24 -right-24 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10 max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="font-sora font-extrabold text-[8rem] sm:text-[10rem] leading-none gradient-text mb-2"
        >
          404
        </motion.div>

        <h1 className="font-sora font-bold text-2xl mb-2">Page not found</h1>
        <p className="text-slatec text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Icons.ArrowLeft size={16} /> Go Back
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Icons.Home size={16} />
            {isAuthenticated ? 'Dashboard' : 'Home'}
          </button>
        </div>

        <div className="mt-10 font-sora font-extrabold text-lg text-slatec/40">
          Engage<span className="text-violet-light/40">Pay</span>
        </div>
      </motion.div>
    </div>
  );
}