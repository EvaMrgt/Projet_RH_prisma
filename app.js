const express = require('express');
const session = require("express-session")
const entrepriseRouter = require("./router/entrepriseRouter")
const employeRouter = require("./router/employeRouter")
const path = require("path")

const app = express();

app.use(session({ //à appaler AVANT LE ROUTER
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}))
app.use(express.static("./public")) //à appaler AVANT LE ROUTER
app.use(express.urlencoded({extended:true})) //à appaler AVANT LE ROUTER
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(employeRouter)
app.use(entrepriseRouter)

app.listen(3000, (err)=>{
    if(err) {
        console.log(err);
    }else {
        console.log('Server is running on port 3000');
    }
})