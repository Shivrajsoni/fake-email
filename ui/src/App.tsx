import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const EmailsPage = lazy(() =>
  import("@/pages/EmailsPage").then((m) => ({ default: m.EmailsPage })),
);

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-zinc-400 text-sm">
      Loading…
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/emails" element={<EmailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
