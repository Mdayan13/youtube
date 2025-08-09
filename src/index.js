import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: [ '.env'],
});

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
  .then(() => {
    app.on("error", (error) => {
      console.log("app failed to Start:==", error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`App running on PORT Number:= ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.log(`Error Caught while connecting because :== ${error}`);
  });
