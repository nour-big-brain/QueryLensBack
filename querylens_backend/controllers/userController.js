const axios = require("axios");
const user = require("../models/user");
//token for metabase
//hard coded user
async function addUser(req, res) {
    try {
        const newUser = new user({
            username: "johndoe",
            password: "securepassword",
            email: "john.doe@example.com",
            createdAt: Date.now()
        });
        await newUser.save();

        // Respond with created user
        res.status(201).json({
            message: "User created successfully",
            user: newUser
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}


module.exports = {
    addUser
};
