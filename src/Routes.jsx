import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Home from "./pages/Home";
import { RouterProvider } from "react-router-dom";
import {LOGIN_ROUTE, RESULT_ROUTE} from "./constants/route";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ScorePage from "./modes/ScorePage";
import Account from "./pages/Account";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/account" element={<Account />} />
        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes