import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Mail, MailOpen, Send, PenSquare, ArrowLeft } from "lucide-react";

interface EmailSummary {
  uid: string;
  from: string;
  subject: string;
  date: string;
  read: boolean;
}

interface EmailDetail {
  uid: string;
  headers: string;
  body: string;
}

export default function AdminSupportInbox() {
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mail", {
        body: { action: "fetch-inbox" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.messages ?? []) as EmailSummary[];
    },
  });

  const openEmail = async (uid: string) => {
    setLoadingUid(uid);
    try {
      const { data, error } = await supabase.functions.invoke("mail", {
        body: { action: "read-email", uid },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSelectedEmail(data.email as EmailDetail);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoadingUid(null);
    }
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    const fromMatch = selectedEmail.headers.match(/From:\s*(.+)/i);
    const subjectMatch = selectedEmail.headers.match(/Subject:\s*(.+)/i);
    setComposeTo(fromMatch?.[1]?.trim() || "");
    setComposeSubject("Re: " + (subjectMatch?.[1]?.trim() || ""));
    setComposeBody("");
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      toast({ title: "Error", description: "To and Subject are required.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("mail", {
        body: { action: "send-email", to: composeTo, subject: composeSubject, body: composeBody },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sent", description: "Email sent successfully." });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedEmail && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedEmail(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-xl font-display font-bold">Support Inbox</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeOpen(true); }}>
              <PenSquare className="h-4 w-4 mr-2" /> Compose
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedEmail ? (
          /* Email detail view */
          <Card>
            <CardContent className="p-6 space-y-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono border-b border-border pb-4">
                {selectedEmail.headers}
              </pre>
              <pre className="text-sm whitespace-pre-wrap font-sans">{selectedEmail.body}</pre>
              <div className="pt-4 border-t border-border">
                <Button size="sm" onClick={handleReply}>
                  <Send className="h-4 w-4 mr-2" /> Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Email list */
          <Card>
            <ScrollArea className="max-h-[70vh]">
              {!messages?.length ? (
                <div className="p-8 text-center text-muted-foreground">No emails found. Configure IMAP in Mail Settings.</div>
              ) : (
                <div className="divide-y divide-border">
                  {messages.map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => openEmail(m.uid)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                      disabled={loadingUid === m.uid}
                    >
                      {loadingUid === m.uid ? (
                        <Loader2 className="h-4 w-4 mt-1 animate-spin text-muted-foreground shrink-0" />
                      ) : m.read ? (
                        <MailOpen className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                      ) : (
                        <Mail className="h-4 w-4 mt-1 text-primary shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm truncate ${m.read ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                          {m.from}
                        </div>
                        <div className={`text-sm truncate ${m.read ? "text-muted-foreground" : "text-foreground"}`}>
                          {m.subject}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{m.date}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        )}
      </div>

      {/* Compose Modal */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={8} placeholder="Write your message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
