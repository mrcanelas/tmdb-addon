import { useState, useEffect, useCallback } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function MDBListIntegration() {
  const { mdblistkey, setMdblistkey, catalogs, setCatalogs } = useConfig();
  const [tempKey, setTempKey] = useState(mdblistkey || "");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const validateApiKey = useCallback(
    async (key: string): Promise<boolean> => {
      if (!key) {
        setIsValid(false);
        setError("");
        return false;
      }

      setIsChecking(true);
      try {
        const response = await fetch(
          `https://api.mdblist.com/lists/user?apikey=${key}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const lists = await response.json();

        const newCatalogs: Array<{
          id: string;
          type: string;
          name: string;
          enabled: boolean;
          showInHome: boolean;
        }> = [];

        for (const list of lists) {
          const type = list.mediatype === "movie" ? "movie" : "series";
          newCatalogs.push({
            id: `mdblist.${list.id}.${type}`,
            type,
            name: list.name,
            enabled: true,
            showInHome: false,
          });
        }

        setCatalogs([
          ...catalogs.filter((c) => !c.id.startsWith("mdblist.")),
          ...newCatalogs,
        ]);

        setError("");
        setIsValid(true);
        return true;
      } catch (error) {
        setError((error as Error).message || "Failed to validate API key");
        setIsValid(false);
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [catalogs, setCatalogs]
  );

  const handleSave = () => {
    if (isValid) {
      setMdblistkey(tempKey);
    }
  };

  const handleCancel = () => {
    setTempKey(mdblistkey || "");
    setError("");
    setIsValid(!!mdblistkey);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mdblistkey">
            MDBList API Key (get it from{" "}
            <a
              href="https://mdblist.com/preferences/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MDBList
            </a>
            )
          </Label>
          <Input
            id="mdblistkey"
            value={tempKey}
            onChange={(e) => {
              setTempKey(e.target.value);
              setIsValid(false);
              setError("");
            }}
            placeholder="Enter your MDBList API key"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <DialogClose asChild>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogClose>
        {isValid ? (
          <DialogClose asChild>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogClose>
        ) : (
          <Button
            onClick={() => validateApiKey(tempKey)}
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
  );
}
