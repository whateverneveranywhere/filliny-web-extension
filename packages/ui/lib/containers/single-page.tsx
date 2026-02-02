import { Logo } from '../components/logo';
import { Button, Heading, Text } from '../components/ui';
import { PageLayout } from '../layout';
import { getConfig } from '@extension/shared';
import { ArrowRight } from 'lucide-react';

const SigninPage = () => {
  const config = getConfig();

  const handleLoginClick = () => {
    window.open(`${config.baseURL}/auth/sign-in`, '_blank');
  };

  return (
    <PageLayout isLoggedIn={false} showPattern>
      <div className="filliny-flex filliny-min-h-[calc(100vh-2rem)] filliny-flex-col filliny-items-center filliny-justify-center filliny-text-center">
        <div className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-4 filliny-max-w-xs">
          <div className="filliny-transform filliny-transition-transform filliny-duration-300 hover:filliny-scale-105">
            <Logo height={48} width={48} />
          </div>

          <div className="filliny-space-y-1.5">
            <Heading level={4} className="filliny-text-lg">
              Welcome to Filliny
            </Heading>
            <Text variant="small" textColor="muted">
              Sign in to your account or create a new one to continue.
            </Text>
          </div>

          <Button onClick={handleLoginClick} size="default" className="filliny-w-full filliny-gap-2">
            <span>Continue to Sign in</span>
            <ArrowRight className="filliny-h-3.5 filliny-w-3.5" />
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default SigninPage;
