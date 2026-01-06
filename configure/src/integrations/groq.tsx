import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function Groq() {
    const { groqkey, setGroqKey } = useConfig();
    const [tempKey, setTempKey] = useState(groqkey);
    const [error, setError] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        setTempKey(groqkey);
        if (groqkey) {
            validateGroqKey(groqkey);
        }
    }, [groqkey]);

    const validateGroqKey = async (key: string) => {
        if (!key) {
            setIsValid(false);
            setError("");
            return false;
        }

        setIsChecking(true);
        try {
            const response = await fetch("https://api.groq.com/openai/v1/models", {
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (!response.ok || (data.error)) {
                setError("Groq Key is invalid, please try again");
                setIsValid(false);
                return false;
            }

            setError("");
            setIsValid(true);
            return true;
        } catch (e) {
            console.error(e);
            setError("Error validating Groq key");
            setIsValid(false);
            return false;
        } finally {
            setIsChecking(false);
        }
    };

    const handleSave = () => {
        if (isValid) {
            setGroqKey(tempKey);
        }
    };

    const handleCancel = () => {
        setTempKey(groqkey);
        setError("");
        setIsValid(!!groqkey);
    };

    const handleRemove = () => {
        setGroqKey("");
        setTempKey("");
        setIsValid(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="groqkey">
                        Groq API Key (get it from{" "}
                        <a
                            href="https://console.groq.com/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            Groq Cloud
                        </a>
                        )
                    </Label>
                    <Input
                        id="groqkey"
                        value={tempKey}
                        onChange={(e) => {
                            setTempKey(e.target.value);
                            setIsValid(false);
                            setError("");
                        }}
                        placeholder="gsk_..."
                    />
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="flex justify-between space-x-2">
                {groqkey && (
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
                            onClick={() => validateGroqKey(tempKey)}
                            disabled={!tempKey || isChecking}
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking
                                </>
                            ) : (
                                "Check Key"
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
