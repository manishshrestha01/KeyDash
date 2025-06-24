import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Home from "./pages/Home";
import { RouterProvider } from "react-router-dom";
import {LOGIN_ROUTE, RESULT_ROUTE} from "./constants/route";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path={LOGIN_ROUTE} element={<Login/>} />
        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes