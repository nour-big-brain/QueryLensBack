const mongoose = require("mongoose")

const collection = mongoose.model("collection",{
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
    },
    dashboards:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"dashboard"
        }
    ],
    questions:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"question"
        }
    ]
})

module.exports = collection