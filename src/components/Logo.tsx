import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo} alt="Smarticketing" width={size} height={size} className="rounded-lg" style={{ filter: "hue-rotate(220deg) saturate(1.4)" }} />
      {withText && (
        <span className="font-display text-xl font-bold tracking-tight">
          Pulse<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  );
}
