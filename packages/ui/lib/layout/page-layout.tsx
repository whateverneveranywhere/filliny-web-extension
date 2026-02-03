import { Header } from './header';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  isLoggedIn?: boolean;
  showPattern?: boolean;
}

const PageLayout = ({ children, footer, isLoggedIn = true, showPattern = true }: PageLayoutProps) => (
  <div
    className={cn(
      'filliny-flex filliny-min-h-screen filliny-h-full filliny-w-full filliny-flex-col filliny-bg-background filliny-overflow-auto filliny-relative',
      showPattern && 'bg-dot-pattern',
    )}>
    {isLoggedIn && <Header />}
    <div className="filliny-flex filliny-flex-1 filliny-flex-col filliny-px-4 filliny-py-4 filliny-w-full">
      {children}
    </div>
    {footer && (
      <div className="filliny-sticky filliny-bottom-0 filliny-w-full filliny-bg-background/95 filliny-backdrop-blur-sm filliny-border-t filliny-px-4 filliny-py-3">
        {footer}
      </div>
    )}
  </div>
);

export default PageLayout;
