// A2.1 component lab: the real teacher components, unmodified, mounted with the same providers and
// QueryClient defaults as src/App.tsx, inside one element that can go fullscreen (#fs-host).
// The React Profiler around the HUD is the "test-only wrapper" of plan M7 - no source file changes.
import { Profiler, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Star } from "lucide-react";
import { StudentProfileProvider } from "@/contexts/StudentProfileContext";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LiveEngagementHUD } from "@/components/teacher/LiveEngagementHUD";
import { SkillButton } from "@/components/teacher/SkillButton";
import { RadialSkillMenu } from "@/components/teacher/RadialSkillMenu";
import { StudentActionPopover } from "@/components/shared/StudentActionPopover";

const w: any = window;
w.__hudCommits = [];
w.__taps = [];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000, gcTime: 5 * 60_000 } },
});

function LabSheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="lab-sheet-trigger" type="button" onClick={() => setOpen(true)}>Open sheet</button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetTitle>Lab sheet</SheetTitle>
          <SheetDescription>lab sheet body</SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LabBody() {
  const record = (...a: any[]) => w.__taps.push(a);
  return (
    <div id="fs-host" style={{ background: "#fff", minHeight: "100vh", overflow: "auto", padding: 16 }}>
      <button id="lab-fs" type="button" onClick={() => document.getElementById("fs-host")!.requestFullscreen()}>Enter fullscreen</button>
      <section id="lab-hud" style={{ marginTop: 12 }}>
        <Profiler id="hud" onRender={(_id, phase, actual) => w.__hudCommits.push({ phase, actual, t: performance.now() })}>
          <LiveEngagementHUD classId="c-0001" />
        </Profiler>
      </section>
      <section id="lab-skill" style={{ marginTop: 12 }}>
        <SkillButton icon={Star} label="Speaking" skill="speaking" onTap={record} />
      </section>
      <section id="lab-radial" style={{ marginTop: 12 }}>
        <RadialSkillMenu onSkillTap={record} onClose={() => {}} onReadingTheoryClick={() => {}} />
      </section>
      <section id="lab-sap" style={{ marginTop: 12 }}>
        <StudentActionPopover studentId="s-0002" studentName="Trần Bảo Châu" classId="c-0001" canManagePoints>
          <button id="sap-trigger" type="button">Open student actions</button>
        </StudentActionPopover>
      </section>
      <section id="lab-overlays" style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Popover>
          <PopoverTrigger asChild><button id="lab-popover-trigger" type="button">Open popover</button></PopoverTrigger>
          <PopoverContent><p>Lab popover body</p></PopoverContent>
        </Popover>
        <Select>
          <SelectTrigger id="lab-select-trigger" className="w-40"><SelectValue placeholder="Pick one" /></SelectTrigger>
          <SelectContent><SelectItem value="a">Lab option Alpha</SelectItem><SelectItem value="b">Lab option Beta</SelectItem></SelectContent>
        </Select>
        <Dialog>
          <DialogTrigger asChild><button id="lab-dialog-trigger" type="button">Open dialog</button></DialogTrigger>
          <DialogContent><DialogTitle>Lab dialog</DialogTitle><DialogDescription>lab dialog body</DialogDescription></DialogContent>
        </Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button id="lab-menu-trigger" type="button">Open menu</button></DropdownMenuTrigger>
          <DropdownMenuContent><DropdownMenuItem>Lab menu item</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <LabSheet />
        <Tooltip>
          <TooltipTrigger asChild><button id="lab-tip-trigger" type="button">Tooltip trigger</button></TooltipTrigger>
          <TooltipContent>Lab tooltip text</TooltipContent>
        </Tooltip>
      </section>
    </div>
  );
}

export function Lab() {
  return (
    <QueryClientProvider client={queryClient}>
      <StudentProfileProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <LabBody />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </StudentProfileProvider>
    </QueryClientProvider>
  );
}
