import { useState } from "react";
import API from "../api/api";
import { setAuthToken } from "../api/authHelper";
import logo from "../assets/logo.png";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      setAuthToken(res.data.accessToken);
      window.location.href = "/admin/dashboard";
    } catch {
      alert("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f2] p-6">

      {/* CARD */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-fadeIn">

        {/* LOGO */}
        <div className="flex justify-center mb-3">
          <img src={logo} alt="Logo" className="h-20 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900">
          Admin Login
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Your Trusted Screening Partner
        </p>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              className="w-full p-3 border rounded-lg border-gray-300 
                         focus:ring-2 focus:ring-green-600 focus:border-green-600"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="mb-4 relative">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Password
            </label>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              className="w-full p-3 pr-12 border rounded-lg border-gray-300
                         focus:ring-2 focus:ring-green-600 focus:border-green-600"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {/* Eye toggle */}
            <button
              type="button"
              className="absolute top-10 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                /* eye-off */
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"
                     fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 3l18 18M9.88 9.88a3.25 3.25 0 014.24 4.24M6.1 6.1A10.02 10.02 0 0112 3c4.22 0 8.07 2.61 9.93 6.5M17.9 17.9A10.02 10.02 0 0112 21c-4.22 0-8.07-2.61-9.93-6.5" />
                </svg>
              ) : (
                /* eye-on */
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"
                     fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5S18.75 19.5 12 19.5 2.25 12 2.25 12z" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-lg font-semibold text-white 
                       bg-gradient-to-r from-green-700 to-green-500 
                       shadow-md hover:shadow-lg hover:brightness-110 transition"
          >
            Login
          </button>
        </form>

        {/* Branding footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Made with <span className="text-red-500">❤️</span> by{" "}
          <a
            href="https://code2crown.com"
            className="font-semibold text-green-700 hover:underline"
            target="_blank"
          >
            Code 2 Crown
          </a>
        </div>
      </div>

      {/* Animation */}
      <style>
        {`
          .animate-fadeIn {
            animation: fadeIn .8s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

    </div>
  );
}
