import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  showText?: boolean;
  linkTo?: string;
}

const Logo = ({ className = "", showText = true, linkTo = "/" }: LogoProps) => {
  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-md">
        <span className="text-white font-bold text-xl">G</span>
      </div>
      {/* Text */}
      {showText && (
        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
          Grümpi
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{logoContent}</Link>;
  }

  return logoContent;
};

export default Logo;
