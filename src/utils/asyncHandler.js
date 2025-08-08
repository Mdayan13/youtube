// const asyncHandler = async()=>{}

import { configDotenv } from "dotenv";

const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(asyncHandler(req, res, next)).catch((error) => next(error));
  };
};

export { asyncHandler };

const asyncHandler = (fnc) => async(req, res, next) => {
     try{
          await fnc(req, res, next)
     }catch(error){
          res.status(error.code || 500).json({
               success: false,
               message: error.message
          })
     }
}
