"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useRef, useState } from "react"

export default function SlideButton() {
  const constraintsRef = useRef(null)
  const x = useMotionValue(0)

  const [completed, setCompleted] = useState(false)

  const opacity = useTransform(x, [0, 220], [1, 0])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      
      <div
        ref={constraintsRef}
        className="relative w-[300px] h-[70px] bg-white/10 rounded-full overflow-hidden border border-white/20"
      >
        
        {/* Text */}
        <motion.span
          style={{ opacity }}
          className="absolute inset-0 flex items-center justify-center text-white font-semibold tracking-wide"
        >
          Slide to Book
        </motion.span>

        {/* Slider */}
        <motion.div
          drag="x"
          dragConstraints={constraintsRef}
          dragElastic={0}
          style={{ x }}
          whileTap={{ scale: 0.95 }}
          onDragEnd={() => {
            if (x.get() > 220) {
              setCompleted(true)
            } else {
              animate(x, 0)
            }
          }}
          className="absolute left-1 top-1 w-[62px] h-[62px] bg-white rounded-full flex items-center justify-center cursor-pointer shadow-xl"
        >
          <span className="text-black text-2xl">
            →
          </span>
        </motion.div>

        {/* Success State */}
        {completed && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-semibold bg-green-500">
            Booked ✓
          </div>
        )}
      </div>
    </div>
  )
}