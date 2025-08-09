import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { apiResponse } from "../utils/apiResponse.js";
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
        refreshToken: undefined,
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
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
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
     const { accessToken, newRefreshToken } = await generateACcessAndrefreshToken(
       user._id
     );
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
     throw new ApiError(401, error?.message || "RefershToken Failed")
  }
});
export { registerUser, loginUser, logOutUser , refreshAccessToken};
