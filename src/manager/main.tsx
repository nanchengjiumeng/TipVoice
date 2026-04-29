import { createRoot } from "react-dom/client";
import { ManagerApp } from "./ManagerApp.tsx";
import "../app.css";

createRoot(document.getElementById("root")!).render(<ManagerApp />);
