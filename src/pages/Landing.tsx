import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icons } from '../components/icons/Icons';
import Footer from '../components/Footer';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
        <div className="absolute w-[400px] h-[400px] bg-violet/20 rounded-full blur-[100px] -top-32 -left-32 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] bg-blue-500/15 rounded-full blur-[100px] -bottom-24 -right-24 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10 relative z-10 px-2"
        >
          <h1 className="font-sora font-extrabold text-3xl sm:text-4xl mb-2">
            Zynk<span className="text-violet-light">Buzz</span>
          </h1>
          <p className="text-slatec text-sm sm:text-base max-w-xs sm:max-w-none mx-auto">
            Real social media engagement, powered by real people.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full max-w-2xl px-2">
          <RoleCard
            icon={<Icons.Advertiser size={28} />}
            title="I'm an Advertiser"
            desc="Post tasks for followers, likes & comments. Fund your wallet and watch engagement grow."
            color="violet"
            buttonLabel="Get Started"
            onClick={() => navigate('/signup?role=advertiser')}
          />
          <RoleCard
            icon={<Icons.Earner size={28} />}
            title="I'm an Earner"
            desc="Browse tasks, complete them, and earn coins instantly. Withdraw anytime."
            color="green"
            buttonLabel="Start Earning"
            onClick={() => navigate('/signup?role=earner')}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-slatec text-sm relative z-10"
        >
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-violet-light font-semibold hover:underline"
          >
            Log in
          </button>
        </motion.p>
      </div>

      <Footer />
    </>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: 'violet' | 'green';
  buttonLabel: string;
  onClick: () => void;
}

function RoleCard({ icon, title, desc, color, buttonLabel, onClick }: RoleCardProps) {
  const borderHover = {
    violet: 'hover:border-violet/40',
    green: 'hover:border-emerald2/40',
  };
  const iconBg = {
    violet: 'bg-violet/15 text-violet-light',
    green: 'bg-emerald2/15 text-emerald2',
  };
  const btnBg = {
    violet: 'bg-violet hover:bg-violet-dark',
    green: 'bg-emerald2 hover:bg-emerald-600',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`card p-6 sm:p-8 w-full sm:w-72 cursor-pointer transition-all ${borderHover[color]}`}
    >
      <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${iconBg[color]} flex items-center justify-center flex-shrink-0 sm:mb-4`}>
          {icon}
        </div>
        <div className="flex-1 sm:flex-none">
          <h3 className="font-sora font-bold text-base sm:text-lg sm:mb-2">{title}</h3>
          <p className="text-slatec text-xs sm:text-sm leading-relaxed hidden sm:block sm:mb-5">{desc}</p>
        </div>
      </div>
      <p className="text-slatec text-xs leading-relaxed mt-2 mb-4 sm:hidden">{desc}</p>
      <span className={`inline-flex items-center gap-2 text-white font-bold text-sm rounded-full px-5 py-2 transition-all ${btnBg[color]}`}>
        {buttonLabel} <Icons.ArrowRight size={15} />
      </span>
    </motion.div>

    
  );
}