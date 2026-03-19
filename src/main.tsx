import { Amplify } from 'aws-amplify';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const amplifyOutputsModules = import.meta.glob('../amplify_outputs.json', {
  eager: true,
  import: 'default',
});

const amplifyOutputs = Object.values(amplifyOutputsModules)[0];

if (amplifyOutputs) {
  Amplify.configure(amplifyOutputs);
}

createRoot(document.getElementById("root")!).render(<App />);
