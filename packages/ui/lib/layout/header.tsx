import { Button } from '../components';
import { Logo } from '../components/Logo';
import { ProfileSelector } from './profile-selector';

import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="filliny-grid filliny-grid-cols-12 filliny-items-center">
      <div className="filliny-col-span-2">wooo</div>
      <div className="filliny-col-span-8 filliny-flex filliny-justify-center">
        <ProfileSelector />
      </div>
      <div className="filliny-col-span-2 filliny-flex filliny-justify-end">
        <Link to={'https://filliny.io'} target="_blank">
          <Button size="icon">
            <Logo />
          </Button>
        </Link>{' '}
      </div>
    </header>
  );
}

export { Header };
