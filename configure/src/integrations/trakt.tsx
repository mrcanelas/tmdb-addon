import { useState, useEffect, useCallback, useRef } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Trakt() {
  const { traktAccessToken, traktRefreshToken, setTraktAccessToken, setTraktRefreshToken, catalogs, setCatalogs, saveConfigToStorage } = useConfig();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const popupCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAccessToken = useCallback(async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      if (!code || code.trim() === '') {
        throw new Error('Código de autorização inválido');
      }
      
      const uuid = crypto.randomUUID();
      const response = await fetch(`/trakt_access_token?code=${encodeURIComponent(code)}&cache_buster=${uuid}`);
      
      if (!response.ok) {
        let errorMessage = 'Falha ao obter token de acesso';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const tokenData = await response.json();
      
      // Verifica se a resposta é um JSON com erro
      if (tokenData.error || tokenData.success === false) {
        throw new Error(tokenData.error || tokenData.status_message || 'Falha ao obter token de acesso');
      }
      
      // Valida se o access token não está vazio
      if (!tokenData.access_token || tokenData.access_token.trim() === '') {
        throw new Error('Token de acesso vazio recebido');
      }
      
      setTraktAccessToken(tokenData.access_token);
      if (tokenData.refresh_token) {
        setTraktRefreshToken(tokenData.refresh_token);
      }

      // Adiciona os catálogos do Trakt se ainda não existirem
      const traktCatalogsToAdd = [
        {
          id: "trakt.watchlist",
          type: "movie",
          name: "Trakt Watchlist",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.watchlist",
          type: "series",
          name: "Trakt Watchlist",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.recommendations",
          type: "movie",
          name: "Trakt Recommendations",
          enabled: true,
          showInHome: true
        },
        {
          id: "trakt.recommendations",
          type: "series",
          name: "Trakt Recommendations",
          enabled: true,
          showInHome: true
        }
      ];

      setCatalogs((prev) => {
        const existingIds = new Set(prev.map((c) => `${c.id}-${c.type}`));
        const newCatalogs = traktCatalogsToAdd.filter(
          (c) => !existingIds.has(`${c.id}-${c.type}`)
        );
        
        // Se já existem, apenas atualiza o enabled/showInHome para true
        const updatedCatalogs = prev.map((c) => {
          const traktCatalog = traktCatalogsToAdd.find(
            (tc) => tc.id === c.id && tc.type === c.type
          );
          if (traktCatalog) {
            return { ...c, enabled: true, showInHome: true };
          }
          return c;
        });
        
        return [...updatedCatalogs, ...newCatalogs];
      });

      toast({
        title: "Conta Trakt conectada",
        description: "Sua watchlist e recomendações foram sincronizadas.",
      });
      
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Falha ao conectar conta Trakt");
    } finally {
      setIsLoading(false);
    }
  }, [setTraktAccessToken, setTraktRefreshToken, setCatalogs]);

  useEffect(() => {
    // Escuta mensagens do popup OAuth
    const handleMessage = (event: MessageEvent) => {
      // Verifica a origem da mensagem por segurança
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'trakt_oauth') {
        // Limpa o intervalo de verificação do popup
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        handleAccessToken(event.data.code);
      } else if (event.data.type === 'oauth_error') {
        // Limpa o intervalo de verificação do popup
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
          popupCheckIntervalRef.current = null;
        }
        setError(event.data.errorDescription || event.data.error || 'Falha na autenticação');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: ainda verifica URL params caso não seja popup
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !window.opener) {
      handleAccessToken(code);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleAccessToken]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const uuid = crypto.randomUUID();
      const response = await fetch(`/trakt_auth_url?cache_buster=${uuid}`);
      
      if (!response.ok) {
        let errorMessage = 'Falha ao obter URL de autenticação';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Valida se a URL não está vazia
      if (!data.authUrl || data.authUrl.trim() === '') {
        throw new Error('URL de autenticação vazia recebida');
      }
      
      // O backend já gera a URL de autenticação com o redirect_uri correto (/configure/oauth-callback)
      // Não precisamos modificar a URL
      const finalAuthUrl = data.authUrl;
      
      // Abre popup para autenticação
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        finalAuthUrl,
        'Trakt Authentication',
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
      setError(e instanceof Error ? e.message : "Falha ao iniciar autenticação Trakt");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setTraktAccessToken("");
    setTraktRefreshToken("");
    
    // Remove os catálogos do Trakt
    setCatalogs((prev) => prev.filter((c) => !c.id.startsWith("trakt.")));

    toast({
      title: "Conta Trakt desconectada",
      description: "Sua conta Trakt foi desconectada com sucesso.",
    });
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

        {traktAccessToken ? (
          <div className="flex flex-col items-center space-y-4">
            <Alert>
              <AlertDescription>
                Você está conectado ao Trakt
              </AlertDescription>
            </Alert>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleLogout}>
                Desconectar
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
                Conectando ao Trakt...
              </>
            ) : (
              'Conectar com Trakt'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

