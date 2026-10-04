const express = require("express");
const router = express.Router();

const User = require("../models/User");

const role = require("../middleware/role");

const Task = require("../models/Task");

router.get("/dashboard", role("admin"), (req, res) => {
        res.render("admin/dashboard.ejs", {
            layout: "admin/layout",
            pageTitle: "Admin Dashboard",
            activePage: "dashboard"
        });
});

//USER ROUTE
router.get("/users", role("admin"), async (req, res) => {

    const users = await User.find();

        res.render("admin/users.ejs", {
            users,
            layout: "admin/layout",
            pageTitle: "View Users",
            activePage: "users"
        });
});

//MANAGE EMPLOYEES
router.get("/employees", role("admin"), async (req, res) => {

    const employees = await User.find({
        role: "employee"
    });

    res.render("admin/employees.ejs", {
        employees,
        layout: "admin/layout",
        pageTitle: "Manage Employees",
        activePage: "employees"
    });
});

//MANAGE MANAGERS
router.get("/managers", role("admin"), async (req, res) => {

    const managers = await User.find({
        role: "manager"
    });

    res.render("admin/managers.ejs", {
        managers,
        layout: "admin/layout",
        pageTitle: "Manage Managers",
        activePage: "managers"
    });
});

//VIEW ALL TASKS 
router.get("/tasks", role("admin"), async (req, res) => {

    const tasks = await Task.find()
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name email");

    res.render("admin/tasks.ejs", {
        tasks,
        layout: "admin/layout",
        pageTitle: "All Tasks",
        activePage: "tasks"
    });
});

//ADMIN OPTION; VIEW REPORT
router.get("/reports", role("admin"), async (req, res) => {

    const totalUsers = await User.countDocuments();
    const totalEmployees = await User.countDocuments({ role: "employee" });
    const totalManagers = await User.countDocuments({ role: "manager" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const inProgressTasks = await Task.countDocuments({ status: "In Progress" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({ status: "Overdue" });

    res.render("admin/reports.ejs", {
        totalUsers,
        totalEmployees,
        totalManagers,
        totalAdmins,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,

        // Shared admin layout
        layout: "admin/layout",
        pageTitle: "Admin Reports",
        activePage: "reports"
    });
});
module.exports = router;