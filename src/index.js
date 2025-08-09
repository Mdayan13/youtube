import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: [ '.env'],
});


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
