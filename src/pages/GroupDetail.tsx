import { ChevronLeft, MoreVertical, Users, Info, Shield, MessageSquare, Plus, Check, Loader2, Hash } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDetail, useGroupMembers, useJoinGroup, useMyGroupMembership } from '@/hooks/use-groups';
import { toast } from 'sonner';

// Deterministic color from group name
const GROUP_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-red-400 to-rose-500',
  'from-purple-400 to-pink-500',
  'from-slate-400 to-slate-600',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-500',
];

function colorForGroup(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

function initialsFor(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: group, isLoading: isGroupLoading } = useGroupDetail(id!);
  const { data: members, isLoading: isMembersLoading } = useGroupMembers(id!);
  const { data: myMembership, isLoading: isMembershipLoading } = useMyGroupMembership(id!);
  const joinGroup = useJoinGroup();

  const isMember = !!myMembership;
  const memberCount = members?.length || 0;

  const handleJoin = () => {
    if (!id) return;
    joinGroup.mutate(id, {
      onSuccess: () => {
        toast.success("Vous avez rejoint le groupe !");
      },
      onError: (err: any) => {
        toast.error(err.message || 'Erreur lors de la rejoindre du groupe');
      }
    });
  };

  if (isGroupLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Hash className="w-16 h-16 text-gray-200" />
        <p className="font-bold text-gray-500">Groupe introuvable</p>
        <button onClick={() => navigate('/groups')} className="text-primary-600 font-bold hover:underline">← Retour aux groupes</button>
      </div>
    );
  }

  const color = colorForGroup(group.name);
  const initials = initialsFor(group.name);
  const coverBg = `bg-gradient-to-br ${color}`;

  const rules = (group as any).rules || [
    "Respect et bienveillance entre tous les membres.",
    "Pas de spam ou de contenu hors-sujet.",
    "Partage d'idées et entraide encouragés."
  ];

  return (
    <div className="flex flex-col h-auto min-h-screen w-full max-w-[420px] md:max-w-xl lg:max-w-2xl mx-auto border-x border-gray-100 bg-white animate-in fade-in duration-500 relative overflow-x-hidden pb-24 md:pb-0">

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <button onClick={() => navigate('/groups')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700">
                <ChevronLeft className="w-6 h-6" />
             </button>
             <h1 className="font-black text-gray-900 text-lg truncate max-w-[200px]">{group.name}</h1>
         </div>
         <button className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700">
             <MoreVertical className="w-5 h-5" />
         </button>
      </div>

      {/* Cover + Profile Card combined section */}
      <div className="relative px-5 pb-2">
        {/* Decorative Cover - outer is overflow-visible so avatar can hang below */}
        <div className="relative w-full mb-10">
           {/* Inner bg with rounded corners */}
           <div className={`h-28 md:h-36 w-full ${coverBg} rounded-2xl overflow-hidden`}>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_right,var(--tw-gradient-stops))] from-white to-transparent"></div>
           </div>
           {/* Floating Avatar - positioned relative to outer div */}
           <div className={`absolute -bottom-8 left-5 w-20 h-20 rounded-[20px] bg-linear-to-tr ${color} border-4 border-white shadow-lg flex items-center justify-center text-white font-black text-3xl z-10 overflow-hidden`}>
              {(group as any).avatar_url ? (
                <img src={(group as any).avatar_url} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
           </div>
        </div>

        {/* Profile Card (no negative margin needed) */}
        <div className="bg-white rounded-[24px] p-5 pt-12 shadow-xl shadow-gray-200/40 border border-gray-100">
           {/* Category Badge top-right */}
           <div className="flex justify-end mb-1 h-6">
              {(group as any).category && (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                    {(group as any).category}
                </span>
              )}
           </div>

           <h2 className="text-xl font-black text-gray-900">{group.name}</h2>

           <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-600">
                 <Users className="w-4 h-4 text-primary-600" />
                 {isMembersLoading ? '...' : memberCount} membres
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-600">
                 <Shield className="w-4 h-4 text-emerald-500" />
                 {group.is_public ? 'Public' : 'Privé'}
              </div>
           </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-5 mt-6 space-y-6 flex-1 pb-32">
         
         {/* About */}
         {group.description && (
           <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                 <Info className="w-4 h-4" />
                 À propos
              </h3>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <p className="text-sm leading-relaxed text-gray-600 font-medium whitespace-pre-wrap">
                    {group.description}
                 </p>
              </div>
           </section>
         )}

         {/* Rules */}
         <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
               <Shield className="w-4 h-4" />
               Règlement
            </h3>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
               {rules.map((rule: string, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                     <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                     </div>
                     <p className="text-sm font-medium text-gray-600 leading-relaxed">{rule}</p>
                  </div>
               ))}
            </div>
         </section>

      </div>
 
      {!isMembershipLoading && (
        <div className="sticky bottom-0 w-full bg-white p-4 border-t border-gray-100 shrink-0 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] z-20 md:pb-6 md:mb-0">
           {!isMember ? (
              <button 
                 onClick={handleJoin}
                 disabled={joinGroup.isPending}
                 className="w-full h-14 bg-primary-600 text-white cursor-pointer font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-800 transition-all shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {joinGroup.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Adhésion...</> : 'Rejoindre ce groupe'}
              </button>
           ) : (
              <button 
                 onClick={() => navigate(`/messages/group-${group.id}`)}
                 className="w-full h-14 bg-gray-900 text-white cursor-pointer font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md shadow-gray-900/20 active:scale-[0.98]"
              >
                 <MessageSquare className="w-5 h-5 text-gray-300" />
                 Ouvrir la discussion
              </button>
           )}
        </div>
      )}
    </div>
  );
}
