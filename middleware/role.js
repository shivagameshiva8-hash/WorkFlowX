module.exports = function (requiredRole) {
    return function (req, res, next) {

        if (!req.session.userId) {
            return res.send("Please login first");
        }

        if (req.session.role !== requiredRole) {
            return res.status(403).send("Access denied");
        }

        next();
    };
};