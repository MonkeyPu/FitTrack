import { redirect } from "next/navigation";

/** Saved meals were removed. Ingredients replace them. */
export default function Page() { redirect("/library/foods"); }
