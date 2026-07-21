import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { LoaderCircle } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";

export function SettingsPage() {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(session?.user.name ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const result = await authClient.updateUser({ name });

    setIsSaving(false);

    if (result.error) {
      toast.error(result.error.message ?? "Failed to update name");
      return;
    }

    toast.success("Saved");
  }

  async function signOut() {
    await authClient.signOut();
    window.location.replace("/sign-in");
  }

  return (
    <div className="max-w-sm py-10">
      <h1 className="text-lg font-medium">Settings</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={session?.user.email ?? ""} disabled />
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? <LoaderCircle className="animate-spin" /> : "Save"}
        </Button>
      </form>

      <div className="mt-8 border-t pt-6">
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
