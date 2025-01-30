import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IntegrationDialog } from "./IntegrationDialog";

interface IntegrationCardProps {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export function IntegrationCard({ id, name, icon, description }: IntegrationCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
          <div className="flex flex-col h-full">
            <div className="flex flex-col items-center text-center flex-1">
              <img src={icon} alt={name} className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4" />
              <h3 className="font-semibold mb-1.5 sm:mb-2 text-base sm:text-lg">{name}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{description}</p>
            </div>
            <div className="flex justify-center mt-4">
              <Button 
                variant="ghost" 
                className="text-primary hover:text-primary/80 font-medium text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2"
              >
                Setup
              </Button>
            </div>
          </div>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="w-[95%] sm:w-auto">
        <IntegrationDialog id={id} name={name} icon={icon} />
      </DialogContent>
    </Dialog>
  );
}