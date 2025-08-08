import dotenv from "dotenv"
import connectDb from "./db/index.js"

dotenv.config({
     path: "./env"
})

// const app = express()
// (async ()=>{
//      try{
//           await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//           app.on("error", (error)=>{
//                throw error
//           })
//           app.listen(process.env.PORT, ()=>{
//                console.log(`app running on port number ${PORT}`)
//           })
//      }catch(error){
//           console.log("error while connecting hte Data database:==", error)
//      }
// })()

connectDb()