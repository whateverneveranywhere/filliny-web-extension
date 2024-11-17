import { getConfig, useDashboardOverview } from '@extension/shared';
import { ProfileSelector } from './profile-selector';
import { TokenDisplay } from '../components';
import { Logo } from '../components/Logo';

const config = getConfig();

function Header() {
  const { data: dashboardOverview } = useDashboardOverview();

  return (
    <header className="filliny-sticky filliny-top-0 filliny-z-50 filliny-w-full filliny-bg-background/95 filliny-backdrop-blur supports-[backdrop-filter]:filliny-bg-background/60">
      <div className="filliny-flex filliny-h-14 filliny-items-center filliny-justify-between">
        {/* Left section - 1/5 width */}
        <div className="filliny-w-1/5 filliny-flex filliny-items-center filliny-gap-4">
          <TokenDisplay tokens={dashboardOverview?.remainingTokens || 0} />
        </div>

        {/* Center section - 3/5 width */}
        <div className="filliny-w-3/5 filliny-flex filliny-items-center filliny-justify-center">
          <ProfileSelector />
        </div>

        {/* Right section - 1/5 width */}
        <div className="filliny-w-1/5 filliny-flex filliny-items-center filliny-justify-end filliny-gap-3">
          <a href={`${config.baseURL}`} target="_blank" rel="noopener noreferrer">
            <Logo width={50} height={50} />
          </a>
        </div>
      </div>
    </header>
  );
}

export { Header };
