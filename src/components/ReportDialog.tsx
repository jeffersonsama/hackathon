import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REASONS = [
  "Contenu inapproprié",
  "Harcèlement ou intimidation",
  "Informations fausses",
  "Spam",
  "Autre",
];

interface Props {
  open: boolean;
  onClose: () => void;
  contentType: "post" | "comment" | "profile";
  contentId: string;
}

export default function ReportDialog({ open, onClose, contentType, contentId }: Props) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!reason) { toast.error("Sélectionnez une raison"); return; }
    setLoading(true);
    const insert: any = {
      reporter_id: user!.id,
      reason,
      content_type: contentType,
      description: description || null,
    };
    if (contentType === "post") insert.reported_post_id = contentId;
    else if (contentType === "profile") insert.reported_user_id = contentId;

    const { error } = await supabase.from("reports").insert(insert);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signalement envoyé. Merci.");
    onClose();
    setReason(""); setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Signaler ce contenu</DialogTitle></DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
          {REASONS.map(r => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={r} />
              <Label htmlFor={r} className="text-sm cursor-pointer">{r}</Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea placeholder="Description optionnelle..." maxLength={300} value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>{loading ? "Envoi..." : "Envoyer le signalement"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
