import { type Metadata } from "next";

import { AvatarCard } from "@/features/assets/components/avatar-card";
import { ProductsCard } from "@/features/assets/components/products-card";
import { getBrandLibrary } from "@/lib/assets/brand";

export const metadata: Metadata = { title: "Your pictures" };
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
      {/* Says where these get used before showing the upload buttons. Both
          cards otherwise ask for a photo without saying what happens to it,
          which is a lot to ask for somebody's face. */}
      <p className="mb-4 text-sm text-ink-soft">
        Kept so you can put yourself or your products in a video without finding the photo again
        every time. Attach them from the plus button in the message box.
      </p>

      <AvatarCard avatar={library.avatar} />
      <ProductsCard products={library.products} />
    </section>
  );
}
