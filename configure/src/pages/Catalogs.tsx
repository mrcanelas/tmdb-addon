import { useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { baseCatalogs, authCatalogs, mdblistCatalogs, streamingCatalogs } from "@/data/catalogs";
import { 
  DndContext, 
  DragEndEvent, 
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors 
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableCatalogCard } from "@/components/SortableCatalogCard";

const CatalogColumn = ({
  title,
  catalogs,
  catalogConfigs,
  onCatalogChange,
  onDragEnd,
  sensors
}) => (
  <div className="flex flex-col gap-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter} 
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={catalogs.map((c) => `${c.id}-${c.type}`)}
        strategy={verticalListSortingStrategy}
      >
        {catalogs.map((catalog) => (
          <SortableCatalogCard
            key={`${catalog.id}-${catalog.type}`}
            id={`${catalog.id}-${catalog.type}`}
            catalog={catalog}
            name={catalog.name} 
            config={catalogConfigs[`${catalog.id}-${catalog.type}`]}
            onChange={(enabled, showInHome) => 
              onCatalogChange(catalog.id, catalog.type, enabled, showInHome)
            }
          />
        ))}
      </SortableContext>
    </DndContext>
  </div>
);

const Catalogs = () => {
  const { sessionId, mdblistkey, streaming, catalogs, setCatalogs } = useConfig();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  useEffect(() => {
    const allCatalogs = [
      ...baseCatalogs,
      ...(sessionId ? authCatalogs : []),
      ...(mdblistkey ? mdblistCatalogs : []),
      ...(streaming?.length
        ? streaming.flatMap((serviceId) => streamingCatalogs[serviceId] || [])
        : []),
    ];

    setCatalogs((prev) => {
      const existingIds = new Set(prev.map((c) => `${c.id}-${c.type}`));
      const newCatalogs = allCatalogs.filter(
        (c) => !existingIds.has(`${c.id}-${c.type}`)
      );

      return [
        ...prev,
        ...newCatalogs.map((c) => ({ 
          id: c.id, 
          type: c.type, 
          name: c.name, 
          enabled: false,
          showInHome: false 
        })),
      ];
    });
  }, [sessionId, mdblistkey, streaming]);

  const catalogConfigs = catalogs.reduce((acc, config) => {
    const key = `${config.id}-${config.type}`;
    acc[key] = {
      enabled: config.enabled,
      showInHome: config.showInHome,
    };
    return acc;
  }, {});

  const handleCatalogChange = (catalogId, type, enabled, showInHome) => {
    setCatalogs((prev) => {
      return prev.map((c) =>
        c.id === catalogId && c.type === type
          ? { ...c, enabled: enabled === true, showInHome }
          : c
      );
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCatalogs((prev) => {
      const oldIndex = prev.findIndex((c) => `${c.id}-${c.type}` === active.id);
      const newIndex = prev.findIndex((c) => `${c.id}-${c.type}` === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <main className="md:p-12 px-2 py-12">
      <div className="flex flex-col mb-6">
        <h1 className="text-xl font-semibold mb-1">Catalogs</h1>
        <p className="text-gray-500 text-sm">Manage the catalogs available in the addon.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CatalogColumn
          title="Movies"
          catalogs={catalogs.filter((c) => c.type === "movie")}
          catalogConfigs={catalogConfigs}
          onCatalogChange={handleCatalogChange}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        />
        <CatalogColumn
          title="TV Shows"
          catalogs={catalogs.filter((c) => c.type === "series")}
          catalogConfigs={catalogConfigs}
          onCatalogChange={handleCatalogChange}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        />
      </div>
    </main>
  );
};

export default Catalogs;