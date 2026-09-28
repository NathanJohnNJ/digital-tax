"use client";
import { LogOut } from 'lucide-react';
import Typed from 'typed.js';
import { motion, hover } from 'motion/react';
import { useRef, useEffect, useState } from 'react';

export default function LogoutButton(props: any) {
  const ref = useRef(null);
  const el = useRef(null);
  const [typedElemenet, setTypedElement] = useState<any>();

  useEffect(()=>{
      return hover(ref.current, () => {
        const typed = new Typed(el.current, {
          strings: ['Logout'],
          typeSpeed: 100,
          backSpeed: 100,
          loop: true,
          loopCount: 1,
          onStringTyped: () => {typed.stop(); document.querySelector(".typed-cursor")!.classList.add("hidden")},
          // onComplete: () => typed.destroy()
        })
        setTypedElement(typed);
        typed.start()
  
        return () => {typed.start()};
      })
  }, [])

  function handleClick(){
    typedElemenet.destroy();
  }
  return (
    <div className="glow rounded-full">
      <motion.a
        ref={ref}
        href="/auth/logout"
        className="w-min group text-center flex items-center px-4 py-2.5 border-2 border-red-700/70 bg-linear-to-tr from-gray-300 to-gray-200 to-80% text-red-700 font-medium rounded-full text-[14px] transition-all duration-200 shadow-2xs hover:shadow-2xl hover:scale-105 hover:to-gray-50 hover:to-60% inner"
        style={props.style}
        onClick={handleClick} onMouseLeave={handleClick}
      >
        <LogOut /><span ref={el} className="flex transition-all duration-300 origin-left"></span>
      </motion.a>
    </div>
  );
}