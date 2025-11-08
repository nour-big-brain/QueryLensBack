const mongoose = require("mongoose")

const user = mongoose.model("user",{
    username:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    creationDate:{
        creationDate:Date
    },
    role:{
        type:String,
        enum:["admin","user"],
        default:"user"
    },
    collections:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"collection"
        }
    ]   
})

module.exports = user

