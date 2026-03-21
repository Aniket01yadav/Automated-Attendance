import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('token'));
    }, [location.pathname]);

    useEffect(() => {
        const syncAuthState = () => setIsLoggedIn(!!localStorage.getItem('token'));
        window.addEventListener('storage', syncAuthState);
        return () => window.removeEventListener('storage', syncAuthState);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setMenuOpen(false);
        navigate('/login');
    };

    return (
        <>
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-blue-800 font-bold text-2xl hover:cursor-pointer">
                                <a href="/">Attendance System</a>
                            </span>
                        </div>

                        {/* Hamburger menu button (mobile) */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                type="button"
                                className="text-blue-800 hover:text-blue-600 focus:outline-none focus:text-blue-400"
                                aria-label="Toggle menu"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {menuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>

                        {/* Desktop menu */}
                        <div className="hidden md:block">
                            <ul className="ml-10 flex items-baseline space-x-4 nav-links">
                                <li>
                                    <Link to="/" className="text-black px-3 py-2 rounded-md text-18 font-medium hover:text-blue-700">
                                        Home
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/about" className="text-black px-3 py-2 rounded-md text-18 font-medium hover:text-blue-700">
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/contact" className="text-black px-3 py-2 rounded-md text-18 font-medium hover:text-blue-700">
                                        Contact
                                    </Link>
                                </li>
                                <li>
                                    {isLoggedIn ? (
                                        <button
                                            onClick={handleLogout}
                                            className="text-white px-3 py-2 rounded-md text-18 font-medium bg-red-600 hover:bg-red-700"
                                        >
                                            Logout
                                        </button>
                                    ) : (
                                        <Link to="/login" className="text-white px-3 py-2 rounded-md text-18 font-medium bg-[#0e86d4] hover:bg-blue-700">
                                            Login/Registration
                                        </Link>
                                    )}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden px-2 pt-2 pb-3 space-y-1 bg-[#003060]">
                        <Link to="/" className="block text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700">
                            Home
                        </Link>
                        <Link to="/about" className="block text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700">
                            About
                        </Link>
                        <Link to="/contact" className="block text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700">
                            Contact
                        </Link>
                        {isLoggedIn ? (
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left text-white px-3 py-2 rounded-md text-base font-medium bg-red-600 hover:bg-red-700"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                onClick={() => setMenuOpen(false)}
                                className="block text-white px-3 py-2 rounded-md text-base font-medium bg-[#0e86d4] hover:bg-blue-700"
                            >
                                Login/Registration
                            </Link>
                        )}
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
