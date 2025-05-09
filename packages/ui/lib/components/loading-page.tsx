import { motion } from "framer-motion";

export interface LoadingPageProps {
  message?: string;
}

export const LoadingPage = ({ message = "Waiting for page to load..." }: LoadingPageProps) => {
  return (
    <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-min-h-[200px] filliny-w-full filliny-gap-4">
      <motion.div
        className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}>
        <motion.div
          className="filliny-h-16 filliny-w-16 filliny-rounded-full filliny-border-4 filliny-border-t-primary filliny-border-r-transparent filliny-border-b-primary filliny-border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.p
          className="filliny-text-sm filliny-text-muted-foreground filliny-mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}>
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
};
