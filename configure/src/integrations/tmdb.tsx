import { useState, useEffect, useCallback } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function TMDB() {
  const { sessionId, setSessionId } = useConfig();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestToken = useCallback(async (requestToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/session_id?request_token=${requestToken}`);
      if (!response.ok) throw new Error('Failed to create session');
      
      const sessionId = await response.text();
      setSessionId(sessionId);
      
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.error(e);
      setError("Failed to create TMDB session");
    } finally {
      setIsLoading(false);
    }
  }, [setSessionId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');

    if (requestToken) {
      handleRequestToken(requestToken);
    }
  }, [handleRequestToken]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const uuid = crypto.randomUUID();
      const response = await fetch(`/request_token?cache_buster=${uuid}`);
      if (!response.ok) throw new Error('Failed to get request token');
      
      const requestToken = await response.text();
      const tmdbAuthUrl = `https://www.themoviedb.org/authenticate/${requestToken}?redirect_to=${window.location.href}`;
      window.location.href = tmdbAuthUrl;
    } catch (e) {
      console.error(e);
      setError("Failed to start TMDB authentication");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setSessionId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sessionId ? (
          <div className="flex flex-col items-center space-y-4">
            <Alert>
              <AlertDescription>
                You are logged in to TMDB
              </AlertDescription>
            </Alert>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </DialogClose>
          </div>
        ) : (
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to TMDB...
              </>
            ) : (
              'Login with TMDB'
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 