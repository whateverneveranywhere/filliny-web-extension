import { getConfig } from "@extension/shared";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui";
import { PageLayout } from "../layout";

function SigninPage() {
  const config = getConfig();
  console.log("[SigninPage] Using URL:", config.baseURL);

  const handleLoginClick = () => {
    console.log("[SigninPage] Opening login URL:", `${config.baseURL}/auth/sign-in`);
    window.open(`${config.baseURL}/auth/sign-in`, "_blank");
  };

  return (
    <PageLayout isLoggedIn={false}>
      <div className="filliny-flex filliny-h-full filliny-min-h-max filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-8 filliny-p-6">
        <div className="filliny-transform filliny-transition-transform filliny-duration-300 hover:filliny-scale-110">
          <Logo height={90} width={90} />
        </div>

        <div className="filliny-flex filliny-max-w-md filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4 filliny-text-center">
          <h1 className="filliny-bg-gradient-to-r filliny-from-primary filliny-to-primary/70 filliny-bg-clip-text filliny-text-3xl filliny-font-bold filliny-text-transparent">
            Welcome to Filliny
          </h1>
          <p className="filliny-mb-2 filliny-text-lg filliny-text-gray-500">
            To continue using our services, please sign in to your account or create a new one.
          </p>

          <Button
            onClick={handleLoginClick}
            variant="outline"
            className="filliny-transform filliny-gap-2 filliny-px-6 filliny-py-3 filliny-text-lg filliny-transition-all filliny-duration-300 hover:filliny-scale-105">
            <span>Continue to Sign in</span>
            <svg
              className="filliny-ml-1 filliny-inline-block filliny-h-5 filliny-w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

export default SigninPage;
