const Task = require("../models/Task");
const Notification = require("../models/Notification");

async function checkOverdueTasks() {

    try {

        const now = new Date();

        // ==============================
        // 1. CHECK OVERDUE TASKS
        // ==============================

        const overdueTasks = await Task.find({
            deadline: { $lt: now },
            status: { $in: ["Pending", "In Progress"] }
        });

        for (let task of overdueTasks) {

            task.status = "Overdue";
            await task.save();

            await Notification.create({
                user: task.assignedTo,
                message: `Your task "${task.title}" is overdue.`,
                task: task._id,
                type: "overdue"

            });

            console.log(
                `Task "${task.title}" marked as Overdue`
            );
        }


        // ==============================
        // 2. CHECK DEADLINE REMINDERS
        // ==============================

        const tomorrow = new Date(
            now.getTime() + 24 * 60 * 60 * 1000
        );

        const reminderTasks = await Task.find({
            deadline: {
                $gt: now,
                $lte: tomorrow
            },
            status: { $in: ["Pending", "In Progress"] }
        });

        for (let task of reminderTasks) {

            const existingNotification =
                await Notification.findOne({
                    task: task._id,
                    user: task.assignedTo,
                    message: {
                        $regex: "due within 24 hours"
                    }
                });

            if (!existingNotification) {

                await Notification.create({
                    user: task.assignedTo,
                    message: `Your task "${task.title}" is due within 24 hours.`,
                    task: task._id,
                    type: "deadline_reminder"
                });

                console.log(
                    `Reminder created for "${task.title}"`
                );
            }
        }

    } catch (err) {

        console.log(
            "Error checking tasks:",
            err
        );

    }
}

module.exports = checkOverdueTasks;