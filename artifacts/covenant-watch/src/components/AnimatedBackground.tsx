import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#070B14] overflow-hidden">
      <motion.div
        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[100px] opacity-15"
        style={{ background: "radial-gradient(circle, #6366f1, #8b5cf6)" }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full mix-blend-screen filter blur-[100px] opacity-10"
        style={{ background: "radial-gradient(circle, #06b6d4, #3b82f6)" }}
        animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full mix-blend-screen filter blur-[100px] opacity-12"
        style={{ background: "radial-gradient(circle, #8b5cf6, #a855f7)" }}
        animate={{ x: [0, 20, 0], y: [0, 25, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)", 
          backgroundSize: "40px 40px" 
        }} 
      />
    </div>
  );
}