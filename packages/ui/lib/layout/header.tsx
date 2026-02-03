import { ProfileSelector } from './profile-selector';
import { TokenDisplay } from '../components';
import { Logo } from '../components/logo';
import { getConfig, useDashboardOverview, usePlanLimits } from '@extension/shared';

const config = getConfig();
// Dashboard path for the dashboard route
const dashboardPath = '/dashboard';

const Header = () => {
  const { data, refetch, isRefetching, isLoading } = useDashboardOverview();
  const { isPro, freeFormsRemaining } = usePlanLimits();

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <header className="filliny-sticky filliny-top-0 filliny-z-50 filliny-w-full filliny-border-b filliny-border-border filliny-bg-background">
      <div className="filliny-flex filliny-h-14 filliny-items-center filliny-gap-3 filliny-px-4">
        <div className="filliny-shrink-0">
          <TokenDisplay
            tokens={data?.remainingTokens || 0}
            freeFormsRemaining={freeFormsRemaining}
            isPro={isPro}
            onRefresh={handleRefresh}
            isRefetching={isRefetching}
            isLoading={isLoading}
          />
        </div>

        <div className="filliny-flex filliny-min-w-0 filliny-flex-1 filliny-justify-center">
          <ProfileSelector />
        </div>

        <a
          className="filliny-shrink-0"
          href={`${config.baseURL}${dashboardPath}`}
          target="_blank"
          rel="noopener noreferrer">
          <Logo width={24} height={24} />
        </a>
      </div>
    </header>
  );
};

export { Header };
