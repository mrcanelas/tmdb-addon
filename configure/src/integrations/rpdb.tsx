import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function RPDB() {
  const { rpdbkey, setRpdbkey } = useConfig();
  const [tempKey, setTempKey] = useState(rpdbkey);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setTempKey(rpdbkey);
    if (rpdbkey) {
      validateRPDBKey(rpdbkey);
    }
  }, [rpdbkey]);

  const validateRPDBKey = async (key: string) => {
    if (!key) {
      setIsValid(false);
      setError("");
      return false;
    }
    
    setIsChecking(true);
    try {
      const response = await fetch(`https://api.ratingposterdb.com/${key}/isValid`);
      const data = await response.json();
      
      if (!(data || {}).valid) {
        setError("RPDB Key is invalid, please try again");
        setIsValid(false);
        return false;
      }
      setError("");
      setIsValid(true);
      return true;
    } catch (e) {
      console.error(e);
      setError("Error validating RPDB key");
      setIsValid(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = () => {
    if (isValid) {
      setRpdbkey(tempKey);
    }
  };

  const handleCancel = () => {
    setTempKey(rpdbkey);
    setError("");
    setIsValid(rpdbkey ? true : false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rpdbkey">
            RPDB API Key (get it from{" "}
            <a
              href="https://ratingposterdb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RatingPosterDB
            </a>
            )
          </Label>
          <Input
            id="rpdbkey"
            value={tempKey}
            onChange={(e) => {
              setTempKey(e.target.value);
              setIsValid(false);
              setError("");
            }}
            placeholder="Enter your RPDB API key"
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
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogClose>
        ) : (
          <Button 
            onClick={() => validateRPDBKey(tempKey)}
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
  );
} 