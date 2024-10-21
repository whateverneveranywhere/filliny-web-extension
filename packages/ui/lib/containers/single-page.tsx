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
      <div className="flex h-full min-h-max flex-col items-center justify-center gap-5">
        <Logo height={70} width={70} />
        <div className="flex flex-col items-center justify-center gap-3">
          <h1 className="text-3xl font-bold">Login Required</h1>
          <p className="text-lg">You need to login before you can continue. Please click the button below to login.</p>
          <Button onClick={handleLoginClick} variant={'outline'}>
            Sign in / Sign up
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

export default SigninPage;
