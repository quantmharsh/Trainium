import { SignedIn, SignedOut, SignInButton, SignOutButton } from "@clerk/nextjs";
import Image from "next/image";

export default function Home() {
 
  return (
   <div>
    Home Page 
     

    <SignedIn>
      <SignOutButton/>
    </SignedIn>
    <SignedOut>
      <SignInButton/>
    </SignedOut>
   </div>
  );
}
