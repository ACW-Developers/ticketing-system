import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Sun, Moon, Bell, Shield, CreditCard } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

function Settings() {
  const { theme, toggle } = useTheme();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <SettingsIcon className="h-6 w-6 text-primary" />
      </div>

      <Row icon={theme === "light" ? Sun : Moon} title="Appearance" desc={`Currently using ${theme} mode`}>
        <Button variant="outline" onClick={toggle}>
          Switch to {theme === "light" ? "dark" : "light"}
        </Button>
      </Row>

      <Row icon={Bell} title="Notifications" desc="Email and in-app alerts for new orders">
        <Button variant="outline" disabled>Configure</Button>
      </Row>

      <Row icon={Shield} title="Security" desc="Password and two-factor authentication">
        <Button variant="outline" disabled>Manage</Button>
      </Row>

      <Row icon={CreditCard} title="Payment provider" desc="Stripe is connected in sandbox mode">
        <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-medium">Connected</span>
      </Row>
    </div>
  );
}

function Row({ icon: Icon, title, desc, children }: any) {
  return (
    <div className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground truncate">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
