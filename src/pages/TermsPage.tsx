import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TermsPage() {
  usePageTitle("Conditions Générales d'Utilisation");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-muted-foreground mb-8">UPF-Connect — Réseau Social Académique · Dernière mise à jour : 19 mars 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold">Article 1 — Objet</h2>
            <p>Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») définissent les règles d'accès et d'utilisation de la plateforme UPF-Connect, un réseau social académique privé édité par l'Université Privée de Fès (UPF). UPF-Connect est réservé exclusivement aux étudiants, professeurs, alumni et personnels administratifs de l'UPF. Son but est de faciliter la communication, la collaboration et le partage de ressources académiques au sein de la communauté universitaire.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 2 — Accès à la plateforme</h2>
            <p>L'accès à UPF-Connect est conditionné à la création d'un compte utilisateur. Les étudiants doivent s'inscrire avec une adresse email universitaire @upf.ac.ma. Les professeurs, alumni et administrateurs font l'objet d'une validation manuelle par l'administration avant d'accéder à la plateforme. Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion. Toute utilisation du compte est présumée réalisée par le titulaire du compte.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 3 — Comportement des utilisateurs</h2>
            <p>Les utilisateurs s'engagent à respecter les règles suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ne pas publier de contenu à caractère discriminatoire, diffamatoire, injurieux ou menaçant.</li>
              <li>Ne pas harceler, intimider ou importuner d'autres membres de la communauté.</li>
              <li>Ne pas diffuser de contenu illégal, pornographique ou contraire aux bonnes mœurs.</li>
              <li>Ne pas usurper l'identité d'un autre utilisateur.</li>
              <li>Respecter les droits de propriété intellectuelle des tiers.</li>
              <li>Ne pas utiliser la plateforme à des fins commerciales ou de spam.</li>
            </ul>
            <p>Tout manquement à ces règles peut entraîner la suspension ou la suppression du compte par l'administration.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 4 — Contenu publié</h2>
            <p>L'utilisateur reste propriétaire du contenu qu'il publie sur UPF-Connect (publications, documents, épreuves, etc.). En publiant du contenu, l'utilisateur accorde à UPF-Connect une licence non exclusive et gratuite d'affichage, de stockage et de diffusion de ce contenu dans le cadre de la plateforme. L'administration se réserve le droit de modérer ou supprimer tout contenu jugé contraire aux présentes CGU ou aux règlements de l'UPF.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 5 — Données personnelles</h2>
            <p>Le traitement des données personnelles est décrit dans notre <Link to="/privacy-policy" className="text-primary hover:underline">Politique de Confidentialité</Link>. Conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel (CNDP), les utilisateurs disposent de droits d'accès, de rectification et de suppression de leurs données.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 6 — Responsabilité</h2>
            <p>UPF-Connect ne saurait être tenu responsable du contenu publié par les utilisateurs. La plateforme s'efforce d'assurer une disponibilité continue du service, sans garantie d'absence d'interruption. En cas de maintenance planifiée, les utilisateurs seront informés à l'avance par annonce officielle.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 7 — Modification des CGU</h2>
            <p>L'UPF se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront notifiés par email de toute modification substantielle. La poursuite de l'utilisation de la plateforme après notification vaut acceptation des nouvelles conditions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 8 — Droit applicable</h2>
            <p>Les présentes CGU sont régies par le droit marocain. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de Fès, Maroc.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Article 9 — Contact</h2>
            <p>Pour toute question relative aux présentes CGU, vous pouvez contacter l'administration à l'adresse suivante : <a href="mailto:admin@upf.ac.ma" className="text-primary hover:underline">admin@upf.ac.ma</a></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2025 UPF-Connect — Université Privée de Fès
        </div>
      </div>
    </div>
  );
}
