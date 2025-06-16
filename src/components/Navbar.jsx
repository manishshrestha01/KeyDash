import { NavLink } from "react-router";
import navMenu from "../constants/navMenu";
import React, { useState } from "react";

const Navbar = () => {
  const navLinkClass = ({ isActive }) => (isActive ? "text-blue-700 " : "");

  const [isMobileMenuHidden, setIsMobileMenuHidden] = useState(true);

  return (
    <nav className="bg-white border-gray-200  border-b-2">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img
            src="src/images/logo.svg"
            className="h-8"
            alt="logo"
          />
          <span className="self-center text-2xl font-semibold whitespace-nowrap text-black">
            KeyDash
          </span>
        </a>
        <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
        <button
            type="button"
            className="text-black bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br shadow-lg shadow-blue-500/50 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 "
          >
            <NavLink to="/login" className="text-white">
              Login
            </NavLink>
          </button>
          <button
            type="button"
            className="text-black bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br shadow-lg shadow-blue-500/50 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 "
          >
            <NavLink to="/register" className="text-white">
              Sign Up
            </NavLink>
          </button>
          <button
            onClick={() => setIsMobileMenuHidden(!isMobileMenuHidden)}
            data-collapse-toggle="navbar-cta"
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden  focus:outline-none focus:ring-2   hover:bg-gray-200 focus:ring-gray-500"
            aria-controls="navbar-cta"
            aria-expanded="false"
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 17 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M1 1h15M1 7h15M1 13h15"
              />
            </svg>
          </button>
        </div>
        <div
          className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${
            isMobileMenuHidden ? "hidden" : ""
          }`}
         
        >
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border  rounded-lg  md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white bg-gray-100  border-gray-700">
            {navMenu.map((menu) => (
              <li key={menu.route}>
                <NavLink to={menu.route} className={navLinkClass}>
                  {menu.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
