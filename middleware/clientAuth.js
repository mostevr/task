var jwt = require("jsonwebtoken");

const clientAuth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token) {
    try {
      var decoded = jwt.verify(token, process.env.SECRET_KEY);
      req.user = decoded
      next();
    } catch (err) {
      res.status(401).json({ message: err?.message || "Unauthorized" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = clientAuth;
