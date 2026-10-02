import { useAlertStore, type AlertType } from "@/store/useAlertStore";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const alertStyles: Record<AlertType, { text: string; icon: any }> = {
  info: { text: "text-blue-500", icon: Info },
  warning: { text: "text-amber-500", icon: AlertTriangle },
  error: { text: "text-red-500", icon: AlertCircle },
  success: { text: "text-green-500", icon: CheckCircle2 },
};

export function AlertsDropdown() {
  const { alerts, dismissedIds, restoreAlert } = useAlertStore();

  if (alerts.length === 0) return null;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle alerts</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold text-sm">System Alerts</span>
          <span className="text-xs text-muted-foreground">{alerts.length} total</span>
        </div>
        <DropdownMenuSeparator />
        
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No active alerts.
          </div>
        ) : (
          alerts.map((alert) => {
            const isDismissed = dismissedIds.includes(alert.id);
            const style = alertStyles[alert.type] || alertStyles.info;
            const Icon = style.icon;

            return (
              <DropdownMenuItem 
                key={alert.id} 
                className="flex flex-col items-start gap-1 p-3 cursor-default"
                onSelect={(e) => e.preventDefault()} // Prevent closing on click
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${style.text} ${isDismissed ? 'opacity-50' : ''}`} />
                    <span className={`font-medium text-sm ${isDismissed ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {alert.title}
                    </span>
                  </div>
                  {isDismissed && (
                    <button 
                      onClick={() => restoreAlert(alert.id)}
                      className="text-[10px] uppercase tracking-wider font-semibold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-sm transition-colors"
                    >
                      Restore
                    </button>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDismissed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                  {alert.description}
                </p>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
