/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import { type Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "./ui/button";

export function Appbar() {
  return (
    <div className="flex justify-between items-center p-4">
      <div>DeepFry</div>
      <div>
        <SignedOut>
            <Button><SignInButton /></Button>
          
          <Button><SignUpButton /></Button>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
}
