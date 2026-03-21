import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Not authorized" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};



export const allowPrincipal = (req, res, next) => {
    return allowRoles("Principal", "Admin")(req, res, next);
};

export const allowRoles = (...roles) => {
    return (req, res, next) => {
        const userRole = String(req.user?.role || "").toLowerCase();
        const allowed = roles.map((r) => String(r).toLowerCase());

        // Principal is treated as the admin role in this project.
        const mappedUserRole = userRole === "principal" ? "admin" : userRole;

        if (allowed.includes(userRole) || allowed.includes(mappedUserRole)) {
            return next();
        }

        return res.status(403).json({ error: "Access denied - insufficient role" });
    };
};


export default protect;
