import { Header } from './header';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  showPattern?: boolean;
}

const PageLayout = ({ children, isLoggedIn = true, showPattern = false }: PageLayoutProps) => (
  <div
    className={cn(
      'filliny-min-h-screen filliny-h-full filliny-w-full filliny-bg-background filliny-overflow-auto filliny-relative',
      showPattern && 'bg-dot-pattern',
    )}>
    {isLoggedIn && <Header />}
    <div className={cn('filliny-p-4 filliny-w-full')}>{children}</div>
  </div>
);

export default PageLayout;
