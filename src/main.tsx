import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./styles.css";
import { Shell } from "./components/Shell";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import SharePage from "./pages/SharePage";
import PrintPage from "./pages/PrintPage";
import PlayPage from "./pages/PlayPage";
import ResultPage from "./pages/ResultPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/walk/:id/edit", element: <EditorPage /> },
      { path: "/walk/:id/share", element: <SharePage /> },
      { path: "/walk/:id/leaderboard", element: <LeaderboardPage /> },
      { path: "/p/:id", element: <PlayPage /> },
      { path: "/p/:id/result/:submissionId", element: <ResultPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  // print view runs outside the shell chrome
  { path: "/walk/:id/print", element: <PrintPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
