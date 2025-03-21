import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "../containers";

function RouterProvider() {
  return (
    <HashRouter future={{ v7_startTransition: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </HashRouter>
  );
}

export default RouterProvider;
