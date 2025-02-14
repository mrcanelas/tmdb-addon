import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/contexts/ConfigContext";
import { Card } from "@/components/ui/card";

export function SearchToggle() {
  const { searchEnabled, setSearchEnabled } = useConfig();

  return (
    <Card className="flex flex-row items-center justify-between p-6">
      <div className="space-y-0.5">
        <label className="text-sm font-semibold mb-1">Enable Search</label>
        <p className="text-gray-500 text-sm">
          Allow searching for movies and TV shows
        </p>
      </div>
      <Switch checked={searchEnabled} onCheckedChange={setSearchEnabled} />
    </Card>
  );
}
