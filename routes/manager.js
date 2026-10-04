const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const User = require("../models/User");
const Task = require("../models/Task");
const role = require("../middleware/role");

// ==================== MANAGER DASHBOARD ====================
router.get("/dashboard", role("manager"), async (req, res) => {
    try {
        const notifications = await Notification.find({
            user: req.session.userId,
            isRead: false
        }).sort({ createdAt: -1 });

        const employees = await User.find({ role: "employee" })
            .select("name email")
            .lean();

        const tasks = await Task.find({
            assignedBy: req.session.userId
        }).lean();

        const employeeSummaries = employees.map(employee => {
            const employeeTasks = tasks.filter(
                task => String(task.assignedTo) === String(employee._id)
            );

            const totalTasks = employeeTasks.length;
            const completedTasks = employeeTasks.filter(
                task => task.status === "Completed"
            ).length;
            const inProgressTasks = employeeTasks.filter(
                task => task.status === "In Progress"
            ).length;
            const pendingTasks = employeeTasks.filter(
                task => task.status === "Pending"
            ).length;
            const overdueTasks = employeeTasks.filter(
                task => task.status === "Overdue"
            ).length;

            return {
                ...employee,
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks,
                overdueTasks,
                progress: totalTasks
                    ? Math.round(completedTasks / totalTasks * 100)
                    : 0
            };
        });

        res.render("manager/dashboard.ejs", {
            notifications,
            employeeSummaries
        });
    } catch (err) {
        console.error("Manager dashboard error:", err);
        res.status(500).send("Error loading manager dashboard");
    }
});

// ==================== CREATE TASK PAGE ====================
router.get("/tasks/new", role("manager"), async (req, res) => {
    try {
        const employees = await User.find({ role: "employee" });
        res.render("manager/create-task.ejs", { employees });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading create task page");
    }
});

// ==================== CREATE TASK ====================
router.post("/tasks", role("manager"), async (req, res) => {
    try {
        const {
            title,
            description,
            assignedTo,
            priority,
            deadline
        } = req.body;

        const task = new Task({
            title,
            description,
            assignedTo,
            assignedBy: req.session.userId,
            priority,
            deadline
        });

        await task.save();
        res.send("Task created successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating task");
    }
});

// ==================== VIEW TASKS ====================
router.get("/tasks", role("manager"), async (req, res) => {
    try {
        const tasks = await Task.find({
            assignedBy: req.session.userId
        }).populate("assignedTo", "name email");

        res.render("manager/tasks.ejs", { tasks });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading tasks");
    }
});

// ==================== ANALYTICS ====================
router.get("/analytics", role("manager"), async (req, res) => {
    try {
        const filter = { assignedBy: req.session.userId };

        const [
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            overdueTasks
        ] = await Promise.all([
            Task.countDocuments(filter),
            Task.countDocuments({ ...filter, status: "Pending" }),
            Task.countDocuments({ ...filter, status: "In Progress" }),
            Task.countDocuments({ ...filter, status: "Completed" }),
            Task.countDocuments({ ...filter, status: "Overdue" })
        ]);

        res.render("manager/analytics.ejs", {
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            overdueTasks
        });
    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).send("Error loading analytics");
    }
});

// ==================== EMPLOYEE-WISE TASK TRACKING ====================
router.get("/employee-tasks", role("manager"), async (req, res) => {
    try {
        const employees = await User.find({ role: "employee" })
            .select("name email")
            .lean();

        const tasks = await Task.find({
            assignedBy: req.session.userId
        }).lean();

        const employeeSummaries = employees
            .map(employee => {
                const employeeTasks = tasks.filter(
                    task => String(task.assignedTo) === String(employee._id)
                );

                const totalTasks = employeeTasks.length;
                const completedTasks = employeeTasks.filter(
                    task => task.status === "Completed"
                ).length;
                const inProgressTasks = employeeTasks.filter(
                    task => task.status === "In Progress"
                ).length;
                const pendingTasks = employeeTasks.filter(
                    task => task.status === "Pending"
                ).length;
                const overdueTasks = employeeTasks.filter(
                    task => task.status === "Overdue"
                ).length;

                return {
                    ...employee,
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    pendingTasks,
                    overdueTasks,
                    progress: totalTasks
                        ? Math.round(completedTasks / totalTasks * 100)
                        : 0
                };
            })
            .filter(employee => employee.totalTasks > 0);

        res.render("manager/employee-tasks.ejs", {
            employeeSummaries
        });
    } catch (err) {
        console.error("Employee tracking error:", err);
        res.status(500).send("Error loading employee tracking");
    }
});

// ==================== MARK MANAGER NOTIFICATION AS READ ====================
router.post("/notifications/:id/read", role("manager"), async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.session.userId
            },
            { $set: { isRead: true } }
        );

        res.redirect("/manager/dashboard");
    } catch (err) {
        console.error("Mark notification read error:", err);
        res.status(500).send("Could not update notification");
    }
});

// ==================== OVERDUE TASKS ====================
router.get("/overdue-tasks", role("manager"), async (req, res) => {
    try {
        const tasks = await Task.find({
            assignedBy: req.session.userId,
            status: "Overdue"
        })
            .populate("assignedTo", "name email")
            .sort({ deadline: 1 });

        res.render("manager/overdue-tasks", { tasks });
    } catch (err) {
        console.error("Overdue tasks error:", err);
        res.status(500).send("Error loading overdue tasks");
    }
});

// ==================== EXTEND TASK DEADLINE ====================
router.post(
    "/tasks/:id/extend-deadline",
    role("manager"),
    async (req, res) => {
        try {
            const { deadline } = req.body;

            if (!deadline || isNaN(Date.parse(deadline))) {
                return res.status(400).send("Invalid deadline");
            }

            const newDeadline = new Date(deadline);

            // Find a task owned by this manager.
            // Do not require status === "Overdue" here: a previous
            // extension may already have changed its status.
            const task = await Task.findOne({
                _id: req.params.id,
                assignedBy: req.session.userId
            });

            if (!task) {
                return res.status(404).send(
                    "Task not found or access denied"
                );
            }

            // Update task deadline and status.
            // Keep completed tasks completed.
            if (task.status !== "Completed") {
                task.status = newDeadline < new Date()
                    ? "Overdue"
                    : "In Progress";
            }

            task.deadline = newDeadline;
            await task.save();

            // Mark ALL previous notifications for this task as read.
            // This includes previous overdue and extension notifications.
            const notificationResult = await Notification.updateMany(
                {
                    user: task.assignedTo,
                    task: task._id,
                    isRead: false
                },
                {
                    $set: { isRead: true }
                }
            );

            console.log(
                "Previous task notifications marked read:",
                notificationResult.modifiedCount
            );

            // Create one new unread extension notification.
            await Notification.create({
                user: task.assignedTo,
                task: task._id,
                message: `Your task "${task.title}" has been given an extended deadline by your manager. New deadline: ${newDeadline.toLocaleDateString("en-IN")}.`,
                type: "deadline_extended",
                isRead: false
            });

            res.redirect("/manager/overdue-tasks");
        } catch (err) {
            console.error("Error extending deadline:", err);
            res.status(500).send("Could not extend deadline");
        }
    }
);

module.exports = router;
