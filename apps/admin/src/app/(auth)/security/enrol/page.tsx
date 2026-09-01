import { type Metadata } from "next";

import { EnrolForm } from "./enrol-form";

export const metadata: Metadata = { title: "Set up two-factor" };

export default function EnrolPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set up two-factor</h1>
        <p className="text-sm text-muted-foreground">
          Scan the code with an authenticator app, then enter the six digit code it shows. The
          console will ask for a code from that app when you sign in.
        </p>
      </div>
      <EnrolForm />
    </div>
  );
}
