import { Header } from './header';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  showPattern?: boolean;
}

const PageLayout = ({ children, isLoggedIn = true, showPattern = true }: PageLayoutProps) => (
  <div
    className={cn(
      'filliny-min-h-screen filliny-h-full filliny-w-full filliny-bg-background filliny-overflow-auto filliny-relative',
      showPattern && 'bg-dot-pattern',
    )}>
    {isLoggedIn && <Header />}
    <div className="filliny-px-3 filliny-pt-3 filliny-pb-3 filliny-w-full">{children}</div>
  </div>
);

export default PageLayout;
