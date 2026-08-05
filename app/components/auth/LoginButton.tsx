"use client";

export default function LoginButton() {
  return (
    <a
      href="/auth/login"
      className="w-fit text-center px-5 py-2 bg-linear-to-tr from-slate-700 hover:from-slate-900 to-neutral-600 hover:to-neutral-700 hover:opacity-80 hover:scale-105 text-white hover:text-gray-300 font-medium hover:font-light rounded-full text-lg transition-all duration-200 flex self-center"
    >
      Login
    </a>
  );
}