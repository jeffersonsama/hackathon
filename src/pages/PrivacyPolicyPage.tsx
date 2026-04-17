import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function PrivacyPolicyPage() {
  usePageTitle("Politique de Confidentialité");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 19 mars 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Responsable du traitement</h2>
            <p>Le responsable du traitement des données personnelles est l'Université Privée de Fès (UPF). Pour toute question relative à la protection des données, vous pouvez contacter notre délégué à la protection des données (DPO) à l'adresse : <a href="mailto:dpo@upf.ac.ma" className="text-primary hover:underline">dpo@upf.ac.ma</a></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Données collectées</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données d'identification :</strong> nom complet, adresse email, photo de profil, département, rôle universitaire.</li>
              <li><strong>Données de contenu :</strong> publications, cours créés ou suivis, épreuves déposées, messages échangés, recommandations, compétences.</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur, horodatage des connexions (journaux système).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Finalités du traitement</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fourniture et fonctionnement du service académique UPF-Connect.</li>
              <li>Communication entre les membres de la communauté universitaire.</li>
              <li>Administration et modération de la plateforme.</li>
              <li>Amélioration continue des services et de l'expérience utilisateur.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Base légale du traitement</h2>
            <p>Le traitement des données repose sur l'exécution du contrat (acceptation des CGU lors de l'inscription) et sur l'intérêt légitime de l'établissement à fournir un réseau académique sécurisé à sa communauté.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Durée de conservation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données du compte :</strong> conservées pendant toute la durée de l'inscription, puis 1 an après la suppression du compte.</li>
              <li><strong>Journaux techniques :</strong> 90 jours maximum.</li>
              <li><strong>Messages :</strong> conservés pendant la durée de la conversation active.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Hébergement des données</h2>
            <p>Les données sont hébergées sur l'infrastructure Supabase (AWS eu-west-1, Dublin, Irlande), certifiée conforme au RGPD (Règlement Général sur la Protection des Données de l'Union Européenne).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Droits des utilisateurs</h2>
            <p>Conformément à la loi 09-08 relative à la protection des données personnelles au Maroc (CNDP) et au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes.</li>
              <li><strong>Droit d'effacement :</strong> demander la suppression de vos données (« droit à l'oubli »).</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et lisible.</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données dans certains cas.</li>
            </ul>
            <p>Pour exercer ces droits, contactez : <a href="mailto:privacy@upf.ac.ma" className="text-primary hover:underline">privacy@upf.ac.ma</a>. Délai de réponse : 30 jours ouvrables.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Cookies et stockage local</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cookie de session :</strong> authentification utilisateur (Supabase Auth).</li>
              <li><strong>localStorage :</strong> préférences d'interface (thème sombre, langue).</li>
              <li>Aucun cookie publicitaire ou de traçage tiers n'est utilisé.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Modifications de la politique</h2>
            <p>Toute modification substantielle de la présente politique fera l'objet d'une notification par email aux utilisateurs, au moins 30 jours avant son entrée en vigueur.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact et réclamations</h2>
            <p>Pour toute question : <a href="mailto:privacy@upf.ac.ma" className="text-primary hover:underline">privacy@upf.ac.ma</a></p>
            <p>Vous pouvez également adresser une réclamation à la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP) : <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cndp.ma</a></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2025 UPF-Connect — Université Privée de Fès
        </div>
      </div>
    </div>
  );
}
