import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="rounded-lg bg-foreground flex items-center justify-center shadow-sm" style={{ width: size, height: size }}>
        <img src={logo} alt="Smarticketing" width={size - 10} height={size - 10} className="rounded-md" style={{ filter: "hue-rotate(220deg) saturate(1.4) brightness(1.4)" }} />
      </div>
      {withText && (
        <span className="font-display text-xl font-bold tracking-tight">
          Smarticketing<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  );
}
