const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    message: {
        type: String,
        required: true
    },

    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    },

    type: {
        type: String,

        enum: [
            "task_assigned",
            "overdue",
            "deadline_reminder",
            "task_completed",
            "deadline_extended"
        ],


        required: true
    },

    isRead: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

module.exports = Notification;