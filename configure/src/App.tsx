import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./pages/Home";
import Catalogs from "./pages/Catalogs";
import Integrations from "./pages/Integrations";
import Others from "./pages/Others";
import NotFound from "./pages/NotFound";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfigProvider } from "@/contexts/ConfigContext";

const queryClient = new QueryClient();

type Page = "home" | "catalogs" | "integrations" | "others";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Home />;
      case "catalogs":
        return <Catalogs />;
      case "integrations":
        return <Integrations />;
      case "others":
        return <Others />;
      default:
        return <NotFound />;
    }
  };

  const isHome = currentPage === "home";

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={isOpen} 
        setIsOpen={setIsOpen} 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <div className="flex-1 flex flex-col md:pl-64 h-screen">
        {(!isHome || window.innerWidth < 768) && (
          <Header isOpen={isOpen} toggleSidebar={toggleSidebar} isHome={isHome} />
        )}
        <ScrollArea className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12">
          {renderPage()}
        </ScrollArea>
      </div>
    </div>
  );
};

const App = () => (
  <ConfigProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Layout>
          <Home />
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  </ConfigProvider>
);

export default App;