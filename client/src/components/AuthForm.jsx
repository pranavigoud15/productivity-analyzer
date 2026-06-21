import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaUserGraduate,
} from "react-icons/fa";

function AuthForm({ title }) {
  const isLogin = title === "Login";

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!isLogin) {
        if (password !== confirmPassword) {
          alert("Passwords do not match");
          return;
        }

        const res = await API.post("/auth/signup", {
          name,
          email,
          password,
        });

        alert(res.data.message);
        navigate("/");
      } else {
        const res = await API.post("/auth/login", {
          email,
          password,
        });

        localStorage.setItem("token", res.data.token);

        alert("Login Successful");

        navigate("/dashboard");
      }
    } catch (error) {
      alert(
        error.response?.data?.message || "Something went wrong"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 overflow-hidden rounded-3xl shadow-2xl border border-white/10">
        <div className="hidden md:flex flex-col justify-center items-center bg-slate-950/50 backdrop-blur-xl p-10">
          <div className="bg-blue-600 p-6 rounded-full mb-6 shadow-lg">
            <FaUserGraduate className="text-6xl text-white" />
          </div>

          <h1 className="text-5xl font-bold text-white text-center">
            Student Productivity Analyzer
          </h1>

          <p className="text-slate-400 text-center mt-6 text-xl leading-10">
            Track Study Goals
            <br />
            Generate AI Roadmaps
            <br />
            Manage Notes & Tasks
            <br />
            Ace Every Semester
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl p-8 md:p-12 flex items-center">
          <div className="w-full">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-4 rounded-full shadow-lg">
                <FaUserGraduate className="text-4xl text-white" />
              </div>
            </div>

            <h2 className="text-4xl font-bold text-center text-white mb-2">
              {title}
            </h2>

            <p className="text-center text-slate-400 mb-8">
              Welcome to your productivity journey
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="relative">
                  <FaUser className="absolute left-4 top-4 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800/70 text-white p-3 pl-12 rounded-xl border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="relative">
                <FaEnvelope className="absolute left-4 top-4 text-slate-400" />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/70 text-white p-3 pl-12 rounded-xl border border-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-4 top-4 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/70 text-white p-3 pl-12 pr-12 rounded-xl border border-slate-700 outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {!isLogin && (
                <div className="relative">
                  <FaLock className="absolute left-4 top-4 text-slate-400" />

                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    className="w-full bg-slate-800/70 text-white p-3 pl-12 rounded-xl border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white font-semibold text-lg"
              >
                {isLogin ? "Login" : "Create Account"}
              </button>
            </form>

            <div className="text-center mt-6 text-slate-400">
              {isLogin ? (
                <>
                  New Student?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Create Account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;