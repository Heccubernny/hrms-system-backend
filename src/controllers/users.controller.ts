import { UserModel} from "../models/users.model";

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { resetPassword, requestPasswordReset, signup } from "../services/auth.service";

// Registration controller
export const register = async (req: Request, res: Response) => {

    const { name, email, password } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const data = {
      name,
      email,
      password: hashedPassword
    }

    const signupService = await signup(data, res);

    return res.status(200).json(signupService);
    
};

// Login controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await UserModel.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create and sign JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);


    res.status(200).json({ token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Forgot password controller
export const forgotPassword = async (req: Request, res: Response) => {
  try {

    const { email } = req.body.email;

    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User with given email not found" });
    }

    // Generate password reset token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "120",
    });

    // Send password reset email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.name},</p>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const requestResetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const resetPasswordService = await requestPasswordReset(
    email,
    res
  );

  return res.status(200).json(resetPasswordService);
};

export const passwordReset = async (req: Request, res: Response) => {
    const { userId, token, password } = req.body;

    const resetPasswordService = await resetPassword(userId, token, password, res);

    return res.status(200).json(resetPasswordService);   
}

// Logout controller
export const logout = async (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUsers = () => UserModel.find();

export const getUsersByEmail = (email: string) => UserModel.findOne({ email });

export const getUsersBySessionToken = (sessionToken: string) =>
  UserModel.findOne({ "autentication.sessionToken": sessionToken });

export const createUser = (values: Record<string, number>) =>
  new UserModel(values).save().then((user) => user.toObject());

export const deleteUserById = (id: string) =>
  UserModel.findOneAndDelete({ _id: id });

export const updateUserById = (id: string, values: Record<string, number>) =>
  UserModel.findByIdAndUpdate(id, values);
