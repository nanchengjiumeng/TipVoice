import { createRoot } from "react-dom/client";
import { StorageApp } from "./StorageApp.tsx";
import "./storage.css";

createRoot(document.getElementById("root")!).render(<StorageApp />);
