import { redirect } from "next/navigation";

/** La home del catálogo se sirve desde /catalog vía middleware → /api/catalog */
export default function Root() {
  redirect("/index.html");
}
