// src/pages/SignInPage.tsx
import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}
    >
      <SignIn 
        forceRedirectUrl="/"
        routing="path"
        path="/sign-in"
      />
    </div>
  );
};

export default SignInPage;
