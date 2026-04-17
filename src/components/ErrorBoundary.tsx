import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-warning mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Une erreur inattendue s'est produite.</h2>
          <p className="text-sm text-muted-foreground mb-4">Veuillez recharger la page pour continuer.</p>
          <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>Recharger la page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
