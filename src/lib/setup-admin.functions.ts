import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function adminExists(): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export const checkAdminExists = createServerFn({ method: "GET" }).handler(async () => {
  return { hasAdmin: await adminExists() };
});

const schema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
});

export const createInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    if (await adminExists()) {
      throw new Error("An admin already exists");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert(
      { user_id: uid, full_name: data.full_name, phone: data.phone, email: data.email },
      { onConflict: "user_id" }
    );
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true };
  });
