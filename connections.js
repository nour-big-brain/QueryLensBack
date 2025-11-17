const mongoose= require("mongoose");
//connect to mongoose
mongoose.connect('mongodb://127.0.0.1:27017/QueryLens')//if db found then connect else it will create it then connect
    .then(
        ()=>{
            console.log("connected to database");
        }
    )
    .catch(
        (err)=>{
            console.log(err);
        }
    )
module.exports = mongoose;//exporting connect.js to use later in other files