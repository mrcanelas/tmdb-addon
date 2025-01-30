import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useConfig } from "@/contexts/ConfigContext";
import { DialogClose } from "@/components/ui/dialog";

const streamingServices = [
  { id: "nfx", name: "Netflix", icon: "/streaming/netflix.webp" },
  { id: "nfk", name: "Netflix Kids", icon: "/streaming/netflixkids.webp" },
  { id: "hbm", name: "HBO Max", icon: "/streaming/hbo.webp" },
  { id: "dnp", name: "Disney+", icon: "/streaming/disney.webp" },
  { id: "amp", name: "Prime Video", icon: "/streaming/prime.webp" },
  { id: "atp", name: "Apple TV+", icon: "/streaming/apple.webp" },
  { id: "pmp", name: "Paramount+", icon: "/streaming/paramount.webp" },
  { id: "pcp", name: "Peacock Premium", icon: "/streaming/peacock.webp" },
  { id: "hlu", name: "Hulu", icon: "/streaming/hulu.webp" },
  { id: "cts", name: "Curiosity Stream", icon: "/streaming/curiositystream.webp" },
  { id: "mgl", name: "MagellanTV", icon: "/streaming/magellan.webp" },
  { id: "cru", name: "Crunchyroll", icon: "/streaming/crunchyroll.webp" },
  { id: "hay", name: "Hayu", icon: "/streaming/hayu.webp" },
  { id: "clv", name: "Clarovideo", icon: "/streaming/claro.webp" },
  { id: "gop", name: "Globoplay", icon: "/streaming/globo.webp" },
  { id: "hst", name: "Hotstar", icon: "/streaming/hotstar.webp" },
  { id: "zee", name: "Zee5", icon: "/streaming/zee5.webp" },
  { id: "nlz", name: "NLZIET", icon: "/streaming/nlziet.webp" },
  { id: "vil", name: "Videoland", icon: "/streaming/videoland.webp" },
  { id: "sst", name: "SkyShowtime", icon: "/streaming/skyshowtime.webp" },
  { id: "blv", name: "BluTV", icon: "/streaming/blu.webp" },
  { id: "cpd", name: "Canal+", icon: "/streaming/canal-plus.webp" },
  { id: "dpe", name: "Discovery+", icon: "/streaming/discovery-plus.webp" }
];

const regions = {
  'United States': [
    'nfx', 'nfk', 'dnp', 'amp', 'atp', 'hbm', 'cru', 'pmp', 'mgl', 'cts', 'hlu', 'pcp', 'dpe'
  ],
  'Brazil': [
    'nfx', 'nfk', 'dnp', 'atp', 'amp', 'pmp', 'hbm', 'cru', 'clv', 'gop', 'mgl', 'cts'
  ],
  'India': [
    'hay', 'nfx', 'nfk', 'atp', 'amp', 'cru', 'zee', 'hst', 'mgl', 'cts', 'dpe'
  ],
  'Turkey': [
    'nfx', 'nfk', 'dnp', 'atp', 'amp', 'cru', 'blv', 'mgl', 'cts'
  ],
  'Netherlands': [
    'nfx', 'nfk', 'dnp', 'amp', 'atp', 'hbm', 'cru', 'hay', 'vil', 'sst', 'mgl', 'cts', 'nlz', 'dpe'
  ],
  'France': [
    'nfx', 'nfk', 'dnp', 'amp', 'atp', 'hbm', 'hay', 'cpd'
  ],
  'Any': [
    'nfx', 'nfk', 'dnp', 'amp', 'atp', 'hbm', 'pmp', 'hlu', 'pcp', 'clv', 'gop', 'blv',
    'zee', 'hst', 'hay', 'vil', 'sst', 'mgl', 'cts', 'cru', 'nlz', 'cpd', 'dpe'
  ]
};

export default function Streaming() {
  const [selectedCountry, setSelectedCountry] = useState("Brazil");
  const { streaming, setStreaming } = useConfig();
  const [tempSelectedServices, setTempSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    setTempSelectedServices(streaming);
  }, [streaming]);

  const toggleService = (serviceId: string) => {
    setTempSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const showProvider = (serviceId: string) => {
    return regions[selectedCountry as keyof typeof regions]?.includes(serviceId);
  };

  const handleSave = () => {
    setStreaming(tempSelectedServices);
  };

  const handleCancel = () => {
    setTempSelectedServices(streaming);
  };

  return (
    
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Based on <a href="https://github.com/rleroi/Stremio-Streaming-Catalogs-Addon" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">rleroi/Stremio-Streaming-Catalogs-Addon</a>
      </p>
      <div>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Filter providers by country:</p>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md">
                {Object.keys(regions).map((country) => (
                  <SelectItem 
                    key={country} 
                    value={country}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {streamingServices.map((service) => (
              showProvider(service.id) && (
                <button
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border transition-opacity ${
                    tempSelectedServices.includes(service.id)
                      ? "border-primary bg-primary/5"
                      : "border-border opacity-50 hover:opacity-100"
                  }`}
                  title={service.name}
                >
                  <img
                    src={service.icon}
                    alt={service.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                </button>
              )
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="button" onClick={handleSave}>
                Save Changes
              </Button>
            </DialogClose>
          </div>
        </div>
      </div>
    </div>
  );
}
