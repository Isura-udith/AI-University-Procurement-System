import { Link } from 'react-router-dom';
import { 
  FaShieldAlt, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaLock, 
  FaGlobe, 
  FaUniversity,
  FaExternalLinkAlt
} from 'react-icons/fa';
import uwuLogo from '../../assets/logos/Logo_uwu.jpg';

/**
 * Premium Reusable Footer component
 * @param {Object} props
 * @param {string} props.variant - 'public' | 'dashboard'
 * @param {string} props.theme - 'dark' | 'light'
 */
export default function Footer({ variant = 'public', theme = 'dark' }) {
  const currentYear = new Date().getFullYear();

  // Color mappings based on theme
  const styles = {
    dark: {
      bg: 'bg-[#0B1120] border-t border-slate-800/80',
      text: 'text-slate-400',
      title: 'text-white font-bold tracking-wide uppercase text-sm',
      border: 'border-slate-800/85',
      hoverLink: 'hover:text-emerald-400 transition-colors duration-250',
      contactVal: 'text-slate-300 font-mono',
      brandTitle: 'text-white',
      accentText: 'text-emerald-400',
      cardBg: 'bg-slate-900/50 border border-slate-800/80',
      badgeBg: 'bg-slate-900/80 border border-slate-800/80 text-slate-300'
    },
    light: {
      bg: 'bg-slate-50/70 backdrop-blur-md border-t border-slate-200/60',
      text: 'text-slate-600',
      title: 'text-slate-900 font-bold tracking-wide uppercase text-sm',
      border: 'border-slate-200/80',
      hoverLink: 'hover:text-emerald-600 transition-colors duration-250',
      contactVal: 'text-slate-700 font-mono',
      brandTitle: 'text-slate-900',
      accentText: 'text-emerald-600',
      cardBg: 'bg-white border border-slate-200/85 shadow-sm',
      badgeBg: 'bg-slate-100 border border-slate-200 text-slate-700'
    }
  }[theme] || styles.dark;

  if (variant === 'dashboard') {
    return (
      <footer className={`py-5 mt-auto ${theme === 'dark' ? 'bg-[#090d16] border-t border-slate-850' : 'bg-slate-50 border-t border-slate-200/60'} text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} print:hidden transition-all duration-300`}>
        <div className="max-w-8xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p>&copy; {currentYear} Uva Wellassa University. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <span className="hidden sm:inline text-slate-300/40">|</span>
            <span className="flex items-center font-medium">
              <FaShieldAlt className="text-emerald-500/80 mr-1.5" size={11} /> 
              GOSL Compliant v2.6
            </span>
            <span className="hidden sm:inline text-slate-300/40">|</span>
            <a href="mailto:procurement@uwu.ac.lk" className="hover:text-emerald-500 transition-colors">
              Helpdesk: procurement@uwu.ac.lk
            </a>
          </div>
        </div>
      </footer>
    );
  }

  // PUBLIC FULL FOOTER
  return (
    <footer className={`${styles.bg} pt-10 pb-6 print:hidden transition-all duration-300`}>
      <div className="max-w-8xl mx-auto px-4">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          
          {/* Column 1: Institution Info (5 cols span on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center space-x-3.5">
              <img 
                src={uwuLogo} 
                alt="UWU Logo" 
                className="w-11 h-11 object-contain rounded-full bg-white p-0.5 shadow-md border border-slate-200/50" 
              />
              <div>
                <h3 className={`text-xl font-extrabold tracking-tight ${styles.brandTitle}`}>
                  Uva Wellassa University
                </h3>
                <p className={`text-xs font-bold tracking-widest uppercase ${styles.accentText}`}>
                  Smart Procurement System
                </p>
              </div>
            </div>
            
            <p className={`${styles.text} text-sm leading-relaxed max-w-md`}>
              The official e-procurement platform of Uva Wellassa University of Sri Lanka. 
              Enforcing value for money, maximum transparency, and strict adherence to GOSL 
              Procurement Guidelines through modern digital workflows and AI intelligence.
            </p>

            {/* Compliance Badge / Trust Marks */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${styles.badgeBg}`}>
                <FaLock className="text-emerald-500" size={10} />
                <span>SSL Secured</span>
              </div>
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${styles.badgeBg}`}>
                <FaUniversity className="text-emerald-500" size={10} />
                <span>NPA Framework</span>
              </div>
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${styles.badgeBg}`}>
                <FaShieldAlt className="text-emerald-500" size={10} />
                <span>SL CERT Audited</span>
              </div>
            </div>
          </div>

          {/* Column 2: Navigation Links (2 cols span) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className={styles.title}>System Navigation</h4>
            <ul className={`space-y-2.5 text-sm ${styles.text} font-medium`}>
              <li>
                <Link to="/" className={styles.hoverLink}>
                  Home Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className={styles.hoverLink}>
                  Portal Sign In
                </Link>
              </li>
              <li>
                <Link to="/vendor-register" className={styles.hoverLink}>
                  Vendor Registration
                </Link>
              </li>
              <li>
                <a href="#active-tenders" className={styles.hoverLink}>
                  Procurement Notices
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Regulatory & Guidelines (2 cols span) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className={styles.title}>Regulatory Acts</h4>
            <ul className={`space-y-2.5 text-sm ${styles.text} font-medium`}>
              <li className="flex items-center space-x-1">
                <a href="http://www.treasury.gov.lk" target="_blank" rel="noopener noreferrer" className={`flex items-center ${styles.hoverLink}`}>
                  <span>Procurement Guidelines</span>
                  <FaExternalLinkAlt size={8} className="ml-1 opacity-70" />
                </a>
              </li>
              <li className="flex items-center space-x-1">
                <a href="#" className={`flex items-center ${styles.hoverLink}`}>
                  <span>Public Finance Act</span>
                  <FaExternalLinkAlt size={8} className="ml-1 opacity-70" />
                </a>
              </li>
              <li>
                <a href="#" className={styles.hoverLink}>
                  National Audits Guidelines
                </a>
              </li>
              <li>
                <a href="#" className={styles.hoverLink}>
                  Anti-Corruption Code
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Helpdesk (3 cols span) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className={styles.title}>Contact & Support</h4>
            <div className={`space-y-3.5 text-sm ${styles.text}`}>
              <div className="flex items-start space-x-2.5">
                <FaMapMarkerAlt className="text-emerald-500 shrink-0 mt-1" size={13} />
                <p className="leading-tight">
                  Procurement Division,<br />
                  Uva Wellassa University,<br />
                  Passara Road, Badulla
                </p>
              </div>
              <div className="flex items-center space-x-2.5">
                <FaEnvelope className="text-emerald-500 shrink-0" size={13} />
                <a href="mailto:procurement@uwu.ac.lk" className={styles.hoverLink}>
                  procurement@uwu.ac.lk
                </a>
              </div>
              <div className="flex items-center space-x-2.5">
                <FaPhone className="text-emerald-500 shrink-0" size={13} />
                <span className={styles.contactVal}>+94 55 222 6622</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <FaGlobe className="text-emerald-500 shrink-0" size={13} />
                <a href="https://www.uwu.ac.lk" target="_blank" rel="noopener noreferrer" className={styles.hoverLink}>
                  www.uwu.ac.lk
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className={`pt-8 mt-8 border-t ${styles.border} flex flex-col md:flex-row justify-center items-center text-xs ${styles.text} font-medium gap-4`}>
          <div className="flex items-center space-x-2"> 
            <p>&copy; {currentYear} Uva Wellassa University of Sri Lanka. All rights reserved.</p>
          </div>
        </div>

      </div>
    </footer>
  );
}
