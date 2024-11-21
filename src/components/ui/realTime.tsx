import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PowerOff, Wifi } from "lucide-react";

// const RealtimeIndicator = () => (
//   <motion.div
//     className="fixed bottom-4 right-1 transform -translate-x-1/2 bg-primary text-primary-foreground py-2 px-4 rounded-full shadow-lg"
//     initial={{ opacity: 0, y: 50 }}
//     animate={{ opacity: 1, y: 0 }}
//     transition={{ duration: 0.5 }}
//   >
//     <div className="flex items-center space-x-2">
//       <Wifi className="w-4 h-4 animate-pulse" />
//       <span className="text-sm font-medium">Real-time data</span>
//     </div>
//   </motion.div>
// );

const RealtimeIndicator = ({
  isOffline,
  lastUpdated,
}: {
  isOffline: boolean;
  lastUpdated: Date | null;
}) => (
  <motion.div
    className={cn(
      "fixed bottom-4 right-1 transform -translate-x-1/2 py-2 px-4 rounded-full shadow-lg",
      isOffline
        ? "bg-muted text-muted-foreground"
        : "bg-primary text-primary-foreground"
    )}
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex items-center space-x-2">
      {isOffline ? (
        <PowerOff className="w-4 h-4" />
      ) : (
        <Wifi className="w-4 h-4 animate-pulse" />
      )}
      <span className="text-sm font-medium">
        {isOffline
          ? lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleString()}`
            : "Offline"
          : "Real-time data"}
      </span>
    </div>
  </motion.div>
);

export default RealtimeIndicator;
