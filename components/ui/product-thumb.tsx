import { Image, Text } from "react-native";
import { PRODUCT_IMAGES } from "@/constants/product-images";
import type { Product } from "@/types";

interface ProductThumbProps {
  product: Product | null | undefined;
  size: number;
  /** Fallback emoji when no product is provided. Defaults to 📦. */
  fallback?: string;
}

/**
 * Renders a product thumbnail: local image, catalog image, or emoji fallback.
 */
export function ProductThumb({ product, size, fallback }: ProductThumbProps) {
  const src = product?.localImageUri
    ? { uri: product.localImageUri }
    : product
    ? PRODUCT_IMAGES[product.id]
    : undefined;

  if (src) {
    return (
      <Image
        source={src}
        style={{ width: size, height: size, borderRadius: 6 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <Text
      style={{
        fontSize: size * 0.7,
        width: size,
        textAlign: "center",
        lineHeight: size,
        includeFontPadding: false,
      }}
    >
      {product?.emoji ?? fallback ?? "📦"}
    </Text>
  );
}
