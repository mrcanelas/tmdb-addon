import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import type { TopPostersConfig } from "@/contexts/config";

export default function TopPosters() {
    const { topposterskey, setTopposterskey, toppostersConfig, setToppostersConfig } = useConfig();
    const [tempKey, setTempKey] = useState(topposterskey);
    const [tempConfig, setTempConfig] = useState<TopPostersConfig>(toppostersConfig);
    const [error, setError] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        setTempKey(topposterskey);
        setTempConfig(toppostersConfig);
        if (topposterskey) {
            validateKey(topposterskey).then((valid) => {
                if (valid) {
                    setIsValid(true);
                }
            });
        } else {
            setIsValid(false);
        }
    }, [topposterskey, toppostersConfig]);

    const validateKey = async (key: string) => {
        if (!key) {
            setIsValid(false);
            setError("");
            return false;
        }

        setIsChecking(true);
        try {
            const response = await fetch(`https://api.top-streaming.stream/auth/verify/${key}`);
            const data = await response.json();

            if (!data || !data.valid) {
                setError("Top Posters API Key is invalid, please try again");
                setIsValid(false);
                return false;
            }
            setError("");
            setIsValid(true);
            return true;
        } catch (e) {
            console.error(e);
            setError("Error validating Top Posters key");
            setIsValid(false);
            return false;
        } finally {
            setIsChecking(false);
        }
    };

    const handleSave = () => {
        if (isValid) {
            setTopposterskey(tempKey);
            setToppostersConfig(tempConfig);
        }
    };

    const handleCancel = () => {
        setTempKey(topposterskey);
        setTempConfig(toppostersConfig);
        setError("");
        setIsValid(topposterskey ? true : false);
    };

    const handleRemove = () => {
        setTopposterskey("");
        setToppostersConfig({
            posterType: 'poster-default',
            style: 'modern',
            thumbnailBadgePosition: 'top-right',
            thumbnailBadgeSize: 'small',
            thumbnailBlur: false
        });
        setTempKey("");
        setTempConfig({
            posterType: 'poster-default',
            style: 'modern',
            thumbnailBadgePosition: 'top-right',
            thumbnailBadgeSize: 'small',
            thumbnailBlur: false
        });
        setIsValid(false);
    };

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="topposterskey">
                        Top Posters API Key (get it from{" "}
                        <a
                            href="https://api.top-streaming.stream"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            Top Posters
                        </a>
                        )
                    </Label>
                    <Input
                        id="topposterskey"
                        value={tempKey}
                        onChange={(e) => {
                            setTempKey(e.target.value);
                            setIsValid(false);
                            setError("");
                        }}
                        placeholder="Enter your Top Posters API key (e.g. TP-abc123def456)"
                    />
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {isValid && (
                    <div className="space-y-6 pt-4 border-t">
                        {/* Poster Options */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Poster Options</h3>

                            <div className="space-y-3">
                                <Label className="text-base">Poster Type</Label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="posterType"
                                            checked={tempConfig.posterType === 'poster-default'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, posterType: 'poster-default' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Default (with title)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="posterType"
                                            checked={tempConfig.posterType === 'poster-textless'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, posterType: 'poster-textless' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Textless (Pro/Premium)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-base">Badge Style</Label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="style"
                                            checked={tempConfig.style === 'modern'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, style: 'modern' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Modern</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="style"
                                            checked={tempConfig.style === 'rpdb'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, style: 'rpdb' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>RPDB-style</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail Options */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold">Episode Thumbnails <span className="text-xs text-muted-foreground">(Premium only)</span></h3>

                            <div className="space-y-3">
                                <Label className="text-base">Badge Position</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => (
                                        <label key={pos} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="thumbnailBadgePosition"
                                                checked={tempConfig.thumbnailBadgePosition === pos}
                                                onChange={() => setTempConfig(prev => ({ ...prev, thumbnailBadgePosition: pos }))}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm capitalize">{pos.replace('-', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-base">Badge Size</Label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="thumbnailBadgeSize"
                                            checked={tempConfig.thumbnailBadgeSize === 'small'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, thumbnailBadgeSize: 'small' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Small (TV)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="thumbnailBadgeSize"
                                            checked={tempConfig.thumbnailBadgeSize === 'medium'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, thumbnailBadgeSize: 'medium' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Medium (Mobile)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="thumbnailBadgeSize"
                                            checked={tempConfig.thumbnailBadgeSize === 'large'}
                                            onChange={() => setTempConfig(prev => ({ ...prev, thumbnailBadgeSize: 'large' }))}
                                            className="h-4 w-4"
                                        />
                                        <span>Large (Desktop)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={tempConfig.thumbnailBlur}
                                        onChange={() => setTempConfig(prev => ({ ...prev, thumbnailBlur: !prev.thumbnailBlur }))}
                                        className="h-4 w-4 rounded"
                                    />
                                    <span>Blur thumbnail background (anti-spoiler)</span>
                                </label>
                            </div>
                        </div>

                        <Alert>
                            <AlertDescription>
                                ✓ API Key validated. Language will be automatically applied from addon settings.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>

            <div className="flex justify-between space-x-2 pt-4 border-t sticky bottom-0 bg-background">
                {topposterskey && (
                    <DialogClose asChild>
                        <Button variant="destructive" onClick={handleRemove}>
                            Remove
                        </Button>
                    </DialogClose>
                )}
                <div className="flex space-x-2 justify-end flex-1">
                    <DialogClose asChild>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </DialogClose>
                    {isValid ? (
                        <DialogClose asChild>
                            <Button onClick={handleSave}>
                                Save Changes
                            </Button>
                        </DialogClose>
                    ) : (
                        <Button
                            onClick={() => validateKey(tempKey)}
                            disabled={!tempKey || isChecking}
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking
                                </>
                            ) : (
                                'Check Key'
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
