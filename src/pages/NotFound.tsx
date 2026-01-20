import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-open">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 font-raleway">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-honey-gold hover:text-honey-amber underline font-medium">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
