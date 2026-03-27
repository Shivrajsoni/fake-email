import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const EmailsPage = lazy(() =>
  import("./pages/EmailsPage").then((m) => ({ default: m.EmailsPage }))
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-zinc-400 text-sm">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/emails" element={<EmailsPage />} />
      </Routes>
    </Suspense>
  );
}
