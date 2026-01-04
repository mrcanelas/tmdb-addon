import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RPDBMediaTypes } from "@/contexts/config";

export default function RPDB() {
  const { rpdbkey, setRpdbkey, rpdbMediaTypes, setRpdbMediaTypes } = useConfig();
  const [tempKey, setTempKey] = useState(rpdbkey);
  const [tempMediaTypes, setTempMediaTypes] = useState<RPDBMediaTypes>(rpdbMediaTypes);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setTempKey(rpdbkey);
    setTempMediaTypes(rpdbMediaTypes);
    if (rpdbkey) {
      validateRPDBKey(rpdbkey).then((valid) => {
        if (valid) {
          setIsValid(true);
        }
      });
    } else {
      setIsValid(false);
    }
  }, [rpdbkey, rpdbMediaTypes]);

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
      setRpdbMediaTypes(tempMediaTypes);
    }
  };

  const handleCancel = () => {
    setTempKey(rpdbkey);
    setTempMediaTypes(rpdbMediaTypes);
    setError("");
    setIsValid(rpdbkey ? true : false);
  };

  const handleMediaTypeChange = (type: keyof RPDBMediaTypes) => {
    setTempMediaTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleRemove = () => {
    setRpdbkey("");
    setRpdbMediaTypes({ poster: true, logo: false, backdrop: false });
    setTempKey("");
    setTempMediaTypes({ poster: true, logo: false, backdrop: false });
    setIsValid(false);
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

        {isValid && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">
              RPDB Media Types
            </Label>
            <p className="text-sm text-muted-foreground">
              Select which media types you want to use from RPDB:
            </p>
            <div className="space-x-3 flex">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rpdb-poster"
                  checked={tempMediaTypes.poster}
                  onChange={() => handleMediaTypeChange("poster")}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rpdb-poster" className="font-normal cursor-pointer">
                  Poster
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rpdb-logo"
                  checked={tempMediaTypes.logo}
                  onChange={() => handleMediaTypeChange("logo")}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rpdb-logo" className="font-normal cursor-pointer">
                  Logo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rpdb-backdrop"
                  checked={tempMediaTypes.backdrop}
                  onChange={() => handleMediaTypeChange("backdrop")}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rpdb-backdrop" className="font-normal cursor-pointer">
                  Backdrop
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between space-x-2">
        {rpdbkey && (
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
    </div>
  );
} 