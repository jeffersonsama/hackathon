import { Search as SearchIcon, User, BookOpen, Users, FileText, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useSearch } from '@/hooks/use-search';

const categoryTabs = [
  { id: 'all', label: 'Tout' },
  { id: 'people', label: 'Personnes' },
  { id: 'courses', label: 'Cours' },
  { id: 'groups', label: 'Groupes' },
  { id: 'exams', label: 'Épreuves' },
  { id: 'events', label: 'Événements' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(q);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const newQ = searchParams.get('q') || '';
    setSearchQuery(newQ);
  }, [searchParams]);

  const { data: results, isLoading } = useSearch(searchQuery, activeCategory);

  const allResults = results ? [
    ...(results.people || []).map((p: any) => ({
      id: p.user_id, type: 'person', title: p.full_name,
      subtitle: p.department || 'Étudiant', avatar: p.avatar_url,
      link: `/profile/${p.user_id}`,
    })),
    ...(results.courses || []).map((c: any) => ({
      id: c.id, type: 'course', title: c.title,
      subtitle: c.category || 'Cours', link: `/courses/${c.id}`,
    })),
    ...(results.groups || []).map((g: any) => ({
      id: g.id, type: 'group', title: g.name,
      subtitle: `${g.group_members?.[0]?.count || 0} membres`, link: `/groups/${g.id}`,
    })),
    ...(results.exams || []).map((e: any) => ({
      id: e.id, type: 'exam', title: e.title,
      subtitle: `${e.matiere || ''} · ${e.annee || ''}`.trim().replace(/^·|·$/, ''), link: `/exams`,
    })),
    ...(results.events || []).map((e: any) => ({
      id: e.id, type: 'event', title: e.title,
      subtitle: e.start_time ? new Date(e.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '',
      link: `/calendar`,
    })),
  ] : [];

  const typeIcon: Record<string, { icon: any; color: string }> = {
    person:  { icon: User,     color: 'bg-blue-50 text-blue-500' },
    course:  { icon: BookOpen, color: 'bg-purple-50 text-primary-600' },
    group:   { icon: Users,    color: 'bg-green-50 text-green-500' },
    exam:    { icon: FileText, color: 'bg-amber-50 text-amber-500' },
    event:   { icon: Calendar, color: 'bg-rose-50 text-rose-500' },
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-xl font-bold text-foreground mb-3">Recherche</h1>
          <div className="relative group">
            <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Étudiants, cours, groupes, événements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-secondary border border-border rounded-full text-[14px] font-medium text-foreground placeholder:text-muted-foreground focus:bg-card focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

{/* Category tabs - only show when searching */}
        {searchQuery.length >= 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 px-4 mt-2">
            {categoryTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeCategory === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : searchQuery.length >= 2 && allResults.length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Aucun résultat pour "{searchQuery}"</p>
            <p className="text-sm text-gray-500 mt-1">Essayez avec d'autres mots-clés.</p>
          </div>
        ) : allResults.length > 0 ? (
          <div className="space-y-3 mt-4">
            {allResults.map((item: any, i: number) => {
              const iconData = typeIcon[item.type] || typeIcon.person;
              const IconComponent = iconData.icon;
              
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => navigate(item.link)}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-secondary", iconData.color)}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.length < 2 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Commencez à taper pour rechercher</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Étudiants, cours, groupes, épreuves...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}