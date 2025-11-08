const { default: mongoose } = require("mongoose");

const comment = mongoose.model("comment",{
    comment:{
        type:String
    }
})

module.exports = comment