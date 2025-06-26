import { NavLink } from "react-router";
import React, { useState } from "react";

const Navbar = () => {
  return (
    <nav className="bg-[#323437] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img
            src="logo.svg"
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
      </div>
    </nav>
  );
};

export default Navbar;
