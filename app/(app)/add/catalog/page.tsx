import { CatalogScreen } from "@/components/catalog-screen";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Supermarket catalog" };
export default function Page() { return (<><PageHeader title="Supermarket catalog" back="/add" /><CatalogScreen /></>); }
