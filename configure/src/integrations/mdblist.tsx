import { useState, useEffect, useCallback } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function MDBListIntegration() {
  const { mdblistkey, setMdblistkey, catalogs, setCatalogs } = useConfig();
  const [tempKey, setTempKey] = useState(mdblistkey || "");
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [customListUrl, setCustomListUrl] = useState("");

  const validateApiKey = useCallback(
    async (key: string): Promise<boolean> => {
      if (!key) {
        setIsValid(false);
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

        const newCatalogs = lists.map((list) => ({
          id: `mdblist.${list.id}.${list.mediatype === "movie" ? "movie" : "series"}`,
          type: list.mediatype === "movie" ? "movie" : "series",
          name: list.name,
          enabled: true,
          showInHome: true,
        }));

        setCatalogs([
          ...catalogs.filter((c) => !c.id.startsWith("mdblist.")),
          ...newCatalogs,
        ]);

        setIsValid(true);
        return true;
      } catch (error) {
        const message = (error as Error).message || "Failed to validate API key";
        toast({
          title: "Failed to validate API key",
          description: message,
        });
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
    setIsValid(!!mdblistkey);
  };

  const handleAddCustomList = async () => {
    try {
      const path = new URL(customListUrl).pathname;
      const listName = path.replace('/lists/', '');
      if (!listName) {
        throw new Error("Invalid URL");
      }

      const response = await fetch(
        `https://api.mdblist.com/lists/${listName}?apikey=${tempKey}`
      );
      if (!response.ok) {
        throw new Error("Error fetching list");
      }

      const [list] = await response.json();
      const type = list.mediatype === "movie" ? "movie" : "series";

      const newCatalog = {
        id: `mdblist.${list.id}.${type}`,
        type,
        name: list.name,
        enabled: true,
        showInHome: true,
      };

      setCatalogs((prev) => {
        if (prev.some((c) => c.id === newCatalog.id)) return prev;
        return [...prev, newCatalog];
      });

      toast({
        title: "List added",
        description: `The list "${list.name}" has been added successfully.`,
      });

      setCustomListUrl("");
    } catch (err) {
      const message = (err as Error).message || "Error adding list";
      toast({
        title: "Error adding list",
        description: message,
      });
    }
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
            }}
            placeholder="Enter your MDBList API key"
          />
        </div>
      </div>

      {isValid && (
        <div className="flex flex-col space-y-4">
          <div className="space-x-2 justify-between flex items-end">
            <div className="space-y-4 flex flex-col w-full">
              <Label htmlFor="customListUrl">
                Add list by URL (Ex:{" "}
                <a
                  href="https://mdblist.com/lists/garycrawfordgc/latest-tv-shows"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://mdblist.com/lists/username/list-name
                </a>
                )
              </Label>
              <Input
                id="customListUrl"
                value={customListUrl}
                onChange={(e) => {
                  setCustomListUrl(e.target.value);
                }}
                placeholder="Paste MDBList list URL here"
              />
            </div>
            <Button onClick={handleAddCustomList} variant="outline">
              Add List
            </Button>
          </div>
        </div>
      )}

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
