import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/contexts/ConfigContext";

export function AgeRatingDisplayToggle() {
    const { showAgeRatingInGenres, setShowAgeRatingInGenres } = useConfig();

    return (
        <>
            <div className="space-y-0.5">
                <h1 className="text-sm font-semibold mb-1">Display Age Rating</h1>
                <p className="text-gray-500 text-sm">
                    Display age rating as first genre
                </p>
            </div>
            <Switch checked={showAgeRatingInGenres} onCheckedChange={setShowAgeRatingInGenres} />
        </>
    );
}
