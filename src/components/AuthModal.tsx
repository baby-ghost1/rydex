// "use client"

// import React, { useState } from "react"
// import { motion, AnimatePresence } from "motion/react"
// import { Lock, Mail, X } from "lucide-react"
// import Image from "next/image"

// type propType = {
//   open: boolean
//   onClose: () => void
// }

// type stepType = "login" | "signup" | "otp"

// function AuthModal({ open, onClose }: propType) {
//     const [step, setStep]=useState<stepType>("login")
//   return (
//     <AnimatePresence>
//       {open && (
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           onClick={onClose}
//           className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
//         >

//           <motion.div
//             initial={{ opacity: 0, scale: 0.95, y: 40 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.95, y: 30 }}
//             transition={{ duration: 0.35, ease: "easeOut" }}
//             className="fixed inset-0 z-[100] flex items-center justify-center px-4"
//           >

//             <div
//               onClick={(e) => e.stopPropagation()}
//               className="relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-[0_40px_100px_rgba(0,0,0,0.35)] p-6 sm:p-8 overflow-hidden"
//             >

//               {/* Glow */}
//               <div className="absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />

//               {/* Close Button */}
//               <button
//                 onClick={onClose}
//                 className="absolute right-4 top-4 text-gray-700 hover:text-black transition cursor-pointer z-20"
//               >
//                 <X size={30} />
//               </button>

//               {/* Content */}
//               <div className="relative z-10 flex flex-col items-center">

//                 {/* Logo */}
//                 <div className="mb-5">
//                   <Image
//                     src="/logo.png"
//                     alt="logo"
//                     width={70}
//                     height={70}
//                     priority
//                     className="object-contain"
//                   />
//                 </div>

//                 {/* Heading */}
//                 <h2 className="text-3xl font-bold text-black text-center">
//                   Welcome Back
//                 </h2>

//                 <p className="mt-2 text-sm text-gray-500 text-center">
//                   Continue your journey with us
//                 </p>

//                 {/* Google Button */}
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition hover:shadow-md"
//                 >

//                   {/* Google Logo Placeholder */}
//                   <Image
//                     src="/google.png"
//                     alt="google"
//                     width={50}
//                     height={40}
//                   />

//                   <span className="font-medium text-black">
//                     Continue with Google
//                   </span>
//                 </motion.button>

//                 <div className="">
//                     <div className=""/>
//                     <div className="">OR</div>
//                     <div className=""/>
//                 </div>

//                 <div>
//                     {step == "login" && (
//                     <motion.div>
//                         initial={{}}
//                         animate={{}}

//                         <div className="">
//                             <div className="">
//                                 <Mail className=""/>
//                                 <input type="text" placeholder="" className=""/>
//                             </div>

//                             <div className="">
//                                 <Lock className=""/>
//                                 <input type="text" placeholder="" className=""/>
//                             </div>

//                             <button className="">Login</button>
//                         </div>
//                         <p>Don't have account? <div onClick={() => setStep("signup")}
//                         className="">
//                             Signup</div></p>
//                     </motion.div>
//                 )}
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   )
// }

// export default AuthModal



"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Lock, Mail, User, X } from "lucide-react"
import Image from "next/image"

type propType = {
  open: boolean
  onClose: () => void
}

type stepType = "login" | "signup" | "otp"

function AuthModal({ open, onClose }: propType) {
  const [step, setStep] = useState<stepType>("login")

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
        >

          {/* Modal Wrapper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          >

            {/* Modal Card */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-[0_40px_100px_rgba(0,0,0,0.35)] sm:p-8"
            >

              {/* Glow */}
              <div className="absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-20 cursor-pointer text-gray-500 transition hover:text-black"
              >
                <X size={24} />
              </button>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">

                {/* Logo */}
                <Image
                  src="/logo.png"
                  alt="logo"
                  width={70}
                  height={70}
                  priority
                  className="object-contain"
                />

                {/* Heading */}
                <h2 className="mt-5 text-center text-3xl font-bold text-black">
                  {step === "login"
                    ? "Welcome Back"
                    : "Create Account"}
                </h2>

                <p className="mt-2 text-center text-sm text-gray-500">
                  {step === "login"
                    ? "Login to continue your journey"
                    : "Signup and start exploring"}
                </p>

                {/* Google Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
                >

                  <Image
                    src="/google.png"
                    alt="google"
                    width={24}
                    height={24}
                  />

                  <span className="font-medium text-black">
                    Continue with Google
                  </span>
                </motion.button>

                {/* Divider */}
                <div className="my-6 flex w-full items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />

                  <div className="text-sm font-medium text-gray-400">
                    OR
                  </div>

                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Forms */}
                <div className="w-full">

                  <AnimatePresence mode="wait">

                    {/* LOGIN */}
                    {step === "login" && (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >

                        {/* Email */}
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500 transition">
                          <Mail
                            className="text-gray-500"
                            size={20}
                          />

                          <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-transparent outline-none text-black placeholder:text-gray-400"
                          />
                        </div>

                        {/* Password */}
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500 transition">
                          <Lock
                            className="text-gray-500"
                            size={20}
                          />

                          <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-transparent outline-none text-black placeholder:text-gray-400"
                          />
                        </div>

                        {/* Button */}
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full rounded-2xl bg-black py-3 font-semibold text-white shadow-lg"
                        >
                          Login
                        </motion.button>

                        {/* Switch */}
                        <p className="text-center text-sm text-gray-500">
                          Don&apos;t have an account?{" "}

                          <span
                            onClick={() => setStep("signup")}
                            className="cursor-pointer font-semibold text-black transition hover:text-cyan-600"
                          >
                            Signup
                          </span>
                        </p>
                      </motion.div>
                    )}

                    {/* SIGNUP */}
                    {step === "signup" && (
                      <motion.div
                        key="signup"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >

                        {/* Name */}
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500 transition">
                          <User
                            className="text-gray-500"
                            size={20}
                          />

                          <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full bg-transparent outline-none text-black placeholder:text-gray-400"
                          />
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500 transition">
                          <Mail
                            className="text-gray-500"
                            size={20}
                          />

                          <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-transparent outline-none text-black placeholder:text-gray-400"
                          />
                        </div>

                        {/* Password */}
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500 transition">
                          <Lock
                            className="text-gray-500"
                            size={20}
                          />

                          <input
                            type="password"
                            placeholder="Create Password"
                            className="w-full bg-transparent outline-none text-black placeholder:text-gray-400"
                          />
                        </div>

                        {/* Button */}
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full rounded-2xl bg-black py-3 font-semibold text-white shadow-lg"
                        >
                          Create Account
                        </motion.button>

                        {/* Switch */}
                        <p className="text-center text-sm text-gray-500">
                          Already have an account?{" "}

                          <span
                            onClick={() => setStep("login")}
                            className="cursor-pointer font-semibold text-black transition hover:text-cyan-600"
                          >
                            Login
                          </span>
                        </p>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AuthModal