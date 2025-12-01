import { useEffect } from "react";

const OAuthCallback = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Envia mensagem para a janela pai (popup)
    if (window.opener && !window.opener.closed) {
      if (error) {
        window.opener.postMessage({
          type: 'oauth_error',
          error: error,
          errorDescription: errorDescription || 'Authentication failed'
        }, window.location.origin);
      } else if (requestToken) {
        window.opener.postMessage({
          type: 'tmdb_oauth',
          requestToken: requestToken
        }, window.location.origin);
      } else if (code) {
        window.opener.postMessage({
          type: 'trakt_oauth',
          code: code
        }, window.location.origin);
      }
      // Fecha a janela após enviar a mensagem
      window.close();
    } else {
      // Se não há janela pai, provavelmente foi aberto diretamente
      // Redireciona para a página de configuração (mantém os parâmetros para fallback)
      const currentUrl = window.location.href;
      if (currentUrl.includes('/oauth-callback')) {
        // Se está na página de callback, redireciona para /configure mantendo os params
        const params = window.location.search;
        window.location.href = `/configure${params}`;
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-lg text-gray-600">Processando autenticação...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

