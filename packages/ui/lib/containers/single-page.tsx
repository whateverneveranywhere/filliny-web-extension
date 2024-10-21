import { getConfig } from '@extension/shared';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { PageLayout } from '../layout';

function SigninPage() {
  const config = getConfig();
  const handleLoginClick = () => {
    window.open(config.baseURL, '_blank');
  };
  return (
    <PageLayout isLoggedIn={false}>
      <div className="filliny-flex filliny-h-full filliny-min-h-max filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-5">
        <Logo height={70} width={70} />
        <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-3">
          <h1 className="filliny-text-3xl filliny-font-bold">Login Required</h1>
          <p className="filliny-text-lg">
            You need to login before you can continue. Please click the button below to login.
          </p>
          <Button onClick={handleLoginClick} variant={'outline'}>
            Sign in / Sign up
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

export default SigninPage;
