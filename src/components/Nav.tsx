"use client"

import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React, { useState } from "react"
import AuthModal from "./AuthModal"

const Nav_Items = ["Home", "Bookings", "About Us", "Contact"]

function Nav() {
  const pathName = usePathname()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      {/* Navbar */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed left-1/2 top-3 z-50 w-[94%] -translate-x-1/2 rounded-full bg-[#0B0B0B] py-3 text-white shadow-[0_15px_50px_rgba(0,0,0,0.7)] md:w-[86%]"
      >

        <div className="mx-auto grid max-w-7xl grid-cols-3 items-center px-4 md:px-8">

          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="logo"
                width={44}
                height={44}
                priority
                className="object-contain"
              />
            </Link>
          </div>

          {/* Center Nav Links */}
          <div className="flex items-center justify-center gap-8">

            {Nav_Items.map((item, index) => {

              const href =
                item === "Home"
                  ? "/"
                  : `/${item.toLowerCase().replace(/\s+/g, "-")}`

              const active = href === pathName

              return (
                <Link
                  key={index}
                  href={href}
                  className={`relative text-sm font-medium transition-all duration-300 hover:text-white ${
                    active ? "text-white" : "text-white/60"
                  }`}
                >
                  {item}

                  {/* Active Line */}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-white"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Login Button */}
          <div className="flex justify-end">

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}

              onClick={() => setAuthOpen(true)}
              
              className="relative overflow-hidden rounded-full bg-white px-6 py-2 font-semibold text-black"
            >

              {/* Animated Glow Border */}
              <div className="absolute -inset-[2px] overflow-hidden rounded-full blur-[1px] brightness-125">
                <div className="absolute inset-[-100%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,#4285F4,#34A853,#FBBC05,#EA4335,#4285F4,#00E5FF,#FF00FF,#4285F4)]" />
              </div>

              {/* Inner Background */}
              <span className="absolute inset-[2px] rounded-full bg-white" />

              {/* Text */}
              <span className="relative z-10">
                Login
              </span>

            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  )
}

export default Nav