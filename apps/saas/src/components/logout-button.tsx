import { logoutAction } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="text-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
