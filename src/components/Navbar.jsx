import { NavLink } from "react-router";
import navMenu from "../constants/navMenu";
import React, { useState } from "react";

const Navbar = () => {
  // const navLinkClass = ({ isActive }) => (isActive ? "text-blue-700 " : "");

  // const [isMobileMenuHidden, setIsMobileMenuHidden] = useState(true);

  return (
    <nav className="bg-[#323437] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img
            src="public/logo.svg"
            className="h-10"
            alt="logo"
          />
          <span className="self-center text-3xl font-semibold whitespace-nowrap text-white">
            KeyDash
          </span>
        </a>
        <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          <button type="button">
            <NavLink
              to="/login"
              className="mt-1 ml-0 px-2 lg:px-5 lg:ml-20 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg py-2.5 text-center mb-2 block text-base cursor-pointer"
            >
              Login / Sign Up
            </NavLink>
          </button>
        </div>
        {/* <div
          className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${
            isMobileMenuHidden ? "hidden" : ""
          }`}
        >
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border  rounded-lg md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-[#323437] bg-[#323437]">
            {navMenu.map((menu) => (
              <li key={menu.route}>
                <NavLink to={menu.route} className={navLinkClass}>
                  {menu.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div> */}
      </div>
    </nav>
  );
};

export default Navbar;
