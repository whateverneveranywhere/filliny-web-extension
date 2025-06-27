import { HomePage } from "../containers";
import { HashRouter, Route, Routes } from "react-router-dom";

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
