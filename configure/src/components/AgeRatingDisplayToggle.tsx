import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/contexts/ConfigContext";

export function AgeRatingDisplayToggle() {
    const {
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating,
        setEnableAgeRating,
        setShowAgeRatingInGenres,
        setShowAgeRatingWithImdbRating
    } = useConfig();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-sm font-semibold mb-1">Enable Age Rating</h1>
                    <p className="text-gray-500 text-sm">
                        Fetch and attach the content rating to metadata
                    </p>
                </div>
                <Switch checked={enableAgeRating} onCheckedChange={setEnableAgeRating} />
            </div>

            <div className={`grid gap-4 transition-opacity ${enableAgeRating ? "opacity-100" : "opacity-40"}`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h2 className="text-sm font-semibold mb-1">Show in Genres</h2>
                        <p className="text-gray-500 text-sm">
                            Insert the age rating as the first genre entry
                        </p>
                    </div>
                    <Switch
                        checked={showAgeRatingInGenres}
                        onCheckedChange={setShowAgeRatingInGenres}
                        disabled={!enableAgeRating}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h2 className="text-sm font-semibold mb-1">Show with IMDb Rating</h2>
                        <p className="text-gray-500 text-sm">
                            Append the age rating next to the IMDb score
                        </p>
                    </div>
                    <Switch
                        checked={showAgeRatingWithImdbRating}
                        onCheckedChange={setShowAgeRatingWithImdbRating}
                        disabled={!enableAgeRating}
                    />
                </div>
            </div>
        </div>
    );
}
