"use client";

export default function LoginButton() {
  return (
    <a
      href="/auth/login?returnTo=/account"
      className="w-fit text-center px-5 py-2 bg-linear-to-tr from-green-700 hover:from-green-900 to-green-600 hover:to-green-700 hover:opacity-80 hover:scale-105 text-white hover:text-gray-100 font-medium hover:font-light rounded-full text-lg transition-all duration-200 flex self-center"
    >
      Login
    </a>
  );
}