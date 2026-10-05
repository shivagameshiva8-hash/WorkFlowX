const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const checkOverdueTasks = require("./utils/taskAutomation");

const authRoutes = require("./routes/auth");

const app = express();
// app.use("/auth", authRoutes);

app.use(express.static("public"));

const expressLayouts = require("express-ejs-layouts");
app.use(expressLayouts);

app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", false);


const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const employeeRoutes = require("./routes/employee");
const managerRoutes = require("./routes/manager");
const adminRoutes = require("./routes/admin");


app.get("/privacy", (req, res) => {
    res.render("privacy");
});



app.set("view engine", "ejs");


// Parse HTML form data
app.use(express.urlencoded({ extended: true }));


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI
        }),
        cookie: {
            maxAge: 1000 * 60 * 60
        }
    })
);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });


// Authentication routes
app.use("/auth", authRoutes);

app.use("/employee", employeeRoutes);
app.use("/manager", managerRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
    // res.send("WorkFlowX is running");
    res.render("index");
});



// app.listen(3000, () => {
//     console.log("Server running on port 3000");
// });

app.listen(3000, () => {
    console.log("Server running on port 3000");

    checkOverdueTasks();

    setInterval(() => {
        checkOverdueTasks();
    }, 60 * 1000);
});