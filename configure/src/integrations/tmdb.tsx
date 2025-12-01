import { useState, useEffect, useCallback, useRef } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function TMDB() {
  const { sessionId, setSessionId, saveConfigToStorage } = useConfig();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const popupCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRequestToken = useCallback(async (requestToken: string) => {
    setIsLoading(true);
    setError("");
    try {
      if (!requestToken || requestToken.trim() === '') {
        throw new Error('Invalid request token');
      }
      
      const response = await fetch(`/session_id?request_token=${encodeURIComponent(requestToken)}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to create session';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const sessionId = await response.text();
      
      // Verifica se a resposta é um JSON com erro
      if (sessionId.includes('"success":false') || sessionId.includes('status_message')) {
        try {
          const errorData = JSON.parse(sessionId);
          throw new Error(errorData.status_message || errorData.error || 'Failed to create session');
        } catch {
          // Se não for JSON válido, continua
        }
      }
      
      // Valida se o session ID não está vazio
      if (!sessionId || sessionId.trim() === '') {
        throw new Error('Empty session ID received');
      }
      
      setSessionId(sessionId);
      
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create TMDB session");
    } finally {
      setIsLoading(false);
    }
  }, [setSessionId]);

  useEffect(() => {
    // Escuta mensagens do popup OAuth
    const handleMessage = (event: MessageEvent) => {
      // Verifica a origem da mensagem por segurança
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'tmdb_oauth') {
        // Limpa o intervalo de verificação do popup
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        handleRequestToken(event.data.requestToken);
      } else if (event.data.type === 'oauth_error') {
        // Limpa o intervalo de verificação do popup
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        setError(event.data.errorDescription || event.data.error || 'Authentication failed');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: ainda verifica URL params caso não seja popup
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');

    if (requestToken && !window.opener) {
      handleRequestToken(requestToken);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleRequestToken]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const uuid = crypto.randomUUID();
      const response = await fetch(`/request_token?cache_buster=${uuid}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to get request token';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const requestToken = await response.text();
      
      // Valida se o token não está vazio
      if (!requestToken || requestToken.trim() === '') {
        throw new Error('Empty request token received');
      }
      
      // URL de callback para o popup
      const callbackUrl = `${window.location.origin}/configure/oauth-callback`;
      const tmdbAuthUrl = `https://www.themoviedb.org/authenticate/${requestToken}?redirect_to=${encodeURIComponent(callbackUrl)}`;
      
      // Abre popup para autenticação
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        tmdbAuthUrl,
        'TMDB Authentication',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Verifica se o popup foi bloqueado
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setIsLoading(false);
        setError('Popup bloqueado. Por favor, permita popups para este site.');
        return;
      }

      // Monitora se o popup foi fechado manualmente
      popupCheckIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
          setIsLoading(false);
        }
      }, 1000);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start TMDB authentication");
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