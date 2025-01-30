import { Switch } from "@/components/ui/switch";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { integrations } from "@/data/integrations";
import { baseCatalogs, authCatalogs, streamingCatalogs, type Catalog } from "@/data/catalogs";
import { type CatalogConfig } from "@/contexts/config";

const getIntegrationInfo = (catalogId: string) => {
  const [integrationId] = catalogId.split(".");
  const integration = integrations.find(i => i.id === integrationId);
  
  return integration || { 
    id: integrationId,
    name: integrationId.toUpperCase(),
    icon: "/default.svg",
    description: "Unknown integration"
  };
};

const CatalogCard = ({ catalog, config, onChange }: { 
  catalog: Catalog; 
  config?: { enabled: boolean; showInHome: boolean };
  onChange: (enabled: boolean, showInHome: boolean) => void;
}) => {
  const isEnabled = config?.enabled ?? true;
  const showInHome = config?.showInHome ?? true;
  const integration = getIntegrationInfo(catalog.id);

  const handleEnableChange = (checked: boolean) => {
    onChange(checked, checked ? showInHome : false);
  };

  const handleShowInHomeChange = (checked: boolean) => {
    onChange(isEnabled, checked);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
          <h1 className="font-semibold flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-md p-1">
                  <img 
                  src={integration.icon} 
                  alt={`${integration.name} logo`} 
                    className="w-full h-full object-contain"
                  />
              </div>
              {catalog.name}
              <Badge variant="outline">
                {catalog.type === "movie" ? "Filme" : "Série"}
              </Badge>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Enable</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleEnableChange}
            />
            <span className={`text-sm ${!isEnabled ? "text-muted-foreground/50" : "text-muted-foreground"}`}>Home</span>
            <Switch
              checked={showInHome}
              onCheckedChange={handleShowInHomeChange}
              disabled={!isEnabled}
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const CatalogColumn = ({ 
  title, 
  catalogs,
  catalogConfigs,
  onCatalogChange 
}: { 
  title: string; 
  catalogs: Catalog[];
  catalogConfigs: Record<string, { enabled: boolean; showInHome: boolean }>;
  onCatalogChange: (catalogId: string, type: "movie" | "series", enabled: boolean, showInHome: boolean) => void;
}) => (
  <div className="flex flex-col gap-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    {catalogs.map((catalog) => (
      <CatalogCard 
        key={`${catalog.id}-${catalog.type}`} 
        catalog={catalog}
        config={catalogConfigs[`${catalog.id}-${catalog.type}`]}
        onChange={(enabled, showInHome) => onCatalogChange(catalog.id, catalog.type, enabled, showInHome)}
      />
    ))}
  </div>
);

const Catalogs = () => {
  const { sessionId, streaming, catalogs, setCatalogs } = useConfig();

  // Combina todos os catálogos que devem ser mostrados
  const getAllCatalogs = () => {
    let allCatalogs = [...baseCatalogs];

    // Adiciona catálogos que requerem autenticação se houver sessionId
    if (sessionId) {
      allCatalogs = [...allCatalogs, ...authCatalogs];
    }

    // Adiciona catálogos de streaming selecionados
    if (streaming?.length) {
      const selectedStreamingCatalogs = streaming.flatMap(serviceId => 
        streamingCatalogs[serviceId] || []
      );
      allCatalogs = [...allCatalogs, ...selectedStreamingCatalogs];
    }

    return allCatalogs;
  };

  // Converte os catálogos para um objeto de configuração
  const catalogConfigs = catalogs.reduce((acc, config) => {
    acc[`${config.id}-${config.type}`] = {
      enabled: config.enabled,
      showInHome: config.showInHome
    };
    return acc;
  }, {} as Record<string, { enabled: boolean; showInHome: boolean }>);

  const handleCatalogChange = (catalogId: string, type: "movie" | "series", enabled: boolean, showInHome: boolean) => {
    setCatalogs((prev: CatalogConfig[]) => {
      // Remove a configuração anterior se existir
      const filtered = prev.filter(c => !(c.id === catalogId && c.type === type));
      
      // Adiciona a nova configuração
      const newConfig: CatalogConfig = { id: catalogId, type, enabled, showInHome };
      return [...filtered, newConfig];
    });
  };

  const allCatalogs = getAllCatalogs();
  const movieCatalogs = allCatalogs.filter(catalog => catalog.type === "movie");
  const seriesCatalogs = allCatalogs.filter(catalog => catalog.type === "series");

  // Inicializa as configurações dos catálogos quando necessário
  useEffect(() => {
    const allCatalogIds = allCatalogs.map(c => `${c.id}-${c.type}`);
    const configuredIds = catalogs.map(c => `${c.id}-${c.type}`);
    
    // Encontra catálogos que não têm configuração
    const unconfigured = allCatalogs.filter(c => 
      !configuredIds.includes(`${c.id}-${c.type}`)
    );

    if (unconfigured.length > 0) {
      // Adiciona configurações padrão para catálogos não configurados
      setCatalogs((prev: CatalogConfig[]) => [
        ...prev,
        ...unconfigured.map(c => ({
          id: c.id,
          type: c.type,
          enabled: true,
          showInHome: true
        } as CatalogConfig))
      ]);
    }
  }, [allCatalogs.length]);

  return (
    <main className="p-12">
      <div className="flex flex-col mb-6">
        <h1 className="text-xl font-semibold mb-1">Catalogs</h1>
        <p className="text-gray-500 text-sm">Manage the catalogs available in the addon.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CatalogColumn 
          title="Movies" 
          catalogs={movieCatalogs} 
          catalogConfigs={catalogConfigs}
          onCatalogChange={handleCatalogChange}
        />
        <CatalogColumn 
          title="TV Shows" 
          catalogs={seriesCatalogs}
          catalogConfigs={catalogConfigs}
          onCatalogChange={handleCatalogChange}
        />
      </div>
    </main>
  );
};

export default Catalogs;