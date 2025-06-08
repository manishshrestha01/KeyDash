import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import ProductList from "./pages/products/List";
import Contact from "./pages/Contact";
import { RouterProvider } from "react-router-dom";
import { ABOUT_ROUTE, CONTACT_ROUTE, LOGIN_ROUTE, PRODUCTS_ROUTE, REGISTER_ROUTE } from "./constants/route";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path={ABOUT_ROUTE} element={<About />} />
            <Route path={CONTACT_ROUTE} element={<Contact />} />
            <Route path={PRODUCTS_ROUTE} element={<ProductList />} />
            <Route path={LOGIN_ROUTE} element={<Login/>} />
            <Route path={REGISTER_ROUTE} element={<Register />} />
        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes