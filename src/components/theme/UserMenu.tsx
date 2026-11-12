import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf } from "@/hooks/useIdentity";
import { useThemeChoice } from "@/components/theme/IvoryScope";
import type { ThemeChoice } from "@/lib/ivoryScope";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

const CHOICES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Same as this device", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * The account menu of the Ivory shell: who is signed in, the appearance
 * choice (System / Light / Dark, remembered for this person on this device)
 * and Sign out. Rendered only on migrated screens, where dark mode exists.
 */
export function UserMenu({
  name,
  role,
  avatarUrl,
  onSignOut,
}: {
  name: string;
  role: string | null;
  avatarUrl: string | null;
  onSignOut: () => void;
}) {
  const [choice, setChoice] = useThemeChoice();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={name ? `Account menu, signed in as ${name}` : "Account menu"}
        className={`inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-full text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken ${FOCUS}`}
      >
        <Avatar className="h-8 w-8 border border-hec-line">
          <AvatarImage src={avatarUrl || undefined} alt="" />
          <AvatarFallback className="bg-hec-sunken text-hec-caption font-medium text-hec-ink">
            {initialsOf(name) || "?"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        {name && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-2 font-normal">
              <span className="whitespace-normal break-words text-hec-body font-medium text-hec-ink">{name}</span>
              {role && <span className="text-hec-caption capitalize text-hec-ink-soft">{role}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel id="hec-appearance" className="px-3 pb-1 pt-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby="hec-appearance"
          value={choice}
          onValueChange={(v) => setChoice(v as ThemeChoice)}
        >
          {CHOICES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} onSelect={(e) => e.preventDefault()}>
              <Icon className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
