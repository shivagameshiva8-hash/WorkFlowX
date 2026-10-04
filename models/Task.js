const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },

    deadline: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed", "Overdue"],
        default: "Pending"
    }

}, {
    timestamps: true
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;