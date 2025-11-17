const { default: mongoose } = require("mongoose");

const question = mongoose.model("question",{
    name:{
        type:String,
    },
    sqlText:{
        type:String,
    },
    query:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"query"
        }
    ]
})

module.exports = question