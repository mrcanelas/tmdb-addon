import { IntegrationCard } from "@/components/IntegrationCard";
import { integrations } from "@/data/integrations";

const Integrations = () => {
  return (
    <main className="px-12 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            id={integration.id}
            name={integration.name}
            icon={integration.icon}
            description={integration.description}
          />
        ))}
      </div>
    </main>
  );
};

export default Integrations;