import { Header } from './header';
import { cn } from '@/lib/utils';

const PageLayout = ({ children, isLoggedIn = true }: { children: React.ReactNode; isLoggedIn?: boolean }) => (
  <div
    className={cn(
      'filliny-min-h-max filliny-h-full filliny-w-full filliny-bg-background filliny-py-2 filliny-px-4 filliny-overflow-auto filliny-relative',
    )}>
    {isLoggedIn && <Header />}
    <div className={cn('filliny-pt-3 filliny-w-full')}>{children}</div>
  </div>
);

export default PageLayout;
