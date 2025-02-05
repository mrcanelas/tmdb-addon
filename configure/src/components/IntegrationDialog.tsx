import { lazy, Suspense } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface IntegrationDialogProps {
  id: string;
  name: string;
  icon: string;
}

export function IntegrationDialog({ id, name, icon }: IntegrationDialogProps) {
  const IntegrationComponent = lazy(() => 
    /* @vite-ignore */
    import(`../integrations/${id}.tsx`).catch(() => {
      console.error(`Failed to load integration component for ${id}`);
      return import("./DefaultIntegration");
    })
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <img src={icon} alt={name} className="w-5 h-5 sm:w-6 sm:h-6" />
          {name} Configuration
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base">
          Configure your {name} integration settings below.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-3 sm:gap-4">
        <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
          <IntegrationComponent />
        </Suspense>
      </div>
    </>
  );
} 