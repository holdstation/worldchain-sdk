import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";

const HomePage = lazy(() => import("./pages/home"));
const HistoryPage = lazy(() => import("./pages/history"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route element={<HomePage />}></Route>
          <Route path="history" element={<HistoryPage />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
