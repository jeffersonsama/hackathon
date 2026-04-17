import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./hooks/use-theme";
import { initWebVitals } from "./lib/analytics";

initTheme();
createRoot(document.getElementById("root")!).render(<App />);
initWebVitals();
