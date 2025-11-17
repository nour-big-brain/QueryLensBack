const { default: mongoose } = require("mongoose");

const report = mongoose.model("report",{
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    message:{
        type:String,
        default:""
    },
    comment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"comment"
    }
})

module.exports = report