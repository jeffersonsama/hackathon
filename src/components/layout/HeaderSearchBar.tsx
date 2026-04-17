import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, BookOpen, Users, X } from "lucide-react";
import { useQuickSearch } from "@/hooks/use-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function HeaderSearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading } = useQuickSearch(debouncedQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setOpen(false);
    }
  };

  const handleSelect = (item: any) => {
    setQuery("");
    setOpen(false);
    if (item.type === "person") navigate(`/profile/${item.id}`);
    else if (item.type === "course") navigate(`/courses/${item.id}/learn`);
    else if (item.type === "group") navigate(`/groups/${item.id}`);
  };

  const iconMap: Record<string, React.ReactNode> = {
    person: <User className="w-4 h-4" />,
    course: <BookOpen className="w-4 h-4" />,
    group: <Users className="w-4 h-4" />,
  };

  const labelMap: Record<string, string> = {
    person: "Personne",
    course: "Cours",
    group: "Groupe",
  };

  return (
    <div ref={ref} className="relative max-w-xs flex-1 hidden md:block">
      <form onSubmit={handleSubmit}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
        <input
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-8 py-2 rounded-lg bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 text-sm border-0 outline-none focus:bg-primary-foreground/20 transition-colors"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-primary-foreground/60 hover:text-primary-foreground" />
          </button>
        )}
      </form>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground text-center">Recherche...</div>
          )}

          {!isLoading && results && results.length > 0 && (
            <div className="py-1">
              {results.map((item: any, i: number) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {item.avatar ? (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(item.title || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : iconMap[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle || labelMap[item.type]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && (!results || results.length === 0) && (
            <div className="p-4 text-sm text-muted-foreground text-center">Aucun résultat</div>
          )}

          <button
            onClick={handleSubmit as any}
            className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-border text-sm text-primary hover:bg-secondary transition-colors"
          >
            <Search className="w-4 h-4" />
            Rechercher « {query} » partout
          </button>
        </div>
      )}
    </div>
  );
}
