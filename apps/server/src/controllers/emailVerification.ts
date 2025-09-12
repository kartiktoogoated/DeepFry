import { Request, Response } from "express";
import prisma from "../prismaClient";
import { info } from "../../utils/logger";

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required" });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: "Invalid email" });
      return;
    }
    if (user.isVerified) {
      res.status(400).json({ message: "User already verified" });
      return;
    }

    
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
      },
    });

    info(`User with email ${email} has been verified.`);
    res.status(200).json({ message: "User verified successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
