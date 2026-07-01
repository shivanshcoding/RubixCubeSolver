import { RiGithubFill, RiLinkedinFill, RiInstagramLine } from "react-icons/ri";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-surface-900/50 backdrop-blur-sm pt-4 pb-4 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Bio / Brand */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-amber-400">CubeVision</span>
              <span className="text-white/60 text-sm ml-1">AI</span>
            </span>
          </div>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            Designed and built by <span className="text-zinc-200 font-medium">Shivansh Rana</span>.
            Combining a passion for Rubik's Cubes, modern web engineering, and computer vision.
          </p>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/shivanshcoding"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:scale-110 transition-all duration-300"
            aria-label="GitHub"
          >
            <RiGithubFill className="w-5 h-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/shivanshranadtu/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#0a66c2] hover:bg-white/10 hover:scale-110 transition-all duration-300"
            aria-label="LinkedIn"
          >
            <RiLinkedinFill className="w-5 h-5" />
          </a>
          <a
            href="https://instagram.com/the_realshivansh"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#e1306c] hover:bg-white/10 hover:scale-110 transition-all duration-300"
            aria-label="Instagram"
          >
            <RiInstagramLine className="w-5 h-5" />
          </a>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto mt-8 pt-3 border-t border-white/5 text-center flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} CubeVision AI. All rights reserved.</p>
        <p>Built with ❤️ for the cubing community</p>
      </div>
    </footer>
  );
}
