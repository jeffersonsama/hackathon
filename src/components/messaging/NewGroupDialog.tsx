import { useState } from "react";
import { X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchUsers, useCreateGroupConversation } from "@/hooks/use-messages";
import { toast } from "sonner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (convId: string) => void;
}

export default function NewGroupDialog({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ userId: string; fullName: string; avatarUrl: string | null }[]>([]);
  const [groupName, setGroupName] = useState("");
  const { data: users } = useSearchUsers(query);
  const createGroup = useCreateGroupConversation();

  const toggle = (u: any) => {
    setSelected((prev) =>
      prev.find((s) => s.userId === u.user_id)
        ? prev.filter((s) => s.userId !== u.user_id)
        : [...prev, { userId: u.user_id, fullName: u.full_name, avatarUrl: u.avatar_url }]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 1) return;
    try {
      const conv = await createGroup.mutateAsync({ name: groupName.trim(), participantIds: selected.map((s) => s.userId) });
      onCreated(conv.id);
      handleClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClose = () => {
    setStep(1); setQuery(""); setSelected([]); setGroupName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{step === 1 ? "Sélectionner les membres" : "Détails du groupe"}</DialogTitle></DialogHeader>

        {step === 1 ? (
          <>
            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selected.map((s) => (
                  <Badge key={s.userId} variant="secondary" className="gap-1 pr-1">
                    {s.fullName}
                    <button onClick={() => toggle({ user_id: s.userId })}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <Input placeholder="Rechercher des membres..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="space-y-1 max-h-60 overflow-y-auto mt-2">
              {users?.map((u: any) => {
                const isSelected = selected.some((s) => s.userId === u.user_id);
                return (
                  <button key={u.user_id} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                    onClick={() => toggle(u)}>
                    <Avatar className="w-8 h-8">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium text-foreground">{u.full_name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <Button className="w-full mt-3" disabled={selected.length < 1} onClick={() => setStep(2)}>
              Suivant ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})
            </Button>
          </>
        ) : (
          <>
            <Input placeholder="Nom du groupe" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mb-2" />
            <p className="text-xs text-muted-foreground mb-3">{selected.length + 1} membres (vous inclus)</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {selected.map((s) => (
                <div key={s.userId} className="flex items-center gap-2 bg-secondary rounded-full pl-1 pr-3 py-1">
                  <Avatar className="w-6 h-6">
                    {s.avatarUrl && <AvatarImage src={s.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getInitials(s.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{s.fullName}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
              <Button className="flex-1" disabled={!groupName.trim()} onClick={handleCreate}>Créer le groupe</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
