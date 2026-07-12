import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "ghost" | "outline" | "default" | "secondary" | "link";
  sidebarOpen?: boolean;
}

export function PWAInstallButton({ className, variant = "outline", sidebarOpen = true }: PWAInstallButtonProps) {
  const [supportsInstallElement, setSupportsInstallElement] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed and opened)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // 2. Check support for declarative <install> element
    if ("HTMLInstallElement" in window) {
      setSupportsInstallElement(true);
    }

    // 3. Listen to beforeinstallprompt event for fallback triggering
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 4. Listen to appinstalled event to hide the prompt immediately
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger prompt
    deferredPrompt.prompt();
    
    // Wait for response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Reset prompt variable
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // If already installed and running standalone, do not render
  if (isInstalled) return null;

  // If the browser supports <install> element
  if (supportsInstallElement) {
    return (
      <div className={cn("inline-block", className)}>
        <install 
          style={{
            display: "block",
            width: "100%",
            height: "100%"
          }}
        />
      </div>
    );
  }

  // Fallback: If PWA is installable (beforeinstallprompt fired), show the custom button
  if (!isInstallable) return null;

  return (
    <Button
      onClick={handleInstallClick}
      variant={variant}
      className={cn(
        "gap-2 transition-all duration-200",
        !sidebarOpen && "justify-center p-2 min-w-10",
        className
      )}
      title="Install Happy English App"
    >
      <Download className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-bounce" />
      {sidebarOpen && <span>Install App</span>}
    </Button>
  );
}
