import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
const generateACcessAndrefreshToken = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateaccessToken();
    console.log("yeah the User:===", accessToken, "lllllllllllllllllllll");
    const refreshToken = user.generaterefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: true });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something Went Wrong While generating Access Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = req.body;
  console.log(req.body);
  if (
    [username, email, password, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields Required");
  }
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User Already Exist");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(409, "Avator Images Is Required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(409, "Avator Images Is Required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullname,
    coverImage: coverImage?.url || "",
    avatar: avatar.url,
  });
  const createdUsre = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUsre) {
    throw new ApiError(500, "Error while registering User");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUsre, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Regisstiring User:==", email);

  if (!username && !email) {
    throw new ApiError(400, "Email or Passward required");
  }
  const userExist = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!userExist) {
    throw new ApiError(404, "User Does not  exist");
  }
  console.log("herre is passward", password);
  const isPasswaardValif = await userExist.isPasswordCorrect(password);
  const { refreshToken, accessToken } = await generateACcessAndrefreshToken(
    userExist._id
  );
  console.log(!!isPasswaardValif);
  if (!isPasswaardValif) {
    throw new Error(401, "credentials is Not Correct");
  }
  const loggedInUser = await User.findById(userExist._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User Logged In Successfully"
      )
    );
});
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "user LoggedOut SuccessFully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorizd RefreshToken");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFERSH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid RefreshToken");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refersh Token Is Expired Or Used");
    }
    const { accessToken, newRefreshToken } =
      await generateACcessAndrefreshToken(user._id);
    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refeshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "RefershToken Failed");
  }
});

const changecurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // pov
  if(oldPassword == newPassword) return new ApiError(401, "Bot Passwaord is same not allowed");
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(200, "Password Isn't Correct");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new apiResponse(200, {}, "Password Saved SuccessFully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetcheed SuccessFully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(200, "account details to update required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email,
        fullname,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  res.status(200).json(200, user, "Account details Updated Succesfully");
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File Is Missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while Uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res.status(200).json(200, user, "Avatar image Updated Successfully");
});
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverimageLocalPath = req.file?.path;
  if (!coverimageLocalPath) {
    throw new ApiError(400, "coverImage File Is Missing");
  }

  const coverImage = await uploadOnCloudinary(coverimageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while Uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200).json(200, user, "CoverImage Updated Successfully");
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is Missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribersTo",
      },
    },
    {
      $addFields: {
        subscriptionCount: {
          $size: "$subscribers",
        },
        channelSubscribeToCount: {
          $size: "$subscribersTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.users?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        fullname: 1,
        avatar: 1,
        coverImage: 1,
        subscriptionCount: 1,
        channelSubscribeToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  console.log("Channel:=======", channel, "======================");
  if (!channel.length) {
    throw new ApiError(404, "Channel doesn't Exist");
  }
  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "Video",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
console.log(user[0])
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "WatchHistory Feched SuccessFully "
      )
    );
});

export {
  registerUser,
  getCurrentUser,
  updateCoverImage,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changecurrentPassword,
  updateAvatar,
  updateAccountDetails,
  getUserChannelProfile,
  getWatchHistory
};
