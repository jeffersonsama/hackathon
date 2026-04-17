import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useCertificateData } from "@/hooks/use-student-data";
import { Skeleton } from "@/components/ui/skeleton";
import logoUpf from "@/assets/logo-upf.png";

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCertificateData(id);

  if (isLoading) return <div className="p-12 text-center"><Skeleton className="h-[600px] max-w-2xl mx-auto" /></div>;
  if (error || !data) return <div className="p-12 text-center text-muted-foreground">Certificat introuvable</div>;
  if (!data.completed) return <div className="p-12 text-center text-muted-foreground">Ce cours n'est pas encore terminé.</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="print:hidden mb-6">
        <Button onClick={() => window.print()} className="bg-gradient-primary text-primary-foreground">
          <Printer className="w-4 h-4 mr-2" /> Imprimer / Télécharger PDF
        </Button>
      </div>

      <div className="w-full max-w-2xl bg-card border-2 border-primary/20 rounded-xl p-12 space-y-8 text-center print:border-primary print:shadow-none certificate-page">
        <img src={logoUpf} alt="UPF-Connect" className="h-16 w-auto mx-auto" />
        <p className="text-sm text-muted-foreground tracking-widest uppercase">UPF-Connect</p>

        <div className="py-4 border-t border-b border-border space-y-2">
          <h1 className="text-3xl font-bold text-primary">Certificat de réussite</h1>
        </div>

        <div className="space-y-4 py-6">
          <p className="text-lg text-muted-foreground">Ce certificat atteste que</p>
          <p className="text-3xl font-bold text-foreground">{data.studentName}</p>
          <p className="text-lg text-muted-foreground">a complété avec succès le cours</p>
          <p className="text-2xl font-bold text-foreground">« {data.courseTitle} »</p>
          {data.quizAverage > 0 && (
            <p className="text-muted-foreground">avec un score moyen de <strong className="text-foreground">{data.quizAverage}%</strong> aux évaluations</p>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground pt-4 border-t border-border">
          <p>Date de complétion : {data.completedAt ? new Date(data.completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
          <p>Cours dispensé par : <strong className="text-foreground">{data.teacherName}</strong></p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-page, .certificate-page * { visibility: visible; }
          .certificate-page { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
