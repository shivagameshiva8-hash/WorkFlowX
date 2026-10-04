const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const User = require("../models/User");

router.get("/register", (req, res) => {
    res.render("auth/register.ejs");
});

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();

        res.send("User registered successfully");
    } catch (err) {
        console.log(err);
        res.send("Registration failed");
    }
});



//login route
router.get("/login", (req, res) => {
    res.render("auth/login.ejs");
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.send("Invalid email or password");
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.send("Invalid email or password");
        }


req.session.userId = user._id;
req.session.role = user.role;

if (user.role === "employee") {
    return res.redirect("/employee/dashboard");
}

if (user.role === "manager") {
    return res.redirect("/manager/dashboard");
}

if (user.role === "admin") {
    return res.redirect("/admin/dashboard");
}


res.send("Invalid role");
    } catch (err) {
        console.log(err);
        res.send("Login failed");
    }
});


// LOGUT ROUTE
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Logout failed");
        }

        res.redirect("/auth/login");
    });
});

module.exports = router;






// The 10 is the salt rounds/cost factor. It controls how much computational work bcrypt performs when creating the hash.