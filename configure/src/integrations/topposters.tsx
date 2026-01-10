import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface TierInfo {
    tier: number;
    tier_name: string;
    rate_limits: {
        per_minute: number;
        per_month: number;
    };
}

export default function TopPosters() {
    const { topPostersKey, setTopPostersKey } = useConfig();
    const [tempKey, setTempKey] = useState(topPostersKey);
    const [error, setError] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);

    useEffect(() => {
        setTempKey(topPostersKey);
        if (topPostersKey) {
            validateKey(topPostersKey).then((valid) => {
                if (valid) {
                    setIsValid(true);
                }
            });
        } else {
            setIsValid(false);
            setTierInfo(null);
        }
    }, [topPostersKey]);

    const validateKey = async (key: string) => {
        if (!key) {
            setIsValid(false);
            setError("");
            setTierInfo(null);
            return false;
        }

        setIsChecking(true);
        try {
            const response = await fetch(`https://api.top-streaming.stream/auth/verify/${key}`);
            const data = await response.json();

            if (!(data || {}).valid) {
                setError("Top Posters API Key is invalid, please try again");
                setIsValid(false);
                setTierInfo(null);
                return false;
            }
            setError("");
            setIsValid(true);
            setTierInfo({
                tier: data.tier,
                tier_name: data.tier_name,
                rate_limits: data.rate_limits
            });
            return true;
        } catch (e) {
            console.error(e);
            setError("Error validating Top Posters key");
            setIsValid(false);
            setTierInfo(null);
            return false;
        } finally {
            setIsChecking(false);
        }
    };

    const handleSave = () => {
        if (isValid) {
            setTopPostersKey(tempKey);
        }
    };

    const handleCancel = () => {
        setTempKey(topPostersKey);
        setError("");
        setIsValid(topPostersKey ? true : false);
        if (!topPostersKey) {
            setTierInfo(null);
        }
    };

    const handleRemove = () => {
        setTopPostersKey("");
        setTempKey("");
        setIsValid(false);
        setTierInfo(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="topposterskey">
                        Top Posters API Key (get it from{" "}
                        <a
                            href="https://api.top-streaming.stream/"
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
                            setTierInfo(null);
                        }}
                        placeholder="Enter your Top Posters API key (TP-...)"
                    />
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {isValid && tierInfo && (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription>
                            <span className="font-semibold">{tierInfo.tier_name}</span> tier •{" "}
                            {tierInfo.rate_limits.per_minute} req/min •{" "}
                            {tierInfo.rate_limits.per_month.toLocaleString()} req/month
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="flex justify-between space-x-2">
                {topPostersKey && (
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
