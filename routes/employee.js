const express = require("express");
const router = express.Router();

const Task = require("../models/Task");
const Notification = require("../models/Notification");
const role = require("../middleware/role");
const User = require("../models/User");

// ==================== EMPLOYEE DASHBOARD ====================
router.get("/dashboard", role("employee"), async (req, res) => {
    try {
        const employee = await User.findById(req.session.userId)
            .select("name email");

        const tasks = await Task.find({
            assignedTo: req.session.userId
        }).sort({ deadline: 1 });

        const notifications = await Notification.find({
            user: req.session.userId,
            isRead: false
        }).sort({ createdAt: -1 });

        const totalTasks = tasks.length;

        const pendingTasks = tasks.filter(
            task => task.status === "Pending"
        ).length;

        const inProgressTasks = tasks.filter(
            task => task.status === "In Progress"
        ).length;

        const completedTasks = tasks.filter(
            task => task.status === "Completed"
        ).length;

        const overdueTasks = tasks.filter(
            task => task.status === "Overdue"
        ).length;

        res.render("employee/dashboard.ejs", {
            employee,
            tasks,
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            overdueTasks,
            notifications
        });
    } catch (err) {
        console.error("Employee dashboard error:", err);
        res.status(500).send("Error loading employee dashboard");
    }
});

// ==================== START TASK ====================
router.post("/tasks/:id/start", role("employee"), async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            assignedTo: req.session.userId
        });

        if (!task) {
            return res.status(404).send("Task not found");
        }

        if (task.status !== "Pending") {
            return res.status(400).send(
                "Only pending tasks can be started"
            );
        }

        task.status = "In Progress";
        await task.save();

        res.redirect("/employee/dashboard");
    } catch (err) {
        console.error("Start task error:", err);
        res.status(500).send("Could not start task");
    }
});

// ==================== COMPLETE TASK ====================
router.post("/tasks/:id/complete", role("employee"), async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            assignedTo: req.session.userId
        });

        if (!task) {
            return res.status(404).send("Task not found");
        }

        if (task.status !== "In Progress") {
            return res.status(400).send(
                "Only tasks in progress can be completed"
            );
        }

        task.status = "Completed";
        await task.save();

        const employee = await User.findById(req.session.userId);

        await Notification.create({
            user: task.assignedBy,
            message: `${employee.name} completed the task "${task.title}".`,
            task: task._id,
            type: "task_completed",
            isRead: false
        });

        res.redirect("/employee/dashboard");
    } catch (err) {
        console.error("Complete task error:", err);
        res.status(500).send("Could not complete task");
    }
});

// ==================== UPDATE TASK STATUS ====================
// Matches forms posting to /employee/tasks/:id/status
// ==================== UPDATE TASK STATUS ====================
router.post("/tasks/:id/status", role("employee"), async (req, res) => {
    try {
        const { status } = req.body;

        if (!["In Progress", "Completed"].includes(status)) {
            return res.status(400).send("Invalid task status");
        }

        const task = await Task.findOne({
            _id: req.params.id,
            assignedTo: req.session.userId
        });

        if (!task) {
            return res.status(404).send("Task not found");
        }

        if (task.status === "Completed") {
            return res.status(400).send("Task already completed");
        }

        // Overdue tasks can be completed directly.
        // Pending tasks must be started before completion.
        if (
            task.status === "Pending" &&
            status === "Completed"
        ) {
            return res.status(400).send(
                "Start the task before completing it"
            );
        }

        if (
            task.status === "Overdue" &&
            status !== "Completed"
        ) {
            return res.status(400).send(
                "An overdue task can only be completed here"
            );
        }

        task.status = status;
        await task.save();

        // When completed, automatically dismiss notifications
        // associated with this specific task.
        if (status === "Completed") {
            await Notification.updateMany(
                {
                    user: req.session.userId,
                    task: task._id,
                    isRead: false
                },
                {
                    $set: { isRead: true }
                }
            );

            // Notify the manager about task completion.
            const employee = await User.findById(req.session.userId);

            await Notification.create({
                user: task.assignedBy,
                task: task._id,
                message: `${employee.name} completed the task "${task.title}".`,
                type: "task_completed",
                isRead: false
            });
        }

        // Reload dashboard with updated tasks and notifications.
        res.redirect("/employee/dashboard");

    } catch (err) {
        console.error("Update task status error:", err);
        res.status(500).send("Could not update task status");
    }
});



// ==================== MARK EMPLOYEE NOTIFICATION AS READ ====================
router.post("/notifications/:id/read", role("employee"), async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.session.userId
            },
            {
                $set: { isRead: true }
            }
        );

        res.redirect("/employee/dashboard");
    } catch (err) {
        console.error("Mark notification read error:", err);
        res.status(500).send("Could not update notification");
    }
});

module.exports = router;
