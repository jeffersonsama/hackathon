import { XCircle, Mail, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Rejected() {
  return (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-6 text-center border border-gray-100 ">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-red-100/50 p-8 border border-red-50">
        
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte non validé</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Nous sommes désolés, mais votre demande d'adhésion au réseau UPF-Connect a été déclinée par l'administration.
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            Besoin d'explications ?
          </h3>
          <p className="text-sm text-gray-600">
            Si vous pensez qu'il s'agit d'une erreur, vous pouvez contacter le service administratif de l'UPF muni de votre carte d'étudiant.
          </p>
        </div>

        <Link 
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Home className="w-5 h-5" />
          Retour à la page de connexion
        </Link>

      </div>
    </div>
  );
}
