import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, Send, Image as ImageIcon, Video, Calendar, Facebook, Instagram, X } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";
import { format } from "date-fns";
import { AiGenerateButton } from "@/components/admin/AiGenerateButton";

type Target = "facebook" | "instagram" | "both";
type Mode = "now" | "schedule";
type MediaType = "image" | "video";

const minScheduleLocal = () => {
  const d = new Date(Date.now() + 21 * 60 * 1000);
  return format(d, "yyyy-MM-dd'T'HH:mm");
};
const maxScheduleLocal = () => {
  const d = new Date(Date.now() + 74 * 24 * 60 * 60 * 1000);
  return format(d, "yyyy-MM-dd'T'HH:mm");
};

export default function AdminSocialPoster() {
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [target, setTarget] = useState<Target>("both");
  const [mode, setMode] = useState<Mode>("now");
  const [scheduledAt, setScheduledAt] = useState(minScheduleLocal());
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("mediaUrl");
    const c = params.get("caption");
    if (u) { setMediaUrl(u); setMediaType(/\.(mp4|mov|webm)$/i.test(u) ? "video" : "image"); }
    if (c) setCaption(c);
  }, []);

  const { data: history } = useQuery({
    queryKey: ["social-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const result = await uploadToStorage(file, "social");
      setMediaUrl(result.url);
      setMediaType(isVideo ? "video" : "image");
      toast.success("Media uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        caption, mediaUrl, mediaType, target, mode,
        scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      };
      const { data, error } = await supabase.functions.invoke("social-media-poster", { body: payload });
      if (error) throw error;
      if (!data?.success && data?.errors?.length) throw new Error(data.errors.join(" | "));
      return data;
    },
    onSuccess: (data) => {
      toast.success(mode === "schedule" ? "Post scheduled" : "Post published", {
        description: data.fb_post_id || data.ig_post_id ? `IDs: ${data.fb_post_id} ${data.ig_post_id}` : undefined,
      });
      setCaption(""); setMediaUrl("");
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    },
    onError: (err: any) => toast.error("Publish failed", { description: err.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { data, error } = await supabase.functions.invoke("social-media-poster", {
        body: { action: "cancel", rowId },
      });
      if (error) throw error;
      if (data?.errors?.length && !data?.success) throw new Error(data.errors.join(" | "));
      return data;
    },
    onSuccess: () => {
      toast.success("Scheduled post cancelled");
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    },
    onError: (err: any) => toast.error("Cancel failed", { description: err.message }),
  });

  const canSubmit = mediaUrl && caption && !publishMutation.isPending;

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold">Social Media Poster</h2>
          <p className="text-sm text-muted-foreground">Publish to Facebook Page & Instagram Business</p>
        </div>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Caption</Label>
                  <AiGenerateButton
                    type="social_caption"
                    payload={{
                      platform: target,
                      target,
                      mediaType,
                      topic: caption.trim() || undefined,
                    }}
                    onResult={(result) => setCaption(result.replace(/^```[a-z]*\n?|\n?```$/g, "").trim())}
                    label="Generate caption"
                  />
                </div>
                <Textarea
                  rows={5}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your post caption... (or type a brief topic and click Generate)"
                />
              </div>

              <div className="space-y-2">
                <Label>Media (image or video)</Label>
                {mediaUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    {mediaType === "video"
                      ? <Video className="h-5 w-5 text-muted-foreground" />
                      : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-sm truncate flex-1">{mediaUrl}</span>
                    <Button variant="ghost" size="sm" onClick={() => setMediaUrl("")}>Remove</Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="text-sm">{uploading ? "Uploading..." : "Click to upload image or video"}</span>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                )}
                <Input
                  placeholder="Or paste a public media URL"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Select value={target} onValueChange={(v) => setTarget(v as Target)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Facebook + Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook only</SelectItem>
                      <SelectItem value="instagram">Instagram only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Media type</Label>
                  <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video / Reel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>When</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="now" /> Post now
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="schedule" /> Schedule
                  </label>
                </RadioGroup>
              </div>

              {mode === "schedule" && (
                <div className="space-y-2">
                  <Label>Scheduled time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minScheduleLocal()}
                    max={maxScheduleLocal()}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta requires schedule time to be 20 minutes – 75 days from now.
                  </p>
                </div>
              )}

              <Button onClick={() => publishMutation.mutate()} disabled={!canSubmit} className="w-full" size="lg">
                {publishMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
                  : <><Send className="h-4 w-4" /> {mode === "schedule" ? "Schedule Post" : "Publish Now"}</>}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {(history || []).length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm">No posts yet.</Card>
            ) : (history || []).map((p: any) => (
              <Card key={p.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "failed" ? "destructive" : p.status === "scheduled" ? "secondary" : "default"}>
                    {p.status}
                  </Badge>
                  {p.target.includes("facebook") || p.target === "both" ? <Facebook className="h-3.5 w-3.5" /> : null}
                  {p.target.includes("instagram") || p.target === "both" ? <Instagram className="h-3.5 w-3.5" /> : null}
                  {p.scheduled_at && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.scheduled_at).toLocaleString()}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap line-clamp-3">{p.caption}</p>
                {p.error && <p className="text-xs text-destructive">{p.error}</p>}
                {p.status === "scheduled" && (
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Cancel this scheduled post? This will delete it from Meta.")) {
                          cancelMutation.mutate(p.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      className="gap-1.5"
                    >
                      {cancelMutation.isPending && cancelMutation.variables === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                      Cancel scheduled
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
