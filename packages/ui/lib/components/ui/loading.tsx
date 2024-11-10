import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function Loading(props: { className?: string }) {
  return (
    <div className="filliny-m-auto filliny-mt-44 filliny-flex filliny-size-full filliny-items-center filliny-justify-center">
      <Loader2 className={cn('size-30 filliny-animate-spin', props?.className)} />
    </div>
  );
}

export { Loading };
