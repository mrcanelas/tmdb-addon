import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAddonUrl } from "@/lib/config";
import { useConfig } from "@/contexts/ConfigContext";

export function MultiActionButton() {
  const { toast } = useToast();
  const config = useConfig();
  const [currentAction, setCurrentAction] = useState<number>(0);

  const handleInstall = () => {
    const url = generateAddonUrl(config);
    window.location.href = url.replace(/^https?:\/\//, "stremio://");
  };

  const handleInstallWeb = () => {
    const addonUrl = generateAddonUrl(config);
    const webUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(addonUrl)}`;
    window.open(webUrl, "_blank");
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(generateAddonUrl(config));
    toast({
      title: "URL Copied",
      description: "The URL has been copied to your clipboard",
    });
  };
  
  const actions = [
    { label: 'Install', action: handleInstall },
    { label: 'Install Web', action: handleInstallWeb },
    { label: 'Copy URL', action: handleCopyUrl }
  ];

  const handleMainClick = () => {
    actions[currentAction].action();
  };

  return (
    <div className="inline-flex rounded-md w-full">
      <Button
        onClick={handleMainClick}
        className="rounded-r-none border-r-0 pr-3 w-full"
        variant="default"
      >
        {actions[currentAction].label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-l-none px-2 hover:bg-primary/90"
            variant="default"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border shadow-md">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => setCurrentAction(index)}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default MultiActionButton;