require('dotenv').config();
const app =  require('./src/app');
const connectDB = require('./src/db/db.js')


connectDB();

app.listen(process.env.port,()=>{
    console.log(`server is running on port http://localhost:3000`);
})