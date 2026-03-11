import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  details: string = ""
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        // Escape commas, quotes, and newlines
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
