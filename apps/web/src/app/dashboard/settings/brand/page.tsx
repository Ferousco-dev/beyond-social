import { type Metadata } from "next";

import { AvatarCard } from "@/features/assets/components/avatar-card";
import { ProductsCard } from "@/features/assets/components/products-card";
import { getBrandLibrary } from "@/lib/assets/brand";

export const metadata: Metadata = { title: "You and your products" };
export const dynamic = "force-dynamic";

/**
 * The pictures a user keeps.
 *
 * Their own face and the things they sell, in one place, because both answer the
 * same question at generation time: what should actually be on screen. Uploading
 * either one for every video was the friction this removes.
 */
export default async function BrandPage() {
  const library = await getBrandLibrary();

  return (
    <section className="mt-6 lg:mt-8">
      <AvatarCard avatar={library.avatar} />
      <ProductsCard products={library.products} />
    </section>
  );
}
