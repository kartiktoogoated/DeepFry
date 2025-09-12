import { Router, Request, Response } from 'express';
import passport from '../../../config/passport';
import jwt from 'jsonwebtoken';
import { signup, verifyPendingSignup, signin } from '../../../controllers/authController';
import { authRateLimiter } from '../../../middlewares/rateLimiter';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import prisma from '../../../prismaClient';

const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET!;


authRouter.use(authRateLimiter);


authRouter.post('/signup', signup);
authRouter.post('/verify-otp', verifyPendingSignup);
authRouter.post('/signin', signin);


authRouter.post('/verify-wallet', async (req: Request, res: Response): Promise<void> => {
    try {
        const { wallet, message, signature } = req.body as {
            wallet: string;
            message: string;
            signature: number[];
        };

        if (!wallet || !message) {
            res.status(400).json({ success: false, error: 'Invalid payload' });
            return;
        }

        const publicKey = new PublicKey(wallet);
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = Uint8Array.from(signature);

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKey.toBytes(),
        );

        if (!isValid) {
            res.status(401).json({ success: false, error: 'Invalid signature' });
            return;
        }

        await prisma.validator.upsert({
            where: { wallet },
            update: {},
            create: {
                wallet,
                location: "unknown" 
            }
        });

        res.status(200).json({ success: true });
        return;
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal server error' });
        return;
    }
});

 

authRouter.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRouter.get(
    '/google/callback',
    (req, res, next) => {
        passport.authenticate(
            'google',
            { session: false },
            async (err, user, info) => {
                if (err || !user) {
                    return res.status(401).json({ message: 'Google authentication failed' });
                }
                const { id, email, name, avatar } = user as any;
                const token = jwt.sign(
                    { userId: id, email, name, avatar },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                return res.redirect(
                  `https://www.deepfry.tech/oauth-success?token=${token}` +
                  (name ? `&name=${encodeURIComponent(name)}` : '') +
                  (email ? `&email=${encodeURIComponent(email)}` : '') +
                  (avatar ? `&avatar=${encodeURIComponent(avatar)}` : '')
                );
            }
        )(req, res, next);
    }
);

export default authRouter;