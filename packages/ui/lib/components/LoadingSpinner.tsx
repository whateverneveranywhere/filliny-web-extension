import { RingLoader } from 'react-spinners';

interface LoadingSpinnerProps {
  size?: number;
}

export const LoadingSpinner = ({ size }: LoadingSpinnerProps) => (
  <div className={'flex min-h-screen items-center justify-center'}>
    <RingLoader size={size ?? 100} color={'aqua'} />
  </div>
);
