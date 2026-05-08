"use client"
import React from 'react'
import { motion } from "motion/react"
import { Bike, Bus, Car, Truck } from 'lucide-react'
import SlideButton from './SlideButton'

function HeroSection() {
  return (
    <div className='relative min-h-screen w-full overflow-hidden'>
        <div className='absolute inset-0 bg-cover bg-center' style={{backgroundImage: "url('/heroImage.jpg')"}}/>
        <div className='absolute inset-0 bg-black/70'/>
        <div className='relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center'>

        <motion.div  // add motion before to apply framer motion
        initial={{opacity: 0, y: 30}} //niche se upar
        animate={{opacity: 1, y: 0}}
        transition={{duration: 1}}
        
        className='text-white font-extrabold text-4xl   sm:text-5xl md:text-7xl'
        >
           Book Any Vehicle 
        </motion.div> 

        <motion.p
        initial={{opacity: 0, y: 30}} //niche se upar
        animate={{opacity: 1, y: 0}}
        transition={{delay: 1}}
        
        className='mt-4 max-w-xl text-gray-300'
        >
           From daily ride to heavy transport - all in one platform 
        </motion.p>

        <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1}}
        className='mt-8 flex gap-8 text-gray-300'>
            <Bike size={50}/>
            <Car size={50}/>
            <Bus size={50}/>
            <Truck size={50}/>
        </motion.div>

        
        {/* <SlideButton/> */}

        <div className="relative inline-block mt-12 group">
  
        {/* Glowing rotating border */}
        <div className="absolute -inset-[3px] rounded-full overflow-hidden blur-[1px] brightness-125">
        <div className="absolute inset-[-100%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,#4285F4,#34A853,#FBBC05,#EA4335,#4285F4,#00E5FF,#FF00FF,#4285F4)]" />
        </div>

        {/* Button */}
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-8 py-4 bg-white text-black rounded-full font-semibold shadow-xl cursor-pointer z-10"
        >
            Book Now
        </motion.button>
        </div>
        
        </div>
    </div>
  )
}

export default HeroSection