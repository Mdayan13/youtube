import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose, { Schema } from "mongoose";

const videoShema = new Schema(
  {
     videofile: {
          type: String,
          required: true
     },
     thumbnail : {
          type: String,
          required: true
     },
     discription: {
          type: String,
          required: true
     },
     duration: {
          type: Number,
          required: true
     },
     views: {
          type: Number,
          default : 0
     },
     isPublised: {
          type: Boolean,
          default: true
     },
     owner: {
          type: Schema.Types.ObjectId,
          ref: "User"
     }
  },
  {
    timestamps: true,
  }
);
export const Video = mongoose.model("Video", videoShema);
