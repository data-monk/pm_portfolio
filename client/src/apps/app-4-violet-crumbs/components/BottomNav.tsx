import { Home, TrendingUp, PlusCircle, Bell, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { vcPath, VC_BASE } from '@vc/lib/navigation';

const NAV_ITEMS = [
  { path: '/feed', icon: Home, label: 'Home' },
  { path: '/impact', icon: TrendingUp, label: 'Impact' },
  { path: '/post', icon: PlusCircle, label: 'Post', special: true },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const fullPath = vcPath(item.path);
          const isActive = location.pathname === fullPath ||
            (item.path === '/feed' && location.pathname === VC_BASE);
          const Icon = item.icon;

          if (item.special) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(fullPath)}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 rounded-full gradient-violet shadow-violet flex items-center justify-center active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(fullPath)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
