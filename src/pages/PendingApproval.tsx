import { Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] relative animate-in zoom-in-95 duration-500 w-full max-w-[420px] md:max-w-md mx-auto items-center justify-center p-6 text-center ">
      
      {/* Visual Animation / Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-200 blur-2xl opacity-50 rounded-full animate-pulse"></div>
        <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center relative z-10 border-4 border-orange-50">
           <Clock className="w-10 h-10 text-orange-500" />
        </div>
      </div>

      {/* Copy */}
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Compte en attente</h1>
      <p className="text-gray-500 text-sm leading-relaxed mb-8 px-4">
        Votre demande d'inscription en tant que <strong>Professeur / Alumni</strong> a bien été reçue. Un administrateur doit valider votre compte avant que vous puissiez accéder à la plateforme.
      </p>

      {/* Illustration Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-full mb-8 ">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
               <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            </div>
            <div className="text-left">
               <h3 className="text-sm font-bold text-gray-900">Vérification en cours...</h3>
               <p className="text-xs text-gray-500">Cela prend généralement 24h.</p>
            </div>
         </div>
      </div>

      {/* Back Button */}
      <button 
         onClick={() => navigate('/login')}
         className="flex items-center justify-center gap-2 text-primary-600 font-bold text-sm bg-primary-50 py-3 px-6 rounded-xl hover:bg-primary-100 transition-colors w-full"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la connexion
      </button>

    </div>
  );
}
